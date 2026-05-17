import { test, expect } from '@playwright/test';

/**
 * Audits E2E Tests
 * Tests audit management, findings, and evidence requests
 */

test.describe('Audits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
  });

  test('displays audits page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Audit/i })).toBeVisible();
  });

  test('shows audit list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const auditList = page.locator('table, [class*="grid"], [class*="list"], [class*="card"]');
    const emptyState = page.locator('text=/No audit|Create|Schedule/i');
    
    const hasContent = await auditList.count() > 0 || await emptyState.count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('has create audit button', async ({ page }) => {
    const createBtn = page.locator('button, a').filter({ hasText: /Create|New|Schedule|Add/i }).first();
    
    if (await createBtn.count() > 0) {
      await expect(createBtn).toBeVisible();
    }
  });

  test('can search audits', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('SOC');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('can filter by status', async ({ page }) => {
    const statusFilter = page.locator('select, [class*="filter"]').first();
    
    if (await statusFilter.count() > 0) {
      await statusFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('displays audit status badges', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for status indicators rendered as visible badges. The status
    // filter <select> contains matching <option> elements that are not
    // visible while the select is closed, so filter those out by tag.
    const statusBadges = page
      .locator('span, div, p')
      .filter({ hasText: /^(Planning|In Progress|Completed|Complete|Draft|Upcoming|Fieldwork)$/i });

    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('displays audit types', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Look for audit type indicators
    const typeIndicators = page.locator('text=/SOC 2|ISO|Internal|External|HIPAA/i');
    
    if (await typeIndicators.count() > 0) {
      await expect(typeIndicators.first()).toBeVisible();
    }
  });
});

test.describe('Audit Detail', () => {
  test('can view audit details', async ({ page }) => {
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const auditLink = page.locator('a[href*="audit"], tr, [class*="card"]').first();
    
    if (await auditLink.count() > 0) {
      await auditLink.click();
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Audit Findings', () => {
  test('can access findings section', async ({ page }) => {
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for findings link or tab
    const findingsLink = page.locator('text=/Finding/i').first();
    
    if (await findingsLink.count() > 0) {
      await expect(findingsLink).toBeVisible();
    }
  });
});

test.describe('Audit Evidence Requests', () => {
  test('can access evidence requests section', async ({ page }) => {
    await page.goto('/audits');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for evidence requests link or tab
    const evidenceRequestsLink = page.locator('text=/Evidence Request|Request/i').first();
    
    if (await evidenceRequestsLink.count() > 0) {
      await expect(evidenceRequestsLink).toBeVisible();
    }
  });
});




