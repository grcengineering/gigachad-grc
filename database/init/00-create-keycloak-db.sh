#!/bin/bash
# Create a separate database for Keycloak to avoid schema conflicts
# with Prisma migrations in the main application database.
# This script runs before the SQL init scripts (sorted by filename).

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE keycloak;
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO $POSTGRES_USER;
EOSQL

echo "Keycloak database created successfully"
