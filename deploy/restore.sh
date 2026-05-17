#!/bin/bash

################################################################################
# GigaChad GRC - Disaster Recovery Restore Script
################################################################################
#
# This script restores a complete backup of the GigaChad GRC system including:
# - PostgreSQL database
# - RustFS/S3 object storage (https://github.com/rustfs/rustfs)
# - Configuration files
#
# Data-plane restore (postgres, redis, object storage) is performed over the
# network using pg_restore / psql, redis-cli RESTORE, and aws s3 cp - so the
# restore container does not require docker.sock access to move data.
#
# Service lifecycle (docker compose up/down) is still managed via the host's
# docker CLI: restore.sh is intended to be invoked from the host by an
# operator after a disaster, not from inside the backup-scheduler container.
#
# Usage: ./restore.sh <backup_file>
#        ./restore.sh /backups/gigachad-grc/backup-2025-12-05-020000.tar.gz
#
# WARNING: This will overwrite existing data!
#
# Prerequisites (on the host):
#   - docker / docker compose v2
#   - postgresql-client (for pg_restore / psql)
#   - redis (for redis-cli)
#   - aws CLI
#   - Valid backup archive
#
################################################################################

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# ==============================================================================
# Configuration
# ==============================================================================

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Backup file (from command line argument)
BACKUP_FILE="${1:-}"

# Temporary restore directory
RESTORE_DIR="/tmp/grc-restore-$$"

# Docker Compose settings - only used for service lifecycle (up/down/restart)
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.prod"

# Network targets. When restore.sh runs on the docker host, services are
# reached via published localhost ports. Operators can override these by
# exporting the variables before invoking the script (e.g. to restore from
# inside the grc-network).
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
S3_ENDPOINT="${S3_ENDPOINT:-http://127.0.0.1:9000}"
S3_BUCKET="${S3_BUCKET:-grc-storage}"
S3_REGION="${S3_REGION:-us-east-1}"

# Log file
LOG_FILE="/var/log/grc-restore-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ==============================================================================
# Functions
# ==============================================================================

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${MAGENTA}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log_error "$1"
    log_error "Restore failed! Check logs at: $LOG_FILE"
    cleanup_temp_files
    exit 1
}

# Cleanup temporary files
cleanup_temp_files() {
    if [ -d "$RESTORE_DIR" ]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$RESTORE_DIR"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 <backup_file>

Restore GigaChad GRC from a backup archive.

Arguments:
  backup_file    Path to the backup archive (.tar.gz)

Example:
  $0 /backups/gigachad-grc/backup-2025-12-05-020000.tar.gz

Options:
  -h, --help     Show this help message

WARNING: This operation will overwrite existing data!
         Make sure to create a backup before restoring.

EOF
    exit 1
}

# Confirm action
confirm_action() {
    local prompt="$1"

    echo ""
    echo -e "${YELLOW}WARNING: This operation will overwrite existing data!${NC}"
    echo ""
    read -r -p "$prompt [y/N]: " response

    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            log_info "Restore cancelled by user"
            exit 0
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if backup file provided
    if [ -z "$BACKUP_FILE" ]; then
        error_exit "No backup file specified. Usage: $0 <backup_file>"
    fi

    # Check if backup file exists
    if [ ! -f "$BACKUP_FILE" ]; then
        error_exit "Backup file not found: $BACKUP_FILE"
    fi

    # Network clients required for data-plane restore
    for cmd in pg_restore psql redis-cli aws; do
        if ! command_exists "$cmd"; then
            error_exit "$cmd not found. Install postgresql-client, redis and aws-cli before running restore."
        fi
    done

    # docker CLI is required for service lifecycle (up/down/restart)
    if ! command_exists docker; then
        error_exit "docker not found. restore.sh needs the docker CLI to start/stop services on the host."
    fi

    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed. Please install Docker Compose first."
    fi

    if ! docker ps >/dev/null 2>&1; then
        error_exit "Docker daemon is not running or current user cannot reach it."
    fi

    log_success "Prerequisites check passed"
}

# Extract backup archive
extract_backup() {
    log_step "Extracting backup archive..."

    # Create temporary restore directory
    mkdir -p "$RESTORE_DIR" || error_exit "Failed to create restore directory"

    # Extract archive
    log_info "Extracting: $BACKUP_FILE"
    tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR" \
        || error_exit "Failed to extract backup archive"

    # Find the backup directory (should be backup-YYYY-MM-DD-HHMMSS)
    local backup_subdir
    backup_subdir=$(find "$RESTORE_DIR" -maxdepth 1 -type d -name "backup-*" | head -n 1)

    if [ -z "$backup_subdir" ]; then
        error_exit "Invalid backup archive: backup directory not found"
    fi

    # Move contents to restore directory
    mv "$backup_subdir"/* "$RESTORE_DIR/" 2>/dev/null || true
    rmdir "$backup_subdir" 2>/dev/null || true

    log_success "Backup archive extracted"
}

# Validate backup
validate_backup() {
    log_step "Validating backup..."

    # Check for manifest file
    if [ ! -f "$RESTORE_DIR/manifest.json" ]; then
        log_warning "Backup manifest not found (older backup format)"
    else
        log_info "Backup manifest found"
        cat "$RESTORE_DIR/manifest.json" | tee -a "$LOG_FILE"
    fi

    # Check for required files
    local required_files=(
        "postgres_backup.dump"
        "configs/.env.prod"
        "configs/docker-compose.prod.yml"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$RESTORE_DIR/$file" ] && [ ! -f "$RESTORE_DIR/${file}.gz" ]; then
            log_warning "Required file not found: $file"
        fi
    done

    log_success "Backup validation completed"
}

# Stop services
stop_services() {
    log_step "Stopping GigaChad GRC services..."

    if [ -f "$COMPOSE_FILE" ] && [ -f "$ENV_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down \
            || log_warning "Failed to stop services (they may not be running)"
    else
        log_warning "Docker Compose configuration not found, skipping service stop"
    fi

    log_success "Services stopped"
}

# Restore configuration files
restore_configurations() {
    log_step "Restoring configuration files..."

    # Backup existing configurations
    if [ -f "$ENV_FILE" ]; then
        log_info "Backing up existing .env.prod"
        cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"
    fi

    # Restore environment file
    if [ -f "$RESTORE_DIR/configs/.env.prod" ]; then
        cp "$RESTORE_DIR/configs/.env.prod" "$ENV_FILE" \
            || error_exit "Failed to restore .env.prod"
        chmod 600 "$ENV_FILE"
        log_success "Environment file restored"
    else
        log_warning ".env.prod not found in backup"
    fi

    # Restore Docker Compose file
    if [ -f "$RESTORE_DIR/configs/docker-compose.prod.yml" ]; then
        cp "$RESTORE_DIR/configs/docker-compose.prod.yml" "$COMPOSE_FILE" \
            || log_warning "Failed to restore docker-compose.prod.yml"
    fi

    # Restore Traefik configuration
    if [ -f "$RESTORE_DIR/configs/traefik.yml" ]; then
        mkdir -p "${PROJECT_DIR}/gateway"
        cp "$RESTORE_DIR/configs/traefik.yml" "${PROJECT_DIR}/gateway/" \
            || log_warning "Failed to restore traefik.yml"
    fi

    # Restore Keycloak realm configuration
    if [ -f "$RESTORE_DIR/configs/realm-export.json" ]; then
        mkdir -p "${PROJECT_DIR}/auth"
        cp "$RESTORE_DIR/configs/realm-export.json" "${PROJECT_DIR}/auth/" \
            || log_warning "Failed to restore realm-export.json"
    fi

    # Restore database init scripts
    if [ -d "$RESTORE_DIR/configs/init" ]; then
        mkdir -p "${PROJECT_DIR}/database/init"
        cp -r "$RESTORE_DIR/configs/init/"* "${PROJECT_DIR}/database/init/" \
            || log_warning "Failed to restore database init scripts"
    fi

    log_success "Configuration files restored"
}

# Restore PostgreSQL database over the network
restore_database() {
    log_step "Restoring PostgreSQL database..."

    # Load environment variables
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE" 2>/dev/null || error_exit "Failed to load environment file"
    set +a

    # Start only PostgreSQL service
    log_info "Starting PostgreSQL service..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres \
        || error_exit "Failed to start PostgreSQL service"

    # Wait for PostgreSQL to be ready (TCP poll via pg_isready)
    log_info "Waiting for PostgreSQL to be ready..."
    local retries=30
    local wait_time=2

    export PGPASSWORD="$POSTGRES_PASSWORD"

    for ((i=1; i<=retries; i++)); do
        if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi

        if [ "$i" -eq "$retries" ]; then
            unset PGPASSWORD
            error_exit "PostgreSQL did not become ready in time"
        fi

        echo -n "."
        sleep "$wait_time"
    done
    echo ""

    # Drop existing database (if exists) and create new one
    log_info "Recreating database..."
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
        || log_warning "Failed to drop existing database"

    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d postgres \
        -c "CREATE DATABASE ${POSTGRES_DB};" \
        || { unset PGPASSWORD; error_exit "Failed to create database"; }

    # Restore database from custom dump (preferred)
    if [ -f "$RESTORE_DIR/postgres_backup.dump" ]; then
        log_info "Restoring from custom dump format..."
        pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            --clean --if-exists --no-owner --no-acl \
            "$RESTORE_DIR/postgres_backup.dump" \
            || log_warning "Database restore completed with warnings"

    # Fallback to SQL dump
    elif [ -f "$RESTORE_DIR/postgres_backup.sql.gz" ]; then
        log_info "Restoring from SQL dump..."
        gunzip -c "$RESTORE_DIR/postgres_backup.sql.gz" | \
            psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            || log_warning "Database restore completed with warnings"

    elif [ -f "$RESTORE_DIR/postgres_backup.sql" ]; then
        log_info "Restoring from uncompressed SQL dump..."
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
            -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
            -f "$RESTORE_DIR/postgres_backup.sql" \
            || log_warning "Database restore completed with warnings"

    else
        unset PGPASSWORD
        error_exit "No database backup found"
    fi

    # Verify database restoration
    log_info "Verifying database restoration..."
    local table_count
    table_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        2>/dev/null | xargs || echo "unknown")

    log_info "Tables restored: $table_count"

    unset PGPASSWORD

    log_success "Database restoration completed"
}

# Restore RustFS/S3 object storage data over the S3 API
restore_object_storage() {
    log_step "Restoring RustFS/S3 object storage data..."

    # Check if backup exists (legacy filename kept for compatibility)
    if [ ! -f "$RESTORE_DIR/minio_backup.tar.gz" ]; then
        log_warning "Object storage backup not found, skipping"
        return 0
    fi

    if [ -z "${MINIO_ROOT_USER:-}" ] || [ -z "${MINIO_ROOT_PASSWORD:-}" ]; then
        log_warning "MINIO_ROOT_USER / MINIO_ROOT_PASSWORD not set; skipping object storage restore"
        return 0
    fi

    # Start RustFS service
    log_info "Starting object storage service..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d rustfs \
        || error_exit "Failed to start RustFS service"

    # Wait for service to be ready
    log_info "Waiting for object storage to be ready..."
    local retries=30
    for ((i=1; i<=retries; i++)); do
        if curl -fsS "${S3_ENDPOINT}/" >/dev/null 2>&1 \
           || curl -fsS "${S3_ENDPOINT}/minio/health/live" >/dev/null 2>&1; then
            break
        fi
        if [ "$i" -eq "$retries" ]; then
            log_warning "Object storage did not become ready in time"
        fi
        sleep 2
    done

    # Extract backup to temporary location
    local storage_temp_dir="${RESTORE_DIR}/storage_temp"
    mkdir -p "$storage_temp_dir"

    log_info "Extracting object storage backup..."
    tar -xzf "$RESTORE_DIR/minio_backup.tar.gz" -C "$storage_temp_dir" \
        || error_exit "Failed to extract object storage backup"

    # The archive contains either an "object-storage" directory (new format)
    # or a legacy "data" directory. Locate whichever exists.
    local source_dir=""
    if [ -d "$storage_temp_dir/object-storage" ]; then
        source_dir="$storage_temp_dir/object-storage"
    elif [ -d "$storage_temp_dir/data" ]; then
        # Legacy backups stored RustFS data verbatim (a raw /data dump from
        # `docker cp`). These are not S3-restoreable; warn and skip.
        log_warning "Legacy data-directory format detected in $storage_temp_dir/data."
        log_warning "Cannot restore legacy raw RustFS data over S3 - copy the directory"
        log_warning "into the rustfs_data volume manually if needed."
        rm -rf "$storage_temp_dir"
        return 0
    else
        log_warning "No recognizable object-storage payload in archive"
        rm -rf "$storage_temp_dir"
        return 0
    fi

    log_info "Uploading objects to s3://${S3_BUCKET} via ${S3_ENDPOINT}..."

    (
        export AWS_ACCESS_KEY_ID="$MINIO_ROOT_USER"
        export AWS_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD"
        export AWS_DEFAULT_REGION="$S3_REGION"

        # Ensure the bucket exists (idempotent)
        aws --endpoint-url "$S3_ENDPOINT" s3api create-bucket \
            --bucket "$S3_BUCKET" 2>/dev/null || true

        aws --endpoint-url "$S3_ENDPOINT" s3 sync \
            "$source_dir" "s3://${S3_BUCKET}" --no-progress
    ) || log_warning "Failed to upload some objects to RustFS"

    # Cleanup
    rm -rf "$storage_temp_dir"

    log_success "Object storage data restoration completed"
}

# Restore Redis data
restore_redis() {
    log_step "Restoring Redis data..."

    # Check if Redis backup exists
    if [ ! -f "$RESTORE_DIR/redis_backup.rdb" ]; then
        log_warning "Redis backup not found, skipping"
        return 0
    fi

    # NOTE: Re-hydrating an RDB into a running Redis server over the network
    # is not possible with redis-cli alone - Redis only loads dump.rdb at
    # server startup. The previous implementation used `docker cp` to drop
    # the RDB into the redis container's /data volume; with docker.sock
    # removed from the backup scheduler that pathway is no longer available
    # from inside the container.
    #
    # For this product Redis is used as a cache (session keys, queues),
    # not as a primary datastore, so a warm restart is acceptable: keys
    # are recomputed from postgres / rustfs on demand.
    #
    # If an operator running this script from the host needs a true cold
    # restore, they should:
    #   1. docker compose -f docker-compose.prod.yml stop redis
    #   2. docker run --rm -v gigachad-grc_redis_data:/data -v "<dump-dir>":/src \
    #        alpine cp /src/redis_backup.rdb /data/dump.rdb
    #   3. docker compose -f docker-compose.prod.yml start redis
    # That manual procedure is documented in deploy/README.md.

    log_warning "Redis cold restore is not performed automatically (cache-only)."
    log_warning "  Backup file kept at: $RESTORE_DIR/redis_backup.rdb"
    log_warning "  See deploy/README.md 'Manual Redis cold restore' for the"
    log_warning "  procedure to load it back into the redis_data volume."

    log_success "Redis data restoration step completed (best-effort)"
}

# Start all services
start_services() {
    log_step "Starting all GigaChad GRC services..."

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
        || error_exit "Failed to start services"

    log_info "Waiting for services to be healthy..."
    sleep 30

    # Check service health
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

    log_success "All services started"
}

# Verify restoration
verify_restoration() {
    log_step "Verifying restoration..."

    # Check if all services are running
    local services_count
    services_count=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q | wc -l)

    log_info "Running services: $services_count"

    # Check database connectivity (network)
    export PGPASSWORD="$POSTGRES_PASSWORD"
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" >/dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_warning "Database may not be accessible"
    fi
    unset PGPASSWORD

    # Check Redis connectivity (network)
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
        -a "${REDIS_PASSWORD}" --no-auth-warning ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis is accessible"
    else
        log_warning "Redis may not be accessible"
    fi

    log_success "Verification completed"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    local start_time
    start_time=$(date +%s)

    # Handle command line arguments
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        show_usage
    fi

    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              GigaChad GRC Disaster Recovery Script             ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    log_info "Starting restoration process..."
    log_info "Backup file: $BACKUP_FILE"

    # Confirm action
    confirm_action "Do you want to proceed with the restoration?"

    # Run restoration steps
    check_prerequisites
    extract_backup
    validate_backup
    stop_services
    restore_configurations
    restore_database
    restore_object_storage
    restore_redis
    start_services
    verify_restoration

    # Cleanup
    cleanup_temp_files

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local duration_formatted
    duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    log_success "Restoration completed successfully!"
    log_info "Duration: $duration_formatted"
    log_info "Log file: $LOG_FILE"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Next steps:"
    log_info "1. Verify application functionality"
    log_info "2. Check service logs: docker compose logs -f"
    log_info "3. Test authentication and access"
    log_info "4. Validate data integrity"
    echo ""

    exit 0
}

# Trap errors and interrupts
trap 'error_exit "Script interrupted or failed"' ERR
trap 'log_warning "Script interrupted by user"; cleanup_temp_files; exit 1' INT TERM

# Run main function
main "$@"
