#!/bin/bash
#
# ============================================================================
# GigaChad GRC - One-Click Demo Launcher
# ============================================================================
#
# This script starts the entire GigaChad GRC platform in demo mode, allowing
# you to explore all features with minimal setup.
#
# USAGE:
#   ./scripts/start-demo.sh
#
# PREREQUISITES:
#   - Docker Desktop installed and running
#   - Node.js 18+ installed
#   - Git (to clone the repository)
#
# WHAT THIS SCRIPT DOES:
#   1. Verifies Docker is running
#   2. Creates .env file from template if missing
#   3. Starts infrastructure (PostgreSQL, Redis, Keycloak, RustFS)
#   4. Waits for database to be ready
#   5. Starts all backend API services (Controls, Frameworks, Policies, etc.)
#   6. Installs frontend dependencies if needed
#   7. Starts the frontend development server with Dev Auth enabled
#   8. Opens your browser to the application
#
# STOPPING THE DEMO:
#   Press Ctrl+C to stop the frontend, then run:
#   docker compose down
#
# LOADING DEMO DATA:
#   After starting, go to Settings > Organization > Demo Data
#   Or call: POST http://localhost:3001/api/seed/load-demo
#
# ============================================================================

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Store the frontend PID globally for cleanup
FRONTEND_PID=""

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down demo...${NC}"
    
    # Kill frontend if running
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "  Stopping frontend..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    
    echo ""
    echo "Demo stopped. To fully stop all services, run:"
    echo "  docker compose down"
    echo ""
    exit 0
}

# Set up trap for Ctrl+C
trap cleanup SIGINT SIGTERM

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                               ║${NC}"
echo -e "${BLUE}║   ${GREEN}🚀 GigaChad GRC - One-Click Demo${BLUE}                            ║${NC}"
echo -e "${BLUE}║                                                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# STEP 1: Check Prerequisites
# ============================================================================

echo -e "${YELLOW}[1/7] Checking prerequisites...${NC}"

# Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running.${NC}"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi
echo -e "${GREEN}   ✓ Docker is running${NC}"

# Check Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    echo "   Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version too old (v${NODE_VERSION}).${NC}"
    echo "   Please install Node.js 18+: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}   ✓ Node.js $(node --version) installed${NC}"

# Check npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}   ✓ npm $(npm --version) installed${NC}"

# ============================================================================
# STEP 2: Setup Environment
# ============================================================================

echo ""
echo -e "${YELLOW}[2/7] Setting up environment...${NC}"

cd "$PROJECT_ROOT"

# Check if .env exists, create from development template if not
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "   Creating .env from template..."
        cp .env.example .env
        echo -e "${GREEN}   ✓ Created .env file${NC}"
    else
        echo -e "${YELLOW}   ⚠ No .env template found, using defaults${NC}"
    fi
else
    echo -e "${GREEN}   ✓ .env file exists${NC}"
fi

# Enable demo mode
export VITE_ENABLE_DEV_AUTH=true
echo -e "${GREEN}   ✓ Dev Auth mode enabled${NC}"

# ============================================================================
# STEP 3: Start Infrastructure Services
# ============================================================================

echo ""
echo -e "${YELLOW}[3/7] Starting infrastructure services...${NC}"
echo "   Starting PostgreSQL, Redis, Keycloak, RustFS..."

docker compose up -d postgres redis keycloak rustfs 2>/dev/null || docker-compose up -d postgres redis keycloak rustfs

echo -e "${GREEN}   ✓ Infrastructure containers started${NC}"

# ============================================================================
# STEP 4: Wait for Database
# ============================================================================

echo ""
echo -e "${YELLOW}[4/7] Waiting for database to be ready...${NC}"

# Give containers a moment to start
sleep 3

# Wait for postgres to be healthy (max 60 seconds)
ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if docker compose exec -T postgres pg_isready -U grc > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Database is ready${NC}"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ Database failed to start after 60 seconds${NC}"
        echo "   Check logs with: docker compose logs postgres"
        exit 1
    fi
    echo "   Waiting for database... ($ATTEMPTS/$MAX_ATTEMPTS)"
    sleep 2
done

# ============================================================================
# STEP 5: Start Application Services
# ============================================================================

echo ""
echo -e "${YELLOW}[5/7] Starting application services...${NC}"
echo "   Starting Controls, Frameworks, Policies, TPRM, Trust, Audit..."

docker compose up -d controls frameworks policies tprm trust audit 2>/dev/null || docker-compose up -d controls frameworks policies tprm trust audit

echo -e "${GREEN}   ✓ Application containers started${NC}"

# Wait for API to be ready (max 60 seconds)
echo "   Waiting for API to be ready..."
sleep 5

ATTEMPTS=0
MAX_ATTEMPTS=30
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ API services are ready${NC}"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        echo -e "${YELLOW}⚠ API not responding on localhost:3001${NC}"
        echo "   Services may still be starting. Check logs with:"
        echo "   docker compose logs controls"
    fi
    echo "   Waiting for API... ($ATTEMPTS/$MAX_ATTEMPTS)"
    sleep 2
done

# ============================================================================
# STEP 6: Start Frontend
# ============================================================================

echo ""
echo -e "${YELLOW}[6/7] Starting frontend...${NC}"

cd "$PROJECT_ROOT/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing frontend dependencies (this may take a minute)..."
    npm install --silent
    echo -e "${GREEN}   ✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}   ✓ Dependencies already installed${NC}"
fi

# Start Vite development server in background
echo "   Starting Vite development server..."
VITE_ENABLE_DEV_AUTH=true npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

cd "$PROJECT_ROOT"

# Wait for frontend to be ready (max 40 seconds)
sleep 3
ATTEMPTS=0
MAX_ATTEMPTS=20
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Frontend is ready${NC}"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; then
        echo -e "${YELLOW}⚠ Frontend not responding on localhost:3000${NC}"
        echo "   Check if port 3000 is available"
    fi
    echo "   Waiting for frontend... ($ATTEMPTS/$MAX_ATTEMPTS)"
    sleep 2
done

# ============================================================================
# STEP 7: Complete!
# ============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}║   🎉 GigaChad GRC Demo is Ready!                              ║${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo "   Frontend:       http://localhost:3000"
echo "   API Docs:       http://localhost:3001/api/docs"
echo "   Keycloak Admin: http://localhost:8080 (admin/admin)"
echo ""
echo -e "${BLUE}🔐 How to Login:${NC}"
echo "   1. Go to http://localhost:3000"
echo "   2. Click the 'Dev Login' button"
echo "   3. You're in! No password needed."
echo ""
echo -e "${BLUE}📊 Loading Demo Data:${NC}"
echo "   1. Click your profile icon (top-right)"
echo "   2. Go to Settings → Organization"
echo "   3. Scroll to 'Demo Data' section"
echo "   4. Click 'Load Demo Data'"
echo ""
echo -e "${BLUE}🛑 Stopping the Demo:${NC}"
echo "   Press Ctrl+C to stop the frontend"
echo "   Then run: docker compose down"
echo ""

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "${YELLOW}🌐 Opening browser...${NC}"
    sleep 1
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        echo -e "${YELLOW}🌐 Opening browser...${NC}"
        sleep 1
        xdg-open http://localhost:3000 2>/dev/null &
    fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows Git Bash / Cygwin
    if command -v start &> /dev/null; then
        echo -e "${YELLOW}🌐 Opening browser...${NC}"
        sleep 1
        start http://localhost:3000
    fi
fi

echo ""
echo -e "${YELLOW}Demo is running. Press Ctrl+C to stop...${NC}"
echo ""

# Wait for the frontend process (this keeps the script running)
wait $FRONTEND_PID
