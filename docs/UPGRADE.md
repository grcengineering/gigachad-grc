# Upgrade guide

This revision uses one shared Prisma schema and a controls-owned startup synchronization flow. It does not use independent migrations for each service.

## Current schema flow

Canonical schema:

```text
services/shared/prisma/schema.prisma
```

When the controls container starts, its entrypoint:

1. waits for PostgreSQL;
2. runs `prisma db push` against the shared schema;
3. applies the idempotent BC/DR SQL migration; and
4. starts the controls API.

Other services consume the same database. Do not run `prisma migrate deploy` from controls, frameworks, policies, TPRM, trust, and audit separately.

The numbered files under `database/init/` are not a sequential upgrade procedure. Current Compose files mount only the supporting first-boot scripts; controls owns application schema synchronization.

## Before every upgrade

1. Read the code diff, release notes, and environment template changes.
2. Compare the current and target `services/shared/prisma/schema.prisma`.
3. Back up PostgreSQL and object storage.
4. Restore that backup into an isolated staging environment.
5. Start the target controls image against staging and inspect the schema/result.
6. Run representative workflow and tenant-isolation tests.
7. Decide whether downtime is required.

`prisma db push` is not a versioned rollback mechanism. Never rely on a code checkout alone to reverse a database change.

## Local Docker upgrade

For disposable local development:

```bash
git pull --ff-only
./start.sh
./start.sh status
```

`start.sh` rebuilds the images and the controls entrypoint synchronizes the schema.

For a completely clean local install:

```bash
./start.sh reset
./start.sh
```

This deletes all local data and generates new credentials.

## Production-style upgrade

Use the same Compose files and override set that were reviewed for the existing deployment.

```bash
# 1. Create and verify a backup.
./deploy/backup.sh

# 2. Fetch the exact target revision or signed tag.
git fetch --tags
git checkout <target-revision>

# 3. Reconcile environment/template changes.
docker compose --env-file .env.prod config > /dev/null
npm run validate:production:strict

# 4. Build without changing the running deployment.
docker compose --env-file .env.prod build

# 5. Stop application services, leaving data services available.
docker compose --env-file .env.prod stop frontend audit trust tprm policies frameworks controls

# 6. Start controls alone and monitor schema synchronization.
docker compose --env-file .env.prod up -d controls
docker compose --env-file .env.prod logs -f controls

# 7. Start the remaining services after controls is healthy.
docker compose --env-file .env.prod up -d frameworks policies tprm trust audit frontend
docker compose --env-file .env.prod ps
```

If you use an override:

```bash
export COMPOSE_FILE=docker-compose.prod.yml:docker-compose.production.override.yml
```

Set it before every command.

## Post-upgrade checks

Verify:

- all containers are healthy;
- application and Keycloak TLS endpoints resolve;
- login works without Dev Login;
- controls, frameworks, evidence, risks, policies, vendors, trust, and audits load;
- file upload and download work;
- integrations still decrypt their credentials;
- representative non-admin authorization is enforced;
- scheduled collectors and notifications behave as configured; and
- logs contain no schema, encryption, or tenant-context errors.

Local direct health checks:

```bash
curl -fsS http://localhost:3001/health
curl -fsS http://localhost:3002/health
```

Production health checks should use the configured public or private routing endpoints, not assumed localhost ports.

## Rollback

If the target code fails before changing the schema, redeploy the prior images/revision.

If controls synchronized the schema, a code rollback may be unsafe. Use the tested database and object-storage restore:

```bash
docker compose --env-file .env.prod down
git checkout <previous-revision>
./deploy/restore.sh /path/to/pre-upgrade-backup.tar.gz
docker compose --env-file .env.prod up -d --build
```

Verify the restored deployment before reopening traffic.

## Development dependencies

For source development after pulling:

```bash
npm ci
npm run db:generate
npm run build --workspaces --if-present
```

Use the controls workspace to intentionally synchronize a development database:

```bash
npm --workspace @gigachad-grc/controls run prisma:push
```

Do not use that command as an unattended production migration.
