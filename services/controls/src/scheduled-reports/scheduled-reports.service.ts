import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/scheduled-report.dto';
import { Prisma, ScheduledReport } from '@prisma/client';
import { ConfigurableEmailService } from '../notifications-config/configurable-email.service';
import { ExportsService } from '../exports/exports.service';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: ConfigurableEmailService,
    private readonly exports: ExportsService,
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

    if (report.recipients.length === 0) {
      throw new BadRequestException('Scheduled report has no recipients');
    }
    if (!(await this.email.isConfigured(organizationId))) {
      throw new BadRequestException('Email delivery is not configured for this organization');
    }
    const execution = await this.prisma.scheduledReportExecution.create({
      data: {
        scheduledReportId: id,
        status: 'pending',
        recipientCount: report.recipients.length,
      },
    });

    this.logger.log(`Executing scheduled report ${id} (execution: ${execution.id})`);
    const result = await this.executeReport(report, execution.id);
    if (result.status === 'failed') {
      throw new BadRequestException('Report generation or delivery failed');
    }

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
      message: 'Report generated and delivered',
      executionId: execution.id,
      status: result.status,
    };
  }

  /**
   * Claim and execute reports whose next run is due. The conditional update
   * prevents multiple scheduler instances from claiming the same occurrence.
   */
  async processDueReports(): Promise<number> {
    const now = new Date();
    const due = await this.prisma.scheduledReport.findMany({
      where: { isEnabled: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: 'asc' },
    });
    let claimed = 0;
    for (const report of due) {
      const nextRunAt = this.calculateNextRun(
        report.frequency,
        report.dayOfWeek ?? undefined,
        report.dayOfMonth ?? undefined,
        report.time,
        report.timezone,
      );
      const claim = await this.prisma.scheduledReport.updateMany({
        where: { id: report.id, organizationId: report.organizationId, nextRunAt: { lte: now } },
        data: { nextRunAt },
      });
      if (claim.count === 0) continue;
      claimed++;
      const execution = await this.prisma.scheduledReportExecution.create({
        data: {
          scheduledReportId: report.id,
          status: 'pending',
          recipientCount: report.recipients.length,
        },
      });
      await this.executeReport(report, execution.id);
    }
    return claimed;
  }

  private async executeReport(
    report: ScheduledReport,
    executionId: string,
  ): Promise<{ status: 'success' | 'failed' }> {
    await this.prisma.scheduledReportExecution.update({
      where: { id: executionId },
      data: { status: 'running' },
    });
    try {
      if (!(await this.email.isConfigured(report.organizationId))) {
        throw new Error('Email delivery is not configured for this organization');
      }
      const rows = await this.getReportRows(report.organizationId, report.reportType);
      const format = report.format as 'pdf' | 'csv' | 'xlsx';
      const file = await this.exports.formatRows(rows, format);
      const mimeType = this.exports.getFormatContentType(format);
      const fileName = `${report.reportType.replace(/[^a-z0-9_-]/gi, '_')}-${new Date()
        .toISOString()
        .slice(0, 10)}.${format}`;
      let deliveredCount = 0;
      for (const recipient of report.recipients) {
        const sent = await this.email.sendEmail(report.organizationId, {
          to: recipient,
          subject: report.name,
          html: `<p>Your scheduled GigaChad GRC report <strong>${report.name}</strong> is attached.</p>`,
          text: `Your scheduled GigaChad GRC report "${report.name}" is attached.`,
          attachments: [{ filename: fileName, content: file, contentType: mimeType }],
        });
        if (!sent) {
          throw new Error(`Email delivery failed for ${recipient}`);
        }
        deliveredCount++;
        await this.prisma.scheduledReportExecution.update({
          where: { id: executionId },
          data: { deliveredCount },
        });
      }
      const completedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.scheduledReportExecution.update({
          where: { id: executionId },
          data: {
            status: 'success',
            completedAt,
            deliveredCount,
            fileName,
            mimeType,
            fileContent: file,
            fileSize: file.length,
          },
        }),
        this.prisma.scheduledReport.update({
          where: { id: report.id },
          data: {
            lastRunAt: completedAt,
            lastRunStatus: 'success',
            lastRunError: null,
          },
        }),
      ]);
      await this.audit.log({
        organizationId: report.organizationId,
        userId: report.userId,
        action: 'DELIVER',
        entityType: 'ScheduledReportExecution',
        entityId: executionId,
        entityName: report.name,
        description: `Delivered scheduled report to ${deliveredCount} recipients`,
      });
      return { status: 'success' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const completedAt = new Date();
      await this.prisma.$transaction([
        this.prisma.scheduledReportExecution.update({
          where: { id: executionId },
          data: { status: 'failed', completedAt, error: message },
        }),
        this.prisma.scheduledReport.update({
          where: { id: report.id },
          data: {
            lastRunAt: completedAt,
            lastRunStatus: 'failed',
            lastRunError: message,
          },
        }),
      ]);
      await this.audit.log({
        organizationId: report.organizationId,
        userId: report.userId,
        action: 'DELIVERY_FAILED',
        entityType: 'ScheduledReportExecution',
        entityId: executionId,
        entityName: report.name,
        description: `Scheduled report failed: ${message}`,
      });
      this.logger.error(`Scheduled report ${report.id} failed: ${message}`);
      return { status: 'failed' };
    }
  }

  private async getReportRows(
    organizationId: string,
    reportType: string,
  ): Promise<unknown[]> {
    switch (reportType.replace(/_/g, '-')) {
      case 'risk-register':
        return this.prisma.risk.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
      case 'control-coverage':
        return this.prisma.controlImplementation.findMany({
          where: { organizationId },
          include: { control: true },
          orderBy: { updatedAt: 'desc' },
        });
      case 'audit-findings':
        return this.prisma.auditFinding.findMany({
          where: { organizationId },
          orderBy: { updatedAt: 'desc' },
        });
      case 'evidence-inventory':
        return this.prisma.evidence.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
      case 'compliance-rollup':
      case 'compliance-summary':
        return this.prisma.readinessAssessment.findMany({
          where: { organizationId },
          include: { framework: true },
          orderBy: { updatedAt: 'desc' },
        });
      case 'custom': {
        const [controls, policies, risks, evidence] = await Promise.all([
          this.prisma.controlImplementation.count({ where: { organizationId } }),
          this.prisma.policy.count({ where: { organizationId, deletedAt: null } }),
          this.prisma.risk.count({ where: { organizationId, deletedAt: null } }),
          this.prisma.evidence.count({ where: { organizationId, deletedAt: null } }),
        ]);
        return [{ controls, policies, risks, evidence, generatedAt: new Date() }];
      }
      default:
        throw new Error(`Unsupported scheduled report type: ${reportType}`);
    }
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
    _timezone = 'UTC',
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    const next = new Date(now);
    next.setUTCHours(hours, minutes, 0, 0);

    // If the time today has passed, start from tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    switch (frequency) {
      case 'daily':
        // Already set to next occurrence
        break;
      
      case 'weekly': {
        // Move to the specified day of week
        const targetDay = dayOfWeek ?? 1; // Default to Monday
        while (next.getUTCDay() !== targetDay) {
          next.setDate(next.getDate() + 1);
        }
        break;
      }
      
      case 'monthly': {
        // Move to the specified day of month
        const targetDate = dayOfMonth ?? 1;
        next.setDate(targetDate);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(targetDate);
        }
        break;
      }
      
      case 'quarterly': {
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
    }

    return next;
  }

  /**
   * Format report for API response
   */
  private formatReport(report: Record<string, unknown>) {
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
      lastRun: (report.lastRunAt as Date)?.toISOString(),
      nextRun: (report.nextRunAt as Date)?.toISOString(),
      createdAt: (report.createdAt as Date).toISOString(),
    };
  }
}
