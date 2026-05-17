import { test, expect } from '@playwright/test';

/**
 * Settings E2E tests.
 *
 * Routes (from `frontend/src/App.tsx`):
 *   /settings              -> redirects to /settings/organization
 *   /settings/organization
 *   /settings/communications
 *   /settings/api-keys
 *   /settings/modules
 *   /settings/notifications
 *   /settings/risk
 *   /settings/tprm
 *   /settings/trust
 *   /settings/dashboard-templates
 *   /settings/employee-compliance
 *   /settings/ai
 *   /settings/config-as-code
 *   /settings/mcp
 *   /settings/workspaces
 *   /settings/training
 *
 * User management lives at /people/users (not /settings/users), and
 * audit log lives at /audit-log. Those are covered by users.spec.ts
 * and audits.spec.ts respectively.
 */

test.describe('Settings - Main Page', () => {
  test('default /settings redirects to /settings/organization', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/settings\/organization$/);
  });

  test('organization section loads', async ({ page }) => {
    await page.goto('/settings/organization');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

const settingsSections = [
  { path: '/settings/organization', heading: /organization/i },
  { path: '/settings/communications', heading: /communication/i },
  { path: '/settings/api-keys', heading: /api.*key/i },
  { path: '/settings/modules', heading: /module/i },
  { path: '/settings/notifications', heading: /notification/i },
  { path: '/settings/risk', heading: /risk/i },
  { path: '/settings/tprm', heading: /tprm|vendor|third.party/i },
  { path: '/settings/trust', heading: /trust/i },
  { path: '/settings/employee-compliance', heading: /employee|compliance/i },
  { path: '/settings/ai', heading: /ai|artificial/i },
  { path: '/settings/workspaces', heading: /workspace/i },
];

test.describe('Settings - Section Navigation', () => {
  for (const { path, heading } of settingsSections) {
    test(`${path} loads with matching heading`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      // Any h1/h2/h3 with the section keyword. Some sections have nested
      // tabs that show their heading after a short delay; the expect
      // timeout (5s) handles that.
      await expect(page.locator('h1, h2, h3').filter({ hasText: heading }).first()).toBeVisible();
    });
  }
});

test.describe('Settings - API Keys', () => {
  test('API keys page shows create button', async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');
    const createBtn = page
      .locator('button')
      .filter({ hasText: /create.*key|generate.*key|new.*key/i });
    await expect(createBtn.first()).toBeVisible();
  });
});

test.describe('Settings - Notifications', () => {
  test('notifications page has form controls', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    // Notification preferences page renders toggles/checkboxes or selects.
    const controls = page.locator('input[type="checkbox"], input[role="switch"], select');
    expect(await controls.count()).toBeGreaterThan(0);
  });
});
