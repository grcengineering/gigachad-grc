# Playwright E2E Tests

This suite runs against the dev `docker compose` stack and uses the
`VITE_ENABLE_DEV_AUTH` bypass to skip the Keycloak login flow.

## Prerequisites

- Docker Desktop running.
- The dev stack up:
  ```bash
  docker compose up -d
  docker compose ps      # all services Up; healthy where applicable
  ```
- The frontend reachable at `http://127.0.0.1:3000`.
  Override with `E2E_BASE_URL=http://other.host` if needed.

If this is your first time, install the browser binaries:

```bash
cd frontend
npx playwright install chromium
```

## Run

```bash
cd frontend
npm run test:e2e               # headless, all specs
npm run test:e2e:headed        # watch the browser
npm run test:e2e:ui            # Playwright inspector (interactive)
npm run test:e2e:report        # open the HTML report from the last run

# Run a single spec:
npx playwright test e2e/smoke.spec.ts
```

The HTML report is written to `playwright-report/`. Failing-test traces,
screenshots, and videos land in `test-results/`. Both directories are
git-ignored.

## How auth works

`auth.setup.ts` runs as a `setup` project before any other spec. It:

1. Calls the `controls` service `/api/seed/load-demo` endpoint to make
   sure the database has at least the seed fixtures (idempotent — skips
   if data is already present).
2. Pre-seeds `localStorage` with the seeded "John Doe" admin user
   (`grc-dev-auth`, `gigachad-grc-onboarding-completed`). `AuthContext`
   reads `grc-dev-auth` on startup and restores the session.
3. Persists the resulting browser state to `playwright/.auth/user.json`,
   which every test loads via `storageState`.

Result: each test starts already authenticated, with the onboarding
tour dismissed, and with data in the DB. No Keycloak round-trip.

## How to add a new spec

```ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-feature');
    await page.waitForLoadState('networkidle');
  });

  test('does the thing', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
```

Conventions:

- Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors.
  They survive Tailwind class changes better.
- Use `page.waitForLoadState('networkidle')` after navigation. The
  app is a SPA so the initial HTML is empty.
- Real interactions only — don't fake clicks via `dispatchEvent`.
- If you need to interact with the sidebar, expand its accordion
  section first:
  ```ts
  const sidebar = page.locator('nav').first();
  await sidebar.getByRole('button', { name: 'Compliance' }).click();
  await sidebar.getByRole('link', { name: 'Controls' }).click();
  ```

## Targeting a remote stack

```bash
E2E_BASE_URL=https://staging.example.com npx playwright test
```

The seed step in `auth.setup.ts` assumes the controls service is at
`http://127.0.0.1:3001`. For remote stacks you may need to disable
seeding (skip via env var) or seed out-of-band.

## Known fragile areas

The suite has ~230 passing specs and ~24 known failures, mostly:

- Selectors that assert specific table/list structures on pages that
  switched to card grids.
- Routes the tests assume (e.g., `/settings/users`) that have been
  refactored elsewhere (`/people/users`).
- Modal/dialog assertions that need updating for component changes.

These are tracked individually; the harness itself (auth, seed,
fixture wiring) is solid.
