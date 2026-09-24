# @gigachad-grc/shared

Shared library used by all GigaChad GRC microservices. Provides the unified Prisma schema, authentication, storage abstraction, event bus, utilities, and common types.

## Installation

All services reference this package via workspace dependencies:

```json
{
  "dependencies": {
    "@gigachad-grc/shared": "file:../shared"
  }
}
```

Build the shared library before building any service:

```bash
cd services/shared
npm run build
```

## Modules

### auth

Authentication and authorization for all services.

| Export                                                 | Purpose                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `JwtAuthGuard`, `ApiKeyAuthGuard`, `CombinedAuthGuard` | NestJS guards for JWT tokens and API keys                                       |
| `DevAuthGuard`                                         | Development-mode auth bypass (uses `x-user-id` and `x-organization-id` headers) |
| `RolesGuard`, `PermissionsGuard`                       | RBAC enforcement guards                                                         |
| `@Roles()`, `@RequirePermissions()`                    | Decorators for controller-level access control                                  |
| `@CurrentUser()`, `@OrganizationId()`                  | Parameter decorators to extract user context from requests                      |
| `KeycloakAdminService`                                 | Keycloak admin API client for user provisioning                                 |
| `TokenBlacklistService`                                | Token revocation for logout                                                     |
| `DEV_USER`, `ensureDevUserExists`                      | Dev mode user constants and database seeding                                    |

### cache

In-memory caching with TTL support.

| Export         | Purpose                                         |
| -------------- | ----------------------------------------------- |
| `CacheModule`  | NestJS module (import into your service module) |
| `CacheService` | Injectable service for get/set/delete/clear     |
| `@Cacheable()` | Method decorator for automatic cache-through    |
| `CacheKeys`    | Enum of standard cache key prefixes             |

### storage

Abstracted file storage with pluggable backends.

| Export                    | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `StorageModule`           | NestJS module (import into your service module)             |
| `STORAGE_PROVIDER`        | Injection token for the active storage provider             |
| `StorageProvider`         | Interface: `upload()`, `download()`, `delete()`, `getUrl()` |
| `LocalStorageProvider`    | Local filesystem backend                                    |
| `S3StorageProvider`       | S3/RustFS/MinIO backend                                     |
| `AzureBlobStorage`        | Azure Blob Storage backend                                  |
| `createStorageProvider()` | Factory that reads `STORAGE_TYPE` from env                  |

### events

Cross-service event bus.

| Export          | Purpose                         |
| --------------- | ------------------------------- |
| `EventsModule`  | NestJS module                   |
| `EventBus`      | Interface for publish/subscribe |
| `RedisEventBus` | Redis-backed implementation     |

### secrets

External secrets management for integration credentials.

| Export            | Purpose                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| `SecretsModule`   | NestJS module                                                                  |
| `SecretsService`  | Injectable service for get/set/delete secrets                                  |
| `SecretsProvider` | Interface for custom providers                                                 |
| Providers         | `env` (AES-256-GCM encrypted in DB), `infisical` (Infisical cloud/self-hosted) |

### security

Request-level security utilities.

| Export                                    | Purpose                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `safeFetch()`                             | SSRF-protected HTTP fetch (blocks private IPs)       |
| `RateLimiterGuard`                        | Per-endpoint rate limiting                           |
| `validatePropertyName()`, `safeOrderBy()` | Prevent injection via user-controlled property names |
| `deepSanitizeObjectKeys()`                | Sanitize all keys in nested objects                  |

### resilience

Fault tolerance for external service calls.

| Export                        | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `CircuitBreaker`              | Circuit breaker pattern implementation |
| `withRetry()`, `@Retryable()` | Retry with exponential backoff         |
| `RetryPolicies`               | Pre-configured retry policies          |

### utils

General-purpose utilities used across all services.

| Category           | Exports                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Crypto**         | `encrypt`, `decrypt`, `hashPassword`, `verifyPassword`, `generateApiKey`, `generateToken` |
| **Validation**     | `isValidEmail`, `isValidUrl`, `isValidUuid`, `sanitizeString`, `sanitizeObject`           |
| **Pagination**     | `createPaginatedResponse`, `parsePaginationParams`, `getPrismaSkipTake`                   |
| **Sanitization**   | `sanitizeFilename`, `escapeHtml`, `sanitizeInput`                                         |
| **Error handling** | `handleError`, `withErrorHandling`, `safeAsync`, `retryAsync`, `CatchErrors`              |
| **Helpers**        | `generateId`, `sleep`, `retry`, `chunk`, `unique`, `groupBy`, `pick`, `omit`, `slugify`   |

### types

Shared TypeScript interfaces and DTOs.

| Export                     | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `UserContext`              | Authenticated user context attached to requests                        |
| `PaginatedResponse<T>`     | Standard paginated API response shape                                  |
| `OrganizationScopedEntity` | Base interface for all org-scoped entities                             |
| `AuditableEntity`          | Base interface with `createdAt`, `updatedAt`, `createdBy`, `updatedBy` |
| `IntegrationCredentials`   | Typed credentials for each integration type                            |
| `ConnectorConfig`          | Configuration shape for integration connectors                         |
| Domain types               | `Dashboard`, `WidgetConfig`, workflow types, Prisma helpers            |

### Other Modules

| Module         | Purpose                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| **logger**     | Structured logging with `getLogger()`, audit log helpers (`logAudit`), PII masking (`maskEmail`, `safeUserId`) |
| **health**     | Health check module with `PrismaHealthIndicator` and `RedisHealthIndicator`                                    |
| **filters**    | `GlobalExceptionFilter` that sanitizes error responses in production                                           |
| **reports**    | PDF report generation (`PDFReportGenerator`) for compliance, risk, and framework reports                       |
| **search**     | Generic search module that queries across Prisma models                                                        |
| **watermark**  | PDF watermarking for secure document sharing                                                                   |
| **decorators** | DTO sanitization decorators (`@SanitizeHtml`, `@SanitizeFileName`)                                             |
| **middleware** | Express rate limiting middleware                                                                               |
| **guards**     | Auth-specific rate limiting                                                                                    |
| **session**    | Redis-backed session store                                                                                     |
| **services**   | Service registry with circuit breaker state                                                                    |

## Prisma Schema

The unified database schema is at `services/shared/prisma/schema.prisma` from
the repository root. All services share this schema.

```bash
# Generate service clients after schema changes
npm run db:generate

# Synchronize a disposable development database
npm --workspace @gigachad-grc/controls run prisma:push
```

In Docker, the controls entrypoint owns schema synchronization with `prisma db
push` and then applies the BC/DR SQL migration. Do not run independent
migrations from every service. The current repository does not yet provide a
complete versioned migration chain for unattended production upgrades.

For schema documentation, see [Database Schema Reference](../../docs/DATABASE_SCHEMA.md).

## Adding a New Service

When creating a new microservice that uses the shared library:

1. Add the dependency: `"@gigachad-grc/shared": "file:../shared"`
2. Import modules in your NestJS app module:

```typescript
import { CacheModule, StorageModule, SecretsModule } from '@gigachad-grc/shared';

@Module({
  imports: [CacheModule, StorageModule, SecretsModule],
})
export class AppModule {}
```

3. Use guards and decorators in controllers:

```typescript
import {
  JwtAuthGuard,
  RequirePermissions,
  CurrentUser,
  OrganizationId,
} from '@gigachad-grc/shared';

@Controller('example')
@UseGuards(JwtAuthGuard)
export class ExampleController {
  @Get()
  @RequirePermissions('example:read')
  findAll(@OrganizationId() orgId: string, @CurrentUser() user: UserContext) {
    // orgId and user are extracted from the authenticated request
  }
}
```

4. Build shared before your service: `cd services/shared && npm run build`
