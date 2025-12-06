import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto, userId: string) {
    const assessment = await this.prisma.vendorAssessment.create({
      data: {
        ...createAssessmentDto,
        status: (createAssessmentDto.status || 'pending') as any,
        dueDate: createAssessmentDto.dueDate
          ? new Date(createAssessmentDto.dueDate)
          : undefined,
        completedAt: createAssessmentDto.completedAt
          ? new Date(createAssessmentDto.completedAt)
          : undefined,
        createdBy: userId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: assessment.organizationId,
      userId,
      action: 'CREATE_ASSESSMENT',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${(assessment as any).vendor.name} - ${assessment.assessmentType}`,
      description: `Created ${assessment.assessmentType} assessment for ${(assessment as any).vendor.name}`,
      metadata: {
        vendorId: assessment.vendorId,
        assessmentType: assessment.assessmentType,
      },
    });

    return assessment;
  }

  async findAll(filters?: {
    vendorId?: string;
    assessmentType?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.assessmentType) {
      where.assessmentType = filters.assessmentType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.vendorAssessment.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const assessment = await this.prisma.vendorAssessment.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async update(id: string, updateAssessmentDto: UpdateAssessmentDto, userId: string) {
    const data: any = { ...updateAssessmentDto };

    if (updateAssessmentDto.dueDate) {
      data.dueDate = new Date(updateAssessmentDto.dueDate);
    }

    if (updateAssessmentDto.completedAt) {
      data.completedAt = new Date(updateAssessmentDto.completedAt);
    }

    const assessment = await this.prisma.vendorAssessment.update({
      where: { id },
      data,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: assessment.organizationId,
      userId,
      action: 'UPDATE_ASSESSMENT',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${assessment.vendor.name} - ${assessment.assessmentType}`,
      description: `Updated ${assessment.assessmentType} assessment for ${assessment.vendor.name}`,
      changes: updateAssessmentDto,
    });

    return assessment;
  }

  async remove(id: string, userId: string) {
    const assessment = await this.prisma.vendorAssessment.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    await this.prisma.vendorAssessment.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId: assessment.organizationId,
      userId,
      action: 'DELETE_ASSESSMENT',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${assessment.vendor.name} - ${assessment.assessmentType}`,
      description: `Deleted ${assessment.assessmentType} assessment for ${assessment.vendor.name}`,
      metadata: {
        vendorId: assessment.vendorId,
        assessmentType: assessment.assessmentType,
      },
    });

    return assessment;
  }
}
