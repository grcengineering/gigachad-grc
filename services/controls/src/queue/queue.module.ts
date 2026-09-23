import { Module, Global, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { JobProcessor } from './job.processor';

export interface QueueModuleOptions {
  /**
   * Redis connection URL
   * Default: redis://localhost:6379
   */
  redisUrl?: string;

  /**
   * Default job options
   */
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

/**
 * Queue Module for background job processing using BullMQ.
 *
 * Features:
 * - Durable job persistence (Redis-backed)
 * - Automatic retries with exponential backoff
 * - Job prioritization
 * - Delayed jobs (scheduling)
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 *
 * Usage:
 *
 * 1. Import the module:
 *    QueueModule.forRoot({ redisUrl: process.env.REDIS_URL })
 *
 * 2. Inject QueueService and add jobs:
 *    await this.queueService.addJob('notifications', 'send-digest', { userId: '123' });
 *
 * 3. Process jobs by extending JobProcessor
 *
 * Note: Requires Redis to be running. Job submission fails closed when Redis
 * is unavailable so callers never receive a synthetic success response.
 */
@Global()
@Module({})
export class QueueModule {
  private static readonly logger = new Logger(QueueModule.name);

  static forRoot(options?: QueueModuleOptions): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'QUEUE_OPTIONS',
          useFactory: (configService: ConfigService) => {
            const redisUrl =
              options?.redisUrl ||
              configService.get<string>('REDIS_URL') ||
              'redis://localhost:6379';

            return {
              redisUrl,
              defaultJobOptions: options?.defaultJobOptions || {
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 1000,
                },
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 500, // Keep last 500 failed jobs
              },
            };
          },
          inject: [ConfigService],
        },
        QueueService,
        JobProcessor,
      ],
      exports: [QueueService, JobProcessor],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<QueueModuleOptions> | QueueModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: QueueModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'QUEUE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        QueueService,
        JobProcessor,
      ],
      exports: [QueueService, JobProcessor],
    };
  }
}
