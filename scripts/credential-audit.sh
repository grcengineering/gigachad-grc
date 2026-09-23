#!/bin/bash
# Credential Audit Script for GigaChad GRC
# This script identifies potential credentials in the codebase

echo "🔍 GigaChad GRC - Credential Audit"
echo "===================================="
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Scanning for potential credentials..."
echo ""

# Check for .env files (should only be .env.example)
echo "1. Checking for .env files..."
env_files=$(find . -name ".env" -o -name "*.env" | grep -v node_modules | grep -v ".env.example")
if [ -n "$env_files" ]; then
    echo -e "${RED}⚠️  Found .env files (these should not be committed):${NC}"
    echo "$env_files"
    echo ""
else
    echo -e "${GREEN}✓ No .env files found (good)${NC}"
    echo ""
fi

# Check for hardcoded passwords/secrets in code
echo "2. Checking for hardcoded credentials in source code..."
hardcoded=$(grep -r -i "password.*=.*['\"]" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
    . 2>/dev/null | grep -v "POSTGRES_PASSWORD" | grep -v "REDIS_PASSWORD" | grep -v "password:" | head -20)

if [ -n "$hardcoded" ]; then
    echo -e "${YELLOW}⚠️  Potential hardcoded credentials found:${NC}"
    echo "$hardcoded" | head -10
    echo ""
else
    echo -e "${GREEN}✓ No obvious hardcoded credentials${NC}"
    echo ""
fi

# Check docker-compose for password fallbacks
echo "3. Checking docker-compose.yml for password fallbacks..."
defaults=$(grep -E "PASSWORD[^}]*:-|SECRET[^}]*:-" docker-compose.yml || true)
if [ -n "$defaults" ]; then
    echo -e "${YELLOW}⚠️  Password/secret fallback found in docker-compose.yml:${NC}"
    echo "$defaults"
    echo ""
else
    echo -e "${GREEN}✓ Required passwords use environment variables${NC}"
    echo ""
fi

# Check for API keys
echo "4. Checking for API keys..."
api_keys=$(grep -r -i "api.*key.*=.*['\"]" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.yml" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
    . 2>/dev/null | grep -v "apiKey:" | grep -v "API_KEY" | head -10)

if [ -n "$api_keys" ]; then
    echo -e "${YELLOW}⚠️  Potential API keys found:${NC}"
    echo "$api_keys"
    echo ""
else
    echo -e "${GREEN}✓ No hardcoded API keys found${NC}"
    echo ""
fi

# Check for AWS credentials
echo "5. Checking for AWS/cloud credentials..."
aws_creds=$(grep -r -i "aws.*secret\|aws.*key" \
    --include="*.ts" --include="*.tsx" --include="*.js" --include="*.yml" --include="*.json" \
    --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
    . 2>/dev/null | head -10)

if [ -n "$aws_creds" ]; then
    echo -e "${RED}⚠️  AWS/Cloud credentials found:${NC}"
    echo "$aws_creds"
    echo ""
else
    echo -e "${GREEN}✓ No AWS/cloud credentials found${NC}"
    echo ""
fi

# Summary
echo "======================================"
echo "📋 Summary & Recommendations"
echo "======================================"
echo ""
echo "Current credential locations:"
echo "  1. .env - Per-installation generated values (not committed)"
echo "  2. .env.example - Placeholder template (not runnable as-is)"
echo "  3. Services receive selected env vars at runtime"
echo ""
echo -e "${GREEN}✅ Recommendations:${NC}"
echo "  1. Use ./start.sh to generate local credentials"
echo "  2. Replace every production placeholder with a generated value"
echo "  3. Confirm .env and .env.prod are ignored"
echo "  4. Use secrets manager for production (e.g., AWS Secrets Manager)"
echo "  5. Rotate credentials regularly"
echo ""
echo -e "${YELLOW}⚠️  No shared development passwords are documented.${NC}"
echo "Read KEYCLOAK_ADMIN_PASSWORD, GRAFANA_ADMIN_PASSWORD, and"
echo "MINIO_ROOT_PASSWORD from the protected generated .env when needed."
echo ""
