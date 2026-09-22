import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { Counter, Histogram } from 'prom-client';

export interface JobData {
  [key: string]: unknown;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Queue names used across the application
 */
export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  EVIDENCE_PROCESSING: 'evidence-processing',
  COMPLIANCE_CHECKS: 'compliance-checks',
  DATA_SYNC: 'data-sync',
  CLEANUP: 'cleanup',
  /** Dead Letter Queue for failed jobs */
  DEAD_LETTER: 'dead-letter-queue',
} as const;

/**
 * Default job options with resilience settings
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  /** Number of retry attempts before moving to DLQ */
  attempts: 3,
  /** Exponential backoff configuration */
  backoff: {
    type: 'exponential',
    delay: 1000, // Start with 1 second
  },
  /** Remove completed jobs after 24 hours */
  removeOnComplete: {
    age: 24 * 60 * 60, // 24 hours in seconds
    count: 1000, // Keep last 1000 completed jobs
  },
  /** Keep failed jobs for 7 days for debugging */
  removeOnFail: {
    age: 7 * 24 * 60 * 60, // 7 days in seconds
  },
};

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Service for managing background job queues.
 * Uses BullMQ for reliable, Redis-backed job processing.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private isRedisAvailable = false;
  private inMemoryJobs: Map<string, JobData[]> = new Map();
  private dlqQueue: Queue | null = null;

  private jobsProcessedCounter?: Counter<string>;
  private jobDurationHistogram?: Histogram<string>;
  private dlqCounter?: Counter<string>;

  constructor(@Inject('QUEUE_OPTIONS') private options: any) {
    // Metrics are optional - will be undefined if Prometheus not configured
    try {
      this.jobsProcessedCounter = new Counter({
        name: 'jobs_processed_total',
        help: 'Total number of jobs processed',
        labelNames: ['queue', 'status'],
      });
      this.jobDurationHistogram = new Histogram({
        name: 'job_duration_seconds',
        help: 'Job processing duration in seconds',
        labelNames: ['queue', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      });
      this.dlqCounter = new Counter({
        name: 'jobs_dlq_total',
        help: 'Total number of jobs moved to dead letter queue',
        labelNames: ['source_queue', 'job_name'],
      });
    } catch {
      // Metrics already registered or not available
    }
  }

  async onModuleInit(): Promise<void> {
    await this.initializeQueues();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  /**
   * Initialize all queues and check Redis connectivity
   */
  private async initializeQueues(): Promise<void> {
    try {
      const connection = this.parseRedisUrl(this.options.redisUrl);

      // Test Redis connection
      const testQueue = new Queue('test', { connection });
      await testQueue.client;
      await testQueue.close();

      this.isRedisAvailable = true;
      this.logger.log(`Queue system initialized with Redis at ${this.options.redisUrl}`);

      // Initialize Dead Letter Queue first
      this.dlqQueue = new Queue(QUEUE_NAMES.DEAD_LETTER, {
        connection,
        defaultJobOptions: {
          // DLQ jobs should not be retried
          attempts: 1,
          // Keep DLQ jobs for 30 days for investigation
          removeOnComplete: { age: 30 * 24 * 60 * 60 },
          removeOnFail: { age: 30 * 24 * 60 * 60 },
        },
      });
      this.queues.set(QUEUE_NAMES.DEAD_LETTER, this.dlqQueue);
      this.logger.log('Dead Letter Queue initialized');

      // Initialize standard queues (excluding DLQ which is already initialized)
      for (const queueName of Object.values(QUEUE_NAMES)) {
        if (queueName !== QUEUE_NAMES.DEAD_LETTER) {
          this.getOrCreateQueue(queueName);
        }
      }
    } catch (error) {
      this.isRedisAvailable = false;

      if (process.env.NODE_ENV === 'production') {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Redis queue initialization failed in production at ${this.options.redisUrl}: ${message}`
        );
        throw error;
      }

      this.logger.warn(
        `Redis not available at ${this.options.redisUrl}. ` +
          `Falling back to in-memory job inspection for development only. Jobs will not be processed.`
      );
    }
  }

  /**
   * Parse Redis URL into connection options
   */
  private parseRedisUrl(url: string): { host: string; port: number; password?: string } {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
    };
  }

  /**
   * Get or create a queue by name
   */
  private getOrCreateQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      if (!this.isRedisAvailable) {
        // Return a mock queue for in-memory processing
        return this.createMockQueue(name);
      }

      const connection = this.parseRedisUrl(this.options.redisUrl);
      const queue = new Queue(name, {
        connection,
        // Use resilient default job options
        defaultJobOptions: {
          ...DEFAULT_JOB_OPTIONS,
          ...this.options.defaultJobOptions,
        },
      });

      this.queues.set(name, queue);

      // Set up queue events for monitoring and DLQ handling
      const events = new QueueEvents(name, { connection });
      this.queueEvents.set(name, events);

      events.on('completed', ({ jobId }) => {
        this.logger.debug(`Job ${jobId} completed in queue ${name}`);
        this.jobsProcessedCounter?.inc({ queue: name, status: 'completed' });
      });

      events.on('failed', async ({ jobId, failedReason }) => {
        this.logger.error(`Job ${jobId} failed in queue ${name}: ${failedReason}`);
        this.jobsProcessedCounter?.inc({ queue: name, status: 'failed' });

        // Move to DLQ if this was the final attempt (all retries exhausted)
        await this.moveToDeadLetterQueue(name, jobId, failedReason);
      });
    }

    return this.queues.get(name)!;
  }

  /**
   * Move a failed job to the Dead Letter Queue for later investigation
   */
  private async moveToDeadLetterQueue(
    sourceQueue: string,
    jobId: string,
    failedReason: string
  ): Promise<void> {
    if (!this.dlqQueue || !this.isRedisAvailable) {
      return;
    }

    try {
      // Get the original job data
      const queue = this.queues.get(sourceQueue);
      if (!queue) return;

      const job = await queue.getJob(jobId);
      if (!job) return;

      // Only move to DLQ if this was the final attempt
      const attemptsMade = job.attemptsMade ?? 0;
      const maxAttempts = job.opts?.attempts ?? DEFAULT_JOB_OPTIONS.attempts ?? 3;

      if (attemptsMade < maxAttempts) {
        // Job will be retried, don't move to DLQ yet
        return;
      }

      // Add to Dead Letter Queue with original job metadata
      await this.dlqQueue.add('failed-job', {
        originalQueue: sourceQueue,
        originalJobId: jobId,
        originalJobName: job.name,
        originalJobData: job.data,
        failedReason,
        attemptsMade,
        failedAt: new Date().toISOString(),
        stacktrace: job.stacktrace,
      });

      this.dlqCounter?.inc({ source_queue: sourceQueue, job_name: job.name });
      this.logger.warn(
        `Job ${jobId} moved to Dead Letter Queue from ${sourceQueue} after ${attemptsMade} attempts`
      );
    } catch (error) {
      this.logger.error(`Failed to move job ${jobId} to DLQ:`, error);
    }
  }

  /**
   * Create a mock queue for in-memory processing when Redis is unavailable
   */
  private createMockQueue(name: string): Queue {
    if (!this.inMemoryJobs.has(name)) {
      this.inMemoryJobs.set(name, []);
    }
    // Return a proxy that mimics Queue interface
    return {
      add: async (jobName: string, data: JobData) => {
        this.inMemoryJobs.get(name)!.push({ jobName, ...data });
        this.logger.debug(`In-memory job added to ${name}: ${jobName}`);
        return { id: `inmem-${Date.now()}`, name: jobName, data };
      },
      getJobCounts: async () => ({
        waiting: this.inMemoryJobs.get(name)?.length || 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      }),
      close: async () => {},
    } as unknown as Queue;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T extends JobData>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.add(jobName, data, {
      ...this.options.defaultJobOptions,
      ...options,
    });

    this.logger.debug(`Job ${job.id} added to queue ${queueName}: ${jobName}`);
    return job as Job<T>;
  }

  /**
   * Add a delayed job (scheduled for future execution)
   */
  async addDelayedJob<T extends JobData>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
    delayMs: number,
    options?: JobsOptions
  ): Promise<Job<T>> {
    return this.addJob(queueName, jobName, data, {
      ...options,
      delay: delayMs,
    });
  }

  /**
   * Add a job that repeats on a cron schedule
   */
  async addRepeatingJob<T extends JobData>(
    queueName: QueueName | string,
    jobName: string,
    data: T,
    cronPattern: string,
    options?: JobsOptions
  ): Promise<Job<T>> {
    return this.addJob(queueName, jobName, data, {
      ...options,
      repeat: {
        pattern: cronPattern,
      },
    });
  }

  /**
   * Register a worker to process jobs from a queue
   */
  registerWorker(
    queueName: QueueName | string,
    processor: (job: Job) => Promise<any>,
    concurrency = 5
  ): void {
    if (!this.isRedisAvailable) {
      this.logger.warn(`Cannot register worker for ${queueName} - Redis not available`);
      return;
    }

    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker already registered for queue ${queueName}`);
      return;
    }

    const connection = this.parseRedisUrl(this.options.redisUrl);
    const worker = new Worker(
      queueName,
      async (job) => {
        const start = Date.now();
        try {
          const result = await processor(job);
          this.jobDurationHistogram?.observe(
            { queue: queueName, status: 'success' },
            (Date.now() - start) / 1000
          );
          return result;
        } catch (error) {
          this.jobDurationHistogram?.observe(
            { queue: queueName, status: 'failure' },
            (Date.now() - start) / 1000
          );
          throw error;
        }
      },
      {
        connection,
        concurrency,
      }
    );

    worker.on('error', (error) => {
      this.logger.error(`Worker error in queue ${queueName}:`, error);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Worker registered for queue ${queueName} with concurrency ${concurrency}`);
  }

  /**
   * Get statistics for a queue
   */
  async getQueueStats(queueName: QueueName | string): Promise<QueueStats> {
    const queue = this.getOrCreateQueue(queueName);
    const counts = await queue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllStats(): Promise<Record<string, QueueStats>> {
    const stats: Record<string, QueueStats> = {};
    for (const name of Object.values(QUEUE_NAMES)) {
      stats[name] = await this.getQueueStats(name);
    }
    return stats;
  }

  /**
   * Check if the queue system is using Redis (production-ready)
   */
  isUsingRedis(): boolean {
    return this.isRedisAvailable;
  }

  // ============================================
  // Dead Letter Queue Management
  // ============================================

  /**
   * Get Dead Letter Queue statistics
   */
  async getDLQStats(): Promise<QueueStats & { jobs: any[] }> {
    if (!this.dlqQueue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, jobs: [] };
    }

    const counts = await this.dlqQueue.getJobCounts();
    const jobs = await this.dlqQueue.getJobs(['waiting', 'failed'], 0, 50);

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedAt: job.data?.failedAt,
        originalQueue: job.data?.originalQueue,
        originalJobName: job.data?.originalJobName,
        failedReason: job.data?.failedReason,
        attemptsMade: job.data?.attemptsMade,
      })),
    };
  }

  /**
   * Retry a job from the Dead Letter Queue
   * Re-adds the job to its original queue for processing
   */
  async retryDLQJob(dlqJobId: string): Promise<{ success: boolean; message: string }> {
    if (!this.dlqQueue) {
      return { success: false, message: 'Dead Letter Queue not available' };
    }

    try {
      const dlqJob = await this.dlqQueue.getJob(dlqJobId);
      if (!dlqJob) {
        return { success: false, message: `Job ${dlqJobId} not found in DLQ` };
      }

      const { originalQueue, originalJobName, originalJobData } = dlqJob.data;

      if (!originalQueue || !originalJobName) {
        return { success: false, message: 'Invalid DLQ job - missing original queue/job info' };
      }

      // Re-add to original queue
      const queue = this.getOrCreateQueue(originalQueue);
      await queue.add(originalJobName, originalJobData, {
        ...DEFAULT_JOB_OPTIONS,
        // Reset attempts for retry
        attempts: DEFAULT_JOB_OPTIONS.attempts,
      });

      // Remove from DLQ
      await dlqJob.remove();

      this.logger.log(`DLQ job ${dlqJobId} retried - re-added to queue ${originalQueue}`);
      return { success: true, message: `Job re-added to ${originalQueue} queue` };
    } catch (error: any) {
      this.logger.error(`Failed to retry DLQ job ${dlqJobId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove a job from the Dead Letter Queue (acknowledge/dismiss)
   */
  async removeDLQJob(dlqJobId: string): Promise<{ success: boolean; message: string }> {
    if (!this.dlqQueue) {
      return { success: false, message: 'Dead Letter Queue not available' };
    }

    try {
      const dlqJob = await this.dlqQueue.getJob(dlqJobId);
      if (!dlqJob) {
        return { success: false, message: `Job ${dlqJobId} not found in DLQ` };
      }

      await dlqJob.remove();
      this.logger.log(`DLQ job ${dlqJobId} removed/acknowledged`);
      return { success: true, message: 'Job removed from Dead Letter Queue' };
    } catch (error: any) {
      this.logger.error(`Failed to remove DLQ job ${dlqJobId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Clear all jobs from the Dead Letter Queue
   */
  async clearDLQ(): Promise<{ success: boolean; message: string }> {
    if (!this.dlqQueue) {
      return { success: false, message: 'Dead Letter Queue not available' };
    }

    try {
      // Get count before clearing
      const counts = await this.dlqQueue.getJobCounts();
      const totalJobs = (counts.waiting || 0) + (counts.failed || 0) + (counts.delayed || 0);

      await this.dlqQueue.drain();
      await this.dlqQueue.obliterate({ force: true });

      this.logger.warn(`Dead Letter Queue cleared (${totalJobs} jobs removed)`);
      return { success: true, message: `Cleared ${totalJobs} jobs from Dead Letter Queue` };
    } catch (error: any) {
      this.logger.error('Failed to clear DLQ:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Gracefully shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down queue system...');

    // Close all workers first
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.debug(`Worker for ${name} closed`);
    }

    // Close queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
      this.logger.debug(`Queue events for ${name} closed`);
    }

    // Close queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.debug(`Queue ${name} closed`);
    }

    this.logger.log('Queue system shutdown complete');
  }
}
