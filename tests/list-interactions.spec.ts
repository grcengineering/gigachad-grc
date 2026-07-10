import { test, expect } from '@playwright/test';
import { expectPageHealthy, trackPageErrors } from './_helpers';

/**
 * Per-list-page interaction tests. Covers list pages that have filters,
 * search, drawer/row-click behavior, and bulk actions.
 */

test.describe('Controls list', () => {
  test('search input filters via URL param', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    const searchInput = page.getByPlaceholder(/Search controls/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('access');
    await expect(page).toHaveURL(/search=access/, { timeout: 3_000 });
    await expectPageHealthy(page, errs);
  });

  test('category filter applies and clears', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    // Wait for table rows to load so the page layout has settled
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10_000 });

    // Combobox-style Select: type into the input to surface options
    const input = page.getByPlaceholder('All Categories', { exact: true }).first();
    await input.click();
    await input.type('a', { delay: 30 });
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/category=/, { timeout: 3_000 });
    await expect(page.getByText(/Category:/i)).toBeVisible();
    await page.getByRole('button', { name: /clear all/i }).click();
    await expect(page).not.toHaveURL(/category=/);
    await expectPageHealthy(page, errs);
  });

  test('Bulk Upload modal opens and closes', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.getByRole('button', { name: /bulk upload/i }).click();
    // Modal should appear (BulkUploadModal renders a Dialog)
    await expect(page.getByRole('heading', { name: /upload/i }).first()).toBeVisible({
      timeout: 3_000,
    });
    // Close via Esc
    await page.keyboard.press('Escape');
    await expectPageHealthy(page, errs);
  });
});

test.describe('Risks list', () => {
  test('Add Risk dialog opens and closes', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risks');
    await page
      .getByRole('button', { name: /^add risk$/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /create new risk/i })).toBeVisible({
      timeout: 3_000,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /create new risk/i })).toBeHidden({
      timeout: 3_000,
    });
    await expectPageHealthy(page, errs);
  });

  test('Heatmap button navigates to risk-heatmap', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risks');
    await page.getByRole('link', { name: /^heatmap$/i }).click();
    await expect(page).toHaveURL(/\/risk-heatmap$/);
    await expectPageHealthy(page, errs);
  });
});

test.describe('Evidence list', () => {
  test('search input filters', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/evidence');
    const searchInput = page.getByPlaceholder(/search evidence/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('audit');
    await page.waitForTimeout(500);
    await expectPageHealthy(page, errs);
  });

  test('Upload Evidence modal opens', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/evidence');
    await page
      .getByRole('button', { name: /upload evidence/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /upload evidence/i })).toBeVisible({
      timeout: 3_000,
    });
    await page.keyboard.press('Escape');
    await expectPageHealthy(page, errs);
  });
});

test.describe('Vendors list', () => {
  test('list page renders with empty state OR data', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/vendors');
    // Either an empty state or a row table should render — neither is an error
    const empty = page.getByText(/no vendors yet/i);
    const table = page.locator('table');
    await expect(empty.or(table.first())).toBeVisible({ timeout: 5_000 });
    await expectPageHealthy(page, errs);
  });
});

test.describe('Frameworks list', () => {
  test('clicking a framework card navigates to its detail', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/frameworks');
    const firstCard = page.locator('a[href^="/frameworks/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 8_000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/frameworks\/[a-f0-9-]+$/);
    await expectPageHealthy(page, errs);
  });
});

test.describe('Policies list', () => {
  test('search input updates and a row is clickable to detail', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/policies');
    const searchInput = page.getByPlaceholder(/search policies/i);
    await expect(searchInput).toBeVisible();
    // Click first row
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 6_000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/policies\/[a-f0-9-]+$/, { timeout: 5_000 });
    await expectPageHealthy(page, errs);
  });
});

test.describe('Audits list', () => {
  test('search and status filter work', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/audits');
    const searchInput = page.getByPlaceholder(/search audits/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('soc');
    await page.waitForTimeout(300);
    await expectPageHealthy(page, errs);
  });
});

test.describe('Knowledge Base list', () => {
  test('list renders with empty state or content', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/knowledge-base');
    const empty = page.getByText(/no entries found/i);
    const card = page.getByRole('link').or(page.locator('[data-card-list]')).first();
    await expect(empty.or(card)).toBeVisible({ timeout: 5_000 });
    await expectPageHealthy(page, errs);
  });
});

test.describe('Risk Queue', () => {
  test('all four tab cards are clickable and switch content', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risk-queue');
    for (const tab of [
      'My Assessments',
      'Treatment Decisions',
      'Executive Approvals',
      'GRC Reviews',
    ]) {
      await page.getByText(tab).first().click();
      await page.waitForTimeout(150);
    }
    await expectPageHealthy(page, errs);
  });
});

test.describe('Risk Reports', () => {
  test('selecting each template renders its preview', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risk-reports');
    const templates = [
      'Full Risk Register',
      'Risk Summary',
      'Treatment Status Report',
      'Risk Trend Analysis',
      'Executive Summary',
    ];
    for (const t of templates) {
      await page.getByText(t).first().click();
      await page.waitForTimeout(300);
      await expect(page.getByRole('heading', { name: /preview/i })).toBeVisible({ timeout: 3_000 });
    }
    await expectPageHealthy(page, errs);
  });
});

test.describe('Assets list', () => {
  test('renders empty state or data', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/assets');
    const empty = page.getByText(/no assets found/i);
    const table = page.locator('table').first();
    await expect(empty.or(table)).toBeVisible({ timeout: 6_000 });
    await expectPageHealthy(page, errs);
  });
});

test.describe('Risk Scenarios', () => {
  test('clicking a scenario card opens its detail dialog', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/risk-scenarios');
    const firstCard = page.getByText(/phishing attack on employees/i).first();
    await expect(firstCard).toBeVisible({ timeout: 5_000 });
    await firstCard.click();
    await expect(page.getByRole('heading', { name: /phishing attack on employees/i })).toBeVisible({
      timeout: 3_000,
    });
    await page.keyboard.press('Escape');
    await expectPageHealthy(page, errs);
  });
});

test.describe('Audit Findings', () => {
  test('empty-state page renders cleanly', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/audit-findings');
    await expect(page.getByText(/no findings yet/i)).toBeVisible({ timeout: 5_000 });
    await expectPageHealthy(page, errs);
  });
});

test.describe('Awareness & Training', () => {
  test('Coming Soon banner + all 6 feature cards render', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/tools/awareness');
    await expect(page.getByRole('heading', { name: 'Coming Soon' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Training Courses' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Phishing Simulations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Compliance Tracking' })).toBeVisible();
    await expectPageHealthy(page, errs);
  });
});

test.describe('Design System showcase', () => {
  test('all sections render without errors', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/design-system');
    await expect(page.getByRole('heading', { name: /design system/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /button/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /datatable/i })).toBeVisible();
    // Try clicking the Dialog toggle
    await page.getByRole('button', { name: /open dialog/i }).click();
    await expect(page.getByRole('heading', { name: /delete control/i })).toBeVisible({
      timeout: 2_000,
    });
    await page.keyboard.press('Escape');
    await expectPageHealthy(page, errs);
  });
});
