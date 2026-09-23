-- Durable operational state for workflows, sessions, retention, exports, and MCP.

ALTER TABLE "webhook_deliveries"
  ADD COLUMN "duration_ms" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "approval_workflows"
  ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE "approval_requests"
  ADD COLUMN "context" JSONB,
  ADD COLUMN "step_approvals" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "expires_at" TIMESTAMP(3);

ALTER TABLE "export_jobs"
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "file_content" BYTEA;

ALTER TABLE "scheduled_report_executions"
  ADD COLUMN "delivered_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "file_content" BYTEA;

ALTER TABLE "custom_field_definitions"
  ADD COLUMN "created_by" TEXT,
  ADD COLUMN "entity_type" TEXT NOT NULL DEFAULT 'control';

UPDATE "custom_field_definitions"
SET "entity_type" = COALESCE("entity_types"[1], 'control');

DROP INDEX "custom_field_definitions_organization_id_name_key";
CREATE UNIQUE INDEX "custom_field_definitions_organization_id_entity_type_name_key"
  ON "custom_field_definitions"("organization_id", "entity_type", "name");

ALTER TABLE "custom_field_values"
  ADD COLUMN "created_by" TEXT;

ALTER TABLE "retention_policies"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN "next_run_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT;

UPDATE "retention_policies"
SET "name" = initcap(replace("entity_type", '_', ' '))
WHERE "name" IS NULL;

ALTER TABLE "retention_policies"
  ALTER COLUMN "name" SET NOT NULL;

CREATE INDEX "retention_policies_organization_id_status_next_run_at_idx"
  ON "retention_policies"("organization_id", "status", "next_run_at");

CREATE TABLE "retention_runs" (
  "id" TEXT NOT NULL,
  "policy_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "dry_run" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'running',
  "records_found" INTEGER NOT NULL DEFAULT 0,
  "records_processed" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "retention_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "retention_runs_policy_id_fkey"
    FOREIGN KEY ("policy_id") REFERENCES "retention_policies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "retention_runs_organization_id_started_at_idx"
  ON "retention_runs"("organization_id", "started_at");
CREATE INDEX "retention_runs_policy_id_started_at_idx"
  ON "retention_runs"("policy_id", "started_at");

CREATE TABLE "user_sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "device_info" TEXT NOT NULL,
  "browser" TEXT NOT NULL DEFAULT 'Unknown',
  "os" TEXT NOT NULL DEFAULT 'Unknown',
  "ip_address" TEXT NOT NULL,
  "user_agent" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "invalidated_at" TIMESTAMP(3),
  "invalid_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_sessions_organization_id_user_id_is_active_idx"
  ON "user_sessions"("organization_id", "user_id", "is_active");
CREATE INDEX "user_sessions_is_active_expires_at_idx"
  ON "user_sessions"("is_active", "expires_at");

CREATE TABLE "session_settings" (
  "organization_id" TEXT NOT NULL,
  "session_timeout_minutes" INTEGER NOT NULL DEFAULT 480,
  "max_concurrent_sessions" INTEGER NOT NULL DEFAULT 5,
  "enforce_single_session" BOOLEAN NOT NULL DEFAULT false,
  "require_reauth_for_sensitive_actions" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "session_settings_pkey" PRIMARY KEY ("organization_id")
);

CREATE TABLE "login_attempts" (
  "id" TEXT NOT NULL,
  "identifier_hash" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_until" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_attempts_identifier_hash_ip_address_key"
  ON "login_attempts"("identifier_hash", "ip_address");
CREATE INDEX "login_attempts_identifier_locked_until_idx"
  ON "login_attempts"("identifier", "locked_until");
CREATE INDEX "login_attempts_last_attempt_at_idx"
  ON "login_attempts"("last_attempt_at");

CREATE TABLE "mcp_workflow_definitions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "trigger" JSONB NOT NULL,
  "steps" JSONB NOT NULL,
  "variables" JSONB,
  "timeout_ms" INTEGER,
  "is_built_in" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mcp_workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mcp_workflow_definitions_organization_id_name_idx"
  ON "mcp_workflow_definitions"("organization_id", "name");

CREATE TABLE "mcp_workflow_executions" (
  "id" TEXT NOT NULL,
  "workflow_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "requested_by" TEXT,
  "status" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "input" JSONB,
  "variables" JSONB,
  "output" JSONB,
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "mcp_workflow_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mcp_workflow_executions_workflow_id_fkey"
    FOREIGN KEY ("workflow_id") REFERENCES "mcp_workflow_definitions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "mcp_workflow_executions_organization_id_started_at_idx"
  ON "mcp_workflow_executions"("organization_id", "started_at");
CREATE INDEX "mcp_workflow_executions_workflow_id_status_idx"
  ON "mcp_workflow_executions"("workflow_id", "status");

CREATE TABLE "mcp_credentials" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "server_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "server_name" TEXT NOT NULL,
  "encrypted_env" TEXT NOT NULL,
  "configured_integrations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mcp_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_credentials_organization_id_server_id_key"
  ON "mcp_credentials"("organization_id", "server_id");
CREATE INDEX "mcp_credentials_organization_id_created_at_idx"
  ON "mcp_credentials"("organization_id", "created_at");
