import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for GigaChad GRC.
 *
 * Tests target the dev docker-compose stack by default
 * (frontend at http://127.0.0.1:3000). Bring it up before running:
 *
 *   docker compose up -d
 *   docker compose ps    # all services healthy / up
 *
 * Authentication uses the dev-login bypass — auth.setup.ts pre-seeds
 * localStorage with the seeded "John Doe" user, so tests can run
 * without Keycloak.
 *
 * Override the target via E2E_BASE_URL for a different stack (e.g.,
 * a CI ephemeral environment or a remote staging host).
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github' as const]] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    // The dev stack is HTTP; this is only set so https-based overrides
    // (a staging target on https://localhost) still work.
    ignoreHTTPSErrors: true,
  },
  projects: [
    // Setup project: runs auth.setup.ts to seed dev-login state.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  // Do NOT auto-start a vite dev server. The tests target the docker
  // stack; if you want to use the dev server instead, override
  // E2E_BASE_URL=http://localhost:5173 and start vite manually.
  webServer: undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
});




