/**
 * Vendor-agnostic secrets management interface.
 *
 * Implement this interface to add support for any KMS provider.
 * Register your implementation via registerSecretsProvider() and
 * set SECRETS_PROVIDER=<name> in your environment.
 */

export interface SecretsProvider {
  /** Initialize provider (connect, authenticate). Called on module init. */
  init(): Promise<void>;

  /** Cleanup (disconnect, flush). Called on module destroy. */
  destroy(): Promise<void>;

  /** Get a secret by name. Returns undefined if not found. */
  getSecret(name: string, path?: string): Promise<string | undefined>;

  /** List secrets with values at a path. Returns [] if unsupported. */
  listSecrets(path?: string): Promise<Array<{ key: string; value: string }>>;

  /** Create or update a secret. No-op if provider is read-only. */
  setSecret(name: string, value: string, path?: string): Promise<void>;

  /** Delete a secret. No-op if provider is read-only. */
  deleteSecret(name: string, path?: string): Promise<void>;

  /** Whether provider is actively connected. false = passive fallback. */
  isEnabled(): boolean;

  /** List managed secret keys (names only, no values). For audit/inventory. */
  listManagedKeys(
    path?: string
  ): Promise<Array<{ key: string; createdAt?: Date; updatedAt?: Date }>>;

  /**
   * Rotate a secret: generate new value, update in provider, return new value.
   * @param generator Optional custom value generator. Defaults to crypto.randomBytes(32).
   */
  rotateSecret(name: string, path?: string, generator?: () => string): Promise<string>;
}

/** Generic config bag — each provider reads only the keys it needs. */
export interface SecretsProviderConfig {
  [key: string]: string | number | boolean | undefined;
}

/** Constructor signature for provider classes. */
export type SecretsProviderConstructor = new (config: SecretsProviderConfig) => SecretsProvider;
