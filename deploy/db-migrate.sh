#!/bin/bash
# =============================================================================
# GigaChad GRC - Database Migration Management Script
# =============================================================================
# This script manages database migrations for GigaChad GRC
# Usage: ./deploy/db-migrate.sh [command]
#
# Commands:
#   status    - Show migration status
#   migrate   - Run pending migrations
#   rollback  - Rollback the last migration batch
#   reset     - Reset all migrations (DANGEROUS!)
#   seed      - Run database seeders
#   refresh   - Reset and re-run all migrations (DANGEROUS!)
#   backup    - Create a backup before migration
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
elif [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Default values
DB_HOST=${POSTGRES_HOST:-postgres}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-gigachad_grc}
DB_USER=${POSTGRES_USER:-grc}
DB_PASS=${POSTGRES_PASSWORD:?POSTGRES_PASSWORD environment variable is required}
BACKUP_DIR=${BACKUP_DIR:-./backups}

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

confirm_action() {
    read -p "Are you sure you want to proceed? (yes/no): " response
    if [ "$response" != "yes" ]; then
        log_info "Operation cancelled"
        exit 0
    fi
}

wait_for_db() {
    log_info "Waiting for database connection..."
    for i in {1..30}; do
        if docker exec grc-postgres pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
            log_success "Database is ready"
            return 0
        fi
        sleep 1
    done
    log_error "Database connection timeout"
    exit 1
}

# =============================================================================
# Migration Functions
# =============================================================================

show_status() {
    log_info "Checking migration status..."
    
    # Check if migrations table exists
    TABLE_EXISTS=$(docker exec grc-postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_prisma_migrations');")
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        log_info "Applied migrations:"
        docker exec grc-postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
            "SELECT id, migration_name, finished_at, applied_steps_count 
             FROM _prisma_migrations 
             ORDER BY finished_at DESC 
             LIMIT 10;"
    else
        log_warn "No migrations have been applied yet"
    fi
    
    # Check for pending init scripts
    log_info "Database init scripts in queue:"
    ls -la database/init/*.sql 2>/dev/null || echo "  No init scripts found"
}

run_migrations() {
    log_info "Running database migrations..."
    
    wait_for_db

    # All services share one canonical schema. Apply it once and fail closed;
    # swallowing migration errors can start the platform on a partial schema.
    DATABASE_URL=${MIGRATION_DATABASE_URL:-"postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"} \
        ./deploy/prisma-migrate-safe.sh

    log_success "Migrations completed"
}

run_rollback() {
    log_warn "⚠️  Rolling back migrations is a destructive operation!"
    log_warn "This will rollback the last migration batch."
    confirm_action
    
    wait_for_db
    
    # Note: Prisma doesn't support direct rollback in production
    # This is a placeholder for manual rollback process
    log_info "To rollback migrations, you need to:"
    echo "  1. Create a backup first: ./deploy/db-migrate.sh backup"
    echo "  2. Manually run rollback SQL scripts"
    echo "  3. Or restore from backup: ./deploy/restore.sh"
    
    log_warn "Prisma migrate does not support direct rollback."
    log_info "Consider using: npx prisma migrate resolve --rolled-back <migration_name>"
}

reset_database() {
    log_error "⚠️  THIS WILL DELETE ALL DATA IN THE DATABASE!"
    log_warn "This operation cannot be undone."
    confirm_action
    
    read -p "Type 'RESET DATABASE' to confirm: " confirm
    if [ "$confirm" != "RESET DATABASE" ]; then
        log_info "Operation cancelled"
        exit 0
    fi
    
    wait_for_db
    
    log_info "Creating backup before reset..."
    create_backup
    
    log_info "Resetting database..."
    
    # Drop and recreate database
    docker exec grc-postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec grc-postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    
    log_success "Database reset complete"
    log_info "Run './deploy/db-migrate.sh migrate' to apply migrations"
}

run_seeders() {
    log_info "Running database seeders..."
    
    wait_for_db
    
    # Check for seed script
    if [ -f "scripts/seed-database.ts" ]; then
        cd scripts
        npx ts-node seed-database.ts
        cd ..
        log_success "Seeders completed"
    else
        log_warn "No seed script found at scripts/seed-database.ts"
    fi
}

refresh_database() {
    log_error "⚠️  THIS WILL RESET AND RE-MIGRATE THE DATABASE!"
    log_warn "All data will be lost."
    confirm_action
    
    reset_database
    run_migrations
    run_seeders
    
    log_success "Database refresh complete"
}

create_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/pre_migration_$TIMESTAMP.sql.gz"
    
    mkdir -p "$BACKUP_DIR"
    
    log_info "Creating backup: $BACKUP_FILE"
    
    docker exec grc-postgres pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        log_error "Backup failed"
        exit 1
    fi
}

apply_init_scripts() {
    log_info "Applying database init scripts..."
    
    wait_for_db
    
    INIT_DIR="database/init"
    
    if [ ! -d "$INIT_DIR" ]; then
        log_warn "No init directory found"
        return
    fi
    
    for script in $(ls "$INIT_DIR"/*.sql 2>/dev/null | sort); do
        SCRIPT_NAME=$(basename "$script")
        log_info "Applying: $SCRIPT_NAME"
        
        docker exec -i grc-postgres psql -U "$DB_USER" -d "$DB_NAME" < "$script"
        
        log_success "Applied: $SCRIPT_NAME"
    done
    
    log_success "All init scripts applied"
}

# =============================================================================
# Main Script
# =============================================================================

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          GigaChad GRC - Database Migration Tool                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

case "$1" in
    status)
        show_status
        ;;
    migrate)
        run_migrations
        ;;
    rollback)
        run_rollback
        ;;
    reset)
        reset_database
        ;;
    seed)
        run_seeders
        ;;
    refresh)
        refresh_database
        ;;
    backup)
        create_backup
        ;;
    init)
        apply_init_scripts
        ;;
    *)
        echo "Usage: $0 {status|migrate|rollback|reset|seed|refresh|backup|init}"
        echo ""
        echo "Commands:"
        echo "  status    - Show migration status"
        echo "  migrate   - Run pending migrations"
        echo "  rollback  - Rollback guidance (Prisma doesn't support direct rollback)"
        echo "  reset     - Reset all migrations (DANGEROUS!)"
        echo "  seed      - Run database seeders"
        echo "  refresh   - Reset and re-run all migrations (DANGEROUS!)"
        echo "  backup    - Create a backup before migration"
        echo "  init      - Apply database init scripts"
        exit 1
        ;;
esac

echo ""
log_info "Done."





