import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RetentionPolicy } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
import {
  CreateRetentionPolicyDto,
  UpdateRetentionPolicyDto,
  RetentionPolicyDto,
  RetentionPolicyListQueryDto,
  RunRetentionPolicyDto,
  RetentionRunResultDto,
  RetentionEntityType,
  RetentionAction,
  RetentionPolicyStatus,
} from './dto/retention.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface RetentionPolicyRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  entityType: RetentionEntityType;
  retentionDays: number;
  action: RetentionAction;
  status: RetentionPolicyStatus;
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastRunRecordsProcessed?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPolicy(
    organizationId: string,
    userId: string,
    dto: CreateRetentionPolicyDto,
  ): Promise<RetentionPolicyDto> {
    const now = new Date();
    const status = dto.status || RetentionPolicyStatus.DRAFT;
    const created = await this.prisma.retentionPolicy.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        periodValue: dto.retentionDays,
        periodUnit: 'days',
        action: dto.action || RetentionAction.ARCHIVE,
        status,
        isEnabled: status === RetentionPolicyStatus.ACTIVE,
        createdBy: userId,
        nextRunAt: status === RetentionPolicyStatus.ACTIVE
          ? this.nextDailyRun(now)
          : null,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'RetentionPolicy',
      entityId: created.id,
      entityName: created.name,
      description: `Created retention policy: ${created.name}`,
    });
    this.logger.log(`Created retention policy ${created.id} for ${dto.entityType}`);
    return this.toDto(this.toRecord(created));
  }

  async updatePolicy(
    organizationId: string,
    userId: string,
    policyId: string,
    dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicyDto> {
    const policy = await this.prisma.retentionPolicy.findFirst({
      where: { id: policyId, organizationId },
    });
    if (!policy) {
      throw new NotFoundException(`Retention policy ${policyId} not found`);
    }
    const status = dto.status ?? policy.status;
    const updated = await this.prisma.retentionPolicy.update({
      where: { id: policyId },
      data: {
        name: dto.name,
        description: dto.description,
        periodValue: dto.retentionDays,
        action: dto.action,
        status,
        isEnabled: status === RetentionPolicyStatus.ACTIVE,
        nextRunAt: dto.status === RetentionPolicyStatus.ACTIVE
          ? this.nextDailyRun()
          : dto.status
            ? null
            : undefined,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'RetentionPolicy',
      entityId: updated.id,
      entityName: updated.name,
      description: `Updated retention policy: ${updated.name}`,
    });
    return this.toDto(this.toRecord(updated));
  }

  async deletePolicy(organizationId: string, userId: string, policyId: string): Promise<void> {
    const policy = await this.prisma.retentionPolicy.findFirst({
      where: { id: policyId, organizationId },
    });
    if (!policy) {
      throw new NotFoundException(`Retention policy ${policyId} not found`);
    }

    await this.prisma.retentionPolicy.delete({ where: { id: policyId } });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'RetentionPolicy',
      entityId: policyId,
      entityName: policy.name,
      description: `Deleted retention policy: ${policy.name}`,
    });
    this.logger.log(`Deleted retention policy ${policyId}`);
  }

  async getPolicy(organizationId: string, policyId: string): Promise<RetentionPolicyDto> {
    const policy = await this.prisma.retentionPolicy.findFirst({
      where: { id: policyId, organizationId },
    });
    if (!policy) {
      throw new NotFoundException(`Retention policy ${policyId} not found`);
    }
    return this.toDto(this.toRecord(policy));
  }

  async listPolicies(
    organizationId: string,
    query: RetentionPolicyListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where = {
      organizationId,
      entityType: query.entityType,
      status: query.status,
    };
    const [policies, total] = await Promise.all([
      this.prisma.retentionPolicy.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.retentionPolicy.count({ where }),
    ]);

    return createPaginatedResponse(
      policies.map(p => this.toDto(this.toRecord(p))),
      total,
      pagination,
    );
  }

  async runPolicy(
    organizationId: string,
    userId: string,
    policyId: string,
    dto: RunRetentionPolicyDto,
  ): Promise<RetentionRunResultDto> {
    const policyRow = await this.prisma.retentionPolicy.findFirst({
      where: { id: policyId, organizationId },
    });
    if (!policyRow) {
      throw new NotFoundException(`Retention policy ${policyId} not found`);
    }
    const policy = this.toRecord(policyRow);

    const dryRun = dto.dryRun !== false;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    const run = await this.prisma.retentionRun.create({
      data: { policyId, organizationId, dryRun, status: 'running' },
    });

    let recordsFound = 0;
    let recordsProcessed = 0;

    try {
      switch (policy.entityType) {
        case RetentionEntityType.AUDIT_LOGS: {
          const auditCount = await this.prisma.auditLog.count({
            where: {
              organizationId,
              timestamp: { lt: cutoffDate },
            },
          });
          recordsFound = auditCount;

          if (!dryRun && policy.action === RetentionAction.DELETE) {
            const result = await this.prisma.auditLog.deleteMany({
              where: {
                organizationId,
                timestamp: { lt: cutoffDate },
              },
            });
            recordsProcessed = result.count;
          }
          break;
        }

        case RetentionEntityType.NOTIFICATIONS: {
          const notifCount = await this.prisma.notification.count({
            where: {
              organizationId,
              createdAt: { lt: cutoffDate },
            },
          });
          recordsFound = notifCount;

          if (!dryRun && policy.action === RetentionAction.DELETE) {
            const result = await this.prisma.notification.deleteMany({
              where: {
                organizationId,
                createdAt: { lt: cutoffDate },
              },
            });
            recordsProcessed = result.count;
          }
          break;
        }

        case RetentionEntityType.TASKS: {
          const taskCount = await this.prisma.task.count({
            where: {
              organizationId,
              status: 'completed',
              completedAt: { lt: cutoffDate },
            },
          });
          recordsFound = taskCount;

          if (!dryRun) {
            if (policy.action === RetentionAction.DELETE) {
              const result = await this.prisma.task.deleteMany({
                where: {
                  organizationId,
                  status: 'completed',
                  completedAt: { lt: cutoffDate },
                },
              });
              recordsProcessed = result.count;
            } else {
              // Archive - mark as archived for archival (Task doesn't have deletedAt)
              const result = await this.prisma.task.updateMany({
                where: {
                  organizationId,
                  status: 'completed',
                  completedAt: { lt: cutoffDate },
                },
                data: {
                  status: 'archived',
                },
              });
              recordsProcessed = result.count;
            }
          }
          break;
        }

        case RetentionEntityType.EVIDENCE: {
          // Handle evidence retention - only process expired or rejected evidence
          const evidenceCount = await this.prisma.evidence.count({
            where: {
              organizationId,
              createdAt: { lt: cutoffDate },
              deletedAt: null, // Not already soft-deleted
              // Only process evidence that's expired, rejected, or past validUntil
              OR: [
                { status: 'expired' },
                { status: 'rejected' },
                { isExpired: true },
                { validUntil: { lt: cutoffDate } },
              ],
            },
          });
          recordsFound = evidenceCount;

          if (!dryRun) {
            if (policy.action === RetentionAction.DELETE) {
              // Soft delete by setting deletedAt
              const result = await this.prisma.evidence.updateMany({
                where: {
                  organizationId,
                  createdAt: { lt: cutoffDate },
                  deletedAt: null,
                  OR: [
                    { status: 'expired' },
                    { status: 'rejected' },
                    { isExpired: true },
                    { validUntil: { lt: cutoffDate } },
                  ],
                },
                data: {
                  deletedAt: new Date(),
                },
              });
              recordsProcessed = result.count;
            } else {
              // Archive - mark as expired (closest to archive in the schema)
              const result = await this.prisma.evidence.updateMany({
                where: {
                  organizationId,
                  createdAt: { lt: cutoffDate },
                  deletedAt: null,
                  OR: [
                    { status: 'expired' },
                    { status: 'rejected' },
                    { isExpired: true },
                    { validUntil: { lt: cutoffDate } },
                  ],
                },
                data: {
                  status: 'expired',
                  isExpired: true,
                },
              });
              recordsProcessed = result.count;
            }
          }
          break;
        }

        case RetentionEntityType.POLICY_VERSIONS: {
          // Handle policy version retention - delete old versions beyond retention period
          // Keep the most recent version for each policy
          
          // Get all policies in this organization
          const orgPolicies = await this.prisma.policy.findMany({
            where: { organizationId },
            select: { id: true },
          });

          // Build list of version IDs that should be protected (most recent per policy)
          const protectedVersions = new Set<string>();
          for (const p of orgPolicies) {
            // Find the most recent version for this policy
            const latestVersion = await this.prisma.policyVersion.findFirst({
              where: { policyId: p.id },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            });
            if (latestVersion) {
              protectedVersions.add(latestVersion.id);
            }
          }

          // Count old versions that are not the latest
          const allOldVersions = await this.prisma.policyVersion.findMany({
            where: {
              policy: { organizationId },
              createdAt: { lt: cutoffDate },
            },
            select: { id: true },
          });
          
          const versionsToDelete = allOldVersions.filter(v => !protectedVersions.has(v.id));
          recordsFound = versionsToDelete.length;

          if (!dryRun && policy.action === RetentionAction.DELETE && versionsToDelete.length > 0) {
            // Delete old policy versions (not the most recent)
            const result = await this.prisma.policyVersion.deleteMany({
              where: {
                id: { in: versionsToDelete.map(v => v.id) },
              },
            });
            recordsProcessed = result.count;
          }
          break;
        }

        case RetentionEntityType.EXPORT_JOBS: {
          recordsFound = await this.prisma.exportJob.count({
            where: { organizationId, createdAt: { lt: cutoffDate } },
          });
          if (!dryRun && policy.action === RetentionAction.DELETE) {
            const result = await this.prisma.exportJob.deleteMany({
              where: { organizationId, createdAt: { lt: cutoffDate } },
            });
            recordsProcessed = result.count;
          }
          break;
        }

        default:
          this.logger.warn(`Retention for ${policy.entityType} not supported`);
          recordsFound = 0;
          recordsProcessed = 0;
      }

      const completedAt = new Date();
      await this.prisma.retentionRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          recordsFound,
          recordsProcessed,
          completedAt,
        },
      });
      if (!dryRun) {
        await this.prisma.retentionPolicy.update({
          where: { id: policyId },
          data: {
            lastRunAt: completedAt,
            lastRunResult: 'completed',
            recordsAffected: recordsProcessed,
            nextRunAt: this.nextDailyRun(completedAt),
          },
        });
      }
      await auditMutation(this.prisma, {
        organizationId,
        userId,
        action: dryRun ? 'DRY_RUN' : 'RUN',
        entityType: 'RetentionPolicy',
        entityId: policyId,
        entityName: policy.name,
        description: `${dryRun ? 'Dry-ran' : 'Ran'} retention policy: ${policy.name}`,
        metadata: { runId: run.id, recordsFound, recordsProcessed },
      });

      this.logger.log(
        `Retention policy ${policyId} ${dryRun ? '(dry run)' : ''}: ` +
        `found ${recordsFound}, processed ${recordsProcessed}`
      );

      return {
        policyId: policy.id,
        policyName: policy.name,
        entityType: policy.entityType,
        action: policy.action,
        recordsFound,
        recordsProcessed,
        dryRun,
        executedAt: new Date(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.retentionRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          recordsFound,
          recordsProcessed: 0,
          error: message,
          completedAt: new Date(),
        },
      });
      if (!dryRun) {
        await this.prisma.retentionPolicy.update({
          where: { id: policyId },
          data: { lastRunAt: new Date(), lastRunResult: 'failed', recordsAffected: 0 },
        });
      }
      await auditMutation(this.prisma, {
        organizationId,
        userId,
        action: 'FAIL',
        entityType: 'RetentionPolicy',
        entityId: policyId,
        entityName: policy.name,
        description: `Retention policy failed: ${policy.name}`,
        metadata: { runId: run.id, error: message },
      });
      this.logger.error(`Retention policy ${policyId} failed: ${message}`);
      return {
        policyId: policy.id,
        policyName: policy.name,
        entityType: policy.entityType,
        action: policy.action,
        recordsFound,
        recordsProcessed: 0,
        dryRun,
        executedAt: new Date(),
        error: message,
      };
    }
  }

  private nextDailyRun(from = new Date()): Date {
    const next = new Date(from);
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }

  private toRecord(policy: RetentionPolicy): RetentionPolicyRecord {
    return {
      id: policy.id,
      organizationId: policy.organizationId,
      name: policy.name,
      description: policy.description ?? undefined,
      entityType: policy.entityType as RetentionEntityType,
      retentionDays: policy.periodValue,
      action: policy.action as RetentionAction,
      status: policy.status as RetentionPolicyStatus,
      lastRunAt: policy.lastRunAt ?? undefined,
      nextRunAt: policy.nextRunAt ?? undefined,
      lastRunRecordsProcessed: policy.recordsAffected ?? undefined,
      createdBy: policy.createdBy ?? 'system',
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  private toDto(policy: RetentionPolicyRecord): RetentionPolicyDto {
    return {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      entityType: policy.entityType,
      retentionDays: policy.retentionDays,
      action: policy.action,
      status: policy.status,
      lastRunAt: policy.lastRunAt,
      nextRunAt: policy.nextRunAt,
      lastRunRecordsProcessed: policy.lastRunRecordsProcessed,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }
}
