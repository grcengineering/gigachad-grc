# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims to follow Semantic Versioning where practical.

## [Unreleased]

### Security

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



