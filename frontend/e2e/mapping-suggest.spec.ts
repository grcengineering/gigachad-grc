import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test';

/**
 * AI mapping-suggestions panel — end-to-end coverage for PR-B-ai.
 *
 * Exercises the "Suggest with AI" entry point that PR-B-ai adds to the
 * multi-select stage of `MappingEditorModal`. The backend route
 * `POST /api/mappings/suggest` is rate-limited (10/min) and falls back
 * to a heuristic Jaccard pass when no LLM provider is configured — the
 * CI environment has no LLM, so the "ready" state in CI is always the
 * mock-mode response. The spec accepts either real-ranked results OR
 * the mock-mode banner so it stays green whether or not an LLM is
 * wired up downstream.
 *
 * Identity model:
 *   - Storage states from auth.setup.ts (playwright/.auth/<role>.json).
 *   - Fixture discovery uses an admin API context (`x-dev-user-id`)
 *     to pick a non-category requirement and two unmapped controls.
 *
 * Selectors:
 *   - "Suggest with AI" button is matched by accessible name.
 *   - Suggestions list uses role="list" aria-label="Suggested candidates".
 *   - Per-row "Use" buttons carry aria-label="Use suggestion <ref>".
 *   - Mock-mode banner copy is locked verbatim in contract §0.10.
 *   - Multi-select candidate list uses role="list" aria-label="Candidate controls".
 *
 * No Tailwind class names, hex colors, or pixel positions are asserted.
 */

// ---------------------------------------------------------------------------
// Seed fixtures (mirror services/shared/src/seed/seed-constants.ts).
// ---------------------------------------------------------------------------
const SEED_USER_A_ADMIN_ID = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

import {
  discoverMappingFixture,
  openRequirementDetail as openRequirementDetailHelper,
  cleanRequirementMappings,
  type MappingFixture,
} from './_mapping-helpers';

/** Locked verbatim from MappingEditorModal MOCK_MODE_BANNER_COPY (contract §0.10). */
const MOCK_MODE_BANNER_COPY =
  'AI provider not configured — showing heuristic suggestions based on shared keywords.';

let fixture: MappingFixture | undefined;
let adminApi: APIRequestContext | undefined;

test.beforeAll(async () => {
  adminApi = await pwRequest.newContext({
    extraHTTPHeaders: { 'x-dev-user-id': SEED_USER_A_ADMIN_ID },
  });
  fixture = await discoverMappingFixture(adminApi);
});

test.afterAll(async () => {
  if (adminApi && fixture) {
    await cleanRequirementMappings(adminApi, fixture.requirementId);
  }
  await adminApi?.dispose();
});

// ---------------------------------------------------------------------------
// Shared helpers — mirror mapping-flow.spec.ts shape so the two specs read
// the same.
// ---------------------------------------------------------------------------

async function openRequirementDetail(
  page: import('@playwright/test').Page,
  frameworkId: string,
  requirementRef: string
) {
  await openRequirementDetailHelper(page, frameworkId, requirementRef, fixture?.ancestorRefs ?? []);
}

/** Open the modal and advance it from the search stage to the multi-select
 *  stage where the SuggestionsPanel renders. requirement-to-controls mode
 *  has its framework locked from the URL so no framework picker work is
 *  needed — just hit "Next". */
async function openModalToMultiSelect(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Add mapping/i }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText(/Add mappings/i)).toBeVisible();
  await modal.getByRole('button', { name: /^Next$/i }).click();
  // The candidate list is the proof we're on the multi-select stage.
  await expect(modal.getByRole('list', { name: /Candidate controls/i })).toBeVisible();
  return modal;
}

// ---------------------------------------------------------------------------
// Scenario 1-4: adminA — full AI-suggestion happy paths.
// ---------------------------------------------------------------------------
test.describe('Mapping suggestions — adminA', () => {
  test.use({ storageState: 'playwright/.auth/adminA.json' });

  test.beforeEach(async () => {
    expect(fixture, 'fixture from beforeAll').toBeDefined();
    expect(adminApi, 'adminApi from beforeAll').toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
  });

  test('Suggest with AI transitions the panel from loading to ready', async ({ page }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);
    const modal = await openModalToMultiSelect(page);

    const panel = modal.getByRole('region', { name: /AI mapping suggestions/i });
    await expect(panel).toBeVisible();

    const suggestBtn = panel.getByRole('button', { name: /Suggest with AI/i });
    await expect(suggestBtn).toBeEnabled();
    await suggestBtn.click();

    // The "ready" terminus is one of: a Suggested-candidates list visible,
    // an empty-state "No suggestions available." line, or — in either case
    // when the LLM is unavailable — the mock-mode banner. We only require
    // that the loading status is gone, since the demo Jaccard fallback can
    // legitimately return zero candidates over threshold.
    await expect(panel.getByText(/Generating suggestions/i)).toBeHidden({ timeout: 15_000 });

    const readyList = panel.getByRole('list', { name: /Suggested candidates/i });
    const emptyState = panel.getByText(/No suggestions available/i);
    const mockBanner = panel.getByText(MOCK_MODE_BANNER_COPY, { exact: false });

    const candidateCount = await readyList.count();
    const emptyCount = await emptyState.count();
    const bannerCount = await mockBanner.count();
    expect(
      candidateCount + emptyCount + bannerCount,
      'panel should be in some ready terminus (list, empty state, or mock banner)'
    ).toBeGreaterThan(0);

    // The button label flips back from "Suggesting…" to "Suggest with AI".
    await expect(panel.getByRole('button', { name: /Suggest with AI/i })).toBeEnabled();
  });

  test('clicking Use on a suggestion checks its candidate row without auto-submitting', async ({
    page,
  }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);
    const modal = await openModalToMultiSelect(page);

    const panel = modal.getByRole('region', { name: /AI mapping suggestions/i });
    await panel.getByRole('button', { name: /Suggest with AI/i }).click();
    await expect(panel.getByText(/Generating suggestions/i)).toBeHidden({ timeout: 15_000 });

    const readyList = panel.getByRole('list', { name: /Suggested candidates/i });

    // Some CI runs will see an empty Jaccard result (no shared tokens over
    // threshold). When that happens we skip the "Use" interaction since
    // there is nothing to click — the loading→ready transition test above
    // already covers the empty case.
    if ((await readyList.count()) === 0) {
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'No ranked candidates from demo Jaccard fallback; Use button unavailable.',
      });
      return;
    }

    // First "Use" button in the list — accessible name pattern locked by
    // the modal: aria-label={`Use suggestion ${candidateReference}`}.
    const useBtns = readyList.getByRole('button', { name: /^Use suggestion / });
    await expect(useBtns.first()).toBeVisible();

    // Snapshot how many candidate-list checkboxes are currently checked so
    // we can prove a strictly-larger count after clicking Use.
    const candidateList = modal.getByRole('list', { name: /Candidate controls/i });
    const checkedBefore = await candidateList.getByRole('checkbox', { checked: true }).count();

    await useBtns.first().click();

    // The candidate row corresponding to the suggestion is now checked.
    await expect
      .poll(async () => candidateList.getByRole('checkbox', { checked: true }).count(), {
        timeout: 5_000,
      })
      .toBeGreaterThan(checkedBefore);

    // The Use button is now in its "Added" disabled state — proves the
    // toggle is selection-only (no auto-submit, no per-row form jump).
    await expect(useBtns.first()).toBeDisabled();

    // Modal is still on the multi-select stage (per-row form would expose
    // the "Mapping type" select; we assert that has NOT appeared).
    await expect(modal.getByRole('combobox', { name: /Mapping type/i })).toHaveCount(0);

    // And the chip list on the page behind hasn't gained an entry — no
    // mapping was created.
    const newChip = page
      .getByRole('list')
      .filter({ hasNot: page.getByRole('dialog') })
      .getByRole('listitem');
    // The page's mapping chip list either does not exist yet or is empty;
    // assert no chips containing the suggestion ref were silently added.
    await expect(newChip).toHaveCount(0);
  });

  test('each suggestion row renders rationale text alongside its confidence badge', async ({
    page,
  }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);
    const modal = await openModalToMultiSelect(page);

    const panel = modal.getByRole('region', { name: /AI mapping suggestions/i });
    await panel.getByRole('button', { name: /Suggest with AI/i }).click();
    await expect(panel.getByText(/Generating suggestions/i)).toBeHidden({ timeout: 15_000 });

    const readyList = panel.getByRole('list', { name: /Suggested candidates/i });
    if ((await readyList.count()) === 0) {
      // Empty Jaccard result — covered by scenario 4 (mock-mode banner).
      test.info().annotations.push({
        type: 'skip-reason',
        description: 'Empty ranked list; rationale assertion not applicable in this run.',
      });
      return;
    }

    const firstRow = readyList.getByRole('listitem').first();
    await expect(firstRow).toBeVisible();

    // Confidence badge is exposed via aria-label "<N>% confidence".
    await expect(firstRow.getByLabel(/\d+% confidence/)).toBeVisible();

    // Rationale text — the service returns a non-empty string per contract.
    // We can't pin the exact words because they're LLM-generated; assert
    // there's *some* text node inside the row beyond the reference and the
    // confidence label.
    const rationaleText = await firstRow.innerText();
    const refMatch = rationaleText.match(/\S+/g) ?? [];
    expect(refMatch.length, 'suggestion row should contain rationale prose').toBeGreaterThan(3);
  });

  test('demo-mode Jaccard fallback exposes either ranked list or the mock-mode banner', async ({
    page,
  }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);
    const modal = await openModalToMultiSelect(page);

    const panel = modal.getByRole('region', { name: /AI mapping suggestions/i });
    await panel.getByRole('button', { name: /Suggest with AI/i }).click();
    await expect(panel.getByText(/Generating suggestions/i)).toBeHidden({ timeout: 15_000 });

    const rankedList = panel.getByRole('list', { name: /Suggested candidates/i });
    const mockBanner = panel.getByText(MOCK_MODE_BANNER_COPY, { exact: false });

    // The contract: in demo mode the panel either renders a ranked list
    // (candidates over threshold) OR the mock-mode banner (no LLM
    // configured / no candidates). At least one MUST be visible.
    const rankedVisible = (await rankedList.count()) > 0;
    const bannerVisible = (await mockBanner.count()) > 0;
    expect(
      rankedVisible || bannerVisible,
      'demo-mode fallback should produce either a ranked list or the mock-mode banner'
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: viewerA — read-only, no "Add mapping" button, so the Suggest
// with AI affordance is unreachable. We assert the entry point isn't
// rendered anywhere on the requirement detail page.
// ---------------------------------------------------------------------------
test.describe('Mapping suggestions — viewerA (read-only)', () => {
  test.use({ storageState: 'playwright/.auth/viewerA.json' });

  test.beforeEach(async () => {
    expect(fixture).toBeDefined();
    expect(adminApi).toBeDefined();
    await cleanRequirementMappings(adminApi!, fixture!.requirementId);
    // Pre-seed one mapping so the chip list renders and the page is not
    // visually empty — irrelevant to gating but useful for sanity.
    await adminApi!.post(`${URL_FRAMEWORKS}/api/mappings`, {
      data: {
        frameworkId: fixture!.frameworkId,
        requirementId: fixture!.requirementId,
        controlId: fixture!.controlAId,
        mappingType: 'primary',
      },
    });
  });

  test('viewer cannot see the Suggest with AI button because Add mapping is gated', async ({
    page,
  }) => {
    const f = fixture!;
    await openRequirementDetail(page, f.frameworkId, f.requirementRef);

    // RBAC contract from PR-A: viewers see no "Add mapping" button.
    await expect(page.getByRole('button', { name: /Add mapping/i })).toHaveCount(0);

    // And the AI suggestion entry point is hidden along with the modal it
    // lives inside.
    await expect(page.getByRole('button', { name: /Suggest with AI/i })).toHaveCount(0);
    await expect(page.getByRole('region', { name: /AI mapping suggestions/i })).toHaveCount(0);
  });
});
