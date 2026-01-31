import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogFilterDto } from './dto/audit.dto';
import { Prisma } from '@prisma/client';

export interface LogAuditParams {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description: string;
  changes?: { before?: unknown; after?: unknown } | object;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event. This is the main method to call from other services.
   */
  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          userEmail: params.userEmail,
          userName: params.userName,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          description: params.description,
          changes: params.changes as Prisma.InputJsonValue,
          metadata: params.metadata as Prisma.InputJsonValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break the main flow
      this.logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Find all audit logs with filtering and pagination
   */
  async findAll(organizationId: string, filters: AuditLogFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.search) {
      where.OR = [
        { entityName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { userName: { contains: filters.search, mode: 'insensitive' } },
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.timestamp.lte = new Date(filters.endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single audit log entry
   */
  async findOne(id: string, organizationId: string) {
    return this.prisma.auditLog.findFirst({
      where: {
        id,
        organizationId,
      },
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
    limit = 50,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit statistics
   */
  async getStats(organizationId: string, startDate?: string, endDate?: string) {
    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const [
      totalLogs,
      actionCounts,
      entityTypeCounts,
      userActivityCounts,
      recentActivity,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),

      // Actions by type
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),

      // Entity types
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: { entityType: true },
        orderBy: { _count: { entityType: 'desc' } },
      }),

      // Top users by activity
      this.prisma.auditLog.groupBy({
        by: ['userId', 'userName', 'userEmail'],
        where: {
          ...where,
          userId: { not: null },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),

      // Recent activity (last 10)
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityName: true,
          userName: true,
          timestamp: true,
          description: true,
        },
      }),
    ]);

    return {
      totalLogs,
      actionBreakdown: actionCounts.map((a) => ({
        action: a.action,
        count: a._count.action,
      })),
      entityTypeBreakdown: entityTypeCounts.map((e) => ({
        entityType: e.entityType,
        count: e._count.entityType,
      })),
      topUsers: userActivityCounts.map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userEmail: u.userEmail,
        activityCount: u._count.userId,
      })),
      recentActivity,
    };
  }

  /**
   * Export audit logs as CSV-compatible data
   */
  async exportLogs(organizationId: string, filters: AuditLogFilterDto) {
    // Remove pagination for export
    const exportFilters = { ...filters, page: 1, limit: 10000 };
    const result = await this.findAll(organizationId, exportFilters);

    return result.data.map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      entityName: log.entityName || '',
      description: log.description,
      userName: log.userName || '',
      userEmail: log.userEmail || '',
      ipAddress: log.ipAddress || '',
      changes: log.changes ? JSON.stringify(log.changes) : '',
      metadata: log.metadata ? JSON.stringify(log.metadata) : '',
    }));
  }

  /**
   * Get unique values for filters (actions, entity types, users)
   */
  async getFilterOptions(organizationId: string) {
    const [actions, entityTypes, users] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { organizationId },
        orderBy: { action: 'asc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['entityType'],
        where: { organizationId },
        orderBy: { entityType: 'asc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId', 'userName', 'userEmail'],
        where: { organizationId, userId: { not: null } },
        orderBy: { userName: 'asc' },
      }),
    ]);

    return {
      actions: actions.map((a) => a.action),
      entityTypes: entityTypes.map((e) => e.entityType),
      users: users.map((u) => ({
        id: u.userId,
        name: u.userName,
        email: u.userEmail,
      })),
    };
  }
}



