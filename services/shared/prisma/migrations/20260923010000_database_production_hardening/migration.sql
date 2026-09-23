-- Database production hardening
--
-- This migration deliberately separates installation from activation:
--   * tenant-aware constraints are installed NOT VALID, so legacy rows do not
--     block deployment while all new writes are protected immediately;
--   * RLS is enabled for the non-owner `gigachad_app` role, while the migration
--     owner used by existing development/startup flows continues to bypass RLS;
--   * a later credential cutover to a login granted `gigachad_app` is gated on
--     the application setting transaction-local tenant context.
--
-- Run scripts/rollout-database-hardening.sh before validating constraints or
-- moving production traffic to the non-superuser role.

-- ---------------------------------------------------------------------------
-- Least-privilege application role and transaction-local tenant context
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gigachad_app') THEN
    CREATE ROLE gigachad_app
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  ELSE
    ALTER ROLE gigachad_app
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC;
GRANT USAGE ON SCHEMA app_security TO gigachad_app;

CREATE OR REPLACE FUNCTION app_security.current_organization_id()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT NULLIF(current_setting('app.current_organization_id', true), '');
$$;

CREATE OR REPLACE FUNCTION app_security.set_local_organization_id(organization_id text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  IF organization_id IS NULL OR btrim(organization_id) = '' THEN
    RAISE EXCEPTION 'organization tenant context must be non-empty'
      USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.current_organization_id', organization_id, true);
  RETURN organization_id;
END;
$$;

REVOKE ALL ON FUNCTION app_security.current_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_security.set_local_organization_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_security.current_organization_id() TO gigachad_app;
GRANT EXECUTE ON FUNCTION app_security.set_local_organization_id(text) TO gigachad_app;

GRANT USAGE ON SCHEMA public TO gigachad_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gigachad_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gigachad_app;

-- Future Prisma migrations run as the database owner. Keep future objects
-- usable by the application role without granting DDL privileges to it.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gigachad_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gigachad_app;

-- ---------------------------------------------------------------------------
-- Cross-tenant parent/child integrity
-- ---------------------------------------------------------------------------
-- A unique (id, organization_id) index gives each composite foreign key a
-- tenant-aware target without changing Prisma's primary-key model.

CREATE UNIQUE INDEX workspaces_id_organization_id_tenant_key
  ON workspaces (id, organization_id);
CREATE UNIQUE INDEX evidence_folders_id_organization_id_tenant_key
  ON evidence_folders (id, organization_id);
CREATE UNIQUE INDEX risks_id_organization_id_tenant_key
  ON risks (id, organization_id);
CREATE UNIQUE INDEX vendors_id_organization_id_tenant_key
  ON vendors (id, organization_id);
CREATE UNIQUE INDEX audits_id_organization_id_tenant_key
  ON audits (id, organization_id);
CREATE UNIQUE INDEX audit_requests_id_organization_id_tenant_key
  ON audit_requests (id, organization_id);
CREATE UNIQUE INDEX audit_findings_id_organization_id_tenant_key
  ON audit_findings (id, organization_id);
CREATE UNIQUE INDEX approval_workflows_id_organization_id_tenant_key
  ON approval_workflows (id, organization_id);
CREATE UNIQUE INDEX jira_project_mappings_id_organization_id_tenant_key
  ON jira_project_mappings (id, organization_id);
CREATE UNIQUE INDEX servicenow_table_mappings_id_organization_id_tenant_key
  ON servicenow_table_mappings (id, organization_id);
CREATE UNIQUE INDEX departments_id_organization_id_tenant_key
  ON departments (id, organization_id);

-- Workspace-scoped records must reference a workspace in their own tenant.
ALTER TABLE control_implementations
  ADD CONSTRAINT control_implementations_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE evidence
  ADD CONSTRAINT evidence_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE frameworks
  ADD CONSTRAINT frameworks_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE assets
  ADD CONSTRAINT assets_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE risks
  ADD CONSTRAINT risks_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE vendors
  ADD CONSTRAINT vendors_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE audits
  ADD CONSTRAINT audits_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE config_files
  ADD CONSTRAINT config_files_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE config_resource_states
  ADD CONSTRAINT config_resource_states_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE config_apply_history
  ADD CONSTRAINT config_apply_history_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE config_apply_locks
  ADD CONSTRAINT config_apply_locks_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;
ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_workspace_tenant_fk
  FOREIGN KEY (workspace_id, organization_id)
  REFERENCES workspaces (id, organization_id) NOT VALID;

-- Confirmed org-bearing parent/child and hierarchy relations.
ALTER TABLE evidence_folders
  ADD CONSTRAINT evidence_folders_parent_tenant_fk
  FOREIGN KEY (parent_id, organization_id)
  REFERENCES evidence_folders (id, organization_id) NOT VALID;
ALTER TABLE risk_workflow_tasks
  ADD CONSTRAINT risk_workflow_tasks_risk_tenant_fk
  FOREIGN KEY (risk_id, organization_id)
  REFERENCES risks (id, organization_id) NOT VALID;

ALTER TABLE vendor_assessments
  ADD CONSTRAINT vendor_assessments_vendor_tenant_fk
  FOREIGN KEY (vendor_id, organization_id)
  REFERENCES vendors (id, organization_id) NOT VALID;
ALTER TABLE vendor_contracts
  ADD CONSTRAINT vendor_contracts_vendor_tenant_fk
  FOREIGN KEY (vendor_id, organization_id)
  REFERENCES vendors (id, organization_id) NOT VALID;
ALTER TABLE vendor_documents
  ADD CONSTRAINT vendor_documents_vendor_tenant_fk
  FOREIGN KEY (vendor_id, organization_id)
  REFERENCES vendors (id, organization_id) NOT VALID;
ALTER TABLE vendor_risk_findings
  ADD CONSTRAINT vendor_risk_findings_vendor_tenant_fk
  FOREIGN KEY (vendor_id, organization_id)
  REFERENCES vendors (id, organization_id) NOT VALID;
ALTER TABLE vendor_access_reviews
  ADD CONSTRAINT vendor_access_reviews_vendor_tenant_fk
  FOREIGN KEY (vendor_id, organization_id)
  REFERENCES vendors (id, organization_id) NOT VALID;

ALTER TABLE audit_requests
  ADD CONSTRAINT audit_requests_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_evidence
  ADD CONSTRAINT audit_evidence_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_findings
  ADD CONSTRAINT audit_findings_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_test_results
  ADD CONSTRAINT audit_test_results_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_meetings
  ADD CONSTRAINT audit_meetings_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_activities
  ADD CONSTRAINT audit_activities_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_workpapers
  ADD CONSTRAINT audit_workpapers_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_test_procedures
  ADD CONSTRAINT audit_test_procedures_audit_tenant_fk
  FOREIGN KEY (audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_plan_entries
  ADD CONSTRAINT audit_plan_entries_linked_audit_tenant_fk
  FOREIGN KEY (linked_audit_id, organization_id)
  REFERENCES audits (id, organization_id) NOT VALID;
ALTER TABLE audit_evidence
  ADD CONSTRAINT audit_evidence_request_tenant_fk
  FOREIGN KEY (request_id, organization_id)
  REFERENCES audit_requests (id, organization_id) NOT VALID;
ALTER TABLE remediation_plans
  ADD CONSTRAINT remediation_plans_finding_tenant_fk
  FOREIGN KEY (finding_id, organization_id)
  REFERENCES audit_findings (id, organization_id) NOT VALID;

ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_workflow_tenant_fk
  FOREIGN KEY (workflow_id, organization_id)
  REFERENCES approval_workflows (id, organization_id) NOT VALID;
ALTER TABLE jira_issue_links
  ADD CONSTRAINT jira_issue_links_mapping_tenant_fk
  FOREIGN KEY (mapping_id, organization_id)
  REFERENCES jira_project_mappings (id, organization_id) NOT VALID;
ALTER TABLE servicenow_record_links
  ADD CONSTRAINT servicenow_record_links_mapping_tenant_fk
  FOREIGN KEY (mapping_id, organization_id)
  REFERENCES servicenow_table_mappings (id, organization_id) NOT VALID;
ALTER TABLE departments
  ADD CONSTRAINT departments_parent_tenant_fk
  FOREIGN KEY (parent_id, organization_id)
  REFERENCES departments (id, organization_id) NOT VALID;

-- ---------------------------------------------------------------------------
-- Row-level tenant isolation
-- ---------------------------------------------------------------------------
-- Install fail-closed policies on every current public table with an
-- organization_id column. Nullable organization IDs represent global catalog
-- rows: application traffic may read them but may only write its current
-- tenant. Table owners and superusers remain available for migrations, local
-- development, repair, and background jobs until those paths can set context.

DO $$
DECLARE
  tenant_table record;
  read_expression text;
BEGIN
  FOR tenant_table IN
    SELECT c.table_name, c.is_nullable
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name
  LOOP
    IF tenant_table.is_nullable = 'YES' THEN
      read_expression :=
        '(organization_id IS NULL OR organization_id = app_security.current_organization_id())';
    ELSE
      read_expression :=
        '(organization_id = app_security.current_organization_id())';
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I TO gigachad_app ' ||
      'USING (%s) ' ||
      'WITH CHECK (organization_id = app_security.current_organization_id())',
      tenant_table.table_name,
      read_expression
    );
  END LOOP;
END
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organizations
  TO gigachad_app
  USING (id = app_security.current_organization_id())
  WITH CHECK (id = app_security.current_organization_id());
