-- =============================================================================
-- BC/DR (Business Continuity / Disaster Recovery) Module Schema
-- =============================================================================
-- This migration creates the complete BC/DR module including:
-- - Business Process management with BIA
-- - BC/DR Plan management with versioning
-- - DR Testing and Results tracking
-- - Runbooks for recovery procedures
-- - Communication Plans for emergency contacts
-- - Integration with existing Assets, Risks, and Controls
-- =============================================================================

-- Create BCDR schema
CREATE SCHEMA IF NOT EXISTS bcdr;

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Business process criticality tiers
DO $$ BEGIN
    CREATE TYPE bcdr.criticality_tier AS ENUM (
        'tier_1_critical',      -- Mission critical, immediate recovery required
        'tier_2_essential',     -- Essential, recovery within hours
        'tier_3_important',     -- Important, recovery within days
        'tier_4_standard'       -- Standard, recovery within weeks
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Impact severity levels
DO $$ BEGIN
    CREATE TYPE bcdr.impact_level AS ENUM (
        'catastrophic',
        'severe',
        'major',
        'moderate',
        'minor',
        'negligible'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- BC/DR Plan types
DO $$ BEGIN
    CREATE TYPE bcdr.plan_type AS ENUM (
        'business_continuity',
        'disaster_recovery',
        'incident_response',
        'crisis_communication',
        'pandemic_response',
        'it_recovery',
        'data_backup',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- BC/DR Plan status
DO $$ BEGIN
    CREATE TYPE bcdr.plan_status AS ENUM (
        'draft',
        'in_review',
        'approved',
        'published',
        'archived',
        'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DR Test types
DO $$ BEGIN
    CREATE TYPE bcdr.test_type AS ENUM (
        'tabletop',           -- Discussion-based walkthrough
        'walkthrough',        -- Step-by-step review with participants
        'simulation',         -- Simulated scenario without actual failover
        'parallel',           -- Systems brought up in parallel
        'full_interruption'   -- Complete failover test
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DR Test status
DO $$ BEGIN
    CREATE TYPE bcdr.test_status AS ENUM (
        'planned',
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'postponed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DR Test result
DO $$ BEGIN
    CREATE TYPE bcdr.test_result AS ENUM (
        'passed',
        'passed_with_issues',
        'failed',
        'incomplete'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Runbook status
DO $$ BEGIN
    CREATE TYPE bcdr.runbook_status AS ENUM (
        'draft',
        'approved',
        'published',
        'needs_review',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Contact type
DO $$ BEGIN
    CREATE TYPE bcdr.contact_type AS ENUM (
        'internal',
        'vendor',
        'customer',
        'regulatory',
        'emergency_services',
        'media',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- BUSINESS PROCESSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.business_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- Basic Info
    process_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Criticality
    criticality_tier bcdr.criticality_tier NOT NULL DEFAULT 'tier_3_important',
    business_criticality_score INTEGER CHECK (business_criticality_score >= 0 AND business_criticality_score <= 100),
    
    -- Recovery Objectives
    rto_hours INTEGER,  -- Recovery Time Objective in hours
    rpo_hours INTEGER,  -- Recovery Point Objective in hours
    mtpd_hours INTEGER, -- Maximum Tolerable Period of Disruption in hours
    
    -- Impact Assessment
    financial_impact bcdr.impact_level,
    operational_impact bcdr.impact_level,
    reputational_impact bcdr.impact_level,
    regulatory_impact bcdr.impact_level,
    
    -- Financial Estimates
    hourly_revenue_impact DECIMAL(15, 2),
    daily_revenue_impact DECIMAL(15, 2),
    recovery_cost_estimate DECIMAL(15, 2),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE,
    review_frequency_months INTEGER DEFAULT 12,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    peak_periods TEXT[] DEFAULT '{}',
    key_stakeholders TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by TEXT REFERENCES public.users(id),
    
    CONSTRAINT unique_process_id_per_org UNIQUE (organization_id, process_id)
);

-- =============================================================================
-- PROCESS DEPENDENCIES TABLE (for dependency mapping)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.process_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- The process that depends on another
    dependent_process_id UUID NOT NULL REFERENCES bcdr.business_processes(id) ON DELETE CASCADE,
    -- The process being depended upon
    dependency_process_id UUID NOT NULL REFERENCES bcdr.business_processes(id) ON DELETE CASCADE,
    
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'required', -- required, optional, preferred
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT no_self_dependency CHECK (dependent_process_id != dependency_process_id),
    CONSTRAINT unique_dependency UNIQUE (dependent_process_id, dependency_process_id)
);

-- =============================================================================
-- PROCESS ASSETS JUNCTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.process_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES bcdr.business_processes(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'supports', -- supports, critical_for, backup_for
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    
    CONSTRAINT unique_process_asset UNIQUE (process_id, asset_id)
);

-- =============================================================================
-- BC/DR PLANS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.bcdr_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- Basic Info
    plan_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type bcdr.plan_type NOT NULL,
    status bcdr.plan_status NOT NULL DEFAULT 'draft',
    
    -- Version Info
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    version_notes TEXT,
    
    -- Ownership
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    approver_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Document Storage
    filename VARCHAR(255),
    storage_path TEXT,
    mime_type VARCHAR(100),
    file_size INTEGER,
    
    -- Dates
    effective_date DATE,
    expiry_date DATE,
    approved_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE,
    review_frequency_months INTEGER DEFAULT 12,
    
    -- Scope
    scope_description TEXT,
    in_scope_processes UUID[] DEFAULT '{}', -- Array of process IDs
    out_of_scope TEXT,
    
    -- Activation
    activation_criteria TEXT,
    activation_authority TEXT,
    deactivation_criteria TEXT,
    objectives TEXT,
    assumptions TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by TEXT REFERENCES public.users(id),
    
    CONSTRAINT unique_plan_id_per_org UNIQUE (organization_id, plan_id)
);

-- =============================================================================
-- BC/DR PLAN VERSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES bcdr.bcdr_plans(id) ON DELETE CASCADE,
    
    version VARCHAR(20) NOT NULL,
    version_notes TEXT,
    
    filename VARCHAR(255),
    storage_path TEXT,
    file_size INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id)
);

-- =============================================================================
-- PLAN CONTROLS JUNCTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.plan_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES bcdr.bcdr_plans(id) ON DELETE CASCADE,
    control_id TEXT NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
    
    mapping_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    
    CONSTRAINT unique_plan_control UNIQUE (plan_id, control_id)
);

-- =============================================================================
-- RECOVERY STRATEGIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.recovery_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50), -- hot_site, warm_site, cold_site, cloud, manual, etc.
    
    -- Linked Process
    process_id UUID REFERENCES bcdr.business_processes(id) ON DELETE SET NULL,
    
    -- Recovery Details
    recovery_location TEXT,
    recovery_procedure TEXT,
    estimated_recovery_time_hours INTEGER,
    estimated_cost DECIMAL(15, 2),
    
    -- Resources Required
    required_personnel TEXT,
    required_equipment TEXT,
    required_data TEXT,
    
    -- Vendor Info
    vendor_name VARCHAR(255),
    vendor_contact TEXT,
    contract_reference VARCHAR(100),
    
    -- Status
    is_tested BOOLEAN DEFAULT false,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_result bcdr.test_result,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- DR TESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.dr_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE SET NULL,
    
    -- Basic Info
    test_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type bcdr.test_type NOT NULL,
    status bcdr.test_status NOT NULL DEFAULT 'planned',
    
    -- Linked Entities
    plan_id UUID REFERENCES bcdr.bcdr_plans(id) ON DELETE SET NULL,
    process_ids UUID[] DEFAULT '{}',
    
    -- Scheduling
    scheduled_date DATE,
    scheduled_start_time TIME,
    scheduled_duration_hours INTEGER,
    actual_start_at TIMESTAMP WITH TIME ZONE,
    actual_end_at TIMESTAMP WITH TIME ZONE,
    
    -- Ownership
    coordinator_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Objectives
    test_objectives TEXT,
    success_criteria TEXT,
    
    -- Scope
    scope_description TEXT,
    systems_in_scope TEXT[],
    
    -- Participants
    participant_ids TEXT[] DEFAULT '{}',
    external_participants TEXT,
    
    -- Results (populated after test)
    result bcdr.test_result,
    actual_recovery_time_minutes INTEGER,
    data_loss_minutes INTEGER,
    
    -- Summary
    executive_summary TEXT,
    lessons_learned TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_test_id_per_org UNIQUE (organization_id, test_id)
);

-- =============================================================================
-- DR TEST RESULTS / FINDINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.dr_test_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES bcdr.dr_tests(id) ON DELETE CASCADE,
    
    -- Finding Details
    finding_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
    category VARCHAR(50), -- process, technology, communication, documentation, etc.
    
    -- Affected Areas
    affected_process_id UUID REFERENCES bcdr.business_processes(id) ON DELETE SET NULL,
    affected_system TEXT,
    
    -- Remediation
    remediation_required BOOLEAN DEFAULT true,
    remediation_plan TEXT,
    remediation_owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    remediation_due_date DATE,
    remediation_status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, accepted
    remediation_completed_at TIMESTAMP WITH TIME ZONE,
    remediation_notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id)
);

-- =============================================================================
-- RUNBOOKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    runbook_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status bcdr.runbook_status NOT NULL DEFAULT 'draft',
    
    -- Categorization
    category VARCHAR(50), -- system_recovery, data_restore, failover, communication, etc.
    system_name VARCHAR(100),
    
    -- Linked Entities
    process_id UUID REFERENCES bcdr.business_processes(id) ON DELETE SET NULL,
    recovery_strategy_id UUID REFERENCES bcdr.recovery_strategies(id) ON DELETE SET NULL,
    
    -- Content
    content TEXT, -- Markdown content for the runbook
    
    -- Document Storage (if uploaded as file)
    filename VARCHAR(255),
    storage_path TEXT,
    mime_type VARCHAR(100),
    
    -- Version
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    
    -- Ownership
    owner_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Review
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT REFERENCES public.users(id),
    
    -- Execution Info
    estimated_duration_minutes INTEGER,
    required_access_level VARCHAR(50),
    prerequisites TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_runbook_id_per_org UNIQUE (organization_id, runbook_id)
);

-- =============================================================================
-- RUNBOOK STEPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.runbook_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runbook_id UUID NOT NULL REFERENCES bcdr.runbooks(id) ON DELETE CASCADE,
    
    step_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    
    -- Execution Details
    estimated_duration_minutes INTEGER,
    requires_approval BOOLEAN DEFAULT false,
    approval_role VARCHAR(50),
    
    -- Verification
    verification_steps TEXT,
    rollback_steps TEXT,
    
    -- Warnings/Notes
    warnings TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_step_per_runbook UNIQUE (runbook_id, step_number)
);

-- =============================================================================
-- COMMUNICATION PLANS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.communication_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'emergency', -- emergency, crisis, incident, stakeholder
    
    -- Linked Plan
    bcdr_plan_id UUID REFERENCES bcdr.bcdr_plans(id) ON DELETE SET NULL,
    
    -- Activation
    activation_triggers TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    next_review_due TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    updated_by TEXT REFERENCES public.users(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- COMMUNICATION CONTACTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.communication_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    communication_plan_id UUID NOT NULL REFERENCES bcdr.communication_plans(id) ON DELETE CASCADE,
    
    -- Contact Info
    name VARCHAR(255) NOT NULL,
    title VARCHAR(100),
    organization_name VARCHAR(255),
    contact_type bcdr.contact_type NOT NULL DEFAULT 'internal',
    
    -- Contact Details
    primary_phone VARCHAR(50),
    secondary_phone VARCHAR(50),
    email VARCHAR(255),
    alternate_email VARCHAR(255),
    
    -- Location
    location TEXT,
    time_zone VARCHAR(50),
    
    -- Role in Plan
    role_in_plan VARCHAR(100),
    responsibilities TEXT,
    
    -- Escalation
    escalation_level INTEGER DEFAULT 1, -- 1 = first contact, 2 = escalation, etc.
    escalation_wait_minutes INTEGER DEFAULT 30,
    
    -- Availability
    availability_hours TEXT, -- e.g., "24/7" or "M-F 9-5 EST"
    notes TEXT,
    
    -- Ordering
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id)
);

-- =============================================================================
-- BIA RISKS JUNCTION TABLE (link BIA to existing risks)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bcdr.bia_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES bcdr.business_processes(id) ON DELETE CASCADE,
    risk_id TEXT NOT NULL REFERENCES public.risks(id) ON DELETE CASCADE,
    
    relationship_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by TEXT REFERENCES public.users(id),
    
    CONSTRAINT unique_bia_risk UNIQUE (process_id, risk_id)
);

-- =============================================================================
-- EXISTING INSTALL COMPATIBILITY
-- =============================================================================

-- Older releases created tenant and public-entity references as UUIDs against
-- legacy shared/controls schemas. Current Prisma models live in public and use
-- text IDs. Convert only those external references; BC/DR-owned IDs stay UUID.
DO $$
DECLARE
    target RECORD;
    fk RECORD;
    relation REGCLASS;
    column_number SMALLINT;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('business_processes', 'organization_id', 'text'),
            ('business_processes', 'workspace_id', 'text'),
            ('business_processes', 'owner_id', 'text'),
            ('business_processes', 'created_by', 'text'),
            ('business_processes', 'updated_by', 'text'),
            ('business_processes', 'deleted_by', 'text'),
            ('process_dependencies', 'organization_id', 'text'),
            ('process_assets', 'asset_id', 'text'),
            ('process_assets', 'created_by', 'text'),
            ('bcdr_plans', 'organization_id', 'text'),
            ('bcdr_plans', 'workspace_id', 'text'),
            ('bcdr_plans', 'owner_id', 'text'),
            ('bcdr_plans', 'approver_id', 'text'),
            ('bcdr_plans', 'created_by', 'text'),
            ('bcdr_plans', 'updated_by', 'text'),
            ('bcdr_plans', 'deleted_by', 'text'),
            ('plan_versions', 'created_by', 'text'),
            ('plan_controls', 'control_id', 'text'),
            ('plan_controls', 'created_by', 'text'),
            ('recovery_strategies', 'organization_id', 'text'),
            ('recovery_strategies', 'created_by', 'text'),
            ('recovery_strategies', 'updated_by', 'text'),
            ('dr_tests', 'organization_id', 'text'),
            ('dr_tests', 'workspace_id', 'text'),
            ('dr_tests', 'coordinator_id', 'text'),
            ('dr_tests', 'participant_ids', 'text[]'),
            ('dr_tests', 'created_by', 'text'),
            ('dr_tests', 'updated_by', 'text'),
            ('dr_test_findings', 'remediation_owner_id', 'text'),
            ('dr_test_findings', 'created_by', 'text'),
            ('runbooks', 'organization_id', 'text'),
            ('runbooks', 'owner_id', 'text'),
            ('runbooks', 'reviewed_by', 'text'),
            ('runbooks', 'created_by', 'text'),
            ('runbooks', 'updated_by', 'text'),
            ('communication_plans', 'organization_id', 'text'),
            ('communication_plans', 'created_by', 'text'),
            ('communication_plans', 'updated_by', 'text'),
            ('communication_contacts', 'created_by', 'text'),
            ('bia_risks', 'risk_id', 'text'),
            ('bia_risks', 'created_by', 'text')
        ) AS columns(table_name, column_name, target_type)
    LOOP
        relation := to_regclass(format('bcdr.%I', target.table_name));
        IF relation IS NULL THEN
            CONTINUE;
        END IF;

        SELECT a.attnum
          INTO column_number
          FROM pg_attribute a
         WHERE a.attrelid = relation
           AND a.attname = target.column_name
           AND NOT a.attisdropped;

        IF column_number IS NULL THEN
            CONTINUE;
        END IF;

        IF (
            SELECT format_type(a.atttypid, a.atttypmod)
              FROM pg_attribute a
             WHERE a.attrelid = relation
               AND a.attnum = column_number
        ) <> target.target_type THEN
            FOR fk IN
                SELECT c.conname
                  FROM pg_constraint c
                 WHERE c.conrelid = relation
                   AND c.contype = 'f'
                   AND column_number = ANY(c.conkey)
            LOOP
                EXECUTE format(
                    'ALTER TABLE bcdr.%I DROP CONSTRAINT %I',
                    target.table_name,
                    fk.conname
                );
            END LOOP;

            IF target.table_name = 'dr_tests'
               AND target.column_name = 'participant_ids' THEN
                ALTER TABLE bcdr.dr_tests
                    ALTER COLUMN participant_ids DROP DEFAULT;
            END IF;

            EXECUTE format(
                'ALTER TABLE bcdr.%I ALTER COLUMN %I TYPE %s USING %I::%s',
                target.table_name,
                target.column_name,
                target.target_type,
                target.column_name,
                target.target_type
            );

            IF target.table_name = 'dr_tests'
               AND target.column_name = 'participant_ids' THEN
                ALTER TABLE bcdr.dr_tests
                    ALTER COLUMN participant_ids SET DEFAULT '{}';
            END IF;
        END IF;
    END LOOP;
END $$;

ALTER TABLE bcdr.business_processes
    ADD COLUMN IF NOT EXISTS peak_periods TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS key_stakeholders TEXT;

ALTER TABLE bcdr.bcdr_plans
    ADD COLUMN IF NOT EXISTS deactivation_criteria TEXT,
    ADD COLUMN IF NOT EXISTS objectives TEXT,
    ADD COLUMN IF NOT EXISTS assumptions TEXT;

-- New installs already have validated constraints from CREATE TABLE.
-- Constraints added to legacy installs are NOT VALID so historical orphans do
-- not block startup; PostgreSQL still enforces them for new writes.
DO $$
DECLARE
    target RECORD;
    existing_fk RECORD;
    relation REGCLASS;
    column_number SMALLINT;
    correct_fk_exists BOOLEAN;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('business_processes', 'organization_id', 'organizations', 'CASCADE'),
            ('business_processes', 'workspace_id', 'workspaces', 'SET NULL'),
            ('business_processes', 'owner_id', 'users', 'SET NULL'),
            ('business_processes', 'created_by', 'users', 'NO ACTION'),
            ('business_processes', 'updated_by', 'users', 'NO ACTION'),
            ('business_processes', 'deleted_by', 'users', 'NO ACTION'),
            ('process_dependencies', 'organization_id', 'organizations', 'CASCADE'),
            ('process_assets', 'asset_id', 'assets', 'CASCADE'),
            ('process_assets', 'created_by', 'users', 'NO ACTION'),
            ('bcdr_plans', 'organization_id', 'organizations', 'CASCADE'),
            ('bcdr_plans', 'workspace_id', 'workspaces', 'SET NULL'),
            ('bcdr_plans', 'owner_id', 'users', 'SET NULL'),
            ('bcdr_plans', 'approver_id', 'users', 'SET NULL'),
            ('bcdr_plans', 'created_by', 'users', 'NO ACTION'),
            ('bcdr_plans', 'updated_by', 'users', 'NO ACTION'),
            ('bcdr_plans', 'deleted_by', 'users', 'NO ACTION'),
            ('plan_versions', 'created_by', 'users', 'NO ACTION'),
            ('plan_controls', 'control_id', 'controls', 'CASCADE'),
            ('plan_controls', 'created_by', 'users', 'NO ACTION'),
            ('recovery_strategies', 'organization_id', 'organizations', 'CASCADE'),
            ('recovery_strategies', 'created_by', 'users', 'NO ACTION'),
            ('recovery_strategies', 'updated_by', 'users', 'NO ACTION'),
            ('dr_tests', 'organization_id', 'organizations', 'CASCADE'),
            ('dr_tests', 'workspace_id', 'workspaces', 'SET NULL'),
            ('dr_tests', 'coordinator_id', 'users', 'SET NULL'),
            ('dr_tests', 'created_by', 'users', 'NO ACTION'),
            ('dr_tests', 'updated_by', 'users', 'NO ACTION'),
            ('dr_test_findings', 'remediation_owner_id', 'users', 'SET NULL'),
            ('dr_test_findings', 'created_by', 'users', 'NO ACTION'),
            ('runbooks', 'organization_id', 'organizations', 'CASCADE'),
            ('runbooks', 'owner_id', 'users', 'SET NULL'),
            ('runbooks', 'reviewed_by', 'users', 'NO ACTION'),
            ('runbooks', 'created_by', 'users', 'NO ACTION'),
            ('runbooks', 'updated_by', 'users', 'NO ACTION'),
            ('communication_plans', 'organization_id', 'organizations', 'CASCADE'),
            ('communication_plans', 'created_by', 'users', 'NO ACTION'),
            ('communication_plans', 'updated_by', 'users', 'NO ACTION'),
            ('communication_contacts', 'created_by', 'users', 'NO ACTION'),
            ('bia_risks', 'risk_id', 'risks', 'CASCADE'),
            ('bia_risks', 'created_by', 'users', 'NO ACTION')
        ) AS foreign_keys(table_name, column_name, target_table, delete_action)
    LOOP
        relation := to_regclass(format('bcdr.%I', target.table_name));
        SELECT a.attnum
          INTO column_number
          FROM pg_attribute a
         WHERE a.attrelid = relation
           AND a.attname = target.column_name
           AND NOT a.attisdropped;

        correct_fk_exists := false;
        FOR existing_fk IN
            SELECT c.conname, target_ns.nspname, target_table.relname
              FROM pg_constraint c
              JOIN pg_class target_table ON target_table.oid = c.confrelid
              JOIN pg_namespace target_ns ON target_ns.oid = target_table.relnamespace
             WHERE c.conrelid = relation
               AND c.contype = 'f'
               AND c.conkey = ARRAY[column_number]::SMALLINT[]
        LOOP
            IF existing_fk.nspname = 'public'
               AND existing_fk.relname = target.target_table THEN
                correct_fk_exists := true;
            ELSE
                EXECUTE format(
                    'ALTER TABLE bcdr.%I DROP CONSTRAINT %I',
                    target.table_name,
                    existing_fk.conname
                );
            END IF;
        END LOOP;

        IF NOT correct_fk_exists THEN
            EXECUTE format(
                'ALTER TABLE bcdr.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s NOT VALID',
                target.table_name,
                format('bcdr_%s_%s_public_fkey', target.table_name, target.column_name),
                target.column_name,
                target.target_table,
                target.delete_action
            );
        END IF;
    END LOOP;
END $$;

-- Prisma owns these public Asset columns.
ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS rto_hours INTEGER,
    ADD COLUMN IF NOT EXISTS rpo_hours INTEGER,
    ADD COLUMN IF NOT EXISTS bcdr_criticality VARCHAR(50),
    ADD COLUMN IF NOT EXISTS recovery_strategy_id UUID,
    ADD COLUMN IF NOT EXISTS recovery_notes TEXT;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Business Processes
CREATE INDEX IF NOT EXISTS idx_business_processes_org ON bcdr.business_processes(organization_id);
CREATE INDEX IF NOT EXISTS idx_business_processes_criticality ON bcdr.business_processes(organization_id, criticality_tier);
CREATE INDEX IF NOT EXISTS idx_business_processes_owner ON bcdr.business_processes(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_processes_search ON bcdr.business_processes USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Process Dependencies
CREATE INDEX IF NOT EXISTS idx_process_dependencies_dependent ON bcdr.process_dependencies(dependent_process_id);
CREATE INDEX IF NOT EXISTS idx_process_dependencies_dependency ON bcdr.process_dependencies(dependency_process_id);

-- BC/DR Plans
CREATE INDEX IF NOT EXISTS idx_bcdr_plans_org ON bcdr.bcdr_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_bcdr_plans_status ON bcdr.bcdr_plans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_bcdr_plans_type ON bcdr.bcdr_plans(organization_id, plan_type);
CREATE INDEX IF NOT EXISTS idx_bcdr_plans_review_due ON bcdr.bcdr_plans(next_review_due) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_bcdr_plans_search ON bcdr.bcdr_plans USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- DR Tests
CREATE INDEX IF NOT EXISTS idx_dr_tests_org ON bcdr.dr_tests(organization_id);
CREATE INDEX IF NOT EXISTS idx_dr_tests_status ON bcdr.dr_tests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_dr_tests_scheduled ON bcdr.dr_tests(scheduled_date) WHERE status IN ('planned', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_dr_tests_plan ON bcdr.dr_tests(plan_id);

-- DR Test Findings
CREATE INDEX IF NOT EXISTS idx_dr_test_findings_test ON bcdr.dr_test_findings(test_id);
CREATE INDEX IF NOT EXISTS idx_dr_test_findings_status ON bcdr.dr_test_findings(remediation_status) WHERE remediation_required = true;

-- Runbooks
CREATE INDEX IF NOT EXISTS idx_runbooks_org ON bcdr.runbooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_runbooks_process ON bcdr.runbooks(process_id);
CREATE INDEX IF NOT EXISTS idx_runbooks_status ON bcdr.runbooks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_runbooks_search ON bcdr.runbooks USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Communication Plans
CREATE INDEX IF NOT EXISTS idx_communication_plans_org ON bcdr.communication_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_communication_contacts_plan ON bcdr.communication_contacts(communication_plan_id);
CREATE INDEX IF NOT EXISTS idx_communication_contacts_type ON bcdr.communication_contacts(communication_plan_id, contact_type);

-- Recovery Strategies
CREATE INDEX IF NOT EXISTS idx_recovery_strategies_org ON bcdr.recovery_strategies(organization_id);
CREATE INDEX IF NOT EXISTS idx_recovery_strategies_process ON bcdr.recovery_strategies(process_id);

-- =============================================================================
-- TRIGGERS FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION bcdr.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'business_processes', 'bcdr_plans', 'recovery_strategies', 
        'dr_tests', 'dr_test_findings', 'runbooks', 'runbook_steps',
        'communication_plans', 'communication_contacts'
    ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON bcdr.%s;
            CREATE TRIGGER update_%s_updated_at 
            BEFORE UPDATE ON bcdr.%s
            FOR EACH ROW EXECUTE FUNCTION bcdr.update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON SCHEMA bcdr IS 'Business Continuity and Disaster Recovery module';
COMMENT ON TABLE bcdr.business_processes IS 'Critical business processes for Business Impact Analysis';
COMMENT ON TABLE bcdr.process_dependencies IS 'Dependency mapping between business processes';
COMMENT ON TABLE bcdr.bcdr_plans IS 'Business Continuity and Disaster Recovery plans';
COMMENT ON TABLE bcdr.recovery_strategies IS 'Recovery strategies for business processes and systems';
COMMENT ON TABLE bcdr.dr_tests IS 'Disaster Recovery test schedule and results';
COMMENT ON TABLE bcdr.dr_test_findings IS 'Findings and remediation items from DR tests';
COMMENT ON TABLE bcdr.runbooks IS 'Step-by-step recovery procedures';
COMMENT ON TABLE bcdr.communication_plans IS 'Emergency communication plans and contact lists';

