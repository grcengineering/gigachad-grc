# Database Schema Reference

GigaChad GRC uses a single PostgreSQL database with a unified Prisma schema located at `services/shared/prisma/schema.prisma`. All microservices share this schema through the `@gigachad-grc/shared` package.

## Current schema migration

The controls container is the single schema owner in the Docker flow. Its
entrypoint runs the committed Prisma baseline and forward-only migrations through
`deploy/prisma-migrate-safe.sh`, then applies the idempotent BC/DR SQL migration.
Other services do not run their own migrations.

The numbered files under `database/init/` are not a current sequential
application migration chain. PostgreSQL mounts only supporting first-boot
scripts in the Compose files.

For production changes, back up and rehearse the migration chain before Controls
starts. See [Database hardening rollout](DATABASE_HARDENING_ROLLOUT.md) and
[Upgrade Guide](UPGRADE.md).

## Entity Relationship Overview

```
Organization (tenant root)
├── Users, Workspaces, Departments
├── Controls ──── ControlImplementations ──── ControlTests
│   └── ControlMappings ── FrameworkRequirements ── Frameworks
├── Evidence ──── EvidenceControlLinks
├── Policies ──── PolicyVersions ──── PolicyApprovals
├── Risks ──── RiskAssessments, RiskTreatments
│   └── RiskControls, RiskAssets, RiskScenarios
├── Vendors ──── VendorAssessments, VendorContracts
├── Audits ──── AuditRequests, AuditFindings, AuditTestResults
├── Questionnaires ──── KnowledgeBase
├── Integrations ──── SyncJobs, ComplianceChecks
├── Assets
├── CorrelatedEmployees ──── Training, BackgroundChecks
└── BCDR ──── Incidents, RecoveryTeams
```

## Models by Domain

### Auth, Users, and RBAC

| Model                      | Purpose                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Organization**           | Top-level tenant. All entities belong to an organization.                                                        |
| **User**                   | Platform users. Linked to Keycloak via `keycloakId`. Roles: admin, compliance_manager, auditor, viewer.          |
| **Workspace**              | Multi-product workspaces within an organization. Controls, evidence, risks, and vendors can be workspace-scoped. |
| **WorkspaceMember**        | User membership in a workspace with a role (owner, manager, contributor, viewer).                                |
| **Department**             | Organizational departments with hierarchy (self-referencing `parentId`).                                         |
| **PermissionGroup**        | Named permission sets for RBAC. System groups are immutable.                                                     |
| **UserGroupMembership**    | Links users to permission groups.                                                                                |
| **UserPermissionOverride** | Per-user permission grants/denials that override group permissions.                                              |

### Controls and Compliance

| Model                        | Purpose                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Control**                  | Security controls (e.g., AC-001 "User Access Management"). Has category, status, and organizationId.     |
| **ControlImplementation**    | Per-organization/workspace instance of a control. Tracks implementation status, owner, and test history. |
| **ControlTest**              | Test results for a control implementation (manual or automated, pass/fail/partial).                      |
| **ControlMapping**           | Links a control to a framework requirement (primary, supporting, or partial mapping).                    |
| **ControlEvidenceCollector** | Automated evidence collector tied to a control and integration.                                          |

### Frameworks

| Model                    | Purpose                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| **Framework**            | Compliance frameworks (SOC 2, ISO 27001, NIST CSF, PCI DSS, HIPAA, custom).                |
| **FrameworkRequirement** | Individual requirements within a framework (e.g., CC6.1).                                  |
| **ReadinessAssessment**  | Assessment of an organization's readiness against a framework. Produces a readiness score. |
| **RequirementStatus**    | Per-requirement status within a readiness assessment.                                      |
| **Gap**                  | Identified gaps from readiness assessments, with severity and remediation status.          |
| **RemediationTask**      | Tasks to close gaps, assigned to users with due dates.                                     |

### Evidence

| Model                   | Purpose                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| **Evidence**            | Evidence artifacts (screenshots, documents, exports, logs, certificates). Stored via storage provider. |
| **EvidenceFolder**      | Hierarchical folder structure for organizing evidence.                                                 |
| **EvidenceControlLink** | Many-to-many link between evidence and control implementations.                                        |

### Policies

| Model                 | Purpose                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Policy**            | Security policies with lifecycle status (draft, in_review, approved, published, retired). |
| **PolicyVersion**     | Versioned snapshots of a policy document.                                                 |
| **PolicyApproval**    | Approval records for policy versions.                                                     |
| **PolicyReview**      | Scheduled review dates for policies.                                                      |
| **PolicyControlLink** | Links policies to controls.                                                               |

### Risk Management

The risk module uses a three-ticket workflow: Risk (intake) -> RiskAssessment -> RiskTreatment.

| Model                    | Purpose                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Risk**                 | Risk intake tickets. Status follows the `RiskIntakeStatus` enum (risk_identified -> actual_risk -> risk_analyzed). |
| **RiskAssessment**       | Assessment sub-ticket. Scores likelihood and impact, assigned to a risk assessor.                                  |
| **RiskTreatment**        | Treatment sub-ticket. Tracks treatment decision (mitigate, accept, transfer, avoid) and progress.                  |
| **RiskControl**          | Links risks to controls with effectiveness ratings.                                                                |
| **RiskAsset**            | Links risks to assets.                                                                                             |
| **RiskScenario**         | Scenario modeling attached to a risk.                                                                              |
| **RiskScenarioTemplate** | Reusable scenario templates (e.g., "Ransomware Attack", "Data Breach").                                            |
| **RiskWorkflowTask**     | Workflow tasks generated during risk processing, assigned to users.                                                |
| **RiskConfiguration**    | Per-organization risk methodology settings (scales, thresholds, categories).                                       |
| **RiskHistory**          | Audit trail of all changes to a risk.                                                                              |

### TPRM (Third-Party Risk Management)

| Model                   | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Vendor**              | Third-party vendors with tier classification (tier_1 through tier_4) and status. |
| **VendorAssessment**    | Security assessments of vendors. Tracks inherent and residual risk scores.       |
| **VendorContract**      | Contract lifecycle (draft, active, expiring_soon, expired, terminated, renewed). |
| **VendorContact**       | Contact information for vendor personnel.                                        |
| **VendorRiskFinding**   | Risk findings from vendor assessments.                                           |
| **VendorAccessReview**  | Periodic reviews of vendor access to systems and data.                           |
| **VendorCertification** | Vendor compliance certifications with expiration tracking.                       |

### Trust Module

| Model                     | Purpose                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **QuestionnaireRequest**  | Inbound security questionnaire requests from customers/prospects.                     |
| **QuestionnaireQuestion** | Individual questions within a questionnaire, with answers and knowledge base links.   |
| **KnowledgeBaseEntry**    | Reusable answers for security questionnaires, categorized and versioned.              |
| **TrustCenterConfig**     | Configuration for the public-facing trust center portal.                              |
| **TrustCenterContent**    | Content sections for the trust center (overview, certifications, controls, policies). |
| **AnswerTemplate**        | Pre-built answer templates for common security questions.                             |

### Audit Management

| Model               | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Audit**           | Internal/external audits with type, status workflow, and framework scope.          |
| **AuditRequest**    | Evidence and document requests from auditors, with assignment and status tracking. |
| **AuditFinding**    | Audit findings with severity, status, and remediation tracking.                    |
| **AuditTestResult** | Control testing results within an audit.                                           |
| **AuditWorkpaper**  | Formal audit workpapers with version history.                                      |
| **AuditPortalUser** | External auditor portal access with access codes and expiration.                   |
| **AuditTemplate**   | Reusable audit templates with checklists.                                          |
| **RemediationPlan** | Plans to address audit findings (POA&M), with milestones.                          |

### Assets

| Model     | Purpose                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asset** | IT assets (servers, workstations, mobile, network, applications, data). Tracked with criticality and data sensitivity. Can be linked to risks, vendors, and employees. |

### Integrations

| Model                                         | Purpose                                                                                            |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Integration**                               | Third-party tool connections (AWS, Azure, GitHub, Okta, Jira, etc.). Stores encrypted credentials. |
| **SyncJob**                                   | Integration sync execution history.                                                                |
| **CustomIntegrationConfig**                   | Configuration for custom API integrations.                                                         |
| **JiraConnection** / **ServiceNowConnection** | Dedicated connection configs for Jira and ServiceNow bi-directional sync.                          |
| **ApiKey**                                    | API keys for programmatic access with scoped permissions.                                          |
| **WebhookSubscription**                       | Outbound webhook subscriptions with event filtering.                                               |

### Employee Compliance

| Model                       | Purpose                                                         |
| --------------------------- | --------------------------------------------------------------- |
| **CorrelatedEmployee**      | Employee records correlated from HR, IdP, and MDM integrations. |
| **EmployeeTrainingRecord**  | Training completion records from LMS integrations.              |
| **EmployeeBackgroundCheck** | Background check status from HR integrations.                   |
| **EmployeeAssetAssignment** | Device assignments from MDM (Jamf, Intune).                     |
| **EmployeeAccessRecord**    | System access records from IdP (Okta, Azure AD).                |
| **EmployeeSecurityScore**   | Composite security awareness score per employee.                |
| **EmployeeAttestation**     | Policy acknowledgement records.                                 |

### BCDR (Business Continuity / Disaster Recovery)

| Model                       | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| **BCDRIncident**            | BC/DR incidents and plan activations with timeline entries. |
| **RecoveryTeam**            | Recovery teams with members and plan assignments.           |
| **ExerciseTemplate**        | Templates for BC/DR exercises.                              |
| **ProcessVendorDependency** | Vendor dependencies for business processes.                 |

### Supporting Models

| Model                                            | Purpose                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Tag**                                          | Centralized tag registry. Entity-specific junction tables: ControlTag, EvidenceTag, PolicyTag, RiskTag, VendorTag. |
| **Comment**                                      | Comments on any entity (polymorphic via entityType/entityId).                                                      |
| **Task**                                         | Generic tasks linked to any entity.                                                                                |
| **Notification**                                 | User notifications with read/unread tracking.                                                                      |
| **AuditLog**                                     | System audit trail (all user actions, entity changes).                                                             |
| **CalendarEvent**                                | Compliance calendar events (control tests, policy reviews, audit dates).                                           |
| **ApprovalWorkflow**                             | Configurable approval workflows with multi-step approvals.                                                         |
| **CustomFieldDefinition** / **CustomFieldValue** | User-defined custom fields on any entity type.                                                                     |
| **Dashboard** / **DashboardWidget**              | User-configurable dashboards with widgets.                                                                         |
| **ScheduledReport**                              | Automated report generation on a schedule.                                                                         |
| **ConfigFile** / **ConfigFileVersion**           | Config-as-code file storage with version history.                                                                  |
| **RetentionPolicy**                              | Data retention policies per entity type.                                                                           |
| **ExportJob**                                    | Async data export jobs (CSV, PDF, JSON).                                                                           |

## Key Enums

| Enum                            | Values                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **UserRole**                    | admin, compliance_manager, auditor, viewer                                                                       |
| **ControlImplementationStatus** | not_started, in_progress, implemented, not_applicable                                                            |
| **PolicyStatus**                | draft, in_review, approved, published, retired                                                                   |
| **RiskIntakeStatus**            | risk_identified, not_a_risk, actual_risk, risk_analysis_in_progress, risk_analyzed                               |
| **RiskTreatmentDecision**       | mitigate, accept, transfer, avoid                                                                                |
| **RiskLevel**                   | very_low, low, medium, high, very_high                                                                           |
| **VendorTier**                  | tier_1, tier_2, tier_3, tier_4                                                                                   |
| **VendorStatus**                | active, inactive, pending_onboarding, offboarding, terminated                                                    |
| **AuditStatus**                 | planning, fieldwork, testing, reporting, completed, cancelled                                                    |
| **AuditFindingStatus**          | open, acknowledged, remediation_planned, remediation_in_progress, resolved, accepted_risk                        |
| **EvidenceStatus**              | pending_review, approved, rejected, expired                                                                      |
| **FrameworkType**               | soc2, iso27001, hipaa, gdpr, pci_dss, nist_csf, nist_800_53, cis, fedramp, cmmc, ccpa, custom                    |
| **IntegrationType**             | aws, azure, gcp, github, gitlab, okta, jira, slack, google_workspace, servicenow, jamf, intune, custom, and more |
| **Priority**                    | low, medium, high, critical                                                                                      |
| **Severity**                    | critical, high, medium, low, info, observation                                                                   |

The full schema with all 62 enums and 130+ models is in `services/shared/prisma/schema.prisma`.

## Multi-Tenancy

All data is scoped to an **Organization**. Most queries filter by `organizationId`. Within an organization, **Workspaces** provide optional sub-scoping for multi-product teams.

## Soft Deletes

Most entities use soft deletion via a `deletedAt` timestamp field. Queries should filter `deletedAt: null` to exclude deleted records.

## Audit Fields

Most entities include standard audit fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
