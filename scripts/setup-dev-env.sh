#!/bin/bash

################################################################################
# GigaChad GRC - Development Environment Setup Script
################################################################################
#
# This script sets up a secure development environment by:
# 1. Generating secure secrets (if not already present)
# 2. Creating/updating the .env file
# 3. Restarting Docker containers with new configuration
#
# Usage: ./scripts/setup-dev-env.sh [--reset]
#
# Options:
#   --reset    Regenerate all secrets even if .env exists
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Flags
RESET_MODE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --reset)
            RESET_MODE=true
            shift
            ;;
    esac
done

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       GigaChad GRC Development Environment Setup             ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_DIR"

# Check if .env exists
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ] && [ "$RESET_MODE" = false ]; then
    echo -e "${YELLOW}[INFO]${NC} .env file already exists"
    echo -e "${YELLOW}[INFO]${NC} Use --reset to regenerate secrets"
    # Migrate: append Infisical bootstrap secrets if missing from older .env
    if ! grep -q '^INFISICAL_ENCRYPTION_KEY=' "$ENV_FILE" 2>/dev/null; then
        echo -e "${GREEN}[SETUP]${NC} Adding missing Infisical secrets to existing .env..."
        INF_ENC_KEY=$(openssl rand -hex 16)
        INF_AUTH_SEC=$(openssl rand -base64 32 | tr -d '\n')
        cat >> "$ENV_FILE" << INFISICAL_EOF

# Infisical Secrets Manager (auto-added)
INFISICAL_ENCRYPTION_KEY=${INF_ENC_KEY}
INFISICAL_AUTH_SECRET=${INF_AUTH_SEC}
INFISICAL_EOF
        echo -e "${GREEN}[SUCCESS]${NC} Infisical bootstrap secrets added to .env"
    fi
    echo ""
    read -p "Continue with existing .env? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}[ABORT]${NC} Setup cancelled"
        exit 1
    fi
else
    echo -e "${GREEN}[SETUP]${NC} Generating secure secrets..."
    
    # Generate secrets
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr '+/' '-_')
    REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr '+/' '-_')
    MINIO_PASSWORD=$(openssl rand -base64 20 | tr -d '\n' | tr '+/' '-_')
    INFISICAL_ENCRYPTION_KEY=$(openssl rand -hex 16)
    INFISICAL_AUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')

    echo -e "${GREEN}[SETUP]${NC} Creating .env file..."
    
    cat > "$ENV_FILE" << EOF
# ============================================================================
# GigaChad GRC - Development Environment
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ============================================================================

NODE_ENV=development

# Security Secrets
ENCRYPTION_KEY=${ENCRYPTION_KEY}
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Database
POSTGRES_USER=grc
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=gigachad_grc
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
DATABASE_URL=postgresql://grc:${POSTGRES_PASSWORD}@localhost:5433/gigachad_grc

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6380

# RustFS (S3-Compatible Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ROOT_USER=rustfsadmin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
MINIO_ACCESS_KEY=rustfsadmin
MINIO_SECRET_KEY=${MINIO_PASSWORD}

# Authentication
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-app
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
USE_DEV_AUTH=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Backup
BACKUP_RETENTION_DAYS=30
DR_REMOTE_BACKUP_ENABLED=false

# Infisical Secrets Manager
INFISICAL_ENCRYPTION_KEY=${INFISICAL_ENCRYPTION_KEY}
INFISICAL_AUTH_SECRET=${INFISICAL_AUTH_SECRET}

# Logging
LOG_LEVEL=debug

# Frontend
VITE_API_URL=http://localhost:3001
VITE_ENABLE_AI_MODULE=true
EOF

    chmod 600 "$ENV_FILE"
    echo -e "${GREEN}[SUCCESS]${NC} .env file created with secure secrets"
fi

# Update Docker Compose environment
echo ""
echo -e "${BLUE}[INFO]${NC} Checking Docker containers..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}[WARN]${NC} Docker is not running. Please start Docker and run:"
    echo -e "       docker compose up -d"
    exit 0
fi

# Check if we need to update containers
CONTAINERS_RUNNING=$(docker compose ps --services --filter "status=running" 2>/dev/null | wc -l | tr -d ' ')

if [ "$CONTAINERS_RUNNING" -gt 0 ]; then
    echo -e "${YELLOW}[INFO]${NC} $CONTAINERS_RUNNING containers are running"
    
    if [ "$RESET_MODE" = true ]; then
        echo -e "${BLUE}[INFO]${NC} Recreating containers with new secrets..."
        docker compose down
        docker compose up -d
        echo -e "${GREEN}[SUCCESS]${NC} Containers recreated"
    else
        echo -e "${BLUE}[INFO]${NC} To apply new environment variables, run:"
        echo -e "       docker compose down && docker compose up -d"
    fi
else
    echo -e "${BLUE}[INFO]${NC} No containers running. Start with:"
    echo -e "       docker compose up -d"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Setup Complete!                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Start services:     ${CYAN}docker compose up -d${NC}"
echo -e "  2. Start frontend:     ${CYAN}cd frontend && npm run dev${NC}"
echo -e "  3. Access app:         ${CYAN}http://localhost:5173${NC}"
echo ""
echo -e "Validate production readiness:"
echo -e "  ${CYAN}npm run validate:production${NC}"
echo ""

