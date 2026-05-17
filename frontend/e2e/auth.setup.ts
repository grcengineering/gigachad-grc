import { test as setup, expect } from '@playwright/test';

/**
 * Authentication setup — runs once before all tests.
 *
 * Pre-seeds localStorage with the dev-login mock user. AuthContext reads
 * `grc-dev-auth`/`userId`/`organizationId` on init and restores the
 * authenticated state without a Keycloak round-trip.
 *
 * Requires the frontend to be built with VITE_ENABLE_DEV_AUTH=true
 * (which the dev docker-compose.yml sets by default).
 *
 * The IDs below match the seeded "John Doe" user + default organization
 * in the dev fixtures — see [services/shared/prisma/seed.ts] and
 * [frontend/src/contexts/AuthContext.tsx].
 *
 * This file produces SIX storage states:
 *   - `playwright/.auth/user.json`        — legacy single-user state used by the
 *                                            existing 253-test suite.
 *   - `playwright/.auth/adminA.json`      — Org A admin (same identity as user.json).
 *   - `playwright/.auth/complianceA.json` — Org A compliance_manager.
 *   - `playwright/.auth/auditorA.json`    — Org A auditor.
 *   - `playwright/.auth/viewerA.json`     — Org A viewer.
 *   - `playwright/.auth/adminB.json`      — Org B admin (cross-tenant fixture).
 *
 * The legacy `user.json` is preserved so existing specs continue to work.
 * New specs that need a specific role / org should select their project
 * (see playwright.config.ts).
 */

const SEED_ORG_A_ID = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
const SEED_ORG_B_ID = '7f2c0c41-1234-4be8-9c4d-fe9925c712aa';

interface DevUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

const LEGACY_USER: DevUser = {
  id: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  email: 'john.doe@example.com',
  name: 'John Doe',
  role: 'admin',
  organizationId: SEED_ORG_A_ID,
};

const ADMIN_A: DevUser = {
  id: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  email: 'admin@demo.local',
  name: 'Admin A',
  role: 'admin',
  organizationId: SEED_ORG_A_ID,
};

const COMPLIANCE_A: DevUser = {
  id: 'a1b2c3d4-0001-0000-0000-000000000001',
  email: 'compliance@demo.local',
  name: 'Compliance Manager A',
  role: 'compliance_manager',
  organizationId: SEED_ORG_A_ID,
};

const AUDITOR_A: DevUser = {
  id: 'a1b2c3d4-0002-0000-0000-000000000002',
  email: 'auditor@demo.local',
  name: 'Auditor A',
  role: 'auditor',
  organizationId: SEED_ORG_A_ID,
};

const VIEWER_A: DevUser = {
  id: 'a1b2c3d4-0003-0000-0000-000000000003',
  email: 'viewer@demo.local',
  name: 'Viewer A',
  role: 'viewer',
  organizationId: SEED_ORG_A_ID,
};

const ADMIN_B: DevUser = {
  id: 'b1b2c3d4-0001-0000-0000-000000000001',
  email: 'admin@acme.local',
  name: 'Admin B',
  role: 'admin',
  organizationId: SEED_ORG_B_ID,
};

/**
 * Seed the dev database with demo data via the controls service's
 * /api/seed/load-demo endpoint. Idempotent enough for repeat runs.
 * Many specs (Vendors list, Audits, Risks) assume there's at least
 * one row in each table.
 */
async function seedDemoDataIfNeeded(request: import('@playwright/test').APIRequestContext) {
  const SEED_URL = 'http://127.0.0.1:3001/api/seed/load-demo';
  try {
    // Check current count first; only seed if empty.
    const summary = await request.get('http://127.0.0.1:3001/api/seed/summary').catch(() => null);
    if (summary && summary.ok()) {
      const body = await summary.json();
      const total = body?.totalRecords ?? body?.controls ?? 0;
      if (total > 0) {
        return;
      }
    }
    await request.post(SEED_URL, {
      headers: {
        'x-user-id': ADMIN_A.id,
        'x-org-id': ADMIN_A.organizationId,
      },
      timeout: 60_000,
    });
  } catch (err) {
    console.warn('Seed step failed (continuing — tests may fail on empty DB):', err);
  }
}

/**
 * Sign in as `user` and persist the resulting localStorage / cookies to
 * `authFile`. Uses the dev-login bypass (localStorage seeding) — no real
 * Keycloak round-trip.
 */
async function seedAuthState(
  page: import('@playwright/test').Page,
  user: DevUser,
  authFile: string
): Promise<void> {
  // Visit a same-origin page so we have a document to set localStorage on.
  await page.goto('/');

  // Seed the dev-auth keys AuthContext looks for on startup. Also
  // pre-dismiss the onboarding tour ("Welcome to GigaChad GRC!" modal)
  // so its full-screen overlay does not intercept clicks in tests.
  await page.evaluate((u) => {
    localStorage.setItem('grc-dev-auth', JSON.stringify(u));
    localStorage.setItem('userId', u.id);
    localStorage.setItem('organizationId', u.organizationId);
    localStorage.setItem('gigachad-grc-onboarding-completed', 'true');
  }, user);

  // Reload so AuthContext picks up the seeded values.
  await page.goto('/dashboard');

  // The app should now be authenticated; we should NOT see the login page.
  await expect(page).not.toHaveURL(/\/login/);

  // Persist storage state so individual specs can `reuse` it.
  await page.context().storageState({ path: authFile });
}

setup('authenticate legacy default user', async ({ page, request }) => {
  // Seed first so spec preconditions hold for the broader test suite.
  await seedDemoDataIfNeeded(request);
  await seedAuthState(page, LEGACY_USER, 'playwright/.auth/user.json');
});

setup('authenticate adminA', async ({ page }) => {
  await seedAuthState(page, ADMIN_A, 'playwright/.auth/adminA.json');
});

setup('authenticate complianceA', async ({ page }) => {
  await seedAuthState(page, COMPLIANCE_A, 'playwright/.auth/complianceA.json');
});

setup('authenticate auditorA', async ({ page }) => {
  await seedAuthState(page, AUDITOR_A, 'playwright/.auth/auditorA.json');
});

setup('authenticate viewerA', async ({ page }) => {
  await seedAuthState(page, VIEWER_A, 'playwright/.auth/viewerA.json');
});

setup('authenticate adminB', async ({ page }) => {
  await seedAuthState(page, ADMIN_B, 'playwright/.auth/adminB.json');
});
