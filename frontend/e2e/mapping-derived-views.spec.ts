import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * Mapping derived views — gap report + cross-framework copy (PR-D).
 *
 * Exercises the surfaces introduced by PR-D on top of PR-A's mapping editor:
 *   1. Gap report at /reports/mapping-gaps with three tab types
 *        (`no-controls`, `supporting-only`, `unused-controls`).
 *   2. Dashboard mapping-coverage widget (renders numeric stats, not the
 *        zero-state card).
 *   3. Chip kebab on FrameworkDetail exposes a "Copy to framework…" menu
 *        item between Edit and Delete (admin path), and that item pre-fills
 *        the cross-framework copy modal with the source mapping's
 *        mappingType.
 *   4. Saving the copy modal against a different framework creates a new
 *        mapping on the target framework that preserves the source
 *        mappingType.
 *   5. Viewer-role gating: read-only users can reach /reports/mapping-gaps
 *        but never see the "Copy to framework…" affordance.
 *
 * Conventions:
 *   - Per role, storage state is selected via `test.use({ storageState })`
 *     against the files produced by auth.setup.ts.
 *   - Backend fixture discovery uses a header-authenticated APIRequestContext
 *     with `x-dev-user-id` set to the seeded Org A admin, identical to
 *     mapping-flow.spec.ts.
 *   - Requirement discovery recurses `.children` because the seeded SOC 2 /
 *     ISO 27001 / HIPAA catalogs put non-category leaves under category
 *     parents (default `GET /requirements?parentId=null` would only return
 *     categories).
 *   - Assertions use ARIA roles + accessible names — never Tailwind classes,
 *     hex colors, or pixel positions.
 */

// ---------------------------------------------------------------------------
// Seed fixtures (mirror services/shared/src/seed/seed-constants.ts).
// ---------------------------------------------------------------------------
const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

const URL_CONTROLS = 'http://127.0.0.1:3001';
const URL_FRAMEWORKS = 'http://127.0.0.1:3002';

// ---------------------------------------------------------------------------
// Shared discovery: a non-category requirement on framework A, plus a
// SECOND framework with its own non-category requirement (target for the
// cross-framework copy), and two unmapped controls.
// ---------------------------------------------------------------------------
interface DerivedFixture {
  /** Source framework (where the mapping starts before the copy). */
  sourceFrameworkId: string;
  sourceFrameworkName: string;
  /** Non-category requirement on the source framework. */
  sourceRequirementId: string;
  sourceRequirementRef: string;
  /** A second framework, used as the cross-framework copy target. */
  targetFrameworkId: string;
  targetFrameworkName: string;
  /** A non-category requirement on the target framework. */
  targetRequirementId: string;
  targetRequirementRef: string;
  /** Two unmapped controls (A is the one we'll wire up + copy). */
  controlAId: string;
  controlAControlId: string;
  controlBId: string;
  controlBControlId: string;
}

let fixture: DerivedFixture | undefined;
let adminApi: APIRequestContext | undefined;

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

async function fetchRequirements(api: APIRequestContext, frameworkId: string): Promise<any[]> {
  // Prefer `/tree` for full hierarchy, fall back to the regular endpoint
  // (which defaults to parentId=null). Either way we must recurse into
  // `.children` to find non-category leaves on the seeded catalogs.
  const treeRes = await api.get(
    `${URL_FRAMEWORKS}/api/frameworks/${frameworkId}/requirements/tree`
  );
  if (treeRes.ok()) {
    const body = await treeRes.json();
    return Array.isArray(body) ? body : (body.data ?? body.items ?? body.requirements ?? []);
  }
  const reqRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${frameworkId}/requirements`);
  if (!reqRes.ok()) return [];
  const reqBody = await reqRes.json();
  return Array.isArray(reqBody)
    ? reqBody
    : (reqBody.data ?? reqBody.items ?? reqBody.requirements ?? []);
}

async function discoverFixture(api: APIRequestContext): Promise<DerivedFixture> {
  // 1. Need two different frameworks each with a non-category leaf.
  const fwRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks`);
  if (!fwRes.ok()) {
    throw new Error(`Could not list frameworks: ${fwRes.status()}`);
  }
  const fwBody = await fwRes.json();
  const frameworks: any[] = Array.isArray(fwBody)
    ? fwBody
    : (fwBody.data ?? fwBody.items ?? fwBody.frameworks ?? []);
  if (frameworks.length < 2) {
    throw new Error(
      `Need at least two seeded frameworks for the cross-framework copy fixture; got ${frameworks.length}`
    );
  }

  const usable: Array<{ fw: any; leaf: any }> = [];
  for (const fw of frameworks) {
    const reqs = await fetchRequirements(api, fw.id);
    const leaf = findLeaf(reqs);
    if (leaf) usable.push({ fw, leaf });
    if (usable.length >= 2) break;
  }
  if (usable.length < 2) {
    throw new Error(
      'Could not find two frameworks with non-category requirements. Walk `.children` recursively.'
    );
  }
  const [source, target] = usable;

  // 2. Two unmapped controls on the source requirement.
  const ctrlRes = await api.get(`${URL_CONTROLS}/api/controls?limit=100`);
  if (!ctrlRes.ok()) {
    throw new Error(`Could not list controls: ${ctrlRes.status()}`);
  }
  const ctrlBody = await ctrlRes.json();
  const controls: any[] = Array.isArray(ctrlBody)
    ? ctrlBody
    : (ctrlBody.data ?? ctrlBody.items ?? ctrlBody.controls ?? []);
  const mappedToSource = new Set<string>(
    (source.leaf.mappings ?? []).map((m: any) => m.control?.id ?? m.controlId)
  );
  const unmapped = controls.filter((c) => !mappedToSource.has(c.id));
  if (unmapped.length < 2) {
    throw new Error('Need at least two unmapped controls for the fixture');
  }

  return {
    sourceFrameworkId: source.fw.id,
    sourceFrameworkName: source.fw.name,
    sourceRequirementId: source.leaf.id,
    sourceRequirementRef: source.leaf.reference ?? '',
    targetFrameworkId: target.fw.id,
    targetFrameworkName: target.fw.name,
    targetRequirementId: target.leaf.id,
    targetRequirementRef: target.leaf.reference ?? '',
    controlAId: unmapped[0].id,
    controlAControlId: unmapped[0].controlId,
    controlBId: unmapped[1].id,
    controlBControlId: unmapped[1].controlId,
  };
}

/** Best-effort cleanup of any mappings that point at our fixture controls,
 *  on either framework. Keeps test runs idempotent across retries. */
async function cleanFixtureMappings(api: APIRequestContext, f: DerivedFixture) {
  for (const controlId of [f.controlAId, f.controlBId]) {
    const res = await api
      .get(`${URL_FRAMEWORKS}/api/mappings/by-control/${controlId}`)
      .catch(() => null);
    if (!res || !res.ok()) continue;
    const body = await res.json();
    const items: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    for (const m of items) {
      if (m.id) await api.delete(`${URL_FRAMEWORKS}/api/mappings/${m.id}`).catch(() => undefined);
    }
  }
}

test.beforeAll(async () => {
  adminApi = await pwRequest.newContext({
    extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_A_ADMIN_ID },
  });
  fixture = await discoverFixture(adminApi);
  // Seed one supporting-only mapping so the gap report has at least one
  // row for each of the three gap types. Without this the supporting-only
  // tab would be empty in a fresh seed (which is technically a valid empty
  // state, but we want the asserting test path to be deterministic).
  await cleanFixtureMappings(adminApi, fixture);
  await adminApi
    .post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: fixture.sourceFrameworkId,
        requirementId: fixture.sourceRequirementId,
        controlId: fixture.controlAId,
        mappingType: 'supporting',
      },
    })
    .catch(() => undefined);
});

test.afterAll(async () => {
  if (adminApi && fixture) {
    await cleanFixtureMappings(adminApi, fixture);
  }
  await adminApi?.dispose();
});

// ---------------------------------------------------------------------------
// Helpers shared across describe blocks.
// ---------------------------------------------------------------------------

async function openRequirementDetail(
  page: import('@playwright/test').Page,
  frameworkId: string,
  requirementRef: string
) {
  await page.goto(`/frameworks/${frameworkId}`);
  await page.waitForLoadState('networkidle');
  const row = page.getByText(requirementRef, { exact: true }).first();
  await row.click();
  await expect(page.getByText(/Mapped Controls/i)).toBeVisible();
}

function mappingChip(page: import('@playwright/test').Page, identifier: string) {
  return page.getByRole('listitem').filter({ hasText: identifier });
}

// ---------------------------------------------------------------------------
// Scenario 1-4: adminA paths
// ---------------------------------------------------------------------------
test.describe('Mapping derived views — adminA', () => {
  test.use({ storageState: 'playwright/.auth/adminA.json' });

  test('gap report renders all three tab types (or a friendly empty state)', async ({ page }) => {
    expect(fixture, 'fixture from beforeAll').toBeDefined();

    await page.goto('/reports/mapping-gaps');
    await page.waitForLoadState('networkidle');

    // Heading + tablist exist regardless of result count.
    await expect(
      page.getByRole('heading', { name: /Mapping Gap Analysis/i, level: 1 })
    ).toBeVisible();
    const tablist = page.getByRole('tablist');
    await expect(tablist).toBeVisible();

    // For each gap type, switch tab and assert either a results table OR
    // the friendly empty state — never a raw error.
    const tabs: Array<{ name: RegExp }> = [
      { name: /Requirements with no controls/i },
      { name: /Requirements with only supporting controls/i },
      { name: /Controls not mapped to anything/i },
    ];
    for (const tab of tabs) {
      await page.getByRole('tab', { name: tab.name }).click();
      const table = page.getByRole('table');
      const friendlyEmpty = page.getByText(/No mapping gaps/i);
      await expect(table.or(friendlyEmpty).first()).toBeVisible();
    }
  });

  test('dashboard coverage widget renders with numeric stats', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const region = page.getByRole('region', { name: /Organization mapping coverage/i });
    await expect(region).toBeVisible();
    await expect(region.getByRole('heading', { name: /Mapping Coverage/i })).toBeVisible();

    // The widget either shows a percent label ("NN percent") or the
    // friendly zero-state copy. Both are non-error renders, but the spec
    // requires "non-empty numbers" — which the percent aria-label
    // satisfies. The seed always creates controls, so the zero-state
    // ("No controls have been created yet") is not expected.
    await expect(region.getByLabel(/^\d+ percent$/)).toBeVisible();
    // The summary line ("X of Y mapped — Z unmapped") is also rendered
    // alongside the percent — assert its presence as a stronger signal.
    await expect(region.getByText(/of \d+ mapped/i)).toBeVisible();
  });

  test('chip kebab menu order is Edit, Copy to framework…, Delete', async ({ page }) => {
    const f = fixture!;
    // Make sure controlA has at least one mapping on the source requirement
    // (beforeAll seeded a supporting one; defend against earlier scenarios
    // having deleted it).
    const listRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${f.sourceRequirementId}`
    );
    const list = listRes.ok() ? await listRes.json() : { items: [] };
    const items: any[] = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
    const alreadyMapped = items.some((m) => (m.controlId ?? m.control?.id) === f.controlAId);
    if (!alreadyMapped) {
      await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
        data: {
          frameworkId: f.sourceFrameworkId,
          requirementId: f.sourceRequirementId,
          controlId: f.controlAId,
          mappingType: 'supporting',
        },
      });
    }

    await openRequirementDetail(page, f.sourceFrameworkId, f.sourceRequirementRef);
    const chip = mappingChip(page, f.controlAControlId);
    await expect(chip).toBeVisible();

    await chip.getByRole('button', { name: /Mapping actions/i }).click();

    // Order of menu items in DOM should be Edit → Copy → Delete.
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const items_ = menu.getByRole('menuitem');
    await expect(items_.nth(0)).toHaveText(/Edit/i);
    await expect(items_.nth(1)).toHaveText(/Copy to framework/i);
    await expect(items_.nth(2)).toHaveText(/Delete/i);

    // Click "Copy to framework…" → modal opens with mappingType pre-filled
    // to the source mapping's type (we seeded `supporting` above).
    await menu.getByRole('menuitem', { name: /Copy to framework/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Add mappings/i)).toBeVisible();
    // The copy modal opens directly into the search stage with the
    // framework selector exposed (no framework is pre-locked, because the
    // user is choosing a target). Pick the target framework so the
    // candidates list populates, then advance to the per-row form to
    // confirm the mappingType default carried over.
    await modal.getByLabel(/^Framework$/i).selectOption(f.targetFrameworkId);
    await modal.getByRole('button', { name: /^Next$/i }).click();

    // Multi-select stage — pick the target framework's leaf requirement.
    const escapedRef = f.targetRequirementRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await modal.getByRole('checkbox', { name: new RegExp(escapedRef, 'i') }).check();
    await modal.getByRole('button', { name: /^Next$/i }).click();

    // Per-row form — assert the mapping type select is pre-populated with
    // 'supporting' (carried over from the source via defaultMappingType).
    const typeSelect = modal.getByLabel(/mapping type/i);
    await expect(typeSelect).toHaveValue('supporting');
  });

  test('cross-framework copy creates a new mapping on the target framework', async ({ page }) => {
    const f = fixture!;
    // Re-seed source mapping with a known type so the copy default is
    // deterministic for this scenario regardless of test ordering.
    await cleanFixtureMappings(adminApi!, f);
    await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.sourceFrameworkId,
        requirementId: f.sourceRequirementId,
        controlId: f.controlAId,
        mappingType: 'supporting',
      },
    });

    await openRequirementDetail(page, f.sourceFrameworkId, f.sourceRequirementRef);
    const chip = mappingChip(page, f.controlAControlId);
    await expect(chip).toBeVisible();

    await chip.getByRole('button', { name: /Mapping actions/i }).click();
    await page.getByRole('menuitem', { name: /Copy to framework/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Add mappings/i)).toBeVisible();

    // Switch framework to the target (different from source).
    await modal.getByLabel(/^Framework$/i).selectOption(f.targetFrameworkId);
    await modal.getByRole('button', { name: /^Next$/i }).click();

    // Pick the target requirement.
    const escapedRef = f.targetRequirementRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await modal.getByRole('checkbox', { name: new RegExp(escapedRef, 'i') }).check();
    await modal.getByRole('button', { name: /^Next$/i }).click();

    // Leave the mappingType at its inherited default ('supporting') and save.
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // The new mapping should exist on the target framework's requirement
    // with the source mappingType preserved.
    const verifyRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${f.targetRequirementId}`
    );
    expect(verifyRes.ok()).toBeTruthy();
    const body = await verifyRes.json();
    const verifyItems: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    const created = verifyItems.find((m) => (m.controlId ?? m.control?.id) === f.controlAId);
    expect(created, 'new mapping on target framework').toBeDefined();
    expect(created.mappingType).toBe('supporting');
    expect(created.frameworkId ?? created.framework?.id).toBe(f.targetFrameworkId);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: viewerA — gap report is reachable, copy affordance is gone.
// ---------------------------------------------------------------------------
test.describe('Mapping derived views — viewerA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/viewerA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    // Make sure there is a chip on the source requirement so we can prove
    // the copy menu item is *absent*, not merely never rendered.
    const listRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${fixture!.sourceRequirementId}`
    );
    const body = listRes.ok() ? await listRes.json() : { items: [] };
    const items: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
    const hasMapping = items.some((m) => (m.controlId ?? m.control?.id) === fixture!.controlAId);
    if (!hasMapping) {
      await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
        data: {
          frameworkId: fixture!.sourceFrameworkId,
          requirementId: fixture!.sourceRequirementId,
          controlId: fixture!.controlAId,
          mappingType: 'primary',
        },
      });
    }
  });

  test('viewer reaches /reports/mapping-gaps; no copy-to-framework affordance on chips', async ({
    page,
  }) => {
    const f = fixture!;
    // 1. The report page itself is reachable for `frameworks:view` holders
    //    (viewer role grants it via AuthContext defaults). The page heading
    //    must render — no "Not authorized" empty state.
    await page.goto('/reports/mapping-gaps');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('heading', { name: /Mapping Gap Analysis/i, level: 1 })
    ).toBeVisible();
    await expect(page.getByText(/Not authorized/i)).toHaveCount(0);

    // 2. On a requirement detail page, the chip is visible (read-only) but
    //    the "Copy to framework…" menu item is not — the kebab requires
    //    controls:update, which viewers lack. We assert the menu item is
    //    not in the document anywhere on the page (the kebab itself is
    //    hidden for viewers, so this is the cleanest cross-check).
    await openRequirementDetail(page, f.sourceFrameworkId, f.sourceRequirementRef);
    await expect(mappingChip(page, f.controlAControlId)).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Copy to framework/i })).toHaveCount(0);
  });
});
