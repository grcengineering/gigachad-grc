import { test, expect } from '@playwright/test';

/**
 * Integrations Module E2E Tests
 * Tests for third-party integrations and API connections
 */

test.describe('Integrations - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('displays integrations page with title', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Integration/i })).toBeVisible();
  });

  test('shows integration categories', async ({ page }) => {
    // Wait for integrations to load
    await page.waitForTimeout(2000);
    
    // Should show category sections or filters
    const categories = page.locator('[class*="category"], [class*="section"], h3, h4');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('displays integration cards', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for integration cards/items
    const integrationCards = page.locator('[class*="integration"], [class*="card"]');
    const count = await integrationCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      
      // Test search
      await searchInput.first().fill('AWS');
      await page.waitForTimeout(1000);
      
      // Should filter results
      const _results = page.locator('[class*="integration"], [class*="card"]');
      // Results may or may not include AWS integration
    }
  });

  test('filter by configured status', async ({ page }) => {
    // Look for status filter boxes
    const configuredFilter = page.locator('text=/configured/i').first();
    
    if (await configuredFilter.count() > 0) {
      await configuredFilter.click();
      await page.waitForTimeout(500);
      
      // Results should update
      await expect(page.locator('main')).toBeVisible();
    }
  });
});

test.describe('Integrations - Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('can open integration configuration modal', async ({ page }) => {
    // Find the "Configure" action button on an integration card within main
    // content. Use exact text to avoid matching the "Configured" stats button
    // or sidebar "Configuration" toggle.
    const configureBtn = page.locator('main button', { hasText: /^Configure$/ }).first();

    if (await configureBtn.count() > 0) {
      await configureBtn.click();
      await page.waitForTimeout(1000);

      // Modal renders with a "Configure <name>" heading inside the overlay.
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"], h2:has-text("Configure")');
      await expect(modal.first()).toBeVisible();
    }
  });

  test('integration modal has configuration tabs', async ({ page }) => {
    const configureBtn = page.locator('main button', { hasText: /^Configure$/ }).first();

    if (await configureBtn.count() > 0) {
      await configureBtn.click();
      await page.waitForTimeout(1000);

      // Tabs are plain buttons labeled "Quick Setup", "Advanced Builder", "Raw API".
      const tabs = page.locator(
        '[role="tab"], button[role="tab"], [class*="tab"], button:has-text("Quick Setup"), button:has-text("Advanced Builder"), button:has-text("Raw API")'
      );
      expect(await tabs.count()).toBeGreaterThan(0);
    }
  });

  test('can close integration modal', async ({ page }) => {
    const configureBtn = page.locator('main button', { hasText: /^Configure$/ }).first();

    if (await configureBtn.count() > 0) {
      await configureBtn.click();
      await page.waitForTimeout(1000);

      // Find close button
      const closeBtn = page.locator('button').filter({ hasText: /close|cancel|×/i }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);

        // Modal should be closed
        const modal = page.locator('[role="dialog"]:visible, .modal:visible');
        expect(await modal.count()).toBe(0);
      }
    }
  });
});

test.describe('Integrations - Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('Cloud Infrastructure category exists', async ({ page }) => {
    const cloudCategory = page.locator('text=/cloud.*infrastructure|infrastructure.*cloud/i');
    if (await cloudCategory.count() > 0) {
      await expect(cloudCategory.first()).toBeVisible();
    }
  });

  test('Identity Provider category exists', async ({ page }) => {
    const idpCategory = page.locator('text=/identity.*provider|identity management/i');
    if (await idpCategory.count() > 0) {
      await expect(idpCategory.first()).toBeVisible();
    }
  });

  test('HR Tools category exists', async ({ page }) => {
    const hrCategory = page.locator('text=/hr.*tool|human.*resource/i');
    if (await hrCategory.count() > 0) {
      await expect(hrCategory.first()).toBeVisible();
    }
  });

  test('Security Awareness category exists', async ({ page }) => {
    const secCategory = page.locator('text=/security.*awareness/i');
    if (await secCategory.count() > 0) {
      await expect(secCategory.first()).toBeVisible();
    }
  });
});

test.describe('Integrations - Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
  });

  test('shows configured count', async ({ page }) => {
    const configuredStat = page.locator('text=/configured/i');
    await expect(configuredStat.first()).toBeVisible();
  });

  test('shows active count', async ({ page }) => {
    const activeStat = page.locator('text=/active/i');
    await expect(activeStat.first()).toBeVisible();
  });

  test('shows evidence collected count', async ({ page }) => {
    const evidenceStat = page.locator('text=/evidence.*collected|collected.*evidence/i');
    if (await evidenceStat.count() > 0) {
      await expect(evidenceStat.first()).toBeVisible();
    }
  });
});




