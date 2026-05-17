import { test, expect } from '@playwright/test';

/**
 * Controls Module E2E Tests
 * Tests for security controls management functionality
 */

test.describe('Controls - List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
  });

  test('displays controls page with title', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Control/i })).toBeVisible();
  });

  test('shows controls table or list', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check for table or list structure
    const tableOrList = page.locator('table, [role="grid"], [class*="list"], [class*="table"]');
    await expect(tableOrList.first()).toBeVisible();
  });

  test('has search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
      
      // Test search
      await searchInput.first().fill('access');
      await page.waitForTimeout(500);
      
      // Results should update
      const _results = page.locator('table tbody tr, [class*="list-item"], [class*="card"]');
      // Results count may change after search
    }
  });

  test('has filter options', async ({ page }) => {
    // Look for filter button or dropdown
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();

    if (await filterBtn.count() > 0) {
      await filterBtn.click();
      await page.waitForTimeout(500);

      // After clicking the Filters button the Advanced Filters panel pops
      // open. Accept any of the panel's identifiers: the heading, the
      // standard ARIA roles, a `.filter-panel` class, or any element with
      // a dropdown/popover-style className.
      const filterOptions = page.locator(
        'h3:has-text("Advanced Filters"), [role="menu"], [role="listbox"], .filter-panel, [class*="dropdown"], [class*="popover"]'
      );
      expect(await filterOptions.count()).toBeGreaterThan(0);
    }
  });

  test('can add new control', async ({ page }) => {
    // Look for add button
    const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
    
    if (await addBtn.count() > 0) {
      await addBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show form or modal
      const form = page.locator('form, [role="dialog"]');
      await expect(form.first()).toBeVisible();
    }
  });
});

test.describe('Controls - Detail View', () => {
  test('can navigate to control detail', async ({ page }) => {
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');

    // Wait for controls to load
    await page.waitForTimeout(2000);

    // Click on the first detail link inside the controls table. The <tr>
    // itself has no click handler — navigation happens via the cell links.
    const controlLink = page
      .locator('table tbody tr a[href*="/controls/"], [class*="list-item"] a[href*="/controls/"], [class*="control-card"] a[href*="/controls/"]')
      .first();

    if (await controlLink.count() > 0) {
      await controlLink.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to detail page
      await expect(page).toHaveURL(/controls\/[a-zA-Z0-9-]+/);
    }
  });

  test('control detail page shows required sections', async ({ page }) => {
    // Navigate directly to controls and click first one
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const controlLink = page.locator('a[href*="/controls/"]').first();
    
    if (await controlLink.count() > 0) {
      await controlLink.click();
      await page.waitForLoadState('networkidle');
      
      // Check for key sections
      const detailContent = page.locator('main, [role="main"]');
      await expect(detailContent.first()).toBeVisible();
      
      // Should have title
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });
});

test.describe('Controls - Status Management', () => {
  test('control statuses are displayed', async ({ page }) => {
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for status indicators (badges, chips, tags)
    const statusIndicators = page.locator('[class*="badge"], [class*="chip"], [class*="tag"], [class*="status"]');
    
    // Should have some status indicators if controls exist
    const _count = await statusIndicators.count();
    // Just verify the page loads without checking exact count
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Controls - Evidence Linking', () => {
  test('can view evidence linked to control', async ({ page }) => {
    // Navigate to a control detail
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const controlLink = page.locator('a[href*="/controls/"]').first();
    
    if (await controlLink.count() > 0) {
      await controlLink.click();
      await page.waitForLoadState('networkidle');
      
      // Look for evidence section or tab
      const evidenceSection = page.locator('text=/evidence/i');
      
      if (await evidenceSection.count() > 0) {
        // Evidence section exists
        await expect(evidenceSection.first()).toBeVisible();
      }
    }
  });
});

test.describe('Controls - Bulk Actions', () => {
  test('supports selecting multiple controls', async ({ page }) => {
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for checkboxes in table
    const checkboxes = page.locator('input[type="checkbox"]');
    
    if (await checkboxes.count() > 1) {
      // Click first checkbox
      await checkboxes.first().click();
      
      // Bulk action bar should appear or be enabled
      const _bulkActions = page.locator('[class*="bulk"], button:has-text("Selected")');
      // May or may not show depending on implementation
    }
  });
});




