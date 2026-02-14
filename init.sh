#!/bin/bash
#
# ============================================================================
# GigaChad GRC - Universal Initialization Script
# ============================================================================
#
# The ONE command to rule them all. This script gets you from zero to running
# in a single command, handling all environment setup, dependencies, database
# initialization, and service startup.
#
# USAGE:
#   ./init.sh              # Interactive mode (asks what you want)
#   ./init.sh demo         # Start demo mode (Docker + frontend)
#   ./init.sh dev          # Set up local development environment
#   ./init.sh docker       # Start all services via Docker
#   ./init.sh reset        # Reset everything and start fresh
#
# ============================================================================

set -e

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Services to manage
SERVICES=(shared controls frameworks policies tprm trust audit)
INFRASTRUCTURE=(postgres redis keycloak rustfs)

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                   ║${NC}"
    echo -e "${CYAN}║   ${BOLD}🏋️ GigaChad GRC - Universal Initializer${NC}${CYAN}                        ║${NC}"
    echo -e "${CYAN}║                                                                   ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_step() {
    echo -e "\n${BLUE}▸${NC} ${BOLD}$1${NC}"
}

log_substep() {
    echo -e "  ${CYAN}→${NC} $1"
}

log_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "  ${RED}✗${NC} $1"
}

log_info() {
    echo -e "  ${MAGENTA}ℹ${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Prerequisite Checks
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local missing=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing+=("Docker (https://docker.com/get-started)")
    elif ! docker info &> /dev/null 2>&1; then
        log_error "Docker is installed but not running. Please start Docker Desktop."
        exit 1
    else
        log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
    fi
    
    # Check Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose $(docker compose version --short)"
    elif command -v docker-compose &> /dev/null; then
        log_success "docker-compose $(docker-compose --version | cut -d' ' -f4 | tr -d ',')"
    else
        missing+=("Docker Compose")
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log_success "Node.js $(node --version)"
        else
            log_warning "Node.js $(node --version) (v18+ recommended)"
        fi
    else
        missing+=("Node.js 18+ (https://nodejs.org)")
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        log_success "npm $(npm --version)"
    else
        missing+=("npm")
    fi
    
    # Check Git (optional but helpful)
    if command -v git &> /dev/null; then
        log_success "Git $(git --version | cut -d' ' -f3)"
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        log_error "Missing required tools:"
        for tool in "${missing[@]}"; do
            echo -e "       ${RED}•${NC} $tool"
        done
        echo ""
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Environment Setup
# ─────────────────────────────────────────────────────────────────────────────

setup_environment() {
    log_step "Setting up environment..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f ".env" ]; then
        log_success ".env file exists (using existing credentials)"
        # Source the existing .env to get passwords for health checks
        set -a
        source .env 2>/dev/null || true
        set +a
        return 0
    fi
    
    # Check if PostgreSQL volume already exists with data
    if docker volume inspect gigachad-grc_postgres_data > /dev/null 2>&1; then
        log_warning "PostgreSQL volume exists but no .env file found!"
        log_info "This may cause authentication issues."
        log_info "Run './init.sh reset' first, or restore your .env file."
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted. Run './init.sh reset' to start fresh."
            exit 1
        fi
    fi
    
    log_substep "Generating secure secrets..."
    
    # Generate secrets
    ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | tr -d '\n')
    JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '\n')
    SESSION_SECRET=$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '\n')
    POSTGRES_PASSWORD=$(openssl rand -base64 24 2>/dev/null | tr -d '\n' | tr '+/' '-_' || head -c 24 /dev/urandom | base64 | tr '+/' '-_')
    REDIS_PASSWORD=$(openssl rand -base64 24 2>/dev/null | tr -d '\n' | tr '+/' '-_' || head -c 24 /dev/urandom | base64 | tr '+/' '-_')
    MINIO_PASSWORD=$(openssl rand -base64 20 2>/dev/null | tr -d '\n' | tr '+/' '-_' || head -c 20 /dev/urandom | base64 | tr '+/' '-_')

    cat > ".env" << EOF
# ============================================================================
# GigaChad GRC - Environment Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ============================================================================

NODE_ENV=development

# Security Secrets (auto-generated)
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Database
POSTGRES_USER=grc
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=gigachad_grc
DATABASE_URL=postgresql://grc:${POSTGRES_PASSWORD}@localhost:5433/gigachad_grc

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6380

# RustFS (S3-Compatible Object Storage)
# https://github.com/rustfs/rustfs
MINIO_ROOT_USER=rustfsadmin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
MINIO_ENDPOINT=localhost
MINIO_PORT=9000

# Authentication
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REALM=gigachad-grc
USE_DEV_AUTH=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=debug

# Secrets Management
SECRETS_PROVIDER=env
# SECRETS_CACHE_TTL=300

# Frontend
VITE_API_URL=http://localhost:3001
VITE_ENABLE_DEV_AUTH=true
VITE_ENABLE_AI_MODULE=true
EOF

    chmod 600 ".env"
    log_success "Created .env with secure secrets"
}

# ─────────────────────────────────────────────────────────────────────────────
# Docker Infrastructure
# ─────────────────────────────────────────────────────────────────────────────

start_infrastructure() {
    log_step "Starting infrastructure services..."
    
    cd "$PROJECT_ROOT"
    
    log_substep "Starting PostgreSQL, Redis, Keycloak, RustFS..."
    docker compose up -d postgres redis keycloak rustfs 2>/dev/null || docker-compose up -d postgres redis keycloak rustfs
    
    # Wait for database
    log_substep "Waiting for PostgreSQL to be ready..."
    local attempts=0
    local max_attempts=30
    while [ $attempts -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U grc > /dev/null 2>&1; then
            log_success "PostgreSQL is ready"
            break
        fi
        attempts=$((attempts + 1))
        if [ $attempts -eq $max_attempts ]; then
            log_error "PostgreSQL failed to start"
            exit 1
        fi
        sleep 2
    done
    
    # Wait for Redis
    log_substep "Waiting for Redis to be ready..."
    attempts=0
    while [ $attempts -lt $max_attempts ]; do
        if docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-redis_secret}" ping > /dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        attempts=$((attempts + 1))
        sleep 1
    done
    
    # Wait for RustFS
    log_substep "Waiting for RustFS to be ready..."
    attempts=0
    while [ $attempts -lt 15 ]; do
        if curl -sf http://localhost:9000/health/live > /dev/null 2>&1 || curl -sf http://localhost:9001 > /dev/null 2>&1; then
            log_success "RustFS is ready"
            break
        fi
        attempts=$((attempts + 1))
        sleep 2
    done
    
    log_success "All infrastructure services running"
}

start_app_services() {
    log_step "Starting application services..."
    
    cd "$PROJECT_ROOT"
    
    log_substep "Building and starting Controls, Frameworks, Policies, TPRM, Trust, Audit..."
    docker compose up -d controls frameworks policies tprm trust audit 2>/dev/null || docker-compose up -d controls frameworks policies tprm trust audit
    
    # Wait for Controls API (primary service)
    log_substep "Waiting for API to be ready..."
    local attempts=0
    local max_attempts=60
    while [ $attempts -lt $max_attempts ]; do
        if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
            log_success "API services are ready"
            break
        fi
        attempts=$((attempts + 1))
        if [ $attempts -eq $max_attempts ]; then
            log_warning "API not responding yet - services may still be building"
            log_info "Check logs with: docker compose logs -f controls"
        fi
        sleep 2
    done
}

# ─────────────────────────────────────────────────────────────────────────────
# Local Development Setup
# ─────────────────────────────────────────────────────────────────────────────

install_dependencies() {
    log_step "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Root dependencies
    if [ -f "package.json" ]; then
        log_substep "Installing root dependencies..."
        npm install --silent 2>/dev/null || npm install
        log_success "Root dependencies"
    fi
    
    # Shared library (must be first)
    log_substep "Installing shared library..."
    cd "$PROJECT_ROOT/services/shared"
    npm install --silent 2>/dev/null || npm install
    if [ -f "tsconfig.json" ]; then
        npm run build 2>/dev/null || true
    fi
    log_success "services/shared"
    
    # Service dependencies
    for service in controls frameworks policies tprm trust audit; do
        log_substep "Installing $service service..."
        cd "$PROJECT_ROOT/services/$service"
        npm install --silent 2>/dev/null || npm install
        
        # Generate Prisma client if needed
        if [ -f "node_modules/.prisma/client/index.js" ] 2>/dev/null; then
            log_success "services/$service (Prisma client exists)"
        elif [ -f "package.json" ] && grep -q "prisma" "package.json" 2>/dev/null; then
            npx prisma generate 2>/dev/null || true
            log_success "services/$service (Prisma generated)"
        else
            log_success "services/$service"
        fi
    done
    
    # Frontend
    log_substep "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install --silent 2>/dev/null || npm install
    log_success "frontend"
    
    # Scripts
    if [ -f "$PROJECT_ROOT/scripts/package.json" ]; then
        log_substep "Installing script dependencies..."
        cd "$PROJECT_ROOT/scripts"
        npm install --silent 2>/dev/null || npm install
        log_success "scripts"
    fi
    
    cd "$PROJECT_ROOT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Frontend
# ─────────────────────────────────────────────────────────────────────────────

start_frontend() {
    log_step "Starting frontend..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Install if needed
    if [ ! -d "node_modules" ]; then
        log_substep "Installing frontend dependencies..."
        npm install --silent 2>/dev/null || npm install
    fi
    
    log_substep "Starting Vite development server..."
    VITE_ENABLE_DEV_AUTH=true npm run dev &
    FRONTEND_PID=$!
    
    # Wait for frontend
    local attempts=0
    while [ $attempts -lt 20 ]; do
        if curl -sf http://localhost:3000 > /dev/null 2>&1 || curl -sf http://localhost:5173 > /dev/null 2>&1; then
            log_success "Frontend is ready"
            break
        fi
        attempts=$((attempts + 1))
        sleep 2
    done
    
    cd "$PROJECT_ROOT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Reset
# ─────────────────────────────────────────────────────────────────────────────

reset_all() {
    log_step "Resetting everything..."
    
    cd "$PROJECT_ROOT"
    
    log_warning "This will remove all containers, volumes, and generated files!"
    read -p "Are you sure? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted"
        exit 0
    fi
    
    log_substep "Stopping containers..."
    docker compose down -v 2>/dev/null || docker-compose down -v 2>/dev/null || true
    
    log_substep "Removing .env..."
    rm -f .env .infisical-initialized
    
    log_substep "Removing node_modules..."
    rm -rf node_modules
    rm -rf frontend/node_modules
    rm -rf scripts/node_modules
    for service in "${SERVICES[@]}"; do
        rm -rf "services/$service/node_modules"
    done
    
    log_success "Reset complete. Run './init.sh' to start fresh."
}

# ─────────────────────────────────────────────────────────────────────────────
# Print Status
# ─────────────────────────────────────────────────────────────────────────────

print_success_demo() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║   ${BOLD}🎉 GigaChad GRC is Ready!${NC}${GREEN}                                       ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Access Points:${NC}"
    echo -e "   ${CYAN}Frontend${NC}        http://localhost:3000 (or :5173)"
    echo -e "   ${CYAN}API Docs${NC}        http://localhost:3001/api/docs"
    echo -e "   ${CYAN}Keycloak${NC}        http://localhost:8080 (admin/admin)"
    echo -e "   ${CYAN}RustFS Console${NC}  http://localhost:9001 (rustfsadmin/...)"
    echo -e "   ${CYAN}Grafana${NC}         http://localhost:3003 (admin/admin)"
    echo ""
    echo -e "${BOLD}Quick Login:${NC}"
    echo -e "   Click the ${CYAN}\"Dev Login\"${NC} button - no password needed!"
    echo ""
    echo -e "${BOLD}Load Demo Data:${NC}"
    echo -e "   Settings → Organization → Demo Data → Load Demo Data"
    echo ""
    echo -e "${BOLD}Stop Everything:${NC}"
    echo -e "   ${CYAN}docker compose down${NC}"
    echo ""
}

print_success_dev() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}║   ${BOLD}🛠️  Development Environment Ready!${NC}${GREEN}                             ║${NC}"
    echo -e "${GREEN}║                                                                   ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Infrastructure Running:${NC}"
    echo "   PostgreSQL:5433, Redis:6380, Keycloak:8080, RustFS:9000"
    echo ""
    echo -e "${BOLD}Start Services:${NC}"
    echo "   ${CYAN}# Terminal 1 - Backend${NC}"
    echo "   cd services/controls && npm run start:dev"
    echo ""
    echo "   ${CYAN}# Terminal 2 - Frontend${NC}"
    echo "   cd frontend && npm run dev"
    echo ""
    echo -e "${BOLD}Or use the Makefile:${NC}"
    echo "   ${CYAN}make dev${NC}        # Start everything"
    echo "   ${CYAN}make logs${NC}       # View Docker logs"
    echo "   ${CYAN}make clean${NC}      # Stop and clean up"
    echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Mode Selection
# ─────────────────────────────────────────────────────────────────────────────

interactive_mode() {
    echo -e "${BOLD}What would you like to do?${NC}"
    echo ""
    echo -e "  ${CYAN}1)${NC} ${BOLD}Demo Mode${NC}     - One-click demo, everything in Docker + frontend"
    echo -e "  ${CYAN}2)${NC} ${BOLD}Dev Mode${NC}      - Set up for local development (install deps, start infra)"
    echo -e "  ${CYAN}3)${NC} ${BOLD}Docker Only${NC}   - Start all services in Docker"
    echo -e "  ${CYAN}4)${NC} ${BOLD}Reset${NC}         - Clean slate (remove containers, deps, .env)"
    echo ""
    read -p "Enter choice [1-4]: " choice
    
    case $choice in
        1) MODE="demo" ;;
        2) MODE="dev" ;;
        3) MODE="docker" ;;
        4) MODE="reset" ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    print_banner
    
    # Parse command line argument
    MODE="${1:-}"
    
    # If no mode specified, ask
    if [ -z "$MODE" ]; then
        interactive_mode
    fi
    
    case "$MODE" in
        demo)
            check_prerequisites
            setup_environment
            start_infrastructure
            start_app_services
            start_frontend
            print_success_demo
            
            echo -e "${YELLOW}Press Ctrl+C to stop...${NC}"
            
            # Open browser
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sleep 1 && open http://localhost:3000 2>/dev/null &
            elif command -v xdg-open &> /dev/null; then
                sleep 1 && xdg-open http://localhost:3000 2>/dev/null &
            fi
            
            # Wait for frontend process
            wait $FRONTEND_PID 2>/dev/null || true
            ;;
            
        dev)
            check_prerequisites
            setup_environment
            install_dependencies
            start_infrastructure
            print_success_dev
            ;;
            
        docker)
            check_prerequisites
            setup_environment
            start_infrastructure
            start_app_services
            print_success_demo
            ;;
            
        reset)
            reset_all
            ;;
            
        *)
            echo "Usage: ./init.sh [demo|dev|docker|reset]"
            echo ""
            echo "Modes:"
            echo "  demo    Start demo (Docker services + frontend)"
            echo "  dev     Set up local development environment"
            echo "  docker  Start all services via Docker"
            echo "  reset   Remove containers, volumes, and dependencies"
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
cleanup() {
    echo ""
    log_warning "Shutting down..."
    if [ -n "${FRONTEND_PID:-}" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo "Run 'docker compose down' to stop all services."
    exit 0
}

trap cleanup SIGINT SIGTERM

main "$@"

