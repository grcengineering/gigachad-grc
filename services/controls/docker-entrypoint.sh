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
echo "[1/2] Waiting for database..."
sleep 5

# Run database migrations
echo "[2/2] Synchronizing database schema..."
cd /app
./node_modules/.bin/prisma db push --schema=/app/shared/prisma/schema.prisma --accept-data-loss --skip-generate 2>&1 || {
  echo "  Note: Schema may already be up to date."
}

echo "================================================"
echo "Starting application..."
echo "================================================"

exec "$@"
