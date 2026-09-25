import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateQueueDto,
  QueueDto,
  QueueStatsDto,
  CreateJobDto,
  JobDto,
  JobStatus,
  JobListQueryDto,
  RetryJobDto,
  CreateScheduledJobDto,
  UpdateScheduledJobDto,
  ScheduledJobDto,
  JobDashboardSummaryDto,
} from './dto/job.dto';
import * as cronParser from 'cron-parser';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Queue Management
  // ===========================================

  async createQueue(dto: CreateQueueDto): Promise<QueueDto> {
    const existing = await this.prisma.jobQueue.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Queue with this name already exists');
    }

    const queue = await this.prisma.jobQueue.create({
      data: {
        name: dto.name,
        description: dto.description,
        concurrency: dto.concurrency ?? 1,
        maxRetries: dto.maxRetries ?? 3,
        retryDelay: dto.retryDelay ?? 5000,
      },
    });

    return this.toQueueDto(queue);
  }

  async listQueues(): Promise<QueueDto[]> {
    const queues = await this.prisma.jobQueue.findMany({
      orderBy: { name: 'asc' },
    });

    const queueDtos = await Promise.all(
      queues.map(async q => {
        const stats = await this.getQueueStats(q.id);
        return {
          ...this.toQueueDto(q),
          pendingCount: stats.pending,
          activeCount: stats.active,
          completedCount: stats.completed,
          failedCount: stats.failed,
          delayedCount: stats.delayed,
        };
      }),
    );

    return queueDtos;
  }

  async getQueue(id: string): Promise<QueueDto> {
    const queue = await this.prisma.jobQueue.findUnique({ where: { id } });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    const stats = await this.getQueueStats(id);
    return {
      ...this.toQueueDto(queue),
      pendingCount: stats.pending,
      activeCount: stats.active,
      completedCount: stats.completed,
      failedCount: stats.failed,
      delayedCount: stats.delayed,
    };
  }

  async pauseQueue(id: string): Promise<QueueDto> {
    const queue = await this.prisma.jobQueue.update({
      where: { id },
      data: { isPaused: true },
    });

    this.logger.log(`Queue ${queue.name} paused`);
    return this.toQueueDto(queue);
  }

  async resumeQueue(id: string): Promise<QueueDto> {
    const queue = await this.prisma.jobQueue.update({
      where: { id },
      data: { isPaused: false },
    });

    this.logger.log(`Queue ${queue.name} resumed`);
    return this.toQueueDto(queue);
  }

  async getQueueStats(queueId: string): Promise<QueueStatsDto> {
    const queue = await this.prisma.jobQueue.findUnique({ where: { id: queueId } });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    const [pending, active, completed, failed, delayed] = await Promise.all([
      this.prisma.job.count({ where: { queueId, status: 'pending' } }),
      this.prisma.job.count({ where: { queueId, status: 'active' } }),
      this.prisma.job.count({ where: { queueId, status: 'completed' } }),
      this.prisma.job.count({ where: { queueId, status: 'failed' } }),
      this.prisma.job.count({ where: { queueId, status: 'delayed' } }),
    ]);

    return {
      queueId,
      queueName: queue.name,
      pending,
      active,
      completed,
      failed,
      delayed,
      paused: queue.isPaused,
    };
  }

  async clearQueue(id: string, status?: JobStatus): Promise<number> {
    const where: any = { queueId: id };
    if (status) {
      where.status = status;
    }

    const result = await this.prisma.job.deleteMany({ where });

    this.logger.log(`Cleared ${result.count} jobs from queue ${id}`);
    return result.count;
  }

  // ===========================================
  // Job Management
  // ===========================================

  async createJob(queueId: string, dto: CreateJobDto): Promise<JobDto> {
    const queue = await this.prisma.jobQueue.findUnique({ where: { id: queueId } });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    const job = await this.prisma.job.create({
      data: {
        queueId,
        name: dto.name,
        data: dto.data as any,
        priority: dto.priority ?? 0,
        maxAttempts: queue.maxRetries,
        status: dto.delay ? 'delayed' : 'pending',
        delayUntil: dto.delay ? new Date(Date.now() + dto.delay) : null,
      },
    });

    return this.toJobDto(job);
  }

  async listJobs(queueId: string, query: JobListQueryDto): Promise<JobDto[]> {
    const { status, page = 1, pageSize = 20 } = query;

    const where: any = { queueId };
    if (status) {
      where.status = status;
    }

    const jobs = await this.prisma.job.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return jobs.map(j => this.toJobDto(j));
  }

  async getJob(id: string): Promise<JobDto> {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.toJobDto(job);
  }

  async retryJob(id: string, dto?: RetryJobDto): Promise<JobDto> {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'failed') {
      throw new BadRequestException('Can only retry failed jobs');
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        status: 'pending',
        attempts: dto?.resetAttempts ? 0 : job.attempts,
        error: null,
        stackTrace: null,
        failedAt: null,
        processedAt: null,
      },
    });

    this.logger.log(`Job ${id} queued for retry`);
    return this.toJobDto(updated);
  }

  async retryAllFailed(queueId: string): Promise<number> {
    const result = await this.prisma.job.updateMany({
      where: { queueId, status: 'failed' },
      data: {
        status: 'pending',
        error: null,
        stackTrace: null,
        failedAt: null,
        processedAt: null,
      },
    });

    this.logger.log(`Retrying ${result.count} failed jobs in queue ${queueId}`);
    return result.count;
  }

  async cancelJob(id: string): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!['pending', 'delayed'].includes(job.status)) {
      throw new BadRequestException('Can only cancel pending or delayed jobs');
    }

    await this.prisma.job.delete({ where: { id } });
  }

  // ===========================================
  // Scheduled Jobs
  // ===========================================

  async createScheduledJob(
    queueId: string,
    dto: CreateScheduledJobDto,
  ): Promise<ScheduledJobDto> {
    const queue = await this.prisma.jobQueue.findUnique({ where: { id: queueId } });

    if (!queue) {
      throw new NotFoundException('Queue not found');
    }

    // Validate cron expression
    try {
      cronParser.parseExpression(dto.cronExpression);
    } catch {
      throw new BadRequestException('Invalid cron expression');
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(dto.cronExpression, dto.timezone || 'UTC');

    const scheduled = await this.prisma.scheduledJob.create({
      data: {
        queueId,
        name: dto.name,
        description: dto.description,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone || 'UTC',
        data: dto.data as any,
        nextRunAt,
      },
    });

    return this.toScheduledJobDto(scheduled);
  }

  async listScheduledJobs(queueId: string): Promise<ScheduledJobDto[]> {
    const jobs = await this.prisma.scheduledJob.findMany({
      where: { queueId },
      orderBy: { name: 'asc' },
    });

    return jobs.map(j => this.toScheduledJobDto(j));
  }

  async updateScheduledJob(
    id: string,
    dto: UpdateScheduledJobDto,
  ): Promise<ScheduledJobDto> {
    const existing = await this.prisma.scheduledJob.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Scheduled job not found');
    }

    // Validate cron expression if provided
    if (dto.cronExpression) {
      try {
        cronParser.parseExpression(dto.cronExpression);
      } catch {
        throw new BadRequestException('Invalid cron expression');
      }
    }

    // Recalculate next run if cron or timezone changed
    let nextRunAt = existing.nextRunAt;
    if (dto.cronExpression || dto.timezone) {
      nextRunAt = this.calculateNextRun(
        dto.cronExpression || existing.cronExpression,
        dto.timezone || existing.timezone,
      );
    }

    const updated = await this.prisma.scheduledJob.update({
      where: { id },
      data: {
        description: dto.description,
        cronExpression: dto.cronExpression,
        timezone: dto.timezone,
        data: dto.data as any,
        isEnabled: dto.isEnabled,
        nextRunAt,
      },
    });

    return this.toScheduledJobDto(updated);
  }

  async deleteScheduledJob(id: string): Promise<void> {
    await this.prisma.scheduledJob.delete({ where: { id } });
  }

  async triggerScheduledJob(id: string): Promise<JobDto> {
    const scheduled = await this.prisma.scheduledJob.findUnique({
      where: { id },
      include: { queue: true },
    });

    if (!scheduled) {
      throw new NotFoundException('Scheduled job not found');
    }

    // Create an immediate job from the scheduled job
    const job = await this.prisma.job.create({
      data: {
        queueId: scheduled.queueId,
        name: scheduled.name,
        data: (scheduled.data as any) || {},
        priority: 0,
        maxAttempts: scheduled.queue.maxRetries,
        status: 'pending',
      },
    });

    this.logger.log(`Manually triggered scheduled job ${scheduled.name}`);
    return this.toJobDto(job);
  }

  // ===========================================
  // Dashboard
  // ===========================================

  async getDashboardSummary(): Promise<JobDashboardSummaryDto> {
    const queues = await this.prisma.jobQueue.findMany();

    const queueStats = await Promise.all(
      queues.map(q => this.getQueueStats(q.id)),
    );

    const totals = queueStats.reduce(
      (acc, qs) => ({
        pending: acc.pending + qs.pending,
        active: acc.active + qs.active,
        completed: acc.completed + qs.completed,
        failed: acc.failed + qs.failed,
      }),
      { pending: 0, active: 0, completed: 0, failed: 0 },
    );

    const [activeScheduledCount, recentFailed, upcomingScheduled] = await Promise.all([
      this.prisma.scheduledJob.count({ where: { isEnabled: true } }),
      this.prisma.job.findMany({
        where: { status: 'failed' },
        orderBy: { failedAt: 'desc' },
        take: 10,
      }),
      this.prisma.scheduledJob.findMany({
        where: { isEnabled: true, nextRunAt: { not: null } },
        orderBy: { nextRunAt: 'asc' },
        take: 10,
      }),
    ]);

    return {
      queues: queueStats,
      totalPending: totals.pending,
      totalActive: totals.active,
      totalCompleted: totals.completed,
      totalFailed: totals.failed,
      activeScheduledJobs: activeScheduledCount,
      recentFailedJobs: recentFailed.map(j => this.toJobDto(j)),
      upcomingScheduledRuns: upcomingScheduled.map(s => this.toScheduledJobDto(s)),
    };
  }

  // ===========================================
  // Internal: Job Processing (for BullMQ worker)
  // ===========================================

  async markJobActive(id: string): Promise<boolean> {
    const claimed = await this.prisma.job.updateMany({
      where: { id, status: 'pending' },
      data: {
        status: 'active',
        processedAt: new Date(),
        attempts: { increment: 1 },
      },
    });
    return claimed.count === 1;
  }

  async markJobCompleted(id: string, result: any): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: {
        status: 'completed',
        result: result as any,
        completedAt: new Date(),
        progress: 100,
      },
    });
  }

  async markJobFailed(id: string, error: string, stackTrace?: string): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id } });

    if (!job) return;

    // Check if should retry
    if (job.attempts < job.maxAttempts) {
      const queue = await this.prisma.jobQueue.findUnique({
        where: { id: job.queueId },
      });

      await this.prisma.job.update({
        where: { id },
        data: {
          status: 'delayed',
          error,
          stackTrace,
          delayUntil: new Date(Date.now() + (queue?.retryDelay || 5000)),
        },
      });
    } else {
      await this.prisma.job.update({
        where: { id },
        data: {
          status: 'failed',
          error,
          stackTrace,
          failedAt: new Date(),
        },
      });
    }
  }

  async updateJobProgress(id: string, progress: number): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: { progress: Math.min(100, Math.max(0, progress)) },
    });
  }

  // ===========================================
  // Internal: Scheduled Job Runner
  // ===========================================

  async processScheduledJobs(): Promise<void> {
    const now = new Date();

    // Find due scheduled jobs
    const dueJobs = await this.prisma.scheduledJob.findMany({
      where: {
        isEnabled: true,
        nextRunAt: { lte: now },
      },
      include: { queue: true },
    });

    for (const scheduled of dueJobs) {
      try {
        // Create job
        await this.prisma.job.create({
          data: {
            queueId: scheduled.queueId,
            name: scheduled.name,
            data: (scheduled.data as any) || {},
            priority: 0,
            maxAttempts: scheduled.queue.maxRetries,
            status: 'pending',
          },
        });

        // Update scheduled job
        const nextRunAt = this.calculateNextRun(scheduled.cronExpression, scheduled.timezone);

        await this.prisma.scheduledJob.update({
          where: { id: scheduled.id },
          data: {
            lastRunAt: now,
            lastRunStatus: 'triggered',
            nextRunAt,
            runCount: { increment: 1 },
          },
        });
      } catch (error: any) {
        await this.prisma.scheduledJob.update({
          where: { id: scheduled.id },
          data: {
            lastRunAt: now,
            lastRunStatus: 'error',
            lastRunError: error.message,
            failCount: { increment: 1 },
          },
        });
      }
    }
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private calculateNextRun(cronExpression: string, timezone: string): Date {
    try {
      const interval = cronParser.parseExpression(cronExpression, {
        currentDate: new Date(),
        tz: timezone,
      });
      return interval.next().toDate();
    } catch {
      return new Date(Date.now() + 3600000); // Default: 1 hour from now
    }
  }

  private toQueueDto(queue: any): QueueDto {
    return {
      id: queue.id,
      name: queue.name,
      description: queue.description,
      isPaused: queue.isPaused,
      concurrency: queue.concurrency,
      maxRetries: queue.maxRetries,
      retryDelay: queue.retryDelay,
      createdAt: queue.createdAt,
      updatedAt: queue.updatedAt,
    };
  }

  private toJobDto(job: any): JobDto {
    return {
      id: job.id,
      queueId: job.queueId,
      name: job.name,
      data: job.data,
      status: job.status as JobStatus,
      priority: job.priority,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      progress: job.progress,
      result: job.result,
      error: job.error,
      stackTrace: job.stackTrace,
      processedAt: job.processedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      delayUntil: job.delayUntil,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  private toScheduledJobDto(scheduled: any): ScheduledJobDto {
    return {
      id: scheduled.id,
      queueId: scheduled.queueId,
      name: scheduled.name,
      description: scheduled.description,
      cronExpression: scheduled.cronExpression,
      timezone: scheduled.timezone,
      data: scheduled.data,
      isEnabled: scheduled.isEnabled,
      lastRunAt: scheduled.lastRunAt,
      nextRunAt: scheduled.nextRunAt,
      lastRunStatus: scheduled.lastRunStatus,
      lastRunError: scheduled.lastRunError,
      runCount: scheduled.runCount,
      failCount: scheduled.failCount,
      createdAt: scheduled.createdAt,
      updatedAt: scheduled.updatedAt,
    };
  }
}
