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
 */
const authFile = 'playwright/.auth/user.json';

const DEV_USER = {
  id: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  email: 'john.doe@example.com',
  name: 'John Doe',
  role: 'admin',
  organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
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
        'x-user-id': '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
        'x-org-id': '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
      },
      timeout: 60_000,
    });
  } catch (err) {
    console.warn('Seed step failed (continuing — tests may fail on empty DB):', err);
  }
}

setup('authenticate via dev-login bypass', async ({ page, request }) => {
  // Seed first so spec preconditions hold.
  await seedDemoDataIfNeeded(request);

  // Visit a same-origin page so we have a document to set localStorage on.
  await page.goto('/');

  // Seed the dev-auth keys AuthContext looks for on startup. Also
  // pre-dismiss the onboarding tour ("Welcome to GigaChad GRC!" modal)
  // so its full-screen overlay does not intercept clicks in tests.
  await page.evaluate((user) => {
    localStorage.setItem('grc-dev-auth', JSON.stringify(user));
    localStorage.setItem('userId', user.id);
    localStorage.setItem('organizationId', user.organizationId);
    localStorage.setItem('gigachad-grc-onboarding-completed', 'true');
  }, DEV_USER);

  // Reload so AuthContext picks up the seeded values.
  await page.goto('/dashboard');

  // The app should now be authenticated; we should NOT see the login page.
  await expect(page).not.toHaveURL(/\/login/);

  // Persist storage state so individual specs can `reuse` it.
  await page.context().storageState({ path: authFile });
});
