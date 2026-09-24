#!/bin/sh
# Apply the committed Prisma baseline and forward-only migrations safely.
#
# Existing installations were historically managed with `prisma db push` and
# therefore have no usable baseline record. This script fingerprints that
# complete legacy schema and records only the baseline as applied before
# deploying forward migrations. It refuses partial/unknown schemas.

set -eu

SCRIPT_DIR=$(dirname "$0")
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
BASELINE_MIGRATION=20260923000000_schema_baseline

if [ -n "${PRISMA_SCHEMA_PATH:-}" ]; then
  SCHEMA_PATH=$PRISMA_SCHEMA_PATH
elif [ -f "$ROOT_DIR/services/shared/prisma/schema.prisma" ]; then
  SCHEMA_PATH="$ROOT_DIR/services/shared/prisma/schema.prisma"
elif [ -f "$ROOT_DIR/shared/prisma/schema.prisma" ]; then
  SCHEMA_PATH="$ROOT_DIR/shared/prisma/schema.prisma"
else
  echo "Canonical Prisma schema not found; set PRISMA_SCHEMA_PATH" >&2
  exit 1
fi

SCHEMA_DIR=$(dirname "$SCHEMA_PATH")
BASELINE_SQL_PATH="$SCHEMA_DIR/migrations/$BASELINE_MIGRATION/migration.sql"
if [ ! -f "$BASELINE_SQL_PATH" ]; then
  echo "Committed baseline SQL not found at $BASELINE_SQL_PATH" >&2
  exit 1
fi
export BASELINE_SQL_PATH

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# Migrations require the owner/admin connection. Runtime DATABASE_URL can stay
# pointed at a restricted login after the staged application-role cutover.
if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
  MIGRATION_URL=$MIGRATION_DATABASE_URL
else
  MIGRATION_URL=$DATABASE_URL
fi
export DATABASE_URL=$MIGRATION_URL

if [ -n "${PRISMA_CLI:-}" ]; then
  PRISMA=$PRISMA_CLI
elif [ -x "$ROOT_DIR/node_modules/.bin/prisma" ]; then
  PRISMA=$ROOT_DIR/node_modules/.bin/prisma
elif [ -x /app/node_modules/.bin/prisma ]; then
  PRISMA=/app/node_modules/.bin/prisma
else
  echo "Prisma CLI not found; set PRISMA_CLI to its absolute path" >&2
  exit 1
fi

echo "Inspecting database migration state..."
STATE=$(
  node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const [state] = await prisma.$queryRawUnsafe(`
    SELECT
      to_regclass('public.organizations') IS NOT NULL AS has_organizations,
      to_regclass('public._prisma_migrations') IS NOT NULL AS has_migration_table
  `);

  const baselineSql = fs.readFileSync(process.env.BASELINE_SQL_PATH, 'utf8');
  const expectedTables = [
    ...baselineSql.matchAll(/^CREATE TABLE \x22([^\x22]+)\x22/gm),
  ].map((match) => match[1]);
  const actualTables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `);
  const actualTableNames = new Set(actualTables.map((table) => table.tablename));
  const hasCompleteLegacyFingerprint =
    expectedTables.length > 0 &&
    expectedTables.every((table) => actualTableNames.has(table));

  let hasBaseline = false;
  if (state.has_migration_table) {
    const [baseline] = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1
        FROM public._prisma_migrations
        WHERE migration_name = '20260923000000_schema_baseline'
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      ) AS present
    `);
    hasBaseline = baseline.present;
  }

  process.stdout.write([
    state.has_organizations ? 'yes' : 'no',
    hasBaseline ? 'yes' : 'no',
    hasCompleteLegacyFingerprint ? 'yes' : 'no',
  ].join('|'));
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
NODE
)

HAS_ORGANIZATIONS=$(printf '%s' "$STATE" | cut -d '|' -f 1)
HAS_BASELINE=$(printf '%s' "$STATE" | cut -d '|' -f 2)
HAS_COMPLETE_LEGACY=$(printf '%s' "$STATE" | cut -d '|' -f 3)

if [ "$HAS_ORGANIZATIONS" = "yes" ] && [ "$HAS_BASELINE" = "no" ]; then
  if [ "$HAS_COMPLETE_LEGACY" != "yes" ]; then
    echo "Refusing to baseline a partial or unknown existing schema." >&2
    echo "Restore a complete pre-upgrade backup or reconcile it in staging first." >&2
    exit 1
  fi

  echo "Recording the complete db-push-managed schema as the committed baseline..."
  "$PRISMA" migrate resolve \
    --schema="$SCHEMA_PATH" \
    --applied "$BASELINE_MIGRATION"
fi

echo "Applying committed forward-only migrations..."
"$PRISMA" migrate deploy --schema="$SCHEMA_PATH"
"$PRISMA" migrate status --schema="$SCHEMA_PATH"

echo "Database migrations are current."
