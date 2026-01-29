import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomReportDto, UpdateCustomReportDto } from './dto/custom-report.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * List all custom reports for the organization
   * Returns user's own reports + shared reports from others
   */
  async findAll(organizationId: string, userId: string) {
    const reports = await this.prisma.customReport.findMany({
      where: {
        organizationId,
        OR: [
          { userId }, // User's own reports
          { isShared: true }, // Shared reports from others
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reports.map(this.formatReport);
  }

  /**
   * Get a specific custom report by ID
   */
  async findOne(organizationId: string, userId: string, id: string) {
    const report = await this.prisma.customReport.findFirst({
      where: {
        id,
        organizationId,
        OR: [
          { userId },
          { isShared: true },
        ],
      },
    });

    if (!report) {
      throw new NotFoundException(`Custom report with ID ${id} not found`);
    }

    return this.formatReport(report);
  }

  /**
   * Create a new custom report
   */
  async create(organizationId: string, userId: string, dto: CreateCustomReportDto) {
    const report = await this.prisma.customReport.create({
      data: {
        organizationId,
        userId,
        name: dto.name,
        description: dto.description,
        reportType: dto.reportType,
        sections: (dto.sections || []) as Prisma.InputJsonValue,
        filters: (dto.filters || {}) as Prisma.InputJsonValue,
        chartConfigs: (dto.chartConfigs || []) as Prisma.InputJsonValue,
        includeCharts: dto.includeCharts ?? true,
        includeTables: dto.includeTables ?? true,
        isShared: dto.isShared ?? false,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'CustomReport',
      entityId: report.id,
      entityName: report.name,
      description: `Created custom report: ${report.name}`,
    });

    return this.formatReport(report);
  }

  /**
   * Update an existing custom report
   */
  async update(organizationId: string, userId: string, id: string, dto: UpdateCustomReportDto) {
    // Verify ownership
    const existing = await this.prisma.customReport.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Custom report with ID ${id} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only update your own reports');
    }

    const report = await this.prisma.customReport.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        sections: dto.sections as Prisma.InputJsonValue | undefined,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        chartConfigs: dto.chartConfigs as Prisma.InputJsonValue | undefined,
        includeCharts: dto.includeCharts,
        includeTables: dto.includeTables,
        isShared: dto.isShared,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'CustomReport',
      entityId: report.id,
      entityName: report.name,
      description: `Updated custom report: ${report.name}`,
    });

    return this.formatReport(report);
  }

  /**
   * Delete a custom report
   */
  async delete(organizationId: string, userId: string, id: string) {
    // Verify ownership
    const existing = await this.prisma.customReport.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Custom report with ID ${id} not found`);
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    await this.prisma.customReport.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'CustomReport',
      entityId: id,
      entityName: existing.name,
      description: `Deleted custom report: ${existing.name}`,
    });
  }

  /**
   * Format report for API response
   */
  private formatReport(report: any) {
    return {
      id: report.id,
      name: report.name,
      description: report.description,
      reportType: report.reportType,
      sections: report.sections,
      filters: report.filters,
      chartConfigs: report.chartConfigs,
      includeCharts: report.includeCharts,
      includeTables: report.includeTables,
      isShared: report.isShared,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }
}
