# Production deployment

The repository contains a production-oriented Compose file, but this revision is not a turnkey or certified production distribution. Treat `docker-compose.prod.yml` as a reference that must be reviewed, completed, and tested for your environment.

## Known limitations on this revision

- Application images are built locally; no supported release image registry is declared.
- Not every setting in `env.example.production` is forwarded by `docker-compose.prod.yml`. Required application secrets must be checked in the rendered container environment.
- Prometheus, Grafana, and centralized logging are not provided by the production Compose file.
- High availability, database replication, object-storage replication, autoscaling, and zero-downtime migration are not supplied.
- The Helm chart is present but requires separate rendering, security, storage, and upgrade validation.
- Supabase/Vercel is not an implemented production target.

Do not put regulated or business-critical data into an unreviewed deployment.

## Prerequisites

At minimum:

- Linux host or cluster sized for the workload;
- Docker Engine 24+ and Compose v2.20+;
- Git and OpenSSL;
- public DNS;
- inbound TCP 80 and 443 for Traefik and ACME;
- off-host backup storage;
- an external monitoring/alerting system; and
- a secrets-management and rotation process.

Expected DNS names:

```text
APP_DOMAIN
KEYCLOAK_HOSTNAME
storage.APP_DOMAIN
console.storage.APP_DOMAIN
```

## Configure secrets

```bash
cp env.example.production .env.prod
chmod 600 .env.prod
```

Generate unique values:

```bash
openssl rand -hex 32       # ENCRYPTION_KEY
openssl rand -base64 64    # JWT_SECRET
openssl rand -base64 64    # SESSION_SECRET
openssl rand -base64 32    # POSTGRES_PASSWORD
openssl rand -base64 32    # REDIS_PASSWORD
openssl rand -base64 32    # KEYCLOAK_ADMIN_PASSWORD
openssl rand -base64 32    # MINIO_ROOT_PASSWORD
openssl rand -base64 32    # PHISHING_TRACKING_SECRET
```

Set at least:

```env
NODE_ENV=production
APP_DOMAIN=grc.example.com
ACME_EMAIL=security@example.com
KEYCLOAK_HOSTNAME=auth.grc.example.com

POSTGRES_USER=grc_prod_user
POSTGRES_PASSWORD=<generated>
POSTGRES_DB=gigachad_grc_prod
REDIS_PASSWORD=<generated>

MINIO_ROOT_USER=<generated-operator-name>
MINIO_ROOT_PASSWORD=<generated>

KEYCLOAK_ADMIN=<generated-operator-name>
KEYCLOAK_ADMIN_PASSWORD=<generated>
KEYCLOAK_REALM=gigachad-grc

ENCRYPTION_KEY=<64-hex-characters>
JWT_SECRET=<generated>
SESSION_SECRET=<generated>
PHISHING_TRACKING_SECRET=<generated>

USE_DEV_AUTH=false
VITE_ENABLE_DEV_AUTH=false
```

Do not use local development credentials or enable development authentication in production.

## Complete the Compose environment

Compose only injects variables listed under each service's `environment`. A value in `.env.prod` is not automatically present inside the container.

On this revision, add an operator-owned override for controls secrets:

```yaml
# docker-compose.production.override.yml
services:
  controls:
    environment:
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?ENCRYPTION_KEY is required}
      SESSION_SECRET: ${SESSION_SECRET:?SESSION_SECRET is required}
      PHISHING_TRACKING_SECRET: ${PHISHING_TRACKING_SECRET:?PHISHING_TRACKING_SECRET is required}
```

Use the override in every production command:

```bash
export COMPOSE_FILE=docker-compose.prod.yml:docker-compose.production.override.yml
```

Review other module-specific variables against [Environment configuration](ENV_CONFIGURATION.md) before enabling those modules.

## Validate before startup

```bash
docker compose --env-file .env.prod config > /dev/null
npm run validate:production:strict
```

Also verify:

- no rendered secret is empty;
- frontend build arguments keep Dev Login disabled;
- backend containers run with `NODE_ENV=production`;
- Keycloak redirect URIs and web origins exactly match the application domain;
- only Traefik is publicly reachable;
- database, Redis, RustFS, and service ports remain on private networks;
- backup credentials can write to off-host storage; and
- restore dependencies are installed on the operator host.

## Database synchronization

All services use:

```text
services/shared/prisma/schema.prisma
```

The controls container entrypoint performs:

```text
deploy/prisma-migrate-safe.sh
prisma db execute --file=/app/database/migrations/12-bcdr-module.sql
```

The safe wrapper records the committed baseline for legacy `db push` installations, then runs
`prisma migrate deploy`. Do not run migrations from each service or manually execute every file in
`database/init/`.

1. take and verify a backup;
2. run `scripts/rollout-database-hardening.sh audit` against a restored production copy;
3. backfill tenant mismatches and validate staged constraints;
4. run the target controls entrypoint and representative workflows; and
5. switch to the least-privilege application role only after request paths establish tenant context.

See [Database hardening rollout](DATABASE_HARDENING_ROLLOUT.md).

## Build and start

```bash
docker compose --env-file .env.prod build
docker compose --env-file .env.prod up -d postgres redis rustfs keycloak
docker compose --env-file .env.prod up -d controls
docker compose --env-file .env.prod logs -f controls
docker compose --env-file .env.prod up -d frameworks policies tprm trust audit frontend
docker compose --env-file .env.prod ps
```

The first controls startup owns schema synchronization. Do not scale controls during that step.

## Verify

Use the public application and auth domains:

```bash
curl -fsS https://grc.example.com/api/system/health
curl -fsS https://auth.grc.example.com/auth/realms/gigachad-grc/.well-known/openid-configuration
```

Then verify:

- production login through Keycloak;
- tenant isolation with two test organizations;
- controls, evidence upload/download, risks, policies, vendors, trust, and audits;
- object storage persistence;
- API authorization for non-admin roles;
- backup completion and isolated restore;
- certificate renewal path; and
- alert delivery from the external monitoring system.

There is no shared production admin password. Use generated values in the protected operator environment file or secrets manager.

## External providers

The following are unavailable until configured:

| Capability     | Required configuration                                 |
| -------------- | ------------------------------------------------------ |
| Real AI output | OpenAI or Anthropic credentials and outbound HTTPS     |
| Email delivery | SMTP/provider credentials                              |
| Integrations   | Provider credentials, scopes, enabled APIs, and egress |
| Remote backup  | S3-compatible bucket and credentials                   |
| Error tracking | External APM/DSN                                       |
| MCP tools      | Separately deployed MCP packages and credentials       |

Do not enable `AI_MOCK_MODE` in production; the main AI service ignores it there. Do not use connector catalog presence as evidence that a connector is production-ready.

## Backups and restore

Create a backup:

```bash
./deploy/backup.sh
```

Restore into an isolated test environment:

```bash
./deploy/restore.sh /path/to/backup.tar.gz
```

The backup path covers PostgreSQL, Redis, RustFS, and selected configuration through network-level tools. Validate its output and restore behavior in your exact deployment. Configure off-host retention; a local Docker volume is not disaster recovery.

## Upgrade

Follow [Upgrade guide](UPGRADE.md). An upgrade begins with a tested backup and staging rehearsal, not `git pull` on the live host.

## Production readiness checklist

- [ ] Deployment limitations above accepted or remediated
- [ ] All secrets generated, stored, and rotated
- [ ] Controls secret override applied
- [ ] Rendered Compose configuration reviewed
- [ ] Development authentication disabled
- [ ] DNS, ACME, and Keycloak redirect URIs verified
- [ ] Private service networks and firewall verified
- [ ] Database schema change rehearsed on restored data
- [ ] Off-host backup and restore tested
- [ ] Monitoring and alerting active
- [ ] Provider-backed features tested with least-privilege credentials
- [ ] Capacity, load, vulnerability, and penetration testing completed
- [ ] Rollback decision and recovery procedure documented
