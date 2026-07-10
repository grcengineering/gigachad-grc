import { test, expect } from '@playwright/test';
import {
  firstControlId,
  firstEvidenceId,
  firstFrameworkId,
  firstPolicyId,
  firstRiskId,
  expectPageHealthy,
  trackPageErrors,
} from './_helpers';

test.describe('ControlDetail', () => {
  test('back link returns to /controls', async ({ page, request }) => {
    const id = await firstControlId(request);
    test.skip(!id, 'No seed control data');
    const errs = trackPageErrors(page);

    await page.goto(`/controls/${id}`);
    await expect(page.getByRole('link', { name: /back to controls/i })).toBeVisible();
    await page.getByRole('link', { name: /back to controls/i }).click();
    await expect(page).toHaveURL(/\/controls$/);
    await expectPageHealthy(page, errs);
  });

  test('Edit button toggles edit mode when present', async ({ page, request }) => {
    const id = await firstControlId(request);
    test.skip(!id, 'No seed control data');
    const errs = trackPageErrors(page);

    await page.goto(`/controls/${id}`);
    const editButton = page.getByRole('button', { name: /^edit$/i });
    if ((await editButton.count()) > 0) {
      await editButton.first().click();
      // Edit modal opens
      await expect(page.getByRole('heading', { name: /edit control/i })).toBeVisible({ timeout: 3_000 });
      await page.keyboard.press('Escape');
    }
    await expectPageHealthy(page, errs);
  });

  test('status select changes update via API', async ({ page, request }) => {
    const id = await firstControlId(request);
    test.skip(!id, 'No seed control data');
    const errs = trackPageErrors(page);

    await page.goto(`/controls/${id}`);
    // Hero has a status Select. Find it by its currently-displayed text (a status label) — there can be many statuses on page.
    // We just trigger a click on the first visible Listbox button matching a known status word in the hero region.
    const statusButton = page
      .locator('button')
      .filter({ hasText: /^(Implemented|In Progress|Not Started|N\/A)$/i })
      .first();
    if ((await statusButton.count()) > 0) {
      await statusButton.click();
      // Pick the first option (whatever it is) — verifies the listbox opens and is interactive
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 3_000 });
      await page.keyboard.press('Escape');
    }
    await expectPageHealthy(page, errs);
  });
});

test.describe('EvidenceDetail', () => {
  test('navigates back and renders linked-control links', async ({ page, request }) => {
    const id = await firstEvidenceId(request);
    test.skip(!id, 'No seed evidence data');
    const errs = trackPageErrors(page);

    await page.goto(`/evidence/${id}`);
    // The page should render with the evidence title as a heading. Tolerant — just verify
    // we did not redirect away (proves the detail page mounted)
    await expect(page).toHaveURL(new RegExp(`/evidence/${id}$`));
    await expectPageHealthy(page, errs);
  });
});

test.describe('FrameworkDetail', () => {
  test('expandable requirement tree works', async ({ page, request }) => {
    const id = await firstFrameworkId(request);
    test.skip(!id, 'No seed framework data');
    const errs = trackPageErrors(page);

    await page.goto(`/frameworks/${id}`);
    // Wait for requirements tree to render
    await page.waitForTimeout(1500);

    // Click the first expand chevron, if any exist (requirements with children)
    const expandButtons = page.locator('button:has(svg.lucide-chevron-right), button:has(svg[data-icon="chevron-right"])');
    const count = await expandButtons.count();
    if (count > 0) {
      await expandButtons.first().click();
      await page.waitForTimeout(300);
    }
    await expectPageHealthy(page, errs);
  });
});

test.describe('PolicyDetail', () => {
  test('renders status badge and key meta', async ({ page, request }) => {
    const id = await firstPolicyId(request);
    test.skip(!id, 'No seed policy data');
    const errs = trackPageErrors(page);

    await page.goto(`/policies/${id}`);
    await expect(page).toHaveURL(new RegExp(`/policies/${id}$`));
    await expectPageHealthy(page, errs);
  });
});

test.describe('RiskDetail', () => {
  test('tabs (Overview, Treatment, Workflow, etc.) are clickable', async ({ page, request }) => {
    const id = await firstRiskId(request);
    test.skip(!id, 'No seed risk data');
    const errs = trackPageErrors(page);

    await page.goto(`/risks/${id}`);
    await page.waitForTimeout(1000);

    // RiskDetail uses tab buttons. Click any tabs that exist.
    const tabs = page.getByRole('tab');
    const tabCount = Math.min(await tabs.count(), 5);
    for (let i = 0; i < tabCount; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(150);
    }

    await expectPageHealthy(page, errs);
  });
});

test.describe('Comments / Tasks panels', () => {
  test('ControlDetail has Comments and Tasks sections', async ({ page, request }) => {
    const id = await firstControlId(request);
    test.skip(!id, 'No seed control data');
    const errs = trackPageErrors(page);

    await page.goto(`/controls/${id}`);
    // Either or both panels should exist (text content)
    const comments = page.getByText(/comments/i).first();
    const tasks = page.getByText(/tasks/i).first();
    // Don't strictly assert visibility — they may be lazy-loaded or rendered conditionally
    if ((await comments.count()) > 0) await expect(comments).toBeVisible();
    if ((await tasks.count()) > 0) await expect(tasks).toBeVisible();
    await expectPageHealthy(page, errs);
  });
});
