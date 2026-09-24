-- CreateEnum
CREATE TYPE "ControlImplementationStatus" AS ENUM ('not_started', 'in_progress', 'implemented', 'not_applicable');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('pending_review', 'approved', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('draft', 'in_review', 'approved', 'published', 'retired');

-- CreateEnum
CREATE TYPE "RiskIntakeStatus" AS ENUM ('risk_identified', 'not_a_risk', 'actual_risk', 'risk_analysis_in_progress', 'risk_analyzed');

-- CreateEnum
CREATE TYPE "RiskAssessmentStatus" AS ENUM ('risk_assessor_analysis', 'grc_approval', 'grc_revision', 'done');

-- CreateEnum
CREATE TYPE "RiskTreatmentStatus" AS ENUM ('treatment_decision_review', 'risk_mitigation_in_progress', 'identify_executive_approver', 'executive_approval', 'mitigation_status_update', 'mitigation_status_routing', 'risk_mitigation_complete', 'still_mitigating', 'risk_accept', 'risk_transfer', 'risk_avoid', 'risk_auto_accept');

-- CreateEnum
CREATE TYPE "RiskLikelihood" AS ENUM ('rare', 'unlikely', 'possible', 'likely', 'almost_certain');

-- CreateEnum
CREATE TYPE "RiskImpact" AS ENUM ('negligible', 'minor', 'moderate', 'major', 'severe');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('very_low', 'low', 'medium', 'high', 'very_high');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('active', 'inactive', 'pending_onboarding', 'offboarding', 'terminated');

-- CreateEnum
CREATE TYPE "VendorTier" AS ENUM ('tier_1', 'tier_2', 'tier_3', 'tier_4');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'manager', 'contributor', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'compliance_manager', 'auditor', 'viewer');

-- CreateEnum
CREATE TYPE "CollectorRunStatus" AS ENUM ('running', 'success', 'error');

-- CreateEnum
CREATE TYPE "ReadinessAssessmentStatus" AS ENUM ('draft', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('not_assessed', 'compliant', 'partial', 'non_compliant', 'not_applicable');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PolicyTrainingStatus" AS ENUM ('scheduled', 'in_progress', 'completed', 'overdue');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('pending_setup', 'active', 'inactive', 'error');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('active', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "AlertJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('open', 'acknowledged', 'resolved', 'suppressed');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('planning', 'fieldwork', 'testing', 'reporting', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('active', 'inactive', 'decommissioned');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('draft', 'pending', 'active', 'expiring_soon', 'expired', 'terminated', 'renewed');

-- CreateEnum
CREATE TYPE "RiskScenarioStatus" AS ENUM ('open', 'acknowledged', 'mitigated', 'accepted', 'closed');

-- CreateEnum
CREATE TYPE "VendorAssessmentStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('pending', 'in_progress', 'completed', 'declined');

-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('pending', 'in_progress', 'answered', 'approved');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critical', 'high', 'medium', 'low', 'info', 'observation');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('software_vendor', 'cloud_provider', 'professional_services', 'hardware_vendor', 'consultant');

-- CreateEnum
CREATE TYPE "VendorComplianceStatus" AS ENUM ('compliant', 'non_compliant', 'pending_review');

-- CreateEnum
CREATE TYPE "AssetCriticality" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "KnowledgeBaseCategory" AS ENUM ('security', 'privacy', 'compliance', 'technical', 'operational');

-- CreateEnum
CREATE TYPE "KnowledgeBaseStatus" AS ENUM ('draft', 'approved', 'archived');

-- CreateEnum
CREATE TYPE "AuditRequestStatus" AS ENUM ('open', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'clarification_needed');

-- CreateEnum
CREATE TYPE "AuditFindingStatus" AS ENUM ('open', 'acknowledged', 'remediation_planned', 'remediation_in_progress', 'resolved', 'accepted_risk');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('received', 'processing', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "RiskTreatmentDecision" AS ENUM ('mitigate', 'accept', 'transfer', 'avoid');

-- CreateEnum
CREATE TYPE "RiskTreatmentPlanStatus" AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "VendorRiskScore" AS ENUM ('very_low', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('server', 'workstation', 'mobile', 'network', 'application', 'data');

-- CreateEnum
CREATE TYPE "ControlTestType" AS ENUM ('manual', 'automated');

-- CreateEnum
CREATE TYPE "ControlTestResult" AS ENUM ('pass', 'fail', 'partial', 'not_tested');

-- CreateEnum
CREATE TYPE "ControlCategory" AS ENUM ('access_control', 'data_protection', 'network_security', 'incident_management', 'business_continuity', 'risk_management', 'change_management', 'asset_management', 'compliance', 'physical_security', 'hr_security', 'supplier_management', 'cryptography', 'operations', 'communications', 'system_acquisition', 'other');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('screenshot', 'document', 'export', 'report', 'configuration', 'log', 'policy', 'procedure', 'certificate', 'audit_report', 'other');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('manual', 'aws', 'azure', 'gcp', 'github', 'gitlab', 'okta', 'jira', 'confluence', 'slack', 'google_workspace', 'microsoft_365', 'crowdstrike', 'qualys', 'tenable', 'splunk', 'datadog', 'custom_api', 'other');

-- CreateEnum
CREATE TYPE "FrameworkType" AS ENUM ('soc2', 'iso27001', 'iso27701', 'hipaa', 'gdpr', 'pci_dss', 'nist_csf', 'nist_800_53', 'cis', 'fedramp', 'cmmc', 'ccpa', 'custom');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('aws', 'azure', 'gcp', 'github', 'gitlab', 'okta', 'jira', 'confluence', 'slack', 'google_workspace', 'microsoft_365', 'crowdstrike', 'qualys', 'tenable', 'splunk', 'datadog', 'servicenow', 'jamf', 'intune', 'custom');

-- CreateEnum
CREATE TYPE "ReviewFrequency" AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual', 'biennial');

-- CreateEnum
CREATE TYPE "TestingFrequency" AS ENUM ('weekly', 'monthly', 'quarterly', 'semi_annual', 'annual');

-- CreateEnum
CREATE TYPE "SyncFrequency" AS ENUM ('realtime', 'hourly', 'daily', 'weekly', 'monthly');

-- CreateEnum
CREATE TYPE "MappingType" AS ENUM ('primary', 'supporting', 'partial');

-- CreateEnum
CREATE TYPE "PolicyCategory" AS ENUM ('information_security', 'data_privacy', 'acceptable_use', 'access_control', 'business_continuity', 'incident_response', 'vendor_management', 'change_management', 'asset_management', 'hr_security', 'physical_security', 'compliance', 'other');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('operational', 'strategic', 'compliance', 'security', 'financial', 'technical', 'third_party', 'reputational', 'legal', 'environmental');

-- CreateEnum
CREATE TYPE "RiskSource" AS ENUM ('internal_security_reviews', 'ad_hoc_discovery', 'external_security_reviews', 'incident_response', 'policy_exception', 'employee_reporting', 'vendor_assessment', 'compliance_audit');

-- CreateEnum
CREATE TYPE "GapRemediationStatus" AS ENUM ('open', 'in_progress', 'resolved', 'deferred', 'accepted');

-- CreateEnum
CREATE TYPE "WorkpaperStatus" AS ENUM ('draft', 'pending_review', 'reviewed', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "multi_workspace_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_configuration" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email_provider" TEXT NOT NULL DEFAULT 'disabled',
    "email_from_address" TEXT,
    "email_from_name" TEXT,
    "smtp_config" JSONB,
    "sendgrid_api_key" TEXT,
    "ses_config" JSONB,
    "slack_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "slack_webhook_url" TEXT,
    "slack_bot_token" TEXT,
    "slack_default_channel" TEXT,
    "slack_workspace_name" TEXT,
    "default_notifications" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "keycloak_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controls" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guidance" TEXT,
    "automation_supported" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_implementations" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "status" "ControlImplementationStatus" NOT NULL DEFAULT 'not_started',
    "owner_id" TEXT,
    "implementation_notes" TEXT,
    "testing_frequency" TEXT NOT NULL DEFAULT 'quarterly',
    "last_tested_at" TIMESTAMP(3),
    "next_test_due" TIMESTAMP(3),
    "effectiveness_score" INTEGER,
    "due_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_implementations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_tests" (
    "id" TEXT NOT NULL,
    "implementation_id" TEXT NOT NULL,
    "test_type" "ControlTestType" NOT NULL DEFAULT 'manual',
    "result" "ControlTestResult" NOT NULL DEFAULT 'not_tested',
    "findings" TEXT,
    "recommendations" TEXT,
    "tested_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_test_evidence" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_test_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_evidence_collectors" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "implementation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'standalone',
    "integration_id" TEXT,
    "base_url" TEXT,
    "endpoint" TEXT,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" JSONB,
    "query_params" JSONB,
    "body" JSONB,
    "auth_type" TEXT,
    "auth_config" JSONB,
    "response_mapping" JSONB,
    "evidence_title" TEXT,
    "evidence_type" TEXT NOT NULL DEFAULT 'automated',
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule_frequency" TEXT,
    "schedule_cron" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_run_error" TEXT,
    "next_run_at" TIMESTAMP(3),
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "successful_runs" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "control_evidence_collectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collector_runs" (
    "id" TEXT NOT NULL,
    "collector_id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "triggered_by_user" TEXT,
    "status" "CollectorRunStatus" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "evidence_created" INTEGER NOT NULL DEFAULT 0,
    "evidence_id" TEXT,
    "response_code" INTEGER,
    "error_message" TEXT,
    "logs" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "collector_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" "EvidenceStatus" NOT NULL DEFAULT 'pending_review',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category" TEXT,
    "metadata" JSONB,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" TEXT,
    "folder_id" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_folders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "path" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_control_links" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "implementation_id" TEXT NOT NULL,
    "linked_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_control_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworks" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" TEXT,
    "workspace_id" TEXT,
    "published_date" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "framework_requirements" (
    "id" TEXT NOT NULL,
    "framework_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guidance" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_category" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" TEXT,
    "owner_notes" TEXT,
    "due_date" TIMESTAMP(3),
    "priority" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "framework_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_mappings" (
    "id" TEXT NOT NULL,
    "framework_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "mapping_type" TEXT NOT NULL DEFAULT 'primary',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_mapping_history" (
    "id" TEXT NOT NULL,
    "mapping_id" TEXT,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "control_mapping_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_assessments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "framework_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReadinessAssessmentStatus" NOT NULL DEFAULT 'draft',
    "assessed_at" TIMESTAMP(3),
    "assessed_by" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gap_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_statuses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'not_assessed',
    "notes" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirement_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_status_evidence" (
    "id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_status_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_status_controls" (
    "id" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_status_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gaps" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "remediation_status" TEXT NOT NULL DEFAULT 'open',
    "remediation_due_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_tasks" (
    "id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'todo',
    "assigned_to" TEXT,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "effort" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remediation_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_task_controls" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remediation_task_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'draft',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "review_frequency" TEXT NOT NULL DEFAULT 'annual',
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_due" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "effective_date" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope" TEXT,
    "audience" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_versions" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "change_notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_approvals" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "approver_name" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "decided_at" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_reviews" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" "PolicyTrainingStatus" NOT NULL DEFAULT 'scheduled',
    "outcome" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_status_history" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "changed_by_name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_control_links" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "linked_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_control_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'pending_setup',
    "config" JSONB NOT NULL DEFAULT '{}',
    "sync_frequency" TEXT NOT NULL DEFAULT 'daily',
    "last_sync_at" TIMESTAMP(3),
    "next_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "total_evidence_collected" INTEGER NOT NULL DEFAULT 0,
    "last_evidence_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_integration_configs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'visual',
    "base_url" TEXT,
    "endpoints" JSONB,
    "auth_type" TEXT,
    "auth_config" JSONB,
    "response_mapping" JSONB,
    "custom_code" TEXT,
    "last_test_at" TIMESTAMP(3),
    "last_test_status" TEXT,
    "last_test_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "status" "AlertJobStatus" NOT NULL DEFAULT 'queued',
    "triggered_by" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "evidence_created" INTEGER NOT NULL DEFAULT 0,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "processed_at" TIMESTAMP(3),
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'received',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "headers" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_delivery_at" TIMESTAMP(3),
    "last_delivery_status" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "response_status" INTEGER,
    "response_body" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "check_type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_result" TEXT,
    "last_result_details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_check_results" (
    "id" TEXT NOT NULL,
    "check_id" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "details" JSONB,
    "evidence_id" TEXT,
    "resources_checked" INTEGER NOT NULL DEFAULT 0,
    "resources_passed" INTEGER NOT NULL DEFAULT 0,
    "resources_failed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'open',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "source_id" TEXT,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "user_name" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_name" TEXT,
    "description" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "email_sent_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" TEXT NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_groups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_group_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_group_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "resource_scope" JSONB,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "external_id" TEXT,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL DEFAULT 'server',
    "category" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'active',
    "criticality" "AssetCriticality" NOT NULL DEFAULT 'medium',
    "owner" TEXT,
    "location" TEXT,
    "department" TEXT,
    "metadata" JSONB,
    "last_sync_at" TIMESTAMP(3),
    "rto_hours" INTEGER,
    "rpo_hours" INTEGER,
    "bcdr_criticality" TEXT,
    "recovery_strategy_id" UUID,
    "recovery_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "risk_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'employee_reporting',
    "status" "RiskIntakeStatus" NOT NULL DEFAULT 'risk_identified',
    "initial_severity" "RiskLevel" NOT NULL DEFAULT 'medium',
    "likelihood" "RiskLikelihood",
    "impact" "RiskImpact",
    "inherent_risk" "RiskLevel",
    "residual_risk" "RiskLevel",
    "likelihood_pct" DOUBLE PRECISION,
    "impact_value" DOUBLE PRECISION,
    "annual_loss_expectancy" DOUBLE PRECISION,
    "treatment_plan" TEXT,
    "treatment_status" TEXT,
    "treatment_notes" TEXT,
    "reporter_id" TEXT,
    "grc_sme_id" TEXT,
    "risk_assessor_id" TEXT,
    "risk_owner_id" TEXT,
    "review_frequency" TEXT NOT NULL DEFAULT 'quarterly',
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_due" TIMESTAMP(3),
    "documentation" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "status" "RiskAssessmentStatus" NOT NULL DEFAULT 'risk_assessor_analysis',
    "risk_assessor_id" TEXT,
    "grc_sme_id" TEXT,
    "threat_description" TEXT,
    "vulnerabilities" TEXT,
    "likelihood_score" TEXT,
    "likelihood_rationale" TEXT,
    "impact_score" TEXT,
    "impact_rationale" TEXT,
    "impact_categories" JSONB,
    "calculated_risk_score" TEXT,
    "recommended_owner_id" TEXT,
    "assessment_notes" TEXT,
    "treatment_recommendation" TEXT,
    "grc_review_notes" TEXT,
    "grc_approved_at" TIMESTAMP(3),
    "grc_declined_reason" TEXT,
    "assessor_submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_treatments" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "status" "RiskTreatmentStatus" NOT NULL DEFAULT 'treatment_decision_review',
    "risk_owner_id" TEXT,
    "executive_approver_id" TEXT,
    "grc_sme_id" TEXT,
    "treatment_decision" TEXT,
    "treatment_justification" TEXT,
    "treatment_plan" TEXT,
    "mitigation_description" TEXT,
    "mitigation_target_date" TIMESTAMP(3),
    "mitigation_actual_date" TIMESTAMP(3),
    "transfer_to" TEXT,
    "transfer_cost" DOUBLE PRECISION,
    "avoid_strategy" TEXT,
    "acceptance_rationale" TEXT,
    "acceptance_expires_at" TIMESTAMP(3),
    "executive_approval_required" BOOLEAN NOT NULL DEFAULT false,
    "executive_approval_status" TEXT,
    "executive_approval_notes" TEXT,
    "executive_approved_at" TIMESTAMP(3),
    "executive_denied_reason" TEXT,
    "mitigation_status" TEXT,
    "mitigation_progress" INTEGER NOT NULL DEFAULT 0,
    "last_progress_update" TIMESTAMP(3),
    "next_review_date" TIMESTAMP(3),
    "residual_likelihood" TEXT,
    "residual_impact" TEXT,
    "residual_risk_score" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_treatment_updates" (
    "id" TEXT NOT NULL,
    "treatment_id" TEXT NOT NULL,
    "update_type" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "progress" INTEGER,
    "notes" TEXT,
    "new_target_date" TIMESTAMP(3),
    "delay_reason" TEXT,
    "cancellation_reason" TEXT,
    "completion_evidence" TEXT,
    "effectiveness_notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_treatment_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assets" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_controls" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "effectiveness" TEXT NOT NULL DEFAULT 'partial',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scenarios" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "threat_actor" TEXT,
    "attack_vector" TEXT,
    "likelihood" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scenario_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "threat_actor" TEXT NOT NULL,
    "attack_vector" TEXT NOT NULL,
    "target_assets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "likelihood" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "simulation" JSONB,
    "related_control_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_risk_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mitigation_strategy" TEXT,
    "business_context" TEXT,
    "compliance_impact" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "risk_scenario_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_history" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "notes" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_workflow_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "workflow_stage" TEXT NOT NULL,
    "previous_status" TEXT,
    "resulting_action" TEXT,
    "notes" TEXT,
    "completion_notes" TEXT,
    "is_auto_created" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_workflow_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "risk_task_email" BOOLEAN NOT NULL DEFAULT true,
    "risk_task_in_app" BOOLEAN NOT NULL DEFAULT true,
    "risk_task_slack" BOOLEAN NOT NULL DEFAULT false,
    "slack_user_id" TEXT,
    "digestMode" TEXT NOT NULL DEFAULT 'immediate',
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_configurations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "methodology" TEXT NOT NULL DEFAULT 'qualitative',
    "likelihood_scale" JSONB NOT NULL DEFAULT '[]',
    "impact_scale" JSONB NOT NULL DEFAULT '[]',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "risk_level_thresholds" JSONB NOT NULL DEFAULT '{}',
    "workflow_settings" JSONB NOT NULL DEFAULT '{}',
    "risk_appetite" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "risk_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tprm_configurations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "tier_frequency_mapping" JSONB NOT NULL DEFAULT '{"tier_1":"quarterly","tier_2":"semi_annual","tier_3":"annual","tier_4":"biennial"}',
    "vendor_categories" JSONB NOT NULL DEFAULT '[]',
    "risk_thresholds" JSONB NOT NULL DEFAULT '{"very_low":20,"low":40,"medium":60,"high":80,"critical":100}',
    "assessment_settings" JSONB NOT NULL DEFAULT '{}',
    "contract_settings" JSONB NOT NULL DEFAULT '{}',
    "feature_settings" JSONB NOT NULL DEFAULT '{"enableSecurityScanning":true,"enableRiskAssessmentWizard":true,"enableSubdomainSpider":true,"enableVendorPortal":true,"enableContractManagement":true,"enableQuestionnaireAutomation":true}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "tprm_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(100),
    "variables" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "answer_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_configurations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sla_settings" JSONB NOT NULL DEFAULT '{"urgent":{"targetHours":24,"warningHours":12},"high":{"targetHours":72,"warningHours":48},"medium":{"targetHours":168,"warningHours":120},"low":{"targetHours":336,"warningHours":240}}',
    "assignment_settings" JSONB NOT NULL DEFAULT '{"enableAutoAssignment":false,"defaultAssignee":null,"assignByCategory":{}}',
    "kb_settings" JSONB NOT NULL DEFAULT '{"requireApprovalForNewEntries":true,"autoSuggestFromKB":true,"trackUsageMetrics":true}',
    "trust_center_settings" JSONB NOT NULL DEFAULT '{"enabled":true,"publicUrl":null,"customDomain":null,"allowAnonymousAccess":false}',
    "ai_settings" JSONB NOT NULL DEFAULT '{"enabled":false,"autoCategorizationEnabled":false,"answerSuggestionsEnabled":false}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "trust_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "description" TEXT,
    "website" TEXT,
    "primary_contact" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "category" "VendorCategory" NOT NULL DEFAULT 'software_vendor',
    "tier" "VendorTier" NOT NULL DEFAULT 'tier_3',
    "status" "VendorStatus" NOT NULL DEFAULT 'active',
    "inherent_risk_score" "VendorRiskScore",
    "residual_risk_score" "VendorRiskScore",
    "data_classification" TEXT,
    "has_data_access" BOOLEAN NOT NULL DEFAULT false,
    "access_level" TEXT,
    "business_owner" TEXT,
    "service_description" TEXT,
    "criticality" "AssetCriticality" NOT NULL DEFAULT 'medium',
    "annual_spend" DOUBLE PRECISION,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "compliance_status" "VendorComplianceStatus" NOT NULL DEFAULT 'pending_review',
    "last_reviewed_at" TIMESTAMP(3),
    "next_review_due" TIMESTAMP(3),
    "review_frequency" TEXT NOT NULL DEFAULT 'annual',
    "country" TEXT,
    "region" TEXT,
    "data_location" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_assessments" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "assessment_type" TEXT NOT NULL,
    "status" "VendorAssessmentStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "questionnaire_template" TEXT,
    "responses" JSONB,
    "inherent_risk_score" TEXT,
    "residual_risk_score" TEXT,
    "overall_score" INTEGER,
    "security_risk" TEXT,
    "compliance_risk" TEXT,
    "operational_risk" TEXT,
    "financial_risk" TEXT,
    "reputational_risk" TEXT,
    "outcome" TEXT,
    "outcome_notes" TEXT,
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assessor_id" TEXT,
    "reviewer_id" TEXT,
    "findings" JSONB,
    "recommendations" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_assessment_evidence" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_assessment_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contracts" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contract_number" TEXT,
    "contract_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contract_value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_terms" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "renewal_date" TIMESTAMP(3),
    "notice_period_days" INTEGER,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "requires_soc2" BOOLEAN NOT NULL DEFAULT false,
    "requires_iso27001" BOOLEAN NOT NULL DEFAULT false,
    "requires_pen_test" BOOLEAN NOT NULL DEFAULT false,
    "requires_right_to_audit" BOOLEAN NOT NULL DEFAULT false,
    "data_processing_addendum" BOOLEAN NOT NULL DEFAULT false,
    "notify_days_before" INTEGER NOT NULL DEFAULT 90,
    "last_notification_sent" TIMESTAMP(3),
    "filename" TEXT,
    "storage_path" TEXT,
    "mime_type" TEXT,
    "size" INTEGER,
    "contract_owner" TEXT,
    "business_owner" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_contacts" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "contactType" TEXT NOT NULL DEFAULT 'general',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_documents" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "document_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "issued_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "review_notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_risk_findings" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "remediation_plan" TEXT,
    "remediation_owner" TEXT,
    "target_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "discovered_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discovered_by" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_risk_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_access_reviews" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "review_date" TIMESTAMP(3) NOT NULL,
    "review_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "access_level" TEXT,
    "outcome" TEXT,
    "changes" TEXT,
    "reviewed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_access_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requester_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "source" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "questionnaire_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_questions" (
    "id" TEXT NOT NULL,
    "questionnaire_id" TEXT NOT NULL,
    "question_number" TEXT,
    "category" TEXT,
    "question_text" TEXT NOT NULL,
    "answer_text" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'pending',
    "assigned_to" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "knowledge_base_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionnaire_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attachments" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" "KnowledgeBaseCategory" NOT NULL DEFAULT 'security',
    "title" TEXT NOT NULL,
    "question" TEXT,
    "answer" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "framework" TEXT,
    "status" "KnowledgeBaseStatus" NOT NULL DEFAULT 'draft',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "knowledge_base_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_controls" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_evidence" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_policies" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_base_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_attachments" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_center_config" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "custom_domain" TEXT,
    "logo_url" TEXT,
    "company_name" TEXT NOT NULL,
    "description" TEXT,
    "primary_color" TEXT,
    "security_email" TEXT,
    "support_url" TEXT,
    "show_certifications" BOOLEAN NOT NULL DEFAULT true,
    "show_policies" BOOLEAN NOT NULL DEFAULT true,
    "show_security_features" BOOLEAN NOT NULL DEFAULT true,
    "show_privacy" BOOLEAN NOT NULL DEFAULT true,
    "show_incident_response" BOOLEAN NOT NULL DEFAULT true,
    "custom_sections" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trust_center_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_center_content" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "trust_center_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "audit_id" TEXT NOT NULL,
    "audit_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "framework" TEXT,
    "scope" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'planning',
    "planned_start_date" TIMESTAMP(3),
    "planned_end_date" TIMESTAMP(3),
    "actual_start_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "lead_auditor_id" TEXT,
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "audit_firm" TEXT,
    "external_lead_name" TEXT,
    "external_lead_email" TEXT,
    "audit_portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "portal_access_code" TEXT,
    "portal_expires_at" TIMESTAMP(3),
    "objectives" TEXT,
    "methodology" TEXT,
    "notes" TEXT,
    "overall_rating" TEXT,
    "findings_count" INTEGER NOT NULL DEFAULT 0,
    "critical_findings" INTEGER NOT NULL DEFAULT 0,
    "high_findings" INTEGER NOT NULL DEFAULT 0,
    "medium_findings" INTEGER NOT NULL DEFAULT 0,
    "low_findings" INTEGER NOT NULL DEFAULT 0,
    "field_guide_id" TEXT,
    "field_guide_data" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "template_id" TEXT,
    "checklist_progress" JSONB NOT NULL DEFAULT '{}',
    "checklist_completed_count" INTEGER NOT NULL DEFAULT 0,
    "checklist_total_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_requests" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "control_id" TEXT,
    "requirement_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigned_to" TEXT,
    "requested_by" TEXT,
    "due_date" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "response_notes" TEXT,
    "reviewer_notes" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_pattern" JSONB,
    "last_collected_at" TIMESTAMP(3),
    "next_collection_due" TIMESTAMP(3),
    "evidence_validity_days" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "audit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_evidence" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "request_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidence_type" TEXT NOT NULL,
    "filename" TEXT,
    "storage_path" TEXT,
    "mime_type" TEXT,
    "size" INTEGER,
    "linked_evidence_id" TEXT,
    "linked_control_id" TEXT,
    "linked_policy_id" TEXT,
    "collected_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "finding_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "control_id" TEXT,
    "requirement_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "remediation_plan" TEXT,
    "remediation_owner" TEXT,
    "target_date" TIMESTAMP(3),
    "actual_date" TIMESTAMP(3),
    "root_cause" TEXT,
    "impact" TEXT,
    "recommendation" TEXT,
    "management_response" TEXT,
    "response_date" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "identified_by" TEXT NOT NULL,
    "identified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_test_results" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "test_number" TEXT,
    "test_objective" TEXT NOT NULL,
    "test_procedure" TEXT NOT NULL,
    "sample_size" INTEGER,
    "sample_method" TEXT,
    "population_size" INTEGER,
    "result" TEXT NOT NULL,
    "exception_count" INTEGER NOT NULL DEFAULT 0,
    "observations" TEXT,
    "tested_by" TEXT NOT NULL,
    "tested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_meetings" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "meeting_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "location" TEXT,
    "status" "PolicyTrainingStatus" NOT NULL DEFAULT 'scheduled',
    "agenda" TEXT,
    "minutes" TEXT,
    "action_items" JSONB,
    "attachment_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_activities" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_request_comments" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "author_type" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_portal_users" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "access_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "session_token" TEXT,
    "session_expires_at" TIMESTAMP(3),
    "can_view_all" BOOLEAN NOT NULL DEFAULT true,
    "can_upload" BOOLEAN NOT NULL DEFAULT false,
    "can_comment" BOOLEAN NOT NULL DEFAULT true,
    "allowed_ip_ranges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enforce_ip_restriction" BOOLEAN NOT NULL DEFAULT false,
    "download_limit" INTEGER,
    "downloads_used" INTEGER NOT NULL DEFAULT 0,
    "download_limit_reset_at" TIMESTAMP(3),
    "enable_watermark" BOOLEAN NOT NULL DEFAULT true,
    "watermark_text" TEXT,
    "invited_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_portal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_portal_access_logs" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "portal_user_id" TEXT,
    "access_code" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_portal_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_team_members" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_access_systems" (
    "id" TEXT NOT NULL,
    "vendor_access_review_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_access_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_test_evidence" (
    "id" TEXT NOT NULL,
    "audit_test_result_id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_test_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_tags" (
    "id" TEXT NOT NULL,
    "control_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "control_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_tags" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_tags" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_tags" (
    "id" TEXT NOT NULL,
    "risk_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_tags" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_certifications" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "certification" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "verification_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_meeting_internal_attendees" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_meeting_internal_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_meeting_external_attendees" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "organization" TEXT,
    "role" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_meeting_external_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_meeting_attachments" (
    "id" TEXT NOT NULL,
    "meeting_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_meeting_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key_scopes" (
    "id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "all_day" BOOLEAN NOT NULL DEFAULT true,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_rule" TEXT,
    "parent_event_id" TEXT,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "assignee_id" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "color" TEXT,
    "reminders" JSONB,
    "metadata" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_assessment_conditions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_assessment_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_access_data_categories" (
    "id" TEXT NOT NULL,
    "access_review_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "sensitivity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_access_data_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlated_employees" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source_integration_id" TEXT,
    "external_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "department" TEXT,
    "job_title" TEXT,
    "manager_email" TEXT,
    "hire_date" TIMESTAMP(3),
    "employment_status" TEXT,
    "employment_type" TEXT,
    "location" TEXT,
    "compliance_score" INTEGER,
    "compliance_issues" JSONB,
    "last_correlated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correlated_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_background_checks" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "check_type" TEXT,
    "initiated_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_background_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_training_records" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "external_id" TEXT,
    "course_name" TEXT NOT NULL,
    "course_type" TEXT,
    "status" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" INTEGER,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_training_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_asset_assignments" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "external_asset_id" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "device_name" TEXT,
    "serial_number" TEXT,
    "model" TEXT,
    "manufacturer" TEXT,
    "os_version" TEXT,
    "is_compliant" BOOLEAN,
    "last_check_in" TIMESTAMP(3),
    "assigned_at" TIMESTAMP(3),
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_access_records" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "systems_access" JSONB NOT NULL,
    "last_review_date" TIMESTAMP(3),
    "review_status" TEXT,
    "reviewed_by" TEXT,
    "mfa_enabled" BOOLEAN,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_access_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_security_scores" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "integration_id" TEXT,
    "overall_score" INTEGER NOT NULL,
    "risk_level" TEXT,
    "training_score" INTEGER,
    "phishing_score" INTEGER,
    "phishing_tests_sent" INTEGER,
    "phishing_tests_clicked" INTEGER,
    "phishing_tests_reported" INTEGER,
    "raw_data" JSONB,
    "score_period" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_security_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attestations" (
    "id" TEXT NOT NULL,
    "correlated_employee_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "widget_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "data_source" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":4,"h":2}',
    "refresh_rate" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_data_sources" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "report_type" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "chart_configs" JSONB NOT NULL DEFAULT '[]',
    "include_charts" BOOLEAN NOT NULL DEFAULT true,
    "include_tables" BOOLEAN NOT NULL DEFAULT true,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "frequency" TEXT NOT NULL,
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "time" TEXT NOT NULL DEFAULT '09:00',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recipients" TEXT[],
    "filters" JSONB NOT NULL DEFAULT '{}',
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_run_error" TEXT,
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_report_executions" (
    "id" TEXT NOT NULL,
    "scheduled_report_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "file_path" TEXT,
    "file_size" INTEGER,

    CONSTRAINT "scheduled_report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_progress" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "score" INTEGER,
    "slide_progress" INTEGER NOT NULL DEFAULT 0,
    "time_spent" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completed_at" TIMESTAMP(3),
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module_ids" JSONB NOT NULL,
    "target_groups" JSONB NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_training_modules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "duration" INTEGER NOT NULL DEFAULT 30,
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "scorm_path" TEXT,
    "original_file_name" TEXT,
    "iconType" TEXT NOT NULL DEFAULT 'security',
    "topics" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_training_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "commit_message" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "config_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_file_versions" (
    "id" TEXT NOT NULL,
    "config_file_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "commit_message" TEXT,
    "changes" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_resource_states" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "database_id" TEXT,
    "last_applied_hash" TEXT NOT NULL,
    "last_applied_content" JSONB NOT NULL,
    "last_applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by" TEXT NOT NULL,
    "source_file" TEXT,
    "source_line" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_resource_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_apply_history" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_by" TEXT NOT NULL,
    "source_file" TEXT,
    "commit_message" TEXT,
    "resources_created" INTEGER NOT NULL DEFAULT 0,
    "resources_updated" INTEGER NOT NULL DEFAULT 0,
    "resources_deleted" INTEGER NOT NULL DEFAULT 0,
    "resources_skipped" INTEGER NOT NULL DEFAULT 0,
    "conflicts_detected" INTEGER NOT NULL DEFAULT 0,
    "conflicts_resolved" TEXT,
    "resource_count" INTEGER NOT NULL DEFAULT 0,
    "state_hash" TEXT,
    "duration_ms" INTEGER,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "warnings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_apply_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_apply_locks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "locked_by" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lock_reason" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_apply_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audit_type" TEXT NOT NULL,
    "framework" TEXT,
    "checklist_items" JSONB NOT NULL DEFAULT '[]',
    "request_templates" JSONB NOT NULL DEFAULT '[]',
    "test_procedure_templates" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_workpapers" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "workpaper_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workpaper_type" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT,
    "status" "WorkpaperStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "prepared_by" TEXT NOT NULL,
    "prepared_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "cross_references" JSONB NOT NULL DEFAULT '[]',
    "related_controls" JSONB NOT NULL DEFAULT '[]',
    "related_findings" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_workpapers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workpaper_history" (
    "id" TEXT NOT NULL,
    "workpaper_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT,
    "change_summary" TEXT,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workpaper_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_plans" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "scheduled_start" TIMESTAMP(3),
    "scheduled_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "resources" JSONB NOT NULL DEFAULT '[]',
    "estimated_hours" INTEGER,
    "actual_hours" INTEGER,
    "estimated_cost" DECIMAL(12,2),
    "actual_cost" DECIMAL(12,2),
    "notes" TEXT,
    "risk_if_not_remediated" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remediation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_milestones" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "milestone_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "assigned_to" TEXT,
    "evidence_required" BOOLEAN NOT NULL DEFAULT false,
    "evidence_ids" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remediation_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_test_procedures" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "procedure_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "control_id" TEXT,
    "requirement_ref" TEXT,
    "test_type" TEXT NOT NULL,
    "test_method" TEXT,
    "sample_size" INTEGER,
    "sample_selection" TEXT,
    "population_size" INTEGER,
    "sample_criteria" TEXT,
    "expected_result" TEXT,
    "actual_result" TEXT,
    "deviations_noted" TEXT,
    "conclusion" TEXT,
    "conclusion_rationale" TEXT,
    "tested_by" TEXT,
    "tested_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "evidence_ids" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_test_procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_plan_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER,
    "audit_name" TEXT NOT NULL,
    "audit_type" TEXT NOT NULL,
    "framework" TEXT,
    "scope" TEXT,
    "objectives" TEXT,
    "risk_rating" TEXT,
    "risk_factors" JSONB NOT NULL DEFAULT '[]',
    "estimated_hours" INTEGER,
    "estimated_budget" DECIMAL(12,2),
    "assigned_team" JSONB NOT NULL DEFAULT '[]',
    "lead_auditor" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "deferral_reason" TEXT,
    "linked_audit_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_plan_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_analytics_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "snapshot_date" TIMESTAMP(3) NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "total_audits" INTEGER NOT NULL DEFAULT 0,
    "active_audits" INTEGER NOT NULL DEFAULT 0,
    "completed_audits" INTEGER NOT NULL DEFAULT 0,
    "total_findings" INTEGER NOT NULL DEFAULT 0,
    "open_findings" INTEGER NOT NULL DEFAULT 0,
    "critical_findings" INTEGER NOT NULL DEFAULT 0,
    "high_findings" INTEGER NOT NULL DEFAULT 0,
    "medium_findings" INTEGER NOT NULL DEFAULT 0,
    "low_findings" INTEGER NOT NULL DEFAULT 0,
    "overdue_findings" INTEGER NOT NULL DEFAULT 0,
    "avg_remediation_days" DECIMAL(8,2),
    "on_time_remediation_rate" DECIMAL(5,2),
    "tests_completed" INTEGER NOT NULL DEFAULT 0,
    "tests_passed" INTEGER NOT NULL DEFAULT 0,
    "tests_failed" INTEGER NOT NULL DEFAULT 0,
    "control_effectiveness_rate" DECIMAL(5,2),
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "open_requests" INTEGER NOT NULL DEFAULT 0,
    "overdue_requests" INTEGER NOT NULL DEFAULT 0,
    "avg_request_completion_days" DECIMAL(8,2),
    "findings_by_category" JSONB NOT NULL DEFAULT '{}',
    "findings_by_status" JSONB NOT NULL DEFAULT '{}',
    "audits_by_type" JSONB NOT NULL DEFAULT '{}',
    "audits_by_status" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scim_provider_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "bearer_token" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_group_ids" JSONB NOT NULL DEFAULT '[]',
    "default_role" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scim_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scim_external_ids" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,

    CONSTRAINT "scim_external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scim_group_external_ids" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,

    CONSTRAINT "scim_group_external_ids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflows" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'sequential',
    "steps" JSONB NOT NULL,
    "trigger_conditions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_name" TEXT,
    "title" TEXT NOT NULL,
    "justification" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "requested_by" TEXT NOT NULL,
    "requested_by_name" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "approver_type" TEXT NOT NULL,
    "approver_value" TEXT NOT NULL,
    "require_comment" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "approver_id" TEXT,
    "approver_name" TEXT,
    "comment" TEXT,
    "conditions" JSONB,
    "decided_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "escalate_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "record_count" INTEGER,
    "file_size" INTEGER,
    "storage_path" TEXT,
    "download_url" TEXT,
    "download_url_expires_at" TIMESTAMP(3),
    "config" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "requested_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "field_type" TEXT NOT NULL,
    "entity_types" TEXT[],
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "default_value" JSONB,
    "placeholder" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "group" TEXT,
    "show_in_list" BOOLEAN NOT NULL DEFAULT false,
    "searchable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_delegations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "delegator_id" TEXT NOT NULL,
    "delegator_name" TEXT NOT NULL,
    "delegate_id" TEXT NOT NULL,
    "delegate_name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "entity_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entity_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by" TEXT,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "period_value" INTEGER NOT NULL,
    "period_unit" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "filter_conditions" JSONB,
    "description" TEXT,
    "require_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "notify_before_action" BOOLEAN NOT NULL DEFAULT true,
    "notify_days_before" INTEGER,
    "last_run_at" TIMESTAMP(3),
    "last_run_result" TEXT,
    "records_affected" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_url" TEXT NOT NULL,
    "credentials" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "connected_at" TIMESTAMP(3),
    "connection_error" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_project_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "jira_project_key" TEXT NOT NULL,
    "jira_project_name" TEXT NOT NULL,
    "grc_entity_type" TEXT NOT NULL,
    "jira_issue_type" TEXT NOT NULL,
    "sync_direction" TEXT NOT NULL,
    "field_mappings" JSONB,
    "status_mappings" JSONB,
    "auto_create" BOOLEAN NOT NULL DEFAULT false,
    "auto_sync_status" BOOLEAN NOT NULL DEFAULT true,
    "sync_comments" BOOLEAN NOT NULL DEFAULT false,
    "sync_attachments" BOOLEAN NOT NULL DEFAULT false,
    "jql_filter" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "synced_issue_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_project_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_issue_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mapping_id" TEXT NOT NULL,
    "jira_key" TEXT NOT NULL,
    "jira_id" TEXT NOT NULL,
    "jira_url" TEXT NOT NULL,
    "grc_entity_type" TEXT NOT NULL,
    "grc_entity_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_issue_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicenow_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_url" TEXT NOT NULL,
    "auth_type" TEXT NOT NULL,
    "credentials" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "connected_at" TIMESTAMP(3),
    "connection_error" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicenow_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicenow_table_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "snow_table_name" TEXT NOT NULL,
    "snow_table_label" TEXT NOT NULL,
    "grc_entity_type" TEXT NOT NULL,
    "sync_direction" TEXT NOT NULL,
    "field_mappings" JSONB,
    "status_mappings" JSONB,
    "priority_mappings" JSONB,
    "auto_create" BOOLEAN NOT NULL DEFAULT false,
    "auto_sync_status" BOOLEAN NOT NULL DEFAULT true,
    "sync_attachments" BOOLEAN NOT NULL DEFAULT false,
    "sync_work_notes" BOOLEAN NOT NULL DEFAULT false,
    "query_filter" TEXT,
    "assignment_group_id" TEXT,
    "category_id" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "synced_record_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicenow_table_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicenow_record_links" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "mapping_id" TEXT NOT NULL,
    "snow_sys_id" TEXT NOT NULL,
    "snow_number" TEXT NOT NULL,
    "snow_url" TEXT NOT NULL,
    "grc_entity_type" TEXT NOT NULL,
    "grc_entity_id" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL,
    "sync_status" TEXT NOT NULL DEFAULT 'synced',
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicenow_record_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "head_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_departments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_group_hierarchies" (
    "id" TEXT NOT NULL,
    "parent_group_id" TEXT NOT NULL,
    "child_group_id" TEXT NOT NULL,
    "inherit_permissions" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_group_hierarchies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_group_department_scopes" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "include_children" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_group_department_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay" INTEGER NOT NULL DEFAULT 5000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "result" JSONB,
    "error" TEXT,
    "stack_trace" TEXT,
    "processed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "delay_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cron_expression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "data" JSONB,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "last_run_status" TEXT,
    "last_run_error" TEXT,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_plan_attestations" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "attester_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "attestation_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attested_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "comments" TEXT,
    "valid_until" TIMESTAMP(3),
    "requested_by" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bcdr_plan_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_exercise_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "scenario_type" TEXT NOT NULL,
    "scenario_narrative" TEXT NOT NULL,
    "discussion_questions" JSONB NOT NULL,
    "injects" JSONB,
    "expected_decisions" JSONB,
    "facilitator_notes" TEXT,
    "estimated_duration_minutes" INTEGER,
    "participant_roles" JSONB,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bcdr_exercise_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_recovery_teams" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "team_type" TEXT NOT NULL,
    "activation_criteria" TEXT,
    "assembly_location" TEXT,
    "communication_channel" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "bcdr_recovery_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_recovery_team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "responsibilities" TEXT,
    "user_id" TEXT,
    "external_name" TEXT,
    "external_email" TEXT,
    "external_phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "alternate_for" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bcdr_recovery_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_recovery_team_plan_links" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "role_in_plan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bcdr_recovery_team_plan_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_process_vendor_dependencies" (
    "id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "dependency_type" TEXT NOT NULL,
    "vendor_rto_hours" INTEGER,
    "vendor_rpo_hours" INTEGER,
    "vendor_has_bcp" BOOLEAN,
    "vendor_bcp_reviewed" TIMESTAMP(3),
    "gap_analysis" TEXT,
    "mitigation_plan" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bcdr_process_vendor_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_incidents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "incident_type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "declared_at" TIMESTAMP(3) NOT NULL,
    "declared_by" TEXT NOT NULL,
    "activated_plans" JSONB NOT NULL DEFAULT '[]',
    "activated_teams" JSONB NOT NULL DEFAULT '[]',
    "recovery_started_at" TIMESTAMP(3),
    "operational_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "actual_downtime_minutes" INTEGER,
    "data_loss_minutes" INTEGER,
    "financial_impact" DECIMAL(15,2),
    "root_cause" TEXT,
    "lessons_learned" TEXT,
    "improvement_actions" JSONB,
    "post_incident_review_date" TIMESTAMP(3),
    "post_incident_review_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bcdr_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bcdr_incident_timeline" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "bcdr_incident_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "workspaces_organization_id_status_idx" ON "workspaces"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_organization_id_slug_key" ON "workspaces"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_configuration_organization_id_key" ON "notification_configuration"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_keycloak_id_key" ON "users"("keycloak_id");

-- CreateIndex
CREATE INDEX "users_organization_id_status_idx" ON "users"("organization_id", "status");

-- CreateIndex
CREATE INDEX "users_status_last_login_at_idx" ON "users"("status", "last_login_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_organization_id_email_key" ON "users"("organization_id", "email");

-- CreateIndex
CREATE INDEX "controls_category_idx" ON "controls"("category");

-- CreateIndex
CREATE INDEX "controls_organization_id_idx" ON "controls"("organization_id");

-- CreateIndex
CREATE INDEX "controls_created_at_idx" ON "controls"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "controls_control_id_organization_id_key" ON "controls"("control_id", "organization_id");

-- CreateIndex
CREATE INDEX "control_implementations_organization_id_status_idx" ON "control_implementations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "control_implementations_workspace_id_idx" ON "control_implementations"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_implementations_control_id_organization_id_workspac_key" ON "control_implementations"("control_id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "control_tests_implementation_id_idx" ON "control_tests"("implementation_id");

-- CreateIndex
CREATE INDEX "control_test_evidence_evidence_id_idx" ON "control_test_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_test_evidence_test_id_evidence_id_key" ON "control_test_evidence"("test_id", "evidence_id");

-- CreateIndex
CREATE INDEX "control_evidence_collectors_organization_id_control_id_idx" ON "control_evidence_collectors"("organization_id", "control_id");

-- CreateIndex
CREATE INDEX "control_evidence_collectors_schedule_enabled_next_run_at_idx" ON "control_evidence_collectors"("schedule_enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "collector_runs_collector_id_started_at_idx" ON "collector_runs"("collector_id", "started_at");

-- CreateIndex
CREATE INDEX "evidence_organization_id_status_idx" ON "evidence"("organization_id", "status");

-- CreateIndex
CREATE INDEX "evidence_organization_id_type_idx" ON "evidence"("organization_id", "type");

-- CreateIndex
CREATE INDEX "evidence_workspace_id_idx" ON "evidence"("workspace_id");

-- CreateIndex
CREATE INDEX "evidence_valid_until_idx" ON "evidence"("valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_folders_organization_id_path_key" ON "evidence_folders"("organization_id", "path");

-- CreateIndex
CREATE INDEX "evidence_control_links_control_id_idx" ON "evidence_control_links"("control_id");

-- CreateIndex
CREATE INDEX "evidence_control_links_implementation_id_idx" ON "evidence_control_links"("implementation_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_control_links_evidence_id_implementation_id_key" ON "evidence_control_links"("evidence_id", "implementation_id");

-- CreateIndex
CREATE INDEX "frameworks_workspace_id_idx" ON "frameworks"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "frameworks_type_version_organization_id_key" ON "frameworks"("type", "version", "organization_id");

-- CreateIndex
CREATE INDEX "framework_requirements_framework_id_parent_id_idx" ON "framework_requirements"("framework_id", "parent_id");

-- CreateIndex
CREATE INDEX "framework_requirements_owner_id_idx" ON "framework_requirements"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "framework_requirements_framework_id_reference_key" ON "framework_requirements"("framework_id", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "control_mappings_framework_id_requirement_id_control_id_key" ON "control_mappings"("framework_id", "requirement_id", "control_id");

-- CreateIndex
CREATE INDEX "control_mapping_history_mapping_id_changed_at_idx" ON "control_mapping_history"("mapping_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "readiness_assessments_organization_id_framework_id_idx" ON "readiness_assessments"("organization_id", "framework_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_statuses_assessment_id_requirement_id_key" ON "requirement_statuses"("assessment_id", "requirement_id");

-- CreateIndex
CREATE INDEX "requirement_status_evidence_evidence_id_idx" ON "requirement_status_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_status_evidence_status_id_evidence_id_key" ON "requirement_status_evidence"("status_id", "evidence_id");

-- CreateIndex
CREATE INDEX "requirement_status_controls_control_id_idx" ON "requirement_status_controls"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "requirement_status_controls_status_id_control_id_key" ON "requirement_status_controls"("status_id", "control_id");

-- CreateIndex
CREATE INDEX "gaps_assessment_id_severity_idx" ON "gaps"("assessment_id", "severity");

-- CreateIndex
CREATE INDEX "remediation_tasks_assessment_id_status_idx" ON "remediation_tasks"("assessment_id", "status");

-- CreateIndex
CREATE INDEX "remediation_task_controls_control_id_idx" ON "remediation_task_controls"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "remediation_task_controls_task_id_control_id_key" ON "remediation_task_controls"("task_id", "control_id");

-- CreateIndex
CREATE INDEX "policies_organization_id_status_idx" ON "policies"("organization_id", "status");

-- CreateIndex
CREATE INDEX "policies_organization_id_category_idx" ON "policies"("organization_id", "category");

-- CreateIndex
CREATE INDEX "policies_owner_id_idx" ON "policies"("owner_id");

-- CreateIndex
CREATE INDEX "policies_created_at_idx" ON "policies"("created_at");

-- CreateIndex
CREATE INDEX "policy_versions_policy_id_idx" ON "policy_versions"("policy_id");

-- CreateIndex
CREATE INDEX "policy_approvals_policy_id_status_idx" ON "policy_approvals"("policy_id", "status");

-- CreateIndex
CREATE INDEX "policy_reviews_policy_id_status_idx" ON "policy_reviews"("policy_id", "status");

-- CreateIndex
CREATE INDEX "policy_status_history_policy_id_idx" ON "policy_status_history"("policy_id");

-- CreateIndex
CREATE INDEX "policy_control_links_control_id_idx" ON "policy_control_links"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_control_links_policy_id_control_id_key" ON "policy_control_links"("policy_id", "control_id");

-- CreateIndex
CREATE INDEX "integrations_organization_id_type_idx" ON "integrations"("organization_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "custom_integration_configs_integration_id_key" ON "custom_integration_configs"("integration_id");

-- CreateIndex
CREATE INDEX "sync_jobs_integration_id_status_idx" ON "sync_jobs"("integration_id", "status");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_is_active_idx" ON "api_keys"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "api_keys_expires_at_idx" ON "api_keys"("expires_at");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_is_active_expires_at_idx" ON "api_keys"("organization_id", "is_active", "expires_at");

-- CreateIndex
CREATE INDEX "webhook_events_organization_id_source_idx" ON "webhook_events"("organization_id", "source");

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_organization_id_is_active_idx" ON "webhook_subscriptions"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "webhook_deliveries_subscription_id_status_idx" ON "webhook_deliveries"("subscription_id", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "webhook_deliveries"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "compliance_checks_integration_id_is_enabled_idx" ON "compliance_checks"("integration_id", "is_enabled");

-- CreateIndex
CREATE INDEX "compliance_check_results_check_id_run_at_idx" ON "compliance_check_results"("check_id", "run_at");

-- CreateIndex
CREATE INDEX "alerts_organization_id_status_idx" ON "alerts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "alerts_organization_id_severity_idx" ON "alerts"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_timestamp_idx" ON "audit_logs"("organization_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_entity_type_entity_id_idx" ON "audit_logs"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_action_idx" ON "audit_logs"("organization_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_organization_id_created_at_idx" ON "notifications"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_notification_type_key" ON "notification_preferences"("user_id", "notification_type");

-- CreateIndex
CREATE INDEX "comments_organization_id_entity_type_entity_id_idx" ON "comments"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "comments_author_id_idx" ON "comments"("author_id");

-- CreateIndex
CREATE INDEX "tasks_organization_id_entity_type_entity_id_idx" ON "tasks"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "tasks_assignee_id_status_idx" ON "tasks"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "tasks_organization_id_status_idx" ON "tasks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "permission_groups_organization_id_idx" ON "permission_groups"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_groups_organization_id_name_key" ON "permission_groups"("organization_id", "name");

-- CreateIndex
CREATE INDEX "user_group_memberships_user_id_idx" ON "user_group_memberships"("user_id");

-- CreateIndex
CREATE INDEX "user_group_memberships_group_id_idx" ON "user_group_memberships"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_group_memberships_user_id_group_id_key" ON "user_group_memberships"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "user_permission_overrides_user_id_idx" ON "user_permission_overrides"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_overrides_user_id_permission_key" ON "user_permission_overrides"("user_id", "permission");

-- CreateIndex
CREATE INDEX "assets_organization_id_type_idx" ON "assets"("organization_id", "type");

-- CreateIndex
CREATE INDEX "assets_organization_id_status_idx" ON "assets"("organization_id", "status");

-- CreateIndex
CREATE INDEX "assets_organization_id_criticality_idx" ON "assets"("organization_id", "criticality");

-- CreateIndex
CREATE INDEX "assets_workspace_id_idx" ON "assets"("workspace_id");

-- CreateIndex
CREATE INDEX "assets_created_at_idx" ON "assets"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assets_organization_id_external_id_source_key" ON "assets"("organization_id", "external_id", "source");

-- CreateIndex
CREATE INDEX "risks_organization_id_status_idx" ON "risks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "risks_organization_id_category_idx" ON "risks"("organization_id", "category");

-- CreateIndex
CREATE INDEX "risks_organization_id_inherent_risk_idx" ON "risks"("organization_id", "inherent_risk");

-- CreateIndex
CREATE INDEX "risks_workspace_id_idx" ON "risks"("workspace_id");

-- CreateIndex
CREATE INDEX "risks_risk_owner_id_status_idx" ON "risks"("risk_owner_id", "status");

-- CreateIndex
CREATE INDEX "risks_grc_sme_id_idx" ON "risks"("grc_sme_id");

-- CreateIndex
CREATE INDEX "risks_created_at_idx" ON "risks"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "risks_organization_id_risk_id_key" ON "risks"("organization_id", "risk_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assessments_risk_id_key" ON "risk_assessments"("risk_id");

-- CreateIndex
CREATE INDEX "risk_assessments_status_idx" ON "risk_assessments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "risk_treatments_risk_id_key" ON "risk_treatments"("risk_id");

-- CreateIndex
CREATE INDEX "risk_treatments_status_idx" ON "risk_treatments"("status");

-- CreateIndex
CREATE INDEX "risk_treatments_risk_owner_id_idx" ON "risk_treatments"("risk_owner_id");

-- CreateIndex
CREATE INDEX "risk_treatments_executive_approver_id_idx" ON "risk_treatments"("executive_approver_id");

-- CreateIndex
CREATE INDEX "risk_treatment_updates_treatment_id_created_at_idx" ON "risk_treatment_updates"("treatment_id", "created_at");

-- CreateIndex
CREATE INDEX "risk_assets_asset_id_idx" ON "risk_assets"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assets_risk_id_asset_id_key" ON "risk_assets"("risk_id", "asset_id");

-- CreateIndex
CREATE INDEX "risk_controls_control_id_idx" ON "risk_controls"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_controls_risk_id_control_id_key" ON "risk_controls"("risk_id", "control_id");

-- CreateIndex
CREATE INDEX "risk_scenarios_risk_id_idx" ON "risk_scenarios"("risk_id");

-- CreateIndex
CREATE INDEX "risk_scenario_templates_organization_id_idx" ON "risk_scenario_templates"("organization_id");

-- CreateIndex
CREATE INDEX "risk_scenario_templates_category_idx" ON "risk_scenario_templates"("category");

-- CreateIndex
CREATE INDEX "risk_scenario_templates_threat_actor_idx" ON "risk_scenario_templates"("threat_actor");

-- CreateIndex
CREATE INDEX "risk_scenario_templates_is_template_idx" ON "risk_scenario_templates"("is_template");

-- CreateIndex
CREATE INDEX "risk_history_risk_id_changed_at_idx" ON "risk_history"("risk_id", "changed_at");

-- CreateIndex
CREATE INDEX "risk_workflow_tasks_organization_id_assignee_id_status_idx" ON "risk_workflow_tasks"("organization_id", "assignee_id", "status");

-- CreateIndex
CREATE INDEX "risk_workflow_tasks_risk_id_status_idx" ON "risk_workflow_tasks"("risk_id", "status");

-- CreateIndex
CREATE INDEX "risk_workflow_tasks_assignee_id_status_due_date_idx" ON "risk_workflow_tasks"("assignee_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_key" ON "user_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_configurations_organization_id_key" ON "risk_configurations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tprm_configurations_organization_id_key" ON "tprm_configurations"("organization_id");

-- CreateIndex
CREATE INDEX "answer_templates_organization_id_idx" ON "answer_templates"("organization_id");

-- CreateIndex
CREATE INDEX "answer_templates_category_idx" ON "answer_templates"("category");

-- CreateIndex
CREATE INDEX "answer_templates_status_idx" ON "answer_templates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trust_configurations_organization_id_key" ON "trust_configurations"("organization_id");

-- CreateIndex
CREATE INDEX "vendors_organization_id_status_idx" ON "vendors"("organization_id", "status");

-- CreateIndex
CREATE INDEX "vendors_organization_id_tier_idx" ON "vendors"("organization_id", "tier");

-- CreateIndex
CREATE INDEX "vendors_organization_id_category_idx" ON "vendors"("organization_id", "category");

-- CreateIndex
CREATE INDEX "vendors_organization_id_compliance_status_idx" ON "vendors"("organization_id", "compliance_status");

-- CreateIndex
CREATE INDEX "vendors_organization_id_last_reviewed_at_idx" ON "vendors"("organization_id", "last_reviewed_at");

-- CreateIndex
CREATE INDEX "vendors_organization_id_next_review_due_idx" ON "vendors"("organization_id", "next_review_due");

-- CreateIndex
CREATE INDEX "vendors_workspace_id_idx" ON "vendors"("workspace_id");

-- CreateIndex
CREATE INDEX "vendors_created_at_idx" ON "vendors"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_organization_id_vendor_id_key" ON "vendors"("organization_id", "vendor_id");

-- CreateIndex
CREATE INDEX "vendor_assessments_vendor_id_status_idx" ON "vendor_assessments"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_assessments_organization_id_assessment_type_idx" ON "vendor_assessments"("organization_id", "assessment_type");

-- CreateIndex
CREATE INDEX "vendor_assessments_assessor_id_idx" ON "vendor_assessments"("assessor_id");

-- CreateIndex
CREATE INDEX "vendor_assessment_evidence_evidence_id_idx" ON "vendor_assessment_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_assessment_evidence_assessment_id_evidence_id_key" ON "vendor_assessment_evidence"("assessment_id", "evidence_id");

-- CreateIndex
CREATE INDEX "vendor_contracts_vendor_id_status_idx" ON "vendor_contracts"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_contracts_organization_id_end_date_idx" ON "vendor_contracts"("organization_id", "end_date");

-- CreateIndex
CREATE INDEX "vendor_contracts_organization_id_status_idx" ON "vendor_contracts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "vendor_contacts_vendor_id_idx" ON "vendor_contacts"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_documents_vendor_id_document_type_idx" ON "vendor_documents"("vendor_id", "document_type");

-- CreateIndex
CREATE INDEX "vendor_documents_organization_id_expiry_date_idx" ON "vendor_documents"("organization_id", "expiry_date");

-- CreateIndex
CREATE INDEX "vendor_risk_findings_vendor_id_status_idx" ON "vendor_risk_findings"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "vendor_risk_findings_organization_id_severity_idx" ON "vendor_risk_findings"("organization_id", "severity");

-- CreateIndex
CREATE INDEX "vendor_access_reviews_vendor_id_review_date_idx" ON "vendor_access_reviews"("vendor_id", "review_date");

-- CreateIndex
CREATE INDEX "vendor_access_reviews_organization_id_status_idx" ON "vendor_access_reviews"("organization_id", "status");

-- CreateIndex
CREATE INDEX "questionnaire_requests_organization_id_status_idx" ON "questionnaire_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "questionnaire_requests_organization_id_due_date_idx" ON "questionnaire_requests"("organization_id", "due_date");

-- CreateIndex
CREATE INDEX "questionnaire_requests_assigned_to_idx" ON "questionnaire_requests"("assigned_to");

-- CreateIndex
CREATE INDEX "questionnaire_requests_deleted_at_idx" ON "questionnaire_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "questionnaire_questions_questionnaire_id_status_idx" ON "questionnaire_questions"("questionnaire_id", "status");

-- CreateIndex
CREATE INDEX "questionnaire_questions_assigned_to_idx" ON "questionnaire_questions"("assigned_to");

-- CreateIndex
CREATE INDEX "questionnaire_questions_category_idx" ON "questionnaire_questions"("category");

-- CreateIndex
CREATE INDEX "question_attachments_question_id_idx" ON "question_attachments"("question_id");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_organization_id_category_idx" ON "knowledge_base_entries"("organization_id", "category");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_organization_id_status_idx" ON "knowledge_base_entries"("organization_id", "status");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_framework_idx" ON "knowledge_base_entries"("framework");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_is_public_idx" ON "knowledge_base_entries"("is_public");

-- CreateIndex
CREATE INDEX "knowledge_base_entries_deleted_at_idx" ON "knowledge_base_entries"("deleted_at");

-- CreateIndex
CREATE INDEX "knowledge_base_controls_control_id_idx" ON "knowledge_base_controls"("control_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_controls_knowledge_base_id_control_id_key" ON "knowledge_base_controls"("knowledge_base_id", "control_id");

-- CreateIndex
CREATE INDEX "knowledge_base_evidence_evidence_id_idx" ON "knowledge_base_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_evidence_knowledge_base_id_evidence_id_key" ON "knowledge_base_evidence"("knowledge_base_id", "evidence_id");

-- CreateIndex
CREATE INDEX "knowledge_base_policies_policy_id_idx" ON "knowledge_base_policies"("policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_base_policies_knowledge_base_id_policy_id_key" ON "knowledge_base_policies"("knowledge_base_id", "policy_id");

-- CreateIndex
CREATE INDEX "knowledge_attachments_knowledge_base_id_idx" ON "knowledge_attachments"("knowledge_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "trust_center_config_organization_id_key" ON "trust_center_config"("organization_id");

-- CreateIndex
CREATE INDEX "trust_center_content_organization_id_section_idx" ON "trust_center_content"("organization_id", "section");

-- CreateIndex
CREATE INDEX "trust_center_content_organization_id_is_published_idx" ON "trust_center_content"("organization_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "audits_portal_access_code_key" ON "audits"("portal_access_code");

-- CreateIndex
CREATE UNIQUE INDEX "audits_field_guide_id_key" ON "audits"("field_guide_id");

-- CreateIndex
CREATE INDEX "audits_organization_id_status_idx" ON "audits"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audits_organization_id_audit_type_idx" ON "audits"("organization_id", "audit_type");

-- CreateIndex
CREATE INDEX "audits_workspace_id_idx" ON "audits"("workspace_id");

-- CreateIndex
CREATE INDEX "audits_is_external_idx" ON "audits"("is_external");

-- CreateIndex
CREATE INDEX "audits_deleted_at_idx" ON "audits"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "audits_organization_id_audit_id_key" ON "audits"("organization_id", "audit_id");

-- CreateIndex
CREATE INDEX "audit_requests_audit_id_status_idx" ON "audit_requests"("audit_id", "status");

-- CreateIndex
CREATE INDEX "audit_requests_organization_id_status_idx" ON "audit_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audit_requests_assigned_to_idx" ON "audit_requests"("assigned_to");

-- CreateIndex
CREATE INDEX "audit_requests_deleted_at_idx" ON "audit_requests"("deleted_at");

-- CreateIndex
CREATE INDEX "audit_evidence_audit_id_review_status_idx" ON "audit_evidence"("audit_id", "review_status");

-- CreateIndex
CREATE INDEX "audit_evidence_request_id_idx" ON "audit_evidence"("request_id");

-- CreateIndex
CREATE INDEX "audit_findings_audit_id_severity_idx" ON "audit_findings"("audit_id", "severity");

-- CreateIndex
CREATE INDEX "audit_findings_organization_id_status_idx" ON "audit_findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audit_findings_remediation_owner_idx" ON "audit_findings"("remediation_owner");

-- CreateIndex
CREATE INDEX "audit_test_results_audit_id_control_id_idx" ON "audit_test_results"("audit_id", "control_id");

-- CreateIndex
CREATE INDEX "audit_test_results_audit_id_result_idx" ON "audit_test_results"("audit_id", "result");

-- CreateIndex
CREATE INDEX "audit_meetings_audit_id_scheduled_at_idx" ON "audit_meetings"("audit_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "audit_meetings_organization_id_status_idx" ON "audit_meetings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "audit_activities_audit_id_timestamp_idx" ON "audit_activities"("audit_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_activities_organization_id_activity_type_idx" ON "audit_activities"("organization_id", "activity_type");

-- CreateIndex
CREATE INDEX "audit_request_comments_request_id_created_at_idx" ON "audit_request_comments"("request_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_portal_users_access_code_idx" ON "audit_portal_users"("access_code");

-- CreateIndex
CREATE INDEX "audit_portal_users_expires_at_idx" ON "audit_portal_users"("expires_at");

-- CreateIndex
CREATE INDEX "audit_portal_users_audit_id_is_active_expires_at_idx" ON "audit_portal_users"("audit_id", "is_active", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "audit_portal_users_audit_id_email_key" ON "audit_portal_users"("audit_id", "email");

-- CreateIndex
CREATE INDEX "audit_portal_access_logs_audit_id_timestamp_idx" ON "audit_portal_access_logs"("audit_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_portal_access_logs_portal_user_id_idx" ON "audit_portal_access_logs"("portal_user_id");

-- CreateIndex
CREATE INDEX "audit_portal_access_logs_access_code_idx" ON "audit_portal_access_logs"("access_code");

-- CreateIndex
CREATE INDEX "audit_team_members_user_id_idx" ON "audit_team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_team_members_audit_id_user_id_key" ON "audit_team_members"("audit_id", "user_id");

-- CreateIndex
CREATE INDEX "vendor_access_systems_asset_id_idx" ON "vendor_access_systems"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_access_systems_vendor_access_review_id_asset_id_key" ON "vendor_access_systems"("vendor_access_review_id", "asset_id");

-- CreateIndex
CREATE INDEX "audit_test_evidence_evidence_id_idx" ON "audit_test_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_test_evidence_audit_test_result_id_evidence_id_key" ON "audit_test_evidence"("audit_test_result_id", "evidence_id");

-- CreateIndex
CREATE INDEX "tags_organization_id_entity_type_idx" ON "tags"("organization_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "tags_organization_id_name_entity_type_key" ON "tags"("organization_id", "name", "entity_type");

-- CreateIndex
CREATE INDEX "control_tags_tag_id_idx" ON "control_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "control_tags_control_id_tag_id_key" ON "control_tags"("control_id", "tag_id");

-- CreateIndex
CREATE INDEX "evidence_tags_tag_id_idx" ON "evidence_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_tags_evidence_id_tag_id_key" ON "evidence_tags"("evidence_id", "tag_id");

-- CreateIndex
CREATE INDEX "policy_tags_tag_id_idx" ON "policy_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_tags_policy_id_tag_id_key" ON "policy_tags"("policy_id", "tag_id");

-- CreateIndex
CREATE INDEX "risk_tags_tag_id_idx" ON "risk_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_tags_risk_id_tag_id_key" ON "risk_tags"("risk_id", "tag_id");

-- CreateIndex
CREATE INDEX "vendor_tags_tag_id_idx" ON "vendor_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_tags_vendor_id_tag_id_key" ON "vendor_tags"("vendor_id", "tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_certifications_vendor_id_certification_key" ON "vendor_certifications"("vendor_id", "certification");

-- CreateIndex
CREATE UNIQUE INDEX "audit_meeting_internal_attendees_meeting_id_user_id_key" ON "audit_meeting_internal_attendees"("meeting_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_meeting_external_attendees_meeting_id_idx" ON "audit_meeting_external_attendees"("meeting_id");

-- CreateIndex
CREATE INDEX "audit_meeting_attachments_meeting_id_idx" ON "audit_meeting_attachments"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_scopes_api_key_id_scope_key" ON "api_key_scopes"("api_key_id", "scope");

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_start_date_idx" ON "calendar_events"("organization_id", "start_date");

-- CreateIndex
CREATE INDEX "calendar_events_organization_id_event_type_idx" ON "calendar_events"("organization_id", "event_type");

-- CreateIndex
CREATE INDEX "calendar_events_entity_id_entity_type_idx" ON "calendar_events"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "calendar_events_parent_event_id_idx" ON "calendar_events"("parent_event_id");

-- CreateIndex
CREATE INDEX "vendor_assessment_conditions_assessment_id_idx" ON "vendor_assessment_conditions"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_access_data_categories_access_review_id_category_key" ON "vendor_access_data_categories"("access_review_id", "category");

-- CreateIndex
CREATE INDEX "correlated_employees_organization_id_idx" ON "correlated_employees"("organization_id");

-- CreateIndex
CREATE INDEX "correlated_employees_employment_status_idx" ON "correlated_employees"("employment_status");

-- CreateIndex
CREATE INDEX "correlated_employees_department_idx" ON "correlated_employees"("department");

-- CreateIndex
CREATE UNIQUE INDEX "correlated_employees_organization_id_email_key" ON "correlated_employees"("organization_id", "email");

-- CreateIndex
CREATE INDEX "employee_background_checks_correlated_employee_id_idx" ON "employee_background_checks"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_background_checks_status_idx" ON "employee_background_checks"("status");

-- CreateIndex
CREATE INDEX "employee_background_checks_expires_at_idx" ON "employee_background_checks"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "employee_background_checks_correlated_employee_id_integrati_key" ON "employee_background_checks"("correlated_employee_id", "integration_id", "external_id");

-- CreateIndex
CREATE INDEX "employee_training_records_correlated_employee_id_idx" ON "employee_training_records"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_training_records_status_idx" ON "employee_training_records"("status");

-- CreateIndex
CREATE INDEX "employee_training_records_due_date_idx" ON "employee_training_records"("due_date");

-- CreateIndex
CREATE INDEX "employee_asset_assignments_correlated_employee_id_idx" ON "employee_asset_assignments"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_asset_assignments_serial_number_idx" ON "employee_asset_assignments"("serial_number");

-- CreateIndex
CREATE INDEX "employee_asset_assignments_is_compliant_idx" ON "employee_asset_assignments"("is_compliant");

-- CreateIndex
CREATE UNIQUE INDEX "employee_asset_assignments_correlated_employee_id_integrati_key" ON "employee_asset_assignments"("correlated_employee_id", "integration_id", "external_asset_id");

-- CreateIndex
CREATE INDEX "employee_access_records_correlated_employee_id_idx" ON "employee_access_records"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_access_records_review_status_idx" ON "employee_access_records"("review_status");

-- CreateIndex
CREATE INDEX "employee_security_scores_correlated_employee_id_idx" ON "employee_security_scores"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_security_scores_risk_level_idx" ON "employee_security_scores"("risk_level");

-- CreateIndex
CREATE INDEX "employee_attestations_correlated_employee_id_idx" ON "employee_attestations"("correlated_employee_id");

-- CreateIndex
CREATE INDEX "employee_attestations_policy_id_idx" ON "employee_attestations"("policy_id");

-- CreateIndex
CREATE INDEX "employee_attestations_status_idx" ON "employee_attestations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_attestations_correlated_employee_id_policy_id_key" ON "employee_attestations"("correlated_employee_id", "policy_id");

-- CreateIndex
CREATE INDEX "dashboards_organization_id_idx" ON "dashboards"("organization_id");

-- CreateIndex
CREATE INDEX "dashboards_user_id_idx" ON "dashboards"("user_id");

-- CreateIndex
CREATE INDEX "dashboards_is_template_idx" ON "dashboards"("is_template");

-- CreateIndex
CREATE INDEX "dashboard_widgets_dashboard_id_idx" ON "dashboard_widgets"("dashboard_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_widget_type_idx" ON "dashboard_widgets"("widget_type");

-- CreateIndex
CREATE INDEX "dashboard_data_sources_organization_id_idx" ON "dashboard_data_sources"("organization_id");

-- CreateIndex
CREATE INDEX "dashboard_data_sources_type_idx" ON "dashboard_data_sources"("type");

-- CreateIndex
CREATE INDEX "custom_reports_organization_id_idx" ON "custom_reports"("organization_id");

-- CreateIndex
CREATE INDEX "custom_reports_user_id_idx" ON "custom_reports"("user_id");

-- CreateIndex
CREATE INDEX "custom_reports_report_type_idx" ON "custom_reports"("report_type");

-- CreateIndex
CREATE INDEX "scheduled_reports_organization_id_idx" ON "scheduled_reports"("organization_id");

-- CreateIndex
CREATE INDEX "scheduled_reports_user_id_idx" ON "scheduled_reports"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_reports_is_enabled_idx" ON "scheduled_reports"("is_enabled");

-- CreateIndex
CREATE INDEX "scheduled_reports_next_run_at_idx" ON "scheduled_reports"("next_run_at");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_scheduled_report_id_idx" ON "scheduled_report_executions"("scheduled_report_id");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_status_idx" ON "scheduled_report_executions"("status");

-- CreateIndex
CREATE INDEX "scheduled_report_executions_started_at_idx" ON "scheduled_report_executions"("started_at");

-- CreateIndex
CREATE INDEX "training_progress_organization_id_idx" ON "training_progress"("organization_id");

-- CreateIndex
CREATE INDEX "training_progress_user_id_idx" ON "training_progress"("user_id");

-- CreateIndex
CREATE INDEX "training_progress_module_id_idx" ON "training_progress"("module_id");

-- CreateIndex
CREATE INDEX "training_progress_status_idx" ON "training_progress"("status");

-- CreateIndex
CREATE UNIQUE INDEX "training_progress_user_id_module_id_key" ON "training_progress"("user_id", "module_id");

-- CreateIndex
CREATE INDEX "training_assignments_organization_id_idx" ON "training_assignments"("organization_id");

-- CreateIndex
CREATE INDEX "training_assignments_user_id_idx" ON "training_assignments"("user_id");

-- CreateIndex
CREATE INDEX "training_assignments_module_id_idx" ON "training_assignments"("module_id");

-- CreateIndex
CREATE INDEX "training_assignments_status_idx" ON "training_assignments"("status");

-- CreateIndex
CREATE INDEX "training_assignments_due_date_idx" ON "training_assignments"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "training_assignments_user_id_module_id_key" ON "training_assignments"("user_id", "module_id");

-- CreateIndex
CREATE INDEX "training_campaigns_organization_id_idx" ON "training_campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "training_campaigns_is_active_idx" ON "training_campaigns"("is_active");

-- CreateIndex
CREATE INDEX "training_campaigns_start_date_idx" ON "training_campaigns"("start_date");

-- CreateIndex
CREATE INDEX "custom_training_modules_organization_id_idx" ON "custom_training_modules"("organization_id");

-- CreateIndex
CREATE INDEX "custom_training_modules_is_active_idx" ON "custom_training_modules"("is_active");

-- CreateIndex
CREATE INDEX "custom_training_modules_category_idx" ON "custom_training_modules"("category");

-- CreateIndex
CREATE INDEX "config_files_organization_id_workspace_id_idx" ON "config_files"("organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "config_files_path_idx" ON "config_files"("path");

-- CreateIndex
CREATE INDEX "config_files_format_idx" ON "config_files"("format");

-- CreateIndex
CREATE UNIQUE INDEX "config_files_organization_id_workspace_id_path_key" ON "config_files"("organization_id", "workspace_id", "path");

-- CreateIndex
CREATE INDEX "config_file_versions_config_file_id_idx" ON "config_file_versions"("config_file_id");

-- CreateIndex
CREATE INDEX "config_file_versions_created_at_idx" ON "config_file_versions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "config_file_versions_config_file_id_version_key" ON "config_file_versions"("config_file_id", "version");

-- CreateIndex
CREATE INDEX "config_resource_states_organization_id_idx" ON "config_resource_states"("organization_id");

-- CreateIndex
CREATE INDEX "config_resource_states_resource_type_resource_id_idx" ON "config_resource_states"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "config_resource_states_database_id_idx" ON "config_resource_states"("database_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_resource_states_organization_id_workspace_id_resourc_key" ON "config_resource_states"("organization_id", "workspace_id", "resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "config_apply_history_organization_id_applied_at_idx" ON "config_apply_history"("organization_id", "applied_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "config_apply_locks_organization_id_workspace_id_key" ON "config_apply_locks"("organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "audit_templates_organization_id_idx" ON "audit_templates"("organization_id");

-- CreateIndex
CREATE INDEX "audit_templates_audit_type_idx" ON "audit_templates"("audit_type");

-- CreateIndex
CREATE INDEX "audit_templates_framework_idx" ON "audit_templates"("framework");

-- CreateIndex
CREATE INDEX "audit_workpapers_audit_id_idx" ON "audit_workpapers"("audit_id");

-- CreateIndex
CREATE INDEX "audit_workpapers_organization_id_idx" ON "audit_workpapers"("organization_id");

-- CreateIndex
CREATE INDEX "audit_workpapers_status_idx" ON "audit_workpapers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "audit_workpapers_audit_id_workpaper_number_key" ON "audit_workpapers"("audit_id", "workpaper_number");

-- CreateIndex
CREATE INDEX "workpaper_history_workpaper_id_version_idx" ON "workpaper_history"("workpaper_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "remediation_plans_finding_id_key" ON "remediation_plans"("finding_id");

-- CreateIndex
CREATE INDEX "remediation_plans_organization_id_idx" ON "remediation_plans"("organization_id");

-- CreateIndex
CREATE INDEX "remediation_plans_status_idx" ON "remediation_plans"("status");

-- CreateIndex
CREATE INDEX "remediation_plans_priority_idx" ON "remediation_plans"("priority");

-- CreateIndex
CREATE INDEX "remediation_milestones_plan_id_idx" ON "remediation_milestones"("plan_id");

-- CreateIndex
CREATE INDEX "remediation_milestones_status_idx" ON "remediation_milestones"("status");

-- CreateIndex
CREATE INDEX "audit_test_procedures_audit_id_idx" ON "audit_test_procedures"("audit_id");

-- CreateIndex
CREATE INDEX "audit_test_procedures_organization_id_idx" ON "audit_test_procedures"("organization_id");

-- CreateIndex
CREATE INDEX "audit_test_procedures_control_id_idx" ON "audit_test_procedures"("control_id");

-- CreateIndex
CREATE INDEX "audit_test_procedures_conclusion_idx" ON "audit_test_procedures"("conclusion");

-- CreateIndex
CREATE INDEX "audit_plan_entries_organization_id_idx" ON "audit_plan_entries"("organization_id");

-- CreateIndex
CREATE INDEX "audit_plan_entries_year_quarter_idx" ON "audit_plan_entries"("year", "quarter");

-- CreateIndex
CREATE INDEX "audit_plan_entries_status_idx" ON "audit_plan_entries"("status");

-- CreateIndex
CREATE INDEX "audit_plan_entries_risk_rating_idx" ON "audit_plan_entries"("risk_rating");

-- CreateIndex
CREATE INDEX "audit_analytics_snapshots_organization_id_snapshot_date_idx" ON "audit_analytics_snapshots"("organization_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "audit_analytics_snapshots_organization_id_snapshot_date_sna_key" ON "audit_analytics_snapshots"("organization_id", "snapshot_date", "snapshot_type");

-- CreateIndex
CREATE UNIQUE INDEX "scim_provider_configs_organization_id_key" ON "scim_provider_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "scim_external_ids_user_id_key" ON "scim_external_ids"("user_id");

-- CreateIndex
CREATE INDEX "scim_external_ids_external_id_provider_idx" ON "scim_external_ids"("external_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "scim_group_external_ids_group_id_key" ON "scim_group_external_ids"("group_id");

-- CreateIndex
CREATE INDEX "scim_group_external_ids_external_id_provider_idx" ON "scim_group_external_ids"("external_id", "provider");

-- CreateIndex
CREATE INDEX "approval_workflows_organization_id_entity_type_idx" ON "approval_workflows"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "approval_workflows_organization_id_is_active_idx" ON "approval_workflows"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "approval_requests_organization_id_status_idx" ON "approval_requests"("organization_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_workflow_id_status_idx" ON "approval_requests"("workflow_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_requested_by_idx" ON "approval_requests"("requested_by");

-- CreateIndex
CREATE INDEX "approval_requests_entity_type_entity_id_idx" ON "approval_requests"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_steps_request_id_step_number_idx" ON "approval_steps"("request_id", "step_number");

-- CreateIndex
CREATE INDEX "approval_steps_approver_type_approver_value_status_idx" ON "approval_steps"("approver_type", "approver_value", "status");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_status_idx" ON "export_jobs"("organization_id", "status");

-- CreateIndex
CREATE INDEX "export_jobs_organization_id_entity_type_idx" ON "export_jobs"("organization_id", "entity_type");

-- CreateIndex
CREATE INDEX "export_jobs_expires_at_idx" ON "export_jobs"("expires_at");

-- CreateIndex
CREATE INDEX "custom_field_definitions_organization_id_is_active_idx" ON "custom_field_definitions"("organization_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definitions_organization_id_name_key" ON "custom_field_definitions"("organization_id", "name");

-- CreateIndex
CREATE INDEX "custom_field_values_entity_type_entity_id_idx" ON "custom_field_values"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_field_id_entity_type_entity_id_key" ON "custom_field_values"("field_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "user_delegations_organization_id_delegator_id_status_idx" ON "user_delegations"("organization_id", "delegator_id", "status");

-- CreateIndex
CREATE INDEX "user_delegations_organization_id_delegate_id_status_idx" ON "user_delegations"("organization_id", "delegate_id", "status");

-- CreateIndex
CREATE INDEX "user_delegations_status_start_date_end_date_idx" ON "user_delegations"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "retention_policies_organization_id_is_enabled_idx" ON "retention_policies"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_organization_id_entity_type_key" ON "retention_policies"("organization_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "jira_connections_organization_id_key" ON "jira_connections"("organization_id");

-- CreateIndex
CREATE INDEX "jira_project_mappings_organization_id_is_enabled_idx" ON "jira_project_mappings"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "jira_project_mappings_organization_id_jira_project_key_grc__key" ON "jira_project_mappings"("organization_id", "jira_project_key", "grc_entity_type");

-- CreateIndex
CREATE INDEX "jira_issue_links_organization_id_grc_entity_type_grc_entity_idx" ON "jira_issue_links"("organization_id", "grc_entity_type", "grc_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_links_mapping_id_jira_key_key" ON "jira_issue_links"("mapping_id", "jira_key");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issue_links_mapping_id_grc_entity_type_grc_entity_id_key" ON "jira_issue_links"("mapping_id", "grc_entity_type", "grc_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_connections_organization_id_key" ON "servicenow_connections"("organization_id");

-- CreateIndex
CREATE INDEX "servicenow_table_mappings_organization_id_is_enabled_idx" ON "servicenow_table_mappings"("organization_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_table_mappings_organization_id_snow_table_name_g_key" ON "servicenow_table_mappings"("organization_id", "snow_table_name", "grc_entity_type");

-- CreateIndex
CREATE INDEX "servicenow_record_links_organization_id_grc_entity_type_grc_idx" ON "servicenow_record_links"("organization_id", "grc_entity_type", "grc_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_record_links_mapping_id_snow_sys_id_key" ON "servicenow_record_links"("mapping_id", "snow_sys_id");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_record_links_mapping_id_grc_entity_type_grc_enti_key" ON "servicenow_record_links"("mapping_id", "grc_entity_type", "grc_entity_id");

-- CreateIndex
CREATE INDEX "departments_organization_id_is_active_idx" ON "departments"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_code_key" ON "departments"("organization_id", "code");

-- CreateIndex
CREATE INDEX "user_departments_department_id_idx" ON "user_departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_departments_user_id_department_id_key" ON "user_departments"("user_id", "department_id");

-- CreateIndex
CREATE INDEX "permission_group_hierarchies_child_group_id_idx" ON "permission_group_hierarchies"("child_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_group_hierarchies_parent_group_id_child_group_id_key" ON "permission_group_hierarchies"("parent_group_id", "child_group_id");

-- CreateIndex
CREATE INDEX "permission_group_department_scopes_department_id_idx" ON "permission_group_department_scopes"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_group_department_scopes_group_id_department_id_key" ON "permission_group_department_scopes"("group_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_queues_name_key" ON "job_queues"("name");

-- CreateIndex
CREATE INDEX "jobs_queue_id_status_idx" ON "jobs"("queue_id", "status");

-- CreateIndex
CREATE INDEX "jobs_status_delay_until_idx" ON "jobs"("status", "delay_until");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_jobs_is_enabled_next_run_at_idx" ON "scheduled_jobs"("is_enabled", "next_run_at");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_jobs_queue_id_name_key" ON "scheduled_jobs"("queue_id", "name");

-- CreateIndex
CREATE INDEX "bcdr_plan_attestations_plan_id_idx" ON "bcdr_plan_attestations"("plan_id");

-- CreateIndex
CREATE INDEX "bcdr_plan_attestations_attester_id_idx" ON "bcdr_plan_attestations"("attester_id");

-- CreateIndex
CREATE INDEX "bcdr_plan_attestations_organization_id_idx" ON "bcdr_plan_attestations"("organization_id");

-- CreateIndex
CREATE INDEX "bcdr_plan_attestations_status_idx" ON "bcdr_plan_attestations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bcdr_exercise_templates_template_id_key" ON "bcdr_exercise_templates"("template_id");

-- CreateIndex
CREATE INDEX "bcdr_exercise_templates_organization_id_idx" ON "bcdr_exercise_templates"("organization_id");

-- CreateIndex
CREATE INDEX "bcdr_exercise_templates_category_idx" ON "bcdr_exercise_templates"("category");

-- CreateIndex
CREATE INDEX "bcdr_exercise_templates_is_global_idx" ON "bcdr_exercise_templates"("is_global");

-- CreateIndex
CREATE INDEX "bcdr_recovery_teams_organization_id_idx" ON "bcdr_recovery_teams"("organization_id");

-- CreateIndex
CREATE INDEX "bcdr_recovery_teams_team_type_idx" ON "bcdr_recovery_teams"("team_type");

-- CreateIndex
CREATE INDEX "bcdr_recovery_team_members_team_id_idx" ON "bcdr_recovery_team_members"("team_id");

-- CreateIndex
CREATE INDEX "bcdr_recovery_team_members_user_id_idx" ON "bcdr_recovery_team_members"("user_id");

-- CreateIndex
CREATE INDEX "bcdr_recovery_team_plan_links_plan_id_idx" ON "bcdr_recovery_team_plan_links"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "bcdr_recovery_team_plan_links_team_id_plan_id_key" ON "bcdr_recovery_team_plan_links"("team_id", "plan_id");

-- CreateIndex
CREATE INDEX "bcdr_process_vendor_dependencies_process_id_idx" ON "bcdr_process_vendor_dependencies"("process_id");

-- CreateIndex
CREATE INDEX "bcdr_process_vendor_dependencies_vendor_id_idx" ON "bcdr_process_vendor_dependencies"("vendor_id");

-- CreateIndex
CREATE INDEX "bcdr_process_vendor_dependencies_organization_id_idx" ON "bcdr_process_vendor_dependencies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "bcdr_process_vendor_dependencies_process_id_vendor_id_key" ON "bcdr_process_vendor_dependencies"("process_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "bcdr_incidents_incident_id_key" ON "bcdr_incidents"("incident_id");

-- CreateIndex
CREATE INDEX "bcdr_incidents_organization_id_idx" ON "bcdr_incidents"("organization_id");

-- CreateIndex
CREATE INDEX "bcdr_incidents_status_idx" ON "bcdr_incidents"("status");

-- CreateIndex
CREATE INDEX "bcdr_incidents_incident_type_idx" ON "bcdr_incidents"("incident_type");

-- CreateIndex
CREATE INDEX "bcdr_incidents_declared_at_idx" ON "bcdr_incidents"("declared_at");

-- CreateIndex
CREATE INDEX "bcdr_incident_timeline_incident_id_idx" ON "bcdr_incident_timeline"("incident_id");

-- CreateIndex
CREATE INDEX "bcdr_incident_timeline_timestamp_idx" ON "bcdr_incident_timeline"("timestamp");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_configuration" ADD CONSTRAINT "notification_configuration_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_implementations" ADD CONSTRAINT "control_implementations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_implementation_id_fkey" FOREIGN KEY ("implementation_id") REFERENCES "control_implementations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_test_evidence" ADD CONSTRAINT "control_test_evidence_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "control_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_test_evidence" ADD CONSTRAINT "control_test_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_evidence_collectors" ADD CONSTRAINT "control_evidence_collectors_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_evidence_collectors" ADD CONSTRAINT "control_evidence_collectors_implementation_id_fkey" FOREIGN KEY ("implementation_id") REFERENCES "control_implementations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_evidence_collectors" ADD CONSTRAINT "control_evidence_collectors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_evidence_collectors" ADD CONSTRAINT "control_evidence_collectors_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_evidence_collectors" ADD CONSTRAINT "control_evidence_collectors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collector_runs" ADD CONSTRAINT "collector_runs_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "control_evidence_collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "evidence_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_folders" ADD CONSTRAINT "evidence_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "evidence_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_folders" ADD CONSTRAINT "evidence_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_control_links" ADD CONSTRAINT "evidence_control_links_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_control_links" ADD CONSTRAINT "evidence_control_links_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_control_links" ADD CONSTRAINT "evidence_control_links_implementation_id_fkey" FOREIGN KEY ("implementation_id") REFERENCES "control_implementations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "framework_requirements" ADD CONSTRAINT "framework_requirements_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "framework_requirements" ADD CONSTRAINT "framework_requirements_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "framework_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "framework_requirements" ADD CONSTRAINT "framework_requirements_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "framework_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mappings" ADD CONSTRAINT "control_mappings_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mapping_history" ADD CONSTRAINT "control_mapping_history_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "control_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_mapping_history" ADD CONSTRAINT "control_mapping_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_assessments" ADD CONSTRAINT "readiness_assessments_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "frameworks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_statuses" ADD CONSTRAINT "requirement_statuses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_statuses" ADD CONSTRAINT "requirement_statuses_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "framework_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_status_evidence" ADD CONSTRAINT "requirement_status_evidence_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "requirement_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_status_evidence" ADD CONSTRAINT "requirement_status_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_status_controls" ADD CONSTRAINT "requirement_status_controls_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "requirement_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_status_controls" ADD CONSTRAINT "requirement_status_controls_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaps" ADD CONSTRAINT "gaps_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "framework_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_gap_id_fkey" FOREIGN KEY ("gap_id") REFERENCES "gaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "readiness_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_tasks" ADD CONSTRAINT "remediation_tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_task_controls" ADD CONSTRAINT "remediation_task_controls_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "remediation_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_task_controls" ADD CONSTRAINT "remediation_task_controls_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_versions" ADD CONSTRAINT "policy_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_approvals" ADD CONSTRAINT "policy_approvals_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_approvals" ADD CONSTRAINT "policy_approvals_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "policy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_approvals" ADD CONSTRAINT "policy_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_reviews" ADD CONSTRAINT "policy_reviews_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_status_history" ADD CONSTRAINT "policy_status_history_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_status_history" ADD CONSTRAINT "policy_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_control_links" ADD CONSTRAINT "policy_control_links_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_control_links" ADD CONSTRAINT "policy_control_links_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_integration_configs" ADD CONSTRAINT "custom_integration_configs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "webhook_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_checks" ADD CONSTRAINT "compliance_checks_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_check_results" ADD CONSTRAINT "compliance_check_results_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "compliance_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_group_memberships" ADD CONSTRAINT "user_group_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_grc_sme_id_fkey" FOREIGN KEY ("grc_sme_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_risk_assessor_id_fkey" FOREIGN KEY ("risk_assessor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_risk_owner_id_fkey" FOREIGN KEY ("risk_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatments" ADD CONSTRAINT "risk_treatments_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_updates" ADD CONSTRAINT "risk_treatment_updates_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "risk_treatments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_treatment_updates" ADD CONSTRAINT "risk_treatment_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assets" ADD CONSTRAINT "risk_assets_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assets" ADD CONSTRAINT "risk_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_controls" ADD CONSTRAINT "risk_controls_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_controls" ADD CONSTRAINT "risk_controls_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scenarios" ADD CONSTRAINT "risk_scenarios_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scenarios" ADD CONSTRAINT "risk_scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scenario_templates" ADD CONSTRAINT "risk_scenario_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scenario_templates" ADD CONSTRAINT "risk_scenario_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_history" ADD CONSTRAINT "risk_history_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_history" ADD CONSTRAINT "risk_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_workflow_tasks" ADD CONSTRAINT "risk_workflow_tasks_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_workflow_tasks" ADD CONSTRAINT "risk_workflow_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_workflow_tasks" ADD CONSTRAINT "risk_workflow_tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_workflow_tasks" ADD CONSTRAINT "risk_workflow_tasks_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_configurations" ADD CONSTRAINT "risk_configurations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tprm_configurations" ADD CONSTRAINT "tprm_configurations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_templates" ADD CONSTRAINT "answer_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_templates" ADD CONSTRAINT "answer_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_configurations" ADD CONSTRAINT "trust_configurations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessments" ADD CONSTRAINT "vendor_assessments_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessments" ADD CONSTRAINT "vendor_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessment_evidence" ADD CONSTRAINT "vendor_assessment_evidence_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "vendor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessment_evidence" ADD CONSTRAINT "vendor_assessment_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contracts" ADD CONSTRAINT "vendor_contracts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_risk_findings" ADD CONSTRAINT "vendor_risk_findings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_risk_findings" ADD CONSTRAINT "vendor_risk_findings_discovered_by_fkey" FOREIGN KEY ("discovered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_reviews" ADD CONSTRAINT "vendor_access_reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_reviews" ADD CONSTRAINT "vendor_access_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_reviews" ADD CONSTRAINT "vendor_access_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_requests" ADD CONSTRAINT "questionnaire_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_requests" ADD CONSTRAINT "questionnaire_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaire_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_base_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questionnaire_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attachments" ADD CONSTRAINT "question_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_entries" ADD CONSTRAINT "knowledge_base_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_controls" ADD CONSTRAINT "knowledge_base_controls_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_controls" ADD CONSTRAINT "knowledge_base_controls_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_evidence" ADD CONSTRAINT "knowledge_base_evidence_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_evidence" ADD CONSTRAINT "knowledge_base_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_policies" ADD CONSTRAINT "knowledge_base_policies_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_base_policies" ADD CONSTRAINT "knowledge_base_policies_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_attachments" ADD CONSTRAINT "knowledge_attachments_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_attachments" ADD CONSTRAINT "knowledge_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_center_content" ADD CONSTRAINT "trust_center_content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "audit_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_requests" ADD CONSTRAINT "audit_requests_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_requests" ADD CONSTRAINT "audit_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_requests" ADD CONSTRAINT "audit_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_requests" ADD CONSTRAINT "audit_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "audit_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_evidence" ADD CONSTRAINT "audit_evidence_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_identified_by_fkey" FOREIGN KEY ("identified_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_results" ADD CONSTRAINT "audit_test_results_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_results" ADD CONSTRAINT "audit_test_results_tested_by_fkey" FOREIGN KEY ("tested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_results" ADD CONSTRAINT "audit_test_results_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_meetings" ADD CONSTRAINT "audit_meetings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_meetings" ADD CONSTRAINT "audit_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_activities" ADD CONSTRAINT "audit_activities_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_request_comments" ADD CONSTRAINT "audit_request_comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "audit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_portal_users" ADD CONSTRAINT "audit_portal_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_portal_users" ADD CONSTRAINT "audit_portal_users_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_portal_access_logs" ADD CONSTRAINT "audit_portal_access_logs_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "audit_portal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_systems" ADD CONSTRAINT "vendor_access_systems_vendor_access_review_id_fkey" FOREIGN KEY ("vendor_access_review_id") REFERENCES "vendor_access_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_systems" ADD CONSTRAINT "vendor_access_systems_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_evidence" ADD CONSTRAINT "audit_test_evidence_audit_test_result_id_fkey" FOREIGN KEY ("audit_test_result_id") REFERENCES "audit_test_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_evidence" ADD CONSTRAINT "audit_test_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tags" ADD CONSTRAINT "control_tags_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tags" ADD CONSTRAINT "control_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_tags" ADD CONSTRAINT "evidence_tags_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_tags" ADD CONSTRAINT "evidence_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_tags" ADD CONSTRAINT "policy_tags_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_tags" ADD CONSTRAINT "policy_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_tags" ADD CONSTRAINT "risk_tags_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_tags" ADD CONSTRAINT "risk_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_tags" ADD CONSTRAINT "vendor_tags_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_tags" ADD CONSTRAINT "vendor_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_certifications" ADD CONSTRAINT "vendor_certifications_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_meeting_internal_attendees" ADD CONSTRAINT "audit_meeting_internal_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "audit_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_meeting_external_attendees" ADD CONSTRAINT "audit_meeting_external_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "audit_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_meeting_attachments" ADD CONSTRAINT "audit_meeting_attachments_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "audit_meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key_scopes" ADD CONSTRAINT "api_key_scopes_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_assessment_conditions" ADD CONSTRAINT "vendor_assessment_conditions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "vendor_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_access_data_categories" ADD CONSTRAINT "vendor_access_data_categories_access_review_id_fkey" FOREIGN KEY ("access_review_id") REFERENCES "vendor_access_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correlated_employees" ADD CONSTRAINT "correlated_employees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correlated_employees" ADD CONSTRAINT "correlated_employees_source_integration_id_fkey" FOREIGN KEY ("source_integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_background_checks" ADD CONSTRAINT "employee_background_checks_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_background_checks" ADD CONSTRAINT "employee_background_checks_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_training_records" ADD CONSTRAINT "employee_training_records_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_training_records" ADD CONSTRAINT "employee_training_records_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_asset_assignments" ADD CONSTRAINT "employee_asset_assignments_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_asset_assignments" ADD CONSTRAINT "employee_asset_assignments_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_asset_assignments" ADD CONSTRAINT "employee_asset_assignments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_access_records" ADD CONSTRAINT "employee_access_records_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_access_records" ADD CONSTRAINT "employee_access_records_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_security_scores" ADD CONSTRAINT "employee_security_scores_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_security_scores" ADD CONSTRAINT "employee_security_scores_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attestations" ADD CONSTRAINT "employee_attestations_correlated_employee_id_fkey" FOREIGN KEY ("correlated_employee_id") REFERENCES "correlated_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attestations" ADD CONSTRAINT "employee_attestations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_data_sources" ADD CONSTRAINT "dashboard_data_sources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_data_sources" ADD CONSTRAINT "dashboard_data_sources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_reports" ADD CONSTRAINT "custom_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_report_executions" ADD CONSTRAINT "scheduled_report_executions_scheduled_report_id_fkey" FOREIGN KEY ("scheduled_report_id") REFERENCES "scheduled_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_assignments" ADD CONSTRAINT "training_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_campaigns" ADD CONSTRAINT "training_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_campaigns" ADD CONSTRAINT "training_campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_training_modules" ADD CONSTRAINT "custom_training_modules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_training_modules" ADD CONSTRAINT "custom_training_modules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_file_versions" ADD CONSTRAINT "config_file_versions_config_file_id_fkey" FOREIGN KEY ("config_file_id") REFERENCES "config_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_file_versions" ADD CONSTRAINT "config_file_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_resource_states" ADD CONSTRAINT "config_resource_states_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_resource_states" ADD CONSTRAINT "config_resource_states_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_resource_states" ADD CONSTRAINT "config_resource_states_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_history" ADD CONSTRAINT "config_apply_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_history" ADD CONSTRAINT "config_apply_history_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_history" ADD CONSTRAINT "config_apply_history_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_locks" ADD CONSTRAINT "config_apply_locks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_locks" ADD CONSTRAINT "config_apply_locks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_apply_locks" ADD CONSTRAINT "config_apply_locks_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_templates" ADD CONSTRAINT "audit_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_workpapers" ADD CONSTRAINT "audit_workpapers_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_workpapers" ADD CONSTRAINT "audit_workpapers_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_workpapers" ADD CONSTRAINT "audit_workpapers_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_workpapers" ADD CONSTRAINT "audit_workpapers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workpaper_history" ADD CONSTRAINT "workpaper_history_workpaper_id_fkey" FOREIGN KEY ("workpaper_id") REFERENCES "audit_workpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workpaper_history" ADD CONSTRAINT "workpaper_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_plans" ADD CONSTRAINT "remediation_plans_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "audit_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_plans" ADD CONSTRAINT "remediation_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_milestones" ADD CONSTRAINT "remediation_milestones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "remediation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_milestones" ADD CONSTRAINT "remediation_milestones_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_procedures" ADD CONSTRAINT "audit_test_procedures_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_procedures" ADD CONSTRAINT "audit_test_procedures_tested_by_fkey" FOREIGN KEY ("tested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_test_procedures" ADD CONSTRAINT "audit_test_procedures_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_plan_entries" ADD CONSTRAINT "audit_plan_entries_linked_audit_id_fkey" FOREIGN KEY ("linked_audit_id") REFERENCES "audits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_plan_entries" ADD CONSTRAINT "audit_plan_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scim_external_ids" ADD CONSTRAINT "scim_external_ids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scim_group_external_ids" ADD CONSTRAINT "scim_group_external_ids_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_connections" ADD CONSTRAINT "jira_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_project_mappings" ADD CONSTRAINT "jira_project_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "jira_connections"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jira_issue_links" ADD CONSTRAINT "jira_issue_links_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "jira_project_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicenow_connections" ADD CONSTRAINT "servicenow_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicenow_table_mappings" ADD CONSTRAINT "servicenow_table_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "servicenow_connections"("organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicenow_record_links" ADD CONSTRAINT "servicenow_record_links_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "servicenow_table_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_hierarchies" ADD CONSTRAINT "permission_group_hierarchies_parent_group_id_fkey" FOREIGN KEY ("parent_group_id") REFERENCES "permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_hierarchies" ADD CONSTRAINT "permission_group_hierarchies_child_group_id_fkey" FOREIGN KEY ("child_group_id") REFERENCES "permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_department_scopes" ADD CONSTRAINT "permission_group_department_scopes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "permission_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group_department_scopes" ADD CONSTRAINT "permission_group_department_scopes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "job_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "job_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bcdr_recovery_team_members" ADD CONSTRAINT "bcdr_recovery_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "bcdr_recovery_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bcdr_recovery_team_plan_links" ADD CONSTRAINT "bcdr_recovery_team_plan_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "bcdr_recovery_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bcdr_incident_timeline" ADD CONSTRAINT "bcdr_incident_timeline_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "bcdr_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
