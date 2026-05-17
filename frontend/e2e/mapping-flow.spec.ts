import {
  test,
  expect,
  request as pwRequest,
  APIRequestContext,
} from '@playwright/test';

/**
 * Control <-> Requirement Mapping UI — end-to-end CRUD coverage.
 *
 * Exercises the Mapping editor introduced in PR-A from both the
 * requirement-detail side (FrameworkDetail.tsx) and the control-detail
 * side (ControlDetail.tsx), plus per-role gating of the chip kebab
 * menu and the "Add mapping" button.
 *
 * Identity model:
 *   - Each scenario picks a storage state file produced by auth.setup.ts
 *     (playwright/.auth/<role>.json) via `test.use({ storageState })`.
 *   - Backend resource discovery (which framework / requirement / control
 *     to target) goes through a header-authenticated request context
 *     (`x-dev-user-id`) against the Org A admin, identical to the
 *     pattern used in tenant-isolation.spec.ts.
 *
 * Selectors:
 *   - Modal title is "Add mappings" (create) or "Edit mapping" (edit),
 *     per the locked contract in mapping-pr-a-contracts.md §3.4.
 *   - Chip list is `role="list"`, chips are `role="listitem"`.
 *   - Kebab triggers carry `aria-haspopup="menu"`. Menu items are
 *     `role="menuitem"`.
 *   - Mapping-type badges render the literal "primary" or "supporting"
 *     text on the chip; tests assert visible text, not Tailwind class.
 *
 * The spec does NOT depend on Tailwind class names, hex colors, or
 * pixel positions — only on ARIA roles, accessible names, and the
 * stable text content called out in the contract.
 */

// ---------------------------------------------------------------------------
// Seed fixtures (mirror services/shared/src/seed/seed-constants.ts).
// ---------------------------------------------------------------------------
const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

const URL_CONTROLS = 'http://127.0.0.1:3001';
const URL_FRAMEWORKS = 'http://127.0.0.1:3002';

// ---------------------------------------------------------------------------
// Shared discovery: pick a non-category requirement in some framework and a
// pair of unmapped controls we can wire up to it. Done once via the admin
// API context so per-role browser tests don't all repeat the search.
// ---------------------------------------------------------------------------
interface MappingFixture {
  frameworkId: string;
  requirementId: string;
  requirementRef: string;
  controlAId: string;
  controlBId: string;
}

let fixture: MappingFixture | undefined;
let adminApi: APIRequestContext | undefined;

async function discoverFixture(api: APIRequestContext): Promise<MappingFixture> {
  // 1. Pick the first framework that has at least one non-category
  //    requirement. The seed loads SOC 2 / ISO 27001 / NIST CSF / HIPAA
  //    / PCI by default, so this is normally a single hop.
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

  let chosenFwId: string | undefined;
  let chosenReq: any | undefined;
  for (const fw of frameworks) {
    const reqRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${fw.id}/requirements`);
    if (!reqRes.ok()) continue;
    const reqBody = await reqRes.json();
    const reqs: any[] = Array.isArray(reqBody)
      ? reqBody
      : (reqBody.data ?? reqBody.items ?? reqBody.requirements ?? []);
    const candidate = reqs.find((r) => !r.isCategory);
    if (candidate) {
      chosenFwId = fw.id;
      chosenReq = candidate;
      break;
    }
  }
  if (!chosenFwId || !chosenReq) {
    throw new Error('No framework with a non-category requirement found in seed');
  }

  // 2. Pick two controls that are NOT already mapped to this requirement.
  const ctrlRes = await api.get(`${URL_CONTROLS}/api/controls?limit=100`);
  if (!ctrlRes.ok()) {
    throw new Error(`Could not list controls: ${ctrlRes.status()}`);
  }
  const ctrlBody = await ctrlRes.json();
  const controls: any[] = Array.isArray(ctrlBody)
    ? ctrlBody
    : (ctrlBody.data ?? ctrlBody.items ?? ctrlBody.controls ?? []);
  const mappedIds = new Set<string>(
    (chosenReq.mappings ?? []).map((m: any) => m.control?.id ?? m.controlId),
  );
  const unmapped = controls.filter((c) => !mappedIds.has(c.id));
  if (unmapped.length < 2) {
    throw new Error('Need at least two unmapped controls to exercise multi-select');
  }

  return {
    frameworkId: chosenFwId,
    requirementId: chosenReq.id,
    requirementRef: chosenReq.reference ?? '',
    controlAId: unmapped[0].id,
    controlBId: unmapped[1].id,
  };
}

/** Delete every mapping currently attached to the fixture's requirement.
 *  Keeps the scenario tests idempotent across re-runs (each one assumes a
 *  known starting state). Failures are tolerated — best-effort cleanup. */
async function cleanRequirementMappings(api: APIRequestContext, requirementId: string) {
  const res = await api.get(`${URL_FRAMEWORKS}/api/mappings/by-requirement/${requirementId}`);
  if (!res.ok()) return;
  const body = await res.json();
  const items: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
  for (const m of items) {
    if (m.id) await api.delete(`${URL_FRAMEWORKS}/api/mappings/${m.id}`).catch(() => undefined);
  }
}

test.beforeAll(async () => {
  adminApi = await pwRequest.newContext({
    extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_A_ADMIN_ID },
  });
  fixture = await discoverFixture(adminApi);
});

test.afterAll(async () => {
  // Final tidy-up so the fixture row doesn't accumulate phantom mappings
  // across CI runs.
  if (adminApi && fixture) {
    await cleanRequirementMappings(adminApi, fixture.requirementId);
  }
  await adminApi?.dispose();
});

// ---------------------------------------------------------------------------
// Reusable helpers shared across describe blocks.
// ---------------------------------------------------------------------------

/** Navigate the SPA to the framework detail page and click into the chosen
 *  requirement so its detail panel renders. Tolerates the requirement
 *  living inside an expanded/collapsed category tree. */
async function openRequirementDetail(
  page: import('@playwright/test').Page,
  frameworkId: string,
  requirementRef: string,
) {
  await page.goto(`/frameworks/${frameworkId}`);
  await page.waitForLoadState('networkidle');

  // The requirement row carries the reference text in a stable column.
  // Click whichever row holds it; if it's nested in a collapsed category
  // we'll need to expand first, but in practice the seeded fixtures put
  // requirements at the top level.
  const row = page.getByText(requirementRef, { exact: true }).first();
  await row.click();

  // The detail panel renders "Mapped Controls" once selection lands.
  await expect(page.getByText(/Mapped Controls/i)).toBeVisible();
}

/** A chip element representing one mapping. `controlId` is the human
 *  identifier (e.g. CTRL-001), shown as monospaced text inside the chip. */
function mappingChip(page: import('@playwright/test').Page, identifier: string) {
  // Match a list item that contains the chosen control identifier.
  return page.getByRole('listitem').filter({ hasText: identifier });
}

// ---------------------------------------------------------------------------
// Scenario 1-4: adminA happy paths (create, edit, delete, control-side create)
// Storage state: playwright/.auth/adminA.json
// ---------------------------------------------------------------------------
test.describe('Mapping flow — adminA', () => {
  test.use({ storageState: 'playwright/.auth/adminA.json' });

  test.beforeEach(async () => {
    expect(fixture, 'fixture from beforeAll').toBeDefined();
    expect(adminApi, 'adminApi from beforeAll').toBeDefined();
    // Reset to "no mappings on the fixture requirement" so every test
    // starts from a known state regardless of order or retries.
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
  });

  test('creates two mappings (primary + supporting) from the requirement side', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // The contract puts an "Add mapping…" button above the Mapped
    // Controls chip list. The ellipsis character may be either "..."
    // or "…"; match by case-insensitive prefix to absorb both.
    await page.getByRole('button', { name: /Add mapping/i }).click();

    // Modal opens with the contract-specified title "Add mappings".
    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Add mappings/i)).toBeVisible();

    // Multi-select the two unmapped controls discovered in beforeAll.
    // Checkbox items are addressable by accessible name (the control id
    // is rendered inside each row label).
    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);
    const controlB = controls.find((c: any) => c.id === f.controlBId);
    await modal.getByRole('checkbox', { name: new RegExp(controlA.controlId, 'i') }).check();
    await modal.getByRole('checkbox', { name: new RegExp(controlB.controlId, 'i') }).check();

    // Advance to the per-row form. The contract uses a "Next" / "Continue"
    // affordance; either label is accepted.
    await modal.getByRole('button', { name: /Next|Continue/i }).click();

    // Row 1 — leave as primary (default). Row 2 — switch to supporting +
    // add notes. Rows expose their mappingType via a labeled select.
    const rowA = modal.getByRole('group').filter({ hasText: new RegExp(controlA.controlId, 'i') });
    const rowB = modal.getByRole('group').filter({ hasText: new RegExp(controlB.controlId, 'i') });
    await rowA.getByLabel(/mapping type/i).selectOption('primary');
    await rowB.getByLabel(/mapping type/i).selectOption('supporting');
    await rowB.getByLabel(/notes/i).fill('Compensating control covering scope gap');

    // Save and wait for the modal to close.
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // Both chips render with the right mappingType badge text.
    const chipA = mappingChip(page, controlA.controlId);
    const chipB = mappingChip(page, controlB.controlId);
    await expect(chipA).toBeVisible();
    await expect(chipB).toBeVisible();
    await expect(chipA).toContainText(/primary/i);
    await expect(chipB).toContainText(/supporting/i);
  });

  test('edits a mapping via the chip kebab menu', async ({ page }) => {
    const f = fixture!;
    // Pre-seed one mapping so we have something to edit.
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.frameworkId,
        requirementId: f.requirementId,
        controlId: f.controlAId,
        mappingType: 'primary',
      },
    });
    expect(seedRes.ok(), `seed mapping POST: ${seedRes.status()}`).toBeTruthy();

    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);

    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    const chip = mappingChip(page, controlA.controlId);
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(/primary/i);

    // Open kebab. The trigger carries aria-haspopup="menu" and an
    // accessible name referencing the control id (per contract §5.2).
    const kebab = chip.getByRole('button', { name: /Mapping actions/i });
    await kebab.click();
    await page.getByRole('menuitem', { name: /Edit/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Edit mapping/i)).toBeVisible();

    // Flip primary -> supporting and add notes.
    await modal.getByLabel(/mapping type/i).selectOption('supporting');
    await modal.getByLabel(/notes/i).fill('Recategorized after Q2 review');
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // Chip reflects the new state.
    await expect(chip).toContainText(/supporting/i);
    await expect(chip).not.toContainText(/primary/i);
  });

  test('deletes a mapping via the chip kebab menu', async ({ page }) => {
    const f = fixture!;
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.frameworkId,
        requirementId: f.requirementId,
        controlId: f.controlAId,
        mappingType: 'primary',
      },
    });
    expect(seedRes.ok()).toBeTruthy();
    const seeded = await seedRes.json();
    const mappingId: string = seeded.id ?? seeded.data?.id;
    expect(mappingId).toBeTruthy();

    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);

    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    const chip = mappingChip(page, controlA.controlId);
    await expect(chip).toBeVisible();

    await chip.getByRole('button', { name: /Mapping actions/i }).click();
    await page.getByRole('menuitem', { name: /Delete/i }).click();

    // Contract §5.1 calls for an inline confirm dialog (no separate
    // component). Accept either an alertdialog or a role="dialog"
    // depending on the implementation choice.
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await confirm.getByRole('button', { name: /Delete|Confirm|Remove/i }).click();

    await expect(chip).toBeHidden();

    // Backend confirms removal.
    const listRes = await adminApi!.get(
      `${URL_FRAMEWORKS}/api/mappings/by-requirement/${f.requirementId}`,
    );
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const items: any[] = Array.isArray(list) ? list : (list.data ?? list.items ?? []);
    expect(items.find((m) => m.id === mappingId)).toBeUndefined();
  });

  test('re-creates the same mapping from the control side', async ({ page }) => {
    const f = fixture!;
    // Start with the requirement having no mappings.
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // Walk into the control detail page and add a mapping back to the
    // original requirement.
    await page.goto(`/controls/${f.controlAId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Framework Mappings/i)).toBeVisible();

    await page.getByRole('button', { name: /Add mapping/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Add mappings/i)).toBeVisible();

    // control-to-requirements mode → stage 1 includes a framework
    // selector (contract §3.2). Pick the same framework that owns the
    // requirement.
    await modal.getByLabel(/framework/i).selectOption(f.frameworkId);

    // Multi-select the target requirement by reference.
    await modal
      .getByRole('checkbox', { name: new RegExp(f.requirementRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .check();
    await modal.getByRole('button', { name: /Next|Continue/i }).click();

    // Default mappingType primary is fine.
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // Chip appears on the control side.
    await expect(
      page.getByRole('listitem').filter({ hasText: new RegExp(f.requirementRef, 'i') }),
    ).toBeVisible();

    // And on the requirement side after we navigate back.
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);
    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);
    await expect(mappingChip(page, controlA.controlId)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: viewerA — read-only, no Add button, no kebab.
// ---------------------------------------------------------------------------
test.describe('Mapping flow — viewerA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/viewerA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    // Seed one mapping so the viewer has something to (not) interact with.
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
    await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: fixture!.frameworkId,
        requirementId: fixture!.requirementId,
        controlId: fixture!.controlAId,
        mappingType: 'primary',
      },
    });
  });

  test('viewer sees chips but no Add button and no kebab triggers', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // Chip renders (read-only).
    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);
    await expect(mappingChip(page, controlA.controlId)).toBeVisible();

    // No Add mapping button.
    await expect(page.getByRole('button', { name: /Add mapping/i })).toHaveCount(0);

    // No kebab triggers anywhere.
    await expect(page.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: complianceA — has controls:update (Add + Edit), lacks
// controls:delete (no Delete menu item; kebab still renders because Edit
// is available).
// ---------------------------------------------------------------------------
test.describe('Mapping flow — complianceA (create + edit, no delete)', () => {
  test.use({ storageState: 'playwright/.auth/complianceA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
  });

  test('compliance manager can create then edit a mapping; no Delete menu item', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // Add mapping is allowed.
    const addBtn = page.getByRole('button', { name: /Add mapping/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const modal = page.getByRole('dialog');
    await expect(modal.getByText(/Add mappings/i)).toBeVisible();

    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);
    await modal.getByRole('checkbox', { name: new RegExp(controlA.controlId, 'i') }).check();
    await modal.getByRole('button', { name: /Next|Continue/i }).click();
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // The newly created chip should be visible and editable, but not
    // deletable. Edit menu item shows; Delete menu item does not.
    const chip = mappingChip(page, controlA.controlId);
    await expect(chip).toBeVisible();

    await chip.getByRole('button', { name: /Mapping actions/i }).click();
    await expect(page.getByRole('menuitem', { name: /Edit/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Delete/i })).toHaveCount(0);

    // Exercise the edit path to prove it really works.
    await page.getByRole('menuitem', { name: /Edit/i }).click();
    await expect(modal.getByText(/Edit mapping/i)).toBeVisible();
    await modal.getByLabel(/mapping type/i).selectOption('supporting');
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();
    await expect(chip).toContainText(/supporting/i);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: auditorA — read-only, identical gating to viewerA.
// ---------------------------------------------------------------------------
test.describe('Mapping flow — auditorA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/auditorA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
    await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: fixture!.frameworkId,
        requirementId: fixture!.requirementId,
        controlId: fixture!.controlAId,
        mappingType: 'primary',
      },
    });
  });

  test('auditor sees chips but no Add button and no kebab triggers', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    const controls = await adminApi!
      .get(`${URL_CONTROLS}/api/controls?limit=200`)
      .then((r) => r.json())
      .then((b) => (Array.isArray(b) ? b : (b.data ?? b.items ?? b.controls ?? [])));
    const controlA = controls.find((c: any) => c.id === f.controlAId);
    await expect(mappingChip(page, controlA.controlId)).toBeVisible();

    await expect(page.getByRole('button', { name: /Add mapping/i })).toHaveCount(0);
    await expect(page.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });
});
