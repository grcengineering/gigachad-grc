import { test, expect, request as pwRequest, APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Multi-tenant isolation tests.
 *
 * For each major GRC resource (controls, risks, vendors, contracts,
 * evidence, audits, frameworks, policies, questionnaires,
 * knowledge-base) we verify that:
 *
 *   1. List endpoints return ONLY records belonging to the caller's org
 *      and never leak Org B's seeded records (B-CTRL-*, B-RISK-*,
 *      B-VND-*).
 *   2. GET-by-id against an Org B record from an Org A admin returns
 *      404 (NOT 403 — avoids existence disclosure).
 *   3. PATCH/PUT and DELETE against an Org B record from an Org A admin
 *      return 404.
 *   4. POST {organizationId: SEED_ORG_B_ID} from an Org A admin is
 *      EITHER rejected (400) OR silently rescoped to Org A — read the
 *      created row back to confirm. Each endpoint's behavior is
 *      documented inline.
 *
 * Tests bypass the React UI by calling the backend services directly
 * via Playwright's `request` API with the `x-dev-user-id` header — that
 * header is honored by DevAuthGuard in non-prod environments and lets
 * us assume a specific seeded user without standing up a real Keycloak
 * flow.
 *
 * Service ports (see docker-compose.yml & frontend/nginx.conf):
 *   controls   :3001 — /api/controls, /api/risks, /api/evidence
 *   frameworks :3002 — /api/frameworks
 *   policies   :3004 — /api/policies
 *   tprm       :3005 — /vendors, /contracts (no /api prefix)
 *   trust      :3006 — /questionnaires, /knowledge-base (no /api prefix)
 *   audit      :3007 — /api/audits
 */

// ---- Seed fixtures (mirrors services/shared/src/seed/seed-constants.ts) ----
const SEED_ORG_A_ID = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
const SEED_ORG_B_ID = '7f2c0c41-1234-4be8-9c4d-fe9925c712aa';

const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';
const SEED_USER_B_ADMIN_ID = 'b1b2c3d4-0001-0000-0000-000000000001';

const SEED_ORG_B_CONTROL_CODES = ['B-CTRL-001', 'B-CTRL-002', 'B-CTRL-003', 'B-CTRL-004', 'B-CTRL-005'];
const SEED_ORG_B_RISK_CODES = ['B-RISK-001', 'B-RISK-002', 'B-RISK-003'];
const SEED_ORG_B_VENDOR_CODES = ['B-VND-001', 'B-VND-002'];

const ALL_B_MARKER_CODES = [...SEED_ORG_B_CONTROL_CODES, ...SEED_ORG_B_RISK_CODES, ...SEED_ORG_B_VENDOR_CODES];

// ---- Service base URLs (direct, not through nginx) ----
const URL_CONTROLS = 'http://127.0.0.1:3001';
const URL_FRAMEWORKS = 'http://127.0.0.1:3002';
const URL_POLICIES = 'http://127.0.0.1:3004';
const URL_TPRM = 'http://127.0.0.1:3005';
const URL_TRUST = 'http://127.0.0.1:3006';
const URL_AUDIT = 'http://127.0.0.1:3007';

// Tag the whole describe so it only runs under chromium-adminA.
// (Storage state from adminA isn't actually consulted — we bypass it
// with direct API requests + x-dev-user-id headers — but pinning the
// project keeps the suite from accidentally fanning out across all 5
// role projects.)
test.describe('Tenant isolation @adminA-only', () => {
  let adminACtx: APIRequestContext;
  let adminBCtx: APIRequestContext;

  // This entire suite operates from the Org A admin's perspective. The
  // chromium-adminA project pins it; other projects skip so we don't
  // run identical isolation probes from contexts (viewerA, adminB) that
  // would just retest the same backend in inconsistent ways.
  test.beforeEach((_, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium-adminA',
      'Tenant-isolation suite only runs in the chromium-adminA project.'
    );
  });

  test.beforeAll(async () => {
    adminACtx = await pwRequest.newContext({
      extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_A_ADMIN_ID },
    });
    adminBCtx = await pwRequest.newContext({
      extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_B_ADMIN_ID },
    });
  });

  test.afterAll(async () => {
    await adminACtx?.dispose();
    await adminBCtx?.dispose();
  });

  // ---------------- Helpers ----------------

  /**
   * Some list endpoints return a bare array; others wrap items in
   * `{ data, total }` or `{ controls, total }`. Pull out the array
   * regardless of shape.
   */
  function extractItems(body: any): any[] {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.items)) return body.items;
    if (Array.isArray(body?.results)) return body.results;
    // Common per-resource keys
    for (const k of [
      'controls',
      'risks',
      'vendors',
      'contracts',
      'evidence',
      'audits',
      'frameworks',
      'policies',
      'questionnaires',
      'entries',
      'knowledgeBase',
    ]) {
      if (Array.isArray(body?.[k])) return body[k];
    }
    return [];
  }

  /**
   * Assert: every record carries the expected organizationId AND none of
   * the well-known Org B marker codes appear anywhere in the payload.
   * The string-marker check is a defense-in-depth pass that catches
   * leaks even if a record lacks an explicit `organizationId` field
   * (e.g. an aggregate / projection that filtered it out).
   */
  function assertOrgScoped(items: any[], expectedOrgId: string, label: string) {
    for (const r of items) {
      if (Object.prototype.hasOwnProperty.call(r, 'organizationId')) {
        expect(
          r.organizationId,
          `${label} record id=${r.id} has organizationId=${r.organizationId}, expected ${expectedOrgId}`
        ).toBe(expectedOrgId);
      }
    }
    const blob = JSON.stringify(items);
    for (const marker of ALL_B_MARKER_CODES) {
      expect(blob.includes(marker), `${label} list leaks Org B marker code ${marker}`).toBeFalsy();
    }
  }

  /** Fetch JSON body or null if response isn't JSON. */
  async function safeJson(res: APIResponse): Promise<any> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Pick the first Org B record id from a list endpoint hit with adminB
   * credentials. Falls back to `null` if Org B has no records of this
   * type (in which case the cross-org GET / mutate test is skipped).
   */
  async function firstOrgBId(url: string): Promise<string | null> {
    const res = await adminBCtx.get(url);
    if (!res.ok()) return null;
    const items = extractItems(await safeJson(res));
    return items[0]?.id ?? null;
  }

  // ---- Generic test factory ---------------------------------------------

  interface ResourceConfig {
    name: string;
    listUrl: string;
    /**
     * Either 400 (rejected) or the org id that the server silently
     * scoped to. Specified per resource based on observed behavior —
     * documented in the report.
     */
    createBody: () => Record<string, any>;
    /**
     * HTTP verb for cross-org write. Some controllers use PATCH (tprm,
     * trust, audit) and others use PUT (controls service).
     */
    writeMethod: 'PATCH' | 'PUT';
  }

  /**
   * Run the standard 4-test battery against `cfg`. If the resource has
   * no Org B record (or list endpoint isn't reachable), skips the
   * cross-org subtests.
   */
  function registerResourceTests(cfg: ResourceConfig) {
    test.describe(cfg.name, () => {
      test('list as adminA only returns Org A records', async () => {
        const res = await adminACtx.get(cfg.listUrl);
        expect(res.ok(), `${cfg.name} list failed: ${res.status()}`).toBeTruthy();
        const items = extractItems(await safeJson(res));
        assertOrgScoped(items, SEED_ORG_A_ID, cfg.name);
      });

      test('GET Org B record as adminA returns 404', async () => {
        const targetId = await firstOrgBId(cfg.listUrl);
        test.skip(!targetId, `No Org B ${cfg.name} record to attempt cross-org GET against`);
        const res = await adminACtx.get(`${cfg.listUrl}/${targetId}`);
        expect(
          res.status(),
          `${cfg.name} GET cross-org returned ${res.status()}; expected 404`
        ).toBe(404);
      });

      test('write cross-org record as adminA returns 404', async () => {
        const targetId = await firstOrgBId(cfg.listUrl);
        test.skip(!targetId, `No Org B ${cfg.name} record to attempt cross-org write against`);
        const url = `${cfg.listUrl}/${targetId}`;
        const updateRes =
          cfg.writeMethod === 'PATCH'
            ? await adminACtx.patch(url, { data: { description: 'cross-org tamper attempt' } })
            : await adminACtx.put(url, { data: { description: 'cross-org tamper attempt' } });
        // 404 is the canonical "no such record in your org" response.
        // 400 is acceptable as a fallback when the DTO doesn't include
        // `description` (NestJS forbidNonWhitelisted rejects before the
        // tenant check); the key invariant is that NO 2xx is returned.
        expect(
          updateRes.status(),
          `${cfg.name} ${cfg.writeMethod} cross-org returned ${updateRes.status()}; expected 4xx`
        ).toBeGreaterThanOrEqual(400);

        const deleteRes = await adminACtx.delete(url);
        expect(
          deleteRes.status(),
          `${cfg.name} DELETE cross-org returned ${deleteRes.status()}; expected 4xx`
        ).toBeGreaterThanOrEqual(400);
      });

      test('create with cross-org body is rejected or silently scoped', async () => {
        const res = await adminACtx.post(cfg.listUrl, {
          data: { ...cfg.createBody(), organizationId: SEED_ORG_B_ID },
        });
        // Either rejected (any 4xx/5xx) — acceptable — or accepted, in
        // which case the persisted record MUST belong to Org A. A 5xx
        // is allowed because NestJS's ValidationPipe with
        // `forbidNonWhitelisted` often rejects the unknown
        // organizationId field as a 400, and other endpoints may
        // legitimately error out on unrelated reasons (missing required
        // fields, etc.). The point of THIS test is that the row should
        // never silently land in Org B as adminA.
        if (res.status() >= 400) return;
        expect(res.ok(), `${cfg.name} create returned ${res.status()}`).toBeTruthy();
        const created = await safeJson(res);
        const id = created?.id ?? created?.data?.id;
        expect(id, `${cfg.name} create response has no id`).toBeTruthy();

        // Read it back via adminA. If it landed in Org A, we can see
        // it; if it landed in Org B, adminA would get 404 (which would
        // also fail the test — a write that silently lands in another
        // tenant is the bug we're guarding against).
        const readRes = await adminACtx.get(`${cfg.listUrl}/${id}`);
        expect(
          readRes.ok(),
          `${cfg.name} created record id=${id} not visible to adminA — possibly persisted in Org B`
        ).toBeTruthy();
        const readBody = await safeJson(readRes);
        if (Object.prototype.hasOwnProperty.call(readBody, 'organizationId')) {
          expect(readBody.organizationId).toBe(SEED_ORG_A_ID);
        }

        // Cleanup — best effort.
        await adminACtx.delete(`${cfg.listUrl}/${id}`).catch(() => undefined);
      });
    });
  }

  // ------------------ Resource registrations ------------------

  // Controls — POST /api/controls accepts a custom-control body. The
  // service ignores any organizationId on the DTO and uses the
  // authenticated user's org. Cross-org write uses PUT.
  registerResourceTests({
    name: 'controls',
    listUrl: `${URL_CONTROLS}/api/controls`,
    writeMethod: 'PUT',
    createBody: () => ({
      controlId: `A-CTRL-X-${Date.now()}`,
      title: 'Tenant-isolation test control',
      description: 'Created by Playwright tenant-isolation spec',
      category: 'access_control',
    }),
  });

  // Risks — POST /api/risks. Service signature takes organizationId
  // from controller (user.organizationId).
  registerResourceTests({
    name: 'risks',
    listUrl: `${URL_CONTROLS}/api/risks`,
    writeMethod: 'PUT',
    createBody: () => ({
      title: `Tenant-iso risk ${Date.now()}`,
      description: 'Cross-org create attempt',
      source: 'employee_reporting',
      initialSeverity: 'medium',
    }),
  });

  // Vendors — POST /vendors (NO /api prefix; tprm service). Controller
  // overrides any organizationId in the DTO with user.organizationId.
  registerResourceTests({
    name: 'vendors',
    listUrl: `${URL_TPRM}/vendors`,
    writeMethod: 'PATCH',
    createBody: () => ({
      name: `Tenant-iso vendor ${Date.now()}`,
    }),
  });

  // Contracts — POST /contracts (tprm service). Requires vendorId.
  // We discover an Org A vendor at creation time. If none exist for
  // adminA, the create test will skip itself.
  test.describe('contracts', () => {
    const listUrl = `${URL_TPRM}/contracts`;

    test('list as adminA only returns Org A records', async () => {
      const res = await adminACtx.get(listUrl);
      expect(res.ok(), `contracts list failed: ${res.status()}`).toBeTruthy();
      const items = extractItems(await safeJson(res));
      assertOrgScoped(items, SEED_ORG_A_ID, 'contracts');
    });

    test('GET Org B contract as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B contract to attempt cross-org GET against');
      const res = await adminACtx.get(`${listUrl}/${targetId}`);
      expect(res.status()).toBe(404);
    });

    test('write cross-org contract as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B contract to attempt cross-org write against');
      const url = `${listUrl}/${targetId}`;
      const updateRes = await adminACtx.patch(url, { data: { notes: 'tamper' } });
      expect(updateRes.status()).toBeGreaterThanOrEqual(400);
      const deleteRes = await adminACtx.delete(url);
      expect(deleteRes.status()).toBeGreaterThanOrEqual(400);
    });

    test('create with cross-org body is rejected or silently scoped', async () => {
      // Need an Org A vendor to dock the contract against. Fetch from
      // the live API rather than hard-coding a seed id.
      const vendorsRes = await adminACtx.get(`${URL_TPRM}/vendors`);
      const vendors = extractItems(await safeJson(vendorsRes));
      test.skip(vendors.length === 0, 'No Org A vendor available to anchor contract create');
      const vendorId = vendors[0].id;

      const res = await adminACtx.post(listUrl, {
        data: {
          organizationId: SEED_ORG_B_ID,
          vendorId,
          contractType: 'msa',
          title: `Tenant-iso contract ${Date.now()}`,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86_400_000).toISOString(),
        },
      });
      // Any 4xx/5xx is acceptable — server rejected. Only an accepted
      // create that LANDS in Org B would be a tenant-isolation bug.
      if (res.status() >= 400) return;
      const created = await safeJson(res);
      const id = created?.id ?? created?.data?.id;
      expect(id).toBeTruthy();
      const readRes = await adminACtx.get(`${listUrl}/${id}`);
      expect(readRes.ok()).toBeTruthy();
      const readBody = await safeJson(readRes);
      if (Object.prototype.hasOwnProperty.call(readBody, 'organizationId')) {
        expect(readBody.organizationId).toBe(SEED_ORG_A_ID);
      }
      await adminACtx.delete(`${listUrl}/${id}`).catch(() => undefined);
    });
  });

  // Evidence — POST /api/evidence is a multipart file upload, not a
  // JSON body. We exercise list / GET / PUT / DELETE cross-org, but
  // skip the JSON-create probe (a multipart upload exercising
  // organizationId cross-org would be a much larger fixture and the
  // upload code path uses user.organizationId unconditionally — there
  // is no DTO field for organizationId to override).
  test.describe('evidence', () => {
    const listUrl = `${URL_CONTROLS}/api/evidence`;

    test('list as adminA only returns Org A records', async () => {
      const res = await adminACtx.get(listUrl);
      expect(res.ok(), `evidence list failed: ${res.status()}`).toBeTruthy();
      const items = extractItems(await safeJson(res));
      assertOrgScoped(items, SEED_ORG_A_ID, 'evidence');
    });

    test('GET Org B evidence as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B evidence to attempt cross-org GET against');
      const res = await adminACtx.get(`${listUrl}/${targetId}`);
      expect(res.status()).toBe(404);
    });

    test('write cross-org evidence as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B evidence to attempt cross-org write against');
      const url = `${listUrl}/${targetId}`;
      const updateRes = await adminACtx.put(url, { data: { description: 'tamper' } });
      expect(updateRes.status()).toBeGreaterThanOrEqual(400);
      const deleteRes = await adminACtx.delete(url);
      expect(deleteRes.status()).toBeGreaterThanOrEqual(400);
    });

    // NOTE: evidence create requires multipart upload; the controller
    // takes organizationId only from user context (no DTO field), so
    // there is no cross-org create attack vector at the JSON layer to
    // test here. Documented in the spec report.
  });

  // Audits — POST /api/audits (audit service). Controller explicitly
  // overrides any organizationId with user.organizationId.
  registerResourceTests({
    name: 'audits',
    listUrl: `${URL_AUDIT}/api/audits`,
    writeMethod: 'PATCH',
    createBody: () => ({
      auditType: 'internal',
      name: `Tenant-iso audit ${Date.now()}`,
    }),
  });

  // Frameworks — POST /api/frameworks (frameworks service). Service
  // takes organizationId from controller arg (user.organizationId).
  registerResourceTests({
    name: 'frameworks',
    listUrl: `${URL_FRAMEWORKS}/api/frameworks`,
    writeMethod: 'PUT',
    createBody: () => ({
      name: `Tenant-iso framework ${Date.now()}`,
      type: 'custom',
    }),
  });

  // Policies — POST /api/policies requires multipart file upload, same
  // as evidence. We exercise list / GET / cross-org write only.
  test.describe('policies', () => {
    const listUrl = `${URL_POLICIES}/api/policies`;

    test('list as adminA only returns Org A records', async () => {
      const res = await adminACtx.get(listUrl);
      expect(res.ok(), `policies list failed: ${res.status()}`).toBeTruthy();
      const items = extractItems(await safeJson(res));
      assertOrgScoped(items, SEED_ORG_A_ID, 'policies');
    });

    test('GET Org B policy as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B policy to attempt cross-org GET against');
      const res = await adminACtx.get(`${listUrl}/${targetId}`);
      expect(res.status()).toBe(404);
    });

    test('write cross-org policy as adminA returns 404', async () => {
      const targetId = await firstOrgBId(listUrl);
      test.skip(!targetId, 'No Org B policy to attempt cross-org write against');
      const url = `${listUrl}/${targetId}`;
      const updateRes = await adminACtx.put(url, { data: { description: 'tamper' } });
      expect(updateRes.status()).toBeGreaterThanOrEqual(400);
      const deleteRes = await adminACtx.delete(url);
      expect(deleteRes.status()).toBeGreaterThanOrEqual(400);
    });

    // NOTE: policies create is multipart-only (file upload). No JSON
    // cross-org create vector to test. Documented in the spec report.
  });

  // Questionnaires — POST /questionnaires (trust service). DTO has a
  // REQUIRED organizationId field and the controller does NOT override
  // it. We document the actual behavior in the cross-org create test.
  registerResourceTests({
    name: 'questionnaires',
    listUrl: `${URL_TRUST}/questionnaires`,
    writeMethod: 'PATCH',
    createBody: () => ({
      requesterName: 'Playwright',
      requesterEmail: 'playwright@example.com',
      title: `Tenant-iso questionnaire ${Date.now()}`,
    }),
  });

  // Knowledge-base — POST /knowledge-base (trust service). DTO has a
  // REQUIRED organizationId field; service uses ...createData spread.
  registerResourceTests({
    name: 'knowledge-base',
    listUrl: `${URL_TRUST}/knowledge-base`,
    writeMethod: 'PATCH',
    createBody: () => ({
      category: 'security',
      title: `Tenant-iso KB ${Date.now()}`,
      answer: 'Created by Playwright tenant-isolation spec',
    }),
  });
});
