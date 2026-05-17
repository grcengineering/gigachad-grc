# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow Semantic Versioning where practical.

## [Unreleased]

### Security

#### Platform Hardening Follow-Ups — May 2026

Six-PR follow-up train (#305–#310) addressing pattern-sweep extensions,
carry-over items from earlier audits, multi-tenant + RBAC test coverage,
backend test infrastructure, accessibility/visual regression coverage,
and removal of the backup-scheduler's docker socket dependency.

##### Connector SSRF Coverage (#305)

- Migrated 7 remaining integration connectors from raw `axios` to
  `safeFetch` (`cloud-connectors`, `itam-connectors`, `hr-connectors`,
  `productivity-connectors`, `devops-connectors`, `finance-connectors`,
  `additional-connectors`). Operator-supplied `baseUrl`/`tokenUrl` are
  now validated against the private-IP / metadata-endpoint blocklist
  before any outbound call.
- `SSRFProtectionError` is caught per-endpoint and surfaced as a
  structured failure rather than an unhandled exception.

##### File Upload Hardening (#305)

- Added MIME allowlist + size cap to 5 additional upload endpoints
  matching the contracts.controller pattern from PR #301:
  evidence (50 MB; pdf/png/jpeg/csv/xlsx/docx/txt/json),
  BCDR plans (25 MB; pdf/docx/txt),
  training materials (25 MB; mp4/pdf/jpg/png + SCORM),
  framework imports (25 MB; csv/xlsx),
  policies (25 MB; pdf/docx/md/txt).
- Each endpoint exports `*_MIME_ALLOWLIST` and `*_MAX_BYTES` constants
  alongside a named `fileFilter`, so the policy is reviewable in source.

##### Tenant Isolation Hardening (#308)

- Questionnaires and Knowledge Base controllers no longer accept
  `organizationId` from the request body. Both controllers now
  spread `user.organizationId` over the DTO before passing to the
  service. Previously any authenticated user could POST a record
  under any tenant.
- Frameworks, Policies, and Integrations controllers had no
  `RolesGuard` wired — viewer/auditor roles could POST/PUT/DELETE
  freely. Fixed by adding `@UseGuards(DevAuthGuard, RolesGuard)` at
  class level + `@Roles(...)` on every mutation route.
- Frameworks and Policies services now register
  `GlobalExceptionFilter` in `main.ts`, so `ForbiddenException` from
  `RolesGuard` returns 403 instead of a generic 500.

##### Backup Scheduler Privilege Reduction (#310)

- Removed `/var/run/docker.sock` mount from the `backup-scheduler`
  service in `docker-compose.prod.yml`. A compromised backup container
  can no longer introspect or control other containers.
- Switched data-plane movement to direct network commands: `pg_dump`
  over TCP to postgres, `redis-cli --rdb` over TCP to redis,
  `mc mirror` (existing) over the S3 API to rustfs.
- Added `cap_drop: ALL` to the backup-scheduler service.
- Redis **cold restore** is now a documented manual procedure
  (`deploy/README.md`) because redis only loads `dump.rdb` at server
  startup; this is acceptable here because redis is cache-only.

##### Base Image Digest Refresh (#307)

- Re-pinned `node:20-alpine` and `nginx:alpine` digests across all 7
  Dockerfiles. Trivy HIGH/CRITICAL count on the refreshed images
  dropped accordingly.

##### Trust Center URL Cleanup (#307)

- Removed `organizationId` from public trust-center share URLs in
  `TrustCenterSettings`. The backend already resolves the org from
  the authenticated context — the query parameter was cosmetic
  information disclosure, not exploitable.

### Added

#### Multi-Tenant + RBAC E2E Coverage (#308)

- New Playwright specs that gate PR merges:
  - `frontend/e2e/tenant-isolation.spec.ts` (44 tests, 10 resource
    types). For each resource: cross-tenant GET/PUT/DELETE returns
    404 (no existence disclosure), cross-tenant POST is rejected or
    silently scoped to the caller's org.
  - `frontend/e2e/rbac.spec.ts` (50 tests). Role × action matrix
    for admin / compliance_manager / auditor / viewer against
    controls, evidence, frameworks, policies, integrations.
- Test infrastructure additions:
  - `services/shared/src/seed/seed-constants.ts` exports stable
    UUIDs for Org A, Org B, and the 5 seeded users.
  - `services/controls/src/seed/seed.service.ts` seeds Org B with
    1 admin + 5 controls + 3 risks + 2 vendors so cross-tenant
    tests have something to target. Idempotent.
  - `DevAuthGuard` honors an `x-dev-user-id` header in dev/test
    environments only, looking the value up in an in-memory fixture
    table to authenticate as any of the 5 seeded users without a
    real Keycloak round-trip.
  - `frontend/e2e/auth.setup.ts` produces 6 storage states
    (`user.json` legacy + adminA/complianceA/auditorA/viewerA/adminB);
    `playwright.config.ts` defines 5 role/tenant-specific projects.
- New required CI job `e2e-tenant-rbac` brings up the dev stack,
  seeds, and runs both specs. Blocks PR merge on failure.

#### Accessibility + Visual Regression E2E (#309, report-only)

- `frontend/e2e/a11y.spec.ts` runs `@axe-core/playwright` against
  every primary route and reports WCAG violations.
- `frontend/e2e/visual.spec.ts` snapshots 8 high-signal pages
  (dashboard, controls list, control detail, frameworks list,
  policies list, vendors list, audits list, settings, trust-center).
  Baselines committed under `frontend/e2e/__snapshots__/`.
- New CI job `e2e-quality-checks` runs both specs.
  **Report-only:** `continue-on-error: true` and omitted from the
  `status` rollup. Will flip to blocking once baselines stabilize.

#### Backend Jest Coverage (#306)

- Wired Jest in `audit`, `policies`, `tprm`, and `trust` services
  (the latter three previously had no `npm test` script). `controls`
  and `frameworks` already had test setup.
- Two pre-existing dormant specs in `audit`
  (`audits.service.spec.ts`, `findings.service.spec.ts`) are now
  actually executed by CI.
- Starter Prisma-mocked specs added to `policies`, `tprm`, `trust`
  covering one happy-path and one tenant-isolation case per service.

### Changed

#### Empty Catch Handler (#305)

- `frontend/src/pages/Integrations.tsx` — replaced
  `.catch(() => null)` on `getTypes()` with a `console.warn` that
  preserves the error before returning null. Last empty `.catch`
  handler in the frontend.

#### Organization ID Helper (#305)

- Consolidated 3 `localStorage.getItem('organizationId')` fallbacks
  in `frontend/src/lib/{api.ts,setupFetchAuth.ts,api/client.ts}` to
  a single `getCurrentOrgId()` helper in `secureStorage.ts`. The
  fallback now returns `null` when both stores are empty so the
  calling layer fails loud rather than sending a request without an
  org header.

### Documentation

- **CHANGELOG.md** — this entry.
- **frontend/e2e/README.md** — documented the multi-user auth
  fixture system (6 storage states, 5 role/tenant projects), the
  `x-dev-user-id` header override, the a11y / visual specs, and how
  to refresh visual baselines.
- **docs/SECURITY_MODEL.md** — added connector SSRF coverage to the
  SSRF section, file-upload allowlist pattern to the File Upload
  Security section, tenant-isolation e2e gate to the Tenant
  Isolation section, and a new Backup Scheduler subsection under
  Infrastructure Hardening.
- **docs/PERMISSIONS_MATRIX.md** — added a note that the role matrix
  is now enforced by `frontend/e2e/rbac.spec.ts`.
- **docs/DEVELOPMENT.md** and **CONTRIBUTING.md** — backend testing
  sections updated; `npm test` now works in all 6 services.
- **deploy/README.md** and **deploy/QUICKSTART.md** — updated for
  the no-docker.sock backup procedure and the Redis cold-restore
  manual workflow.

#### Security Audit Fixes - February 2026

Comprehensive security hardening based on internal security review and external penetration testing.

##### IDOR Protection

- **Systematic IDOR elimination**: Fixed 33+ Insecure Direct Object Reference vulnerabilities across all services
- All `findOne`, `update`, and `delete` operations now validate `organizationId` from authenticated user context
- Organization context derived exclusively from JWT token, never from request parameters
- Affects: Audit, TPRM, Trust, Policies, Frameworks, Controls services

##### Path Traversal Protection

- **S3 Storage Provider**: Added path traversal validation blocking `..` sequences and null bytes
- **Azure Blob Storage Provider**: Added path traversal validation with key sanitization
- **Local Storage Provider**: Enhanced with symlink detection and directory escape prevention
- All storage operations validate paths are within designated storage boundaries

##### Rate Limiting Expansion

- Extended rate limiting to all backend services (Audit, TPRM, Trust, Policies, Frameworks)
- Endpoint-specific rate limits for sensitive operations (exports, bulk operations, reports)
- Consistent rate limit response format with `retryAfter` header

##### SSRF Protection Enhancement

- **Vendor AI Service**: Added URL validation for AI provider endpoints
- **Security Scanner Service**: Blocked scanning of private/internal IP ranges
- **Compliance Collector**: External endpoint validation before collection
- **Trust AI Service**: AI provider URL validation
- DNS rebinding attack prevention with resolved IP verification

##### XSS Protection

- **DOMPurify integration**: All user-generated HTML sanitized via DOMPurify
- **Widget URL sanitization**: Dashboard widgets validate and sanitize iframe sources
- **Input sanitization**: Enhanced DTO validation with strict length limits
- **Export filename sanitization**: Prevents injection via generated filenames

##### CSRF Protection

- **Timing-safe comparisons**: All secret/token comparisons use `crypto.timingSafeEqual()`
- **SameSite cookies**: Session cookies configured with `SameSite=Strict`
- **Proxy secret verification**: Backend validates proxy authentication secrets

##### Infrastructure Hardening

- **Localhost port binding**: Database and monitoring ports bound to localhost in development
- **Traefik TLS**: Configured for TLS 1.2+ with strong cipher suites
- **Security headers**: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Docker security contexts**: Added `no-new-privileges` to all containers

##### Frontend Security

- **Iframe URL validation**: Widget iframe sources validated against allowlist
- **SessionStorage for tokens**: JWT tokens stored in sessionStorage (cleared on tab close)
- **Cross-tab logout**: Logout events broadcast via BroadcastChannel to all tabs
- **AuthContext hardening**: Token refresh with race condition prevention

#### Comprehensive Security Hardening (Phase 2)

##### Secrets & Credential Management

- **Removed Hardcoded Secrets**: Eliminated all hardcoded fallback values for sensitive credentials (`KEYCLOAK_ADMIN_CLIENT_SECRET`, `PHISHING_TRACKING_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_USER/PASSWORD`)
- **OAuth Token Encryption**: Jira and ServiceNow OAuth tokens are now encrypted at rest using AES-256-GCM
- **Session Token System**: Portal access codes are now hashed with bcrypt; sessions use time-limited tokens instead of raw access codes
- **Environment Validation**: Services now fail fast with clear error messages when required secrets are not configured

##### SSRF Protection

- **Custom Integration Service**: All fetch calls replaced with `safeFetch()` that blocks private IPs, metadata endpoints, and internal networks
- **Security Scanner**: Added URL validation to block scanning of private/internal addresses and prevent DNS rebinding attacks
- **Sandbox Hardening**: Custom code execution sandbox now uses wrapped `safeFetch()` to prevent SSRF from user-provided code

##### Input Validation & Rate Limiting

- **Bulk Operation Limits**: Portal user bulk create limited to 50 users; bulk status updates limited to 100 items
- **Portal Auth Rate Limiting**: Authentication endpoints rate limited to 5 attempts/minute; refresh to 10/minute
- **CIDR Validation**: Fixed IP restriction validation with proper CIDR notation parsing and subnet matching
- **Frontend Pre-validation**: Bulk upload modal validates file size (500 items max) before upload

##### Authentication & Authorization

- **Missing Auth Guards**: Added `DevAuthGuard` to TPRM config controller; added `RolesGuard` where missing
- **Organization Context**: Replaced header-based organization ID with authenticated user context to prevent authorization bypass
- **Frontend 429 Handling**: Added user-friendly error messages for rate limit responses

##### Cryptographic Security

- **Weak RNG Removal**: Replaced `Math.random()` with `crypto.randomBytes()` for subdomain generation
- **Console Log Guards**: Development-only console logs wrapped with environment checks to prevent data leakage in production

##### Database Security

- **Security Indexes**: Added indexes for efficient security queries (user status, API key expiration, audit logs, portal user expiration)
- **Cascade Delete Constraints**: Added proper `onDelete: Cascade` for organization-dependent data and folder hierarchies

##### Security Headers

- **HSTS Preload**: Added `Strict-Transport-Security` header with preload directive
- **Permissions-Policy**: Comprehensive policy restricting sensitive browser APIs
- **CSP Hardening**: Removed `'unsafe-inline'` from `script-src` (kept `'unsafe-eval'` required by Monaco Editor)
- **Additional Headers**: Added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

#### Critical Security Fixes

- **IDOR Vulnerability Fixes**: Fixed 33+ Insecure Direct Object Reference vulnerabilities across TPRM and Trust services by adding organizationId validation to all findOne, update, and delete operations
- **SQL Injection Fix**: Converted `$queryRawUnsafe` to parameterized `$queryRaw` in plan-attestations service
- **Code Execution Hardening**: Enhanced code validation in custom-integration service with comprehensive blocklist for sandbox escape patterns
- **Command Injection Fix**: Replaced `exec` with `spawn` using argument arrays in vulnerability-scanner to prevent shell injection

#### Authentication Hardening

- **Proxy Secret Verification**: New `AUTH_PROXY_SECRET` environment variable for shared secret between auth proxy and backend services
- **Timing-Safe Comparison**: Proxy secret verification now uses `crypto.timingSafeEqual` to prevent timing attacks
- **UUID Validation**: Auth guard validates that user-id and organization-id headers are valid UUIDs
- **Permission Guard Fix**: Permission guard now uses authenticated user context instead of raw headers

#### Encryption Improvements

- **Random Salt Per Encryption**: Replaced hardcoded salts with random per-encryption salts in all encryption services
- **Backwards Compatibility**: New encryption format is backwards compatible with existing encrypted data
- **Affected Services**: mcp-credentials, integrations, notifications-config services

#### File Upload Security

- **Path Traversal Protection**: Local storage provider now validates all paths are within the designated storage directory
- **Filename Sanitization**: Added sanitizeFilename function to remove path components, null bytes, and special characters
- **Double Extension Detection**: File validator flags suspicious patterns like `.pdf.exe`

#### Infrastructure Hardening

- **Helmet Security Headers**: Added Helmet middleware to all 5 backend services (audit, tprm, trust, policies, frameworks)
- **CORS Restriction**: Trust service CORS now uses `CORS_ORIGINS` environment variable instead of allowing all origins
- **Docker Compose Warnings**: Added security warnings to docker-compose.yml about default credentials

### Added

#### Graceful Demo Mode

- **Consistent Mock Mode Behavior**: All external integrations now return realistic sample data when not configured, with explicit `isMockMode: true` flags in API responses
- **Demo Mode Warnings**: Clear console warnings logged when services operate without credentials
- **UI Configuration Status**: Frontend components display informational banners about service configuration status

#### Cloud Provider Integrations

- **AWS Evidence Collection**: Full implementation for Security Hub, CloudTrail, IAM, S3, and GuardDuty evidence collection using AWS SDK v3
- **Azure Security Center**: Implementation for secure score and recommendation collection
- **Google Workspace**: Audit log collection implementation with service account support

#### Email Notifications

- **Dynamic Email Status**: New `/api/notifications-config/email-status` endpoint to check email service configuration
- **Provider Status Display**: NotificationSettings page now dynamically shows whether email is configured or in demo mode
- **Multi-Provider Support**: Documentation for SMTP, SendGrid, and Amazon SES configuration

#### Background Job System

- **Job Scheduler Implementation**: All job handlers now call actual service methods instead of placeholder stubs
- **Evidence Collection Jobs**: Automated evidence collection scheduling
- **Retention Policy Jobs**: Automated data retention enforcement
- **Integration Sync Jobs**: Jira and ServiceNow synchronization

#### Data Retention

- **Extended Entity Support**: Retention policies now support EVIDENCE, POLICY_VERSIONS, and EXPORT_JOBS in addition to existing entity types
- **Policy Version Protection**: Retention automatically protects the most recent version of each policy

#### AI/MCP Features

- **AI Risk Analysis**: AI controller now returns actual analysis from the AI service with demo mode fallback
- **MCP Key Rotation**: Full implementation of encryption key rotation for MCP credential storage

#### Vulnerability Scanning

- **Enhanced Fallback**: Vulnerability scanner returns detailed mock data with `toolsRequired` hints when scanning tools are not installed

#### BC/DR Module Enhancements

- **BIA Questionnaire Wizard**: Guided 5-step wizard for conducting business impact analysis with plain-language questions that map to technical BIA fields (RTO, RPO, criticality tier, impact levels)
- **Plan Owner Attestation**: Formal sign-off workflow for BC/DR plan owners to confirm plans are accurate and current, with attestation history and audit trail
- **Exercise Template Library**: Pre-built tabletop exercise scenarios (Ransomware, Data Center Failure, Vendor Outage, Natural Disaster, Pandemic, Data Breach) with discussion questions, injects, and facilitator notes
- **Recovery Team Roster**: Define and manage recovery teams with roles (Team Lead, Alternate, Technical Lead, etc.), primary/alternate assignments, and plan linkage
- **Vendor BC/DR Dependencies**: Link critical vendors to business processes, track vendor RTO/RPO capabilities, and surface gaps where vendor recovery time exceeds process requirements
- **Incident Activation Workflow**: Declare BC/DR incidents, activate plans and teams, maintain incident timeline, and capture post-incident review data including lessons learned
- **Enhanced Dashboard**: Active incident banner, pending attestations widget, and vendor recovery gaps widget on BC/DR dashboard

### Changed

#### API Clients

- **Report Builder API**: Migrated from localStorage to backend API with graceful localStorage fallback
- **Scheduled Reports API**: Migrated from localStorage to backend API with graceful localStorage fallback
- **CustomReportConfig Type**: Extended to include 'divider' section type and additional properties

#### Session Management

- **Async Cleanup**: Session cleanup refactored to async method returning cleanup count for job scheduler integration

### Fixed

- Fixed Framework Library returning 404 in Docker deployment - added missing `/api/frameworks/catalog` nginx route to proxy to controls service (port 3001) instead of frameworks service (port 3002)
- Fixed TypeScript compilation errors in retention service (incorrect field names for Prisma schema)
- Fixed AWS connector dynamic imports to use runtime `require()` for optional SDK packages
- Fixed Azure evidence collector dynamic imports
- Fixed ScheduledReports component to display loading state

### Migration Notes

#### Security Configuration (Recommended)

These changes are backwards compatible, but we recommend configuring the new security features:

1. **Proxy Authentication** (if using auth proxy):

   ```bash
   # Generate a secure secret
   AUTH_PROXY_SECRET=$(openssl rand -base64 32)

   # Configure your auth proxy to send this as x-proxy-secret header
   # Then enable enforcement
   REQUIRE_PROXY_AUTH=true
   ```

2. **CORS Origins** (if using Trust service externally):

   ```bash
   # Set allowed origins for Trust service
   CORS_ORIGINS=https://grc.yourcompany.com,https://trust.yourcompany.com
   ```

3. **Encryption Format**: No action required. The new encryption format with random salts is backwards compatible. Existing encrypted data will continue to work. New data will use the more secure format.

4. **Docker Compose**: If deploying to production, use `docker-compose.prod.yml` instead of `docker-compose.yml`. The development compose file now includes prominent security warnings.

### Documentation

- **ENV_CONFIGURATION.md**: Added comprehensive sections for cloud provider integrations, email configuration, vulnerability scanning, AI features, and demo mode behavior
- **ENV_CONFIGURATION.md**: Added Proxy Authentication section documenting AUTH_PROXY_SECRET and REQUIRE_PROXY_AUTH
- **SECURITY_MODEL.md**: Added File Upload Security, Encryption Security, and Proxy Authentication sections
- **PRODUCTION_DEPLOYMENT.md**: Extended Security Checklist with authentication hardening and file upload security items
- **guides/integrations-setup.md**: New comprehensive guide explaining how to configure all integrations with step-by-step instructions
- **help/reporting/scheduled-reports.md**: Added email configuration section and demo mode explanation
- **help/data/evidence-collectors.md**: Added demo mode section and SDK requirements
- **help/ai-mcp/ai-configuration.md**: Added demo mode section with transition guidance

## [1.0.0] - 2024-12-15

### Added

#### Trust Module Enhancements

- **Answer Templates**: Reusable response templates for common questionnaire questions
  - Template categories for organization
  - Variable substitution support (e.g., `{{company_name}}`, `{{date}}`)
  - Usage tracking and analytics
  - Import/export functionality
- **AI-Powered Features**: Smart questionnaire assistance
  - AI answer drafting using Knowledge Base context
  - Automatic question categorization
  - Answer improvement suggestions
  - Confidence scoring for AI suggestions
- **Similar Question Detection**: Find and reuse previous answers
  - Cross-questionnaire similarity search
  - Duplicate detection within questionnaires
  - One-click answer reuse
- **Trust Analytics**: Comprehensive performance insights
  - Questionnaire completion metrics
  - SLA compliance tracking
  - Team performance analysis
  - Category breakdown and trends
- **Trust Configuration**: Centralized settings management
  - SLA configuration by priority level
  - Auto-assignment rules
  - AI provider configuration
  - Knowledge Base behavior settings
- **Questionnaire Export**: Multiple export formats
  - Excel, CSV, JSON, PDF formats
  - Customizable export templates
  - Bulk export support
- **Trust Analyst Queue Widget**: Dashboard integration
  - Assigned questions at a glance
  - Overdue item highlighting
  - Due this week preview
- **Knowledge Base Improvements**: Enhanced search and relevance
  - Improved relevance scoring algorithm
  - Better tokenization and matching

#### Audit Module Enhancements

- **Audit Templates**: Reusable audit program templates
  - Pre-built system templates for SOC 2, ISO 27001, HIPAA, PCI-DSS
  - Custom template creation with checklists and request templates
  - One-click audit creation from templates
  - Template cloning and management
- **Workpaper Management**: Formal audit documentation
  - Multi-level review workflow (Draft → Pending Review → Reviewed → Approved)
  - Version control with full history tracking
  - Cross-references to controls, findings, and evidence
  - Digital signature support
- **Test Procedures**: Structured control testing
  - Support for inquiry, observation, inspection, and reperformance
  - Configurable sampling (size, method, population)
  - Effectiveness conclusions with rationale
  - Review process with notes
- **Remediation Plans (POA&M)**: Enhanced finding remediation
  - Milestone-based remediation tracking
  - Resource assignment and effort tracking
  - Priority-based scheduling
  - POA&M export in JSON and CSV formats
- **Audit Analytics**: Comprehensive reporting
  - Real-time dashboard with key metrics
  - Trend analysis (monthly, quarterly, yearly)
  - Finding analytics by severity, category, status
  - Control testing coverage metrics
- **Audit Calendar**: Multi-year planning
  - Visual calendar view by year and quarter
  - Risk-based audit prioritization
  - Capacity analysis and resource planning
  - Convert plan entries to active audits
- **AI-Powered Audit Features**: Intelligent assistance
  - Finding categorization (severity, domain, framework)
  - Evidence gap analysis
  - AI-generated remediation suggestions
  - Control mapping recommendations
  - Audit summary generation
- **Recurring Evidence Requests**: Automated collection
  - Configurable recurrence patterns
  - Evidence freshness tracking
  - Auto-flagging of stale evidence
- **Report Generation**: Multiple report types
  - Executive summary
  - Management letter
  - Findings summary
  - Full audit report with all sections

#### TPRM Module Enhancements

- **TPRM Configuration**: Dedicated settings page
  - Tier-to-frequency mapping customization
  - Custom review frequencies (e.g., "2 months")
  - Vendor category management
  - Assessment and contract settings
- **Tier-Based Review Automation**: Automatic scheduling
  - Vendor reviews scheduled by tier
  - Configurable frequency per tier
  - Dashboard widget for upcoming reviews
- **AI-Assisted SOC 2 Analysis**: Document analysis
  - PDF/document upload for vendor assessments
  - AI-extracted findings and exceptions
  - Suggested risk scores

#### Community & Infrastructure

- GitHub issue templates (bug report, feature request, security vulnerability)
- Pull request template with comprehensive checklist
- Security audit documentation (`docs/SECURITY_AUDIT.md`)
- QA testing checklist (`docs/QA_TESTING_CHECKLIST.md`)
- GitHub FUNDING.yml for sponsorship configuration
- CI/CD workflow with GitHub Actions (lint, test, build, Docker, security scan)
- Demo environment scripts (`scripts/start-demo.sh`, `scripts/stop-demo.sh`)
- Gitpod and GitHub Codespaces configuration for cloud development
- Comprehensive demo documentation (`docs/DEMO.md`)

### Changed

- Updated README with contribution badges and improved support section
- Enhanced CONTRIBUTING.md with clear guidelines
- Replaced `xlsx` library with `exceljs` for Excel import/export (more actively maintained)
- Improved dashboard Risk Heatmap visibility and layout
- MCP client service now starts servers asynchronously (non-blocking)

### Fixed

- Controls service MCP server startup no longer blocks application bootstrap
- Pagination pipes instantiation in controllers

### Security

- **Fixed all high severity vulnerabilities** (reduced from 3 to 0)
- Upgraded `@nestjs/cli` from v10.x to v11.x across all services (fixes glob CLI command injection - CVE-related)
- Replaced `xlsx` (SheetJS) with `exceljs` (fixes prototype pollution CVE-2024-22363 and ReDoS vulnerabilities)
- **Removed hardcoded encryption key fallback** - ENCRYPTION_KEY env var now required
- **Added XSS protection** for Word document preview using DOMPurify sanitization
- Added comprehensive security deep dive audit (`docs/SECURITY_DEEP_DIVE_AUDIT.md`)
- Updated security audit documentation with current vulnerability status

## [1.0.0-beta] - 2024-12-13

### Added

- Microservice-based GRC platform including Controls, Frameworks, Policies, Risk, TPRM, Trust, Audit, and BCDR modules
- Configuration-as-Code (Terraform export/import) and state tracking for drift/conflict awareness
- Performance optimizations (dashboard consolidation, caching, reduced DB query counts)
- AI Assistant framework with support for OpenAI/Anthropic providers
- **Mock AI provider** to enable AI feature testing without an API key
- Backup/restore tooling and production compose resilience defaults

### Changed

- Improved dashboard loading by consolidating multiple API calls into a single endpoint
- Added pagination guards and maximum limits on list endpoints to prevent unbounded queries

### Fixed

- Framework seeding consistency (ensures demo frameworks are fully viewable/activated)
- Multiple Config-as-Code state endpoint and schema issues

---

## Notes

- Dates are in YYYY-MM-DD format.
- "Unreleased" changes should be moved into a versioned section when publishing a release.
