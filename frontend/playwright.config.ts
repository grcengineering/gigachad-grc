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

/**
 * `testMatch` for the role/tenant-aware projects.
 *
 * Anything that targets a specific seeded user (adminA, complianceA,
 * auditorA, viewerA, adminB) belongs to the multi-user test set
 * and lives in `e2e/tenant-isolation.spec.ts` or `e2e/rbac.spec.ts`.
 * We intentionally do NOT run the broader 253-spec suite under each of
 * these projects — those specs were authored for the single default
 * admin user (user.json) and would cross-contaminate state if run as
 * other roles / orgs.
 */
// Only specs that actually need different storage states per project go
// here. tenant-isolation.spec.ts uses storageState (adminA browser
// session). rbac.spec.ts is project-agnostic — it builds its own
// request contexts per role with x-dev-user-id headers, so it stays
// under the legacy single-user project (and its in-spec
// `test.skip(project !== 'chromium')` gate keeps it from re-running
// per project anyway).
const MULTI_USER_TEST_MATCH = ['**/tenant-isolation.spec.ts'];

export default defineConfig({
  testDir: './e2e',
  // Visual regression baselines live under e2e/__snapshots__/<spec>/<name>.png
  // so they sit next to the specs that own them.
  snapshotDir: './e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
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
    // Setup project: runs auth.setup.ts which produces SIX storage state
    // files (user.json legacy + 5 role/tenant-specific files).
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Legacy single-user project — runs the full existing spec suite as
    // the default admin user. Storage state intentionally unchanged.
    // Excludes the new multi-user specs so they don't fan out under the
    // legacy project as well.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      testIgnore: MULTI_USER_TEST_MATCH,
      dependencies: ['setup'],
    },
    // Role/tenant-aware projects. Each one targets only the new
    // multi-user specs (tenant-isolation, rbac); they do NOT re-run the
    // single-user suite.
    {
      name: 'chromium-adminA',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/adminA.json',
      },
      testMatch: MULTI_USER_TEST_MATCH,
      dependencies: ['setup'],
    },
    {
      name: 'chromium-complianceA',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/complianceA.json',
      },
      testMatch: MULTI_USER_TEST_MATCH,
      dependencies: ['setup'],
    },
    {
      name: 'chromium-auditorA',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/auditorA.json',
      },
      testMatch: MULTI_USER_TEST_MATCH,
      dependencies: ['setup'],
    },
    {
      name: 'chromium-viewerA',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/viewerA.json',
      },
      testMatch: MULTI_USER_TEST_MATCH,
      dependencies: ['setup'],
    },
    {
      name: 'chromium-adminB',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/adminB.json',
      },
      testMatch: MULTI_USER_TEST_MATCH,
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
