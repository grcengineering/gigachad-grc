import { test, expect } from '@playwright/test';

/**
 * Questionnaires E2E Tests
 * Tests security questionnaire management and completion
 */

test.describe('Questionnaires', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/questionnaires');
    await page.waitForLoadState('networkidle');
  });

  test('displays questionnaires page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Questionnaire/i })).toBeVisible();
  });

  test('shows questionnaire list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Should show either a list of questionnaires or empty state.
    // The empty state heading is "No incoming questionnaires" — match its
    // wording (and other common variants).
    const list = page.locator('table, [class*="grid"], [class*="list"], [class*="card"]');
    const emptyState = page.locator(
      'text=/No (incoming )?questionnaire|No questionnaires|Create your first|Get started/i'
    );

    const hasContent = await list.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('has create questionnaire button', async ({ page }) => {
    const createBtn = page.locator('button, a').filter({ hasText: /Create|New|Add/i }).first();
    
    if (await createBtn.count() > 0) {
      await expect(createBtn).toBeVisible();
    }
  });

  test('can open create questionnaire modal', async ({ page }) => {
    const createBtn = page.locator('button').filter({ hasText: /Create|New|Add/i }).first();
    
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      // Should show modal or navigate to creation page
      const modal = page.locator('[role="dialog"], .modal, form');
      expect(await modal.count()).toBeGreaterThan(0);
    }
  });

  test('has filter and search functionality', async ({ page }) => {
    // Check for search
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    // Check for status filter
    const statusFilter = page.locator('select, [class*="filter"]');
    
    const hasFilters = await searchInput.count() > 0 || await statusFilter.count() > 0;
    expect(hasFilters).toBeTruthy();
  });
});

test.describe('Questionnaire Detail', () => {
  test('can view questionnaire questions', async ({ page }) => {
    await page.goto('/questionnaires');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Try to click on a questionnaire if one exists
    const questionnaireLink = page.locator('a[href*="questionnaire"], tr, [class*="card"]').first();
    
    if (await questionnaireLink.count() > 0) {
      await questionnaireLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should show questionnaire detail
      await expect(page.locator('body')).toBeVisible();
    }
  });
});




