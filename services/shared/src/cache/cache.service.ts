import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
  sizeBytes: number;
}

interface CacheOptions {
  defaultTtl: number;
  maxSize: number;
  maxMemoryMB?: number; // Maximum memory in megabytes (default: 100MB)
  debug: boolean;
}

const DEFAULT_MAX_MEMORY_MB = 100;
const DEFAULT_MAX_SIZE = 1000;

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly options: CacheOptions;
  private currentMemoryBytes = 0;
  private hitCount = 0;
  private missCount = 0;
  private readonly redis: Redis | null;
  private readonly redisPrefix = 'grc-cache:';

  constructor(@Inject('CACHE_OPTIONS') options: CacheOptions) {
    this.options = {
      ...options,
      maxSize: options.maxSize || DEFAULT_MAX_SIZE,
      maxMemoryMB: options.maxMemoryMB || DEFAULT_MAX_MEMORY_MB,
    };
    const redisUrl = process.env.REDIS_URL;
    this.redis =
      redisUrl && process.env.NODE_ENV !== 'test'
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          })
        : null;
    this.redis?.on('error', (error) =>
      this.logger.warn(`Distributed cache unavailable: ${error.message}`)
    );

    // Periodically clean expired entries
    const cleanupTimer = setInterval(() => this.cleanup(), 60000); // Every minute
    cleanupTimer.unref();

    // Log cache stats every 5 minutes in debug mode
    if (this.options.debug) {
      const statsTimer = setInterval(() => this.logStats(), 5 * 60 * 1000);
      statsTimer.unref();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) await this.redis.quit().catch(() => this.redis?.disconnect());
  }

  private redisKey(key: string): string {
    return `${this.redisPrefix}${key}`;
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSizeBytes(value: unknown): number {
    try {
      const json = JSON.stringify(value);
      // UTF-8 encoding: each character is 1-4 bytes, estimate 2 bytes average
      return json.length * 2;
    } catch {
      // If serialization fails, estimate 1KB
      return 1024;
    }
  }

  /**
   * Get a value from cache (LRU: updates last accessed time)
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        if (this.redis.status === 'wait') await this.redis.connect();
        const raw = await this.redis.get(this.redisKey(key));
        if (raw === null) {
          this.missCount++;
          return null;
        }
        this.hitCount++;
        return JSON.parse(raw) as T;
      } catch (error) {
        this.missCount++;
        this.logger.warn(
          `Distributed cache read failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      }
    }
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      if (this.options.debug) {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.currentMemoryBytes -= entry.sizeBytes;
      this.cache.delete(key);
      this.missCount++;
      if (this.options.debug) {
        this.logger.debug(`Cache EXPIRED: ${key}`);
      }
      return null;
    }

    // LRU: Update last accessed time
    entry.lastAccessedAt = Date.now();

    this.hitCount++;
    if (this.options.debug) {
      this.logger.debug(`Cache HIT: ${key}`);
    }
    return entry.value as T;
  }

  /**
   * Set a value in cache with LRU eviction
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (default: configured default)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.options.defaultTtl;
    if (this.redis) {
      try {
        if (this.redis.status === 'wait') await this.redis.connect();
        await this.redis.set(this.redisKey(key), JSON.stringify(value), 'EX', ttl);
      } catch (error) {
        this.logger.warn(
          `Distributed cache write failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return;
    }
    const sizeBytes = this.estimateSizeBytes(value);
    const maxMemoryBytes = (this.options.maxMemoryMB || DEFAULT_MAX_MEMORY_MB) * 1024 * 1024;

    // If this single entry exceeds max memory, don't cache it
    if (sizeBytes > maxMemoryBytes) {
      if (this.options.debug) {
        this.logger.warn(
          `Cache SKIP: ${key} - entry too large (${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`
        );
      }
      return;
    }

    // If updating existing key, remove old size
    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.sizeBytes;
    }

    // Evict using LRU if we exceed limits
    while (
      (this.cache.size >= this.options.maxSize ||
        this.currentMemoryBytes + sizeBytes > maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value,
      expiresAt: now + ttl * 1000,
      lastAccessedAt: now,
      sizeBytes,
    });
    this.currentMemoryBytes += sizeBytes;

    if (this.options.debug) {
      this.logger.debug(
        `Cache SET: ${key} (TTL: ${ttl}s, size: ${(sizeBytes / 1024).toFixed(2)}KB)`
      );
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        if (this.redis.status === 'wait') await this.redis.connect();
        await this.redis.del(this.redisKey(key));
      } catch (error) {
        this.logger.warn(
          `Distributed cache delete failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return;
    }
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.sizeBytes;
    }
    this.cache.delete(key);
    if (this.options.debug) {
      this.logger.debug(`Cache DEL: ${key}`);
    }
  }

  /**
   * Delete all keys matching a pattern (simple prefix matching)
   */
  async delPattern(pattern: string): Promise<number> {
    if (this.redis) {
      try {
        if (this.redis.status === 'wait') await this.redis.connect();
        let cursor = '0';
        let count = 0;
        do {
          const [next, keys] = await this.redis.scan(
            cursor,
            'MATCH',
            this.redisKey(pattern),
            'COUNT',
            200
          );
          cursor = next;
          if (keys.length) count += await this.redis.del(...keys);
        } while (cursor !== '0');
        return count;
      } catch (error) {
        this.logger.warn(
          `Distributed cache pattern delete failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return 0;
      }
    }
    let count = 0;
    // Use replaceAll to remove all wildcard characters, not just the first one
    // This prevents incomplete sanitization (CWE-116)
    let prefix = pattern;
    while (prefix.includes('*')) {
      prefix = prefix.replace('*', '');
    }
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        this.currentMemoryBytes -= entry.sizeBytes;
        this.cache.delete(key);
        count++;
      }
    }
    if (this.options.debug) {
      this.logger.debug(`Cache DEL PATTERN: ${pattern} (${count} keys)`);
    }
    return count;
  }

  /**
   * Get or set - returns cached value or calls factory function
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (this.redis) {
      await this.delPattern('*');
      this.hitCount = 0;
      this.missCount = 0;
      return;
    }
    this.cache.clear();
    this.currentMemoryBytes = 0;
    this.hitCount = 0;
    this.missCount = 0;
    if (this.options.debug) {
      this.logger.debug('Cache CLEARED');
    }
  }

  /**
   * Get cache statistics with memory info
   */
  getStats(): {
    size: number;
    maxSize: number;
    memoryUsedMB: number;
    maxMemoryMB: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      memoryUsedMB: this.currentMemoryBytes / 1024 / 1024,
      maxMemoryMB: this.options.maxMemoryMB || DEFAULT_MAX_MEMORY_MB,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      hits: this.hitCount,
      misses: this.missCount,
    };
  }

  /**
   * Log current cache stats
   */
  private logStats(): void {
    const stats = this.getStats();
    this.logger.log(
      `Cache stats: ${stats.size}/${stats.maxSize} entries, ` +
        `${stats.memoryUsedMB.toFixed(2)}/${stats.maxMemoryMB}MB, ` +
        `hit rate: ${(stats.hitRate * 100).toFixed(1)}%`
    );
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    let freedBytes = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        freedBytes += entry.sizeBytes;
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.currentMemoryBytes -= freedBytes;

    if (cleaned > 0 && this.options.debug) {
      this.logger.debug(
        `Cache cleanup: removed ${cleaned} expired entries, freed ${(freedBytes / 1024).toFixed(2)}KB`
      );
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    let lruEntry: CacheEntry<unknown> | null = null;

    // Find the least recently used entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
        lruEntry = entry;
      }
    }

    if (lruKey && lruEntry) {
      this.currentMemoryBytes -= lruEntry.sizeBytes;
      this.cache.delete(lruKey);
      if (this.options.debug) {
        this.logger.debug(`Cache LRU eviction: ${lruKey}`);
      }
    }
  }
}
