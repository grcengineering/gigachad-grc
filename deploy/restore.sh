#!/bin/bash

################################################################################
# GigaChad GRC - Disaster Recovery Restore Script
################################################################################
#
# This script restores a complete backup of the GigaChad GRC system including:
# - PostgreSQL database
# - MinIO/S3 object storage
# - Configuration files
# - Docker volumes
#
# Usage: ./restore.sh <backup_file>
#        ./restore.sh /backups/gigachad-grc/backup-2025-12-05-020000.tar.gz
#
# WARNING: This will overwrite existing data!
#
# Prerequisites:
# - Docker and Docker Compose installed
# - Valid backup archive
# - Services should be stopped before restoration
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

# Docker Compose settings
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.prod"

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

    # Check if Docker is installed
    if ! command_exists docker; then
        error_exit "Docker is not installed. Please install Docker first."
    fi

    # Check if Docker Compose is installed
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed. Please install Docker Compose first."
    fi

    # Check if Docker daemon is running
    if ! docker ps >/dev/null 2>&1; then
        error_exit "Docker daemon is not running. Please start Docker first."
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

# Restore Docker volumes
restore_volumes() {
    log_step "Restoring Docker volumes..."

    # Load environment variables
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE" 2>/dev/null || true
    set +a

    # List of volumes to restore
    local volumes=(
        "gigachad-grc_postgres_data"
        "gigachad-grc_redis_data"
        "gigachad-grc_minio_data"
        "gigachad-grc_keycloak_data"
        "gigachad-grc_traefik_letsencrypt"
    )

    for volume in "${volumes[@]}"; do
        local volume_backup="${RESTORE_DIR}/volumes/${volume}.tar.gz"

        if [ -f "$volume_backup" ]; then
            log_info "Restoring volume: $volume"

            # Remove existing volume
            docker volume rm "$volume" 2>/dev/null || true

            # Create new volume
            docker volume create "$volume" >/dev/null \
                || error_exit "Failed to create volume: $volume"

            # Restore volume data
            docker run --rm \
                -v "$volume":/volume \
                -v "$RESTORE_DIR/volumes":/backup \
                alpine \
                tar -xzf "/backup/${volume}.tar.gz" -C /volume \
                || log_warning "Failed to restore volume: $volume"

            log_success "Volume restored: $volume"
        else
            log_warning "Volume backup not found: $volume"
        fi
    done

    log_success "Docker volumes restoration completed"
}

# Restore PostgreSQL database
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

    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    local retries=30
    local wait_time=2

    for ((i=1; i<=retries; i++)); do
        if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi

        if [ $i -eq $retries ]; then
            error_exit "PostgreSQL did not become ready in time"
        fi

        echo -n "."
        sleep $wait_time
    done
    echo ""

    # Drop existing database (if exists) and create new one
    log_info "Recreating database..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" \
        || log_warning "Failed to drop existing database"

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB};" \
        || error_exit "Failed to create database"

    # Restore database from custom dump (preferred)
    if [ -f "$RESTORE_DIR/postgres_backup.dump" ]; then
        log_info "Restoring from custom dump format..."
        cat "$RESTORE_DIR/postgres_backup.dump" | \
            docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            pg_restore -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists --no-owner --no-acl \
            || log_warning "Database restore completed with warnings"

    # Fallback to SQL dump
    elif [ -f "$RESTORE_DIR/postgres_backup.sql.gz" ]; then
        log_info "Restoring from SQL dump..."
        gunzip -c "$RESTORE_DIR/postgres_backup.sql.gz" | \
            docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            || log_warning "Database restore completed with warnings"

    elif [ -f "$RESTORE_DIR/postgres_backup.sql" ]; then
        log_info "Restoring from uncompressed SQL dump..."
        cat "$RESTORE_DIR/postgres_backup.sql" | \
            docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
            psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
            || log_warning "Database restore completed with warnings"

    else
        error_exit "No database backup found"
    fi

    # Verify database restoration
    log_info "Verifying database restoration..."
    local table_count
    table_count=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log_info "Tables restored: $table_count"

    log_success "Database restoration completed"
}

# Restore MinIO data
restore_minio() {
    log_step "Restoring MinIO data..."

    # Check if MinIO backup exists
    if [ ! -f "$RESTORE_DIR/minio_backup.tar.gz" ]; then
        log_warning "MinIO backup not found, skipping"
        return 0
    fi

    # Start MinIO service
    log_info "Starting MinIO service..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d minio \
        || error_exit "Failed to start MinIO service"

    # Wait for MinIO to be ready
    log_info "Waiting for MinIO to be ready..."
    sleep 10

    # Extract MinIO backup to temporary location
    local minio_temp_dir="${RESTORE_DIR}/minio_temp"
    mkdir -p "$minio_temp_dir"

    log_info "Extracting MinIO backup..."
    tar -xzf "$RESTORE_DIR/minio_backup.tar.gz" -C "$minio_temp_dir" \
        || error_exit "Failed to extract MinIO backup"

    # Copy data to MinIO container
    log_info "Copying data to MinIO container..."
    docker cp "$minio_temp_dir/data/." grc-minio:/data/ \
        || error_exit "Failed to copy MinIO data"

    # Restart MinIO to reload data
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart minio

    # Cleanup
    rm -rf "$minio_temp_dir"

    log_success "MinIO data restoration completed"
}

# Restore Redis data
restore_redis() {
    log_step "Restoring Redis data..."

    # Check if Redis backup exists
    if [ ! -f "$RESTORE_DIR/redis_backup.rdb" ]; then
        log_warning "Redis backup not found, skipping"
        return 0
    fi

    # Start Redis service
    log_info "Starting Redis service..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis \
        || error_exit "Failed to start Redis service"

    # Wait for Redis to be ready
    sleep 5

    # Copy Redis dump file
    log_info "Copying Redis dump file..."
    docker cp "$RESTORE_DIR/redis_backup.rdb" grc-redis:/data/dump.rdb \
        || error_exit "Failed to copy Redis dump"

    # Restart Redis to load data
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart redis

    log_success "Redis data restoration completed"
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

    # Check database connectivity
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_warning "Database may not be accessible"
    fi

    # Check Redis connectivity
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
        redis-cli -a "${REDIS_PASSWORD}" --no-auth-warning ping >/dev/null 2>&1; then
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
    restore_volumes
    restore_database
    restore_minio
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
