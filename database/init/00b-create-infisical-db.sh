#!/bin/bash
# Create a separate database for Infisical secrets manager.
# This script sorts after 00-create-keycloak-db.sh and before 01-init.sql.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE infisical;
    GRANT ALL PRIVILEGES ON DATABASE infisical TO $POSTGRES_USER;
EOSQL

echo "Infisical database created successfully"
