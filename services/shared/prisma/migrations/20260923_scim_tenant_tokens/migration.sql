-- SCIM bearer tokens are stored as SHA-256 hashes and resolve directly to a
-- real organization UUID. Before applying this migration, replace any legacy
-- plaintext bearer_token values with their lowercase SHA-256 hex digest.

CREATE UNIQUE INDEX IF NOT EXISTS "scim_provider_configs_bearer_token_key"
  ON "scim_provider_configs"("bearer_token");

CREATE INDEX IF NOT EXISTS "scim_provider_configs_enabled_idx"
  ON "scim_provider_configs"("enabled");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scim_provider_configs_organization_id_fkey'
      AND conrelid = 'scim_provider_configs'::regclass
  ) THEN
    ALTER TABLE "scim_provider_configs"
      ADD CONSTRAINT "scim_provider_configs_organization_id_fkey"
      FOREIGN KEY ("organization_id")
      REFERENCES "organizations"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;
