# Deployment guide

This document describes the deployment artifacts that exist on this revision and their current support level.

## Deployment status

| Target                    | Repository configuration                            | Status                                                                            |
| ------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Local Docker Compose      | `docker-compose.yml`, `start.sh`                    | Canonical development/evaluation flow                                             |
| Production Docker Compose | `docker-compose.prod.yml`, `env.example.production` | Configuration-required reference; do not deploy unreviewed                        |
| Kubernetes                | `helm/`                                             | Chart present; image registry, secrets, ingress, storage, and validation required |
| Supabase + Vercel         | No deployable adapter or Vercel configuration       | Unsupported                                                                       |
| Gitpod                    | No `.gitpod.yml`                                    | Unsupported                                                                       |
| GitHub Codespaces         | No `.devcontainer/` configuration                   | Unsupported                                                                       |

There is no hosted service or one-click cloud deployment in this repository.

## Local Docker Compose

Use:

```bash
./start.sh
```

The local Compose stack is intentionally a development deployment. It enables development authentication and exposes direct service ports only on loopback.

Application URL:

```text
https://localhost
```

See [Getting started](../GETTING_STARTED.md).

## Production Docker Compose

`docker-compose.prod.yml` is a hardened deployment reference, not a complete production platform guarantee. It assumes:

- public DNS for the application, authentication, and storage hosts;
- ports 80 and 443 reachable for ACME;
- an operator-managed `.env.prod`;
- locally built images or a controlled image publication process;
- backups and restore tests;
- external monitoring and alerting; and
- independent security and capacity review.

On this base revision, the production Compose file does not forward every variable consumed by every application path. In particular, operators must verify that controls receives required encryption and module secrets. Use an operator-owned Compose override where necessary; do not assume a value in `.env.prod` is automatically available inside a container.

Example override:

```yaml
services:
  controls:
    environment:
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?ENCRYPTION_KEY is required}
      SESSION_SECRET: ${SESSION_SECRET:?SESSION_SECRET is required}
      PHISHING_TRACKING_SECRET: ${PHISHING_TRACKING_SECRET:?PHISHING_TRACKING_SECRET is required}
```

Validate the rendered configuration before building:

```bash
cp env.example.production .env.prod
# Fill every required value and add PHISHING_TRACKING_SECRET.

docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  config

npm run validate:production:strict
```

The production validator is a configuration aid, not a certification that the deployment is safe or available.

Start only after resolving all validation findings:

```bash
docker compose \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d --build
```

See [Production deployment](PRODUCTION_DEPLOYMENT.md) for prerequisites and known limitations.

## Domains and routing

The production Compose file expects:

- `${APP_DOMAIN}` for the application;
- `${KEYCLOAK_HOSTNAME}` for Keycloak;
- `storage.${APP_DOMAIN}` for the S3 API; and
- `console.storage.${APP_DOMAIN}` for the RustFS console.

Traefik requests Let's Encrypt certificates using `${ACME_EMAIL}`. DNS must resolve before startup.

The frontend uses same-origin API routes. Do not deploy it independently as static files unless you also provide equivalent API routing, authentication, and all six backend services.

## Database ownership

All application services use one schema file:

```text
services/shared/prisma/schema.prisma
```

Current container startup behavior:

1. PostgreSQL first-boot scripts create supporting databases, extensions, and schemas.
2. The controls entrypoint runs `deploy/prisma-migrate-safe.sh` to establish the baseline and apply
   committed forward-only migrations.
3. The controls entrypoint applies the idempotent BC/DR migration.
4. All services use the resulting shared database.

Only the controls container should own migrations. Do not run `prisma migrate deploy` from every
service and do not apply every numbered `database/init` SQL file in sequence. Back up and rehearse
upgrades using [Database hardening rollout](DATABASE_HARDENING_ROLLOUT.md).

## External infrastructure

The Compose services are written for the included PostgreSQL, Redis, Keycloak, and RustFS hostnames. Replacing them with managed services requires a reviewed override that updates connection URLs, TLS behavior, health dependencies, credentials, and network policy.

Supabase is not a drop-in replacement for the full stack: this repository has no Supabase storage adapter, RLS policy set, serverless API layer, or Vercel routing configuration.

## Kubernetes

The Helm chart exists under `helm/`, but installation requires:

- application images in an accessible registry;
- a reviewed `values.yaml`;
- Kubernetes secrets or an external secrets operator;
- ingress and TLS;
- persistent volumes or external data services;
- network policies appropriate to the cluster; and
- chart rendering and upgrade tests.

Render before installing:

```bash
helm lint ./helm
helm template gigachad-grc ./helm -f my-values.yaml > rendered.yaml
```

Do not use chart defaults as production credentials.

## Provider-dependent features

Deployment alone does not enable:

- OpenAI or Anthropic;
- SMTP delivery;
- third-party connector APIs;
- remote backup storage;
- Sentry or another external APM service;
- MCP servers; or
- custom integration code execution.

Each requires separate credentials, least-privilege scopes, outbound network access, and operational monitoring.

## Backups

The production Compose file includes a backup scheduler. Its network-level PostgreSQL, Redis, and S3 operations require valid credentials and durable `grc_backups` storage.

For disaster recovery:

1. configure off-host backup storage;
2. run `deploy/backup.sh`;
3. restore into an isolated environment with `deploy/restore.sh`;
4. verify database, object storage, login, and representative records; and
5. record recovery time and recovery point results.

A successful backup command is not proof of recoverability.

## Upgrade and rollback

Follow [Upgrade guide](UPGRADE.md). Back up before rebuilding the controls container because its entrypoint synchronizes the shared schema during startup.
