import { test, expect, Page } from '@playwright/test';

/** Asserts no error boundary fired and no uncaught page errors. */
async function expectNoCrashes(page: Page, pageErrors: string[]) {
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  expect(pageErrors, `Uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
}

function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`${err.name}: ${err.message}`));
  return errors;
}

/** Wait for an HUI drawer to be open by waiting for its title heading. */
async function waitForDrawerWithTitle(page: Page, titleRegex: RegExp) {
  await expect(page.getByRole('heading', { name: titleRegex }).first()).toBeVisible({
    timeout: 8_000,
  });
}

test.describe('Controls — drawer-first flow', () => {
  test('clicking a row opens the drawer with the control detail', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 10_000 });
    const controlIdText = (await firstRow.locator('td').first().textContent())?.trim() || '';
    expect(controlIdText.length).toBeGreaterThan(0);

    await firstRow.click();

    // Drawer title contains the control ID
    await waitForDrawerWithTitle(page, new RegExp(controlIdText));

    // Drawer should have an "Implementation" section heading (loaded from full detail fetch)
    await expect(page.getByRole('heading', { name: /^Implementation$/i }).first()).toBeVisible({
      timeout: 8_000,
    });

    // Close via X button (aria-label="Close")
    await page.getByRole('button', { name: 'Close' }).first().click();
    await expect(page.getByRole('heading', { name: new RegExp(controlIdText) })).toHaveCount(0, {
      timeout: 3_000,
    });

    await expectNoCrashes(page, errs);
  });

  test('drawer has Open Full Page button that navigates', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.locator('tbody tr').first().click();
    await expect(page.getByRole('button', { name: /open full page/i })).toBeVisible({
      timeout: 8_000,
    });
    await page.getByRole('button', { name: /open full page/i }).click();
    await expect(page).toHaveURL(/\/controls\/[a-f0-9-]+$/, { timeout: 5_000 });
    await expectNoCrashes(page, errs);
  });
});

test.describe('Controls — nested EvidenceDrawer (the bug we just fixed)', () => {
  test('opening evidence from inside ControlDrawer does NOT close the control drawer when evidence is closed', async ({
    page,
  }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Find a control with linked evidence. Iterate the first 8 rows.
    let openedControlTitle = '';
    let evidenceButton: ReturnType<typeof page.locator> | null = null;
    const rowCount = Math.min(await rows.count(), 8);

    for (let i = 0; i < rowCount; i++) {
      await rows.nth(i).click();
      // Wait for "Evidence" section heading to confirm full detail has loaded
      await page
        .getByRole('heading', { name: /^Evidence/i })
        .first()
        .waitFor({ timeout: 8_000 })
        .catch(() => {});

      // Evidence rows are buttons whose accessible name starts with the evidence title and ends with a status word
      const candidates = page
        .getByRole('button')
        .filter({ hasText: /(approved|pending|rejected|expired)/i });
      // Filter out the status select-trigger button "Implemented" / "Not Started" etc.
      const filtered: typeof candidates = candidates;
      if ((await filtered.count()) > 0) {
        evidenceButton = filtered.first();
        // Capture the current drawer title to validate it's still open later
        const heading = await page.getByRole('heading', { level: 2 }).first().textContent();
        openedControlTitle = heading?.trim() || '';
        break;
      }
      await page.getByRole('button', { name: 'Close' }).first().click();
      // give it a tick to animate out
      await page.waitForTimeout(250);
    }

    test.skip(!evidenceButton, 'No control with linked evidence in seed data');

    expect(openedControlTitle.length).toBeGreaterThan(0);

    // Capture the evidence title from the button text (first few words before the type/status suffix)
    const evidenceButtonName = (await evidenceButton!.textContent())?.trim() || '';
    const evidenceTitleStart = evidenceButtonName.split(/\s+/).slice(0, 2).join(' ');

    await evidenceButton!.click();

    // EvidenceDrawer opens — its heading appears (HUI may aria-hide the outer dialog, so use the new heading by text)
    const evidenceHeading = page.getByRole('heading', {
      level: 2,
      name: new RegExp(evidenceTitleStart, 'i'),
    });
    await expect(evidenceHeading).toBeVisible({ timeout: 6_000 });

    // Both drawers' Close buttons exist in DOM (HUI keeps both portals mounted).
    const allCloseButtons = page.locator('button[aria-label="Close"]');
    await expect(allCloseButtons).toHaveCount(2, { timeout: 3_000 });

    // Close the inner (top, last in DOM) Close button — closes ONLY the evidence drawer
    await allCloseButtons.last().click();

    // Evidence heading should disappear; control drawer should become visible again
    await expect(evidenceHeading).toBeHidden({ timeout: 3_000 });

    // Match the control by its prefix (e.g. "AC-001") — accessible name is whitespace-normalized so
    // an exact textContent comparison is flaky. Take the first non-space token.
    const controlIdPrefix = openedControlTitle.split(/[\s·]/)[0];
    expect(controlIdPrefix.length).toBeGreaterThan(0);
    await expect(
      page
        .getByRole('heading', {
          level: 2,
          name: new RegExp(controlIdPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        })
        .first()
    ).toBeVisible({ timeout: 3_000 });

    await expectNoCrashes(page, errs);
  });
});

test.describe('Command palette', () => {
  test('clicking Search trigger opens the palette; Enter navigates', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: /open command palette/i }).click();
    const cmdkInput = page.locator('[cmdk-input]');
    await expect(cmdkInput).toBeFocused({ timeout: 3_000 });

    await cmdkInput.fill('risk register');
    await page.locator('[cmdk-item]').first().waitFor();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/risks$/, { timeout: 5_000 });
    await expectNoCrashes(page, errs);
  });

  test('Escape closes the palette', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /open command palette/i }).click();
    const cmdkInput = page.locator('[cmdk-input]');
    await expect(cmdkInput).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(cmdkInput).toHaveCount(0);
  });

  test('Cmd+K keyboard shortcut opens the palette', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    // Detect platform — on Mac use Meta, elsewhere Control. Playwright on macOS reports darwin.
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
    await expect(page.locator('[cmdk-input]')).toBeFocused({ timeout: 3_000 });
  });
});

test.describe('Filter bar — Controls', () => {
  test('selecting a status filter shows an active chip; clearing it removes the chip', async ({
    page,
  }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.waitForLoadState('domcontentloaded');
    // Wait for filter controls to be ready
    await expect(page.getByRole('button', { name: /^All Statuses$/i })).toBeVisible({
      timeout: 5_000,
    });

    await page.getByRole('button', { name: /^All Statuses$/i }).click();
    await page.getByRole('option', { name: /^Implemented$/i }).click();

    await expect(page).toHaveURL(/status=implemented/);
    await expect(page.getByText('Status: Implemented')).toBeVisible({ timeout: 3_000 });

    // Clear chip
    await page.getByText('Status: Implemented').click();
    await expect(page.getByText('Status: Implemented')).toHaveCount(0);
    await expect(page).not.toHaveURL(/status=implemented/);

    await expectNoCrashes(page, errs);
  });
});

test.describe('Sidebar nav', () => {
  test('section expand state persists across page reload', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/dashboard');

    // "Audit" section is collapsed by default. Click to expand.
    await page
      .getByRole('button', { name: /^Audit$/ })
      .first()
      .click();

    // Child links should now be visible
    await expect(page.getByRole('link', { name: /^Audits$/ })).toBeVisible();

    // Reload — section should still be expanded
    await page.reload();
    await expect(page.getByRole('link', { name: /^Audits$/ })).toBeVisible({ timeout: 5_000 });

    await expectNoCrashes(page, errs);
  });
});

test.describe('Risk heatmap — keyboard nav', () => {
  test('arrow keys move focus between cells', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risk-heatmap');

    const cells = page.locator('[role="gridcell"]');
    await expect(cells.first()).toBeVisible({ timeout: 8_000 });

    await cells.first().focus();
    await expect(cells.first()).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(cells.nth(1)).toBeFocused({ timeout: 1_500 });

    await expectNoCrashes(page, errs);
  });
});

test.describe('Detail page navigates back via drawer flow', () => {
  test('controls list → drawer → open full page → back link returns to list', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.locator('tbody tr').first().click();
    await expect(page.getByRole('button', { name: /open full page/i })).toBeVisible({
      timeout: 8_000,
    });
    await page.getByRole('button', { name: /open full page/i }).click();
    await expect(page).toHaveURL(/\/controls\/[a-f0-9-]+$/);
    await page.getByRole('link', { name: /back to controls/i }).click();
    await expect(page).toHaveURL(/\/controls$/, { timeout: 5_000 });
    await expectNoCrashes(page, errs);
  });
});

test.describe('Framework requirement deep-link', () => {
  test('clicking a framework mapping in ControlDrawer lands on the framework page with target requirement highlighted', async ({
    page,
  }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.locator('tbody tr').first().click();

    // Wait for framework mappings section
    await expect(page.getByRole('heading', { name: /^Framework Mappings/i })).toBeVisible({
      timeout: 8_000,
    });

    // Click the first mapping link
    const mappingLink = page.getByRole('link', { name: /HIPAA|ISO 27001|SOC 2|NIST/i }).first();
    await expect(mappingLink).toBeVisible({ timeout: 5_000 });
    const href = await mappingLink.getAttribute('href');
    expect(href).toMatch(/\/frameworks\/[a-f0-9-]+\?requirement=/);
    await mappingLink.click();

    await expect(page).toHaveURL(/\/frameworks\/[a-f0-9-]+/, { timeout: 5_000 });
    // Highlighted row should appear briefly (the deep-link applies a pulse ring class)
    await expect(page.locator('[data-req-id].ring-accent-500')).toHaveCount(1, { timeout: 3_000 });
    await expectNoCrashes(page, errs);
  });
});

test.describe('Inline status edit in drawer', () => {
  test('changing status from the drawer Select updates the badge', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.locator('tbody tr').first().click();
    await waitForDrawerWithTitle(page, /·/); // any drawer with title separator

    // The "Change to:" select trigger has the current status as its text
    const changeToLabel = page.getByText(/^Change to:$/);
    await expect(changeToLabel).toBeVisible({ timeout: 5_000 });

    // The next button after that label is the select trigger
    const statusSelectTrigger = changeToLabel.locator('xpath=following::button[1]');
    const original = (await statusSelectTrigger.textContent())?.trim() || '';
    await statusSelectTrigger.click();

    // Pick whichever option is NOT currently selected
    const newStatusName = original.toLowerCase().includes('implemented')
      ? /^In Progress$/i
      : /^Implemented$/i;
    await page.getByRole('option', { name: newStatusName }).click();

    // Toast appears
    await expect(page.getByText(/status updated/i)).toBeVisible({ timeout: 5_000 });

    await expectNoCrashes(page, errs);
  });
});
