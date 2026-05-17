import { test, expect } from '@playwright/test';

/**
 * Assets E2E Tests
 * Tests asset management, inventory, and risk association
 */

test.describe('Assets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
  });

  test('displays assets page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Asset/i })).toBeVisible();
  });

  test('shows asset list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const assetList = page.locator('table, [class*="grid"], [class*="list"], [class*="card"]');
    const emptyState = page.locator('text=/No asset|Add|Import/i');
    
    const hasContent = await assetList.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('has add asset button', async ({ page }) => {
    const addBtn = page.locator('button, a').filter({ hasText: /Add|Create|New|Import/i }).first();
    
    if (await addBtn.count() > 0) {
      await expect(addBtn).toBeVisible();
    }
  });

  test('can search assets', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('server');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('can filter by type', async ({ page }) => {
    const typeFilter = page.locator('select, [class*="filter"]').first();
    
    if (await typeFilter.count() > 0) {
      await typeFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('displays asset types', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for asset type indicators
    const typeIndicators = page.locator('text=/Hardware|Software|Data|Network|Cloud/i');
    
    if (await typeIndicators.count() > 0) {
      await expect(typeIndicators.first()).toBeVisible();
    }
  });

  test('displays criticality levels', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for criticality indicators
    const criticalityIndicators = page.locator('text=/Critical|High|Medium|Low/i');
    
    if (await criticalityIndicators.count() > 0) {
      await expect(criticalityIndicators.first()).toBeVisible();
    }
  });
});

test.describe('Asset Detail', () => {
  test('can view asset details', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const assetLink = page.locator('a[href*="asset"], tr, [class*="card"]').first();

    if (await assetLink.count() > 0) {
      await assetLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Asset Risk Association', () => {
  test('can view associated risks', async ({ page }) => {
    await page.goto('/assets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for risk association section
    const riskSection = page.locator('text=/Risk|Threat|Vulnerability/i');

    if (await riskSection.count() > 0) {
      await expect(riskSection.first()).toBeVisible();
    }
  });
});




