import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/scheduled-report.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all scheduled reports for the organization
   */
  async findAll(organizationId: string) {
    const reports = await this.prisma.scheduledReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(this.formatReport);
  }

  /**
   * Get a specific scheduled report by ID
   */
  async findOne(organizationId: string, id: string) {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });

    if (!report) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    return this.formatReport(report);
  }

  /**
   * Create a new scheduled report
   */
  async create(organizationId: string, userId: string, dto: CreateScheduledReportDto) {
    const nextRun = this.calculateNextRun(dto.frequency, dto.dayOfWeek, dto.dayOfMonth, dto.time, dto.timezone || 'UTC');

    const report = await this.prisma.scheduledReport.create({
      data: {
        organizationId,
        userId,
        name: dto.name,
        reportType: dto.reportType,
        format: dto.format,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        time: dto.time,
        timezone: dto.timezone || 'UTC',
        recipients: dto.recipients,
        filters: (dto.filters || {}) as Prisma.InputJsonValue,
        isEnabled: dto.enabled ?? true,
        nextRunAt: nextRun,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'ScheduledReport',
      entityId: report.id,
      entityName: report.name,
      description: `Created scheduled report: ${report.name}`,
    });

    return this.formatReport(report);
  }

  /**
   * Update an existing scheduled report
   */
  async update(organizationId: string, userId: string, id: string, dto: UpdateScheduledReportDto) {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    // Recalculate next run if schedule changed
    let nextRun = existing.nextRunAt;
    if (dto.frequency || dto.dayOfWeek !== undefined || dto.dayOfMonth !== undefined || dto.time) {
      nextRun = this.calculateNextRun(
        dto.frequency || existing.frequency,
        dto.dayOfWeek ?? existing.dayOfWeek ?? undefined,
        dto.dayOfMonth ?? existing.dayOfMonth ?? undefined,
        dto.time || existing.time,
        dto.timezone || existing.timezone,
      );
    }

    const report = await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        name: dto.name,
        format: dto.format,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        time: dto.time,
        timezone: dto.timezone,
        recipients: dto.recipients,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        isEnabled: dto.enabled,
        nextRunAt: nextRun,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'ScheduledReport',
      entityId: report.id,
      entityName: report.name,
      description: `Updated scheduled report: ${report.name}`,
    });

    return this.formatReport(report);
  }

  /**
   * Delete a scheduled report
   */
  async delete(organizationId: string, userId: string, id: string) {
    const existing = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    await this.prisma.scheduledReport.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'ScheduledReport',
      entityId: id,
      entityName: existing.name,
      description: `Deleted scheduled report: ${existing.name}`,
    });
  }

  /**
   * Manually trigger a scheduled report to run now
   */
  async runNow(organizationId: string, userId: string, id: string) {
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });

    if (!report) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    // Create execution record
    const execution = await this.prisma.scheduledReportExecution.create({
      data: {
        scheduledReportId: id,
        status: 'pending',
        recipientCount: report.recipients.length,
      },
    });

    // Queue the report generation (in a real implementation, this would go to a job queue)
    this.logger.log(`Queued scheduled report ${id} for immediate execution (execution: ${execution.id})`);

    // For now, we'll mark it as running and return
    await this.prisma.scheduledReportExecution.update({
      where: { id: execution.id },
      data: { status: 'running' },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'RUN',
      entityType: 'ScheduledReport',
      entityId: id,
      entityName: report.name,
      description: `Manually triggered scheduled report: ${report.name}`,
    });

    return {
      message: 'Report queued for generation',
      executionId: execution.id,
    };
  }

  /**
   * Get execution history for a scheduled report
   */
  async getExecutions(organizationId: string, id: string, limit = 10) {
    // First verify the report exists and belongs to the org
    const report = await this.prisma.scheduledReport.findFirst({
      where: { id, organizationId },
    });

    if (!report) {
      throw new NotFoundException(`Scheduled report with ID ${id} not found`);
    }

    const executions = await this.prisma.scheduledReportExecution.findMany({
      where: { scheduledReportId: id },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return executions.map(exec => ({
      id: exec.id,
      status: exec.status,
      startedAt: exec.startedAt.toISOString(),
      completedAt: exec.completedAt?.toISOString(),
      error: exec.error,
      recipientCount: exec.recipientCount,
    }));
  }

  /**
   * Calculate the next run time based on schedule
   */
  private calculateNextRun(
    frequency: string,
    dayOfWeek?: number,
    dayOfMonth?: number,
    time = '09:00',
    timezone = 'UTC',
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    let next = new Date(now);
    next.setUTCHours(hours, minutes, 0, 0);

    // If the time today has passed, start from tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case 'daily':
        // Already set to next occurrence
        break;
      
      case 'weekly':
        // Move to the specified day of week
        const targetDay = dayOfWeek ?? 1; // Default to Monday
        while (next.getUTCDay() !== targetDay) {
          next.setDate(next.getDate() + 1);
        }
        break;
      
      case 'monthly':
        // Move to the specified day of month
        const targetDate = dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(targetDate);
        }
        break;
      
      case 'quarterly':
        // Run on specified day of first month of each quarter
        const targetQuarterDate = dayOfMonth ?? 1;
        const currentMonth = next.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        next.setMonth(quarterStartMonth);
        next.setDate(targetQuarterDate);
        if (next <= now) {
          next.setMonth(quarterStartMonth + 3);
          next.setDate(targetQuarterDate);
        }
        break;
    }

    return next;
  }

  /**
   * Format report for API response
   */
  private formatReport(report: any) {
    return {
      id: report.id,
      name: report.name,
      reportType: report.reportType,
      format: report.format,
      schedule: {
        frequency: report.frequency,
        dayOfWeek: report.dayOfWeek,
        dayOfMonth: report.dayOfMonth,
        time: report.time,
      },
      recipients: report.recipients,
      filters: report.filters,
      enabled: report.isEnabled,
      lastRun: report.lastRunAt?.toISOString(),
      nextRun: report.nextRunAt?.toISOString(),
      createdAt: report.createdAt.toISOString(),
    };
  }
}
