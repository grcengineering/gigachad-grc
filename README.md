# GigaChad GRC

A comprehensive, modular, containerized Governance, Risk, and Compliance (GRC) platform built with modern technologies. Manage your entire security program from compliance tracking to risk management, third-party assessments, and external audits.

## Platform Overview

GigaChad GRC is a complete enterprise GRC solution organized into specialized modules, each handling a critical aspect of your compliance and risk management program:

- **Compliance**: Controls, frameworks, policies, and evidence management
- **Data Management**: Evidence library, policies, assets, and integrations
- **Risk Management**: Risk register, scenarios, heatmaps, and treatment tracking
- **Third-Party Risk (TPRM)**: Vendor management, assessments, and contracts
- **Trust**: Security questionnaires, knowledge base, and public trust center
- **Audit**: Internal and external compliance audits with auditor portal
- **Tools**: Awareness training, security education programs
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
- Multi-backend storage (Local, MinIO/S3, Azure Blob)
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
IT asset inventory with security metadata (Placeholder - Ready for implementation).

#### Integrations
External tool integrations for automated evidence collection (Placeholder - Ready for implementation).

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
- Bi-directional sync with FieldGuide platform
- Audit data synchronization
- Request mapping
- Evidence sharing
- Webhook support (ready for implementation)

### 7. Tools Module

#### Awareness & Training
Security awareness training program management (Placeholder - Ready for implementation).

### 8. Settings & Administration

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
│PostgreSQL│  Redis   │ Keycloak │              MinIO                   │
│  :5433   │  :6380   │  :8080   │         :9000 / :9001                │
│(Database)│ (Cache)  │  (Auth)  │        (Object Storage)              │
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
  - MinIO (S3-compatible object storage)
```

## Tech Stack

- **Backend**: Node.js + TypeScript with NestJS
- **Frontend**: React + TypeScript with Vite, TailwindCSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Keycloak (SSO, RBAC)
- **API Gateway**: Traefik
- **Cache/Events**: Redis
- **Storage**: MinIO (S3-compatible)
- **Containers**: Docker with Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### Running with Docker

1. Clone the repository:
```bash
git clone https://github.com/your-org/gigachad-grc.git
cd gigachad-grc
```

2. Copy environment file:
```bash
cp env.example .env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Run database migrations and seed data:
```bash
docker-compose exec controls npm run prisma:migrate
docker-compose exec frameworks npm run seed
```

5. Access the application:
- Frontend: http://localhost:3000
- Keycloak Admin: http://localhost:8080 (admin/admin)
- Traefik Dashboard: http://localhost:8090
- MinIO Console: http://localhost:9001 (minioadmin/minioadminpassword)

### Local Development

1. Start infrastructure services:
```bash
docker-compose up -d postgres redis keycloak minio
```

2. Install dependencies:
```bash
# Shared library
cd services/shared && npm install && npm run build && cd ../..

# Controls service
cd services/controls && npm install && cd ../..

# Frameworks service
cd services/frameworks && npm install && cd ../..

# Frontend
cd frontend && npm install && cd ..
```

3. Run services:
```bash
# Terminal 1 - Controls service
cd services/controls && npm run start:dev

# Terminal 2 - Frameworks service
cd services/frameworks && npm run start:dev

# Terminal 3 - Frontend
cd frontend && npm run dev
```

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
| **MinIO API** | 9000 | N/A | Object storage API |
| **MinIO Console** | 9001 | http://localhost:9001 | Storage admin UI |

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
| `MINIO_ROOT_USER` | MinIO root user | minioadmin |
| `MINIO_ROOT_PASSWORD` | MinIO root password | minioadminpassword |
| `STORAGE_TYPE` | Storage backend (local/minio) | minio |

### Storage Configuration

The platform supports multiple storage backends:

**Local Storage:**
```env
STORAGE_TYPE=local
LOCAL_STORAGE_PATH=./storage
```

**MinIO/S3:**
```env
STORAGE_TYPE=minio
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadminpassword
MINIO_BUCKET=grc-evidence
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

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.



