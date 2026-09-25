import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { HealthIndicatorResult } from './prisma.health';

/**
 * Interface for Redis client health check
 */
interface IRedisClient {
  ping: () => Promise<string>;
  status?: string;
}

/**
 * Interface for Redis Event Bus health check
 */
interface IRedisEventBus {
  healthCheck: () => Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    latencyMs: number;
    subscriberConnected: boolean;
    publisherConnected: boolean;
    subscribedChannels: number;
  }>;
  connected: boolean;
}

/**
 * Redis Health Indicator
 * 
 * Provides health check functionality for Redis connections.
 * Can check both raw Redis clients and RedisEventBus instances.
 */
@Injectable()
export class RedisHealthIndicator implements OnModuleDestroy {
  private redisClient: IRedisClient | null = null;
  private redisEventBus: IRedisEventBus | null = null;
  private ownedClient: Redis | null = null;

  constructor() {
    if (process.env.REDIS_URL) {
      this.ownedClient = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.ownedClient.on('error', () => undefined);
      this.redisClient = this.ownedClient;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ownedClient) {
      await this.ownedClient.quit().catch(() => this.ownedClient?.disconnect());
    }
  }

  /**
   * Set the Redis client to use for health checks
   */
  setRedisClient(client: IRedisClient): void {
    this.redisClient = client;
  }

  /**
   * Set the Redis Event Bus to use for health checks
   */
  setRedisEventBus(eventBus: IRedisEventBus): void {
    this.redisEventBus = eventBus;
  }

  /**
   * Get status helper
   */
  protected getStatus(
    key: string,
    isHealthy: boolean,
    data?: Record<string, unknown>,
  ): HealthIndicatorResult {
    return {
      [key]: {
        status: isHealthy ? 'up' : 'down',
        ...data,
      },
    };
  }

  /**
   * Check if Redis is healthy
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    // If using RedisEventBus, use its health check
    if (this.redisEventBus) {
      return this.checkEventBusHealth(key);
    }

    // If using raw Redis client
    if (this.redisClient) {
      return this.checkRedisClientHealth(key);
    }

    return this.getStatus(key, false, { message: 'Redis health client is not configured' });
  }

  /**
   * Check Redis Event Bus health
   */
  private async checkEventBusHealth(key: string): Promise<HealthIndicatorResult> {
    try {
      const health = await this.redisEventBus!.healthCheck();
      
      const isHealthy = health.status === 'healthy';
      const isDegraded = health.status === 'degraded';
      
      // Treat degraded as healthy for readiness (at least partial connectivity)
      return this.getStatus(key, isHealthy || isDegraded, {
        // Use 'detailedStatus' to avoid conflict with the standard status field
        detailedStatus: health.status,
        latencyMs: health.latencyMs,
        subscriberConnected: health.subscriberConnected,
        publisherConnected: health.publisherConnected,
        subscribedChannels: health.subscribedChannels,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.getStatus(key, false, { message: errorMessage });
    }
  }

  /**
   * Check raw Redis client health
   */
  private async checkRedisClientHealth(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.ownedClient?.status === 'wait') await this.ownedClient.connect();
      const startTime = Date.now();
      const result = await this.redisClient!.ping();
      const latencyMs = Date.now() - startTime;
      
      const isHealthy = result === 'PONG';
      
      return this.getStatus(key, isHealthy, {
        latencyMs,
        clientStatus: this.redisClient!.status,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.getStatus(key, false, { message: errorMessage });
    }
  }
}
