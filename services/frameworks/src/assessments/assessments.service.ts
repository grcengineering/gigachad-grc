import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssessmentDto,
  UpdateRequirementStatusDto,
  CreateGapDto,
  CreateRemediationTaskDto,
} from './dto/assessment.dto';
import { Prisma, TaskStatus } from '@prisma/client';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  private frameworkScope(organizationId: string) {
    return [{ organizationId }, { organizationId: null }];
  }

  private async requireFrameworkAccess(frameworkId: string, organizationId: string) {
    const framework = await this.prisma.framework.findFirst({
      where: {
        id: frameworkId,
        deletedAt: null,
        OR: this.frameworkScope(organizationId),
      },
      select: { id: true },
    });
    if (!framework) {
      throw new NotFoundException(`Framework with ID ${frameworkId} not found`);
    }
  }

  private async requireRequirement(requirementId: string, frameworkId: string): Promise<void> {
    const requirement = await this.prisma.frameworkRequirement.findFirst({
      where: { id: requirementId, frameworkId },
      select: { id: true },
    });
    if (!requirement) {
      throw new NotFoundException(`Requirement with ID ${requirementId} not found`);
    }
  }

  private async requireOrganizationUser(userId: string | undefined, organizationId: string) {
    if (!userId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, status: 'active' },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  private async requireControls(controlIds: string[] | undefined, organizationId: string) {
    if (!controlIds?.length) return;
    const uniqueIds = [...new Set(controlIds)];
    const count = await this.prisma.control.count({
      where: {
        id: { in: uniqueIds },
        deletedAt: null,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more controls not found');
    }
  }

  private async requireEvidence(evidenceIds: string[] | undefined, organizationId: string) {
    if (!evidenceIds?.length) return;
    const uniqueIds = [...new Set(evidenceIds)];
    const count = await this.prisma.evidence.count({
      where: { id: { in: uniqueIds }, organizationId, deletedAt: null },
    });
    if (count !== uniqueIds.length) {
      throw new NotFoundException('One or more evidence items not found');
    }
  }

  async findAll(organizationId: string, frameworkId?: string) {
    if (frameworkId) {
      await this.requireFrameworkAccess(frameworkId, organizationId);
    }

    const where: { organizationId: string; frameworkId?: string } = { organizationId };
    if (frameworkId) {
      where.frameworkId = frameworkId;
    }

    return this.prisma.readinessAssessment.findMany({
      where,
      include: {
        framework: { select: { id: true, name: true, type: true } },
        _count: {
          select: { gaps: true, remediationTasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const assessment = await this.prisma.readinessAssessment.findFirst({
      where: {
        id,
        organizationId,
        framework: { OR: this.frameworkScope(organizationId) },
      },
      include: {
        framework: true,
        requirementStatuses: {
          include: {
            requirement: { select: { id: true, reference: true, title: true } },
          },
        },
        gaps: {
          include: {
            requirement: { select: { id: true, reference: true, title: true } },
          },
          orderBy: { severity: 'asc' },
        },
        remediationTasks: {
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async create(organizationId: string, userId: string, dto: CreateAssessmentDto) {
    await this.requireFrameworkAccess(dto.frameworkId, organizationId);

    // Create assessment
    const assessment = await this.prisma.readinessAssessment.create({
      data: {
        organizationId,
        frameworkId: dto.frameworkId,
        name: dto.name,
        description: dto.description,
        status: 'draft',
        score: 0,
        gapCount: 0,
      },
    });

    // Initialize requirement statuses
    const requirements = await this.prisma.frameworkRequirement.findMany({
      where: { frameworkId: dto.frameworkId, isCategory: false },
      select: { id: true },
    });

    await this.prisma.requirementStatus.createMany({
      data: requirements.map((req) => ({
        assessmentId: assessment.id,
        requirementId: req.id,
        status: 'not_assessed',
      })),
    });

    return assessment;
  }

  async updateRequirementStatus(
    assessmentId: string,
    requirementId: string,
    organizationId: string,
    userId: string,
    dto: UpdateRequirementStatusDto
  ) {
    const assessment = await this.findOne(assessmentId, organizationId);
    await Promise.all([
      this.requireRequirement(requirementId, assessment.frameworkId),
      this.requireEvidence(dto.evidenceIds, organizationId),
      this.requireControls(dto.linkedControlIds, organizationId),
    ]);

    const status = await this.prisma.requirementStatus.upsert({
      where: {
        assessmentId_requirementId: {
          assessmentId,
          requirementId,
        },
      },
      update: {
        status: dto.status,
        notes: dto.notes,
        updatedBy: userId,
      },
      create: {
        assessmentId,
        requirementId,
        status: dto.status,
        notes: dto.notes,
        updatedBy: userId,
      },
    });

    // Update evidence links via RequirementStatusEvidence junction table
    if (dto.evidenceIds !== undefined) {
      // Delete existing links
      await this.prisma.requirementStatusEvidence.deleteMany({
        where: { statusId: status.id },
      });

      // Create new links
      if (dto.evidenceIds.length > 0) {
        await this.prisma.requirementStatusEvidence.createMany({
          data: dto.evidenceIds.map((evidenceId) => ({
            statusId: status.id,
            evidenceId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update control links via RequirementStatusControl junction table
    if (dto.linkedControlIds !== undefined) {
      // Delete existing links
      await this.prisma.requirementStatusControl.deleteMany({
        where: { statusId: status.id },
      });

      // Create new links
      if (dto.linkedControlIds.length > 0) {
        await this.prisma.requirementStatusControl.createMany({
          data: dto.linkedControlIds.map((controlId) => ({
            statusId: status.id,
            controlId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Recalculate assessment score
    await this.recalculateScore(assessmentId);

    return status;
  }

  async getGaps(assessmentId: string, organizationId: string) {
    await this.findOne(assessmentId, organizationId);

    return this.prisma.gap.findMany({
      where: { assessmentId },
      include: {
        requirement: { select: { id: true, reference: true, title: true } },
        remediationTasks: true,
      },
      orderBy: [{ severity: 'asc' }, { remediationStatus: 'asc' }],
    });
  }

  async createGap(assessmentId: string, organizationId: string, dto: CreateGapDto) {
    const assessment = await this.findOne(assessmentId, organizationId);
    await Promise.all([
      this.requireRequirement(dto.requirementId, assessment.frameworkId),
      this.requireOrganizationUser(dto.assignedTo, organizationId),
    ]);

    const gap = await this.prisma.gap.create({
      data: {
        assessmentId,
        requirementId: dto.requirementId,
        severity: dto.severity,
        description: dto.description,
        recommendation: dto.recommendation,
        remediationStatus: 'open',
        assignedTo: dto.assignedTo,
        remediationDueDate: dto.remediationDueDate ? new Date(dto.remediationDueDate) : null,
      },
    });

    // Update gap count
    await this.prisma.readinessAssessment.update({
      where: { id: assessmentId },
      data: { gapCount: { increment: 1 } },
    });

    return gap;
  }

  async generateGapsFromAssessment(assessmentId: string, organizationId: string) {
    const assessment = await this.findOne(assessmentId, organizationId);

    // Find all non-compliant requirements
    const nonCompliantStatuses = assessment.requirementStatuses.filter(
      (s) => s.status === 'non_compliant' || s.status === 'partial'
    );

    if (nonCompliantStatuses.length === 0) {
      return [];
    }

    // Batch query: Get all existing gaps for these requirements in one query
    const requirementIds = nonCompliantStatuses.map((s) => s.requirementId);
    const existingGaps = await this.prisma.gap.findMany({
      where: {
        assessmentId,
        requirementId: { in: requirementIds },
      },
      select: { requirementId: true },
    });

    const existingRequirementIds = new Set(existingGaps.map((g) => g.requirementId));

    // Filter statuses that don't have existing gaps
    const statusesNeedingGaps = nonCompliantStatuses.filter(
      (s) => !existingRequirementIds.has(s.requirementId)
    );

    if (statusesNeedingGaps.length === 0) {
      return [];
    }

    // Batch create: Create all gaps in one operation
    const gapData = statusesNeedingGaps.map((status) => ({
      assessmentId,
      requirementId: status.requirementId,
      severity: status.status === 'non_compliant' ? 'high' : 'medium',
      description: `Requirement ${status.requirement.reference} is ${status.status.replace('_', ' ')}.`,
      recommendation: `Review and implement controls to address ${status.requirement.title}.`,
      remediationStatus: 'open',
    }));

    await this.prisma.gap.createMany({
      data: gapData,
      skipDuplicates: true,
    });

    // Fetch the newly created gaps to return
    const newGaps = await this.prisma.gap.findMany({
      where: {
        assessmentId,
        requirementId: { in: statusesNeedingGaps.map((s) => s.requirementId) },
      },
    });

    // Update gap count
    await this.prisma.readinessAssessment.update({
      where: { id: assessmentId },
      data: { gapCount: assessment.gapCount + newGaps.length },
    });

    return newGaps;
  }

  async createRemediationTask(
    assessmentId: string,
    organizationId: string,
    userId: string,
    dto: CreateRemediationTaskDto
  ) {
    await this.findOne(assessmentId, organizationId);
    const gap = await this.prisma.gap.findFirst({
      where: { id: dto.gapId, assessmentId },
      select: { id: true },
    });
    if (!gap) {
      throw new NotFoundException(`Gap with ID ${dto.gapId} not found`);
    }
    await Promise.all([
      this.requireOrganizationUser(dto.assignedTo, organizationId),
      this.requireControls(dto.linkedControlIds, organizationId),
    ]);

    const task = await this.prisma.remediationTask.create({
      data: {
        gapId: dto.gapId,
        assessmentId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority || 'medium',
        status: 'todo',
        assignedTo: dto.assignedTo,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        effort: dto.effort,
      },
    });

    // Link controls via RemediationTaskControl junction table
    if (dto.linkedControlIds && dto.linkedControlIds.length > 0) {
      await this.prisma.remediationTaskControl.createMany({
        data: dto.linkedControlIds.map((controlId) => ({
          taskId: task.id,
          controlId,
        })),
        skipDuplicates: true,
      });
    }

    return task;
  }

  async updateRemediationTask(
    assessmentId: string,
    taskId: string,
    organizationId: string,
    dto: Partial<CreateRemediationTaskDto> & { status?: string }
  ) {
    await this.findOne(assessmentId, organizationId);
    const existingTask = await this.prisma.remediationTask.findFirst({
      where: { id: taskId, assessmentId },
      select: { id: true },
    });
    if (!existingTask) {
      throw new NotFoundException(`Remediation task with ID ${taskId} not found`);
    }
    await Promise.all([
      this.requireOrganizationUser(dto.assignedTo, organizationId),
      this.requireControls(dto.linkedControlIds, organizationId),
    ]);

    if (dto.gapId !== undefined) {
      const gap = await this.prisma.gap.findFirst({
        where: { id: dto.gapId, assessmentId },
        select: { id: true },
      });
      if (!gap) {
        throw new NotFoundException(`Gap with ID ${dto.gapId} not found`);
      }
    }

    const updateData: Prisma.RemediationTaskUpdateInput = {};
    if (dto.gapId !== undefined) updateData.gap = { connect: { id: dto.gapId } };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) updateData.status = dto.status as TaskStatus;
    if (dto.assignedTo !== undefined) updateData.assignee = { connect: { id: dto.assignedTo } };
    if (dto.effort !== undefined) updateData.effort = dto.effort;
    if (dto.dueDate) updateData.dueDate = new Date(dto.dueDate);
    if (dto.status === 'completed') updateData.completedAt = new Date();

    const task = await this.prisma.remediationTask.update({
      where: { id: taskId },
      data: updateData,
    });

    // Update control links via RemediationTaskControl junction table
    if (dto.linkedControlIds !== undefined) {
      // Delete existing links
      await this.prisma.remediationTaskControl.deleteMany({
        where: { taskId },
      });

      // Create new links
      if (dto.linkedControlIds.length > 0) {
        await this.prisma.remediationTaskControl.createMany({
          data: dto.linkedControlIds.map((controlId) => ({
            taskId,
            controlId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return task;
  }

  async completeAssessment(assessmentId: string, organizationId: string, userId: string) {
    await this.findOne(assessmentId, organizationId);

    return this.prisma.readinessAssessment.update({
      where: { id: assessmentId },
      data: {
        status: 'completed',
        assessedAt: new Date(),
        assessedBy: userId,
      },
    });
  }

  private async recalculateScore(assessmentId: string) {
    const statuses = await this.prisma.requirementStatus.findMany({
      where: { assessmentId },
    });

    const total = statuses.length;
    const compliant = statuses.filter((s) => s.status === 'compliant').length;
    const partial = statuses.filter((s) => s.status === 'partial').length;
    const na = statuses.filter((s) => s.status === 'not_applicable').length;

    const applicable = total - na;
    const score = applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0;

    await this.prisma.readinessAssessment.update({
      where: { id: assessmentId },
      data: { score },
    });
  }
}
