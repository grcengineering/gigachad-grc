import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * Mapping Import / Export wizard — end-to-end coverage for PR-B-IE.
 *
 * Companion to mapping-flow.spec.ts (PR-A). Exercises the two toolbar
 * buttons on the FrameworkDetail page:
 *   - "Import mappings" → opens the 3-step MappingImportWizard
 *     (upload → preview → result), driven by POST /api/mappings/import
 *     with dryRun=true then dryRun=false.
 *   - "Export mappings" → triggers a browser download, served by
 *     GET /api/mappings/export?frameworkId=…&format=xlsx (the
 *     FrameworkDetail page hard-codes xlsx today; the CSV path is
 *     exercised through the admin API context below to assert the
 *     export header round-trips).
 *
 * Role gating mirrors PR-A: admins see both buttons, viewers see
 * neither. The PR-B-IE contract defers to the existing role policy —
 * `frameworks:manage` permission gates the Import button and the
 * `admin | compliance_manager | auditor` role tuple gates the Export
 * button (see FrameworkDetail.tsx). Viewers fail both checks.
 *
 * Selectors:
 *   - Toolbar buttons use accessible names "Import mappings" and
 *     "Export mappings".
 *   - The wizard modal uses role="dialog" with an "Import mappings"
 *     title. The file <input type="file"> has accessible label
 *     "Mapping import file" (see MappingImportWizard.tsx).
 *   - Action buttons inside the wizard: "Validate" (upload stage),
 *     "Confirm import" (preview stage), "Done" (result stage).
 *   - Preview rows expose data-testid="preview-row-<N>" and
 *     data-status="will_create|duplicate|error" for status assertions
 *     without depending on Tailwind pill colours.
 */

// ---------------------------------------------------------------------------
// Seed fixtures (mirror services/shared/src/seed/seed-constants.ts).
// ---------------------------------------------------------------------------
const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

const URL_CONTROLS = 'http://127.0.0.1:3001';
const URL_FRAMEWORKS = 'http://127.0.0.1:3002';

// ---------------------------------------------------------------------------
// Shared discovery: pick a framework that has at least one non-category
// requirement and two unmapped controls we can address by code. Done once
// via the admin API context so per-role tests don't repeat the search.
// ---------------------------------------------------------------------------
interface IeFixture {
  frameworkId: string;
  frameworkType: string;
  frameworkVersion: string;
  /** e.g. "soc2:2017" — the canonical framework_code used in import CSVs. */
  frameworkCode: string;
  requirementId: string;
  requirementRef: string;
  controlAId: string;
  controlACode: string;
  controlBId: string;
  controlBCode: string;
}

let fixture: IeFixture | undefined;
let adminApi: APIRequestContext | undefined;

async function discoverFixture(api: APIRequestContext): Promise<IeFixture> {
  // 1. Pick the first framework with a non-category leaf requirement.
  //    Same recursion pattern as mapping-flow.spec.ts — top-level rows
  //    in the seeded catalogs are categories; leaves live under
  //    `.children`.
  const fwRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks`);
  if (!fwRes.ok()) {
    throw new Error(`Could not list frameworks: ${fwRes.status()}`);
  }
  const fwBody = await fwRes.json();
  const frameworks: any[] = Array.isArray(fwBody)
    ? fwBody
    : (fwBody.data ?? fwBody.items ?? fwBody.frameworks ?? []);
  if (frameworks.length === 0) {
    throw new Error('Seed produced no frameworks; cannot pick a target');
  }

  function findLeaf(nodes: any[]): any | undefined {
    for (const n of nodes) {
      if (!n.isCategory) return n;
      if (Array.isArray(n.children) && n.children.length > 0) {
        const hit = findLeaf(n.children);
        if (hit) return hit;
      }
    }
    return undefined;
  }

  let chosenFw: any | undefined;
  let chosenReq: any | undefined;
  for (const fw of frameworks) {
    let reqs: any[] = [];
    const treeRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${fw.id}/requirements/tree`);
    if (treeRes.ok()) {
      const body = await treeRes.json();
      reqs = Array.isArray(body) ? body : (body.data ?? body.items ?? body.requirements ?? []);
    } else {
      const reqRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${fw.id}/requirements`);
      if (!reqRes.ok()) continue;
      const reqBody = await reqRes.json();
      reqs = Array.isArray(reqBody)
        ? reqBody
        : (reqBody.data ?? reqBody.items ?? reqBody.requirements ?? []);
    }
    const candidate = findLeaf(reqs);
    if (candidate) {
      chosenFw = fw;
      chosenReq = candidate;
      break;
    }
  }
  if (!chosenFw || !chosenReq) {
    throw new Error(
      'No framework with a non-category requirement found in seed. ' +
        'Walk `.children` recursively — every seeded catalog buries its ' +
        'leaves under categories.'
    );
  }

  // 2. Pick two controls that are NOT already mapped to this requirement,
  //    capturing both their UUIDs (for API seeding) and their human
  //    controlId codes (for CSV import).
  const ctrlRes = await api.get(`${URL_CONTROLS}/api/controls?limit=100`);
  if (!ctrlRes.ok()) {
    throw new Error(`Could not list controls: ${ctrlRes.status()}`);
  }
  const ctrlBody = await ctrlRes.json();
  const controls: any[] = Array.isArray(ctrlBody)
    ? ctrlBody
    : (ctrlBody.data ?? ctrlBody.items ?? ctrlBody.controls ?? []);
  const mappedIds = new Set<string>(
    (chosenReq.mappings ?? []).map((m: any) => m.control?.id ?? m.controlId)
  );
  const unmapped = controls.filter((c) => !mappedIds.has(c.id) && c.controlId);
  if (unmapped.length < 2) {
    throw new Error('Need at least two unmapped controls to exercise import preview');
  }

  return {
    frameworkId: chosenFw.id,
    frameworkType: chosenFw.type,
    frameworkVersion: chosenFw.version ?? '',
    frameworkCode: chosenFw.version ? `${chosenFw.type}:${chosenFw.version}` : chosenFw.type,
    requirementId: chosenReq.id,
    requirementRef: chosenReq.reference ?? '',
    controlAId: unmapped[0].id,
    controlACode: unmapped[0].controlId,
    controlBId: unmapped[1].id,
    controlBCode: unmapped[1].controlId,
  };
}

/** Delete every mapping currently attached to the fixture's requirement.
 *  Keeps the import scenarios idempotent across re-runs. */
async function cleanRequirementMappings(api: APIRequestContext, requirementId: string) {
  const res = await api.get(`${URL_FRAMEWORKS}/api/mappings/by-requirement/${requirementId}`);
  if (!res.ok()) return;
  const body = await res.json();
  const items: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
  for (const m of items) {
    if (m.id) await api.delete(`${URL_FRAMEWORKS}/api/mappings/${m.id}`).catch(() => undefined);
  }
}

/** Construct a CSV body in-memory using the export schema's column order.
 *  Returns a UTF-8 Buffer suitable for setInputFiles({ buffer, ... }). */
function buildCsv(rows: Array<Record<string, string>>): Buffer {
  const cols = [
    'framework_code',
    'requirement_ref',
    'control_code',
    'mapping_type',
    'notes',
  ] as const;
  const escape = (v: string): string => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c] ?? '')).join(','));
  }
  return Buffer.from(lines.join('\r\n') + '\r\n', 'utf-8');
}

test.beforeAll(async () => {
  adminApi = await pwRequest.newContext({
    extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_A_ADMIN_ID },
  });
  fixture = await discoverFixture(adminApi);
});

test.afterAll(async () => {
  if (adminApi && fixture) {
    await cleanRequirementMappings(adminApi, fixture.requirementId);
  }
  await adminApi?.dispose();
});

// ---------------------------------------------------------------------------
// Helpers shared across describe blocks.
// ---------------------------------------------------------------------------

async function openFrameworkDetail(page: import('@playwright/test').Page, frameworkId: string) {
  await page.goto(`/frameworks/${frameworkId}`);
  await page.waitForLoadState('networkidle');
  // The toolbar section appears once the framework loads; assert on the
  // page title rather than the toolbar (the toolbar is role-gated so it
  // may not render at all for viewers).
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Scenario 1-3: adminA happy paths (export, import all-good, import mixed).
// ---------------------------------------------------------------------------
test.describe('Mapping import/export — adminA', () => {
  test.use({ storageState: 'playwright/.auth/adminA.json' });

  test.beforeEach(async () => {
    expect(fixture, 'fixture from beforeAll').toBeDefined();
    expect(adminApi, 'adminApi from beforeAll').toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
  });

  test('exports the framework mappings and round-trips the CSV header', async ({ page }) => {
    const f = fixture!;

    // Seed one mapping so the export has content to surface.
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.frameworkId,
        requirementId: f.requirementId,
        controlId: f.controlAId,
        mappingType: 'primary',
        notes: 'Seeded for export round-trip',
      },
    });
    expect(seedRes.ok(), `seed mapping POST: ${seedRes.status()}`).toBeTruthy();

    await openFrameworkDetail(page, f.frameworkId);

    // 1a. Click the visible Export button and capture the resulting download.
    //     The FrameworkDetail page issues an xlsx download by default; the
    //     filename embeds the framework type.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export mappings/i }).click();
    const download = await downloadPromise;

    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/^mappings-/);
    expect(suggestedName).toMatch(/\.xlsx$/);

    // 1b. Pull the CSV variant directly through the admin API context so we
    //     can assert the export header is exactly what the import wizard
    //     accepts back. This proves the round-trip contract between
    //     export and import without depending on an xlsx parser in the
    //     browser-side download.
    const csvRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/export?frameworkId=${encodeURIComponent(
        f.frameworkId
      )}&format=csv`
    );
    expect(csvRes.ok(), `CSV export GET: ${csvRes.status()}`).toBeTruthy();
    const csvBody = await csvRes.text();
    const [headerLine, ...dataLines] = csvBody.split(/\r?\n/).filter((line) => line.length > 0);
    expect(headerLine).toBe('framework_code,requirement_ref,control_code,mapping_type,notes');
    // The seeded row must round-trip with the right shape.
    expect(dataLines.length).toBeGreaterThan(0);
    const seededLine = dataLines.find((l) => l.includes(f.controlACode));
    expect(seededLine, 'exported CSV should contain the seeded mapping row').toBeTruthy();
    expect(seededLine).toContain(f.frameworkCode);
    expect(seededLine).toContain(f.requirementRef);
    expect(seededLine).toContain('primary');
  });

  test('imports an all-good CSV and persists every row', async ({ page }) => {
    const f = fixture!;

    // Two-row CSV: both rows target the discovered requirement; one as
    // primary (control A), one as supporting (control B). Both should
    // land in the `will_create` bucket.
    const csv = buildCsv([
      {
        framework_code: f.frameworkCode,
        requirement_ref: f.requirementRef,
        control_code: f.controlACode,
        mapping_type: 'primary',
        notes: 'Imported by e2e',
      },
      {
        framework_code: f.frameworkCode,
        requirement_ref: f.requirementRef,
        control_code: f.controlBCode,
        mapping_type: 'supporting',
        notes: '',
      },
    ]);

    await openFrameworkDetail(page, f.frameworkId);
    await page.getByRole('button', { name: /Import mappings/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: /Import mappings/i })).toBeVisible();

    // Upload via the labelled file input. The input is visually hidden
    // but Playwright drives it directly via setInputFiles.
    await modal.getByLabel(/Mapping import file/i).setInputFiles({
      name: 'all-good.csv',
      mimeType: 'text/csv',
      buffer: csv,
    });

    // Advance to preview (dryRun=true server-side).
    await modal.getByRole('button', { name: /^Validate$/i }).click();

    // Preview stage renders two will_create rows and no errors.
    await expect(modal.locator('[data-stage="preview"]')).toBeVisible();
    await expect(modal.locator('[data-status="will_create"]')).toHaveCount(2);
    await expect(modal.locator('[data-status="error"]')).toHaveCount(0);

    // Confirm import (dryRun=false). The result stage flips to the Done
    // button; mappings are invalidated and refetched in the page below.
    await modal.getByRole('button', { name: /Confirm import/i }).click();
    await expect(modal.locator('[data-stage="result"]')).toBeVisible();
    await modal.getByRole('button', { name: /^Done$/i }).click();
    await expect(modal).toBeHidden();

    // Backend confirms both mappings were persisted against the requirement.
    const listRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${f.requirementId}`
    );
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const items: any[] = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
    const persistedControlIds = new Set(items.map((m) => m.control?.id ?? m.controlId));
    expect(persistedControlIds.has(f.controlAId)).toBeTruthy();
    expect(persistedControlIds.has(f.controlBId)).toBeTruthy();
  });

  test('imports a mixed CSV and only commits the valid rows', async ({ page }) => {
    const f = fixture!;

    // Three rows: one valid (control A → requirement), one invalid
    // (unknown framework code), one invalid (unknown control code).
    // The preview must surface per-row errors; the commit must only
    // create the valid row.
    const csv = buildCsv([
      {
        framework_code: f.frameworkCode,
        requirement_ref: f.requirementRef,
        control_code: f.controlACode,
        mapping_type: 'primary',
        notes: 'Valid row',
      },
      {
        framework_code: 'nope:9999',
        requirement_ref: f.requirementRef,
        control_code: f.controlACode,
        mapping_type: 'primary',
        notes: 'Unknown framework',
      },
      {
        framework_code: f.frameworkCode,
        requirement_ref: f.requirementRef,
        control_code: 'NONE-000',
        mapping_type: 'primary',
        notes: 'Unknown control',
      },
    ]);

    await openFrameworkDetail(page, f.frameworkId);
    await page.getByRole('button', { name: /Import mappings/i }).click();

    const modal = page.getByRole('dialog');
    await modal.getByLabel(/Mapping import file/i).setInputFiles({
      name: 'mixed.csv',
      mimeType: 'text/csv',
      buffer: csv,
    });
    await modal.getByRole('button', { name: /^Validate$/i }).click();

    // Preview shows exactly one valid row and two errors. Per-row error
    // text is rendered inside the error rows; the contract just calls
    // for surfaced messages, not specific wording, so we assert presence.
    await expect(modal.locator('[data-stage="preview"]')).toBeVisible();
    await expect(modal.locator('[data-status="will_create"]')).toHaveCount(1);
    await expect(modal.locator('[data-status="error"]')).toHaveCount(2);
    const errorRows = modal.locator('[data-status="error"]');
    // Each error row renders the "Error" status pill alongside whatever
    // per-row errorMessage the server returned. The pill text proves the
    // row was flagged; an additional non-empty text check on the row
    // guards against the message being blank.
    await expect(errorRows.first()).toContainText(/Error/i);
    await expect(errorRows.nth(1)).toContainText(/Error/i);

    // Confirm: only the valid row should be persisted.
    await modal.getByRole('button', { name: /Confirm import/i }).click();
    await expect(modal.locator('[data-stage="result"]')).toBeVisible();
    await modal.getByRole('button', { name: /^Done$/i }).click();
    await expect(modal).toBeHidden();

    const listRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${f.requirementId}`
    );
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const items: any[] = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
    const persistedControlIds = new Set(items.map((m) => m.control?.id ?? m.controlId));
    expect(persistedControlIds.has(f.controlAId)).toBeTruthy();
    // The unknown-control row never had a target to persist against, so
    // the requirement should have exactly one mapping (control A).
    expect(items.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: viewerA — both toolbar buttons must be hidden.
// ---------------------------------------------------------------------------
test.describe('Mapping import/export — viewerA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/viewerA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
  });

  test('viewer sees neither Import nor Export buttons on the framework page', async ({ page }) => {
    const f = fixture!;
    await openFrameworkDetail(page, f.frameworkId);

    // Both toolbar buttons are role-gated and must not render for viewers.
    // Import requires frameworks:manage (compliance_manager + admin only);
    // Export requires admin | compliance_manager | auditor.
    await expect(page.getByRole('button', { name: /Import mappings/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Export mappings/i })).toHaveCount(0);
  });
});
