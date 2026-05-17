import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';

// The spec uses `request.newContext()` directly with header-based auth, so it
// does not depend on browser storage state. The playwright config schedules
// it under multiple projects (chromium, chromium-adminA, ...) — to avoid
// running the same checks 6x (and hammering rate-limited list endpoints),
// short-circuit when we are not in the default `chromium` project.
test.beforeEach((_, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'rbac.spec is project-agnostic and only needs to run once',
  );
});

// We deliberately do NOT use `test.describe.configure({ mode: 'serial' })`:
// serial mode aborts every subsequent test in the describe after the first
// failure, which makes the report uninformative when a single product bug
// trips one test. Instead we let tests run in parallel and rely on the
// retry-aware getWithRetry/reqWithRetry helpers to absorb the dev rate
// limiter (HTTP 429).

/**
 * RBAC backend enforcement tests.
 *
 * For each of the four seeded Org A users (admin, compliance_manager, auditor,
 * viewer) we issue API requests directly against the backend services with the
 * `x-dev-user-id` header. The DevAuthGuard resolves that header to the seeded
 * user and the downstream RolesGuard / @Roles decorators enforce the matrix
 * defined in frontend/src/contexts/AuthContext.tsx (lines 349-368):
 *
 *   permission         | admin | compliance_manager | auditor | viewer
 *   -------------------+-------+--------------------+---------+-------
 *   controls:view      |   Y   |        Y           |    Y    |   Y
 *   controls:create    |   Y   |        Y           |    N    |   N
 *   controls:update    |   Y   |        Y           |    N    |   N
 *   evidence:view      |   Y   |        Y           |    Y    |   Y
 *   evidence:upload    |   Y   |        Y           |    N    |   N
 *   evidence:approve   |   Y   |        Y           |    N    |   N
 *   frameworks:view    |   Y   |        Y           |    Y    |   Y
 *   frameworks:manage  |   Y   |        Y           |    N    |   N
 *   policies:view      |   Y   |        Y           |    Y    |   Y
 *   policies:create    |   Y   |        Y           |    N    |   N
 *   policies:update    |   Y   |        Y           |    N    |   N
 *   policies:approve   |   Y   |        Y           |    N    |   N
 *   integrations:view  |   Y   |        Y           |    N    |   N
 *   integrations:manage|   Y   |        Y           |    N    |   N
 *
 * The frontend simply hides UI affordances; the test asserts the backend also
 * enforces. Tests are project-agnostic because they use the `request` fixture
 * directly with header-based auth — no browser or storage state required.
 *
 * Service ports (docker-compose.yml):
 *   - controls       3001  (api/controls, api/evidence, api/integrations)
 *   - frameworks     3002  (api/frameworks)
 *   - policies       3004  (api/policies)
 */

// ---------------------------------------------------------------------------
// Seed user IDs (mirror services/shared/src/seed/seed-constants.ts).
// Hardcoded here because the frontend package does not depend on the shared
// backend package.
// ---------------------------------------------------------------------------
const USER_IDS = {
  admin: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  compliance_manager: 'a1b2c3d4-0001-0000-0000-000000000001',
  auditor: 'a1b2c3d4-0002-0000-0000-000000000002',
  viewer: 'a1b2c3d4-0003-0000-0000-000000000003',
} as const;

type Role = keyof typeof USER_IDS;

const CONTROLS_URL = 'http://127.0.0.1:3001';
const FRAMEWORKS_URL = 'http://127.0.0.1:3002';
const POLICIES_URL = 'http://127.0.0.1:3004';

// ---------------------------------------------------------------------------
// Permission matrix — exactly mirrors AuthContext.tsx (lines 349-368).
// `true` means the role is granted the permission; the test then asserts the
// API returns a non-403 status for the corresponding action. `false` means the
// role is denied, and the test asserts a 403 (or other 4xx denial code).
// ---------------------------------------------------------------------------
const MATRIX: Record<Role, Record<string, boolean>> = {
  admin: {
    'controls:view': true,
    'controls:create': true,
    'controls:update': true,
    'evidence:view': true,
    'evidence:upload': true,
    'evidence:approve': true,
    'frameworks:view': true,
    'frameworks:manage': true,
    'policies:view': true,
    'policies:create': true,
    'policies:update': true,
    'policies:approve': true,
    'integrations:view': true,
    'integrations:manage': true,
  },
  compliance_manager: {
    'controls:view': true,
    'controls:create': true,
    'controls:update': true,
    'evidence:view': true,
    'evidence:upload': true,
    'evidence:approve': true,
    'frameworks:view': true,
    'frameworks:manage': true,
    'policies:view': true,
    'policies:create': true,
    'policies:update': true,
    'policies:approve': true,
    'integrations:view': true,
    'integrations:manage': true,
  },
  auditor: {
    'controls:view': true,
    'controls:create': false,
    'controls:update': false,
    'evidence:view': true,
    'evidence:upload': false,
    'evidence:approve': false,
    'frameworks:view': true,
    'frameworks:manage': false,
    'policies:view': true,
    'policies:create': false,
    'policies:update': false,
    'policies:approve': false,
    'integrations:view': false,
    'integrations:manage': false,
  },
  viewer: {
    'controls:view': true,
    'controls:create': false,
    'controls:update': false,
    'evidence:view': true,
    'evidence:upload': false,
    'evidence:approve': false,
    'frameworks:view': true,
    'frameworks:manage': false,
    'policies:view': true,
    'policies:create': false,
    'policies:update': false,
    'policies:approve': false,
    'integrations:view': false,
    'integrations:manage': false,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A request that the role-matrix says should succeed: assert status is not a
 * permission denial. We accept 200/201/204 plus 4xx codes that come from
 * validation/not-found AFTER the guards pass (400, 404, 409, 422). The only
 * statuses we reject are 401 and 403 — those signal the request was rejected
 * by auth/authz rather than by the handler. */
function expectAllowed(status: number, context: string) {
  expect(
    status,
    `[${context}] expected role to be authorized but got ${status} (401/403 = denied)`,
  ).not.toBe(401);
  expect(
    status,
    `[${context}] expected role to be authorized but got 403 Forbidden`,
  ).not.toBe(403);
  // sanity: server didn't blow up
  expect(status, `[${context}] server error ${status}`).toBeLessThan(500);
}

/** A request that the role-matrix says should be denied: 403 is the canonical
 * answer; 401 is accepted as "clearly denied" per the task spec. */
function expectDenied(status: number, context: string) {
  expect(
    [401, 403].includes(status),
    `[${context}] expected 401 or 403 (denial) but got ${status}`,
  ).toBe(true);
}

/** POST/PUT helper that retries on 429. */
async function reqWithRetry(
  ctx: APIRequestContext,
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  options?: Parameters<APIRequestContext['post']>[1],
  attempts = 5,
): Promise<import('@playwright/test').APIResponse> {
  let res: import('@playwright/test').APIResponse | undefined;
  for (let i = 0; i < attempts; i++) {
    res = await ctx[method](url, options);
    if (res.status() !== 429) return res;
    await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
  }
  return res!;
}

/**
 * Per-role API contexts, created once per worker. Each carries the
 * `x-dev-user-id` header for that role, so every request via that context is
 * authenticated as that user via DevAuthGuard.
 */
const roleContexts: Partial<Record<Role, APIRequestContext>> = {};

async function getRoleContext(role: Role): Promise<APIRequestContext> {
  if (!roleContexts[role]) {
    roleContexts[role] = await playwrightRequest.newContext({
      extraHTTPHeaders: {
        'x-dev-user-id': USER_IDS[role],
      },
    });
  }
  return roleContexts[role]!;
}

/** Fetch a control ID we can target with PUT/DELETE. We use the admin
 * context because the seed has 49 controls in Org A and `controls:view` is
 * granted to admin. */
let sampleControlId: string | undefined;

/** GET that retries on 429 — the controls service applies per-IP rate limits
 * and `fullyParallel: true` plus six projects can blow through the bucket.
 * Returns the first non-429 response or throws after `attempts` tries. */
async function getWithRetry(
  ctx: APIRequestContext,
  url: string,
  attempts = 5,
): Promise<import('@playwright/test').APIResponse> {
  let res: import('@playwright/test').APIResponse | undefined;
  for (let i = 0; i < attempts; i++) {
    res = await ctx.get(url);
    if (res.status() !== 429) return res;
    // Exponential-ish backoff (200ms, 400ms, 800ms, 1.6s, ...).
    await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
  }
  return res!;
}

test.beforeAll(async (_, testInfo) => {
  if (testInfo.project.name !== 'chromium') {
    // Other projects skip every test; don't bother hitting the API.
    return;
  }
  const admin = await getRoleContext('admin');

  // Force a call through to the seed service so the RBAC users
  // (compliance/auditor/viewer) are present even when demo data has already
  // been loaded. `ensureOrgARbacUsers` runs BEFORE the "already loaded"
  // conflict check, so the call is safe and idempotent — we expect 200
  // (first run) or 409 (subsequent runs). 429 is also OK (rate-limited; the
  // users were almost certainly seeded on a previous run anyway).
  const seedRes = await reqWithRetry(admin, 'post', `${CONTROLS_URL}/api/seed/load-demo`);
  expect(
    [200, 201, 409, 429].includes(seedRes.status()),
    `[rbac.spec] seed load-demo returned unexpected status ${seedRes.status()}; ` +
      `RBAC users may not be seeded`,
  ).toBe(true);

  const res = await getWithRetry(admin, `${CONTROLS_URL}/api/controls?limit=1`);
  if (!res.ok()) {
    throw new Error(
      `[rbac.spec] could not fetch a sample control as admin (status ${res.status()}); ` +
        `the spec needs at least one seeded control to exercise PUT/DELETE paths.`,
    );
  }
  const body = await res.json();
  // The list endpoint returns either { data: [...] } or [...] depending on shape.
  const items = Array.isArray(body) ? body : (body.data ?? body.items ?? body.controls ?? []);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('[rbac.spec] /api/controls returned no items; cannot run PUT tests');
  }
  sampleControlId = items[0].id;
  expect(sampleControlId, 'sampleControlId').toBeTruthy();
});

test.afterAll(async () => {
  for (const ctx of Object.values(roleContexts)) {
    await ctx?.dispose();
  }
});

// ---------------------------------------------------------------------------
// Per-role action runners. Each takes a role and runs the same set of probes,
// asserting allowed/denied per the MATRIX. Grouping by role lets us produce
// the four `test.describe` blocks the task asks for while keeping the body
// DRY.
// ---------------------------------------------------------------------------

function runRoleTests(role: Role) {
  test.describe(`RBAC — ${role}`, () => {
    // ---------- READS (all four roles should pass these) ----------

    test('GET /api/controls (controls:view)', async () => {
      const ctx = await getRoleContext(role);
      const res = await getWithRetry(ctx, `${CONTROLS_URL}/api/controls`);
      const ctxLabel = `${role} GET /api/controls`;
      if (MATRIX[role]['controls:view']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('GET /api/evidence (evidence:view)', async () => {
      const ctx = await getRoleContext(role);
      const res = await getWithRetry(ctx, `${CONTROLS_URL}/api/evidence`);
      const ctxLabel = `${role} GET /api/evidence`;
      if (MATRIX[role]['evidence:view']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('GET /api/frameworks (frameworks:view)', async () => {
      const ctx = await getRoleContext(role);
      const res = await getWithRetry(ctx, `${FRAMEWORKS_URL}/api/frameworks`);
      const ctxLabel = `${role} GET /api/frameworks`;
      if (MATRIX[role]['frameworks:view']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('GET /api/policies (policies:view)', async () => {
      const ctx = await getRoleContext(role);
      const res = await getWithRetry(ctx, `${POLICIES_URL}/api/policies`);
      const ctxLabel = `${role} GET /api/policies`;
      if (MATRIX[role]['policies:view']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('GET /api/integrations (integrations:view)', async () => {
      const ctx = await getRoleContext(role);
      const res = await getWithRetry(ctx, `${CONTROLS_URL}/api/integrations`);
      const ctxLabel = `${role} GET /api/integrations`;
      if (MATRIX[role]['integrations:view']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    // ---------- WRITES ----------

    test('POST /api/controls (controls:create)', async () => {
      const ctx = await getRoleContext(role);
      // A unique controlId per role keeps the admin/compliance success cases
      // from colliding across re-runs of the spec.
      const suffix = Date.now().toString(36) + '-' + role.slice(0, 3);
      const res = await reqWithRetry(ctx, 'post', `${CONTROLS_URL}/api/controls`, {
        data: {
          controlId: `RBAC-${suffix}`,
          title: `RBAC test control (${role})`,
          description: 'Created by rbac.spec.ts to verify backend permission enforcement.',
          category: 'access_control',
        },
      });
      const ctxLabel = `${role} POST /api/controls`;
      if (MATRIX[role]['controls:create']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('PUT /api/controls/:id (controls:update)', async () => {
      const ctx = await getRoleContext(role);
      expect(sampleControlId, 'sampleControlId from beforeAll').toBeTruthy();
      const res = await reqWithRetry(ctx, 'put', `${CONTROLS_URL}/api/controls/${sampleControlId}`, {
        data: { title: `RBAC update probe (${role})` },
      });
      const ctxLabel = `${role} PUT /api/controls/:id`;
      if (MATRIX[role]['controls:update']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('POST /api/evidence (evidence:upload)', async () => {
      const ctx = await getRoleContext(role);
      // Empty multipart — guards run BEFORE the FileInterceptor / pipes, so a
      // permission-denied response is what we look for. Admin/compliance will
      // hit a 400 (no file / missing metadata) but that's still "allowed" for
      // the purposes of this spec.
      const res = await reqWithRetry(ctx, 'post', `${CONTROLS_URL}/api/evidence`, {
        multipart: {
          title: `rbac-${role}`,
          description: 'rbac upload probe',
        },
      });
      const ctxLabel = `${role} POST /api/evidence`;
      if (MATRIX[role]['evidence:upload']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('POST /api/frameworks (frameworks:manage)', async () => {
      const ctx = await getRoleContext(role);
      const suffix = Date.now().toString(36) + '-' + role.slice(0, 3);
      const res = await reqWithRetry(ctx, 'post', `${FRAMEWORKS_URL}/api/frameworks`, {
        data: {
          // Minimal CreateFrameworkDto — exact shape doesn't matter for the
          // authorization check; the guard runs before validation.
          name: `RBAC framework (${role}) ${suffix}`,
          code: `RBAC-${suffix.toUpperCase()}`,
          version: '1.0',
          type: 'custom',
        },
      });
      const ctxLabel = `${role} POST /api/frameworks`;
      if (MATRIX[role]['frameworks:manage']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('POST /api/policies (policies:create)', async () => {
      const ctx = await getRoleContext(role);
      // Policy upload is multipart with a required file; the auth guard runs
      // first, so we still probe with a tiny payload.
      const res = await reqWithRetry(ctx, 'post', `${POLICIES_URL}/api/policies`, {
        multipart: {
          title: `rbac-${role}`,
          category: 'security',
          file: {
            name: 'rbac.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('rbac probe'),
          },
        },
      });
      const ctxLabel = `${role} POST /api/policies`;
      if (MATRIX[role]['policies:create']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('POST /api/integrations (integrations:manage)', async () => {
      const ctx = await getRoleContext(role);
      const res = await reqWithRetry(ctx, 'post', `${CONTROLS_URL}/api/integrations`, {
        data: {
          // Minimal CreateIntegrationDto. The guard runs before the pipe so
          // even if the shape is incomplete, a permission-denied user still
          // gets 403.
          name: `rbac-${role}`,
          type: 'custom',
        },
      });
      const ctxLabel = `${role} POST /api/integrations`;
      if (MATRIX[role]['integrations:manage']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });
  });
}

runRoleTests('viewer');
runRoleTests('auditor');
runRoleTests('compliance_manager');
runRoleTests('admin');
