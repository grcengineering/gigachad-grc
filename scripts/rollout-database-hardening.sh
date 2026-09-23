#!/bin/sh
# Audit, repair, and validate tenant-aware constraints after deployment.
#
# Usage:
#   MIGRATION_DATABASE_URL=postgresql://... ./scripts/rollout-database-hardening.sh audit
#   MIGRATION_DATABASE_URL=postgresql://... ./scripts/rollout-database-hardening.sh backfill
#   MIGRATION_DATABASE_URL=postgresql://... ./scripts/rollout-database-hardening.sh validate
#
# `backfill` is intentionally explicit:
#   * tenant-mismatched workspace references are cleared to the supported
#     org-wide state, preserving the child row's tenant;
#   * other tenant-mismatched children inherit the confirmed parent's tenant;
#   * rows whose parent ID does not exist are logged but never guessed/deleted.
# Review app_security.tenant_integrity_repair_log and repair true orphans
# manually before `validate`.

set -eu

MODE=${1:-audit}
DATABASE_URL=${MIGRATION_DATABASE_URL:-${DATABASE_URL:-}}
PSQL=${PSQL:-psql}

if [ -z "$DATABASE_URL" ]; then
  echo "MIGRATION_DATABASE_URL (or DATABASE_URL) is required" >&2
  exit 1
fi

case "$MODE" in
  audit|backfill|validate) ;;
  *)
    echo "Usage: $0 {audit|backfill|validate}" >&2
    exit 1
    ;;
esac

run_psql() {
  if [ -n "${PSQL_CONTAINER:-}" ]; then
    docker exec -i "$PSQL_CONTAINER" \
      psql --set=ON_ERROR_STOP=1 \
      --username="${PSQL_USER:-postgres}" \
      --dbname="${PSQL_DATABASE:-gigachad_grc}"
  else
    "$PSQL" "$DATABASE_URL" --set=ON_ERROR_STOP=1
  fi
}

if [ "$MODE" = "audit" ]; then
  run_psql <<'SQL'
CREATE TEMP TABLE tenant_integrity_audit (
  constraint_name text,
  child_table text,
  parent_table text,
  orphan_rows bigint,
  tenant_mismatch_rows bigint,
  validated boolean
);

DO $$
DECLARE
  relation record;
  orphan_count bigint;
  mismatch_count bigint;
BEGIN
  FOR relation IN
    SELECT
      c.conname,
      c.conrelid::regclass AS child_table,
      c.confrelid::regclass AS parent_table,
      child_key.attname AS child_key,
      child_org.attname AS child_org,
      parent_key.attname AS parent_key,
      parent_org.attname AS parent_org,
      c.convalidated
    FROM pg_constraint c
    JOIN pg_attribute child_key
      ON child_key.attrelid = c.conrelid
     AND child_key.attnum = c.conkey[1]
    JOIN pg_attribute child_org
      ON child_org.attrelid = c.conrelid
     AND child_org.attnum = c.conkey[2]
    JOIN pg_attribute parent_key
      ON parent_key.attrelid = c.confrelid
     AND parent_key.attnum = c.confkey[1]
    JOIN pg_attribute parent_org
      ON parent_org.attrelid = c.confrelid
     AND parent_org.attnum = c.confkey[2]
    WHERE c.contype = 'f'
      AND c.conname LIKE '%\_tenant\_fk' ESCAPE '\'
    ORDER BY c.conname
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %s child ' ||
      'LEFT JOIN %s parent ON parent.%I = child.%I ' ||
      'WHERE child.%I IS NOT NULL AND parent.%I IS NULL',
      relation.child_table,
      relation.parent_table,
      relation.parent_key,
      relation.child_key,
      relation.child_key,
      relation.parent_key
    ) INTO orphan_count;

    EXECUTE format(
      'SELECT count(*) FROM %s child ' ||
      'JOIN %s parent ON parent.%I = child.%I ' ||
      'WHERE child.%I IS DISTINCT FROM parent.%I',
      relation.child_table,
      relation.parent_table,
      relation.parent_key,
      relation.child_key,
      relation.child_org,
      relation.parent_org
    ) INTO mismatch_count;

    INSERT INTO tenant_integrity_audit
      (constraint_name, child_table, parent_table, orphan_rows, tenant_mismatch_rows, validated)
    VALUES
      (relation.conname, relation.child_table, relation.parent_table,
       orphan_count, mismatch_count, relation.convalidated);
  END LOOP;
END
$$;

TABLE tenant_integrity_audit;

DO $$
DECLARE
  issue_count bigint;
BEGIN
  SELECT coalesce(sum(orphan_rows + tenant_mismatch_rows), 0)
  INTO issue_count
  FROM tenant_integrity_audit;

  IF issue_count > 0 THEN
    RAISE WARNING '% tenant integrity issue(s) require remediation', issue_count;
  ELSE
    RAISE NOTICE 'No tenant integrity issues found';
  END IF;
END
$$;
SQL
fi

if [ "$MODE" = "backfill" ]; then
  run_psql <<'SQL'
BEGIN;

CREATE TABLE IF NOT EXISTS app_security.tenant_integrity_repair_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  repaired_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  repaired_by text NOT NULL DEFAULT session_user,
  constraint_name text NOT NULL,
  relation_name text NOT NULL,
  row_id text,
  action text NOT NULL,
  before_row jsonb NOT NULL
);

REVOKE ALL ON app_security.tenant_integrity_repair_log FROM PUBLIC;
REVOKE ALL ON app_security.tenant_integrity_repair_log FROM gigachad_app;

DO $$
DECLARE
  relation record;
  repaired_count bigint;
  orphan_count bigint;
  total_repaired bigint := 0;
  total_orphans bigint := 0;
BEGIN
  FOR relation IN
    SELECT
      c.conname,
      c.conrelid::regclass AS child_table,
      c.confrelid::regclass AS parent_table,
      child_key.attname AS child_key,
      child_org.attname AS child_org,
      parent_key.attname AS parent_key,
      parent_org.attname AS parent_org
    FROM pg_constraint c
    JOIN pg_attribute child_key
      ON child_key.attrelid = c.conrelid
     AND child_key.attnum = c.conkey[1]
    JOIN pg_attribute child_org
      ON child_org.attrelid = c.conrelid
     AND child_org.attnum = c.conkey[2]
    JOIN pg_attribute parent_key
      ON parent_key.attrelid = c.confrelid
     AND parent_key.attnum = c.confkey[1]
    JOIN pg_attribute parent_org
      ON parent_org.attrelid = c.confrelid
     AND parent_org.attnum = c.confkey[2]
    WHERE c.contype = 'f'
      AND c.conname LIKE '%\_tenant\_fk' ESCAPE '\'
      AND NOT c.convalidated
    ORDER BY c.conname
  LOOP
    EXECUTE format(
      'INSERT INTO app_security.tenant_integrity_repair_log ' ||
      '(constraint_name, relation_name, row_id, action, before_row) ' ||
      'SELECT %L, %L, child.id::text, %L, to_jsonb(child) ' ||
      'FROM %s child ' ||
      'LEFT JOIN %s parent ON parent.%I = child.%I ' ||
      'WHERE child.%I IS NOT NULL AND parent.%I IS NULL',
      relation.conname,
      relation.child_table::text,
      'manual_parent_repair_required',
      relation.child_table,
      relation.parent_table,
      relation.parent_key,
      relation.child_key,
      relation.child_key,
      relation.parent_key
    );
    GET DIAGNOSTICS orphan_count = ROW_COUNT;
    total_orphans := total_orphans + orphan_count;

    EXECUTE format(
      'INSERT INTO app_security.tenant_integrity_repair_log ' ||
      '(constraint_name, relation_name, row_id, action, before_row) ' ||
      'SELECT %L, %L, child.id::text, %L, to_jsonb(child) ' ||
      'FROM %s child ' ||
      'JOIN %s parent ON parent.%I = child.%I ' ||
      'WHERE child.%I IS DISTINCT FROM parent.%I',
      relation.conname,
      relation.child_table::text,
      CASE
        WHEN relation.child_key = 'workspace_id' THEN 'cleared_cross_tenant_workspace'
        ELSE 'backfilled_tenant_from_parent'
      END,
      relation.child_table,
      relation.parent_table,
      relation.parent_key,
      relation.child_key,
      relation.child_org,
      relation.parent_org
    );

    IF relation.child_key = 'workspace_id' THEN
      EXECUTE format(
        'UPDATE %s child SET %I = NULL ' ||
        'FROM %s parent ' ||
        'WHERE parent.%I = child.%I ' ||
        'AND child.%I IS DISTINCT FROM parent.%I',
        relation.child_table,
        relation.child_key,
        relation.parent_table,
        relation.parent_key,
        relation.child_key,
        relation.child_org,
        relation.parent_org
      );
    ELSE
      EXECUTE format(
        'UPDATE %s child SET %I = parent.%I ' ||
        'FROM %s parent ' ||
        'WHERE parent.%I = child.%I ' ||
        'AND child.%I IS DISTINCT FROM parent.%I',
        relation.child_table,
        relation.child_org,
        relation.parent_org,
        relation.parent_table,
        relation.parent_key,
        relation.child_key,
        relation.child_org,
        relation.parent_org
      );
    END IF;

    GET DIAGNOSTICS repaired_count = ROW_COUNT;
    total_repaired := total_repaired + repaired_count;
  END LOOP;

  RAISE NOTICE 'Repaired % tenant mismatch row(s)', total_repaired;
  IF total_orphans > 0 THEN
    RAISE WARNING
      '% true orphan row(s) were logged and require manual repair before validation',
      total_orphans;
  END IF;
END
$$;

COMMIT;

SELECT constraint_name, relation_name, row_id, action, repaired_at
FROM app_security.tenant_integrity_repair_log
ORDER BY id DESC;
SQL
fi

if [ "$MODE" = "validate" ]; then
  run_psql <<'SQL'
DO $$
DECLARE
  relation record;
BEGIN
  FOR relation IN
    SELECT c.conrelid::regclass AS child_table, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conname LIKE '%\_tenant\_fk' ESCAPE '\'
      AND NOT c.convalidated
    ORDER BY c.conname
  LOOP
    RAISE NOTICE 'Validating %.%', relation.child_table, relation.conname;
    EXECUTE format(
      'ALTER TABLE %s VALIDATE CONSTRAINT %I',
      relation.child_table,
      relation.conname
    );
  END LOOP;
END
$$;

SELECT conrelid::regclass AS table_name, conname, convalidated
FROM pg_constraint
WHERE contype = 'f'
  AND conname LIKE '%\_tenant\_fk' ESCAPE '\'
ORDER BY conname;
SQL
fi
