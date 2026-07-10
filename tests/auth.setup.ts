import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authDir = path.join(__dirname, '.auth');
const authFile = path.join(authDir, 'user.json');

/**
 * One-time auth setup: uses the dev-login bypass to populate localStorage,
 * then saves the browser storage state for all subsequent tests to reuse.
 * Mirrors `devLogin` in AuthContext.tsx.
 */
setup('authenticate via devLogin', async ({ page, context }) => {
  fs.mkdirSync(authDir, { recursive: true });

  const devUser = {
    id: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'admin',
    organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
  };

  // Inject localStorage BEFORE any page script runs.
  await context.addInitScript((user) => {
    localStorage.setItem('grc-dev-auth', JSON.stringify(user));
    localStorage.setItem('userId', user.id);
    localStorage.setItem('organizationId', user.organizationId);
  }, devUser);

  // In CI we run a production build; use an explicit local-only flag to allow
  // AuthContext to restore the seeded dev session without Keycloak redirects.
  await page.goto('/dashboard?devAuth=1');

  // AuthContext should pick up the dev-auth on init and skip Keycloak entirely.
  await expect(page).toHaveURL(/\/dashboard(\?|$)/, { timeout: 10_000 });

  // Sidebar should render with user name (proves the AuthContext loaded the user).
  await expect(page.getByText('John Doe').first()).toBeVisible({ timeout: 8_000 });

  await context.storageState({ path: authFile });
});
