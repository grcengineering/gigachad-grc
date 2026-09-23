# Environment configuration

Use `.env.example` for local development and `env.example.production` as a production starting point.

`./start.sh` generates a local `.env` when one does not exist. It never overwrites an existing file.

## Secret generation

```bash
openssl rand -hex 32       # 64-character ENCRYPTION_KEY
openssl rand -base64 64    # JWT_SECRET / SESSION_SECRET
openssl rand -base64 32    # service passwords and signing secrets
```

Never commit `.env` or `.env.prod`.

## Required local Compose values

The local Compose file requires:

```env
POSTGRES_USER=grc
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=gigachad_grc

REDIS_PASSWORD=<generated>

MINIO_ROOT_USER=rustfsadmin
MINIO_ROOT_PASSWORD=<generated>

KEYCLOAK_ADMIN=<operator-name>
KEYCLOAK_ADMIN_PASSWORD=<generated>
KEYCLOAK_REALM=gigachad-grc

GRAFANA_ADMIN_USER=<operator-name>
GRAFANA_ADMIN_PASSWORD=<generated>

ENCRYPTION_KEY=<64-hex-characters>
JWT_SECRET=<generated>
SESSION_SECRET=<generated>
PHISHING_TRACKING_SECRET=<generated>
```

The Compose file derives internal database, Redis, and storage URLs from these values. Host-side `DATABASE_URL` and `REDIS_URL` are useful for local tools but do not override the service URLs declared in Compose.

## Authentication

Local Compose intentionally uses:

```env
NODE_ENV=development
VITE_ENABLE_DEV_AUTH=true
```

The backend development guard is selected by `NODE_ENV`, not by `USE_DEV_AUTH`. The frontend flag controls the Dev Login UI and is baked into the frontend build.

Production must use:

```env
NODE_ENV=production
USE_DEV_AUTH=false
VITE_ENABLE_DEV_AUTH=false
```

The backend rejects the development guard in production.

## Frontend API routing

For the containerized frontend:

```env
VITE_API_URL=
```

A blank value uses same-origin requests through Traefik. The application URL is `https://localhost` in local Compose.

Do not set `VITE_API_URL=http://localhost:3001` for a production browser build. `localhost` would refer to each user's workstation, and it bypasses gateway routing.

## Frontend stubs

```env
VITE_ENABLE_DEV_STUBS=false
```

Enable stubs only for isolated frontend work. They can hide backend failures and must remain disabled in integrated and production testing.

## Database schema

All services share:

```text
services/shared/prisma/schema.prisma
```

The controls container entrypoint runs `prisma db push` and then the BC/DR SQL migration. There are no separate per-service schemas or migration commands in the current Docker flow.

## Storage

Local Compose uses RustFS:

```env
MINIO_ROOT_USER=<generated>
MINIO_ROOT_PASSWORD=<generated>
S3_BUCKET=grc-storage
S3_REGION=us-east-1
```

Internal service endpoint, port, and TLS values are set in Compose. External S3 requires a reviewed override with endpoint, TLS, credentials, bucket, region, and health/dependency changes.

## Credential encryption and secrets provider

```env
ENCRYPTION_KEY=<64-hex-characters>
SECRETS_PROVIDER=env
```

`SECRETS_PROVIDER=env` uses encrypted local credential storage. Infisical is optional:

```env
SECRETS_PROVIDER=infisical
INFISICAL_SITE_URL=http://localhost:8443
INFISICAL_CLIENT_ID=<secret>
INFISICAL_CLIENT_SECRET=<secret>
INFISICAL_PROJECT_ID=<id>
INFISICAL_ENVIRONMENT=dev
```

Start the optional local service with:

```bash
docker compose --profile infisical up -d
```

Back up and rotate `ENCRYPTION_KEY` carefully. Losing it can make stored integration credentials unrecoverable.

## AI providers

Real AI output requires:

```env
OPENAI_API_KEY=<secret>
# or
ANTHROPIC_API_KEY=<secret>
```

Explicit non-production mock mode:

```env
AI_MOCK_MODE=true
```

The main controls and framework-mapping AI paths do not silently switch to sample output when no provider is configured. Other module-specific AI paths may differ and must expose/check `isMockMode` where supported.

Production ignores or rejects the explicit mock path.

## External integrations

Integration credentials are entered per integration and encrypted. They are not enabled by setting generic environment variables alone.

Every connector requires some combination of:

- API token, service-account key, or OAuth client credentials;
- tenant/account/project/region values;
- least-privilege provider scopes;
- enabled upstream APIs; and
- outbound HTTPS.

Missing credentials do not enable connector demo data.

The AWS generic integration is known unavailable on this base revision. See [Integration implementation status](INTEGRATION_IMPLEMENTATION_STATUS.md).

## Evidence collectors

Optional tuning:

```env
COLLECTOR_REQUEST_TIMEOUT_MS=30000
COLLECTOR_MAX_RETRIES=2
COLLECTOR_MAX_RESPONSE_SIZE_BYTES=10485760
```

Collectors call operator-configured HTTP endpoints and do not generate sample evidence on failure.

## Email and notifications

Real email delivery requires a configured provider, for example:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASSWORD=<secret>
SMTP_FROM=GigaChad GRC <notifications@example.com>
```

Console/log output is not email delivery. Test the actual provider before enabling scheduled notifications.

## Custom integration execution

```env
ENABLE_CUSTOM_CODE_EXECUTION=false
```

Keep this false in production unless arbitrary code execution has been explicitly accepted and isolated.

## Monitoring

Local Grafana credentials:

```env
GRAFANA_ADMIN_USER=<generated-or-chosen>
GRAFANA_ADMIN_PASSWORD=<generated>
```

The production Compose file does not include the local Prometheus/Grafana services. Configure external monitoring separately.

## Backups

```env
BACKUP_RETENTION_DAYS=90
DR_REMOTE_BACKUP_ENABLED=true
DR_REMOTE_BACKUP_S3_BUCKET=<bucket>
DR_REMOTE_BACKUP_REGION=<region>
AWS_ACCESS_KEY_ID=<secret>
AWS_SECRET_ACCESS_KEY=<secret>
```

Test an isolated restore. A configured bucket is not proof that backups are recoverable.

## Production Compose caveat

Compose injects only variables explicitly listed in each service's `environment` section. `env.example.production` can contain values that are not forwarded automatically.

On this base, use a reviewed override to pass required controls values including:

```env
ENCRYPTION_KEY
SESSION_SECRET
PHISHING_TRACKING_SECRET
```

See [Production deployment](PRODUCTION_DEPLOYMENT.md).

## Validate

```bash
docker compose config
npm run validate:docs
```

Production:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod config
npm run validate:production:strict
```
