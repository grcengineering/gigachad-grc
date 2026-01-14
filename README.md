
![gigachad grc](https://github.com/user-attachments/assets/22d32df8-2e61-420e-bc98-df7c291ac8a4)

# GigaChad GRC

[![License: Elastic-2.0](https://img.shields.io/badge/License-Elastic--2.0-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Open in Gitpod](https://img.shields.io/badge/Gitpod-Try%20Demo-orange.svg)](https://gitpod.io/#https://github.com/grcengineering/gigachad-grc)

A comprehensive, modular, containerized Governance, Risk, and Compliance (GRC) platform built with modern technologies. Manage your entire security program from compliance tracking to risk management, third-party assessments, and external audits.

---

## 🚀 Quick Start (Just Docker Required!)

### Prerequisites

You only need **one thing**: [**Docker Desktop**](https://www.docker.com/products/docker-desktop)

| Platform | Install Docker |
|----------|----------------|
| **macOS** | [Download for Mac](https://www.docker.com/products/docker-desktop/) (Apple Silicon or Intel) |
| **Windows** | [Download for Windows](https://www.docker.com/products/docker-desktop/) (requires WSL 2) |
| **Linux** | `curl -fsSL https://get.docker.com \| sh` |

> **No Node.js, npm, or other development tools required!**

### Start in 3 Commands

```bash
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc
./start.sh
```

**Windows Users:**
```cmd
start.bat
```

That's it! Your browser opens to http://localhost:3000 — click **"Dev Login"** to access.

> **First time?** Initial build takes 3-5 minutes. Subsequent starts are ~30 seconds.

### Available Commands

| Command | Description |
|---------|-------------|
| `./start.sh` | Start the platform |
| `./start.sh stop` | Stop all services |
| `./start.sh logs` | View live logs |
| `./start.sh status` | Check service health |

### Need Help Getting Started?

📖 **[Complete Getting Started Guide](GETTING_STARTED.md)** — Step-by-step instructions with screenshots, troubleshooting, and system requirements.

---

### Alternative Setup Options

For developers who prefer more control:

```bash
./init.sh demo    # Interactive demo setup with sample data
./init.sh dev     # Local development mode (requires Node.js 20+)
make help         # See all Makefile commands
```

**Try in your browser** (no installation):

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/grcengineering/gigachad-grc)

➡️ See the **[Demo & Sandbox Guide](docs/DEMO.md)** for detailed walkthrough with sample data.

---

## 📚 Documentation

### Getting Started

| Document | Description |
|----------|-------------|
| **[Getting Started Guide](GETTING_STARTED.md)** | **Start here!** Complete setup guide for all skill levels |
| [Quick Start Guide](docs/QUICK_START.md) | Fast-track setup for experienced users |
| [Demo & Sandbox](docs/DEMO.md) | Try with sample data, one-click demo setup |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |

### Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture Guide](docs/ARCHITECTURE.md) | System architecture, API gateway, microservices, network topology |
| [API Reference](docs/API.md) | Complete API documentation with endpoints, authentication, examples |
| [Configuration Reference](docs/CONFIGURATION.md) | Environment variables, service configuration, Traefik, database |
| [Development Guide](docs/DEVELOPMENT.md) | Local setup, project structure, coding standards, testing |
| [Deployment Guide](docs/DEPLOYMENT.md) | Production deployment, CI/CD, monitoring, backups |
| [Upgrade Guide](docs/UPGRADE.md) | Upgrading between versions, migration steps |

### Security & Compliance

| Document | Description |
|----------|-------------|
| [Security Policy](SECURITY.md) | Security vulnerability reporting and policies |
| [Security Audit](docs/SECURITY_AUDIT.md) | Dependency audit findings, vulnerability status, remediation |
| [Security Model](docs/SECURITY_MODEL.md) | Comprehensive security architecture, authentication, authorization, and hardening |
| [Permissions Matrix](docs/PERMISSIONS_MATRIX.md) | Role-based access control and permission definitions |
| [MCP Credential Security](docs/security/mcp-credential-security.md) | Secure handling of MCP server credentials |

### Configuration & Operations

| Document | Description |
|----------|-------------|
| [Environment Configuration](docs/ENV_CONFIGURATION.md) | Detailed environment variable reference |
| [Module Configuration](docs/MODULE_CONFIGURATION.md) | Enable/disable platform modules |
| [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md) | Production-ready deployment checklist |

### Platform Guides

| Document | Description |
|----------|-------------|
| [Platform Review](docs/PLATFORM_REVIEW.md) | Comprehensive platform capabilities overview |
| [Help Center](docs/help/README.md) | User guides and how-to documentation |
| [MCP Quick Start](docs/guides/mcp-quick-start.md) | Getting started with MCP server integration |

### Audit & Stability Reports

| Document | Description |
|----------|-------------|
| [Stability Audit Phase 1](docs/STABILITY_AUDIT_PHASE1_REPORT.md) | Phase 1 stability audit findings and fixes |
| [Stability Audit Phase 2](docs/STABILITY_AUDIT_PHASE2_REPORT.md) | Phase 2 stability audit findings and fixes |

### Quick Links

- **API Gateway**: Traefik v3.0 - [Configuration Details](docs/ARCHITECTURE.md#api-gateway-traefik)
- **Authentication**: Keycloak OAuth 2.0 - [Setup Guide](docs/CONFIGURATION.md#keycloak-configuration)
- **Database**: PostgreSQL 16 - [Schema Details](docs/CONFIGURATION.md#database-configuration)
- **Monitoring**: Prometheus + Grafana - [Setup Guide](monitoring/README.md)
- **AI Integration**: OpenAI/Anthropic - [AI Configuration](docs/help/ai-mcp/risk-assistant.md)

## Platform Overview

GigaChad GRC is a complete enterprise GRC solution organized into specialized modules, each handling a critical aspect of your compliance and risk management program:

- **Compliance**: Controls, frameworks, policies, and evidence management
- **Data Management**: Evidence library, policies, assets, and integrations
- **Risk Management**: Risk register, scenarios, heatmaps, and treatment tracking
- **Third-Party Risk (TPRM)**: Vendor management, assessments, and contracts
- **Trust**: Security questionnaires, knowledge base, and public trust center
- **Audit**: Internal and external compliance audits with auditor portal
- **Tools**: Awareness training, security education programs
- **AI & Automation**: AI-powered risk scoring, categorization, smart search, and MCP server integration
- **Administration**: User management, permissions, audit logs, and settings

## Modules & Capabilities

### 1. Compliance Module

#### Controls Management (Port 3001)
Complete lifecycle management for security controls across all frameworks.

**Features:**
- Control library with pre-loaded SOC 2 and ISO 27001 controls
- Implementation status tracking (Not Started, In Progress, Implemented, Validated)
- Testing history with evidence collection
- Control owners and assignment
- Evidence linking and attachment
- Test scheduling and reminders
- Control effectiveness scoring
- Cross-framework mapping

**API Endpoints:**
- `GET/POST /api/controls` - List and create controls
- `GET/PATCH/DELETE /api/controls/:id` - Manage individual controls
- `GET /api/controls/:id/evidence` - View linked evidence
- `POST /api/controls/:id/test` - Record testing activities

#### Frameworks (Port 3002)
Framework readiness assessment and gap analysis for major compliance standards.

**Pre-loaded Frameworks:**
- SOC 2 Type II (Trust Services Criteria)
- ISO 27001:2022 (with Annex A controls)
- NIST CSF 2.0 (ready)
- PCI DSS (ready)
- HIPAA (ready)
- Custom frameworks

**Features:**
- Real-time readiness scoring
- Gap analysis with prioritized recommendations
- Control mapping across frameworks
- Implementation roadmaps
- Evidence collection per requirement
- Compliance status dashboards
- Framework comparison and overlap analysis

**API Endpoints:**
- `GET /api/frameworks` - List all frameworks
- `GET /api/frameworks/:id` - Framework details with requirements
- `GET /api/frameworks/:id/readiness` - Calculate readiness score
- `POST /api/frameworks/:id/assess` - Submit control assessments

### 2. Data Management Module

#### Evidence Library
Centralized repository for all compliance evidence with intelligent organization.

**Features:**
- Multi-backend storage (Local, RustFS/S3, Azure Blob)
- Document versioning and history
- Evidence types (Policy, Procedure, Screenshot, Report, Log, Certificate)
- Control linking with many-to-many relationships
- Automated retention policies
- Full-text search and filtering
- Collection dates and validity periods
- Evidence review workflows

**API Endpoints:**
- `GET/POST /api/evidence` - List and upload evidence
- `GET/DELETE /api/evidence/:id` - Manage evidence items
- `GET /api/evidence/:id/download` - Download evidence files

#### Policies (Port 3004)
Policy lifecycle management with versioning and approval workflows.

**Features:**
- Policy document management with versions
- Approval workflows (Draft → Review → Approved → Published)
- Review scheduling and reminders
- Control linking
- Policy effectiveness tracking
- Document history and audit trail
- Policy categories and tagging

**API Endpoints:**
- `GET/POST /api/policies` - List and create policies
- `GET /api/policies/:id` - Policy details
- `POST /api/policies/:id/approve` - Approve policy version
- `GET /api/policies/:id/versions` - Version history

#### Assets
IT asset inventory with security metadata and classification.

**Features:**
- Asset inventory management (Hardware, Software, Data, People, Services)
- Criticality classification (Critical, High, Medium, Low)
- Data sensitivity classification (Public, Internal, Confidential, Restricted)
- Asset owner assignment
- Risk and control linking
- Business process association
- Asset lifecycle tracking (Active, Retired, Decommissioned)
- Custom metadata and tagging

**API Endpoints:**
- `GET/POST /api/assets` - List and create assets
- `GET/PATCH/DELETE /api/assets/:id` - Manage individual assets
- `POST /api/assets/:id/link` - Link assets to risks/controls

#### Integrations
External tool integrations for automated evidence collection.

**Supported Integrations:**
- **AWS**: S3 bucket configs, IAM policies, EC2 security groups, VPC flow logs, Config rules
- **Azure**: Resource inventory, security center findings, compliance policies
- **GitHub**: Branch protection rules, Dependabot alerts, secrets scanning, code scanning
- **Okta**: MFA enrollment, password policies, inactive users, admin access logs
- **Google Workspace**: User MFA status, admin roles, Drive sharing settings
- **Jamf**: Device encryption status, OS versions, security patch compliance

**Features:**
- Scheduled evidence collection (hourly, daily, weekly)
- Credential management with encryption
- Collection history and status tracking
- Automatic evidence upload to library
- Integration health monitoring

**API Endpoints:**
- `GET/POST /api/integrations` - Integration management
- `POST /api/integrations/:id/test` - Test connection
- `POST /api/integrations/:id/collect` - Trigger manual collection

### 3. Risk Management Module (Ports 3001-3002)

Complete enterprise risk management with quantitative and qualitative approaches.

#### Risk Dashboard
Executive overview of organizational risk posture.

**Metrics:**
- Total risks by severity
- Risk trend analysis
- Treatment status
- High-priority risks
- Risk appetite vs. actual
- Top risk categories

#### Risk Register
Central repository for all identified risks with comprehensive tracking.

**Features:**
- Risk identification and documentation
- Likelihood and impact scoring (1-5 scale)
- Inherent vs. residual risk calculation
- Risk owners and accountability
- Treatment plans (Accept, Mitigate, Transfer, Avoid)
- Status tracking (Identified → Assessed → Treated → Monitored)
- Control linking and effectiveness
- Risk categories and tagging

**Risk Scoring:**
- Quantitative: Likelihood × Impact (1-25 scale)
- Qualitative: Low, Medium, High, Critical
- Customizable risk matrices
- Automated risk level calculations

#### Risk Heatmap
Visual risk matrix showing risk distribution by likelihood and impact.

**Features:**
- Interactive heat map visualization
- Risk clustering by category
- Drill-down to risk details
- Filter by status, owner, category
- Export to PDF/PNG

#### Risk Scenarios
Scenario-based risk modeling and planning.

**Features:**
- Threat scenario modeling
- Impact analysis
- Mitigation strategy planning
- Scenario libraries (Cyber attacks, Data breaches, Disasters)

#### My Risk Queue
Personal task list for assigned risks and actions.

**Features:**
- Assigned risks requiring action
- Overdue treatment plans
- Upcoming risk reviews
- Evidence collection tasks

#### Risk Reports
Comprehensive risk reporting and analytics.

**Report Types:**
- Executive risk summary
- Risk register report
- Treatment effectiveness
- Risk trend analysis
- Control effectiveness
- Custom reports with filters

**API Endpoints:**
- `GET/POST /api/risks` - List and create risks
- `GET/PATCH /api/risks/:id` - Manage risks
- `POST /api/risks/:id/assess` - Update risk assessment
- `GET /api/risk-dashboard` - Dashboard statistics
- `GET /api/risk-heatmap` - Heatmap data

### 4. Third-Party Risk Management (TPRM) (Port 3005)

Complete vendor risk management lifecycle.

#### Vendor Management
Centralized vendor database with risk profiles.

**Features:**
- Vendor contact information
- Risk tier classification (Critical, High, Medium, Low)
- Vendor categories (Cloud, SaaS, Consultant, etc.)
- Vendor status (Active, Under Review, Offboarded)
- Due diligence documentation
- Vendor lifecycle tracking
- Relationship owners

#### Assessments
Security assessments and questionnaires for vendors.

**Assessment Types:**
- Initial due diligence
- Annual reviews
- Incident-triggered assessments
- Ad-hoc assessments

**Features:**
- Customizable questionnaire templates
- Assessment scoring and risk rating
- Finding tracking and remediation
- Evidence collection from vendors
- Assessment history and trends
- Approval workflows

#### Contracts
Contract lifecycle management for vendor relationships.

**Features:**
- Contract metadata (dates, value, terms)
- SLA tracking
- Renewal reminders
- Contract document storage
- Amendment history
- Contract status (Draft, Active, Expiring, Expired)
- Vendor linking

**API Endpoints:**
- `GET/POST /api/vendors` - Vendor management
- `GET/POST /api/assessments` - Assessment workflows
- `GET/POST /api/contracts` - Contract management

### 5. Trust Module (Port 3006)

Build and maintain customer trust through transparency and responsiveness.

#### Questionnaires
Security questionnaire response management system.

**Features:**
- Questionnaire templates (SOC 2, ISO 27001, Custom)
- Question bank with reusable answers
- Response history and versioning
- Customer portal for submission
- Approval workflows
- Evidence attachment
- Auto-population from knowledge base

#### Knowledge Base
Centralized security knowledge repository for consistent responses.

**Features:**
- Question and answer library
- Categories and tagging
- Search and filtering
- Version control
- Approval workflows
- Control/policy linking
- Confidence scoring

**Use Cases:**
- Pre-populate questionnaire responses
- Sales engineering reference
- Customer FAQ
- Internal training

#### Trust Center
Public-facing security and compliance transparency portal.

**Features:**
- Customizable branding (logo, colors, description)
- Section-based content management:
  - **Overview**: Company security commitment
  - **Certifications & Compliance**: Frameworks and certifications
  - **Security Controls**: Technical and operational controls
  - **Policies & Documentation**: Security policies
  - **Security Updates**: News and incident communications
  - **Contact**: Security team contact information
- Publish/draft workflow
- Preview mode before publishing
- SEO-friendly public URLs
- Responsive design

**API Endpoints:**
- `GET/POST /api/questionnaires` - Questionnaire management
- `GET/POST /api/knowledge-base` - Knowledge base entries
- `GET/PATCH /api/trust-center/config` - Trust center configuration
- `GET/POST /api/trust-center/content` - Content management
- `GET /api/trust-center/public` - Public trust center view

### 6. Audit Module (Port 3007) **[NEW]**

Comprehensive audit management for internal and external compliance audits.

#### Audits
Central audit management with support for multiple audit types.

**Audit Types:**
- Internal audits
- External audits (SOC 2, ISO 27001)
- Surveillance audits
- Certification audits

**Features:**
- Audit planning and scoping
- Framework selection (SOC 2, ISO 27001, HIPAA, PCI DSS)
- Audit team management
- External auditor information tracking
- Timeline tracking (planned vs. actual)
- Audit status workflow (Planning → Fieldwork → Testing → Reporting → Completed)
- Finding aggregation and statistics
- Portal access for external auditors
- FieldGuide integration ready

**Auditor Portal:**
- Secure access code generation
- Temporary access with expiration
- Document request submission
- Evidence review interface
- Comment threads on requests

#### Audit Requests
Evidence and documentation request tracking.

**Request Categories:**
- Control documentation
- Policy review
- Evidence collection
- Interviews
- System access
- Walkthroughs

**Features:**
- Request assignment to internal team
- Priority levels (Low, Medium, High, Critical)
- Due date tracking with overdue alerts
- Status workflow (Open → In Progress → Submitted → Under Review → Approved)
- Evidence attachment
- Comment threads
- Clarification requests
- Control/requirement linking

#### Findings
Audit finding and observation management.

**Finding Types:**
- Control deficiencies
- Documentation gaps
- Process issues
- Compliance gaps

**Features:**
- Severity classification (Critical, High, Medium, Low, Observation)
- Root cause analysis
- Impact assessment
- Remediation planning
- Remediation owner assignment
- Target and actual completion dates
- Management response tracking
- Status tracking (Open → Remediation Planned → In Progress → Resolved)
- Control/requirement linking

#### Additional Capabilities:
- **Test Results**: Control testing with sampling methodologies
- **Meetings**: Audit kickoffs, status updates, interviews, closing meetings
- **Activity Log**: Complete audit trail of all actions
- **Dashboard**: Real-time audit statistics and progress

**API Endpoints:**
- `GET/POST /api/audits` - Audit management
- `GET /api/audits/dashboard` - Audit statistics
- `POST /api/audits/:id/portal/enable` - Enable auditor portal
- `GET/POST /api/audit-requests` - Request management
- `POST /api/audit-requests/:id/comments` - Discussion threads
- `GET/POST /api/audit-findings` - Finding management

**FieldGuide Integration:**
- OAuth 2.0 authentication with FieldGuide
- Bi-directional sync with FieldGuide platform
- Audit data synchronization
- Request mapping with automatic updates
- Evidence sharing between platforms
- Webhook support for real-time updates
- Conflict resolution for simultaneous edits
- Sync history and audit logging

**FieldGuide API Endpoints:**
- `GET /api/fieldguide/connect` - Initiate OAuth connection
- `GET /api/fieldguide/callback` - OAuth callback handler
- `POST /api/fieldguide/sync` - Trigger bi-directional sync
- `POST /api/fieldguide/webhooks` - Webhook receiver

### 7. Tools Module

#### Awareness & Training
Comprehensive security awareness training program management.

**Features:**
- Training course management (Security Basics, Phishing Awareness, Data Protection, etc.)
- Training assignment to users and groups
- Progress tracking and completion status
- Quiz engine with multiple question types
- Certificate generation upon completion
- Compliance tracking for required training
- Training content management

**Quiz Engine:**
- Multiple choice, true/false, and multi-select questions
- Configurable passing scores
- Question randomization
- Answer explanations
- Retake policies

**Certificate Features:**
- Automatic generation on course completion
- PDF download
- Unique certificate IDs for verification
- Expiration dates for recurring training

**API Endpoints:**
- `GET/POST /api/training/courses` - Course management
- `GET/POST /api/training/assignments` - Assign training
- `POST /api/training/:courseId/quiz` - Take quiz
- `GET /api/training/:courseId/certificate` - Download certificate

#### Phishing Simulations
Security awareness through realistic phishing simulations.

**Campaign Features:**
- Campaign creation with templates
- Target group selection
- Scheduling (immediate, scheduled, recurring)
- Email template customization
- Landing page configuration
- Real-time tracking and analytics

**Analytics & Reporting:**
- Click rates by department
- Report rates
- Training completion correlation
- Historical trend analysis
- User risk scoring
- Department benchmarking

**Template Library:**
- Pre-built phishing templates (Credential harvesting, Malware, Gift card scams, etc.)
- Custom template creation
- Template difficulty ratings
- Industry-specific templates

**API Endpoints:**
- `GET/POST /api/phishing/campaigns` - Campaign management
- `GET /api/phishing/campaigns/:id/analytics` - Campaign analytics
- `GET/POST /api/phishing/templates` - Template management
- `POST /api/phishing/report` - User phishing report submission

### 8. AI & Automation Module

Enterprise AI capabilities and MCP (Model Context Protocol) server integration for intelligent GRC operations.

#### AI Configuration
AI-powered features using GPT-5 (OpenAI) or Claude Opus 4.5 (Anthropic).

**Supported AI Providers**:
- **OpenAI**: GPT-5 (Most Capable), GPT-5 Mini, o3 (Advanced Reasoning), o3-mini
- **Anthropic**: Claude Opus 4.5 (Most Capable), Claude Sonnet 4, Claude 3.5 Sonnet, Claude 3.5 Haiku

**AI Features**:
- **Risk Scoring**: AI-suggested risk likelihood and impact with rationale
- **Auto-Categorization**: Automatic categorization and tagging of controls, risks, policies
- **Smart Search**: Natural language search across all GRC modules
- **Policy Drafting**: Generate policy drafts based on requirements and context
- **Control Suggestions**: AI-recommended controls for risks and compliance requirements

#### MCP Server Integration
Model Context Protocol servers for automated GRC workflows.

**Available MCP Servers**:
- **grc-evidence**: Automated evidence collection from cloud providers and security tools
  - AWS (S3, IAM, EC2, VPC, Config)
  - Azure resources
  - GitHub (branch protection, secrets scanning, Dependabot)
  - Okta (MFA status, password policies, inactive users)
  - Google Workspace (user MFA, admin roles, sharing settings)
  - Jamf (device encryption, OS versions, security patches)
  - Vulnerability scanning integration
  - Screenshot capture for visual evidence

- **grc-compliance**: Automated compliance checking and reporting
  - Control testing automation
  - Policy validation against requirements
  - Compliance report generation
  - Framework-specific checks (SOC 2, ISO 27001, HIPAA, GDPR)

- **grc-ai-assistant**: AI-powered GRC operations
  - Deep risk analysis with contextual understanding
  - Control recommendations based on risks and requirements
  - Policy document drafting
  - Automatic requirement mapping
  - Finding explanation in plain language
  - Remediation prioritization
  - Compliance gap analysis
  - Vendor risk assessment

**API Endpoints**:
- `GET /api/ai/config` - Get AI configuration
- `POST /api/ai/risk-scoring` - AI risk scoring suggestions
- `POST /api/ai/categorize` - Auto-categorization
- `POST /api/ai/search` - Smart natural language search
- `GET /api/mcp/servers` - List active MCP servers
- `POST /api/mcp/tools/call` - Execute MCP tool
- `POST /api/mcp/workflows` - Manage MCP workflows

### 9. Settings & Administration

#### User Management
User account and access control management via Keycloak.

**Features:**
- User provisioning and deactivation
- Role assignment (Admin, Compliance Manager, Auditor, Viewer)
- SSO integration via Keycloak
- Multi-factor authentication
- Session management

#### Permissions
Role-based access control and permission groups.

**Default Roles:**
- **Admin**: Full system access
- **Compliance Manager**: Manage controls, evidence, frameworks
- **Risk Manager**: Manage risks and treatments
- **Auditor**: Read-only access to controls and evidence
- **Viewer**: Limited read access

#### Audit Log
Complete system audit trail for compliance and forensics.

**Tracked Events:**
- User actions (login, logout, changes)
- Entity changes (create, update, delete)
- Access attempts
- Configuration changes
- Evidence uploads/downloads
- Approval actions

**Features:**
- Search and filtering
- Export to CSV
- Date range queries
- User activity reports
- Change history with before/after values

#### Risk Configuration
Risk management system configuration.

**Settings:**
- Risk scoring methodology
- Likelihood definitions (1-5)
- Impact definitions (1-5)
- Risk appetite thresholds
- Risk categories
- Treatment options
- Review frequencies

## Dashboard

The main dashboard provides an executive overview of your entire GRC program:

**Compliance Metrics:**
- Overall compliance score
- Control implementation status
- Framework readiness percentages
- Evidence collection status
- Upcoming control tests

**Risk Metrics:**
- Risk distribution by severity
- High-priority risks requiring attention
- Risk treatment progress
- Top risk categories

**Audit Metrics:**
- Active audits
- Open audit requests
- Pending findings
- Upcoming audit activities

**Recent Activity:**
- Control updates
- Evidence uploads
- Risk assessments
- Audit progress
- Policy approvals

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                           Traefik Gateway                              │
│                           (API Routing)                                │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────┤
│ Controls │Frameworks│ Policies │   TPRM   │  Trust   │  Audit   │ UI │
│  :3001   │  :3002   │  :3004   │  :3005   │  :3006   │  :3007   │:5173
├──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴────┤
│                          Shared Library                                │
│          (Prisma Schema, Types, Auth, Storage, Events)                 │
├──────────┬──────────┬──────────┬──────────────────────────────────────┤
│PostgreSQL│  Redis   │ Keycloak │              RustFS                  │
│  :5433   │  :6380   │  :8080   │         :9000 / :9001                │
│(Database)│ (Cache)  │  (Auth)  │    (S3-Compatible Storage)           │
└──────────┴──────────┴──────────┴──────────────────────────────────────┘

Frontend (React + Vite)
    ↓
Traefik (API Gateway)
    ↓
Microservices Layer:
  - Controls Service (NestJS) → Controls + Evidence + Audit Logging
  - Frameworks Service (NestJS) → Frameworks + Risk Management
  - Policies Service (NestJS) → Policy Lifecycle
  - TPRM Service (NestJS) → Vendors + Assessments + Contracts
  - Trust Service (NestJS) → Questionnaires + Knowledge Base + Trust Center
  - Audit Service (NestJS) → Audit Management + Auditor Portal
    ↓
Infrastructure Layer:
  - PostgreSQL (Single database, multi-tenant schema)
  - Redis (Caching + Session Management)
  - Keycloak (SSO + RBAC)
  - RustFS (S3-compatible object storage - https://github.com/rustfs/rustfs)
```

## Tech Stack

- **Backend**: Node.js + TypeScript with NestJS
- **Frontend**: React + TypeScript with Vite, TailwindCSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Keycloak (SSO, RBAC)
- **API Gateway**: Traefik
- **Cache/Events**: Redis
- **Storage**: RustFS (S3-compatible, Apache 2.0 - https://github.com/rustfs/rustfs)
- **Containers**: Docker with Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### The Easy Way (Recommended)

```bash
git clone https://github.com/your-org/gigachad-grc.git
cd gigachad-grc
./init.sh demo
```

This single command:
- Generates secure secrets and creates `.env`
- Starts all infrastructure (PostgreSQL, Redis, Keycloak, RustFS)
- Builds and starts all backend services
- Starts the frontend and opens your browser

**Login**: Click "Dev Login" - no password needed!

### Using Make

```bash
make demo      # One-click demo
make dev       # Development setup  
make up        # Start containers
make down      # Stop containers
make logs      # View logs
make help      # See all commands
```

### Manual Setup

If you prefer manual control:

```bash
# 1. Create environment
cp env.example .env

# 2. Start infrastructure
docker compose up -d postgres redis keycloak rustfs

# 3. Start services
docker compose up -d

# 4. Access the app
open http://localhost:3000
```

### Access Points

- **Frontend**: http://localhost:3000 (or :5173 in dev)
- **Keycloak Admin**: http://localhost:8080 (admin/admin)
- **API Docs**: http://localhost:3001/api/docs
- **RustFS Console**: http://localhost:9001 (rustfsadmin/rustfsadmin)

## Production Readiness & Resilience

GigaChad GRC includes comprehensive built-in tools for ensuring production readiness:

### Production Validation CLI

Before deploying to production, run the validation script to check all configuration:

```bash
# Basic validation
npm run validate:production

# Strict mode (exit non-zero on warnings)
npm run validate:production:strict
```

The script validates:
- Security configuration (encryption keys, passwords, auth mode)
- Database connections and SSL
- Backup configuration
- Authentication setup (Keycloak)
- Network/CORS settings

### System Health Dashboard

Administrators can view real-time system health in **Settings > Organization Settings > System Health**:

- **System Health Banner**: Displays critical warnings for security issues, backup problems, and misconfigurations
- **Production Readiness Score**: 0-100 score indicating deployment readiness
- **Setup Wizard**: Guided configuration for new installations

### Automatic Features

When running with Docker, the entrypoint script provides:

| Feature | Environment Variable | Description |
|---------|---------------------|-------------|
| Auto-backup scheduling | `AUTO_BACKUP_ENABLED=true` | Schedules daily backups via cron |
| Database migrations | `AUTO_MIGRATE=true` | Runs migrations on startup |
| Dependency wait | `WAIT_FOR_DB=true` | Waits for PostgreSQL before starting |
| Config warnings | Always enabled | Logs warnings for production misconfigurations |

### Data Persistence

All critical data is stored in Docker named volumes that survive container restarts:

| Data Type | Volume | Survives Crash |
|-----------|--------|----------------|
| Database | `postgres_data` | ✅ Yes |
| Evidence Files | `rustfs_data` | ✅ Yes |
| Cache/Sessions | `redis_data` | ✅ Yes |
| Metrics | `prometheus_data` | ✅ Yes |

**Important**: Running `docker-compose down -v` will delete volumes. Always run backups before maintenance.

### Backup & Restore

```bash
# Create backup (stored in /backups/gigachad-grc/)
npm run backup

# Restore from backup
npm run restore /path/to/backup.tar.gz
```

For detailed resilience documentation, see [System Health Guide](docs/help/admin/system-health.md).

## Project Structure

```
gigachad-grc/
├── services/
│   ├── shared/               # Shared TypeScript library
│   │   ├── src/
│   │   │   ├── types/        # Type definitions
│   │   │   ├── auth/         # Auth middleware
│   │   │   ├── storage/      # Storage abstraction
│   │   │   ├── events/       # Event bus
│   │   │   ├── utils/        # Utilities
│   │   │   └── logger/       # Logging
│   │   └── prisma/           # Unified database schema (all modules)
│   │       └── schema.prisma # Single source of truth
│   │
│   ├── controls/             # Controls + Evidence + Audit Logging
│   │   ├── src/
│   │   │   ├── controls/     # Control management
│   │   │   ├── evidence/     # Evidence library
│   │   │   ├── audit/        # Activity audit logging
│   │   │   └── testing/      # Control testing
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── frameworks/           # Frameworks + Risk Management
│   │   ├── src/
│   │   │   ├── frameworks/   # Framework assessments
│   │   │   ├── risks/        # Risk register
│   │   │   ├── scenarios/    # Risk scenarios
│   │   │   └── treatments/   # Risk treatments
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── policies/             # Policy Lifecycle Management
│   │   ├── src/
│   │   │   ├── policies/     # Policy CRUD
│   │   │   ├── versions/     # Version control
│   │   │   └── approvals/    # Approval workflows
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── tprm/                 # Third-Party Risk Management
│   │   ├── src/
│   │   │   ├── vendors/      # Vendor management
│   │   │   ├── assessments/  # Security assessments
│   │   │   └── contracts/    # Contract lifecycle
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── trust/                # Trust & Transparency
│   │   ├── src/
│   │   │   ├── questionnaires/  # Security questionnaires
│   │   │   ├── knowledge-base/  # Q&A repository
│   │   │   └── trust-center/    # Public trust portal
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── audit/                # Audit Management (NEW)
│       ├── src/
│       │   ├── audits/       # Audit orchestration
│       │   ├── requests/     # Evidence requests
│       │   ├── findings/     # Audit findings
│       │   ├── evidence/     # Audit evidence
│       │   ├── portal/       # External auditor portal
│       │   └── fieldguide/   # FieldGuide integration
│       ├── Dockerfile
│       └── package.json
│
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Controls.tsx
│   │   │   ├── Frameworks.tsx
│   │   │   ├── Risks.tsx
│   │   │   ├── Vendors.tsx
│   │   │   ├── Questionnaires.tsx
│   │   │   ├── Audits.tsx    # NEW
│   │   │   └── ...
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts (Auth)
│   │   └── lib/              # Utilities and API clients
│   └── package.json
│
├── auth/                     # Keycloak configuration
│   └── realm-export.json     # Pre-configured realm
│
├── gateway/                  # Traefik configuration
│   └── traefik.yml
│
├── database/
│   ├── init/                 # Database initialization
│   └── seeds/                # Seed data (frameworks, controls)
│
├── docker-compose.yml        # Production compose
├── docker-compose.dev.yml    # Development overrides
├── .env.example              # Environment template
└── README.md                 # This file
```

## Service Ports & Documentation

Each microservice runs on its own port with Swagger API documentation:

| Service | Port | Swagger Docs | Description |
|---------|------|--------------|-------------|
| **Frontend** | 5173 | N/A | React SPA (Vite dev server) |
| **Controls** | 3001 | http://localhost:3001/api/docs | Controls, Evidence, Testing |
| **Frameworks** | 3002 | http://localhost:3002/api/docs | Frameworks, Risk Management |
| **Policies** | 3004 | http://localhost:3004/api/docs | Policy Lifecycle Management |
| **TPRM** | 3005 | http://localhost:3005/api/docs | Vendor Risk Management |
| **Trust** | 3006 | http://localhost:3006/api/docs | Questionnaires, KB, Trust Center |
| **Audit** | 3007 | http://localhost:3007/api/docs | Audit Management |
| **PostgreSQL** | 5433 | N/A | Primary database |
| **Redis** | 6380 | N/A | Cache & sessions |
| **Keycloak** | 8080 | http://localhost:8080 | Auth & SSO (admin/admin) |
| **Traefik** | 80/443 | http://localhost:8090 | API Gateway dashboard |
| **RustFS API** | 9000 | N/A | S3-compatible object storage API |
| **RustFS Console** | 9001 | http://localhost:9001 | Storage admin UI (rustfsadmin/rustfsadmin) |

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | Database user | grc |
| `POSTGRES_PASSWORD` | Database password | grc_secret |
| `POSTGRES_DB` | Database name | gigachad_grc |
| `REDIS_PASSWORD` | Redis password | redis_secret |
| `KEYCLOAK_ADMIN` | Keycloak admin user | admin |
| `KEYCLOAK_ADMIN_PASSWORD` | Keycloak admin password | admin |
| `MINIO_ROOT_USER` | RustFS/S3 root user | rustfsadmin |
| `MINIO_ROOT_PASSWORD` | RustFS/S3 root password | (secure password) |
| `STORAGE_TYPE` | Storage backend (local/s3/minio) | s3 |

### Storage Configuration

The platform supports multiple storage backends:

**Local Storage:**
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage
```

**RustFS/S3 (Recommended):**
```env
# RustFS is a high-performance, Apache 2.0 licensed S3-compatible storage
# https://github.com/rustfs/rustfs
STORAGE_TYPE=s3
S3_ENDPOINT=rustfs
S3_PORT=9000
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=your_secure_password
S3_BUCKET=grc-evidence
```

## Module Extraction

Each service is designed to run independently. To extract a module:

1. Copy the service directory
2. Update the `DATABASE_URL` in the service's environment
3. Run migrations: `npm run prisma:migrate`
4. Build and run: `docker build -t my-service . && docker run my-service`

## Security Considerations

- All passwords should be changed in production
- Enable TLS/SSL for all services
- Configure Keycloak for production use
- Use proper secrets management
- Review and harden Docker images
- Images should be pulled from Docker Hub's Hardened Images

## License

This project is licensed under the **Elastic License 2.0 (ELv2)**.

### What You CAN Do:
- Use internally at your company for commercial purposes
- Modify the software for your own use
- Self-host on your own infrastructure
- Contribute improvements back to the project

### What You CANNOT Do:
- Offer this software as a hosted/managed service to third parties
- Sell the software or derivatives to others
- Create a competing commercial GRC product based on this code
- Remove or obscure license/copyright notices

See the [LICENSE](LICENSE) file for the complete license terms.

For commercial licensing inquiries (e.g., to offer as a managed service), please contact the project maintainers.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

By contributing, you agree that your contributions will be licensed under the same Elastic License 2.0. Please also review our [Code of Conduct](CODE_OF_CONDUCT.md).

**Quick Start:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our [coding standards](CONTRIBUTING.md#coding-standards)
4. Run tests (`npm test`)
5. Submit a pull request

## Support

- **Documentation**: Check the [docs folder](./docs) for guides and references
- **Issues**: Use the [GitHub issue tracker](../../issues) for bugs and feature requests
- **Security**: Report vulnerabilities privately via [GitHub Security Advisories](../../security/advisories/new)
- **Discussions**: Use [GitHub Discussions](../../discussions) for questions and ideas



