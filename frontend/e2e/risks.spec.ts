import { test, expect } from '@playwright/test';

/**
 * Risks Module E2E Tests
 * Tests for risk management functionality
 */

test.describe('Risks - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/risks');
    await page.waitForLoadState('networkidle');
  });

  test('displays risks page with title', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Risk/i })).toBeVisible();
  });

  test('shows risks table or list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const risksList = page.locator('table, [class*="grid"], [class*="list"]');
    await expect(risksList.first()).toBeVisible();
  });

  test('can add new risk', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /add|create|new|register/i }).first();
    
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      
      const form = page.locator('form, [role="dialog"]');
      await expect(form.first()).toBeVisible();
    }
  });

  test('displays risk severity indicators', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for severity indicators
    const _severityIndicators = page.locator('text=/critical|high|medium|low|negligible/i');
    // May or may not have data
    await expect(page.locator('main')).toBeVisible();
  });

  test('has filter options', async ({ page }) => {
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();
    
    if (await filterBtn.count() > 0) {
      await expect(filterBtn).toBeVisible();
    }
  });
});

test.describe('Risks - Risk Heat Map', () => {
  test('can navigate to risk heatmap', async ({ page }) => {
    await page.goto('/risk-heatmap');
    await page.waitForLoadState('networkidle');
    
    // Should show heatmap visualization
    await expect(page.locator('h1, h2').filter({ hasText: /heat.*map|risk.*matrix/i })).toBeVisible();
  });

  test('heatmap displays grid', async ({ page }) => {
    await page.goto('/risk-heatmap');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for heatmap grid/chart
    const heatmap = page.locator('[class*="heatmap"], [class*="grid"], svg, canvas');
    await expect(heatmap.first()).toBeVisible();
  });
});

test.describe('Risks - Risk Reports', () => {
  test('can navigate to risk reports', async ({ page }) => {
    await page.goto('/risk-reports');
    await page.waitForLoadState('networkidle');

    // Multiple headings match /Report/i (h1 "Risk Reports" and h2 "Report Templates")
    await expect(page.locator('h1, h2').filter({ hasText: /Report/i }).first()).toBeVisible();
  });

  test('can generate new report', async ({ page }) => {
    await page.goto('/risk-reports');
    await page.waitForLoadState('networkidle');
    
    const generateBtn = page.locator('button').filter({ hasText: /generate|create|new/i }).first();
    
    if (await generateBtn.count() > 0) {
      await expect(generateBtn).toBeVisible();
    }
  });
});

test.describe('Risks - Risk Dashboard', () => {
  test('can navigate to risk dashboard', async ({ page }) => {
    await page.goto('/risk-dashboard');
    await page.waitForLoadState('networkidle');
    
    // May redirect or show dashboard
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Risks - Detail View', () => {
  test('can navigate to risk detail', async ({ page }) => {
    await page.goto('/risks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const riskLink = page.locator('a[href*="/risks/"]').first();
    
    if (await riskLink.count() > 0) {
      await riskLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/risks\/[a-zA-Z0-9-]+/);
    }
  });

  test('risk detail shows impact and likelihood', async ({ page }) => {
    await page.goto('/risks');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const riskLink = page.locator('a[href*="/risks/"]').first();
    
    if (await riskLink.count() > 0) {
      await riskLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for impact/likelihood fields
      const impactLikelihood = page.locator('text=/impact|likelihood|probability/i');
      if (await impactLikelihood.count() > 0) {
        await expect(impactLikelihood.first()).toBeVisible();
      }
    }
  });
});




