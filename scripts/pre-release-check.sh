#!/bin/bash
# =============================================================================
# GigaChad GRC - Pre-Release Validation Script
# =============================================================================
# Run this script before publishing a new release to ensure everything is ready.
# Usage: ./scripts/pre-release-check.sh
# =============================================================================

# Don't exit on error - we want to report all issues
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# CHECKS
# =============================================================================

echo ""
echo "🚀 GigaChad GRC - Pre-Release Validation"
echo "=========================================="

# -----------------------------------------------------------------------------
section "1. Required Files"
# -----------------------------------------------------------------------------

# Core files
if [ -f "LICENSE" ]; then pass "LICENSE file exists"; else fail "LICENSE file missing"; fi
if [ -f "README.md" ]; then pass "README.md exists"; else fail "README.md missing"; fi
if [ -f "CHANGELOG.md" ]; then pass "CHANGELOG.md exists"; else fail "CHANGELOG.md missing"; fi
if [ -f "CONTRIBUTING.md" ] || [ -f "CONTRIBUTING.2.md" ]; then pass "CONTRIBUTING.md exists"; else fail "CONTRIBUTING.md missing"; fi
if [ -f "CODE_OF_CONDUCT.md" ]; then pass "CODE_OF_CONDUCT.md exists"; else fail "CODE_OF_CONDUCT.md missing"; fi

# Security
if [ -f "SECURITY.md" ] || [ -f "docs/SECURITY.md" ] || [ -f "docs/SECURITY_MODEL.md" ]; then pass "Security policy exists"; else warn "SECURITY.md recommended"; fi

# Docker
if [ -f "docker-compose.yml" ]; then pass "docker-compose.yml exists"; else fail "docker-compose.yml missing"; fi
if [ -f "docker-compose.prod.yml" ]; then pass "docker-compose.prod.yml exists"; else warn "Production compose recommended"; fi

# Environment
if [ -f "deploy/env.example" ] || [ -f ".env.example" ]; then pass "Environment example exists"; else fail "Environment example missing"; fi

# -----------------------------------------------------------------------------
section "2. GitHub Community Files"
# -----------------------------------------------------------------------------

if [ -d ".github" ]; then pass ".github directory exists"; else fail ".github directory missing"; fi
if [ -f ".github/ISSUE_TEMPLATE/bug_report.yml" ]; then pass "Bug report template exists"; else warn "Bug report template recommended"; fi
if [ -f ".github/ISSUE_TEMPLATE/feature_request.yml" ]; then pass "Feature request template exists"; else warn "Feature request template recommended"; fi
if [ -f ".github/PULL_REQUEST_TEMPLATE.md" ]; then pass "PR template exists"; else warn "PR template recommended"; fi
if [ -f ".github/workflows/ci.yml" ]; then pass "CI workflow exists"; else warn "CI workflow recommended"; fi
if [ -f ".github/FUNDING.yml" ]; then pass "FUNDING.yml exists"; else info "FUNDING.yml optional"; fi

# -----------------------------------------------------------------------------
section "3. Documentation"
# -----------------------------------------------------------------------------

if [ -d "docs" ]; then pass "docs/ directory exists"; else fail "docs/ directory missing"; fi
if [ -f "docs/QUICK_START.md" ] || [ -f "docs/INSTALLATION.md" ]; then pass "Installation guide exists"; else warn "Installation guide recommended"; fi
if [ -f "docs/API.md" ]; then pass "API documentation exists"; else warn "API documentation recommended"; fi
if [ -f "docs/SECURITY_AUDIT.md" ]; then pass "Security audit exists"; else warn "Security audit recommended"; fi

# -----------------------------------------------------------------------------
section "4. Security Checks"
# -----------------------------------------------------------------------------

# Check for hardcoded secrets patterns
info "Scanning for potential hardcoded secrets..."

# Common secret patterns
if grep -rq "sk-[a-zA-Z0-9]\{20,\}" --include="*.ts" --include="*.js" --exclude-dir=node_modules services/ 2>/dev/null; then
    fail "Potential OpenAI API key found in code"
else
    pass "No OpenAI API keys in code"
fi

if grep -rq "AKIA[A-Z0-9]\{16\}" --include="*.ts" --include="*.js" --exclude-dir=node_modules services/ 2>/dev/null; then
    fail "Potential AWS access key found in code"
else
    pass "No AWS access keys in code"
fi

# Check encryption key handling
if grep -rq "encryptionKey.*=.*['\"][^'\"]\{10,\}['\"]" --include="*.ts" --exclude-dir=node_modules services/ 2>/dev/null; then
    fail "Potential hardcoded encryption key found"
else
    pass "No hardcoded encryption keys"
fi

# Check for console.log in production code (excluding test files, docs, and compiled files)
# Filter out: comments (//), JSDoc (*), compiled .d.ts files, and dist folders
CONSOLE_COUNT=$(grep -r "console\.\(log\|error\)(" --include="*.ts" --exclude-dir=node_modules --exclude-dir=dist --exclude="*.spec.ts" --exclude="*.test.ts" --exclude="*.d.ts" services/ 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*\*" | grep -v " \* " | wc -l | tr -d ' ')
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    warn "Found $CONSOLE_COUNT console.log/error statements in production code"
else
    pass "No console statements in production code"
fi

# -----------------------------------------------------------------------------
section "5. Dependencies"
# -----------------------------------------------------------------------------

# Check for the authoritative workspace lockfile
if [ -f "package-lock.json" ]; then
    pass "Root package-lock.json exists (monorepo)"
else
    warn "package-lock.json missing (run npm install)"
fi

# Check npm audit (if npm available)
if command -v npm &> /dev/null; then
    info "Running npm audit on the workspace dependency graph..."
    AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
    HIGH_VULNS=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | grep -o '[0-9]*' | head -1)
    CRITICAL_VULNS=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | grep -o '[0-9]*' | head -1)
    # Default to 0 if empty
    HIGH_VULNS=${HIGH_VULNS:-0}
    CRITICAL_VULNS=${CRITICAL_VULNS:-0}

    if [ "$CRITICAL_VULNS" -gt 0 ]; then
        fail "Workspace has $CRITICAL_VULNS critical vulnerabilities"
    elif [ "$HIGH_VULNS" -gt 0 ]; then
        warn "Workspace has $HIGH_VULNS high severity vulnerabilities"
    else
        pass "No critical/high vulnerabilities in workspace dependencies"
    fi
else
    warn "npm not available - skipping audit"
fi

# -----------------------------------------------------------------------------
section "6. Build Verification"
# -----------------------------------------------------------------------------

# Check TypeScript configs
if [ -f "frontend/tsconfig.json" ]; then pass "Frontend tsconfig.json exists"; else fail "Frontend tsconfig missing"; fi
if [ -f "services/controls/tsconfig.json" ]; then pass "Controls tsconfig.json exists"; else fail "Controls tsconfig missing"; fi

# Check Dockerfiles
if [ -f "services/controls/Dockerfile" ]; then pass "Controls Dockerfile exists"; else fail "Controls Dockerfile missing"; fi
if [ -f "frontend/Dockerfile" ]; then pass "Frontend Dockerfile exists"; else warn "Frontend Dockerfile recommended"; fi

# -----------------------------------------------------------------------------
section "7. Version Check"
# -----------------------------------------------------------------------------

# Check if CHANGELOG has unreleased section
if grep -q "\[Unreleased\]" CHANGELOG.md; then
    warn "CHANGELOG.md has [Unreleased] section - consider creating versioned release"
    info "Move unreleased changes to a version like [1.0.0] - $(date +%Y-%m-%d)"
else
    pass "CHANGELOG.md appears versioned"
fi

# Check package.json version
if [ -f "frontend/package.json" ]; then
    VERSION=$(grep '"version"' frontend/package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    info "Frontend version: $VERSION"
fi

# =============================================================================
# SUMMARY
# =============================================================================

section "Summary"

echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Pre-release check FAILED${NC}"
    echo "   Please fix the failed checks before releasing."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Pre-release check passed with warnings${NC}"
    echo "   Consider addressing warnings before releasing."
    exit 0
else
    echo -e "${GREEN}✅ Pre-release check PASSED${NC}"
    echo "   Ready for release!"
    exit 0
fi

