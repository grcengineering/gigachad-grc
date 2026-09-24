#!/bin/bash
# Migration script for Configuration as Code module

set -e

echo "Running Prisma migrations for Configuration as Code module..."

cd "$(dirname "$0")/../services/shared"

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  # Try to get it from docker-compose or .env
  if [ -f "../../.env" ]; then
    export $(grep DATABASE_URL ../../.env | xargs)
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required; refusing to guess database credentials" >&2
  exit 1
fi

echo "Using DATABASE_URL: ${DATABASE_URL//:\/\/[^:]*:[^@]*@/:\/\/***:***@}"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Apply the repository's reviewed, forward-only migrations.
echo "Running committed migrations..."
cd ../..
./deploy/prisma-migrate-safe.sh

echo "Migration complete!"
echo ""
echo "You can now:"
echo "1. Refresh the Configuration as Code page"
echo "2. Click 'Initialize from platform state' if files don't appear automatically"

