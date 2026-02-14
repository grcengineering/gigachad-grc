import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SecretsProvider } from './secrets.interface';
import { createSecretsProvider, getSecretsConfigFromEnv } from './secrets.factory';

export const SECRETS_PROVIDER = 'SECRETS_PROVIDER';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Secrets management service.
 *
 * Thin caching wrapper that delegates to a SecretsProvider implementation.
 * The provider is selected via SECRETS_PROVIDER env var (default: 'env').
 *
 * Cache is TTL-based and per-service-instance.
 */
@Injectable()
export class SecretsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecretsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtl: number;
  private readonly provider: SecretsProvider;
  private readonly providerType: string;

  constructor() {
    const { type, config } = getSecretsConfigFromEnv();
    this.providerType = type;
    this.cacheTtl = (parseInt(String(config.SECRETS_CACHE_TTL || '300'), 10) || 300) * 1000;
    this.provider = createSecretsProvider(type, config);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.provider.init();
      this.logger.log(`Secrets provider "${this.providerType}" initialized`);
    } catch (error) {
      this.logger.warn(
        `Secrets provider "${this.providerType}" init failed: ${error instanceof Error ? error.message : error}. Falling back gracefully.`
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.cache.clear();
    await this.provider.destroy();
  }

  /**
   * Get a secret by name. Uses cache with TTL.
   * Falls back to process.env if provider returns undefined.
   */
  async getSecret(name: string, path?: string): Promise<string | undefined> {
    const cacheKey = `${path || '/'}:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await this.provider.getSecret(name, path);
    if (value !== undefined) {
      this.cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + this.cacheTtl,
      });
    }
    return value;
  }

  /**
   * List secrets with values at a path.
   * Not cached — returns live data from provider.
   */
  async listSecrets(path?: string): Promise<Array<{ key: string; value: string }>> {
    return this.provider.listSecrets(path);
  }

  /**
   * Create or update a secret. Updates cache on success.
   */
  async setSecret(name: string, value: string, path?: string): Promise<void> {
    await this.provider.setSecret(name, value, path);
    const cacheKey = `${path || '/'}:${name}`;
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.cacheTtl,
    });
  }

  /**
   * Delete a secret. Evicts from cache.
   */
  async deleteSecret(name: string, path?: string): Promise<void> {
    await this.provider.deleteSecret(name, path);
    const cacheKey = `${path || '/'}:${name}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Whether the underlying provider is actively connected.
   * false = passive fallback (env provider or failed init).
   */
  isEnabled(): boolean {
    return this.provider.isEnabled();
  }

  /**
   * List managed secret keys (names only, no values).
   * For audit/inventory purposes. Not cached.
   */
  async listManagedKeys(
    path?: string
  ): Promise<Array<{ key: string; createdAt?: Date; updatedAt?: Date }>> {
    return this.provider.listManagedKeys(path);
  }

  /**
   * Rotate a secret: generate new value, update in provider, invalidate cache.
   * @param generator Optional custom value generator. Defaults to 32 random hex bytes.
   */
  async rotateSecret(name: string, path?: string, generator?: () => string): Promise<string> {
    const newValue = generator ? generator() : randomBytes(32).toString('hex');
    await this.provider.setSecret(name, newValue, path);
    const cacheKey = `${path || '/'}:${name}`;
    this.cache.set(cacheKey, {
      value: newValue,
      expiresAt: Date.now() + this.cacheTtl,
    });
    return newValue;
  }
}
