import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPlanEntry } from '@prisma/client';

export interface CreatePlanEntryDto {
  year: number;
  quarter?: number;
  auditName: string;
  auditType: string;
  framework?: string;
  scope?: string;
  objectives?: string;
  riskRating?: string;
  estimatedHours?: number;
  estimatedBudget?: number;
  assignedTeam?: string[];
  leadAuditor?: string;
  notes?: string;
}

export interface UpdatePlanEntryDto extends Partial<CreatePlanEntryDto> {
  status?: string;
  deferralReason?: string;
  linkedAuditId?: string;
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreatePlanEntryDto, userId: string) {
    return this.prisma.auditPlanEntry.create({
      data: {
        organizationId,
        year: dto.year,
        quarter: dto.quarter,
        auditName: dto.auditName,
        auditType: dto.auditType,
        framework: dto.framework,
        scope: dto.scope,
        objectives: dto.objectives,
        riskRating: dto.riskRating,
        estimatedHours: dto.estimatedHours,
        estimatedBudget: dto.estimatedBudget,
        assignedTeam: dto.assignedTeam || [],
        leadAuditor: dto.leadAuditor,
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async findAll(organizationId: string, year?: number, status?: string) {
    const where: Record<string, unknown> = { organizationId };
    if (year) where.year = year;
    if (status) where.status = status;

    return this.prisma.auditPlanEntry.findMany({
      where,
      include: {
        linkedAudit: { select: { id: true, name: true, status: true } },
      },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }, { riskRating: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const entry = await this.prisma.auditPlanEntry.findFirst({
      where: { id, organizationId },
      include: {
        linkedAudit: true,
        createdByUser: { select: { id: true, displayName: true } },
      },
    });
    if (!entry) throw new NotFoundException(`Plan entry ${id} not found`);
    return entry;
  }

  async update(id: string, organizationId: string, dto: UpdatePlanEntryDto) {
    await this.findOne(id, organizationId);

    return this.prisma.auditPlanEntry.update({
      where: { id },
      data: {
        year: dto.year,
        quarter: dto.quarter,
        auditName: dto.auditName,
        auditType: dto.auditType,
        framework: dto.framework,
        scope: dto.scope,
        objectives: dto.objectives,
        riskRating: dto.riskRating,
        estimatedHours: dto.estimatedHours,
        estimatedBudget: dto.estimatedBudget,
        assignedTeam: dto.assignedTeam,
        leadAuditor: dto.leadAuditor,
        notes: dto.notes,
        status: dto.status,
        deferralReason: dto.deferralReason,
        linkedAuditId: dto.linkedAuditId,
      },
    });
  }

  async delete(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.auditPlanEntry.delete({ where: { id } });
  }

  async getCalendarView(organizationId: string, startYear: number, endYear: number) {
    const entries = await this.prisma.auditPlanEntry.findMany({
      where: {
        organizationId,
        year: { gte: startYear, lte: endYear },
      },
      orderBy: [{ year: 'asc' }, { quarter: 'asc' }],
    });

    // Group by year and quarter
    const calendar: Record<number, Record<number, typeof entries>> = {};
    
    for (let year = startYear; year <= endYear; year++) {
      calendar[year] = { 1: [], 2: [], 3: [], 4: [] };
    }

    entries.forEach(entry => {
      const quarter = entry.quarter || 1;
      if (calendar[entry.year]) {
        calendar[entry.year][quarter].push(entry);
      }
    });

    return calendar;
  }

  async getCapacityAnalysis(organizationId: string, year: number) {
    const entries = await this.prisma.auditPlanEntry.findMany({
      where: { organizationId, year },
    });

    const byQuarter = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let totalHours = 0;
    let totalBudget = 0;

    entries.forEach(entry => {
      const quarter = entry.quarter || 1;
      byQuarter[quarter as 1 | 2 | 3 | 4] += entry.estimatedHours || 0;
      totalHours += entry.estimatedHours || 0;
      totalBudget += Number(entry.estimatedBudget) || 0;
    });

    return {
      year,
      totalEntries: entries.length,
      totalHours,
      totalBudget,
      hoursByQuarter: byQuarter,
      byRiskRating: this.groupBy(entries, 'riskRating'),
      byType: this.groupBy(entries, 'auditType'),
      byStatus: this.groupBy(entries, 'status'),
    };
  }

  private groupBy(items: AuditPlanEntry[], key: keyof AuditPlanEntry): Record<string, number> {
    const result: Record<string, number> = {};
    items.forEach(item => {
      const value = String(item[key] || 'unspecified');
      result[value] = (result[value] || 0) + 1;
    });
    return result;
  }

  async convertToAudit(id: string, organizationId: string, userId: string) {
    const entry = await this.findOne(id, organizationId);

    // Generate audit ID
    const count = await this.prisma.audit.count({ where: { organizationId } });
    const auditId = `AUD-${String(count + 1).padStart(3, '0')}`;

    // Create the audit
    const audit = await this.prisma.audit.create({
      data: {
        organizationId,
        auditId,
        name: entry.auditName,
        auditType: entry.auditType,
        framework: entry.framework,
        scope: entry.scope,
        objectives: entry.objectives,
        createdBy: userId,
      },
    });

    // Link the plan entry to the audit
    await this.prisma.auditPlanEntry.update({
      where: { id },
      data: {
        linkedAuditId: audit.id,
        status: 'in_progress',
      },
    });

    return audit;
  }
}

