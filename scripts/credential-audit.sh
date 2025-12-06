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

# Check docker-compose for default credentials
echo "3. Checking docker-compose.yml for default credentials..."
defaults=$(grep -E "grc_secret|redis_secret|admin|minioadmin" docker-compose.yml)
if [ -n "$defaults" ]; then
    echo -e "${YELLOW}⚠️  Default credentials found in docker-compose.yml:${NC}"
    echo "   These are OK as fallbacks, but should be overridden via .env"
    echo ""
else
    echo -e "${GREEN}✓ Using environment variables${NC}"
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
echo "  1. docker-compose.yml - Uses env vars with DEV defaults"
echo "  2. .env.example - Template file (safe)"
echo "  3. Services use env vars at runtime"
echo ""
echo -e "${GREEN}✅ Recommendations:${NC}"
echo "  1. Create .env file from .env.example"
echo "  2. Update all CHANGE_ME_IN_PRODUCTION values"
echo "  3. Add .env to .gitignore (if not already)"
echo "  4. Use secrets manager for production (e.g., AWS Secrets Manager)"
echo "  5. Rotate credentials regularly"
echo ""
echo -e "${YELLOW}⚠️  Default Development Credentials:${NC}"
echo "  PostgreSQL: grc / grc_secret"
echo "  Redis: redis_secret"
echo "  Keycloak: admin / admin"
echo "  MinIO: minioadmin / minioadminpassword"
echo ""
echo "These MUST be changed for production deployment!"
echo ""
