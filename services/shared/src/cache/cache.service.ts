import { Injectable, Inject, Logger } from '@nestjs/common';

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
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly options: CacheOptions;
  private currentMemoryBytes = 0;
  private hitCount = 0;
  private missCount = 0;

  constructor(@Inject('CACHE_OPTIONS') options: CacheOptions) {
    this.options = {
      ...options,
      maxSize: options.maxSize || DEFAULT_MAX_SIZE,
      maxMemoryMB: options.maxMemoryMB || DEFAULT_MAX_MEMORY_MB,
    };
    
    // Periodically clean expired entries
    setInterval(() => this.cleanup(), 60000); // Every minute
    
    // Log cache stats every 5 minutes in debug mode
    if (this.options.debug) {
      setInterval(() => this.logStats(), 5 * 60 * 1000);
    }
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
    const sizeBytes = this.estimateSizeBytes(value);
    const maxMemoryBytes = (this.options.maxMemoryMB || DEFAULT_MAX_MEMORY_MB) * 1024 * 1024;
    
    // If this single entry exceeds max memory, don't cache it
    if (sizeBytes > maxMemoryBytes) {
      if (this.options.debug) {
        this.logger.warn(`Cache SKIP: ${key} - entry too large (${(sizeBytes / 1024 / 1024).toFixed(2)}MB)`);
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
      expiresAt: now + (ttl * 1000),
      lastAccessedAt: now,
      sizeBytes,
    });
    this.currentMemoryBytes += sizeBytes;

    if (this.options.debug) {
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s, size: ${(sizeBytes / 1024).toFixed(2)}KB)`);
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
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
    let count = 0;
    const prefix = pattern.replace('*', '');
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
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
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





