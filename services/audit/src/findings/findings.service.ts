import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';

@Injectable()
export class FindingsService {
  constructor(private prisma: PrismaService) {}

  async create(createFindingDto: CreateFindingDto, identifiedBy: string) {
    const { auditId } = createFindingDto;

    // Generate finding number
    const findingCount = await this.prisma.auditFinding.count({
      where: { auditId },
    });
    const findingNumber = `F-${String(findingCount + 1).padStart(3, '0')}`;

    return this.prisma.auditFinding.create({
      data: {
        ...createFindingDto,
        findingNumber,
        identifiedBy,
        targetDate: createFindingDto.targetDate
          ? new Date(createFindingDto.targetDate)
          : undefined,
      },
      include: {
        audit: {
          select: {
            id: true,
            name: true,
            auditId: true,
          },
        },
        identifiedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(
    organizationId: string,
    filters?: {
      auditId?: string;
      status?: string;
      severity?: string;
      category?: string;
      remediationOwner?: string;
    },
  ) {
    const where: Record<string, unknown> = { organizationId };

    if (filters?.auditId) {
      where.auditId = filters.auditId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.severity) {
      where.severity = filters.severity;
    }
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.remediationOwner) {
      where.remediationOwner = filters.remediationOwner;
    }

    return this.prisma.auditFinding.findMany({
      where,
      include: {
        audit: {
          select: {
            id: true,
            name: true,
            auditId: true,
          },
        },
        identifiedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const finding = await this.prisma.auditFinding.findFirst({
      where: { id, organizationId },
      include: {
        audit: {
          select: {
            id: true,
            name: true,
            auditId: true,
            status: true,
          },
        },
        identifiedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!finding) {
      throw new NotFoundException(`Finding with ID ${id} not found`);
    }

    return finding;
  }

  async update(id: string, organizationId: string, updateFindingDto: UpdateFindingDto) {
    await this.findOne(id, organizationId); // Verify existence

    const data: Record<string, unknown> = { ...updateFindingDto };

    // Convert dates
    if (data.targetDate) {
      data.targetDate = new Date(data.targetDate as string);
    }
    if (data.actualDate) {
      data.actualDate = new Date(data.actualDate as string);
    }
    if (updateFindingDto.managementResponse) {
      data.responseDate = new Date();
    }

    return this.prisma.auditFinding.update({
      where: { id },
      data,
      include: {
        audit: {
          select: {
            id: true,
            name: true,
            auditId: true,
          },
        },
        identifiedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId); // Verify existence

    return this.prisma.auditFinding.delete({
      where: { id },
    });
  }

  async bulkUpdateStatus(
    ids: string[],
    organizationId: string,
    status: string,
  ) {
    return this.prisma.auditFinding.updateMany({
      where: {
        id: { in: ids },
        organizationId,
      },
      data: { status },
    });
  }

  async getStats(organizationId: string) {
    const [total, bySeverity, byStatus, byCategory, overdue] = await Promise.all([
      this.prisma.auditFinding.count({ where: { organizationId } }),
      this.prisma.auditFinding.groupBy({
        by: ['severity'],
        where: { organizationId },
        _count: { severity: true },
      }),
      this.prisma.auditFinding.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
      this.prisma.auditFinding.groupBy({
        by: ['category'],
        where: { organizationId },
        _count: { category: true },
      }),
      this.prisma.auditFinding.count({
        where: {
          organizationId,
          status: { notIn: ['resolved', 'accepted_risk'] },
          targetDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      overdue,
      bySeverity: bySeverity.map((s) => ({ severity: s.severity, count: s._count.severity })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.status })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count.category })),
    };
  }
}





