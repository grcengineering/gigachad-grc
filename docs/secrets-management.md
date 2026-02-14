# Secrets Management

## Overview

GigaChad GRC includes a vendor-agnostic secrets management layer that decouples
integration credentials from the application database. Instead of storing raw or
locally-encrypted secrets in the `Integration.config` JSON column, the system can
delegate storage and retrieval to an external key management service (KMS).

The layer is designed to avoid vendor lock-in. A `SecretsProvider` interface
defines the contract, a provider registry maps type names to implementations, and
a factory selects the right provider at startup based on a single environment
variable. Adding a new backend (HashiCorp Vault, AWS Secrets Manager, etc.) means
implementing one interface and registering it -- no changes to consuming services.

**Default behavior:** When no external provider is configured, the `env` provider
is used. Integration credentials are encrypted locally with AES-256-GCM and
stored in the database as before. No external infrastructure is required.

---

## Quick Start

The default configuration works out of the box. No environment variables need to
be set.

1. Start the application normally (`docker compose up -d` or `make rebuild`).
2. The secrets layer initializes with the `env` provider.
3. Integration credentials are encrypted locally with AES-256-GCM using the
   `ENCRYPTION_KEY` environment variable.
4. No external secrets service is contacted.

To explicitly select the default provider, set in your `.env`:

```
SECRETS_PROVIDER=env
```

Or leave `SECRETS_PROVIDER` unset entirely -- the factory defaults to `env`.

---

## Choosing a Provider

Set the `SECRETS_PROVIDER` environment variable in `.env` to select a backend.
The factory reads this value at service startup and instantiates the
corresponding provider class from the registry.

| Provider  | Value       | Description                                                      |
| --------- | ----------- | ---------------------------------------------------------------- |
| Env       | `env`       | Default. Reads from `process.env`, local AES-256-GCM encryption. |
| Infisical | `infisical` | Self-hosted Infisical instance with Universal Auth.              |

The `env` provider's `isEnabled()` returns `false`, which signals consuming
services to continue using local encryption for credential storage. External
providers return `true` when connected, and consuming services store a
`secrets://` URI reference in the database instead of the encrypted value itself.

---

## Configuring Infisical

Infisical is the first external provider. It runs as an optional Docker Compose
profile and authenticates via Universal Auth (Machine Identity).

### 1. Generate bootstrap secrets

Infisical's container needs its own encryption key and auth secret. Generate them
once and add them to your `.env`:

```bash
# Generate required Infisical container secrets
echo "INFISICAL_ENCRYPTION_KEY=$(openssl rand -hex 16)" >> .env
echo "INFISICAL_AUTH_SECRET=$(openssl rand -hex 32)" >> .env
```

These are used by the Infisical container itself (mapped to `ENCRYPTION_KEY` and
`AUTH_SECRET` inside the container). They are not the same as the application's
`ENCRYPTION_KEY`.

### 2. Start the Infisical profile

```bash
docker compose --profile infisical up -d
```

This starts the `grc-infisical` container on port 8443 (dev) or behind Traefik
at `secrets.<APP_DOMAIN>` (prod). The container uses the shared Postgres instance
with a separate `infisical` database and Redis on database index 1.

### 3. Create an admin account

Open `http://localhost:8443` in a browser and complete the Infisical setup
wizard. Create an organization and a project for GigaChad GRC.

### 4. Create a Machine Identity

In the Infisical dashboard:

1. Navigate to Organization Settings > Machine Identities.
2. Create a new identity with Universal Auth.
3. Note the **Client ID** and **Client Secret**.
4. Grant the identity access to your project with read/write permissions.
5. Note your **Project ID** from the project settings page.

### 5. Set environment variables

Add the following to your `.env`:

```
SECRETS_PROVIDER=infisical

INFISICAL_SITE_URL=http://infisical:8080
INFISICAL_CLIENT_ID=<your-client-id>
INFISICAL_CLIENT_SECRET=<your-client-secret>
INFISICAL_PROJECT_ID=<your-project-id>
```

Optional variables:

| Variable                | Default | Description                               |
| ----------------------- | ------- | ----------------------------------------- |
| `INFISICAL_ENVIRONMENT` | `dev`   | Infisical environment slug.               |
| `INFISICAL_SECRET_PATH` | `/`     | Base path for secrets within the project. |

`INFISICAL_URL` is accepted as an alias for `INFISICAL_SITE_URL`.

### 6. Restart services

```bash
docker compose up -d --build controls frameworks policies tprm trust audit
```

On startup, each service logs either `Infisical SDK connected successfully` or a
warning with fallback to `process.env` if the connection fails. The fallback is
graceful -- services continue to operate using local encryption.

---

## Key Management Operations

### Listing Managed Keys

```typescript
const keys = await secretsService.listManagedKeys('/integrations');
// Returns: [{ key: 'int_abc123_api_key', createdAt: Date, updatedAt: Date }, ...]
```

`listManagedKeys(path?)` returns secret key names with optional timestamps. No
secret values are exposed. This is intended for audit and inventory use cases.

The `env` provider returns an empty array since it has no concept of managed
secrets. The Infisical provider returns all keys at the given path with their
`createdAt` and `updatedAt` timestamps from the Infisical API.

### Key Rotation

```typescript
const newValue = await secretsService.rotateSecret('int_abc123_api_key', '/integrations');
```

`rotateSecret(name, path?, generator?)` performs an atomic rotate:

1. Generates a new secret value. The default generator produces 32 random hex
   bytes via `crypto.randomBytes(32)`. Pass a custom `generator` function for
   provider-specific requirements (e.g., a specific format or length).
2. Writes the new value to the provider via `setSecret`.
3. Invalidates the in-memory cache entry for that key.
4. Returns the new value.

```typescript
// Custom generator example
const newApiKey = await secretsService.rotateSecret(
  'int_abc123_api_key',
  '/integrations',
  () => `grc_${randomBytes(24).toString('base64url')}`
);
```

### Caching

The `SecretsService` maintains a TTL-based in-memory cache per service instance.
Cache behavior:

- **Reads** (`getSecret`): Served from cache if the entry exists and has not
  expired. On cache miss, the provider is queried and the result is cached.
- **Writes** (`setSecret`): The cache entry is updated immediately with the new
  value and a fresh TTL.
- **Deletes** (`deleteSecret`): The cache entry is evicted.
- **Rotates** (`rotateSecret`): The cache entry is replaced with the new value.
- **Lists** (`listSecrets`, `listManagedKeys`): Not cached. Always returns live
  data from the provider.

Configure the TTL via environment variable:

```
SECRETS_CACHE_TTL=300
```

Value is in seconds. Default is 300 (5 minutes). The cache is per-process -- in a
multi-replica deployment, each instance maintains its own cache and there is no
cross-instance invalidation.

---

## Adding a Custom Provider

To add a new secrets backend (e.g., HashiCorp Vault), follow these steps.

### 1. Create the provider file

Create a new file in `services/shared/src/secrets/providers/`:

```typescript
// services/shared/src/secrets/providers/vault.provider.ts
import { Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SecretsProvider, SecretsProviderConfig } from '../secrets.interface';
import { registerSecretsProvider } from '../secrets.registry';

export class VaultSecretsProvider implements SecretsProvider {
  private readonly logger = new Logger(VaultSecretsProvider.name);
  private client: any = null;
  private connected = false;

  constructor(private config: SecretsProviderConfig) {
    // Read provider-specific config from the generic bag
    // e.g., this.config.VAULT_ADDR, this.config.VAULT_TOKEN
  }

  async init(): Promise<void> {
    try {
      // Dynamic import to avoid hard dependency
      const vault = await import('node-vault');
      this.client = vault.default({ endpoint: this.config.VAULT_ADDR as string });
      // Authenticate...
      this.connected = true;
    } catch (error) {
      this.logger.warn(`Vault init failed: ${error}`);
    }
  }

  async destroy(): Promise<void> {
    this.client = null;
    this.connected = false;
  }

  async getSecret(name: string, path?: string): Promise<string | undefined> {
    // Implement KV v2 read
    return undefined;
  }

  async listSecrets(path?: string): Promise<Array<{ key: string; value: string }>> {
    return [];
  }

  async setSecret(name: string, value: string, path?: string): Promise<void> {
    // Implement KV v2 write
  }

  async deleteSecret(name: string, path?: string): Promise<void> {
    // Implement KV v2 delete
  }

  isEnabled(): boolean {
    return this.connected;
  }

  async listManagedKeys(
    path?: string
  ): Promise<Array<{ key: string; createdAt?: Date; updatedAt?: Date }>> {
    // Implement KV v2 list metadata
    return [];
  }

  async rotateSecret(name: string, path?: string, generator?: () => string): Promise<string> {
    const newValue = generator ? generator() : randomBytes(32).toString('hex');
    await this.setSecret(name, newValue, path);
    return newValue;
  }
}

// Self-register at import time
registerSecretsProvider('vault', VaultSecretsProvider);
```

### 2. Register the import

Add the import to `services/shared/src/secrets/providers/index.ts`:

```typescript
import './env.provider';
import './infisical.provider';
import './vault.provider'; // <-- add this line
```

The import triggers the `registerSecretsProvider('vault', ...)` call at module
load time, which registers the constructor in the provider registry before the
factory runs.

### 3. Set the environment variable

In `.env`:

```
SECRETS_PROVIDER=vault
```

### 4. Install any required SDK

```bash
npm install node-vault
```

### Summary of steps

1. Create a file in `services/shared/src/secrets/providers/`.
2. Implement the `SecretsProvider` interface (all 9 methods).
3. Call `registerSecretsProvider('name', YourProvider)` at module scope.
4. Add the import to `providers/index.ts`.
5. Set `SECRETS_PROVIDER=name` in `.env`.
6. Install any required SDK package.

The factory (`secrets.factory.ts`) reads `SECRETS_PROVIDER` from the environment,
looks up the registered constructor, and passes the full `process.env` as a
generic config bag. Your provider reads only the keys it needs (e.g.,
`VAULT_ADDR`, `VAULT_TOKEN`).

---

## Migration Guide

### Moving from `env` to an external provider

1. Set `SECRETS_PROVIDER=infisical` (or your chosen provider) in `.env`.
2. Configure the provider's required environment variables.
3. Restart services.

Existing locally-encrypted integration credentials in the database remain
readable. The AES-256-GCM decryption path is independent of the secrets provider.
New credentials saved after the switch will be stored in the external provider,
and a `secrets://` URI reference will be written to the database column instead
of the encrypted blob.

Over time, as integrations are re-saved or credentials are rotated, the database
will transition from encrypted blobs to URI references. No bulk migration is
required.

### Moving from one external provider to another

If you switch from one external provider to another (e.g., Infisical to Vault),
ensure the same secret names and paths exist in the new provider. The
integrations service stores references like `secrets://int_abc123_api_key` in the
database. As long as the new provider can resolve those names, the transition is
transparent.

Steps:

1. Export secrets from the old provider (using `listSecrets` or the provider's
   native export tooling).
2. Import them into the new provider under the same names and paths.
3. Update `SECRETS_PROVIDER` in `.env`.
4. Restart services.

### Legacy URI prefix

The `infisical://` URI prefix is supported alongside the current `secrets://`
prefix for backwards compatibility. Database values written before the
abstraction layer was introduced used `infisical://` references. Both prefixes
resolve through the same `SecretsService.getSecret()` path -- the prefix is
stripped and the secret name is looked up in whichever provider is currently
configured.

---

## Architecture

The secrets management layer is structured as a set of composable pieces in
`services/shared/src/secrets/`. From bottom to top:

**SecretsProvider interface** (`secrets.interface.ts`). Defines the contract that
every provider must implement: `init`, `destroy`, `getSecret`, `listSecrets`,
`setSecret`, `deleteSecret`, `isEnabled`, `listManagedKeys`, and `rotateSecret`.
Also defines `SecretsProviderConfig` (a generic string-keyed bag) and
`SecretsProviderConstructor` (the constructor signature providers must expose).

**Provider Registry** (`secrets.registry.ts`). A `Map<string, Constructor>` that
maps provider type names (e.g., `"env"`, `"infisical"`) to their class
constructors. Providers self-register by calling `registerSecretsProvider()` at
module scope when their file is imported. `getRegisteredProviders()` returns all
known type names for error messages.

**Built-in Providers** (`providers/`). Each provider file implements
`SecretsProvider` and calls `registerSecretsProvider()` at the bottom. The barrel
file `providers/index.ts` imports all provider files to trigger registration.
Currently ships with `env` (process.env fallback, no external connection) and
`infisical` (Infisical SDK with Universal Auth).

**Factory** (`secrets.factory.ts`). `createSecretsProvider(type, config)` looks
up the constructor from the registry and instantiates it with the config bag.
`getSecretsConfigFromEnv()` reads `SECRETS_PROVIDER` from `process.env` (default:
`"env"`) and copies all environment variables into the config bag so each
provider can read only the keys it needs.

**SecretsService** (`secrets.service.ts`). The NestJS `@Injectable()` that
consuming services depend on. Wraps a provider instance with a TTL-based
in-memory cache (`Map<string, CacheEntry>`). Implements `OnModuleInit` (calls
`provider.init()`) and `OnModuleDestroy` (clears cache, calls
`provider.destroy()`). The cache key format is `{path}:{name}`. Cache TTL is
read from `SECRETS_CACHE_TTL` (seconds, default 300).

**SecretsModule** (`secrets.module.ts`). A `@Global()` NestJS dynamic module.
`SecretsModule.forRoot()` provides `SecretsService` as a singleton available to
all modules in the application without explicit imports. It registers both the
`SECRETS_PROVIDER` injection token and the `SecretsService` class so consumers
can inject via either.

**Integrations Service** (consumer, in `services/controls/`). The primary
consumer. When saving integration credentials with an active external provider,
it writes the secret value to the provider and stores a `secrets://` URI
reference in the database `Integration.config` column. When reading, it detects
the `secrets://` (or legacy `infisical://`) prefix, strips it, and calls
`secretsService.getSecret()` to retrieve the actual value. If the provider is
not enabled (`isEnabled() === false`), it falls back to local AES-256-GCM
encryption as before.
