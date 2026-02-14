import { SecretsProviderConstructor } from './secrets.interface';

const registry = new Map<string, SecretsProviderConstructor>();

/**
 * Register a secrets provider implementation.
 * Call this at module scope in your provider file:
 *   registerSecretsProvider('vault', VaultSecretsProvider);
 */
export function registerSecretsProvider(type: string, ctor: SecretsProviderConstructor): void {
  registry.set(type, ctor);
}

/** Get a registered provider constructor by type name. */
export function getSecretsProviderConstructor(
  type: string
): SecretsProviderConstructor | undefined {
  return registry.get(type);
}

/** List all registered provider type names. */
export function getRegisteredProviders(): string[] {
  return Array.from(registry.keys());
}
