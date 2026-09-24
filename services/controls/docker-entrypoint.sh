#!/bin/sh
# =============================================================================
# GigaChad GRC - Controls Service Entrypoint
# =============================================================================
# This script runs database migrations before starting the application.
# =============================================================================

set -e

echo "================================================"
echo "GigaChad GRC - Controls Service Starting"
echo "================================================"

# Give the database a moment to be fully ready
echo "[1/3] Waiting for database..."
sleep 5

# Apply only reviewed, committed migrations. The migration wrapper safely
# baselines complete installations that were created by the former db-push
# startup path and refuses partial or unknown schemas.
echo "[2/3] Applying committed database migrations..."
cd /app
/app/deploy/prisma-migrate-safe.sh

# The BC/DR core tables use a dedicated PostgreSQL schema and are intentionally
# outside Prisma's single-public-schema model. Apply their idempotent migration
# after Prisma migrations so public organizations/users/workspaces/entities
# exist first.
echo "[3/3] Applying BC/DR schema..."
./node_modules/.bin/prisma db execute \
  --schema=/app/shared/prisma/schema.prisma \
  --file=/app/database/migrations/12-bcdr-module.sql

echo "================================================"
echo "Starting application..."
echo "================================================"

exec "$@"
