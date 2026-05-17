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
   if data is already present). The seed also populates Org B and its
   admin user; see [services/shared/src/seed/seed-constants.ts](../../services/shared/src/seed/seed-constants.ts).
2. Pre-seeds `localStorage` for each fixture user and persists the
   resulting browser state to one file per identity. `AuthContext`
   reads `grc-dev-auth` on startup and restores the session.

Result: each test starts already authenticated, with the onboarding
tour dismissed, and with data in the DB. No Keycloak round-trip.

### Multi-user fixtures

`auth.setup.ts` produces **six** storage-state files; tests select one
via the Playwright `storageState` option (configured per project in
`playwright.config.ts`):

| File                              | User                  | Role                 | Org   |
|----------------------------------|-----------------------|----------------------|-------|
| `playwright/.auth/user.json`     | John Doe (legacy)     | admin                | A     |
| `playwright/.auth/adminA.json`   | Admin A               | admin                | A     |
| `playwright/.auth/complianceA.json` | Compliance Manager A | compliance_manager  | A     |
| `playwright/.auth/auditorA.json` | Auditor A             | auditor              | A     |
| `playwright/.auth/viewerA.json`  | Viewer A              | viewer               | A     |
| `playwright/.auth/adminB.json`   | Admin B               | admin                | B (Acme) |

`user.json` is preserved so the existing single-user suite (~253 specs)
continues to run unchanged.

`tenant-isolation.spec.ts` runs once per role/tenant project against the
matching `storageState`. `rbac.spec.ts` is project-agnostic — it builds
its own `request` contexts per role using the `x-dev-user-id` header
override (see below) and skips the per-project re-run via a
`test.skip(project !== 'chromium')` gate.

### Switching identity per request (`x-dev-user-id`)

`DevAuthGuard` honors an `x-dev-user-id` header **only in dev/test
environments**. The value is looked up in a hardcoded fixture table
([services/shared/src/auth/dev-auth.guard.ts](../../services/shared/src/auth/dev-auth.guard.ts))
mapping seeded UUIDs to their role + organization. This lets a single
spec exercise multiple identities without juggling storage states.
Admins receive the full dev permission set; non-admin roles receive an
empty permissions list so `PermissionGuard` enforces the role matrix.

Sample usage:

```ts
const adminBContext = await request.newContext({
  extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_B_ADMIN_ID },
});
const res = await adminBContext.get(`/api/controls/${orgAControlId}`);
expect(res.status()).toBe(404); // no existence disclosure
```

The frontend never sets this header; it originates only from test
fixtures, and the guard refuses to run in production.

## Multi-tenant and RBAC specs

Two specs are required CI gates (see `e2e-tenant-rbac` job in
`.github/workflows/pr-validation.yml`):

- [`tenant-isolation.spec.ts`](tenant-isolation.spec.ts) — 44 tests
  across 10 resource types. As `adminA`, attempts `GET`/`PUT`/`DELETE`
  against Org B records → expects **404** (we intentionally do not
  return 403 because that leaks existence). Cross-tenant `POST` with a
  body-supplied `organizationId` is rejected or silently scoped to the
  caller's org.
- [`rbac.spec.ts`](rbac.spec.ts) — 50 tests covering the role × action
  matrix against `controls`, `evidence`, `frameworks`, `policies`,
  `integrations`. Mirrors the matrix in `frontend/src/contexts/AuthContext.tsx`
  and [docs/PERMISSIONS_MATRIX.md](../../docs/PERMISSIONS_MATRIX.md).

If you add a new resource type or a new mutation route, extend both
specs to cover it.

A forthcoming `mapping-flow.spec.ts` will cover the control ↔
requirement mapping round-trip (create from both sides, edit, delete,
history drawer). It depends on the multi-user storage states added in
#308 and will land in PR-A Phase 3 once #308 merges.

## Accessibility and visual regression (report-only)

Two additional specs run in the `e2e-quality-checks` CI job. The job
is marked `continue-on-error: true` and is **not** in the `status`
rollup, so its failures don't block merge while baselines stabilize.

- [`a11y.spec.ts`](a11y.spec.ts) uses
  [`@axe-core/playwright`](https://playwright.dev/docs/accessibility-testing)
  via the shared helper in [`_a11y.ts`](_a11y.ts). It walks each
  primary route and reports WCAG A/AA violations. Tag tests with
  `@a11y` if you want to select only this suite locally.
- [`visual.spec.ts`](visual.spec.ts) snapshots ~8 high-signal pages
  using `expect(page).toHaveScreenshot()`. Baselines live in
  [`__snapshots__/visual.spec.ts/`](__snapshots__/) and are committed
  to the repo. Tag tests with `@visual`.

### Refreshing visual baselines

When a deliberate UI change lands, regenerate the baselines:

```bash
cd frontend
npx playwright test e2e/visual.spec.ts --update-snapshots
git add e2e/__snapshots__/
```

Commit the new PNGs alongside the UI change so the visual diff stays
green on the next CI run. Avoid running `--update-snapshots` blindly
on flake — investigate the diff in the CI artifact first.

### Selecting one suite locally

```bash
npx playwright test --grep @a11y      # accessibility only
npx playwright test --grep @visual    # visual regression only
npx playwright test e2e/tenant-isolation.spec.ts
npx playwright test e2e/rbac.spec.ts
```

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
