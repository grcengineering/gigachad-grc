import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { calculateNextReviewDate } from '../vendors/vendors.service';
import { Prisma, VendorAssessment, Vendor, VendorAssessmentStatus } from '@prisma/client';

// Type for assessment with vendor relation
type AssessmentWithVendor = VendorAssessment & {
  vendor: Pick<Vendor, 'id' | 'name'>;
};

// Type for assessment with full vendor and review frequency
type AssessmentWithVendorFrequency = VendorAssessment & {
  vendor: Pick<Vendor, 'id' | 'name' | 'reviewFrequency'>;
};

// Helper to convert string to VendorAssessmentStatus
function toAssessmentStatus(status: string | undefined, defaultValue: VendorAssessmentStatus = 'pending'): VendorAssessmentStatus {
  const validStatuses: VendorAssessmentStatus[] = ['pending', 'in_progress', 'completed'];
  return validStatuses.includes(status as VendorAssessmentStatus) ? status as VendorAssessmentStatus : defaultValue;
}

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto, userId: string) {
    const { status, dueDate, completedAt, responses, findings, ...rest } = createAssessmentDto;
    const assessment = await this.prisma.vendorAssessment.create({
      data: {
        ...rest,
        status: toAssessmentStatus(status),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        responses: responses as Prisma.InputJsonValue,
        findings: findings as Prisma.InputJsonValue,
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

    const assessmentWithVendor = assessment as AssessmentWithVendor;

    await this.audit.log({
      organizationId: assessment.organizationId,
      userId,
      action: 'CREATE_ASSESSMENT',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${assessmentWithVendor.vendor.name} - ${assessment.assessmentType}`,
      description: `Created ${assessment.assessmentType} assessment for ${assessmentWithVendor.vendor.name}`,
      metadata: {
        vendorId: assessment.vendorId,
        assessmentType: assessment.assessmentType,
      },
    });

    return assessment;
  }

  async findAll(
    organizationId: string,
    filters?: {
      vendorId?: string;
      assessmentType?: string;
      status?: string;
    }
  ) {
    const where: Prisma.VendorAssessmentWhereInput = {
      organizationId, // Required for multi-tenant data isolation
    };

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.assessmentType) {
      where.assessmentType = filters.assessmentType;
    }

    if (filters?.status) {
      where.status = toAssessmentStatus(filters.status);
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

  async findOne(id: string, organizationId: string) {
    // SECURITY: Use findFirst with organizationId to prevent IDOR
    // This ensures users can only access assessments within their organization
    const assessment = await this.prisma.vendorAssessment.findFirst({
      where: { 
        id,
        organizationId, // Tenant isolation - prevents cross-organization access
      },
      include: {
        vendor: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async update(id: string, updateAssessmentDto: UpdateAssessmentDto, userId: string, organizationId: string) {
    // SECURITY: Verify assessment belongs to user's organization before updating
    const currentAssessment = await this.findOne(id, organizationId);
    
    const { status, dueDate, completedAt, responses, findings, ...rest } = updateAssessmentDto;
    const data: Prisma.VendorAssessmentUpdateInput = { ...rest };

    if (status) {
      data.status = toAssessmentStatus(status);
    }

    if (dueDate) {
      data.dueDate = new Date(dueDate);
    }

    if (completedAt) {
      data.completedAt = new Date(completedAt);
    }

    if (responses !== undefined) {
      data.responses = responses as Prisma.InputJsonValue;
    }

    if (findings !== undefined) {
      data.findings = findings as Prisma.InputJsonValue;
    }

    // If status is being changed to 'completed', set completedAt if not provided
    if (status === 'completed' && !data.completedAt) {
      data.completedAt = new Date();
    }

    const assessment = await this.prisma.vendorAssessment.update({
      where: { id },
      data,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            reviewFrequency: true,
          },
        },
      },
    });

    // If assessment was just completed, update vendor's review dates
    if (
      updateAssessmentDto.status === 'completed' &&
      currentAssessment.status !== 'completed'
    ) {
      const now = new Date();
      const assessmentWithFrequency = assessment as AssessmentWithVendorFrequency;
      const reviewFrequency = assessmentWithFrequency.vendor.reviewFrequency || 'annual';
      const nextReviewDue = calculateNextReviewDate(now, reviewFrequency);

      await this.prisma.vendor.update({
        where: { id: assessment.vendorId },
        data: {
          lastReviewedAt: now,
          nextReviewDue,
        },
      });

      await this.audit.log({
        organizationId: assessment.organizationId,
        userId,
        action: 'VENDOR_REVIEW_COMPLETED',
        entityType: 'vendor',
        entityId: assessment.vendorId,
        entityName: assessment.vendor.name,
        description: `Completed ${assessment.assessmentType} review for ${assessment.vendor.name}. Next review due: ${nextReviewDue.toISOString().split('T')[0]}`,
        metadata: {
          assessmentId: assessment.id,
          assessmentType: assessment.assessmentType,
          nextReviewDue,
        },
      });
    }

    await this.audit.log({
      organizationId: assessment.organizationId,
      userId,
      action: 'UPDATE_ASSESSMENT',
      entityType: 'assessment',
      entityId: assessment.id,
      entityName: `${assessment.vendor.name} - ${assessment.assessmentType}`,
      description: `Updated ${assessment.assessmentType} assessment for ${assessment.vendor.name}`,
      changes: updateAssessmentDto as unknown as Prisma.InputJsonValue,
    });

    return assessment;
  }

  async remove(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify assessment belongs to user's organization before deleting
    const assessment = await this.findOne(id, organizationId);

    await this.prisma.vendorAssessment.delete({
      where: { id: assessment.id },
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

  /**
   * Get upcoming assessments (pending or in_progress with due dates)
   */
  async getUpcomingAssessments(organizationId?: string) {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const baseWhere: Prisma.VendorAssessmentWhereInput = {
      status: { in: ['pending', 'in_progress'] },
    };

    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    const [dueThisWeek, dueThisMonth, allPending] = await Promise.all([
      this.prisma.vendorAssessment.findMany({
        where: {
          ...baseWhere,
          dueDate: { gte: now, lte: oneWeekFromNow },
        },
        include: {
          vendor: {
            select: { id: true, name: true, tier: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),

      this.prisma.vendorAssessment.findMany({
        where: {
          ...baseWhere,
          dueDate: { gt: oneWeekFromNow, lte: oneMonthFromNow },
        },
        include: {
          vendor: {
            select: { id: true, name: true, tier: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),

      this.prisma.vendorAssessment.count({
        where: baseWhere,
      }),
    ]);

    return {
      dueThisWeek,
      dueThisMonth,
      totalPending: allPending,
    };
  }

  /**
   * Get overdue assessments
   */
  async getOverdueAssessments(organizationId?: string) {
    const now = new Date();

    const where: Prisma.VendorAssessmentWhereInput = {
      status: { in: ['pending', 'in_progress'] },
      dueDate: { lt: now },
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    const overdue = await this.prisma.vendorAssessment.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, name: true, tier: true, inherentRiskScore: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return overdue.map((assessment) => ({
      ...assessment,
      daysOverdue: Math.ceil(
        (now.getTime() - new Date(assessment.dueDate!).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    }));
  }

  /**
   * Get assessment statistics for dashboard
   */
  async getAssessmentStats(organizationId?: string) {
    const now = new Date();

    const where: Prisma.VendorAssessmentWhereInput = {};
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [total, byStatus, overdue, completedThisMonth] = await Promise.all([
      this.prisma.vendorAssessment.count({ where }),

      this.prisma.vendorAssessment.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      this.prisma.vendorAssessment.count({
        where: {
          ...where,
          status: { in: ['pending', 'in_progress'] },
          dueDate: { lt: now },
        },
      }),

      this.prisma.vendorAssessment.count({
        where: {
          ...where,
          status: 'completed',
          completedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      overdue,
      completedThisMonth,
    };
  }
}
