import { Logger } from '@nestjs/common';
import { SecretsProvider, SecretsProviderConfig } from '../secrets.interface';
import { registerSecretsProvider } from '../secrets.registry';

/**
 * Environment variable secrets provider (DEFAULT).
 *
 * Reads secrets from process.env. Write operations are no-ops.
 * isEnabled() returns false so consumers fall back to local encryption.
 */
export class EnvSecretsProvider implements SecretsProvider {
  private readonly logger = new Logger(EnvSecretsProvider.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: SecretsProviderConfig) {
    // No configuration needed for env provider
  }

  async init(): Promise<void> {
    this.logger.log('Using environment variables for secrets (no external provider)');
  }

  async destroy(): Promise<void> {
    // Nothing to clean up
  }

  async getSecret(name: string): Promise<string | undefined> {
    return process.env[name];
  }

  async listSecrets(): Promise<Array<{ key: string; value: string }>> {
    return [];
  }

  async setSecret(name: string): Promise<void> {
    this.logger.debug(`setSecret("${name}") is a no-op for env provider`);
  }

  async deleteSecret(name: string): Promise<void> {
    this.logger.debug(`deleteSecret("${name}") is a no-op for env provider`);
  }

  isEnabled(): boolean {
    return false;
  }

  async listManagedKeys(): Promise<Array<{ key: string; createdAt?: Date; updatedAt?: Date }>> {
    return [];
  }

  async rotateSecret(): Promise<string> {
    this.logger.debug('rotateSecret() is a no-op for env provider');
    return '';
  }
}

registerSecretsProvider('env', EnvSecretsProvider);
