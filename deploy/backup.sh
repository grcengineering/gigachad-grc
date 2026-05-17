#!/bin/bash

################################################################################
# GigaChad GRC - Automated Backup Script
################################################################################
#
# This script performs a complete backup of the GigaChad GRC system including:
# - PostgreSQL database
# - RustFS/S3 object storage (https://github.com/rustfs/rustfs)
# - Configuration files
#
# Backups are taken over the docker-compose network using direct network clients
# (pg_dump, redis-cli, aws s3). The script does NOT require access to the host
# Docker socket - the backup-scheduler container runs as a plain network peer.
#
# Usage: ./backup.sh [backup_directory]
#
# Required environment variables (typically supplied via the backup-scheduler
# service in docker-compose.prod.yml):
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   REDIS_PASSWORD
#   MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
#
# Optional overrides:
#   POSTGRES_HOST (default: postgres)
#   POSTGRES_PORT (default: 5432)
#   REDIS_HOST    (default: redis)
#   REDIS_PORT    (default: 6379)
#   S3_ENDPOINT   (default: http://rustfs:9000)
#   S3_BUCKET     (default: grc-storage)
#   S3_REGION     (default: us-east-1)
#
################################################################################

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

# ==============================================================================
# Configuration
# ==============================================================================

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Backup directory (default)
BACKUP_ROOT="${1:-/backups/gigachad-grc}"

# Timestamp for backup
TIMESTAMP="$(date +%Y-%m-%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/backup-${TIMESTAMP}"

# Retention settings (days)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Compression settings
COMPRESSION_LEVEL="${BACKUP_COMPRESSION_LEVEL:-6}"

# Network targets (resolvable on the docker-compose grc-network)
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"
S3_ENDPOINT="${S3_ENDPOINT:-http://rustfs:9000}"
S3_BUCKET="${S3_BUCKET:-grc-storage}"
S3_REGION="${S3_REGION:-us-east-1}"

# Optional environment file (only used to surface config files in the backup -
# environment is normally injected by the container runtime).
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.prod}"

# Log file
LOG_FILE="${BACKUP_ROOT}/backup-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Error handler
error_exit() {
    log_error "$1"
    log_error "Backup failed! Check logs at: $LOG_FILE"
    exit 1
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command_exists pg_dump; then
        error_exit "pg_dump not found. Install postgresql-client."
    fi

    if ! command_exists redis-cli; then
        error_exit "redis-cli not found. Install the redis package."
    fi

    if ! command_exists aws; then
        error_exit "aws CLI not found. Install aws-cli."
    fi

    if [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
        error_exit "POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB must be set"
    fi

    log_success "Prerequisites check passed"
}

# Create backup directory
create_backup_directory() {
    log_info "Creating backup directory: $BACKUP_DIR"

    if [ ! -d "$BACKUP_ROOT" ]; then
        mkdir -p "$BACKUP_ROOT" || error_exit "Failed to create backup root directory"
    fi

    mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"
    chmod 700 "$BACKUP_DIR"

    log_success "Backup directory created"
}

# Load environment variables
load_environment() {
    log_info "Loading environment variables..."

    # In the backup-scheduler container the environment is injected by
    # docker-compose. When run from the host we optionally source .env.prod
    # for convenience, but it is not required.
    if [ -f "$ENV_FILE" ]; then
        set -a
        # shellcheck disable=SC1090
        source "$ENV_FILE"
        set +a
    fi

    # Set sensible defaults
    POSTGRES_USER="${POSTGRES_USER:-grc_prod_user}"
    POSTGRES_DB="${POSTGRES_DB:-gigachad_grc_prod}"

    log_success "Environment variables loaded"
}

# Backup PostgreSQL database over the network
backup_database() {
    log_info "Starting PostgreSQL database backup (host: $POSTGRES_HOST)..."

    local db_backup_file="${BACKUP_DIR}/postgres_backup.sql.gz"
    local db_custom_backup="${BACKUP_DIR}/postgres_backup.dump"

    # PGPASSWORD avoids interactive prompts; scope it to this function
    export PGPASSWORD="$POSTGRES_PASSWORD"

    # SQL dump (compressed)
    log_info "Creating SQL dump..."
    pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -F plain --clean --if-exists \
        | gzip -"$COMPRESSION_LEVEL" > "$db_backup_file" \
        || { unset PGPASSWORD; error_exit "Failed to create SQL dump"; }

    # Custom format dump (for faster restoration)
    log_info "Creating custom format dump..."
    pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -F custom -Z "$COMPRESSION_LEVEL" \
        -f "$db_custom_backup" \
        || { unset PGPASSWORD; error_exit "Failed to create custom format dump"; }

    # Get database size
    local db_size
    db_size=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" \
        -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" 2>/dev/null \
        | xargs || echo "unknown")

    unset PGPASSWORD

    log_success "Database backup completed (Size: $db_size)"
}

# Backup RustFS/S3 object storage over the S3 API
backup_object_storage() {
    log_info "Starting RustFS/S3 object storage backup..."

    local storage_backup_dir="${BACKUP_DIR}/object-storage"
    mkdir -p "$storage_backup_dir"

    if [ -z "${MINIO_ROOT_USER:-}" ] || [ -z "${MINIO_ROOT_PASSWORD:-}" ]; then
        log_warning "MINIO_ROOT_USER / MINIO_ROOT_PASSWORD not set; skipping object storage backup"
        return 0
    fi

    log_info "Syncing s3://${S3_BUCKET} from ${S3_ENDPOINT}..."

    # Pass credentials via the env vars aws-cli reads, scoped to the subshell
    if ! (
        export AWS_ACCESS_KEY_ID="$MINIO_ROOT_USER"
        export AWS_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD"
        export AWS_DEFAULT_REGION="$S3_REGION"
        aws --endpoint-url "$S3_ENDPOINT" s3 sync \
            "s3://${S3_BUCKET}" "$storage_backup_dir" --no-progress
    ); then
        log_warning "aws s3 sync failed (bucket may not exist or RustFS unreachable)"
    fi

    # Compress backup (keep legacy filename for restore compatibility)
    log_info "Compressing object storage data..."
    tar -czf "${BACKUP_DIR}/minio_backup.tar.gz" -C "$BACKUP_DIR" object-storage \
        || log_warning "Failed to compress object storage backup"

    # Remove uncompressed directory
    rm -rf "$storage_backup_dir"

    log_success "Object storage backup completed"
}

# Backup Redis data using redis-cli's RDB-over-the-wire mode
backup_redis() {
    log_info "Starting Redis backup (host: $REDIS_HOST)..."

    local redis_backup_file="${BACKUP_DIR}/redis_backup.rdb"

    if [ -z "${REDIS_PASSWORD:-}" ]; then
        log_warning "REDIS_PASSWORD not set; skipping Redis backup"
        return 0
    fi

    # redis-cli --rdb writes the RDB stream from the server straight to a local
    # file. No need to copy a file out of the redis container.
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
        -a "$REDIS_PASSWORD" --no-auth-warning \
        --rdb "$redis_backup_file" 2>>"$LOG_FILE"; then
        log_success "Redis backup completed"
    else
        log_warning "Failed to backup Redis data (server may not be running)"
    fi
}

# Backup configuration files
backup_configurations() {
    log_info "Starting configuration files backup..."

    local config_backup_dir="${BACKUP_DIR}/configs"
    mkdir -p "$config_backup_dir"

    # Copy configuration files (mounted read-only into the backup container)
    [ -f "$ENV_FILE" ] && cp "$ENV_FILE" "$config_backup_dir/.env.prod" 2>/dev/null || true
    [ -f "${PROJECT_DIR}/docker-compose.prod.yml" ] && \
        cp "${PROJECT_DIR}/docker-compose.prod.yml" "$config_backup_dir/docker-compose.prod.yml" 2>/dev/null || true

    # Copy Traefik configuration if exists
    [ -f "${PROJECT_DIR}/gateway/traefik.yml" ] && \
        cp "${PROJECT_DIR}/gateway/traefik.yml" "$config_backup_dir/" 2>/dev/null || true

    # Copy Keycloak realm configuration if exists
    [ -f "${PROJECT_DIR}/auth/realm-export.json" ] && \
        cp "${PROJECT_DIR}/auth/realm-export.json" "$config_backup_dir/" 2>/dev/null || true

    # Copy database init scripts if exist
    [ -d "${PROJECT_DIR}/database/init" ] && \
        cp -r "${PROJECT_DIR}/database/init" "$config_backup_dir/" 2>/dev/null || true

    log_success "Configuration files backup completed"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."

    local manifest_file="${BACKUP_DIR}/manifest.json"

    # Get system information
    local hostname
    hostname=$(hostname)

    # Create manifest
    cat > "$manifest_file" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_timestamp": "$TIMESTAMP",
  "hostname": "$hostname",
  "backup_method": "network-direct",
  "database": {
    "postgres_user": "$POSTGRES_USER",
    "postgres_db": "$POSTGRES_DB",
    "postgres_host": "$POSTGRES_HOST"
  },
  "object_storage": {
    "endpoint": "$S3_ENDPOINT",
    "bucket": "$S3_BUCKET"
  },
  "files": {
    "database_sql": "postgres_backup.sql.gz",
    "database_dump": "postgres_backup.dump",
    "minio": "minio_backup.tar.gz",
    "redis": "redis_backup.rdb",
    "configs": "configs/"
  },
  "retention_days": $RETENTION_DAYS
}
EOF

    log_success "Backup manifest created"
}

# Calculate backup size
calculate_backup_size() {
    log_info "Calculating backup size..."

    local backup_size
    backup_size=$(du -sh "$BACKUP_DIR" | cut -f1)

    log_success "Total backup size: $backup_size"
}

# Create archive
create_archive() {
    log_info "Creating backup archive..."

    local archive_file="${BACKUP_ROOT}/backup-${TIMESTAMP}.tar.gz"

    # Create compressed archive
    tar -czf "$archive_file" -C "$BACKUP_ROOT" "backup-${TIMESTAMP}" \
        || error_exit "Failed to create backup archive"

    # Calculate archive size
    local archive_size
    archive_size=$(du -sh "$archive_file" | cut -f1)

    log_success "Backup archive created: $archive_file (Size: $archive_size)"

    # Remove uncompressed backup directory
    rm -rf "$BACKUP_DIR"

    log_info "Cleaned up temporary backup directory"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (older than $RETENTION_DAYS days)..."

    # Find and remove old backup archives
    local deleted_count=0

    while IFS= read -r -d '' file; do
        log_info "Deleting old backup: $(basename "$file")"
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$BACKUP_ROOT" -name "backup-*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -print0)

    # Find and remove old log files
    while IFS= read -r -d '' file; do
        rm -f "$file"
    done < <(find "$BACKUP_ROOT" -name "backup-*.log" -type f -mtime +"$RETENTION_DAYS" -print0)

    if [ $deleted_count -gt 0 ]; then
        log_success "Cleaned up $deleted_count old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

# Upload to remote storage (optional)
upload_to_remote() {
    if [ "${DR_REMOTE_BACKUP_ENABLED:-false}" = "true" ]; then
        log_info "Uploading backup to remote storage..."

        local archive_file="${BACKUP_ROOT}/backup-${TIMESTAMP}.tar.gz"
        local s3_bucket="${DR_REMOTE_BACKUP_S3_BUCKET}"
        local s3_region="${DR_REMOTE_BACKUP_REGION:-us-east-1}"

        if command_exists aws; then
            # Remote upload uses AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from
            # the environment (set in docker-compose.prod.yml).
            aws s3 cp "$archive_file" "s3://${s3_bucket}/gigachad-grc/" \
                --region "$s3_region" \
                || log_warning "Failed to upload backup to S3"

            log_success "Backup uploaded to remote storage"
        else
            log_warning "AWS CLI not installed. Skipping remote backup upload."
        fi
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification
    if [ "${SLACK_ENABLED:-false}" = "true" ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local color="good"
        [ "$status" = "error" ] && color="danger"
        [ "$status" = "warning" ] && color="warning"

        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"GigaChad GRC Backup\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$message\",
                    \"footer\": \"$(hostname)\",
                    \"ts\": $(date +%s)
                }]
            }" >/dev/null 2>&1 || true
    fi

    # Email notification
    if [ "${NOTIFICATION_EMAIL_ENABLED:-false}" = "true" ]; then
        echo "$message" | mail -s "GigaChad GRC Backup - $status" "${NOTIFICATIONS_EMAIL:-}" || true
    fi
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    local start_time
    start_time=$(date +%s)

    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  GigaChad GRC Backup Script                    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # Create log directory
    mkdir -p "$BACKUP_ROOT"

    log_info "Starting backup process..."
    log_info "Backup directory: $BACKUP_DIR"

    # Run backup steps
    load_environment
    check_prerequisites
    create_backup_directory
    backup_database
    backup_object_storage
    backup_redis
    backup_configurations
    create_manifest
    calculate_backup_size
    create_archive
    cleanup_old_backups
    upload_to_remote

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local duration_formatted
    duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    log_success "Backup completed successfully!"
    log_info "Duration: $duration_formatted"
    log_info "Backup location: ${BACKUP_ROOT}/backup-${TIMESTAMP}.tar.gz"
    log_info "Log file: $LOG_FILE"
    echo "╚════════════════════════════════════════════════════════════════╝"

    # Send success notification
    send_notification "success" "Backup completed successfully in $duration_formatted"

    exit 0
}

# Trap errors
trap 'error_exit "Script interrupted or failed"' ERR INT TERM

# Run main function
main "$@"
