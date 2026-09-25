import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PhishingService } from './phishing.service';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

@Injectable()
export class PhishingScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhishingScheduler.name);
  private interval: NodeJS.Timeout | null = null;
  private running = false;
  private redis: Redis | null = null;
  private readonly instanceId = randomUUID();

  constructor(private readonly phishingService: PhishingService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_JOB_SCHEDULER === 'true') return;
    if (process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (error) =>
        this.logger.warn(`Phishing scheduler lock unavailable: ${error.message}`)
      );
    }
    this.interval = setInterval(() => void this.run(), 60_000);
    this.interval.unref();
    void this.run();
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (this.redis) void this.redis.quit().catch(() => this.redis?.disconnect());
  }

  async run() {
    if (this.running) return;
    this.running = true;
    let lockAcquired = false;
    try {
      if (this.redis) {
        if (this.redis.status === 'wait') await this.redis.connect();
        lockAcquired =
          (await this.redis.set(
            'scheduler:phishing-campaigns',
            this.instanceId,
            'PX',
            10 * 60 * 1000,
            'NX'
          )) === 'OK';
        if (!lockAcquired) return;
      }
      const result = await this.phishingService.runDueCampaigns();
      if (result.started || result.completed || result.failed) {
        this.logger.log(
          `Phishing scheduler: ${result.started} started, ${result.completed} completed, ${result.failed} failed`
        );
      }
    } catch (error) {
      this.logger.error(
        `Phishing scheduler failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      if (this.redis && lockAcquired) {
        await this.redis
          .eval(
            'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
            1,
            'scheduler:phishing-campaigns',
            this.instanceId
          )
          .catch(() => undefined);
      }
      this.running = false;
    }
  }
}
