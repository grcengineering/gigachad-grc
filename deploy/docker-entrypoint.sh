#!/bin/bash

################################################################################
# GigaChad GRC - Docker Entrypoint Script
################################################################################
#
# This entrypoint script handles:
# - Initial setup validation
# - Automatic backup scheduling (optional)
# - Database migrations
# - Health check initialization
#
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${CYAN}[ENTRYPOINT]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[ENTRYPOINT]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[ENTRYPOINT]${NC} $1"
}

log_error() {
    echo -e "${RED}[ENTRYPOINT]${NC} $1"
}

################################################################################
# Configuration
################################################################################

AUTO_BACKUP_ENABLED="${AUTO_BACKUP_ENABLED:-false}"
AUTO_BACKUP_SCHEDULE="${AUTO_BACKUP_SCHEDULE:-0 2 * * *}"  # Default: 2 AM daily
AUTO_MIGRATE="${AUTO_MIGRATE:-true}"
WAIT_FOR_DB="${WAIT_FOR_DB:-true}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"

################################################################################
# Wait for Dependencies
################################################################################

wait_for_postgres() {
    if [ "$WAIT_FOR_DB" != "true" ]; then
        return 0
    fi

    log_info "Waiting for PostgreSQL to be ready..."
    
    local count=0
    local max_tries=$DB_WAIT_TIMEOUT
    
    # Extract host and port from DATABASE_URL
    # Format: postgresql://user:pass@host:port/db
    if [ -n "${DATABASE_URL:-}" ]; then
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_HOST="${DB_HOST:-postgres}"
        DB_PORT="${DB_PORT:-5432}"
    else
        DB_HOST="${POSTGRES_HOST:-postgres}"
        DB_PORT="${POSTGRES_PORT:-5432}"
    fi
    
    while [ $count -lt $max_tries ]; do
        if pg_isready -h "$DB_HOST" -p "$DB_PORT" -q 2>/dev/null; then
            log_success "PostgreSQL is ready"
            return 0
        fi
        
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Still waiting for PostgreSQL... ($count/$max_tries)"
        fi
        sleep 1
    done
    
    log_error "PostgreSQL did not become ready in time"
    return 1
}

wait_for_redis() {
    if [ -z "${REDIS_URL:-}" ] && [ -z "${REDIS_HOST:-}" ]; then
        return 0
    fi
    
    log_info "Waiting for Redis to be ready..."
    
    local count=0
    local max_tries=30
    
    REDIS_HOST="${REDIS_HOST:-redis}"
    REDIS_PORT="${REDIS_PORT:-6379}"
    
    while [ $count -lt $max_tries ]; do
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
            log_success "Redis is ready"
            return 0
        fi
        
        count=$((count + 1))
        sleep 1
    done
    
    log_warn "Redis did not respond (non-critical, continuing...)"
    return 0
}

################################################################################
# Database Migrations
################################################################################

run_migrations() {
    if [ "$AUTO_MIGRATE" != "true" ]; then
        log_info "Auto-migration disabled, skipping..."
        return 0
    fi
    
    log_info "Running database migrations..."
    
    if [ -x "/app/deploy/prisma-migrate-safe.sh" ]; then
        /app/deploy/prisma-migrate-safe.sh
        log_success "Migrations complete"
    else
        log_error "Safe migration wrapper not found"
        return 1
    fi
}

################################################################################
# Backup Scheduling
################################################################################

setup_backup_cron() {
    if [ "$AUTO_BACKUP_ENABLED" != "true" ]; then
        log_info "Auto-backup scheduling disabled"
        return 0
    fi
    
    log_info "Setting up automatic backup schedule: $AUTO_BACKUP_SCHEDULE"
    
    # Check if cron is available
    if ! command -v crontab &> /dev/null; then
        log_warn "cron not available in this container, backup scheduling skipped"
        log_warn "To enable backups, use host-level cron or a sidecar container"
        return 0
    fi
    
    # Create backup cron job
    BACKUP_SCRIPT="/app/deploy/backup.sh"
    BACKUP_LOG="/var/log/grc-backup.log"
    
    if [ -f "$BACKUP_SCRIPT" ]; then
        # Add cron job
        (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT"; echo "$AUTO_BACKUP_SCHEDULE $BACKUP_SCRIPT >> $BACKUP_LOG 2>&1") | crontab -
        
        # Start cron daemon if not running
        if command -v crond &> /dev/null; then
            crond
        elif command -v cron &> /dev/null; then
            cron
        fi
        
        log_success "Backup cron job installed: $AUTO_BACKUP_SCHEDULE"
    else
        log_warn "Backup script not found at $BACKUP_SCRIPT"
    fi
}

################################################################################
# Production Warnings
################################################################################

check_production_config() {
    if [ "${NODE_ENV:-development}" != "production" ]; then
        return 0
    fi
    
    log_info "Running production configuration checks..."
    
    local warnings=0
    
    # Check for default passwords
    if [ "${POSTGRES_PASSWORD:-}" = "grc_secret" ]; then
        log_warn "⚠️  POSTGRES_PASSWORD is using default value!"
        warnings=$((warnings + 1))
    fi
    
    if [ "${REDIS_PASSWORD:-}" = "redis_secret" ]; then
        log_warn "⚠️  REDIS_PASSWORD is using default value!"
        warnings=$((warnings + 1))
    fi
    
    if [ "${MINIO_ROOT_PASSWORD:-}" = "minioadmin" ] || [ "${MINIO_ROOT_PASSWORD:-}" = "rustfsadmin" ]; then
        log_warn "⚠️  MINIO_ROOT_PASSWORD is using default value!"
        warnings=$((warnings + 1))
    fi
    
    # Check for encryption key
    if [ -z "${ENCRYPTION_KEY:-}" ]; then
        log_warn "⚠️  ENCRYPTION_KEY is not set!"
        warnings=$((warnings + 1))
    fi
    
    # Check for Keycloak
    if [ -z "${KEYCLOAK_URL:-}" ]; then
        log_warn "⚠️  KEYCLOAK_URL is not configured!"
        warnings=$((warnings + 1))
    fi
    
    # Check for backup configuration
    if [ "${DR_REMOTE_BACKUP_ENABLED:-false}" != "true" ]; then
        log_warn "⚠️  Remote backup is not enabled (DR_REMOTE_BACKUP_ENABLED)"
        warnings=$((warnings + 1))
    fi
    
    if [ $warnings -gt 0 ]; then
        echo ""
        log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log_warn " $warnings production configuration warning(s) detected!"
        log_warn " Run 'npm run validate:production' for detailed recommendations"
        log_warn "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        log_success "Production configuration checks passed"
    fi
}

################################################################################
# Startup Banner
################################################################################

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║   ██████╗ ██╗ ██████╗  █████╗  ██████╗██╗  ██╗ █████╗ ██████╗ ║${NC}"
    echo -e "${CYAN}║  ██╔════╝ ██║██╔════╝ ██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗║${NC}"
    echo -e "${CYAN}║  ██║  ███╗██║██║  ███╗███████║██║     ███████║███████║██║  ██║║${NC}"
    echo -e "${CYAN}║  ██║   ██║██║██║   ██║██╔══██║██║     ██╔══██║██╔══██║██║  ██║║${NC}"
    echo -e "${CYAN}║  ╚██████╔╝██║╚██████╔╝██║  ██║╚██████╗██║  ██║██║  ██║██████╔╝║${NC}"
    echo -e "${CYAN}║   ╚═════╝ ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ║${NC}"
    echo -e "${CYAN}║                           GRC Platform                        ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}Environment:${NC} ${NODE_ENV:-development}"
    echo -e "  ${GREEN}Service:${NC}     ${SERVICE_NAME:-controls}"
    echo -e "  ${GREEN}Version:${NC}     ${APP_VERSION:-1.0.0}"
    echo ""
}

################################################################################
# Health Check File
################################################################################

create_health_file() {
    # Create a file that can be used by health checks to verify startup
    mkdir -p /tmp/health
    echo "started" > /tmp/health/startup
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > /tmp/health/startup_time
}

################################################################################
# Main
################################################################################

main() {
    print_banner
    
    # Wait for dependencies
    wait_for_postgres
    wait_for_redis
    
    # Run migrations
    run_migrations
    
    # Setup backup scheduling
    setup_backup_cron
    
    # Check production configuration
    check_production_config
    
    # Create health check file
    create_health_file
    
    log_success "Initialization complete, starting application..."
    echo ""
    
    # Execute the main command
    exec "$@"
}

# Run main with all arguments
main "$@"

