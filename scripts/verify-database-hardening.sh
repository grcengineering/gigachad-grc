#!/bin/sh
# Integration verification for the committed database migration path.
# Covers fresh install, db-push-managed upgrade, legacy tenant backfill,
# constraint validation, Org A/B isolation, and missing tenant context.

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PRISMA="$ROOT_DIR/node_modules/.bin/prisma"
SCHEMA="$ROOT_DIR/services/shared/prisma/schema.prisma"
FRESH_CONTAINER="gigachad-db-hardening-fresh-$$"
UPGRADE_CONTAINER="gigachad-db-hardening-upgrade-$$"
DATABASE_NAME="hardening_test"
DATABASE_PASSWORD="hardening-test-password"

cleanup() {
  docker rm -f "$FRESH_CONTAINER" "$UPGRADE_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if [ ! -x "$PRISMA" ]; then
  echo "Install repository dependencies before running this verification" >&2
  exit 1
fi

start_postgres() {
  container_name=$1

  docker run --detach --rm \
    --name "$container_name" \
    --env POSTGRES_PASSWORD="$DATABASE_PASSWORD" \
    --env POSTGRES_DB="$DATABASE_NAME" \
    --publish 127.0.0.1::5432 \
    --health-cmd="pg_isready -U postgres -d $DATABASE_NAME" \
    --health-interval=1s \
    --health-timeout=3s \
    --health-retries=30 \
    postgres:16-alpine >/dev/null

  attempt=0
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$container_name")" = "healthy" ]; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 30 ]; then
      docker logs "$container_name"
      exit 1
    fi
    sleep 1
  done
}

database_url() {
  container_name=$1
  port=$(docker port "$container_name" 5432/tcp | awk -F: 'NR == 1 { print $NF }')
  printf 'postgresql://postgres:%s@127.0.0.1:%s/%s' \
    "$DATABASE_PASSWORD" "$port" "$DATABASE_NAME"
}

psql_in() {
  container_name=$1
  shift
  docker exec -i "$container_name" \
    psql --set=ON_ERROR_STOP=1 --username=postgres --dbname="$DATABASE_NAME" "$@"
}

echo "Generating Prisma client..."
"$PRISMA" generate --schema="$SCHEMA" >/dev/null

# ---------------------------------------------------------------------------
# Fresh database
# ---------------------------------------------------------------------------

echo "Testing fresh database deployment..."
start_postgres "$FRESH_CONTAINER"
FRESH_URL=$(database_url "$FRESH_CONTAINER")
DATABASE_URL="$FRESH_URL" MIGRATION_DATABASE_URL="$FRESH_URL" \
  "$ROOT_DIR/deploy/prisma-migrate-safe.sh"

psql_in "$FRESH_CONTAINER" <<'SQL'
INSERT INTO organizations (id, name, slug, status, settings, multi_workspace_enabled, created_at, updated_at)
VALUES
  ('org-a', 'Organization A', 'org-a', 'active', '{}', false, now(), now()),
  ('org-b', 'Organization B', 'org-b', 'active', '{}', false, now(), now());

INSERT INTO users (
  id, keycloak_id, email, first_name, last_name, display_name,
  organization_id, role, status, preferences, created_at, updated_at
)
VALUES
  ('user-a', 'kc-a', 'a@example.test', 'A', 'User', 'A User',
   'org-a', 'admin', 'active', '{}', now(), now()),
  ('user-b', 'kc-b', 'b@example.test', 'B', 'User', 'B User',
   'org-b', 'admin', 'active', '{}', now(), now());

DO $$
DECLARE
  app_role record;
BEGIN
  SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
  INTO app_role
  FROM pg_roles
  WHERE rolname = 'gigachad_app';

  IF NOT FOUND
     OR app_role.rolcanlogin
     OR app_role.rolsuper
     OR app_role.rolcreatedb
     OR app_role.rolcreaterole
     OR app_role.rolbypassrls THEN
    RAISE EXCEPTION 'gigachad_app is not a least-privilege group role';
  END IF;
END
$$;

-- NOT VALID protects legacy upgrades but still rejects new cross-tenant rows.
INSERT INTO audits (
  id, organization_id, audit_id, audit_type, name, status, tags,
  created_by, created_at, updated_at, checklist_progress,
  checklist_completed_count, checklist_total_count
)
VALUES (
  'audit-a', 'org-a', 'AUD-A', 'internal', 'A audit', 'planning', '{}',
  'user-a', now(), now(), '{}', 0, 0
);

DO $$
BEGIN
  BEGIN
    INSERT INTO audit_requests (
      id, audit_id, organization_id, request_number, category, title,
      description, status, priority, tags, created_by, created_at, updated_at
    )
    VALUES (
      'cross-tenant-request', 'audit-a', 'org-b', 'REQ-X', 'evidence',
      'Must fail', 'Cross-tenant child', 'open', 'medium', '{}',
      'user-b', now(), now()
    );
    RAISE EXCEPTION 'cross-tenant composite foreign key did not reject insert';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$$;

-- Org A sees only Org A.
BEGIN;
SET LOCAL ROLE gigachad_app;
SELECT app_security.set_local_organization_id('org-a');
DO $$
DECLARE
  visible_users bigint;
BEGIN
  SELECT count(*) INTO visible_users FROM users;
  IF visible_users <> 1 THEN
    RAISE EXCEPTION 'Org A saw % users, expected 1', visible_users;
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE organization_id = 'org-b') THEN
    RAISE EXCEPTION 'Org A could read Org B';
  END IF;

  BEGIN
    INSERT INTO users (
      id, keycloak_id, email, first_name, last_name, display_name,
      organization_id, role, status, preferences, created_at, updated_at
    )
    VALUES (
      'cross-tenant-user', 'kc-cross', 'cross@example.test', 'Cross', 'Tenant',
      'Cross Tenant', 'org-b', 'viewer', 'active', '{}', now(), now()
    );
    RAISE EXCEPTION 'Org A inserted an Org B row';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
ROLLBACK;

-- Org B independently sees only Org B.
BEGIN;
SET LOCAL ROLE gigachad_app;
SELECT app_security.set_local_organization_id('org-b');
DO $$
DECLARE
  visible_users bigint;
BEGIN
  SELECT count(*) INTO visible_users FROM users;
  IF visible_users <> 1 THEN
    RAISE EXCEPTION 'Org B saw % users, expected 1', visible_users;
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE organization_id = 'org-a') THEN
    RAISE EXCEPTION 'Org B could read Org A';
  END IF;
END
$$;
ROLLBACK;

-- Missing context fails closed for both reads and writes.
BEGIN;
SET LOCAL ROLE gigachad_app;
DO $$
DECLARE
  visible_users bigint;
BEGIN
  SELECT count(*) INTO visible_users FROM users;
  IF visible_users <> 0 THEN
    RAISE EXCEPTION 'missing tenant context exposed % users', visible_users;
  END IF;

  BEGIN
    INSERT INTO users (
      id, keycloak_id, email, first_name, last_name, display_name,
      organization_id, role, status, preferences, created_at, updated_at
    )
    VALUES (
      'missing-context-user', 'kc-none', 'none@example.test', 'No', 'Context',
      'No Context', 'org-a', 'viewer', 'active', '{}', now(), now()
    );
    RAISE EXCEPTION 'missing tenant context allowed a write';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$$;
ROLLBACK;
SQL

MIGRATION_DATABASE_URL="$FRESH_URL" \
  PSQL_CONTAINER="$FRESH_CONTAINER" PSQL_DATABASE="$DATABASE_NAME" \
  "$ROOT_DIR/scripts/rollout-database-hardening.sh" validate

# ---------------------------------------------------------------------------
# Upgrade from the former db-push-managed schema
# ---------------------------------------------------------------------------

echo "Testing legacy upgrade and tenant backfill..."
start_postgres "$UPGRADE_CONTAINER"
UPGRADE_URL=$(database_url "$UPGRADE_CONTAINER")

DATABASE_URL="$UPGRADE_URL" "$PRISMA" db push \
  --schema="$SCHEMA" \
  --skip-generate >/dev/null

# Seed a mismatch that the former single-column foreign key accepted.
psql_in "$UPGRADE_CONTAINER" <<'SQL'
INSERT INTO organizations (id, name, slug, status, settings, multi_workspace_enabled, created_at, updated_at)
VALUES
  ('org-a', 'Organization A', 'org-a', 'active', '{}', false, now(), now()),
  ('org-b', 'Organization B', 'org-b', 'active', '{}', false, now(), now());

INSERT INTO users (
  id, keycloak_id, email, first_name, last_name, display_name,
  organization_id, role, status, preferences, created_at, updated_at
)
VALUES (
  'user-a', 'kc-a', 'a@example.test', 'A', 'User', 'A User',
  'org-a', 'admin', 'active', '{}', now(), now()
);

INSERT INTO vendors (
  id, organization_id, vendor_id, name, category, tier, status,
  criticality, compliance_status, review_frequency, tags, created_by,
  created_at, updated_at
)
VALUES (
  'vendor-a', 'org-a', 'VND-A', 'Vendor A', 'software_vendor', 'tier_3',
  'active', 'medium', 'pending_review', 'annual', '{}', 'user-a',
  now(), now()
);

INSERT INTO vendor_assessments (
  id, vendor_id, organization_id, assessment_type, status, conditions,
  created_by, created_at, updated_at
)
VALUES (
  'assessment-mismatch', 'vendor-a', 'org-b', 'annual_review', 'pending',
  '{}', 'user-a', now(), now()
);
SQL

DATABASE_URL="$UPGRADE_URL" MIGRATION_DATABASE_URL="$UPGRADE_URL" \
  "$ROOT_DIR/deploy/prisma-migrate-safe.sh"

MIGRATION_DATABASE_URL="$UPGRADE_URL" \
  PSQL_CONTAINER="$UPGRADE_CONTAINER" PSQL_DATABASE="$DATABASE_NAME" \
  "$ROOT_DIR/scripts/rollout-database-hardening.sh" audit
MIGRATION_DATABASE_URL="$UPGRADE_URL" \
  PSQL_CONTAINER="$UPGRADE_CONTAINER" PSQL_DATABASE="$DATABASE_NAME" \
  "$ROOT_DIR/scripts/rollout-database-hardening.sh" backfill
MIGRATION_DATABASE_URL="$UPGRADE_URL" \
  PSQL_CONTAINER="$UPGRADE_CONTAINER" PSQL_DATABASE="$DATABASE_NAME" \
  "$ROOT_DIR/scripts/rollout-database-hardening.sh" validate

psql_in "$UPGRADE_CONTAINER" <<'SQL'
DO $$
BEGIN
  IF (
    SELECT organization_id
    FROM vendor_assessments
    WHERE id = 'assessment-mismatch'
  ) <> 'org-a' THEN
    RAISE EXCEPTION 'legacy tenant mismatch was not backfilled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM _prisma_migrations
    WHERE migration_name = '20260923000000_schema_baseline'
      AND finished_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'legacy database was not marked with the committed baseline';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname LIKE '%\_tenant\_fk' ESCAPE '\'
      AND NOT convalidated
  ) THEN
    RAISE EXCEPTION 'tenant constraints remain unvalidated';
  END IF;
END
$$;
SQL

# A second deploy is a no-op and verifies restart safety.
DATABASE_URL="$UPGRADE_URL" MIGRATION_DATABASE_URL="$UPGRADE_URL" \
  "$ROOT_DIR/deploy/prisma-migrate-safe.sh"

echo "Database hardening verification passed"
