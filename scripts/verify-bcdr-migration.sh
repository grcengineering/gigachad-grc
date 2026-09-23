#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CONTAINER_NAME="gigachad-bcdr-migration-$$"
DATABASE_NAME="bcdr_test"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker run --detach --rm \
  --name "$CONTAINER_NAME" \
  --env POSTGRES_PASSWORD=bcdr-test-password \
  --env POSTGRES_DB="$DATABASE_NAME" \
  --health-cmd="pg_isready -U postgres -d $DATABASE_NAME" \
  --health-interval=1s \
  --health-timeout=3s \
  --health-retries=30 \
  --volume "$ROOT_DIR/database/init/12-bcdr-module.sql:/migration.sql:ro" \
  postgres:16-alpine >/dev/null

attempt=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME")" = "healthy" ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$CONTAINER_NAME"
    exit 1
  fi
  sleep 1
done

psql() {
  docker exec -i "$CONTAINER_NAME" \
    psql --set=ON_ERROR_STOP=1 --username=postgres --dbname="$DATABASE_NAME" "$@"
}

# Parent tables exist after Prisma schema synchronization.
psql <<'SQL'
CREATE TABLE public.organizations (id TEXT PRIMARY KEY);
CREATE TABLE public.workspaces (id TEXT PRIMARY KEY);
CREATE TABLE public.users (id TEXT PRIMARY KEY);
CREATE TABLE public.assets (id TEXT PRIMARY KEY);
CREATE TABLE public.controls (id TEXT PRIMARY KEY);
CREATE TABLE public.risks (id TEXT PRIMARY KEY);
SQL

# Verify a fresh install and an idempotent existing-install restart.
psql --file=/migration.sql
psql --file=/migration.sql

# Non-UUID external IDs must work while BC/DR-owned IDs remain UUIDs.
psql <<'SQL'
INSERT INTO public.organizations (id) VALUES ('tenant:text-id');
INSERT INTO public.workspaces (id) VALUES ('workspace:text-id');
INSERT INTO public.users (id) VALUES ('user:text-id');
INSERT INTO public.assets (id) VALUES ('asset:text-id');
INSERT INTO public.controls (id) VALUES ('control:text-id');
INSERT INTO public.risks (id) VALUES ('risk:text-id');

INSERT INTO bcdr.business_processes (
  organization_id, workspace_id, process_id, name, owner_id, created_by, updated_by
) VALUES (
  'tenant:text-id', 'workspace:text-id', 'PROC-1', 'Payments',
  'user:text-id', 'user:text-id', 'user:text-id'
);

INSERT INTO bcdr.bcdr_plans (
  organization_id, workspace_id, plan_id, title, plan_type, owner_id, created_by, updated_by
) VALUES (
  'tenant:text-id', 'workspace:text-id', 'PLAN-1', 'Payments recovery',
  'disaster_recovery', 'user:text-id', 'user:text-id', 'user:text-id'
);

INSERT INTO bcdr.process_assets (process_id, asset_id, created_by)
SELECT id, 'asset:text-id', 'user:text-id'
FROM bcdr.business_processes WHERE process_id = 'PROC-1';

INSERT INTO bcdr.bia_risks (process_id, risk_id, created_by)
SELECT id, 'risk:text-id', 'user:text-id'
FROM bcdr.business_processes WHERE process_id = 'PROC-1';

INSERT INTO bcdr.plan_controls (plan_id, control_id, created_by)
SELECT id, 'control:text-id', 'user:text-id'
FROM bcdr.bcdr_plans WHERE plan_id = 'PLAN-1';
SQL

# Simulate legacy UUID tenant and participant columns, then verify repair.
psql <<'SQL'
TRUNCATE bcdr.business_processes CASCADE;
CREATE SCHEMA IF NOT EXISTS shared;
CREATE TABLE shared.organizations (id UUID PRIMARY KEY);
ALTER TABLE bcdr.business_processes
  DROP CONSTRAINT business_processes_organization_id_fkey,
  ALTER COLUMN organization_id TYPE UUID USING organization_id::UUID;
ALTER TABLE bcdr.business_processes
  ADD CONSTRAINT legacy_business_processes_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES shared.organizations(id);
ALTER TABLE bcdr.dr_tests
  ALTER COLUMN participant_ids DROP DEFAULT,
  ALTER COLUMN participant_ids TYPE UUID[] USING participant_ids::UUID[],
  ALTER COLUMN participant_ids SET DEFAULT '{}'::UUID[];
SQL

psql --file=/migration.sql

psql <<'SQL'
DO $$
DECLARE
  target_schema TEXT;
BEGIN
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'bcdr'
      AND table_name = 'business_processes'
      AND column_name = 'organization_id'
  ) <> 'text' THEN
    RAISE EXCEPTION 'legacy organization_id was not converted to text';
  END IF;

  SELECT ccu.table_schema INTO target_schema
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.constraint_schema = tc.constraint_schema
  WHERE tc.table_schema = 'bcdr'
    AND tc.table_name = 'business_processes'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'organizations';
  IF target_schema <> 'public' THEN
    RAISE EXCEPTION 'organization foreign key targets %, expected public', target_schema;
  END IF;

  IF format_type(
    (SELECT atttypid FROM pg_attribute
      WHERE attrelid = 'bcdr.dr_tests'::regclass
        AND attname = 'participant_ids'),
    NULL
  ) <> 'text[]' THEN
    RAISE EXCEPTION 'legacy participant_ids was not converted to text[]';
  END IF;
END $$;
SQL

echo "BC/DR migration verification passed"
