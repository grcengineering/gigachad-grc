import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SecretsProvider, SecretsProviderConfig } from '../secrets.interface';
import { registerSecretsProvider } from '../secrets.registry';

/**
 * Infisical secrets provider.
 *
 * Connects to a self-hosted or cloud Infisical instance via the SDK.
 * Uses Universal Auth (Machine Identity) for authentication.
 *
 * Required env vars:
 *   INFISICAL_SITE_URL (or INFISICAL_URL)
 *   INFISICAL_CLIENT_ID
 *   INFISICAL_CLIENT_SECRET
 *   INFISICAL_PROJECT_ID
 *
 * Optional:
 *   INFISICAL_ENVIRONMENT (default: 'dev')
 *   INFISICAL_SECRET_PATH (default: '/')
 */
export class InfisicalSecretsProvider implements SecretsProvider {
  private readonly logger = new Logger(InfisicalSecretsProvider.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private enabled = false;

  private readonly siteUrl: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly projectId: string | undefined;
  private readonly environment: string;
  private readonly secretPath: string;

  constructor(config: SecretsProviderConfig) {
    this.siteUrl = (config.INFISICAL_SITE_URL || config.INFISICAL_URL) as string | undefined;
    this.clientId = config.INFISICAL_CLIENT_ID as string | undefined;
    this.clientSecret = config.INFISICAL_CLIENT_SECRET as string | undefined;
    this.projectId = config.INFISICAL_PROJECT_ID as string | undefined;
    this.environment = (config.INFISICAL_ENVIRONMENT as string) || 'dev';
    this.secretPath = (config.INFISICAL_SECRET_PATH as string) || '/';
  }

  async init(): Promise<void> {
    if (!this.siteUrl || !this.clientId || !this.clientSecret) {
      this.logger.log(
        'Infisical not configured (missing INFISICAL_SITE_URL, INFISICAL_CLIENT_ID, or INFISICAL_CLIENT_SECRET). Falling back to process.env.'
      );
      return;
    }

    try {
      const { InfisicalSDK } = await import('@infisical/sdk');
      this.client = new InfisicalSDK({
        siteUrl: this.siteUrl,
      });
      await this.client.auth().universalAuth.login({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });
      this.enabled = true;
      this.logger.log('Infisical SDK connected successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Infisical SDK: ${error instanceof Error ? error.message : error}. Falling back to process.env.`
      );
    }
  }

  async destroy(): Promise<void> {
    this.client = null;
    this.enabled = false;
  }

  async getSecret(name: string, path?: string): Promise<string | undefined> {
    if (this.enabled && this.client && this.projectId) {
      try {
        const secret = await this.client.secrets().getSecret({
          environment: this.environment,
          projectId: this.projectId,
          secretName: name,
          secretPath: path || this.secretPath,
        });
        return secret.secretValue;
      } catch (error) {
        this.logger.warn(
          `Failed to fetch secret "${name}" from Infisical: ${error instanceof Error ? error.message : error}. Falling back to process.env.`
        );
      }
    }

    return process.env[name];
  }

  async listSecrets(path?: string): Promise<Array<{ key: string; value: string }>> {
    if (this.enabled && this.client && this.projectId) {
      try {
        const result = await this.client.secrets().listSecrets({
          environment: this.environment,
          projectId: this.projectId,
          secretPath: path || this.secretPath,
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

  async setSecret(name: string, value: string, path?: string): Promise<void> {
    if (!this.enabled || !this.client || !this.projectId) {
      this.logger.warn(`Cannot set secret "${name}": Infisical is not configured`);
      return;
    }

    const secretPath = path || this.secretPath;

    try {
      await this.client.secrets().createSecret(name, {
        environment: this.environment,
        projectId: this.projectId,
        secretValue: value,
        secretPath,
      });
    } catch {
      // If create fails (already exists), try update
      try {
        await this.client.secrets().updateSecret(name, {
          environment: this.environment,
          projectId: this.projectId,
          secretValue: value,
          secretPath,
        });
      } catch (error) {
        this.logger.error(
          `Failed to set secret "${name}" in Infisical: ${error instanceof Error ? error.message : error}`
        );
        throw error;
      }
    }
  }

  async deleteSecret(name: string, path?: string): Promise<void> {
    if (!this.enabled || !this.client || !this.projectId) {
      return;
    }

    try {
      await this.client.secrets().deleteSecret(name, {
        environment: this.environment,
        projectId: this.projectId,
        secretPath: path || this.secretPath,
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete secret "${name}" from Infisical: ${error instanceof Error ? error.message : error}`
      );
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async listManagedKeys(
    path?: string
  ): Promise<Array<{ key: string; createdAt?: Date; updatedAt?: Date }>> {
    if (this.enabled && this.client && this.projectId) {
      try {
        const result = await this.client.secrets().listSecrets({
          environment: this.environment,
          projectId: this.projectId,
          secretPath: path || this.secretPath,
        });
        const secrets = result?.secrets || result || [];
        return (Array.isArray(secrets) ? secrets : []).map(
          (s: { secretKey: string; createdAt?: string; updatedAt?: string }) => ({
            key: s.secretKey,
            createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
            updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
          })
        );
      } catch (error) {
        this.logger.warn(
          `Failed to list managed keys from Infisical: ${error instanceof Error ? error.message : error}`
        );
      }
    }
    return [];
  }

  async rotateSecret(name: string, path?: string, generator?: () => string): Promise<string> {
    const newValue = generator ? generator() : randomBytes(32).toString('hex');
    await this.setSecret(name, newValue, path);
    return newValue;
  }
}

registerSecretsProvider('infisical', InfisicalSecretsProvider);
