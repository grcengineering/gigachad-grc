import { test, expect, request as playwrightRequest, APIRequestContext } from '@playwright/test';

// The spec uses `request.newContext()` directly with header-based auth, so it
// does not depend on browser storage state. The playwright config schedules
// it under multiple projects (chromium, chromium-adminA, ...) — to avoid
// running the same checks 6x (and hammering rate-limited list endpoints),
// short-circuit when we are not in the default `chromium` project.
test.beforeEach(({}, testInfo) => {
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
    // PR-A mapping mutations — admin + compliance_manager allowed.
    'mappings:create': true,
    'mappings:update': true,
    'mappings:delete': true,
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
    'mappings:create': true,
    'mappings:update': true,
    'mappings:delete': true,
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
    'mappings:create': false,
    'mappings:update': false,
    'mappings:delete': false,
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
    'mappings:create': false,
    'mappings:update': false,
    'mappings:delete': false,
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

/** Mapping fixtures shared across the four role descriptions. We discover
 * one framework + one non-category requirement + one control up-front, then
 * each role's POST attempt either succeeds (creating a new row whose id is
 * the role's `mappingsRowId`, used by the same role's PATCH+DELETE tests) or
 * gets denied (in which case the PATCH/DELETE tests fall back to a row that
 * admin pre-seeds — see `sharedMappingId`). */
let sampleFrameworkId: string | undefined;
let sampleRequirementId: string | undefined;
let sampleMappingControlId: string | undefined;
/** A pre-existing mapping row created as admin in beforeAll, used by
 * denied-role PATCH/DELETE probes so we hit the auth guard rather than
 * 404 on a missing row. */
let sharedMappingId: string | undefined;
/** A pool of additional control ids per role, used to keep their
 * `mappings:create` POSTs from colliding with each other on the
 * (frameworkId, requirementId, controlId) uniqueness constraint. */
const perRoleMappingControlId: Partial<Record<Role, string>> = {};

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

test.beforeAll(async ({}, testInfo) => {
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

  // ----- Discover a framework + requirement + control for mapping tests -----
  const fwRes = await getWithRetry(admin, `${FRAMEWORKS_URL}/api/frameworks`);
  if (fwRes.ok()) {
    const fwBody = await fwRes.json();
    const fws = Array.isArray(fwBody)
      ? fwBody
      : (fwBody.data ?? fwBody.items ?? fwBody.frameworks ?? []);
    for (const fw of fws) {
      const reqRes = await getWithRetry(
        admin,
        `${FRAMEWORKS_URL}/api/frameworks/${fw.id}/requirements`
      );
      if (!reqRes.ok()) continue;
      const reqBody = await reqRes.json();
      const reqs = Array.isArray(reqBody)
        ? reqBody
        : (reqBody.data ?? reqBody.items ?? reqBody.requirements ?? []);
      const req = reqs.find((r: any) => !r.isCategory);
      if (req) {
        sampleFrameworkId = fw.id;
        sampleRequirementId = req.id;
        break;
      }
    }
  }
  // The sample control was picked above; reuse it as the mapping target.
  sampleMappingControlId = sampleControlId;

  // Reserve one distinct control id per role for their `mappings:create`
  // attempt. The (framework, requirement, control) tuple is unique so
  // we cannot reuse the same control across all four POSTs.
  const controlPoolRes = await getWithRetry(admin, `${CONTROLS_URL}/api/controls?limit=10`);
  if (controlPoolRes.ok()) {
    const poolBody = await controlPoolRes.json();
    const pool = Array.isArray(poolBody)
      ? poolBody
      : (poolBody.data ?? poolBody.items ?? poolBody.controls ?? []);
    const roles: Role[] = ['admin', 'compliance_manager', 'auditor', 'viewer'];
    roles.forEach((r, idx) => {
      // Skip index 0 — that's reserved as the shared mapping target above.
      const ctrl = pool[idx + 1];
      if (ctrl) perRoleMappingControlId[r] = ctrl.id;
    });
  }

  if (sampleFrameworkId && sampleRequirementId && sampleMappingControlId) {
    // Pre-seed one mapping row that the denied-role PATCH/DELETE tests
    // can target without first having to create their own.
    const seedRes = await reqWithRetry(
      admin,
      'post',
      `${FRAMEWORKS_URL}/api/mappings`,
      {
        data: {
          frameworkId: sampleFrameworkId,
          requirementId: sampleRequirementId,
          controlId: sampleMappingControlId,
          mappingType: 'primary',
          notes: 'rbac.spec shared probe row',
        },
      }
    );
    if (seedRes.ok()) {
      const seeded = await seedRes.json();
      sharedMappingId = seeded?.id ?? seeded?.data?.id;
    } else if (seedRes.status() === 409) {
      // Already exists from a previous run — pick it up via by-control.
      const findRes = await getWithRetry(
        admin,
        `${FRAMEWORKS_URL}/api/mappings/by-control/${sampleMappingControlId}`
      );
      if (findRes.ok()) {
        const body = await findRes.json();
        const items = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
        const hit = items.find(
          (m: any) =>
            m.requirementId === sampleRequirementId &&
            m.frameworkId === sampleFrameworkId
        );
        sharedMappingId = hit?.id;
      }
    }
  }
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

    // ---------- MAPPINGS (PR-A) --------------------------------------
    // The mappings controller uses @Roles('admin','compliance_manager')
    // on POST / PATCH / DELETE. Auditor + viewer should hit 401/403
    // before any business logic.

    test('POST /api/mappings (mappings:create)', async () => {
      const ctx = await getRoleContext(role);
      // Guard runs before validation, so we can fire even when fixtures
      // are missing — denied roles still get 401/403. Allowed roles need
      // a real (framework, requirement, control) triple.
      const fwId = sampleFrameworkId;
      const reqId = sampleRequirementId;
      const ctrlId = perRoleMappingControlId[role] ?? sampleMappingControlId;
      expect(fwId, 'sampleFrameworkId from beforeAll').toBeTruthy();
      expect(reqId, 'sampleRequirementId from beforeAll').toBeTruthy();
      expect(ctrlId, `mapping control for role ${role}`).toBeTruthy();

      const res = await reqWithRetry(ctx, 'post', `${FRAMEWORKS_URL}/api/mappings`, {
        data: {
          frameworkId: fwId,
          requirementId: reqId,
          controlId: ctrlId,
          mappingType: 'supporting',
          notes: `rbac.spec ${role} probe`,
        },
      });
      const ctxLabel = `${role} POST /api/mappings`;
      if (MATRIX[role]['mappings:create']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('PATCH /api/mappings/:id (mappings:update)', async () => {
      const ctx = await getRoleContext(role);
      expect(sharedMappingId, 'sharedMappingId from beforeAll').toBeTruthy();
      const res = await reqWithRetry(
        ctx,
        'patch',
        `${FRAMEWORKS_URL}/api/mappings/${sharedMappingId}`,
        {
          data: { notes: `rbac.spec ${role} update probe` },
        }
      );
      const ctxLabel = `${role} PATCH /api/mappings/:id`;
      if (MATRIX[role]['mappings:update']) {
        expectAllowed(res.status(), ctxLabel);
      } else {
        expectDenied(res.status(), ctxLabel);
      }
    });

    test('DELETE /api/mappings/:id (mappings:delete)', async () => {
      // Only the auditor + viewer tests actually fire DELETE against
      // the shared row — they should be denied before the row is
      // touched. Admin / compliance_manager test against the row they
      // created in their own POST test (rolled into perRoleMappingControlId)
      // so we don't accidentally delete the shared row and break the
      // PATCH test that other roles still need to run against.
      const ctx = await getRoleContext(role);

      let targetId: string | undefined;
      if (MATRIX[role]['mappings:delete']) {
        // Allowed roles: discover or create a row tied to this role's
        // reserved control, then DELETE it. This keeps the shared row
        // alive for PATCH probes by other parallel tests.
        const ctrlId = perRoleMappingControlId[role];
        if (ctrlId) {
          const findRes = await getWithRetry(
            ctx,
            `${FRAMEWORKS_URL}/api/mappings/by-control/${ctrlId}`
          );
          if (findRes.ok()) {
            const body = await findRes.json();
            const items = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
            targetId = items[0]?.id;
          }
          if (!targetId) {
            // Create on the fly so we have a row to delete.
            const createRes = await reqWithRetry(
              ctx,
              'post',
              `${FRAMEWORKS_URL}/api/mappings`,
              {
                data: {
                  frameworkId: sampleFrameworkId,
                  requirementId: sampleRequirementId,
                  controlId: ctrlId,
                  mappingType: 'supporting',
                  notes: `rbac.spec ${role} delete-probe seed`,
                },
              }
            );
            if (createRes.ok()) {
              const created = await createRes.json();
              targetId = created?.id ?? created?.data?.id;
            } else if (createRes.status() === 409) {
              const refind = await getWithRetry(
                ctx,
                `${FRAMEWORKS_URL}/api/mappings/by-control/${ctrlId}`
              );
              const body = await refind.json();
              const items = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
              targetId = items[0]?.id;
            }
          }
        }
        expect(targetId, `${role} could not obtain a mapping row to DELETE`).toBeTruthy();
      } else {
        // Denied roles aim at the shared row — guard fires before any
        // DB read, so the row staying intact is the desired outcome.
        targetId = sharedMappingId;
        expect(targetId, 'sharedMappingId for denied-role probe').toBeTruthy();
      }

      const res = await reqWithRetry(
        ctx,
        'delete',
        `${FRAMEWORKS_URL}/api/mappings/${targetId}`
      );
      const ctxLabel = `${role} DELETE /api/mappings/:id`;
      if (MATRIX[role]['mappings:delete']) {
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
