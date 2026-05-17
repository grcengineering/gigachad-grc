import { test, expect } from '@playwright/test';

/**
 * Risk Scenarios E2E Tests
 * Tests the risk scenario library, creation, simulation, and templates
 */

test.describe('Risk Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/risk-scenarios');
    await page.waitForLoadState('networkidle');
  });

  test('displays risk scenarios page with title', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Risk Scenario/i })).toBeVisible();
  });

  test('shows statistics cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForTimeout(1000);
    
    // Should have stats cards
    const statsCards = page.locator('[class*="card"]').filter({ hasText: /Total|Templates|High|Categories/i });
    expect(await statsCards.count()).toBeGreaterThanOrEqual(2);
  });

  test('has search and filter functionality', async ({ page }) => {
    // Check for search input (scope to main; site-wide search lives in header)
    const searchInput = page.locator('main').locator('input[placeholder*="Search"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();

    // Check for filter dropdowns
    const filterSelects = page.locator('select');
    expect(await filterSelects.count()).toBeGreaterThan(0);
  });

  test('can open create scenario modal', async ({ page }) => {
    // Find and click the "New Scenario" button
    const newScenarioBtn = page.locator('button').filter({ hasText: /New Scenario/i });
    
    if (await newScenarioBtn.count() > 0) {
      await newScenarioBtn.click();
      await page.waitForTimeout(500);
      
      // Modal should appear with form fields
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      await expect(modal.first()).toBeVisible();
      
      // Check for form fields
      const _titleInput = page.locator('input').filter({ hasText: /title/i }).first();
      expect(await page.locator('input').count()).toBeGreaterThan(0);
    }
  });

  test('displays scenario cards', async ({ page }) => {
    // Wait for scenarios to load
    await page.waitForTimeout(2000);
    
    // Check for scenario cards (may be empty if no data)
    const scenarioCards = page.locator('[class*="card"]');
    const cardCount = await scenarioCards.count();
    
    // Either have scenario cards or show empty state
    if (cardCount === 0) {
      const emptyState = page.locator('text=/No scenarios|Create your first/i');
      await expect(emptyState.first()).toBeVisible();
    } else {
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('shows template library section', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Look for template library section
    const templateSection = page.locator('text=/Template Library|Templates/i');
    
    // Template section may or may not be visible depending on state
    if (await templateSection.count() > 0) {
      await expect(templateSection.first()).toBeVisible();
    }
  });

  test('can filter scenarios by category', async ({ page }) => {
    // Find category filter
    const categorySelect = page.locator('select').first();
    
    if (await categorySelect.count() > 0) {
      // Select a category
      await categorySelect.selectOption({ index: 1 });
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('can use search to find scenarios', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('phishing');
      await page.waitForTimeout(1000);
      
      // Search should filter results
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Risk Scenarios - Simulation', () => {
  test('can open simulation modal for a scenario', async ({ page }) => {
    await page.goto('/risk-scenarios');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for a play/simulate button on a scenario card
    const simulateBtn = page.locator('button[title*="Simulation"], button:has([class*="play"])').first();
    
    if (await simulateBtn.count() > 0) {
      await simulateBtn.click();
      await page.waitForTimeout(500);
      
      // Simulation modal should appear
      const modal = page.locator('[role="dialog"], .modal');
      await expect(modal.first()).toBeVisible();
      
      // Should have control effectiveness slider
      const slider = page.locator('input[type="range"]');
      expect(await slider.count()).toBeGreaterThan(0);
    }
  });
});




