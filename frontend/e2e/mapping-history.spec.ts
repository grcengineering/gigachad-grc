import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * Mapping History Drawer + Restore — end-to-end coverage (PR-C1).
 *
 * Covers the history drawer introduced behind the chip kebab "History"
 * menu item on FrameworkDetail.tsx, plus the restore-from-snapshot
 * affordance inside the drawer. Mirrors the patterns established in
 * mapping-flow.spec.ts (PR-A):
 *
 *   - Storage state per role via `test.use({ storageState })`.
 *   - Backend fixture discovery through a header-authenticated
 *     APIRequestContext (`x-dev-user-id`) using the Org A admin id, so
 *     per-role browser tests do not all repeat the search.
 *   - Recursive walk into requirement `.children` to find a leaf
 *     (non-category) requirement — every seeded catalog (SOC 2 / ISO /
 *     HIPAA) puts leaves underneath category rows.
 *
 * Selectors: ARIA roles + accessible names only. No Tailwind class
 * names, no hex colors. The drawer dialog is addressed via
 * `aria-labelledby="mapping-history-drawer-title"` -> heading text
 * "Mapping change history"; history entries are `<article>` elements
 * with an `aria-label` containing the action verb ("Created",
 * "Updated", "Restored") and timestamp; the restore CTA is
 * `aria-label="Restore mapping to state from <timestamp>"`.
 */

// ---------------------------------------------------------------------------
// Seed fixtures (mirror services/shared/src/seed/seed-constants.ts).
// ---------------------------------------------------------------------------
const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

const URL_CONTROLS = 'http://127.0.0.1:3001';
const URL_FRAMEWORKS = 'http://127.0.0.1:3002';

// ---------------------------------------------------------------------------
// Shared discovery: pick a non-category requirement in some framework and a
// control we can wire up to it. Done once via the admin API context so per-
// role browser tests don't all repeat the search. Identical recursion shape
// to mapping-flow.spec.ts's discoverFixture so future seed reshuffles only
// need to be tracked once.
// ---------------------------------------------------------------------------
interface MappingFixture {
  frameworkId: string;
  requirementId: string;
  requirementRef: string;
  controlAId: string;
  controlAControlId: string;
}

let fixture: MappingFixture | undefined;
let adminApi: APIRequestContext | undefined;

async function discoverFixture(api: APIRequestContext): Promise<MappingFixture> {
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

  let chosenFwId: string | undefined;
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
      chosenFwId = fw.id;
      chosenReq = candidate;
      break;
    }
  }
  if (!chosenFwId || !chosenReq) {
    throw new Error(
      'No framework with a non-category requirement found in seed. ' +
        'Every seeded catalog has non-category leaves nested under categories — ' +
        'walk `.children` recursively.'
    );
  }

  // Pick a control NOT already mapped to this requirement so we can create
  // a fresh mapping per scenario (each test deletes its own mapping in
  // beforeEach via cleanRequirementMappings).
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
  const unmapped = controls.filter((c) => !mappedIds.has(c.id));
  if (unmapped.length < 1) {
    throw new Error('Need at least one unmapped control to drive the history flows');
  }

  return {
    frameworkId: chosenFwId,
    requirementId: chosenReq.id,
    requirementRef: chosenReq.reference ?? '',
    controlAId: unmapped[0].id,
    controlAControlId: unmapped[0].controlId,
  };
}

/** Delete every mapping currently attached to the fixture's requirement so
 *  the next scenario starts clean. The history rows themselves are
 *  preserved across deletes (mappingId is nulled out on hard-delete; the
 *  audit trail is by design append-only) — but each scenario creates a
 *  fresh mapping with its own brand-new history chain, so that doesn't
 *  affect isolation. */
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
  if (adminApi && fixture) {
    await cleanRequirementMappings(adminApi, fixture.requirementId);
  }
  await adminApi?.dispose();
});

// ---------------------------------------------------------------------------
// Reusable helpers.
// ---------------------------------------------------------------------------

/** Navigate to FrameworkDetail and click into the chosen requirement so its
 *  Mapped Controls panel renders. */
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

/** A chip element representing one mapping. `identifier` is the human
 *  control id (e.g. CTRL-001), rendered as monospaced text inside the
 *  chip. */
function mappingChip(page: import('@playwright/test').Page, identifier: string) {
  return page.getByRole('listitem').filter({ hasText: identifier });
}

/** Open the history drawer for a given chip via the kebab → History menu
 *  item. Returns the drawer dialog locator (already asserted visible). */
async function openHistoryDrawer(page: import('@playwright/test').Page, identifier: string) {
  const chip = mappingChip(page, identifier);
  await expect(chip).toBeVisible();
  // The kebab is opacity-0 until the chip is hovered or focused; hover
  // ensures it becomes interactive even when running headless. focus()
  // would also work, but hover matches user intent and Playwright's
  // chip locator already has `pointer: cursor`.
  await chip.hover();
  await chip.getByRole('button', { name: /Mapping actions/i }).click();
  await page.getByRole('menuitem', { name: /^History$/i }).click();
  const drawer = page.getByRole('dialog', { name: /Mapping change history/i });
  await expect(drawer).toBeVisible();
  return drawer;
}

/** Close the drawer via its dedicated close button. The contract uses an
 *  `aria-label="Close history drawer"` on the X icon (per
 *  MappingHistoryDrawer.tsx §header). */
async function closeHistoryDrawer(
  page: import('@playwright/test').Page,
  drawer: import('@playwright/test').Locator
) {
  await drawer.getByRole('button', { name: /Close history drawer/i }).click();
  await expect(page.getByRole('dialog', { name: /Mapping change history/i })).toBeHidden();
}

// ---------------------------------------------------------------------------
// Scenario 1-3: adminA — history visible, edits append, restore reverts.
// Storage state: playwright/.auth/adminA.json
// ---------------------------------------------------------------------------
test.describe('Mapping history — adminA', () => {
  test.use({ storageState: 'playwright/.auth/adminA.json' });

  test.beforeEach(async () => {
    expect(fixture, 'fixture from beforeAll').toBeDefined();
    expect(adminApi, 'adminApi from beforeAll').toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
  });

  test('opens history drawer for a newly-created mapping and shows the Created entry', async ({
    page,
  }) => {
    const f = fixture!;
    // Seed a single fresh mapping — this generates exactly one
    // history row with action="create".
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.frameworkId,
        requirementId: f.requirementId,
        controlId: f.controlAId,
        mappingType: 'primary',
      },
    });
    expect(seedRes.ok(), `seed mapping POST: ${seedRes.status()}`).toBeTruthy();

    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    const drawer = await openHistoryDrawer(page, f.controlAControlId);

    // At least one entry rendered — the Created event. Entries are
    // <article> with an accessible name that starts with the action
    // verb label ("Created", "Updated", "Restored").
    const entries = drawer.getByRole('article');
    await expect(entries.first()).toBeVisible();
    await expect(entries).toHaveCount(1);

    // The single entry shows the "Created" badge + the initial state
    // rows (mappingType: Primary, notes: —).
    await expect(drawer.getByText(/^Created$/)).toBeVisible();
    await expect(drawer.getByText(/Initial state/i)).toBeVisible();
    await expect(drawer.getByText(/Primary/)).toBeVisible();
  });

  test('edits a mapping then sees a new Updated entry with a diff', async ({ page }) => {
    const f = fixture!;
    // Pre-seed so we have something to edit.
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: f.frameworkId,
        requirementId: f.requirementId,
        controlId: f.controlAId,
        mappingType: 'primary',
      },
    });
    expect(seedRes.ok()).toBeTruthy();

    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // Edit primary → supporting + notes via the chip kebab → Edit modal.
    const chip = mappingChip(page, f.controlAControlId);
    await expect(chip).toBeVisible();
    await chip.hover();
    await chip.getByRole('button', { name: /Mapping actions/i }).click();
    await page.getByRole('menuitem', { name: /^Edit$/i }).click();

    const modal = page.getByRole('dialog', { name: /Edit mapping/i });
    await expect(modal).toBeVisible();
    await modal.getByLabel(/mapping type/i).selectOption('supporting');
    await modal.getByLabel(/notes/i).fill('Recategorized to supporting after Q2 review');
    await modal.getByRole('button', { name: /^Save$/i }).click();
    await expect(modal).toBeHidden();

    // Chip reflects the new state before we open history.
    await expect(chip).toContainText(/supporting/i);

    // Now open history — newest entry first per the service's
    // `orderBy: { changedAt: 'desc' }` contract.
    const drawer = await openHistoryDrawer(page, f.controlAControlId);
    const entries = drawer.getByRole('article');
    await expect(entries).toHaveCount(2);

    // First entry is the Updated event (newest); second is Created.
    await expect(entries.nth(0)).toContainText(/^Updated$/);
    await expect(entries.nth(1)).toContainText(/^Created$/);

    // Diff renders the field-label + before/after values. The
    // contract uses the label "Mapping type" (cf. FIELD_LABELS in
    // MappingHistoryDrawer.tsx) and the arrow "→" between values.
    await expect(entries.nth(0).getByText(/Mapping type/)).toBeVisible();
    await expect(entries.nth(0).getByText('→')).toBeVisible();
    // Old value (Primary, line-through) and new value (Supporting)
    // both appear inside the Updated entry.
    await expect(entries.nth(0).getByText(/Primary/)).toBeVisible();
    await expect(entries.nth(0).getByText(/Supporting/)).toBeVisible();
  });

  test('restores an older entry; mapping reverts and a Restored event appears', async ({
    page,
  }) => {
    const f = fixture!;
    // Seed primary, then PATCH to supporting via API so we get exactly
    // two history rows (create + update) before the UI ever touches it.
    // Driving the second event via API keeps the test focused on the
    // restore flow rather than re-exercising the edit path.
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

    const patchRes = await adminApi!.patch(`${URL_FRAMEWORKS}/api/mappings/${mappingId}`, {
      data: { mappingType: 'supporting', notes: 'temporary downgrade' },
    });
    expect(patchRes.ok()).toBeTruthy();

    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // Chip is currently "supporting" — verify before restore.
    const chip = mappingChip(page, f.controlAControlId);
    await expect(chip).toContainText(/supporting/i);

    const drawer = await openHistoryDrawer(page, f.controlAControlId);
    let entries = drawer.getByRole('article');
    await expect(entries).toHaveCount(2);

    // Restore the OLDER entry (Created event, at index 1 because list is
    // newest-first). The restore CTA on that entry carries
    // `aria-label="Restore mapping to state from <timestamp>"`. The
    // newest entry never shows a restore button (per
    // HistoryEntryItem: `restoreVisible = canRestore && index > 0`).
    const olderEntry = entries.nth(1);
    await expect(olderEntry).toContainText(/^Created$/);
    const restoreCta = olderEntry.getByRole('button', { name: /Restore mapping to state from/i });
    await expect(restoreCta).toBeVisible();
    await restoreCta.click();

    // Inline confirm UI appears with an optional reason input.
    await olderEntry.getByLabel(/Restore reason/i).fill('Reverting downgrade per audit');
    await olderEntry.getByRole('button', { name: /^Confirm$/i }).click();

    // After the restore completes, a new "Restored" entry appears at
    // the top of the drawer (the drawer auto-refetches via
    // invalidateQueries on the ['mappings','history',mappingId] key).
    await expect(drawer.getByRole('article').first()).toContainText(/^Restored$/, {
      timeout: 10_000,
    });
    entries = drawer.getByRole('article');
    await expect(entries).toHaveCount(3);
    await expect(entries.nth(0)).toContainText(/^Restored$/);

    // Close the drawer to inspect the chip — it should now read
    // "primary" again, reflecting the restored snapshot.
    await closeHistoryDrawer(page, drawer);
    await expect(chip).toContainText(/primary/i);
    await expect(chip).not.toContainText(/supporting/i);

    // Backend agrees.
    const verifyRes = await adminApi!.get(`${URL_FRAMEWORKS}/api/mappings/${mappingId}`);
    expect(verifyRes.ok()).toBeTruthy();
    const verified = await verifyRes.json();
    const verifiedType = verified.mappingType ?? verified.data?.mappingType;
    expect(verifiedType).toBe('primary');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: viewerA — drawer is read-only.
//
// Per the locked contract on this branch (FrameworkDetail.tsx §kebab),
// the History menu item is visible for ALL roles (even viewers), because
// `controls:read` is sufficient to view the audit trail. The drawer opens
// but the "Restore this version" buttons are hidden — `canRestore` in
// MappingHistoryDrawer.tsx is gated on `controls:update` which viewerA
// lacks. Edit and Delete menu items remain hidden for the viewer (those
// are gated on controls:update / controls:delete respectively).
// ---------------------------------------------------------------------------
test.describe('Mapping history — viewerA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/viewerA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
    // Seed a mapping AND mutate it once, so the drawer has two entries
    // (create + update). With only a single Created entry the drawer
    // wouldn't show ANY restore CTA even for admin (older-entry-only
    // gating), which would mask the read-only assertion below.
    const seedRes = await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: fixture!.frameworkId,
        requirementId: fixture!.requirementId,
        controlId: fixture!.controlAId,
        mappingType: 'primary',
      },
    });
    const seeded = await seedRes.json();
    const mappingId: string = seeded.id ?? seeded.data?.id;
    await adminApi!.patch(`${URL_FRAMEWORKS}/api/mappings/${mappingId}`, {
      data: { mappingType: 'supporting' },
    });
  });

  test('viewer can open the drawer but sees no restore controls', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    const chip = mappingChip(page, f.controlAControlId);
    await expect(chip).toBeVisible();

    // The chip still renders the kebab (History is allowed for read-only
    // roles). Open it — Edit/Delete should be absent, History present.
    await chip.hover();
    await chip.getByRole('button', { name: /Mapping actions/i }).click();
    await expect(page.getByRole('menuitem', { name: /^Edit$/i })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: /^Delete$/i })).toHaveCount(0);
    const historyItem = page.getByRole('menuitem', { name: /^History$/i });
    await expect(historyItem).toBeVisible();
    await historyItem.click();

    const drawer = page.getByRole('dialog', { name: /Mapping change history/i });
    await expect(drawer).toBeVisible();

    // Both entries render.
    const entries = drawer.getByRole('article');
    await expect(entries).toHaveCount(2);

    // NO restore CTA anywhere in the drawer — neither on the newest
    // entry (gated by `index > 0`) nor on the older Created entry
    // (gated by `canRestore`, which is false for viewers).
    await expect(
      drawer.getByRole('button', { name: /Restore mapping to state from/i })
    ).toHaveCount(0);
    await expect(drawer.getByRole('button', { name: /Restore this version/i })).toHaveCount(0);
  });
});
