import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  validatePropertyName,
  safePropertySet,
  safeOrderBy,
  escapeHtml,
} from '@gigachad-grc/shared';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  DataQueryDto,
  DataSourceType,
  DataSourceDefinitionDto,
  FilterOperator,
} from './dto/dashboard.dto';

// Field definitions for each data source
const DATA_SOURCE_FIELDS: Record<DataSourceType, DataSourceDefinitionDto['fields']> = {
  [DataSourceType.CONTROLS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    {
      name: 'controlId',
      type: 'string',
      label: 'Control ID',
      filterable: true,
      aggregatable: false,
    },
    { name: 'title', type: 'string', label: 'Title', filterable: true, aggregatable: false },
    { name: 'status', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    { name: 'category', type: 'string', label: 'Category', filterable: true, aggregatable: true },
    { name: 'ownerId', type: 'string', label: 'Owner', filterable: true, aggregatable: true },
    { name: 'dueDate', type: 'date', label: 'Due Date', filterable: true, aggregatable: false },
    {
      name: 'effectiveness',
      type: 'number',
      label: 'Effectiveness',
      filterable: true,
      aggregatable: true,
    },
    { name: 'createdAt', type: 'date', label: 'Created At', filterable: true, aggregatable: false },
  ],
  [DataSourceType.RISKS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'title', type: 'string', label: 'Title', filterable: true, aggregatable: false },
    { name: 'likelihood', type: 'enum', label: 'Likelihood', filterable: true, aggregatable: true },
    { name: 'impact', type: 'enum', label: 'Impact', filterable: true, aggregatable: true },
    {
      name: 'initialSeverity',
      type: 'enum',
      label: 'Severity',
      filterable: true,
      aggregatable: true,
    },
    { name: 'category', type: 'string', label: 'Category', filterable: true, aggregatable: true },
    { name: 'intakeStatus', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    { name: 'createdAt', type: 'date', label: 'Created At', filterable: true, aggregatable: false },
  ],
  [DataSourceType.POLICIES]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'status', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    { name: 'category', type: 'string', label: 'Category', filterable: true, aggregatable: true },
    { name: 'ownerId', type: 'string', label: 'Owner', filterable: true, aggregatable: true },
    {
      name: 'nextReviewDate',
      type: 'date',
      label: 'Next Review Date',
      filterable: true,
      aggregatable: false,
    },
    { name: 'createdAt', type: 'date', label: 'Created At', filterable: true, aggregatable: false },
  ],
  [DataSourceType.VENDORS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'tier', type: 'enum', label: 'Tier', filterable: true, aggregatable: true },
    { name: 'category', type: 'enum', label: 'Category', filterable: true, aggregatable: true },
    { name: 'status', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    {
      name: 'riskScore',
      type: 'number',
      label: 'Risk Score',
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'lastAssessmentDate',
      type: 'date',
      label: 'Last Assessment',
      filterable: true,
      aggregatable: false,
    },
    { name: 'createdAt', type: 'date', label: 'Created At', filterable: true, aggregatable: false },
  ],
  [DataSourceType.EVIDENCE]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'title', type: 'string', label: 'Title', filterable: true, aggregatable: false },
    { name: 'type', type: 'string', label: 'Type', filterable: true, aggregatable: true },
    { name: 'status', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    { name: 'source', type: 'string', label: 'Source', filterable: true, aggregatable: true },
    {
      name: 'collectedAt',
      type: 'date',
      label: 'Collected At',
      filterable: true,
      aggregatable: false,
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'Valid Until',
      filterable: true,
      aggregatable: false,
    },
    {
      name: 'isExpired',
      type: 'boolean',
      label: 'Is Expired',
      filterable: true,
      aggregatable: true,
    },
  ],
  [DataSourceType.EMPLOYEES]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'email', type: 'string', label: 'Email', filterable: true, aggregatable: false },
    {
      name: 'department',
      type: 'string',
      label: 'Department',
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'complianceScore',
      type: 'number',
      label: 'Compliance Score',
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'trainingStatus',
      type: 'string',
      label: 'Training Status',
      filterable: true,
      aggregatable: true,
    },
    {
      name: 'backgroundCheckStatus',
      type: 'string',
      label: 'Background Check Status',
      filterable: true,
      aggregatable: true,
    },
  ],
  [DataSourceType.AUDITS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'type', type: 'string', label: 'Type', filterable: true, aggregatable: true },
    { name: 'status', type: 'enum', label: 'Status', filterable: true, aggregatable: true },
    { name: 'startDate', type: 'date', label: 'Start Date', filterable: true, aggregatable: false },
    { name: 'endDate', type: 'date', label: 'End Date', filterable: true, aggregatable: false },
    {
      name: 'findingsCount',
      type: 'number',
      label: 'Findings Count',
      filterable: true,
      aggregatable: true,
    },
  ],
  [DataSourceType.INTEGRATIONS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'type', type: 'string', label: 'Type', filterable: true, aggregatable: true },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'status', type: 'string', label: 'Status', filterable: true, aggregatable: true },
    { name: 'lastSyncAt', type: 'date', label: 'Last Sync', filterable: true, aggregatable: false },
    {
      name: 'totalEvidenceCollected',
      type: 'number',
      label: 'Evidence Collected',
      filterable: true,
      aggregatable: true,
    },
  ],
  [DataSourceType.FRAMEWORKS]: [
    { name: 'id', type: 'string', label: 'ID', filterable: true, aggregatable: false },
    { name: 'name', type: 'string', label: 'Name', filterable: true, aggregatable: false },
    { name: 'version', type: 'string', label: 'Version', filterable: true, aggregatable: false },
    { name: 'status', type: 'string', label: 'Status', filterable: true, aggregatable: true },
    {
      name: 'readinessScore',
      type: 'number',
      label: 'Readiness Score',
      filterable: true,
      aggregatable: true,
    },
  ],
};

@Injectable()
export class CustomDashboardsService {
  constructor(private prisma: PrismaService) {}

  // ==================== Dashboard CRUD ====================

  async findAll(organizationId: string, userId: string) {
    const dashboards = await this.prisma.dashboard.findMany({
      where: {
        organizationId,
        OR: [
          { userId }, // User's own dashboards
          { isTemplate: true }, // Organization templates
        ],
      },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return dashboards;
  }

  async findById(id: string, organizationId: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: {
        id,
        organizationId,
        OR: [{ userId }, { isTemplate: true }],
      },
      include: {
        widgets: {
          orderBy: { createdAt: 'asc' },
        },
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return dashboard;
  }

  async create(organizationId: string, userId: string, dto: CreateDashboardDto) {
    // If setting as default, unset other defaults for this user
    if (dto.isDefault) {
      await this.prisma.dashboard.updateMany({
        where: { organizationId, userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const dashboard = await this.prisma.dashboard.create({
      data: {
        organizationId,
        userId: dto.isTemplate ? null : userId,
        name: dto.name,
        description: dto.description,
        isTemplate: dto.isTemplate || false,
        isDefault: dto.isDefault || false,
        layout: (dto.layout || {}) as Prisma.InputJsonValue,
        createdBy: userId,
        widgets: dto.widgets
          ? {
              create: dto.widgets.map((w) => ({
                widgetType: w.widgetType,
                title: w.title,
                config: (w.config || {}) as any,
                dataSource: (w.dataSource || {}) as any,
                position: (w.position || { x: 0, y: 0, w: 4, h: 2 }) as any,
                refreshRate: w.refreshRate,
              })),
            }
          : undefined,
      },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    return dashboard;
  }

  async update(id: string, organizationId: string, userId: string, dto: UpdateDashboardDto) {
    const existing = await this.prisma.dashboard.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Dashboard not found');
    }

    // Only owner or admin can update non-template dashboards
    if (!existing.isTemplate && existing.userId !== userId) {
      throw new ForbiddenException('You can only edit your own dashboards');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.dashboard.updateMany({
        where: { organizationId, userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // If widgets are provided, replace all widgets
    if (dto.widgets) {
      await this.prisma.dashboardWidget.deleteMany({
        where: { dashboardId: id },
      });
    }

    const dashboard = await this.prisma.dashboard.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isDefault: dto.isDefault,
        layout: dto.layout as Prisma.InputJsonValue,
        widgets: dto.widgets
          ? {
              create: dto.widgets.map((w) => ({
                widgetType: w.widgetType,
                title: w.title,
                config: (w.config || {}) as any,
                dataSource: (w.dataSource || {}) as any,
                position: (w.position || { x: 0, y: 0, w: 4, h: 2 }) as any,
                refreshRate: w.refreshRate,
              })),
            }
          : undefined,
      },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    return dashboard;
  }

  async delete(id: string, organizationId: string, userId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, organizationId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Only owner can delete their dashboard
    if (!dashboard.isTemplate && dashboard.userId !== userId) {
      throw new ForbiddenException('You can only delete your own dashboards');
    }

    await this.prisma.dashboard.delete({
      where: { id },
    });

    return { success: true };
  }

  async duplicate(id: string, organizationId: string, userId: string, newName?: string) {
    const source = await this.findById(id, organizationId, userId);

    const dashboard = await this.prisma.dashboard.create({
      data: {
        organizationId,
        userId,
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        isTemplate: false,
        isDefault: false,
        layout: source.layout as any,
        createdBy: userId,
        widgets: {
          create: source.widgets.map((w) => ({
            widgetType: w.widgetType,
            title: w.title,
            config: w.config as any,
            dataSource: w.dataSource as any,
            position: w.position as any,
            refreshRate: w.refreshRate,
          })),
        },
      },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    return dashboard;
  }

  async setDefault(id: string, organizationId: string, userId: string) {
    // Verify dashboard exists and user has access
    await this.findById(id, organizationId, userId);

    // Unset other defaults
    await this.prisma.dashboard.updateMany({
      where: { organizationId, userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const dashboard = await this.prisma.dashboard.update({
      where: { id },
      data: { isDefault: true },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    return dashboard;
  }

  // ==================== Widget CRUD ====================

  async addWidget(
    dashboardId: string,
    organizationId: string,
    userId: string,
    dto: CreateWidgetDto
  ) {
    // Verify dashboard access
    await this.findById(dashboardId, organizationId, userId);

    const widget = await this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        widgetType: dto.widgetType,
        title: dto.title,
        config: (dto.config || {}) as any,
        dataSource: (dto.dataSource || {}) as any,
        position: (dto.position || { x: 0, y: 0, w: 4, h: 2 }) as any,
        refreshRate: dto.refreshRate,
      },
    });

    return widget;
  }

  async updateWidget(
    widgetId: string,
    dashboardId: string,
    organizationId: string,
    userId: string,
    dto: UpdateWidgetDto
  ) {
    // Verify dashboard access
    await this.findById(dashboardId, organizationId, userId);

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboardId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        widgetType: dto.widgetType,
        title: dto.title,
        config: dto.config as any,
        dataSource: dto.dataSource as any,
        position: dto.position as any,
        refreshRate: dto.refreshRate,
      },
    });
  }

  async deleteWidget(
    widgetId: string,
    dashboardId: string,
    organizationId: string,
    userId: string
  ) {
    // Verify dashboard access
    await this.findById(dashboardId, organizationId, userId);

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboardId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    await this.prisma.dashboardWidget.delete({
      where: { id: widgetId },
    });

    return { success: true };
  }

  // ==================== Templates ====================

  async getTemplates(organizationId: string) {
    return this.prisma.dashboard.findMany({
      where: { organizationId, isTemplate: true },
      include: {
        widgets: true,
        creator: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTemplate(organizationId: string, userId: string, dto: CreateDashboardDto) {
    return this.create(organizationId, userId, { ...dto, isTemplate: true });
  }

  // ==================== Data Sources ====================

  getAvailableDataSources(): DataSourceDefinitionDto[] {
    return Object.entries(DATA_SOURCE_FIELDS).map(([type, fields]) => ({
      name: this.formatSourceName(type as DataSourceType),
      type: type as DataSourceType,
      fields,
    }));
  }

  private formatSourceName(type: DataSourceType): string {
    const names: Record<DataSourceType, string> = {
      [DataSourceType.CONTROLS]: 'Controls',
      [DataSourceType.RISKS]: 'Risk Register',
      [DataSourceType.POLICIES]: 'Policies',
      [DataSourceType.VENDORS]: 'Vendors',
      [DataSourceType.EVIDENCE]: 'Evidence',
      [DataSourceType.EMPLOYEES]: 'Employees',
      [DataSourceType.AUDITS]: 'Audits',
      [DataSourceType.INTEGRATIONS]: 'Integrations',
      [DataSourceType.FRAMEWORKS]: 'Frameworks',
    };
    return names[type] || type;
  }

  // ==================== Query Execution ====================

  async executeQuery(organizationId: string, query: DataQueryDto, preview = false) {
    const limit = preview ? 100 : query.limit || 1000;

    switch (query.source) {
      case DataSourceType.CONTROLS:
        return this.queryControls(organizationId, query, limit);
      case DataSourceType.RISKS:
        return this.queryRisks(organizationId, query, limit);
      case DataSourceType.POLICIES:
        return this.queryPolicies(organizationId, query, limit);
      case DataSourceType.VENDORS:
        return this.queryVendors(organizationId, query, limit);
      case DataSourceType.EVIDENCE:
        return this.queryEvidence(organizationId, query, limit);
      case DataSourceType.EMPLOYEES:
        return this.queryEmployees(organizationId, query, limit);
      case DataSourceType.AUDITS:
        return this.queryAudits(organizationId, query, limit);
      case DataSourceType.INTEGRATIONS:
        return this.queryIntegrations(organizationId, query, limit);
      case DataSourceType.FRAMEWORKS:
        return this.queryFrameworks(organizationId, query, limit);
      default:
        // SECURITY: Escape user input to prevent XSS in error responses
        throw new BadRequestException(
          `Unknown data source: ${escapeHtml(String(query.source ?? ''))}`
        );
    }
  }

  private buildPrismaWhere(
    filters: DataQueryDto['filters'],
    organizationId: string
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { organizationId };

    if (!filters || filters.length === 0) return where;

    filters.forEach((filter) => {
      // SECURITY: Validate filter.field to prevent prototype pollution attacks
      validatePropertyName(filter.field, 'filter field');

      switch (filter.operator) {
        case FilterOperator.EQ:
          safePropertySet(where, filter.field, filter.value);
          break;
        case FilterOperator.NEQ:
          safePropertySet(where, filter.field, { not: filter.value });
          break;
        case FilterOperator.GT:
          safePropertySet(where, filter.field, { gt: filter.value });
          break;
        case FilterOperator.GTE:
          safePropertySet(where, filter.field, { gte: filter.value });
          break;
        case FilterOperator.LT:
          safePropertySet(where, filter.field, { lt: filter.value });
          break;
        case FilterOperator.LTE:
          safePropertySet(where, filter.field, { lte: filter.value });
          break;
        case FilterOperator.CONTAINS:
          safePropertySet(where, filter.field, { contains: filter.value, mode: 'insensitive' });
          break;
        case FilterOperator.IN:
          safePropertySet(where, filter.field, { in: filter.value });
          break;
        case FilterOperator.NOT_IN:
          safePropertySet(where, filter.field, { notIn: filter.value });
          break;
        case FilterOperator.IS_NULL:
          safePropertySet(where, filter.field, null);
          break;
        case FilterOperator.IS_NOT_NULL:
          safePropertySet(where, filter.field, { not: null });
          break;
      }
    });

    return where;
  }

  private async queryControls(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      // Use groupBy for aggregations
      const groupBy = query.groupBy || 'status';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      const result = await this.prisma.controlImplementation.groupBy({
        by: [groupBy as any],
        where,
        _count: true,
      });
      return result.map((r) => {
        const mapped: Record<string, unknown> = { count: r._count };
        safePropertySet(mapped, groupBy, (r as any)[groupBy]);
        return mapped;
      });
    }

    // SECURITY: Validate orderBy field to prevent prototype pollution
    const orderByClause = query.orderBy
      ? safeOrderBy(query.orderBy.field, query.orderBy.direction)
      : { createdAt: 'desc' as const };

    const data = await this.prisma.controlImplementation.findMany({
      where,
      include: {
        control: {
          select: { controlId: true, title: true, category: true },
        },
        owner: {
          select: { displayName: true, email: true },
        },
      },
      orderBy: orderByClause,
      take: limit,
    });

    return data.map((d) => ({
      id: d.id,
      controlId: d.control?.controlId,
      title: d.control?.title,
      category: d.control?.category,
      status: d.status,
      owner: d.owner?.displayName,
      dueDate: d.dueDate,
      createdAt: d.createdAt,
    }));
  }

  private async queryRisks(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'initialSeverity';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.risk.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const risks = await this.prisma.risk.findMany({
      where,
      take: limit,
    });
    return risks;
  }

  private async queryPolicies(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'status';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.policy.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const policies = await this.prisma.policy.findMany({
      where,
      take: limit,
    });
    return policies;
  }

  private async queryVendors(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'tier';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.vendor.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      take: limit,
    });
    return vendors;
  }

  private async queryEvidence(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'status';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.evidence.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const evidence = await this.prisma.evidence.findMany({
      where,
      take: limit,
    });
    return evidence;
  }

  private async queryEmployees(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'status';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.correlatedEmployee.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const employees = await this.prisma.correlatedEmployee.findMany({
      where,
      take: limit,
    });
    return employees;
  }

  private async queryAudits(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'status';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.audit.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const audits = await this.prisma.audit.findMany({
      where,
      take: limit,
    });
    return audits;
  }

  private async queryIntegrations(organizationId: string, query: DataQueryDto, limit: number) {
    const where = this.buildPrismaWhere(query.filters, organizationId);

    if (query.groupBy || (query.aggregations && query.aggregations.length > 0)) {
      const groupBy = query.groupBy || 'type';
      // SECURITY: Validate groupBy field to prevent prototype pollution
      validatePropertyName(groupBy, 'groupBy field');
      try {
        const result = await this.prisma.integration.groupBy({
          by: [groupBy as any],
          where,
          _count: true,
        });
        return result.map((r) => {
          const mapped: Record<string, unknown> = { count: r._count };
          safePropertySet(mapped, groupBy, (r as any)[groupBy]);
          return mapped;
        });
      } catch {
        return [];
      }
    }

    const integrations = await this.prisma.integration.findMany({
      where,
      take: limit,
    });
    return integrations;
  }

  private async queryFrameworks(organizationId: string, _query: DataQueryDto, limit: number) {
    // Simplified framework query - just return basic framework data
    const frameworks = await this.prisma.framework.findMany({
      take: limit,
    });

    return frameworks.map((f) => ({
      id: f.id,
      name: f.name,
      version: f.version,
    }));
  }

  // ==================== Widget Data ====================

  async getWidgetData(
    widgetId: string,
    dashboardId: string,
    organizationId: string,
    userId: string
  ) {
    // Verify access
    await this.findById(dashboardId, organizationId, userId);

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboardId },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    const dataSource = widget.dataSource as unknown as DataQueryDto;
    if (!dataSource || !dataSource.source) {
      return { data: [], message: 'No data source configured' };
    }

    const data = await this.executeQuery(organizationId, dataSource, false);
    return { data };
  }
}
