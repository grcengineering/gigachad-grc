/**
 * Seed data constants for development & e2e testing.
 *
 * These fixed UUIDs are used by:
 *   - `services/controls/src/seed/seed.service.ts` when loading demo data
 *   - Playwright tests asserting tenant isolation and RBAC behavior
 *
 * The values intentionally line up with `DEV_USER` (see `./auth/dev-user.constants.ts`)
 * for Org A's admin so existing dev-auth flows continue to work.
 *
 * @remarks Only meaningful when NODE_ENV !== 'production'.
 */

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

/** Existing demo org (matches DEV_USER.organizationId). */
export const SEED_ORG_A_ID = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
export const SEED_ORG_A_SLUG = 'demo-org';
export const SEED_ORG_A_NAME = 'Demo Organization';

/** New isolated org used for cross-tenant tests. */
export const SEED_ORG_B_ID = '7f2c0c41-1234-4be8-9c4d-fe9925c712aa';
export const SEED_ORG_B_SLUG = 'acme-corp';
export const SEED_ORG_B_NAME = 'Acme Corp';

// ---------------------------------------------------------------------------
// Users — Org A (4 roles for RBAC tests)
// ---------------------------------------------------------------------------

/** Existing John Doe admin (matches DEV_USER.userId). */
export const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';
export const SEED_USER_A_ADMIN_EMAIL = 'admin@demo.local';

export const SEED_USER_A_COMPLIANCE_ID = 'a1b2c3d4-0001-0000-0000-000000000001';
export const SEED_USER_A_COMPLIANCE_EMAIL = 'compliance@demo.local';

export const SEED_USER_A_AUDITOR_ID = 'a1b2c3d4-0002-0000-0000-000000000002';
export const SEED_USER_A_AUDITOR_EMAIL = 'auditor@demo.local';

export const SEED_USER_A_VIEWER_ID = 'a1b2c3d4-0003-0000-0000-000000000003';
export const SEED_USER_A_VIEWER_EMAIL = 'viewer@demo.local';

// ---------------------------------------------------------------------------
// Users — Org B (admin only; tenant isolation target)
// ---------------------------------------------------------------------------

export const SEED_USER_B_ADMIN_ID = 'b1b2c3d4-0001-0000-0000-000000000001';
export const SEED_USER_B_ADMIN_EMAIL = 'admin@acme.local';

// ---------------------------------------------------------------------------
// Org B resource markers (used by Playwright to attempt cross-tenant fetches)
// ---------------------------------------------------------------------------

/** Stable control codes seeded into Org B. */
export const SEED_ORG_B_CONTROL_CODES = [
  'B-CTRL-001',
  'B-CTRL-002',
  'B-CTRL-003',
  'B-CTRL-004',
  'B-CTRL-005',
] as const;

/** Stable risk codes seeded into Org B. */
export const SEED_ORG_B_RISK_CODES = ['B-RISK-001', 'B-RISK-002', 'B-RISK-003'] as const;

/** Stable vendor codes seeded into Org B. */
export const SEED_ORG_B_VENDOR_CODES = ['B-VND-001', 'B-VND-002'] as const;
