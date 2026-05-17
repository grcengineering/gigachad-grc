-- Migration: Add ControlMappingHistory for mapping audit trail

CREATE TABLE IF NOT EXISTS "control_mapping_history" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mapping_id" TEXT REFERENCES "control_mappings"("id") ON DELETE SET NULL,
  "action"     TEXT NOT NULL,
  "snapshot"   JSONB NOT NULL,
  "changed_by" TEXT NOT NULL REFERENCES "users"("id"),
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason"     TEXT
);

CREATE INDEX IF NOT EXISTS "control_mapping_history_mapping_id_changed_at_idx"
  ON "control_mapping_history" ("mapping_id", "changed_at" DESC);
