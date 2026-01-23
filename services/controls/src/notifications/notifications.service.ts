import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import {
  CreateNotificationDto,
  BulkCreateNotificationDto,
  NotificationFilterDto,
  NotificationType,
  NotificationSeverity,
  MarkReadDto,
  NotificationStatsDto,
  NotificationPreferenceResponseDto,
  NotificationPreferenceDto,
} from './dto/notification.dto';

// Notification type metadata for UI display
const NOTIFICATION_TYPE_METADATA: Record<string, { name: string; category: string; description: string }> = {
  [NotificationType.CONTROL_STATUS_CHANGED]: {
    name: 'Control Status Changed',
    category: 'Controls',
    description: 'When a control\'s compliance status changes',
  },
  [NotificationType.CONTROL_DUE_SOON]: {
    name: 'Control Due Soon',
    category: 'Controls',
    description: 'Reminder when control testing is due soon',
  },
  [NotificationType.CONTROL_OVERDUE]: {
    name: 'Control Overdue',
    category: 'Controls',
    description: 'Alert when control testing is overdue',
  },
  [NotificationType.EVIDENCE_EXPIRING]: {
    name: 'Evidence Expiring',
    category: 'Evidence',
    description: 'Warning when evidence is about to expire',
  },
  [NotificationType.EVIDENCE_EXPIRED]: {
    name: 'Evidence Expired',
    category: 'Evidence',
    description: 'Alert when evidence has expired',
  },
  [NotificationType.EVIDENCE_REVIEWED]: {
    name: 'Evidence Reviewed',
    category: 'Evidence',
    description: 'When evidence you uploaded is reviewed',
  },
  [NotificationType.TASK_ASSIGNED]: {
    name: 'Task Assigned',
    category: 'Tasks',
    description: 'When a task is assigned to you',
  },
  [NotificationType.TASK_DUE_SOON]: {
    name: 'Task Due Soon',
    category: 'Tasks',
    description: 'Reminder when a task is due soon',
  },
  [NotificationType.TASK_OVERDUE]: {
    name: 'Task Overdue',
    category: 'Tasks',
    description: 'Alert when a task is overdue',
  },
  [NotificationType.TASK_COMPLETED]: {
    name: 'Task Completed',
    category: 'Tasks',
    description: 'When a task you created is completed',
  },
  [NotificationType.POLICY_REVIEW_DUE]: {
    name: 'Policy Review Due',
    category: 'Policies',
    description: 'Reminder when policy review is due',
  },
  [NotificationType.POLICY_STATUS_CHANGED]: {
    name: 'Policy Status Changed',
    category: 'Policies',
    description: 'When a policy\'s status changes',
  },
  [NotificationType.POLICY_APPROVED]: {
    name: 'Policy Approved',
    category: 'Policies',
    description: 'When a policy you own is approved',
  },
  [NotificationType.POLICY_REJECTED]: {
    name: 'Policy Rejected',
    category: 'Policies',
    description: 'When a policy you own is rejected',
  },
  [NotificationType.COLLECTOR_SUCCESS]: {
    name: 'Collector Success',
    category: 'Integrations',
    description: 'When evidence collector runs successfully',
  },
  [NotificationType.COLLECTOR_FAILED]: {
    name: 'Collector Failed',
    category: 'Integrations',
    description: 'When evidence collector fails',
  },
  [NotificationType.INTEGRATION_SYNC_FAILED]: {
    name: 'Integration Sync Failed',
    category: 'Integrations',
    description: 'When an integration sync fails',
  },
  [NotificationType.INTEGRATION_CONNECTED]: {
    name: 'Integration Connected',
    category: 'Integrations',
    description: 'When an integration is successfully connected',
  },
  [NotificationType.INTEGRATION_DISCONNECTED]: {
    name: 'Integration Disconnected',
    category: 'Integrations',
    description: 'When an integration becomes disconnected',
  },
  [NotificationType.COMMENT_MENTION]: {
    name: 'Comment Mention',
    category: 'Collaboration',
    description: 'When someone mentions you in a comment',
  },
  [NotificationType.COMMENT_REPLY]: {
    name: 'Comment Reply',
    category: 'Collaboration',
    description: 'When someone replies to your comment',
  },
  [NotificationType.BCDR_ATTESTATION_REQUESTED]: {
    name: 'BC/DR Attestation Requested',
    category: 'BC/DR',
    description: 'When you are requested to attest a BC/DR plan',
  },
  [NotificationType.BCDR_INCIDENT_DECLARED]: {
    name: 'BC/DR Incident Declared',
    category: 'BC/DR',
    description: 'When a business continuity or disaster recovery incident is declared',
  },
  [NotificationType.BCDR_PLAN_ACTIVATED]: {
    name: 'BC/DR Plan Activated',
    category: 'BC/DR',
    description: 'When a BC/DR plan is activated for an incident',
  },
  [NotificationType.BCDR_EXERCISE_SCHEDULED]: {
    name: 'BC/DR Exercise Scheduled',
    category: 'BC/DR',
    description: 'When a BC/DR exercise is scheduled',
  },
  [NotificationType.BCDR_EXERCISE_COMPLETED]: {
    name: 'BC/DR Exercise Completed',
    category: 'BC/DR',
    description: 'When a BC/DR exercise is completed',
  },
  [NotificationType.BCDR_RECOVERY_TEAM_ASSIGNED]: {
    name: 'Recovery Team Assigned',
    category: 'BC/DR',
    description: 'When you are assigned to a BC/DR recovery team',
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    name: 'System Announcement',
    category: 'System',
    description: 'Important system announcements',
  },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private emailTemplates: EmailTemplatesService,
  ) {}

  // ===========================
  // Create Notifications
  // ===========================

  async create(dto: CreateNotificationDto): Promise<{ id: string }> {
    const { userId, type, severity = NotificationSeverity.INFO, ...rest } = dto;

    // Check user preferences
    const preference = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType: type,
        },
      },
    });

    // Default to both enabled if no preference set
    const inApp = preference?.inApp ?? true;
    const email = preference?.email ?? true;

    // If user disabled both, don't create notification
    if (!inApp && !email) {
      this.logger.debug(`Notification skipped for user ${userId} - disabled by preferences`);
      return { id: '' };
    }

    // Create in-app notification if enabled
    let notificationId = '';
    if (inApp) {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          severity,
          ...rest,
        },
      });
      notificationId = notification.id;
      this.logger.debug(`Created notification ${notificationId} for user ${userId}`);
    }

    // Send email if enabled
    if (email) {
      await this.sendEmail(userId, type, dto.title, dto.message, severity, dto.metadata);
    }

    return { id: notificationId };
  }

  async createBulk(organizationId: string, dto: BulkCreateNotificationDto): Promise<{ count: number }> {
    const { userIds, type, severity = NotificationSeverity.INFO, ...rest } = dto;

    let createdCount = 0;
    for (const userId of userIds) {
      const result = await this.create({
        organizationId,
        userId,
        type,
        severity,
        ...rest,
      });
      if (result.id) {
        createdCount++;
      }
    }

    return { count: createdCount };
  }

  // ===========================
  // Read Notifications
  // ===========================

  async findAll(userId: string, filters: NotificationFilterDto) {
    const { unreadOnly, types, severities, startDate, endDate, limit = 20, offset = 0 } = filters;

    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (types?.length) {
      where.type = { in: types };
    }

    if (severities?.length) {
      where.severity = { in: severities };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      hasMore: offset + notifications.length < total,
    };
  }

  async findOne(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    return notification;
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      if (!userId || userId === 'default-user') {
        return 0;
      }
      return this.prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (error: any) {
      this.logger.error('Error getting unread count:', error);
      // Return 0 instead of throwing to prevent frontend errors
      return 0;
    }
  }

  async getStats(userId: string): Promise<NotificationStatsDto> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, unread, recentCount, byType, bySeverity] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({ 
        where: { userId, createdAt: { gte: last24Hours } } 
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId, isRead: false },
        _count: { type: true },
      }),
      this.prisma.notification.groupBy({
        by: ['severity'],
        where: { userId, isRead: false },
        _count: { severity: true },
      }),
    ]);

    return {
      total,
      unread,
      recentCount,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ===========================
  // Mark as Read
  // ===========================

  async markAsRead(userId: string, dto: MarkReadDto): Promise<{ updated: number }> {
    const { notificationIds, markAll } = dto;

    let where: any = { userId };

    if (markAll) {
      where.isRead = false;
    } else if (notificationIds?.length) {
      where.id = { in: notificationIds };
      where.isRead = false;
    } else {
      return { updated: 0 };
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  async markOneAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // ===========================
  // Delete Notifications
  // ===========================

  async delete(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  async deleteAll(userId: string): Promise<{ deleted: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { deleted: result.count };
  }

  async deleteOld(daysOld: number = 30): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);
    return { deleted: result.count };
  }

  // ===========================
  // Preferences
  // ===========================

  async getPreferences(userId: string): Promise<NotificationPreferenceResponseDto[]> {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    // Create a map for quick lookup
    const prefMap = new Map(preferences.map(p => [p.notificationType, p]));

    // Return all notification types with their preferences (or defaults)
    return Object.entries(NOTIFICATION_TYPE_METADATA).map(([type, meta]) => {
      const pref = prefMap.get(type);
      return {
        notificationType: type,
        typeName: meta.name,
        category: meta.category,
        description: meta.description,
        inApp: pref?.inApp ?? true,
        email: pref?.email ?? true,
      };
    });
  }

  async updatePreferences(userId: string, preferences: NotificationPreferenceDto[]): Promise<void> {
    // Use a transaction to update all preferences
    await this.prisma.$transaction(
      preferences.map(pref =>
        this.prisma.notificationPreference.upsert({
          where: {
            userId_notificationType: {
              userId,
              notificationType: pref.notificationType,
            },
          },
          create: {
            userId,
            notificationType: pref.notificationType,
            inApp: pref.inApp,
            email: pref.email,
          },
          update: {
            inApp: pref.inApp,
            email: pref.email,
          },
        })
      )
    );
  }

  // ===========================
  // Email Service
  // ===========================

  private async sendEmail(
    userId: string,
    type: string,
    title: string,
    message: string,
    severity: NotificationSeverity,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      // 1. Look up user's email from the User table
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, displayName: true },
      });

      if (!user || !user.email) {
        this.logger.warn(`Cannot send email to user ${userId} - no email address found`);
        return;
      }

      // 2. Generate email template based on notification type
      const template = this.emailTemplates.generateTemplate(
        type as NotificationType,
        title,
        message,
        severity,
        metadata,
      );

      // 3. Send email via email service
      const sent = await this.emailService.sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (sent) {
        this.logger.log(`Email sent successfully to ${user.email} (User: ${userId})`);
      } else {
        this.logger.error(`Failed to send email to ${user.email} (User: ${userId})`);
      }
    } catch (error) {
      this.logger.error(`Error sending email to user ${userId}:`, error.message);
    }
  }

  // ===========================
  // Convenience Method
  // ===========================

  /**
   * Send a notification (convenience wrapper around create).
   * Accepts a flexible params object for easier usage from other services.
   */
  async sendNotification(params: {
    organizationId: string;
    userId?: string;
    type: NotificationType;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    // If no specific userId, this is an org-wide notification
    if (!params.userId) {
      await this.notifyOrganization({
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        severity: params.severity,
        metadata: params.metadata,
      });
      return { id: '' };
    }

    return this.create({
      organizationId: params.organizationId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    });
  }

  // ===========================
  // Helper: Notify by Entity
  // ===========================

  /**
   * Notify the owner of an entity about an event
   */
  async notifyEntityOwner(params: {
    organizationId: string;
    entityType: string;
    entityId: string;
    ownerId: string;
    type: NotificationType;
    title: string;
    message: string;
    severity?: NotificationSeverity;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.create({
      organizationId: params.organizationId,
      userId: params.ownerId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      severity: params.severity,
      metadata: params.metadata,
    });
  }

  /**
   * Notify all users in an organization about an event
   */
  async notifyOrganization(params: {
    organizationId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    severity?: NotificationSeverity;
    metadata?: Record<string, any>;
    excludeUserIds?: string[];
  }): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true },
    });

    const userIds = users
      .map(u => u.id)
      .filter(id => !params.excludeUserIds?.includes(id));

    await this.createBulk(params.organizationId, {
      userIds,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      severity: params.severity,
      metadata: params.metadata,
    });
  }
}

