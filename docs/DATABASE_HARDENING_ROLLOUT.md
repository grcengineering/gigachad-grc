# Database Hardening Rollout

This release replaces production `prisma db push` startup synchronization with
a committed Prisma baseline and forward-only migration deployment. It also
installs tenant-aware foreign keys, a least-privilege application role, and
fail-closed PostgreSQL row-level security (RLS).

The BC/DR migration remains the existing, separately applied
`database/init/12-bcdr-module.sql`; this rollout does not duplicate it.

## Connections and roles

- `MIGRATION_DATABASE_URL` is the table owner/admin connection. Use it only for
  migrations, backup/restore, repair, and constraint validation.
- `DATABASE_URL` remains the runtime connection.
- `gigachad_app` is a `NOLOGIN`, non-superuser, `NOBYPASSRLS` group role with
  DML-only access. Create a separate login and grant it this role only after
  every request path sets transaction-local tenant context.

Never give the runtime login table ownership, superuser, or `BYPASSRLS`.

## Staged production rollout

1. Back up production and restore that backup to staging.
2. Schedule a maintenance window. The composite parent indexes are expected to
   be small relative to child tables but can briefly block writes while they
   are created. Apply the committed migrations with the owner connection:

   ```bash
   export MIGRATION_DATABASE_URL='postgresql://owner:.../gigachad'
   DATABASE_URL="$MIGRATION_DATABASE_URL" ./deploy/prisma-migrate-safe.sh
   ```

   A fresh database receives the full baseline and hardening migration. A
   complete database created by the former `db push` startup path is
   fingerprinted and marked with the baseline before forward migrations run.
   A partial or unknown schema is rejected rather than modified.

3. Audit legacy tenant relations:

   ```bash
   MIGRATION_DATABASE_URL='postgresql://owner:.../gigachad' \
     ./scripts/rollout-database-hardening.sh audit
   ```

4. Review the reported rows, take a second backup, then explicitly repair
   confirmed tenant mismatches:

   ```bash
   MIGRATION_DATABASE_URL='postgresql://owner:.../gigachad' \
     ./scripts/rollout-database-hardening.sh backfill
   ```

   The repair is recorded in
   `app_security.tenant_integrity_repair_log`. Workspace mismatches are changed
   to the supported org-wide state by clearing `workspace_id`; other confirmed
   children inherit the existing parent's tenant. Missing-parent rows are
   logged as `manual_parent_repair_required` and are never deleted or guessed.

5. Resolve every logged missing-parent row, rerun `audit`, then validate:

   ```bash
   MIGRATION_DATABASE_URL='postgresql://owner:.../gigachad' \
     ./scripts/rollout-database-hardening.sh validate
   ```

   The `NOT VALID` foreign keys protect all new writes as soon as the migration
   lands. Validation is the final legacy-data scan and must complete before
   runtime credential cutover.

6. In application work outside this database-only change, wrap every
   tenant-scoped Prisma operation in a transaction and set context first:

   ```sql
   SELECT app_security.set_local_organization_id('authenticated-org-id');
   ```

   The setting is transaction-local and automatically clears at commit or
   rollback. Do not use a session-level setting with a connection pool.

7. After all request, worker, scheduled-job, seed, and health-check paths have
   transaction context, create the runtime login as the database owner:

   ```sql
   CREATE ROLE gigachad_runtime
     LOGIN PASSWORD 'secret-from-the-secret-manager'
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
     IN ROLE gigachad_app;
   ```

   Point runtime `DATABASE_URL` at `gigachad_runtime`, keep
   `MIGRATION_DATABASE_URL` on the owner, deploy one service at a time, and
   verify missing-context denials in logs. Roll back the credential change—not
   the migration—if an unconverted path is found.

## RLS behavior

The migration enables RLS on `organizations` and every current public table
with an `organization_id` column. `gigachad_app` can read and write only the
transaction tenant. Tables with nullable tenant IDs may expose global catalog
rows for reads, but the application role cannot create global rows. Missing
context returns no tenant rows and rejects writes.

Existing startup and local development continue to use the table owner and are
not blocked by RLS. This compatibility bridge is intentional; production
hardening is complete only after the runtime login cutover in step 7.

## Deferred relations

Composite tenant foreign keys are limited to relations where both sides
already carry `organization_id`. The following require schema/application
changes and are deferred:

- `workspace_members`: no tenant column; both the user and workspace tenant
  must be represented before a composite constraint can enforce membership.
- Risk descendants and links (`risk_assessments`, `risk_treatments`,
  `risk_assets`, `risk_controls`, `risk_scenarios`, `risk_history`): only the
  parent or link endpoints carry tenant identity.
- Framework, policy, evidence, questionnaire, knowledge-base, vendor, and audit
  descendants/junctions without `organization_id` (for example policy
  versions, questionnaire questions, vendor contacts, audit portal users, and
  evidence/control links).
- Polymorphic `entity_type`/`entity_id` links: PostgreSQL cannot express a
  single foreign key to multiple possible parent tables.
- BC/DR-owned tables in the `bcdr` schema: they are managed by the already
  merged BC/DR migration and need a coordinated follow-up in that migration
  stream rather than duplicate DDL here.

These rows are reachable only through tenant-protected parents, but direct SQL
access to them still relies on application authorization until they receive an
org-bearing schema or parent-derived RLS policy.
