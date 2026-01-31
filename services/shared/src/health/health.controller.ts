import { Controller, Get, Optional, Inject } from '@nestjs/common';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaHealthIndicator,
    @Optional() @Inject(RedisHealthIndicator) private redis?: RedisHealthIndicator,
  ) {}

  /**
   * Get memory usage stats
   */
  private getMemoryStats() {
    const used = process.memoryUsage();
    return {
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal,
      rss: used.rss,
      external: used.external,
    };
  }

  /**
   * Check if memory is within limits
   */
  private checkMemory(heapLimit: number, rssLimit: number) {
    const memory = this.getMemoryStats();
    const heapOk = memory.heapUsed < heapLimit;
    const rssOk = memory.rss < rssLimit;

    return {
      memory_heap: {
        status: heapOk ? 'up' : 'down',
        used: memory.heapUsed,
        limit: heapLimit,
      },
      memory_rss: {
        status: rssOk ? 'up' : 'down',
        used: memory.rss,
        limit: rssLimit,
      },
    };
  }

  /**
   * Liveness probe - indicates the service is running
   * Used by container orchestrators to restart unhealthy containers
   */
  @Get('live')
  async checkLive(): Promise<HealthCheckResponse> {
    const memoryCheck = this.checkMemory(
      500 * 1024 * 1024, // 500MB heap
      1024 * 1024 * 1024 // 1GB RSS
    );

    const isHealthy = memoryCheck.memory_heap.status === 'up';

    return {
      status: isHealthy ? 'ok' : 'error',
      info: isHealthy ? { memory_heap: memoryCheck.memory_heap } : undefined,
      error: !isHealthy ? { memory_heap: memoryCheck.memory_heap } : undefined,
      details: memoryCheck,
    };
  }

  /**
   * Readiness probe - indicates the service is ready to accept traffic
   * Checks database connectivity, Redis, and other dependencies
   */
  @Get('ready')
  async checkReady(): Promise<HealthCheckResponse> {
    const dbCheck = await this.prisma.isHealthy('database');
    const redisCheck = this.redis 
      ? await this.redis.isHealthy('redis')
      : { redis: { status: 'up' as const, message: 'Redis not configured' } };
    const memoryCheck = this.checkMemory(
      500 * 1024 * 1024, // 500MB heap
      1024 * 1024 * 1024 // 1GB RSS
    );

    const dbHealthy = dbCheck.database?.status === 'up';
    // Redis is considered healthy if status is 'up' (includes degraded state)
    const redisHealthy = redisCheck.redis?.status === 'up';
    const memoryHealthy = memoryCheck.memory_heap.status === 'up' && 
                          memoryCheck.memory_rss.status === 'up';
    const isHealthy = dbHealthy && redisHealthy && memoryHealthy;

    const info: Record<string, unknown> = {};
    const error: Record<string, unknown> = {};

    if (dbHealthy) {
      info.database = dbCheck.database;
    } else {
      error.database = dbCheck.database;
    }

    if (redisHealthy) {
      info.redis = redisCheck.redis;
    } else {
      error.redis = redisCheck.redis;
    }

    if (memoryCheck.memory_heap.status === 'up') {
      info.memory_heap = memoryCheck.memory_heap;
    } else {
      error.memory_heap = memoryCheck.memory_heap;
    }

    if (memoryCheck.memory_rss.status === 'up') {
      info.memory_rss = memoryCheck.memory_rss;
    } else {
      error.memory_rss = memoryCheck.memory_rss;
    }

    return {
      status: isHealthy ? 'ok' : 'error',
      info: Object.keys(info).length > 0 ? info : undefined,
      error: Object.keys(error).length > 0 ? error : undefined,
      details: { ...dbCheck, ...redisCheck, ...memoryCheck },
    };
  }

  /**
   * Full health check - comprehensive status including all dependencies
   */
  @Get()
  async check(): Promise<HealthCheckResponse> {
    return this.checkReady();
  }
}
