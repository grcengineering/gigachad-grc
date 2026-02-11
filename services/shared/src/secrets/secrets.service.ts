import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

export const SECRETS_PROVIDER = 'SECRETS_PROVIDER';

export interface SecretsConfig {
  /** Infisical site URL (e.g., http://localhost:8443) */
  siteUrl?: string;
  /** Machine Identity Client ID */
  clientId?: string;
  /** Machine Identity Client Secret */
  clientSecret?: string;
  /** Infisical project ID (workspace) */
  projectId?: string;
  /** Environment slug (dev, staging, production) */
  environment?: string;
  /** Secret path prefix (default: /) */
  secretPath?: string;
  /** Cache TTL in seconds (default: 300) */
  cacheTtlSeconds?: number;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class SecretsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecretsService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtl: number;
  private readonly config: SecretsConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private enabled = false;

  constructor(config?: SecretsConfig) {
    this.config = config || this.getConfigFromEnv();
    this.cacheTtl = (this.config.cacheTtlSeconds ?? 300) * 1000;
  }

  private getConfigFromEnv(): SecretsConfig {
    return {
      siteUrl: process.env.INFISICAL_SITE_URL || process.env.INFISICAL_URL,
      clientId: process.env.INFISICAL_CLIENT_ID,
      clientSecret: process.env.INFISICAL_CLIENT_SECRET,
      projectId: process.env.INFISICAL_PROJECT_ID,
      environment: process.env.INFISICAL_ENVIRONMENT || 'dev',
      secretPath: process.env.INFISICAL_SECRET_PATH || '/',
      cacheTtlSeconds: parseInt(process.env.INFISICAL_CACHE_TTL || '300', 10),
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.siteUrl || !this.config.clientId || !this.config.clientSecret) {
      this.logger.log(
        'Infisical not configured (missing INFISICAL_SITE_URL, INFISICAL_CLIENT_ID, or INFISICAL_CLIENT_SECRET). Falling back to process.env.'
      );
      return;
    }

    try {
      const { InfisicalSDK } = await import('@infisical/sdk');
      this.client = new InfisicalSDK({
        siteUrl: this.config.siteUrl,
      });
      await this.client.auth().universalAuth.login({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });
      this.enabled = true;
      this.logger.log('Infisical SDK connected successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Infisical SDK: ${error instanceof Error ? error.message : error}. Falling back to process.env.`
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get a secret by name. Falls back to process.env if Infisical is not configured.
   */
  async getSecret(name: string, path?: string): Promise<string | undefined> {
    // Check cache first
    const cacheKey = `${path || this.config.secretPath}:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    if (this.enabled && this.client && this.config.projectId) {
      try {
        const secret = await this.client.secrets().getSecret({
          environment: this.config.environment || 'dev',
          projectId: this.config.projectId,
          secretName: name,
          secretPath: path || this.config.secretPath || '/',
        });

        const value = secret.secretValue;
        if (value !== undefined) {
          this.cache.set(cacheKey, {
            value,
            expiresAt: Date.now() + this.cacheTtl,
          });
        }
        return value;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch secret "${name}" from Infisical: ${error instanceof Error ? error.message : error}. Falling back to process.env.`
        );
      }
    }

    // Fallback to process.env
    return process.env[name];
  }

  /**
   * List secrets at a given path. Falls back to empty array if not configured.
   */
  async listSecrets(
    path?: string
  ): Promise<Array<{ key: string; value: string }>> {
    if (this.enabled && this.client && this.config.projectId) {
      try {
        const result = await this.client.secrets().listSecrets({
          environment: this.config.environment || 'dev',
          projectId: this.config.projectId,
          secretPath: path || this.config.secretPath || '/',
        });
        const secrets = result?.secrets || result || [];
        return (Array.isArray(secrets) ? secrets : []).map(
          (s: { secretKey: string; secretValue: string }) => ({
            key: s.secretKey,
            value: s.secretValue,
          })
        );
      } catch (error) {
        this.logger.warn(
          `Failed to list secrets from Infisical: ${error instanceof Error ? error.message : error}`
        );
      }
    }
    return [];
  }

  /**
   * Create or update a secret. No-op if Infisical is not configured.
   */
  async setSecret(name: string, value: string, path?: string): Promise<void> {
    if (!this.enabled || !this.client || !this.config.projectId) {
      this.logger.warn(
        `Cannot set secret "${name}": Infisical is not configured`
      );
      return;
    }

    try {
      await this.client.secrets().createSecret(name, {
        environment: this.config.environment || 'dev',
        projectId: this.config.projectId,
        secretValue: value,
        secretPath: path || this.config.secretPath || '/',
      });

      // Update cache
      const cacheKey = `${path || this.config.secretPath}:${name}`;
      this.cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + this.cacheTtl,
      });
    } catch {
      // If create fails (already exists), try update
      try {
        await this.client.secrets().updateSecret(name, {
          environment: this.config.environment || 'dev',
          projectId: this.config.projectId,
          secretValue: value,
          secretPath: path || this.config.secretPath || '/',
        });

        const cacheKey = `${path || this.config.secretPath}:${name}`;
        this.cache.set(cacheKey, {
          value,
          expiresAt: Date.now() + this.cacheTtl,
        });
      } catch (error) {
        this.logger.error(
          `Failed to set secret "${name}" in Infisical: ${error instanceof Error ? error.message : error}`
        );
        throw error;
      }
    }
  }

  /**
   * Delete a secret. No-op if Infisical is not configured.
   */
  async deleteSecret(name: string, path?: string): Promise<void> {
    if (!this.enabled || !this.client || !this.config.projectId) {
      return;
    }

    try {
      await this.client.secrets().deleteSecret(name, {
        environment: this.config.environment || 'dev',
        projectId: this.config.projectId,
        secretPath: path || this.config.secretPath || '/',
      });

      // Remove from cache
      const cacheKey = `${path || this.config.secretPath}:${name}`;
      this.cache.delete(cacheKey);
    } catch (error) {
      this.logger.error(
        `Failed to delete secret "${name}" from Infisical: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  /**
   * Check if Infisical SDK is connected and active.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
