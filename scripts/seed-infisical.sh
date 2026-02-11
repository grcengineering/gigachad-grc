#!/bin/bash
# =============================================================================
# GigaChad GRC - Seed Infisical with Application Secrets
# =============================================================================
#
# This script imports application-tier secrets from the existing .env file
# into Infisical for centralized secret management.
#
# Prerequisites:
#   1. Infisical must be running (docker compose up infisical)
#   2. Create an admin account at http://localhost:8443
#   3. Create a Machine Identity with Universal Auth and generate a token
#
# Usage: ./scripts/seed-infisical.sh
#
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

INFISICAL_URL="${INFISICAL_URL:-http://localhost:8443}"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       GigaChad GRC - Infisical Secret Seeding                ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check Infisical is healthy
echo -e "${BLUE}[1/4]${NC} Checking Infisical health..."
attempts=0
max_attempts=15
while [ $attempts -lt $max_attempts ]; do
    if curl -sf "${INFISICAL_URL}/api/status" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Infisical is healthy at ${INFISICAL_URL}"
        break
    fi
    attempts=$((attempts + 1))
    if [ $attempts -eq $max_attempts ]; then
        echo -e "  ${RED}✗${NC} Infisical is not responding at ${INFISICAL_URL}"
        echo -e "  ${YELLOW}→${NC} Start it with: docker compose up -d infisical"
        exit 1
    fi
    sleep 2
done

# Step 2: Check for admin account
echo ""
echo -e "${BLUE}[2/4]${NC} Admin account setup"
echo -e "  ${YELLOW}→${NC} If you haven't already, visit ${CYAN}${INFISICAL_URL}${NC} to create your admin account"
echo ""
read -p "  Have you created an admin account? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "  ${YELLOW}→${NC} Please create an admin account first, then re-run this script"
    exit 0
fi

# Step 3: Get API token
echo ""
echo -e "${BLUE}[3/4]${NC} Machine Identity setup"
echo -e "  To seed secrets, you need an API token from Infisical:"
echo ""
echo -e "  1. Go to ${CYAN}${INFISICAL_URL}${NC} → Admin Console → Machine Identities"
echo -e "  2. Create a new Machine Identity (e.g., 'grc-seeder')"
echo -e "  3. Add Universal Auth method"
echo -e "  4. Generate a Client ID and Client Secret"
echo ""

if [ -n "${INFISICAL_TOKEN:-}" ]; then
    echo -e "  ${GREEN}✓${NC} Using INFISICAL_TOKEN from environment"
    TOKEN="$INFISICAL_TOKEN"
else
    read -p "  Enter your Infisical API token (or Machine Identity token): " TOKEN
    if [ -z "$TOKEN" ]; then
        echo -e "  ${RED}✗${NC} Token is required"
        exit 1
    fi
fi

# Step 4: Import secrets from .env
echo ""
echo -e "${BLUE}[4/4]${NC} Importing application secrets from .env..."

if [ ! -f "$ENV_FILE" ]; then
    echo -e "  ${RED}✗${NC} .env file not found at $ENV_FILE"
    exit 1
fi

# Application-tier secrets to migrate to Infisical
APP_SECRETS=(
    "ENCRYPTION_KEY"
    "JWT_SECRET"
    "SESSION_SECRET"
    "PHISHING_TRACKING_SECRET"
    "KEYCLOAK_ADMIN_PASSWORD"
    "KEYCLOAK_ADMIN_CLIENT_SECRET"
    "GRAFANA_ADMIN_PASSWORD"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
)

imported=0
skipped=0

for secret_name in "${APP_SECRETS[@]}"; do
    # Extract value from .env file
    value=$(grep "^${secret_name}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2-)

    if [ -z "$value" ]; then
        echo -e "  ${YELLOW}⚠${NC} ${secret_name} - not found in .env (skipped)"
        skipped=$((skipped + 1))
        continue
    fi

    # Create/update secret in Infisical via API
    response=$(curl -sf -X POST "${INFISICAL_URL}/api/v3/secrets/raw/${secret_name}" \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{
            \"workspaceId\": \"default\",
            \"environment\": \"dev\",
            \"secretValue\": \"${value}\",
            \"type\": \"shared\"
        }" 2>&1) || true

    if echo "$response" | grep -q '"secret"' 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} ${secret_name}"
        imported=$((imported + 1))
    else
        # Try updating if create fails (secret may already exist)
        response=$(curl -sf -X PATCH "${INFISICAL_URL}/api/v3/secrets/raw/${secret_name}" \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{
                \"workspaceId\": \"default\",
                \"environment\": \"dev\",
                \"secretValue\": \"${value}\",
                \"type\": \"shared\"
            }" 2>&1) || true

        if echo "$response" | grep -q '"secret"' 2>/dev/null; then
            echo -e "  ${GREEN}✓${NC} ${secret_name} (updated)"
            imported=$((imported + 1))
        else
            echo -e "  ${RED}✗${NC} ${secret_name} - failed to import"
            echo -e "      API response: ${response}"
            skipped=$((skipped + 1))
        fi
    fi
done

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Seeding Complete!                          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Imported: ${GREEN}${imported}${NC} secrets"
echo -e "  Skipped:  ${YELLOW}${skipped}${NC} secrets"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. Install Infisical CLI:  ${CYAN}brew install infisical/get-cli/infisical${NC}"
echo -e "  2. Authenticate:           ${CYAN}infisical login --domain=${INFISICAL_URL}${NC}"
echo -e "  3. Start with injection:   ${CYAN}make up${NC}"
echo ""
echo -e "  Secrets are now managed at ${CYAN}${INFISICAL_URL}${NC}"
echo -e "  Rotate secrets there — no .env changes needed."
echo ""
