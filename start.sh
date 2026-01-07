#!/bin/bash
# =============================================================================
# GigaChad GRC - One-Command Start
# =============================================================================
#
# USAGE:
#   ./start.sh         Start all services
#   ./start.sh stop    Stop all services
#   ./start.sh logs    View logs
#   ./start.sh status  Check service status
#
# REQUIREMENTS:
#   - Docker Desktop installed and running
#
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}║   ${BOLD}🏋️ GigaChad GRC${NC}${CYAN}                                              ║${NC}"
    echo -e "${CYAN}║                                                               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed.${NC}"
        echo ""
        echo "Please install Docker Desktop:"
        echo "  https://www.docker.com/products/docker-desktop"
        echo ""
        exit 1
    fi

    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running.${NC}"
        echo ""
        echo "Please start Docker Desktop and try again."
        echo ""
        exit 1
    fi
}

setup_env() {
    # Check if .env exists
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓${NC} Using existing .env file"
        return 0
    fi

    echo -e "${YELLOW}⚠${NC} No .env file found - generating secure secrets..."

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

# Frontend
VITE_API_URL=http://localhost:3001
VITE_ENABLE_DEV_AUTH=true
VITE_ENABLE_AI_MODULE=true
EOF

    chmod 600 ".env"
    echo -e "${GREEN}✓${NC} Created .env with secure secrets"
}

start_services() {
    print_banner
    check_docker
    setup_env

    echo ""
    echo -e "${BLUE}Starting GigaChad GRC...${NC}"
    echo ""
    echo "This may take a few minutes on first run while Docker builds the images."
    echo ""

    # Start all services
    docker compose up -d --build

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║   ${BOLD}🎉 GigaChad GRC is Starting!${NC}${GREEN}                                ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Access Points:${NC}"
    echo -e "   ${CYAN}Frontend${NC}        http://localhost:3000"
    echo -e "   ${CYAN}API Docs${NC}        http://localhost:3001/api/docs"
    echo -e "   ${CYAN}Keycloak${NC}        http://localhost:8080 (admin/admin)"
    echo -e "   ${CYAN}Grafana${NC}         http://localhost:3003 (admin/admin)"
    echo ""
    echo -e "${BOLD}How to Login:${NC}"
    echo -e "   1. Go to ${CYAN}http://localhost:3000${NC}"
    echo -e "   2. Click the ${CYAN}\"Dev Login\"${NC} button"
    echo -e "   3. You're in! No password needed."
    echo ""
    echo -e "${YELLOW}Note:${NC} First startup takes 2-3 minutes for database initialization."
    echo ""
    echo -e "${BOLD}Commands:${NC}"
    echo -e "   ${CYAN}./start.sh stop${NC}    Stop all services"
    echo -e "   ${CYAN}./start.sh logs${NC}    View logs"
    echo -e "   ${CYAN}./start.sh status${NC}  Check service status"
    echo ""

    # Open browser on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${YELLOW}Opening browser in 10 seconds...${NC}"
        (sleep 10 && open http://localhost:3000 2>/dev/null) &
    fi
}

stop_services() {
    print_banner
    echo -e "${YELLOW}Stopping GigaChad GRC...${NC}"
    docker compose down
    echo -e "${GREEN}✓ All services stopped${NC}"
    echo ""
}

show_logs() {
    docker compose logs -f
}

show_status() {
    print_banner
    echo -e "${BOLD}Service Status:${NC}"
    echo ""
    docker compose ps
    echo ""
}

# Main
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: ./start.sh [start|stop|logs|status]"
        echo ""
        echo "Commands:"
        echo "  start   Start all services (default)"
        echo "  stop    Stop all services"
        echo "  logs    View service logs"
        echo "  status  Check service status"
        exit 1
        ;;
esac








