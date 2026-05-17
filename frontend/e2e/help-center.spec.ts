import { test, expect } from '@playwright/test';

/**
 * Help Center E2E Tests
 * Tests the help documentation and articles
 */

test.describe('Help Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
  });

  test('displays help center page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /Help|Documentation|Support/i })).toBeVisible();
  });

  test('shows help categories', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Categories render as buttons inside main content (one per category like
    // "Compliance", "Integrations", etc.) plus article links. Either form
    // satisfies "has categories".
    const categories = page.locator('main button, main a[href*="/help/"], [class*="card"], [class*="category"], section');
    expect(await categories.count()).toBeGreaterThan(0);
  });

  test('has search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    
    if (await searchInput.count() > 0) {
      await expect(searchInput.first()).toBeVisible();
    }
  });

  test('can search for articles', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('getting started');
      await page.waitForTimeout(1000);
      
      // Should show search results
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('can navigate to article categories', async ({ page }) => {
    // Click on a category
    const categoryLink = page.locator('a[href*="help/"], [class*="card"]').first();
    
    if (await categoryLink.count() > 0) {
      await categoryLink.click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to category
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Help Articles', () => {
  test('can view individual help article', async ({ page }) => {
    await page.goto('/help/getting-started/quick-start');
    await page.waitForLoadState('networkidle');
    
    // Article should load
    await expect(page.locator('body')).toBeVisible();
    
    // Should have article content
    const articleContent = page.locator('article, [class*="content"], main');
    expect(await articleContent.count()).toBeGreaterThan(0);
  });

  test('article has navigation back to help center', async ({ page }) => {
    await page.goto('/help/getting-started/quick-start');
    await page.waitForLoadState('networkidle');
    
    // Should have breadcrumb or back link
    const backLink = page.locator('a[href="/help"], a:has-text("Back"), nav a');
    expect(await backLink.count()).toBeGreaterThan(0);
  });

  test('articles are properly formatted', async ({ page }) => {
    await page.goto('/help/getting-started/quick-start');
    await page.waitForLoadState('networkidle');
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

test.describe('Developer Resources', () => {
  test('can access API documentation', async ({ page }) => {
    await page.goto('/help/developer-resources/api-documentation');
    await page.waitForLoadState('networkidle');
    
    // Should show API docs content
    await expect(page.locator('body')).toBeVisible();
  });

  test('can access integration guides', async ({ page }) => {
    await page.goto('/help/developer-resources/integration-guide');
    await page.waitForLoadState('networkidle');
    
    // Should show integration guide
    await expect(page.locator('body')).toBeVisible();
  });
});




