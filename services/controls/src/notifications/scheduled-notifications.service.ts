/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationSeverity } from './dto/notification.dto';
import { addDays, differenceInDays } from 'date-fns';

interface DueItem {
  id: string;
  title: string;
  dueDate: Date;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  type: 'control_test' | 'evidence_expiry' | 'risk_review' | 'policy_review' | 'dr_test' | 'bcdr_plan_review' | 'process_review';
  entityId: string;
  entityType: string;
}

interface NotificationSettings {
  dueSoonDays: number;       // Days before due date to send "due soon" notification
  overdueDays: number;       // Days after due date to send "overdue" notification
  reminderIntervalDays: number; // How often to send reminders
  enableEmailNotifications: boolean;
  enableInAppNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  dueSoonDays: 7,
  overdueDays: 0,
  reminderIntervalDays: 3,
  enableEmailNotifications: true,
  enableInAppNotifications: true,
};

@Injectable()
export class ScheduledNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledNotificationsService.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    @InjectMetric('scheduled_notifications_runs_total')
    private readonly notificationRunsCounter: Counter<string>,
  ) {}

  onModuleInit() {
    // Run daily at 8 AM (or when service starts)
    this.startScheduler();
  }

  /**
   * Start the notification scheduler
   */
  startScheduler() {
    // Run immediately on startup (if in production)
    if (process.env.NODE_ENV === 'production') {
      this.runScheduledNotifications().catch(err => {
        this.logger.error('Failed to run scheduled notifications on startup', err);
      });
    }

    // Run every 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runScheduledNotifications().catch(err => {
        this.logger.error('Failed to run scheduled notifications', err);
      });
    }, TWENTY_FOUR_HOURS);

    this.logger.log('Notification scheduler started');
  }

  /**
   * Stop the scheduler (for cleanup)
   */
  stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run all scheduled notifications
   */
  async runScheduledNotifications(): Promise<void> {
    this.logger.log('Running scheduled notifications...');

    try {
      // Get all organizations
      const organizations = await this.prisma.organization.findMany({
        select: { id: true, name: true },
      });

      // Optional per-run cap to avoid unbounded work in very large deployments
      const maxOrgsPerRunEnv = process.env.NOTIFICATIONS_MAX_ORGS_PER_RUN;
      const maxOrgsPerRun =
        maxOrgsPerRunEnv && !Number.isNaN(Number(maxOrgsPerRunEnv))
          ? Number(maxOrgsPerRunEnv)
          : Number.POSITIVE_INFINITY;

      const orgsToProcess =
        Number.isFinite(maxOrgsPerRun) && organizations.length > maxOrgsPerRun
          ? organizations.slice(0, maxOrgsPerRun)
          : organizations;

      this.logger.log(
        `Processing scheduled notifications for ${orgsToProcess.length} organizations (of ${organizations.length} total)`,
      );

      for (const org of orgsToProcess) {
        const startedAt = Date.now();
        await this.processOrganizationNotifications(org.id, org.name);
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          `Processed notifications for org ${org.name} (${org.id}) in ${durationMs}ms`,
        );
      }

      this.logger.log('Scheduled notifications completed');
      this.notificationRunsCounter.inc({ status: 'success' });
    } catch (error) {
      this.logger.error('Error running scheduled notifications', error);
      this.notificationRunsCounter.inc({ status: 'failure' });
      throw error;
    }
  }

  /**
   * Process notifications for a single organization
   */
  private async processOrganizationNotifications(
    organizationId: string,
    organizationName: string,
  ): Promise<void> {
    // Get notification settings for org (or use defaults)
    const settings = await this.getNotificationSettings(organizationId);

    // Get all due items
    const dueItems = await this.getAllDueItems(organizationId, settings);

    // Group by owner
    const itemsByOwner = this.groupByOwner(dueItems);

    // Send notifications
    for (const [ownerId, items] of Object.entries(itemsByOwner)) {
      await this.sendNotificationsToUser(
        ownerId,
        items,
        organizationId,
        organizationName,
        settings,
      );
    }

    // Check for quarterly DR test compliance
    await this.checkDRTestCompliance(organizationId, organizationName);
  }

  /**
   * Check if organization has performed a DR test within the last 90 days.
   * Sends a reminder to GRC admins if no recent tests found.
   */
  private async checkDRTestCompliance(
    organizationId: string,
    organizationName: string,
  ): Promise<void> {
    const DR_TEST_INTERVAL_DAYS = 90; // Quarterly

    try {
      const ninetyDaysAgo = addDays(new Date(), -DR_TEST_INTERVAL_DAYS);

      // Check for any completed DR tests in the last 90 days
      const recentTests = await this.prisma.$queryRaw<{ count: string }[]>`
        SELECT COUNT(*)::text as count
        FROM bcdr.dr_tests
        WHERE organization_id = ${organizationId}::uuid
          AND deleted_at IS NULL
          AND status = 'completed'
          AND completed_at >= ${ninetyDaysAgo}
      `;

      const testCount = parseInt(recentTests[0]?.count || '0', 10);

      if (testCount === 0) {
        // No recent DR tests - notify GRC admins
        this.logger.warn(
          `Organization ${organizationName} has not completed a DR test in ${DR_TEST_INTERVAL_DAYS} days`,
        );

        // Find GRC admins to notify
        const admins = await this.prisma.user.findMany({
          where: {
            organizationId,
            status: 'active',
            groupMemberships: {
              some: {
                group: {
                  OR: [
                    { name: { contains: 'Admin', mode: 'insensitive' } },
                    { name: { contains: 'GRC', mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
          select: { id: true, email: true, displayName: true },
        });

        // Create in-app notification for each admin
        for (const admin of admins) {
          await this.notificationsService.create({
            userId: admin.id,
            organizationId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            severity: NotificationSeverity.WARNING,
            title: 'DR Test Overdue - Quarterly Compliance',
            message: `Your organization has not completed a Disaster Recovery test in the last ${DR_TEST_INTERVAL_DAYS} days. Regular DR testing is critical for business continuity compliance.`,
            entityType: 'dr_test_compliance',
            entityId: 'quarterly-check',
            metadata: {
              daysSinceLastTest: DR_TEST_INTERVAL_DAYS,
              organizationName,
              link: '/bcdr/tests',
            },
          });
        }

        // Send email to first admin (to avoid spamming all admins)
        if (admins.length > 0 && admins[0].email) {
          await this.emailService.sendEmail({
            to: admins[0].email,
            subject: `[Action Required] DR Test Overdue - ${organizationName}`,
            html: `
              <h2>Disaster Recovery Test Overdue</h2>
              <p>Your organization <strong>${organizationName}</strong> has not completed a Disaster Recovery (DR) test in the last ${DR_TEST_INTERVAL_DAYS} days.</p>
              <h3>Why This Matters</h3>
              <ul>
                <li>Regular DR testing ensures your recovery procedures work when needed</li>
                <li>Many compliance frameworks (SOC 2, ISO 27001, HIPAA) require periodic DR testing</li>
                <li>Testing identifies gaps before a real disaster occurs</li>
              </ul>
              <h3>Next Steps</h3>
              <ol>
                <li>Schedule a DR test in the BCDR module</li>
                <li>Coordinate with stakeholders and IT teams</li>
                <li>Document the test results and any lessons learned</li>
              </ol>
              <p><a href="${process.env.APP_URL || 'https://app.yourdomain.com'}/bcdr/tests/new">Schedule a DR Test Now</a></p>
            `,
          });
        }
      }
    } catch {
      // BCDR module may not be enabled - silently skip
      this.logger.debug('DR test compliance check skipped (BCDR module not available)');
    }
  }

  /**
   * Get notification settings for an organization
   */
  private async getNotificationSettings(organizationId: string): Promise<NotificationSettings> {
    try {
      const config = await this.prisma.notificationConfiguration.findFirst({
        where: { organizationId },
      });

      if (config?.defaultNotifications) {
        // NotificationConfiguration stores a generic JSON blob; for now we just
        // merge any known properties if present and fall back to defaults.
        const defaults = (config.defaultNotifications as Record<string, unknown>) || {};
        return {
          dueSoonDays: (defaults.dueSoonDays as number) || DEFAULT_SETTINGS.dueSoonDays,
          overdueDays: (defaults.overdueDays as number) || DEFAULT_SETTINGS.overdueDays,
          reminderIntervalDays:
            (defaults.reminderIntervalDays as number) || DEFAULT_SETTINGS.reminderIntervalDays,
          enableEmailNotifications:
            (defaults.emailEnabled as boolean) ?? DEFAULT_SETTINGS.enableEmailNotifications,
          enableInAppNotifications:
            (defaults.inAppEnabled as boolean) ?? DEFAULT_SETTINGS.enableInAppNotifications,
        };
      }
    } catch {
      this.logger.warn(`Failed to get notification settings for org ${organizationId}, using defaults`);
    }

    return DEFAULT_SETTINGS;
  }

  /**
   * Get all items that are due soon or overdue
   */
  private async getAllDueItems(
    organizationId: string,
    settings: NotificationSettings,
  ): Promise<DueItem[]> {
    const now = new Date();
    const dueSoonDate = addDays(now, settings.dueSoonDays);
    const items: DueItem[] = [];

    // 1. Control tests due
    const controlTests = await this.prisma.controlImplementation.findMany({
      where: {
        organizationId,
        nextTestDue: { lte: dueSoonDate },
        status: { not: 'not_applicable' },
      },
      select: {
        id: true,
        nextTestDue: true,
        control: {
          select: { id: true, controlId: true, title: true },
        },
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    for (const test of controlTests) {
      if (test.nextTestDue) {
        items.push({
          id: test.id,
          title: `${test.control.controlId}: ${test.control.title}`,
          dueDate: test.nextTestDue,
          ownerId: test.owner?.id,
          ownerEmail: test.owner?.email,
          ownerName: test.owner?.displayName,
          type: 'control_test',
          entityId: test.control.id,
          entityType: 'control',
        });
      }
    }

    // 2. Evidence expiring
    const expiringEvidence = await this.prisma.evidence.findMany({
      where: {
        organizationId,
        deletedAt: null,
        validUntil: { lte: dueSoonDate, gte: now },
        status: 'approved',
      },
      select: {
        id: true,
        title: true,
        validUntil: true,
        createdByUser: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    for (const evidence of expiringEvidence) {
      if (evidence.validUntil) {
        const owner = evidence.createdByUser;

        items.push({
          id: evidence.id,
          title: evidence.title,
          dueDate: evidence.validUntil,
          ownerId: owner?.id,
          ownerEmail: owner?.email,
          ownerName: owner?.displayName,
          type: 'evidence_expiry',
          entityId: evidence.id,
          entityType: 'evidence',
        });
      }
    }

    // 3. Risk reviews due
    const risksForReview = await this.prisma.risk.findMany({
      where: {
        organizationId,
        deletedAt: null,
        nextReviewDue: { lte: dueSoonDate },
        status: { notIn: ['not_a_risk'] }, // Exclude non-risks; "closed" is not a valid status
      },
      select: {
        id: true,
        riskId: true,
        title: true,
        nextReviewDue: true,
        riskOwner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    for (const risk of risksForReview) {
      if (risk.nextReviewDue) {
        items.push({
          id: risk.id,
          title: `${risk.riskId}: ${risk.title}`,
          dueDate: risk.nextReviewDue,
          ownerId: risk.riskOwner?.id,
          ownerEmail: risk.riskOwner?.email,
          ownerName: risk.riskOwner?.displayName,
          type: 'risk_review',
          entityId: risk.id,
          entityType: 'risk',
        });
      }
    }

    // 4. DR Tests scheduled
    try {
      const drTests = await this.prisma.$queryRaw<any[]>`
        SELECT t.id, t.test_id, t.name, t.scheduled_date,
               u.id as coordinator_id, u.email as coordinator_email, u.display_name as coordinator_name
        FROM bcdr.dr_tests t
        LEFT JOIN shared.users u ON t.coordinator_id = u.id
        WHERE t.organization_id = ${organizationId}::uuid
          AND t.deleted_at IS NULL
          AND t.status IN ('planned', 'scheduled')
          AND t.scheduled_date <= ${dueSoonDate}
          AND t.scheduled_date >= ${now}
      `;

      for (const test of drTests) {
        if (test.scheduled_date) {
          items.push({
            id: test.id,
            title: `DR Test: ${test.name}`,
            dueDate: test.scheduled_date,
            ownerId: test.coordinator_id,
            ownerEmail: test.coordinator_email,
            ownerName: test.coordinator_name,
            type: 'dr_test',
            entityId: test.id,
            entityType: 'dr_test',
          });
        }
      }
    } catch {
      this.logger.warn('BC/DR module not available, skipping DR test notifications');
    }

    // 5. BC/DR Plans needing review
    try {
      const bcdrPlans = await this.prisma.$queryRaw<any[]>`
        SELECT p.id, p.plan_id, p.title, p.next_review_due,
               u.id as owner_id, u.email as owner_email, u.display_name as owner_name
        FROM bcdr.bcdr_plans p
        LEFT JOIN shared.users u ON p.owner_id = u.id
        WHERE p.organization_id = ${organizationId}::uuid
          AND p.deleted_at IS NULL
          AND p.status = 'published'
          AND p.next_review_due <= ${dueSoonDate}
      `;

      for (const plan of bcdrPlans) {
        if (plan.next_review_due) {
          items.push({
            id: plan.id,
            title: `BC/DR Plan Review: ${plan.title}`,
            dueDate: plan.next_review_due,
            ownerId: plan.owner_id,
            ownerEmail: plan.owner_email,
            ownerName: plan.owner_name,
            type: 'bcdr_plan_review',
            entityId: plan.id,
            entityType: 'bcdr_plan',
          });
        }
      }
    } catch {
      this.logger.warn('BC/DR module not available, skipping plan review notifications');
    }

    // 6. Business Process BIA reviews
    try {
      const processes = await this.prisma.$queryRaw<any[]>`
        SELECT p.id, p.process_id, p.name, p.next_review_due,
               u.id as owner_id, u.email as owner_email, u.display_name as owner_name
        FROM bcdr.business_processes p
        LEFT JOIN shared.users u ON p.owner_id = u.id
        WHERE p.organization_id = ${organizationId}::uuid
          AND p.deleted_at IS NULL
          AND p.is_active = true
          AND p.next_review_due <= ${dueSoonDate}
      `;

      for (const process of processes) {
        if (process.next_review_due) {
          items.push({
            id: process.id,
            title: `BIA Review: ${process.name}`,
            dueDate: process.next_review_due,
            ownerId: process.owner_id,
            ownerEmail: process.owner_email,
            ownerName: process.owner_name,
            type: 'process_review',
            entityId: process.id,
            entityType: 'business_process',
          });
        }
      }
    } catch {
      this.logger.warn('BC/DR module not available, skipping process review notifications');
    }

    return items;
  }

  /**
   * Group due items by owner
   */
  private groupByOwner(items: DueItem[]): Record<string, DueItem[]> {
    const grouped: Record<string, DueItem[]> = {};

    for (const item of items) {
      const ownerId = item.ownerId || 'unassigned';
      if (!grouped[ownerId]) {
        grouped[ownerId] = [];
      }
      grouped[ownerId].push(item);
    }

    return grouped;
  }

  /**
   * Send notifications to a user
   */
  private async sendNotificationsToUser(
    userId: string,
    items: DueItem[],
    organizationId: string,
    organizationName: string,
    settings: NotificationSettings,
  ): Promise<void> {
    if (items.length === 0) return;

    const now = new Date();
    const overdue = items.filter(i => i.dueDate < now);
    const dueSoon = items.filter(i => i.dueDate >= now);

    // Get user info
    const user = userId !== 'unassigned' 
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, displayName: true },
        })
      : null;

    // Send in-app notifications
    if (settings.enableInAppNotifications && userId !== 'unassigned') {
      // Overdue items - high severity
      for (const item of overdue) {
        await this.notificationsService.create({
          organizationId,
          userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          severity: NotificationSeverity.ERROR,
          title: `Overdue: ${this.getTypeLabel(item.type)}`,
          message: `${item.title} was due on ${this.formatDate(item.dueDate)}`,
          entityType: item.entityType,
          entityId: item.entityId,
          metadata: {
            dueDate: item.dueDate.toISOString(),
          },
        });
      }

      // Due soon items - medium severity
      for (const item of dueSoon) {
        const daysUntilDue = differenceInDays(item.dueDate, now);
        await this.notificationsService.create({
          organizationId,
          userId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          severity: daysUntilDue <= 2 ? NotificationSeverity.ERROR : NotificationSeverity.WARNING,
          title: `Due Soon: ${this.getTypeLabel(item.type)}`,
          message: `${item.title} is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
          entityType: item.entityType,
          entityId: item.entityId,
          metadata: {
            dueDate: item.dueDate.toISOString(),
            daysUntilDue,
          },
        });
      }
    }

    // Send email summary
    if (settings.enableEmailNotifications && user?.email) {
      await this.sendReminderEmail(
        user.email,
        user.displayName || 'User',
        overdue,
        dueSoon,
        organizationName,
      );
    }
  }

  /**
   * Send reminder email with all due items
   */
  private async sendReminderEmail(
    email: string,
    userName: string,
    overdueItems: DueItem[],
    dueSoonItems: DueItem[],
    organizationName: string,
  ): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Build email content
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">GigaChad GRC</h1>
          <p style="margin: 10px 0 0 0;">Compliance Reminder</p>
        </div>
        
        <div style="padding: 20px;">
          <p>Hello ${userName},</p>
          <p>Here's your compliance status update for <strong>${organizationName}</strong>:</p>
    `;

    // Overdue section
    if (overdueItems.length > 0) {
      html += `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">⚠️ Overdue Items (${overdueItems.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
      `;
      for (const item of overdueItems.slice(0, 10)) {
        html += `<li><strong>${this.getTypeLabel(item.type)}:</strong> ${item.title} - Due: ${this.formatDate(item.dueDate)}</li>`;
      }
      if (overdueItems.length > 10) {
        html += `<li><em>...and ${overdueItems.length - 10} more</em></li>`;
      }
      html += `</ul></div>`;
    }

    // Due soon section
    if (dueSoonItems.length > 0) {
      html += `
        <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 15px; margin: 20px 0;">
          <h3 style="color: #ca8a04; margin-top: 0;">📅 Due Soon (${dueSoonItems.length})</h3>
          <ul style="margin: 0; padding-left: 20px;">
      `;
      for (const item of dueSoonItems.slice(0, 10)) {
        const daysUntil = differenceInDays(item.dueDate, new Date());
        html += `<li><strong>${this.getTypeLabel(item.type)}:</strong> ${item.title} - Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}</li>`;
      }
      if (dueSoonItems.length > 10) {
        html += `<li><em>...and ${dueSoonItems.length - 10} more</em></li>`;
      }
      html += `</ul></div>`;
    }

    // Call to action
    html += `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            You're receiving this email because you have items requiring attention in GigaChad GRC.
            To manage your notification preferences, visit your <a href="${appUrl}/settings/notifications">account settings</a>.
          </p>
        </div>
      </div>
    `;

    const subject = overdueItems.length > 0
      ? `⚠️ Compliance Alert: ${overdueItems.length} overdue items require attention`
      : `📅 Compliance Reminder: ${dueSoonItems.length} items due soon`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject,
        html,
      });
      this.logger.log(`Sent reminder email to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder email to ${email}`, error);
    }
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: DueItem['type']): string {
    switch (type) {
      case 'control_test':
        return 'Control Test';
      case 'evidence_expiry':
        return 'Evidence Expiry';
      case 'risk_review':
        return 'Risk Review';
      case 'policy_review':
        return 'Policy Review';
      case 'dr_test':
        return 'DR Test';
      case 'bcdr_plan_review':
        return 'BC/DR Plan Review';
      case 'process_review':
        return 'BIA Review';
      default:
        return 'Item';
    }
  }

  /**
   * Get link to entity
   */
  private getEntityLink(entityType: string, entityId: string): string {
    const base = process.env.APP_URL || 'http://localhost:3000';
    switch (entityType) {
      case 'control':
        return `${base}/controls/${entityId}`;
      case 'evidence':
        return `${base}/evidence/${entityId}`;
      case 'risk':
        return `${base}/risks/${entityId}`;
      case 'policy':
        return `${base}/policies/${entityId}`;
      case 'dr_test':
        return `${base}/bcdr/tests/${entityId}`;
      case 'bcdr_plan':
        return `${base}/bcdr/plans/${entityId}`;
      case 'business_process':
        return `${base}/bcdr/processes/${entityId}`;
      default:
        return `${base}/dashboard`;
    }
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Manually trigger notifications (for testing)
   */
  async triggerNotifications(): Promise<{ processed: number }> {
    await this.runScheduledNotifications();
    return { processed: 1 };
  }
}

