import { SecretsProvider, SecretsProviderConfig } from './secrets.interface';
import { getSecretsProviderConstructor, getRegisteredProviders } from './secrets.registry';
// Import to trigger registration of built-in providers
import './providers';

/**
 * Create a secrets provider instance by type name.
 * Providers must be registered via registerSecretsProvider() before calling this.
 */
export function createSecretsProvider(
  type: string,
  config: SecretsProviderConfig
): SecretsProvider {
  const Ctor = getSecretsProviderConstructor(type);
  if (!Ctor) {
    throw new Error(
      `Unknown secrets provider "${type}". Registered providers: ${getRegisteredProviders().join(', ')}`
    );
  }
  return new Ctor(config);
}

/**
 * Build secrets config from environment variables.
 * Returns the provider type and a generic config bag.
 * Each provider reads only the env vars it needs from the bag.
 */
export function getSecretsConfigFromEnv(): {
  type: string;
  config: SecretsProviderConfig;
} {
  const type = process.env.SECRETS_PROVIDER || 'env';
  const config: SecretsProviderConfig = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      config[key] = value;
    }
  }
  return { type, config };
}
