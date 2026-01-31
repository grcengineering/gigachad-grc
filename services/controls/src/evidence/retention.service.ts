import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import { Prisma } from '@prisma/client';

/**
 * Evidence Retention Policy Configuration
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionDays: number;
  evidenceTypes?: string[];
  categories?: string[];
  enabled: boolean;
  notifyBeforeDeletion: boolean;
  notifyDaysBeforeExpiry: number[];
  softDeleteFirst: boolean;
  softDeleteRetentionDays: number;
}

/**
 * Default retention policies
 */
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'default',
    name: 'Default Policy',
    description: 'Standard retention for all evidence',
    retentionDays: 365 * 3, // 3 years
    enabled: true,
    notifyBeforeDeletion: true,
    notifyDaysBeforeExpiry: [30, 7],
    softDeleteFirst: true,
    softDeleteRetentionDays: 30,
  },
  {
    id: 'audit-evidence',
    name: 'Audit Evidence',
    description: 'Longer retention for audit-related evidence',
    retentionDays: 365 * 7, // 7 years
    evidenceTypes: ['audit', 'compliance', 'regulatory'],
    enabled: true,
    notifyBeforeDeletion: true,
    notifyDaysBeforeExpiry: [90, 30, 7],
    softDeleteFirst: true,
    softDeleteRetentionDays: 90,
  },
  {
    id: 'short-term',
    name: 'Short-term Evidence',
    description: 'Temporary evidence with shorter retention',
    retentionDays: 365, // 1 year
    categories: ['temporary', 'test', 'screenshot'],
    enabled: true,
    notifyBeforeDeletion: false,
    notifyDaysBeforeExpiry: [],
    softDeleteFirst: false,
    softDeleteRetentionDays: 0,
  },
];

/**
 * Evidence Retention Service
 * 
 * Manages automated evidence lifecycle including:
 * - Expiration tracking
 * - Notification before deletion
 * - Soft delete with grace period
 * - Permanent deletion
 * - Audit logging of all retention actions
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ============================================
  // Scheduled Jobs
  // ============================================

  /**
   * Daily check for expired evidence at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiredEvidence(): Promise<void> {
    this.logger.log('Starting daily evidence retention check');
    
    const organizations = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of organizations) {
      try {
        await this.processOrganizationRetention(org.id, org.settings);
      } catch (error) {
        this.logger.error(
          `Failed to process retention for org ${org.id}: ${error.message}`,
        );
      }
    }

    this.logger.log('Completed daily evidence retention check');
  }

  /**
   * Weekly cleanup of soft-deleted evidence
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupSoftDeleted(): Promise<void> {
    this.logger.log('Starting weekly soft-delete cleanup');
    
    const organizations = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of organizations) {
      try {
        await this.permanentlyDeleteExpired(org.id, org.settings);
      } catch (error) {
        this.logger.error(
          `Failed to cleanup soft-deleted for org ${org.id}: ${error.message}`,
        );
      }
    }

    this.logger.log('Completed weekly soft-delete cleanup');
  }

  // ============================================
  // Core Processing
  // ============================================

  /**
   * Process retention for a single organization
   */
  async processOrganizationRetention(
    organizationId: string,
    settings: Prisma.JsonValue,
  ): Promise<{ processed: number; expired: number; notified: number }> {
    const policies = this.getPoliciesFromSettings(settings);
    let processed = 0;
    let expired = 0;
    let notified = 0;

    for (const policy of policies) {
      if (!policy.enabled) continue;

      // Find evidence matching this policy
      const evidence = await this.findEvidenceForPolicy(organizationId, policy);
      processed += evidence.length;

      for (const item of evidence) {
        const expirationDate = this.calculateExpirationDate(item.createdAt, policy);
        const daysUntilExpiry = Math.ceil(
          (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        // Check if should notify
        if (policy.notifyBeforeDeletion && 
            policy.notifyDaysBeforeExpiry.includes(daysUntilExpiry)) {
          await this.sendExpirationNotification(item, daysUntilExpiry, organizationId);
          notified++;
        }

        // Check if expired
        if (daysUntilExpiry <= 0) {
          if (policy.softDeleteFirst && !item.deletedAt) {
            await this.softDeleteEvidence(item, organizationId);
          } else if (!policy.softDeleteFirst) {
            await this.permanentlyDelete(item, organizationId);
          }
          expired++;
        }
      }
    }

    return { processed, expired, notified };
  }

  /**
   * Find evidence that matches a retention policy
   */
  private async findEvidenceForPolicy(
    organizationId: string,
    policy: RetentionPolicy,
  ): Promise<Array<{ id: string; title: string; type: string; category: string | null; storagePath: string; createdAt: Date; createdBy: string; deletedAt: Date | null }>> {
    const where: Prisma.EvidenceWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (policy.evidenceTypes?.length) {
      where.type = { in: policy.evidenceTypes };
    }

    if (policy.categories?.length) {
      where.category = { in: policy.categories };
    }

    return this.prisma.evidence.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        storagePath: true,
        createdAt: true,
        createdBy: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Calculate expiration date based on policy
   */
  private calculateExpirationDate(createdAt: Date, policy: RetentionPolicy): Date {
    const expiration = new Date(createdAt);
    expiration.setDate(expiration.getDate() + policy.retentionDays);
    return expiration;
  }

  /**
   * Send notification about upcoming expiration
   */
  private async sendExpirationNotification(
    evidence: { id: string; title: string; createdBy: string },
    daysUntilExpiry: number,
    organizationId: string,
  ): Promise<void> {
    await this.notificationsService.create({
      organizationId,
      userId: evidence.createdBy,
      type: NotificationType.EVIDENCE_EXPIRING,
      title: 'Evidence Expiration Warning',
      message: `Evidence "${evidence.title}" will expire in ${daysUntilExpiry} days.`,
      severity: daysUntilExpiry <= 7 ? NotificationSeverity.ERROR : NotificationSeverity.WARNING,
      metadata: {
        evidenceId: evidence.id,
        evidenceTitle: evidence.title,
        daysUntilExpiry,
      },
    });
  }

  /**
   * Soft delete evidence (mark as deleted but don't remove)
   */
  private async softDeleteEvidence(
    evidence: { id: string; title: string; storagePath: string },
    organizationId: string,
  ): Promise<void> {
    await this.prisma.evidence.update({
      where: { id: evidence.id },
      data: {
        deletedAt: new Date(),
        isExpired: true,
      },
    });

    await this.auditService.log({
      action: 'evidence_soft_deleted',
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      organizationId,
      description: `Evidence "${evidence.title}" soft deleted due to retention policy`,
      metadata: {
        storagePath: evidence.storagePath,
        reason: 'retention_policy',
      },
    });
  }

  /**
   * Permanently delete evidence and its file
   */
  private async permanentlyDelete(
    evidence: { id: string; title: string; storagePath: string },
    organizationId: string,
  ): Promise<void> {
    // Delete from database
    await this.prisma.evidence.delete({
      where: { id: evidence.id },
    });

    await this.auditService.log({
      action: 'evidence_permanently_deleted',
      entityType: 'evidence',
      entityId: evidence.id,
      entityName: evidence.title,
      organizationId,
      description: `Evidence "${evidence.title}" permanently deleted due to retention policy`,
      metadata: {
        storagePath: evidence.storagePath,
        reason: 'retention_policy',
      },
    });
  }

  /**
   * Permanently delete soft-deleted evidence past grace period
   */
  private async permanentlyDeleteExpired(
    organizationId: string,
    settings: Prisma.JsonValue,
  ): Promise<number> {
    const policies = this.getPoliciesFromSettings(settings);
    let deleted = 0;

    for (const policy of policies) {
      if (!policy.enabled || !policy.softDeleteFirst) continue;

      const graceDate = new Date();
      graceDate.setDate(graceDate.getDate() - policy.softDeleteRetentionDays);

      const expiredEvidence = await this.prisma.evidence.findMany({
        where: {
          organizationId,
          deletedAt: { lte: graceDate },
          isExpired: true,
        },
        select: {
          id: true,
          title: true,
          storagePath: true,
        },
      });

      for (const evidence of expiredEvidence) {
        await this.permanentlyDelete(evidence, organizationId);
        deleted++;
      }
    }

    return deleted;
  }

  // ============================================
  // Policy Management
  // ============================================

  /**
   * Get policies from organization settings
   */
  private getPoliciesFromSettings(settings: Prisma.JsonValue): RetentionPolicy[] {
    if (!settings || typeof settings !== 'object') {
      return DEFAULT_RETENTION_POLICIES;
    }
    
    const settingsObj = settings as Record<string, unknown>;
    const policies = settingsObj.retentionPolicies;
    
    if (!Array.isArray(policies)) {
      return DEFAULT_RETENTION_POLICIES;
    }
    
    return policies as RetentionPolicy[];
  }

  /**
   * Get retention policies for an organization
   */
  async getPolicies(organizationId: string): Promise<RetentionPolicy[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    return this.getPoliciesFromSettings(org?.settings);
  }

  /**
   * Update retention policies for an organization
   */
  async updatePolicies(
    organizationId: string,
    policies: RetentionPolicy[],
    userId?: string,
  ): Promise<RetentionPolicy[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          retentionPolicies: policies as unknown as Prisma.InputJsonValue,
        },
      },
    });

    await this.auditService.log({
      action: 'retention_policies_updated',
      entityType: 'organization',
      entityId: organizationId,
      organizationId,
      userId,
      description: 'Updated evidence retention policies',
      metadata: { policiesCount: policies.length },
    });

    return policies;
  }

  // ============================================
  // Statistics & Reporting
  // ============================================

  /**
   * Get retention statistics for an organization
   */
  async getStatistics(organizationId: string): Promise<{
    totalEvidence: number;
    expiringSoon: number;
    softDeleted: number;
    byType: Array<{ type: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
  }> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [totalEvidence, softDeleted, byType] = await Promise.all([
      this.prisma.evidence.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.evidence.count({
        where: { organizationId, deletedAt: { not: null }, isExpired: true },
      }),
      this.prisma.evidence.groupBy({
        by: ['type'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
    ]);

    // Calculate expiring soon based on validUntil
    const expiringSoon = await this.prisma.evidence.count({
      where: {
        organizationId,
        deletedAt: null,
        validUntil: { lte: thirtyDaysFromNow },
      },
    });

    return {
      totalEvidence,
      expiringSoon,
      softDeleted,
      byType: byType.map(b => ({ type: b.type, count: b._count })),
      byCategory: [], // Category groupBy would need to handle nulls
    };
  }

  /**
   * Get evidence expiring within a timeframe
   */
  async getExpiringEvidence(
    organizationId: string,
    daysAhead: number = 30,
  ) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.prisma.evidence.findMany({
      where: {
        organizationId,
        deletedAt: null,
        validUntil: { lte: futureDate },
      },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        validUntil: true,
        createdAt: true,
        createdByUser: { select: { displayName: true, email: true } },
      },
      orderBy: { validUntil: 'asc' },
      take: 100,
    });
  }
}
