import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ControlImplementationStatus } from '@prisma/client';
import {
  UpdateImplementationDto,
  CreateControlTestDto,
  ImplementationFilterDto,
  BulkUpdateImplementationsDto,
} from './dto/implementation.dto';
import {
  parsePaginationParams,
  createPaginatedResponse,
  getPrismaSkipTake,
} from '@gigachad-grc/shared';

@Injectable()
export class ImplementationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, filters: ImplementationFilterDto) {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    const where: any = { organizationId };

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: ControlImplementationStatus.implemented };
    }

    if (filters.needsTesting) {
      where.nextTestDue = { lt: new Date() };
    }

    const [implementations, total] = await Promise.all([
      this.prisma.controlImplementation.findMany({
        where,
        include: {
          control: {
            select: {
              id: true,
              controlId: true,
              title: true,
              category: true,
            },
          },
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          _count: {
            select: { tests: true },
          },
        },
        ...getPrismaSkipTake(pagination),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.controlImplementation.count({ where }),
    ]);

    return createPaginatedResponse(implementations, total, pagination);
  }

  async findOne(id: string, organizationId: string) {
    const implementation = await this.prisma.controlImplementation.findFirst({
      where: { id, organizationId },
      include: {
        control: true,
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        tests: {
          orderBy: { testedAt: 'desc' },
          take: 10,
        },
        evidenceLinks: {
          include: {
            evidence: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                filename: true,
                validUntil: true,
              },
            },
          },
        },
      },
    });

    if (!implementation) {
      throw new NotFoundException(`Implementation with ID ${id} not found`);
    }

    return implementation;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateImplementationDto,
  ) {
    await this.findOne(id, organizationId);

    const updateData: any = {
      ...dto,
      updatedBy: userId,
    };

    // If status changed to implemented, update lastTestedAt
    if (dto.status === ControlImplementationStatus.implemented) {
      updateData.lastTestedAt = new Date();
    }

    // Calculate next test due based on frequency
    if (dto.testingFrequency) {
      updateData.nextTestDue = this.calculateNextTestDue(dto.testingFrequency);
    }

    return this.prisma.controlImplementation.update({
      where: { id },
      data: updateData,
      include: {
        control: true,
        owner: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
  }

  async bulkUpdate(
    organizationId: string,
    userId: string,
    dto: BulkUpdateImplementationsDto,
  ) {
    const updateData: any = { updatedBy: userId };

    if (dto.status) updateData.status = dto.status;
    if (dto.ownerId) updateData.ownerId = dto.ownerId;
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);

    await this.prisma.controlImplementation.updateMany({
      where: {
        id: { in: dto.implementationIds },
        organizationId,
      },
      data: updateData,
    });

    return { updated: dto.implementationIds.length };
  }

  async createTest(
    implementationId: string,
    organizationId: string,
    userId: string,
    dto: CreateControlTestDto,
  ) {
    const implementation = await this.findOne(implementationId, organizationId);

    const test = await this.prisma.controlTest.create({
      data: {
        implementationId,
        testType: dto.testType,
        result: dto.result,
        findings: dto.findings,
        recommendations: dto.recommendations,
        testedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Link evidence via ControlTestEvidence junction table
    if (dto.evidenceIds && dto.evidenceIds.length > 0) {
      await this.prisma.controlTestEvidence.createMany({
        data: dto.evidenceIds.map((evidenceId) => ({
          testId: test.id,
          evidenceId,
        })),
        skipDuplicates: true,
      });
    }

    // Update implementation with test results
    const updateData: any = {
      lastTestedAt: new Date(),
      updatedBy: userId,
    };

    // Calculate effectiveness score based on test result
    if (dto.result === 'pass') {
      updateData.effectivenessScore = 100;
    } else if (dto.result === 'partial') {
      updateData.effectivenessScore = 50;
    } else if (dto.result === 'fail') {
      updateData.effectivenessScore = 0;
    }

    // Calculate next test due
    updateData.nextTestDue = this.calculateNextTestDue(
      implementation.testingFrequency,
    );

    await this.prisma.controlImplementation.update({
      where: { id: implementationId },
      data: updateData,
    });

    return test;
  }

  async getTestHistory(implementationId: string, organizationId: string) {
    await this.findOne(implementationId, organizationId);

    return this.prisma.controlTest.findMany({
      where: { implementationId },
      orderBy: { testedAt: 'desc' },
    });
  }

  private calculateNextTestDue(frequency: string): Date {
    const now = new Date();
    
    switch (frequency) {
      case 'continuous':
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'annually':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 3));
    }
  }

  // Initialize implementations for all controls in an org
  async initializeForOrganization(organizationId: string, userId: string) {
    // Get all system controls
    const systemControls = await this.prisma.control.findMany({
      where: { organizationId: null },
      select: { id: true },
    });

    // Get existing implementations
    const existingImplementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      select: { controlId: true },
    });

    const existingControlIds = new Set(existingImplementations.map(i => i.controlId));

    // Create implementations for controls that don't have one
    const newImplementations = systemControls
      .filter(c => !existingControlIds.has(c.id))
      .map(c => ({
        controlId: c.id,
        organizationId,
        status: ControlImplementationStatus.not_started,
        testingFrequency: 'quarterly',
        createdBy: userId,
        updatedBy: userId,
      }));

    if (newImplementations.length > 0) {
      await this.prisma.controlImplementation.createMany({
        data: newImplementations,
      });
    }

    return { created: newImplementations.length };
  }
}



