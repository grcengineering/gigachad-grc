#!/bin/bash

################################################################################
# GigaChad GRC - Automated Backup Script
################################################################################
#
# This script performs a complete backup of the GigaChad GRC system including:
# - PostgreSQL database
# - MinIO/S3 object storage
# - Configuration files
# - Docker volumes
#
# Usage: ./backup.sh [backup_directory]
#
# Prerequisites:
# - Docker and Docker Compose installed
# - Sufficient disk space for backups
# - Write permissions to backup directory
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

# Docker Compose settings
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.prod"

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

    if ! command_exists docker; then
        error_exit "Docker is not installed. Please install Docker first."
    fi

    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed. Please install Docker Compose first."
    fi

    if [ ! -f "$COMPOSE_FILE" ]; then
        error_exit "Docker Compose file not found: $COMPOSE_FILE"
    fi

    if [ ! -f "$ENV_FILE" ]; then
        error_exit "Environment file not found: $ENV_FILE"
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

    # Source environment file
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a

    # Set defaults if not defined
    POSTGRES_USER="${POSTGRES_USER:-grc_prod_user}"
    POSTGRES_DB="${POSTGRES_DB:-gigachad_grc_prod}"

    log_success "Environment variables loaded"
}

# Backup PostgreSQL database
backup_database() {
    log_info "Starting PostgreSQL database backup..."

    local db_backup_file="${BACKUP_DIR}/postgres_backup.sql.gz"
    local db_custom_backup="${BACKUP_DIR}/postgres_backup.dump"

    # SQL dump (compressed)
    log_info "Creating SQL dump..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F plain --clean --if-exists \
        | gzip -"$COMPRESSION_LEVEL" > "$db_backup_file" \
        || error_exit "Failed to create SQL dump"

    # Custom format dump (for faster restoration)
    log_info "Creating custom format dump..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F custom -Z "$COMPRESSION_LEVEL" \
        > "$db_custom_backup" \
        || error_exit "Failed to create custom format dump"

    # Get database size
    local db_size
    db_size=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$POSTGRES_DB'));" | xargs)

    log_success "Database backup completed (Size: $db_size)"
}

# Backup MinIO data
backup_minio() {
    log_info "Starting MinIO/S3 backup..."

    local minio_backup_dir="${BACKUP_DIR}/minio"
    mkdir -p "$minio_backup_dir"

    # Use docker cp to copy MinIO data
    log_info "Copying MinIO data..."
    docker cp grc-minio:/data "$minio_backup_dir/" \
        || log_warning "Failed to backup MinIO data (service may not be running)"

    # Compress MinIO backup
    log_info "Compressing MinIO data..."
    tar -czf "${BACKUP_DIR}/minio_backup.tar.gz" -C "$minio_backup_dir" data \
        || log_warning "Failed to compress MinIO backup"

    # Remove uncompressed directory
    rm -rf "$minio_backup_dir"

    log_success "MinIO backup completed"
}

# Backup Redis data (optional)
backup_redis() {
    log_info "Starting Redis backup..."

    local redis_backup_file="${BACKUP_DIR}/redis_backup.rdb"

    # Trigger Redis BGSAVE
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
        redis-cli -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE \
        || log_warning "Failed to trigger Redis BGSAVE"

    # Wait for BGSAVE to complete
    sleep 5

    # Copy Redis dump file
    docker cp grc-redis:/data/dump.rdb "$redis_backup_file" \
        || log_warning "Failed to backup Redis data"

    log_success "Redis backup completed"
}

# Backup configuration files
backup_configurations() {
    log_info "Starting configuration files backup..."

    local config_backup_dir="${BACKUP_DIR}/configs"
    mkdir -p "$config_backup_dir"

    # Copy configuration files
    cp "$ENV_FILE" "$config_backup_dir/.env.prod" 2>/dev/null || true
    cp "$COMPOSE_FILE" "$config_backup_dir/docker-compose.prod.yml" 2>/dev/null || true

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

# Backup Docker volumes
backup_volumes() {
    log_info "Starting Docker volumes backup..."

    local volumes_backup_dir="${BACKUP_DIR}/volumes"
    mkdir -p "$volumes_backup_dir"

    # List of volumes to backup
    local volumes=(
        "gigachad-grc_postgres_data"
        "gigachad-grc_redis_data"
        "gigachad-grc_minio_data"
        "gigachad-grc_keycloak_data"
        "gigachad-grc_traefik_letsencrypt"
    )

    for volume in "${volumes[@]}"; do
        if docker volume inspect "$volume" >/dev/null 2>&1; then
            log_info "Backing up volume: $volume"

            # Create a temporary container to access volume
            docker run --rm \
                -v "$volume":/volume \
                -v "$volumes_backup_dir":/backup \
                alpine \
                tar -czf "/backup/${volume}.tar.gz" -C /volume . \
                || log_warning "Failed to backup volume: $volume"
        else
            log_warning "Volume not found: $volume"
        fi
    done

    log_success "Docker volumes backup completed"
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."

    local manifest_file="${BACKUP_DIR}/manifest.json"

    # Get system information
    local hostname
    hostname=$(hostname)

    # Get Docker Compose version
    local compose_version
    if docker compose version >/dev/null 2>&1; then
        compose_version=$(docker compose version --short)
    else
        compose_version=$(docker-compose version --short)
    fi

    # Create manifest
    cat > "$manifest_file" << EOF
{
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_timestamp": "$TIMESTAMP",
  "hostname": "$hostname",
  "docker_compose_version": "$compose_version",
  "database": {
    "postgres_user": "$POSTGRES_USER",
    "postgres_db": "$POSTGRES_DB"
  },
  "files": {
    "database_sql": "postgres_backup.sql.gz",
    "database_dump": "postgres_backup.dump",
    "minio": "minio_backup.tar.gz",
    "redis": "redis_backup.rdb",
    "configs": "configs/",
    "volumes": "volumes/"
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
    check_prerequisites
    create_backup_directory
    load_environment
    backup_database
    backup_minio
    backup_redis
    backup_configurations
    backup_volumes
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
