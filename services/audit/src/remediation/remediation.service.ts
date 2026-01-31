import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateRemediationPlanDto {
  findingId: string;
  description: string;
  priority?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedHours?: number;
  riskIfNotRemediated?: string;
}

export interface CreateMilestoneDto {
  title: string;
  description?: string;
  dueDate?: string;
  assignedTo?: string;
  evidenceRequired?: boolean;
}

export interface UpdateMilestoneDto {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  completedDate?: string;
  assignedTo?: string;
  notes?: string;
}

@Injectable()
export class RemediationService {
  private readonly logger = new Logger(RemediationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPlan(organizationId: string, dto: CreateRemediationPlanDto, userId: string) {
    // Verify finding exists
    const finding = await this.prisma.auditFinding.findFirst({
      where: { id: dto.findingId, organizationId },
    });
    if (!finding) throw new NotFoundException(`Finding ${dto.findingId} not found`);

    // Check if plan already exists
    const existing = await this.prisma.remediationPlan.findUnique({
      where: { findingId: dto.findingId },
    });
    if (existing) throw new Error('Remediation plan already exists for this finding');

    // Generate plan number
    const count = await this.prisma.remediationPlan.count({ where: { organizationId } });
    const planNumber = `POAM-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.remediationPlan.create({
      data: {
        findingId: dto.findingId,
        organizationId,
        planNumber,
        description: dto.description,
        priority: dto.priority || finding.severity,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
        estimatedHours: dto.estimatedHours,
        riskIfNotRemediated: dto.riskIfNotRemediated,
        createdBy: userId,
      },
      include: { finding: true, milestones: true },
    });
  }

  async findAllPlans(organizationId: string, status?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (status) where.status = status;

    return this.prisma.remediationPlan.findMany({
      where,
      include: {
        finding: { select: { id: true, title: true, severity: true, status: true } },
        milestones: { orderBy: { milestoneNumber: 'asc' } },
      },
      orderBy: [{ priority: 'asc' }, { scheduledEnd: 'asc' }],
    });
  }

  async findOnePlan(id: string, organizationId: string) {
    const plan = await this.prisma.remediationPlan.findFirst({
      where: { id, organizationId },
      include: {
        finding: true,
        milestones: {
          orderBy: { milestoneNumber: 'asc' },
          include: { assignedToUser: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!plan) throw new NotFoundException(`Remediation plan ${id} not found`);
    return plan;
  }

  async updatePlan(id: string, organizationId: string, dto: Partial<CreateRemediationPlanDto>) {
    await this.findOnePlan(id, organizationId);
    
    return this.prisma.remediationPlan.update({
      where: { id },
      data: {
        description: dto.description,
        priority: dto.priority,
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        scheduledEnd: dto.scheduledEnd ? new Date(dto.scheduledEnd) : undefined,
        estimatedHours: dto.estimatedHours,
        riskIfNotRemediated: dto.riskIfNotRemediated,
      },
      include: { finding: true, milestones: true },
    });
  }

  async addMilestone(planId: string, organizationId: string, dto: CreateMilestoneDto) {
    await this.findOnePlan(planId, organizationId);

    const count = await this.prisma.remediationMilestone.count({ where: { planId } });

    return this.prisma.remediationMilestone.create({
      data: {
        planId,
        milestoneNumber: count + 1,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assignedTo: dto.assignedTo,
        evidenceRequired: dto.evidenceRequired || false,
      },
    });
  }

  async updateMilestone(id: string, organizationId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.remediationMilestone.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!milestone || milestone.plan.organizationId !== organizationId) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
    if (dto.completedDate) data.completedDate = new Date(dto.completedDate);

    const updated = await this.prisma.remediationMilestone.update({
      where: { id },
      data,
    });

    // Update plan status if all milestones completed
    await this.updatePlanStatusFromMilestones(milestone.planId);

    return updated;
  }

  async deleteMilestone(id: string, organizationId: string) {
    const milestone = await this.prisma.remediationMilestone.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!milestone || milestone.plan.organizationId !== organizationId) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    return this.prisma.remediationMilestone.delete({ where: { id } });
  }

  async completePlan(id: string, organizationId: string, _userId: string) {
    await this.findOnePlan(id, organizationId);

    // Update plan
    await this.prisma.remediationPlan.update({
      where: { id },
      data: {
        status: 'completed',
        actualEnd: new Date(),
      },
    });

    // Update the related finding
    const plan = await this.prisma.remediationPlan.findUnique({
      where: { id },
    });

    if (plan) {
      await this.prisma.auditFinding.update({
        where: { id: plan.findingId },
        data: {
          status: 'resolved',
          actualDate: new Date(),
        },
      });
    }

    return this.findOnePlan(id, organizationId);
  }

  private async updatePlanStatusFromMilestones(planId: string) {
    const milestones = await this.prisma.remediationMilestone.findMany({
      where: { planId },
    });

    const allCompleted = milestones.length > 0 && milestones.every(m => m.status === 'completed');
    const anyInProgress = milestones.some(m => m.status === 'in_progress');
    const anyDelayed = milestones.some(m => m.status === 'delayed');

    let status = 'open';
    if (allCompleted) status = 'completed';
    else if (anyDelayed) status = 'delayed';
    else if (anyInProgress) status = 'in_progress';

    await this.prisma.remediationPlan.update({
      where: { id: planId },
      data: { status },
    });
  }

  async getStats(organizationId: string) {
    const [total, byStatus, byPriority, overdue] = await Promise.all([
      this.prisma.remediationPlan.count({ where: { organizationId } }),
      this.prisma.remediationPlan.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { status: true },
      }),
      this.prisma.remediationPlan.groupBy({
        by: ['priority'],
        where: { organizationId },
        _count: { priority: true },
      }),
      this.prisma.remediationPlan.count({
        where: {
          organizationId,
          status: { notIn: ['completed', 'cancelled'] },
          scheduledEnd: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      overdue,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count.status })),
      byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count.priority })),
    };
  }

  async exportPOAM(organizationId: string, format: 'json' | 'csv' = 'json') {
    const plans = await this.findAllPlans(organizationId);

    if (format === 'csv') {
      const headers = ['Plan Number', 'Finding', 'Severity', 'Description', 'Status', 'Priority', 'Scheduled Start', 'Scheduled End', 'Milestones'];
      const rows = plans.map(p => [
        p.planNumber,
        p.finding.title,
        p.finding.severity,
        p.description,
        p.status,
        p.priority,
        p.scheduledStart?.toISOString() || '',
        p.scheduledEnd?.toISOString() || '',
        p.milestones.length.toString(),
      ]);

      return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    }

    return plans;
  }
}

