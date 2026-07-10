import { test, expect } from '@playwright/test';
import { expectPageHealthy, trackPageErrors } from './_helpers';

test.describe('Command palette deep coverage', () => {
  const routesToCheck: Array<{ query: string; expectedUrl: RegExp }> = [
    { query: 'controls', expectedUrl: /\/controls$/ },
    { query: 'evidence', expectedUrl: /\/evidence$/ },
    { query: 'frameworks', expectedUrl: /\/frameworks$/ },
    { query: 'policies', expectedUrl: /\/policies$/ },
    { query: 'risk register', expectedUrl: /\/risks$/ },
    { query: 'risk dashboard', expectedUrl: /\/risk-dashboard$/ },
    { query: 'heatmap', expectedUrl: /\/risk-heatmap$/ },
    { query: 'vendors', expectedUrl: /\/vendors$/ },
    { query: 'assessments', expectedUrl: /\/assessments$/ },
    { query: 'audits', expectedUrl: /\/audits$/ },
    { query: 'assets', expectedUrl: /\/assets$/ },
    { query: 'integrations', expectedUrl: /\/integrations$/ },
    { query: 'design system', expectedUrl: /\/design-system$/ },
  ];

  for (const { query, expectedUrl } of routesToCheck) {
    test(`palette query "${query}" navigates to ${expectedUrl}`, async ({ page }) => {
      const errs = trackPageErrors(page);
      await page.goto('/dashboard');
      await page.getByRole('button', { name: /open command palette/i }).click();
      const input = page.locator('[cmdk-input]');
      await expect(input).toBeFocused({ timeout: 3_000 });
      await input.fill(query);
      await page.locator('[cmdk-item]').first().waitFor({ timeout: 3_000 });
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(expectedUrl, { timeout: 5_000 });
      await expectPageHealthy(page, errs);
    });
  }
});

test.describe('Breadcrumbs', () => {
  test('detail page shows breadcrumbs with the entity type', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/controls');
    await page.locator('tbody tr').first().click();
    // Open the drawer's "Open full page"
    await page
      .getByRole('button', { name: /open full page/i })
      .first()
      .click();
    await page.waitForLoadState('domcontentloaded');
    // Breadcrumbs include "Home" and "Controls" — scope to the breadcrumb nav to avoid
    // conflicting with the sidebar's Controls link.
    const breadcrumbs = page.getByLabel('Breadcrumb');
    await expect(breadcrumbs.getByRole('link', { name: /^Home$/ })).toBeVisible({ timeout: 5_000 });
    await expect(breadcrumbs.getByRole('link', { name: /^Controls$/ })).toBeVisible();
    // Clicking Home returns to dashboard
    await breadcrumbs.getByRole('link', { name: /^Home$/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expectPageHealthy(page, errs);
  });
});

test.describe('Keyboard shortcuts modal', () => {
  test('? key toggles the shortcuts modal', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/dashboard');
    // Move focus to a benign element (not an input) so ? key fires the global handler
    await page
      .locator('h1')
      .first()
      .focus()
      .catch(() => {});
    // The handler listens for "?" via key, not Shift+/. Use page.keyboard.press('?')
    await page.keyboard.press('?');
    await expect(page.getByRole('heading', { name: /keyboard shortcuts/i })).toBeVisible({
      timeout: 3_000,
    });
    await page.keyboard.press('Escape');
    await expectPageHealthy(page, errs);
  });
});

test.describe('Notification bell', () => {
  test('clicking the bell does not crash', async ({ page }) => {
    const errs = trackPageErrors(page);
    await page.goto('/dashboard');
    // Bell icon is a button in the top bar — find by aria-label or by lucide class
    const bell = page
      .locator(
        'button:has(svg.lucide-bell), button:has([data-icon="bell"]), button[aria-label*="notification" i]'
      )
      .first();
    if ((await bell.count()) > 0) {
      await bell.click();
      await page.waitForTimeout(300);
    }
    await expectPageHealthy(page, errs);
  });
});

test.describe('Sidebar links — every section opens correctly', () => {
  const sectionLinks: Array<{ section: string; link: string; expectedUrl: RegExp }> = [
    { section: 'Compliance', link: 'Controls', expectedUrl: /\/controls$/ },
    { section: 'Compliance', link: 'Frameworks', expectedUrl: /\/frameworks$/ },
    { section: 'Data', link: 'Evidence', expectedUrl: /\/evidence$/ },
    { section: 'Data', link: 'Policies', expectedUrl: /\/policies$/ },
    { section: 'Data', link: 'Assets', expectedUrl: /\/assets$/ },
    { section: 'Data', link: 'Integrations', expectedUrl: /\/integrations$/ },
    { section: 'Risk Management', link: 'Risk Dashboard', expectedUrl: /\/risk-dashboard$/ },
    { section: 'Risk Management', link: 'Risk Register', expectedUrl: /\/risks$/ },
    { section: 'Risk Management', link: 'My Queue', expectedUrl: /\/risk-queue$/ },
    { section: 'Risk Management', link: 'Risk Heatmap', expectedUrl: /\/risk-heatmap$/ },
    { section: 'Risk Management', link: 'Scenarios', expectedUrl: /\/risk-scenarios$/ },
    { section: 'Risk Management', link: 'Reports', expectedUrl: /\/risk-reports$/ },
    { section: 'Third Party Risk', link: 'Vendors', expectedUrl: /\/vendors$/ },
    { section: 'Third Party Risk', link: 'Assessments', expectedUrl: /\/assessments$/ },
    { section: 'Third Party Risk', link: 'Contracts', expectedUrl: /\/contracts$/ },
    { section: 'Trust', link: 'Questionnaires', expectedUrl: /\/questionnaires$/ },
    { section: 'Trust', link: 'Knowledge Base', expectedUrl: /\/knowledge-base$/ },
    { section: 'Trust', link: 'Trust Center', expectedUrl: /\/trust-center$/ },
    { section: 'Audit', link: 'Audits', expectedUrl: /\/audits$/ },
    { section: 'Audit', link: 'Audit Requests', expectedUrl: /\/audit-requests$/ },
    { section: 'Audit', link: 'Findings', expectedUrl: /\/audit-findings$/ },
    { section: 'Tools', link: 'Awareness & Training', expectedUrl: /\/tools\/awareness$/ },
    { section: 'Settings', link: 'Risk Configuration', expectedUrl: /\/settings\/risk$/ },
    { section: 'Settings', link: 'Users', expectedUrl: /\/users$/ },
    { section: 'Settings', link: 'Permissions', expectedUrl: /\/permissions$/ },
    { section: 'Settings', link: 'Audit Log', expectedUrl: /\/audit$/ },
  ];

  for (const { section, link, expectedUrl } of sectionLinks) {
    test(`${section} → ${link}`, async ({ page }) => {
      const errs = trackPageErrors(page);
      await page.goto('/dashboard');
      // Expand the section
      const sectionButton = page.getByRole('button', { name: new RegExp(`^${section}$`) }).first();
      if ((await sectionButton.count()) > 0) {
        await sectionButton.click();
      }
      // Click the link
      await page
        .getByRole('link', { name: new RegExp(`^${link}$`) })
        .first()
        .click();
      await expect(page).toHaveURL(expectedUrl, { timeout: 5_000 });
      await expectPageHealthy(page, errs);
    });
  }
});
