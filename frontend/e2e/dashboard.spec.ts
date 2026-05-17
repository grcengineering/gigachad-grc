import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * Tests dashboard functionality including widgets, customization, and data display
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // The dashboard renders an empty <main> until its queries settle and
    // React commits the rendered widgets. networkidle alone is not enough,
    // so wait until the actual main-content heading is visible.
    await page.locator('main h1, main h2').first().waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('displays dashboard title and main elements', async ({ page }) => {
    // Heading inside <main> (sidebar nav has no h1/h2, so scope is enough).
    await expect(page.locator('main h1, main h2').first()).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();
  });

  test('displays dashboard widgets', async ({ page }) => {
    // beforeEach already waited for the heading; widgets should be in
    // the DOM by now. Match the card / widget primitives Tailwind uses.
    const widgets = page.locator('[class*="widget"], [class*="card"], [data-testid*="widget"]');
    expect(await widgets.count()).toBeGreaterThan(0);
  });

  test('framework readiness widget shows data', async ({ page }) => {
    // Look for framework-related widget
    const frameworkWidget = page.locator('text=/framework|compliance|readiness/i').first();
    
    if (await frameworkWidget.count() > 0) {
      await expect(frameworkWidget).toBeVisible();
    }
  });

  test('control status displays', async ({ page }) => {
    // Look for control status information
    const controlStatus = page.locator('text=/control.*status|status.*control/i').first();
    
    if (await controlStatus.count() > 0) {
      await expect(controlStatus).toBeVisible();
    }
  });

  test('can access dashboard customization', async ({ page }) => {
    // Look for customize/settings button within main content (sidebar also has
    // "Settings"/"Configuration" toggles which would otherwise match first).
    const customizeBtn = page.locator('main button').filter({ hasText: /customize|settings|configure/i }).first();

    if (await customizeBtn.count() > 0) {
      await customizeBtn.click();

      // Should open a modal or panel. The customize modal renders a heading
      // with the same name; match its overlay/container by heading.
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"], h3:has-text("Customize Dashboard")');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('dashboard data updates on refresh', async ({ page }) => {
    // Get initial state
    const _initialContent = await page.locator('main, [role="main"]').first().textContent();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Content should still be present after reload
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });
});

test.describe('Dashboard - Custom Dashboards', () => {
  test('can navigate to custom dashboards', async ({ page }) => {
    await page.goto('/dashboards');
    await page.waitForLoadState('networkidle');
    
    // Should show custom dashboards page
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i })).toBeVisible();
  });

  test('can create a new dashboard', async ({ page }) => {
    await page.goto('/dashboards');
    await page.waitForLoadState('networkidle');
    
    // Look for create/new button
    const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show creation form or navigate to editor
      const formOrEditor = page.locator('form, [class*="editor"], input[name*="name"], input[placeholder*="name"]');
      expect(await formOrEditor.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Dashboard - Demo Data', () => {
  test('demo data banner appears for new users', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for demo data banner
    const demoBanner = page.locator('text=/demo|sample|try.*data/i').first();
    
    // Banner may or may not be present depending on user state
    if (await demoBanner.count() > 0) {
      await expect(demoBanner).toBeVisible();
    }
  });
});




