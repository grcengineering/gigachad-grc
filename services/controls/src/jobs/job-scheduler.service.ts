import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';
import { CollectorsService } from '../collectors/collectors.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduledNotificationsService } from '../notifications/scheduled-notifications.service';
import { JiraService } from '../integrations/jira/jira.service';
import { ServiceNowService } from '../integrations/servicenow/servicenow.service';
import { ExportsService } from '../exports/exports.service';
import { ReportsService } from '../reports/reports.service';
import { RetentionService } from '../retention/retention.service';
import { RetentionPolicyStatus } from '../retention/dto/retention.dto';
import { WebhooksService } from '../webhooks/webhooks.service';
import { SessionService } from '../auth/session.service';
import { ScheduledReportsService } from '../scheduled-reports/scheduled-reports.service';

interface JobResult {
  status: string;
  [key: string]: any;
}

/**
 * Central job scheduler that replaces scattered setInterval calls
 * with a reliable, database-backed job queue system.
 *
 * This service:
 * 1. Processes pending jobs from the queue
 * 2. Triggers scheduled jobs when their time comes
 * 3. Handles delayed/retry jobs
 * 4. Provides crash-resilient scheduling
 *
 * Missing dependencies and external delivery failures are surfaced as failed
 * jobs; the scheduler never reports simulated work as completed.
 */
@Injectable()
export class JobSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobSchedulerService.name);
  private isRunning = false;
  private processingIntervalId: NodeJS.Timeout | null = null;
  private schedulerIntervalId: NodeJS.Timeout | null = null;

  // Processing intervals (in ms)
  private readonly JOB_PROCESSING_INTERVAL = 5000; // 5 seconds
  private readonly SCHEDULER_INTERVAL = 60000; // 1 minute

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
    @Optional()
    @Inject(forwardRef(() => CollectorsService))
    private readonly collectorsService: CollectorsService | null,
    @Optional()
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService | null,
    @Optional()
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService | null,
    @Optional()
    @Inject(forwardRef(() => ScheduledNotificationsService))
    private readonly scheduledNotificationsService: ScheduledNotificationsService | null,
    @Optional()
    @Inject(forwardRef(() => JiraService))
    private readonly jiraService: JiraService | null,
    @Optional()
    @Inject(forwardRef(() => ServiceNowService))
    private readonly serviceNowService: ServiceNowService | null,
    @Optional()
    @Inject(forwardRef(() => ExportsService))
    private readonly exportsService: ExportsService | null,
    @Optional()
    @Inject(forwardRef(() => ReportsService))
    private readonly reportsService: ReportsService | null,
    @Optional()
    @Inject(forwardRef(() => RetentionService))
    private readonly retentionService: RetentionService | null,
    @Optional()
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService | null,
    @Optional()
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService | null,
    @Optional()
    @Inject(forwardRef(() => ScheduledReportsService))
    private readonly scheduledReportsService: ScheduledReportsService | null
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_JOB_SCHEDULER === 'true') {
      this.logger.warn('Job scheduler is disabled via environment variable');
      return;
    }

    this.logger.log('Starting job scheduler service...');
    this.start();
  }

  onModuleDestroy() {
    this.stop();
  }

  start() {
    if (this.processingIntervalId) {
      return;
    }

    // Start job processing loop
    this.processingIntervalId = setInterval(() => {
      this.processJobs().catch((err) => {
        this.logger.error('Error processing jobs', err);
      });
    }, this.JOB_PROCESSING_INTERVAL);

    // Start scheduled job runner
    this.schedulerIntervalId = setInterval(() => {
      this.jobsService.processScheduledJobs().catch((err) => {
        this.logger.error('Error processing scheduled jobs', err);
      });
      this.processScheduledReports();
    }, this.SCHEDULER_INTERVAL);

    // Run initial processing
    this.processJobs().catch((err) => {
      this.logger.error('Error in initial job processing', err);
    });
    this.jobsService.processScheduledJobs().catch((err) => {
      this.logger.error('Error in initial scheduled job processing', err);
    });
    this.processScheduledReports();

    this.logger.log(
      `Job scheduler started (processing: ${this.JOB_PROCESSING_INTERVAL / 1000}s, scheduling: ${this.SCHEDULER_INTERVAL / 1000}s)`
    );
  }

  stop() {
    if (this.processingIntervalId) {
      clearInterval(this.processingIntervalId);
      this.processingIntervalId = null;
    }
    if (this.schedulerIntervalId) {
      clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }
    this.logger.log('Job scheduler stopped');
  }

  private processScheduledReports(): void {
    if (!this.scheduledReportsService) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('ScheduledReportsService is unavailable in production');
      }
      return;
    }
    this.scheduledReportsService.processDueReports().catch((error) => {
      this.logger.error('Error processing scheduled reports', error);
    });
  }

  /**
   * Process pending and delayed jobs
   */
  private async processJobs(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      // Get active queues
      const queues = await this.prisma.jobQueue.findMany({
        where: { isPaused: false },
      });

      for (const queue of queues) {
        await this.processQueueJobs(queue);
      }

      // Promote delayed jobs that are ready
      await this.promoteDelayedJobs();
    } catch (error) {
      this.logger.error('Error in job processing', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process jobs for a specific queue
   */
  private async processQueueJobs(queue: any): Promise<void> {
    // Get pending jobs up to concurrency limit
    const pendingJobs = await this.prisma.job.findMany({
      where: {
        queueId: queue.id,
        status: 'pending',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: queue.concurrency,
    });

    if (pendingJobs.length === 0) {
      return;
    }

    this.logger.debug(`Processing ${pendingJobs.length} jobs from queue ${queue.name}`);

    for (const job of pendingJobs) {
      try {
        // Mark as active
        await this.jobsService.markJobActive(job.id);

        // Execute the job
        const result = await this.executeJob(job);

        // Mark as completed
        await this.jobsService.markJobCompleted(job.id, result);

        this.logger.log(`Job ${job.id} (${job.name}) completed successfully`);
      } catch (error: any) {
        this.logger.error(`Job ${job.id} (${job.name}) failed: ${error.message}`);

        // Mark as failed (service handles retry logic)
        await this.jobsService.markJobFailed(job.id, error.message, error.stack);
      }
    }
  }

  /**
   * Execute a job based on its name
   */
  private async executeJob(job: any): Promise<any> {
    const { name, data } = job;

    // Route job to appropriate handler
    switch (name) {
      // Evidence collector jobs
      case 'run-evidence-collector':
        return this.runEvidenceCollector(data);

      // Notification jobs
      case 'send-scheduled-notifications':
        return this.sendScheduledNotifications(data);

      case 'send-email':
        return this.sendEmail(data);

      // Integration sync jobs
      case 'sync-jira':
        return this.syncJira(data);

      case 'sync-servicenow':
        return this.syncServiceNow(data);

      // Export jobs
      case 'generate-export':
        return this.generateExport(data);

      // Report jobs
      case 'generate-report':
        return this.generateReport(data);

      // Maintenance jobs
      case 'cleanup-expired-sessions':
        return this.cleanupExpiredSessions(data);

      case 'cleanup-old-audit-logs':
        return this.cleanupOldAuditLogs(data);

      case 'run-retention-policies':
        return this.runRetentionPolicies(data);

      // Webhook delivery
      case 'deliver-webhook':
        return this.deliverWebhook(data);

      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  }

  /**
   * Promote delayed jobs that are ready to run
   */
  private async promoteDelayedJobs(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.job.updateMany({
      where: {
        status: 'delayed',
        delayUntil: { lte: now },
      },
      data: {
        status: 'pending',
        delayUntil: null,
      },
    });

    if (result.count > 0) {
      this.logger.debug(`Promoted ${result.count} delayed jobs to pending`);
    }
  }

  // =============================================
  // Job Handlers
  // =============================================

  /**
   * Run an evidence collector
   */
  private async runEvidenceCollector(data: any): Promise<JobResult> {
    const { collectorId, organizationId } = data;
    this.logger.log(`Running evidence collector ${collectorId}`);

    if (!this.collectorsService) {
      throw new Error('CollectorsService is not available');
    }

    try {
      // Run the collector
      const result = await this.collectorsService.run(
        collectorId,
        organizationId,
        'system-scheduler'
      );
      return { status: 'completed', collectorId, result };
    } catch (error: any) {
      this.logger.error(`Evidence collector ${collectorId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send scheduled notifications
   */
  private async sendScheduledNotifications(_data: any): Promise<JobResult> {
    this.logger.log('Running scheduled notifications');

    if (!this.scheduledNotificationsService) {
      throw new Error('ScheduledNotificationsService is not available');
    }

    try {
      await this.scheduledNotificationsService.runScheduledNotifications();
      return { status: 'completed' };
    } catch (error: any) {
      this.logger.error(`Scheduled notifications failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send an email
   */
  private async sendEmail(data: any): Promise<JobResult> {
    const { to, subject, html, text } = data;
    this.logger.log(`Sending email to ${to}`);

    if (!this.emailService) {
      throw new Error('EmailService is not available');
    }

    try {
      const delivered = await this.emailService.sendEmail({ to, subject, html, text });
      if (!delivered) {
        throw new Error('Email provider did not accept the message');
      }
      return { status: 'sent', to };
    } catch (error: any) {
      this.logger.error(`Email to ${to} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync Jira integration
   */
  private async syncJira(data: any): Promise<JobResult> {
    const { mappingId, organizationId } = data;
    this.logger.log(`Syncing Jira mapping ${mappingId}`);

    if (!this.jiraService) {
      throw new Error('JiraService is not available');
    }

    try {
      await this.jiraService.syncNow(organizationId, mappingId);
      return { status: 'synced', mappingId };
    } catch (error: any) {
      this.logger.error(`Jira sync ${mappingId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sync ServiceNow integration
   */
  private async syncServiceNow(data: any): Promise<JobResult> {
    const { mappingId, organizationId } = data;
    this.logger.log(`Syncing ServiceNow mapping ${mappingId}`);

    if (!this.serviceNowService) {
      throw new Error('ServiceNowService is not available');
    }

    try {
      await this.serviceNowService.syncNow(organizationId, mappingId);
      return { status: 'synced', mappingId };
    } catch (error: any) {
      this.logger.error(`ServiceNow sync ${mappingId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate an export
   */
  private async generateExport(data: any): Promise<JobResult> {
    const { exportId, organizationId } = data;
    this.logger.log(`Generating export ${exportId}`);

    if (!this.exportsService) {
      throw new Error('ExportsService is not available');
    }

    try {
      await this.exportsService.processExportJob(exportId, organizationId);
      return { status: 'generated', exportId };
    } catch (error: any) {
      this.logger.error(`Export ${exportId} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a report
   */
  private async generateReport(data: any): Promise<JobResult> {
    const { reportType, organizationId, parameters } = data;
    this.logger.log(`Generating report ${reportType}`);

    if (!this.reportsService) {
      throw new Error('ReportsService is not available');
    }

    try {
      const dto = {
        reportType,
        ...parameters,
      };
      const result = await this.reportsService.generateReport(
        organizationId,
        'system-scheduler',
        dto
      );
      return { status: 'generated', reportType, filename: result.filename };
    } catch (error: any) {
      this.logger.error(`Report ${reportType} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(_data: any): Promise<JobResult> {
    this.logger.log('Running session cleanup');

    if (!this.sessionService) {
      throw new Error('SessionService is not available');
    }

    try {
      const deletedCount = await this.sessionService.cleanupExpiredSessions();
      this.logger.log(`Cleaned up ${deletedCount} expired sessions`);
      return { status: 'completed', deletedCount };
    } catch (error: any) {
      this.logger.error(`Session cleanup failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup old audit logs based on retention policy
   */
  private async cleanupOldAuditLogs(data: any): Promise<JobResult> {
    const { retentionDays = 365, organizationId } = data;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const whereClause: any = {
      timestamp: { lt: cutoffDate },
    };

    // If organizationId is provided, scope to that org
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: whereClause,
    });
    this.logger.log(`Cleaned up ${result.count} old audit logs (retention: ${retentionDays} days)`);
    return { status: 'completed', deletedCount: result.count, retentionDays };
  }

  /**
   * Run retention policies
   */
  private async runRetentionPolicies(data: any): Promise<JobResult> {
    const { organizationId } = data;
    this.logger.log('Running retention policies');

    if (!this.retentionService) {
      throw new Error('RetentionService is not available');
    }

    try {
      // Get all active retention policies and run them
      const policies = await this.retentionService.listPolicies(organizationId, {
        status: RetentionPolicyStatus.ACTIVE,
      });

      const results: any[] = [];
      for (const policy of policies.data || []) {
        const result = await this.retentionService.runPolicy(
          organizationId,
          'system-scheduler',
          policy.id,
          { dryRun: false }
        );
        results.push(result);
      }

      return {
        status: 'completed',
        policiesExecuted: results.length,
        results,
      };
    } catch (error: any) {
      this.logger.error(`Retention policies failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deliver a webhook
   */
  private async deliverWebhook(data: any): Promise<JobResult> {
    const { deliveryId, webhookId, event, payload } = data;
    this.logger.log(`Delivering webhook ${deliveryId || webhookId}`);

    if (!this.webhooksService) {
      throw new Error('WebhooksService is not available');
    }

    try {
      if (deliveryId && data.organizationId && data.webhookId) {
        // Retry a specific delivery
        await this.webhooksService.retryDelivery(data.organizationId, data.webhookId, deliveryId);
      } else if (data.organizationId && event && payload) {
        // Trigger a new webhook event
        await this.webhooksService.triggerEvent(data.organizationId, event, payload);
      } else {
        throw new Error('Missing required webhook delivery parameters');
      }
      return { status: 'delivered', deliveryId };
    } catch (error: any) {
      this.logger.error(`Webhook delivery ${deliveryId} failed: ${error.message}`);
      throw error;
    }
  }
}
