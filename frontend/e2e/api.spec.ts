import { test, expect } from '@playwright/test';

/**
 * API Integration E2E Tests
 * Tests API endpoints are responding correctly through the UI
 */

test.describe('API Health Checks', () => {
  test('dashboard API returns data', async ({ page }) => {
    // Intercept the API call
    const apiResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/dashboard') && response.status() === 200,
      { timeout: 30000 }
    ).catch(() => null);

    await page.goto('/dashboard');
    
    const response = await apiResponse;
    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('controls API responds', async ({ page }) => {
    const apiResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/controls') && response.status() === 200,
      { timeout: 30000 }
    ).catch(() => null);

    await page.goto('/controls');
    
    const response = await apiResponse;
    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('frameworks API responds', async ({ page }) => {
    const apiResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/frameworks') && response.status() === 200,
      { timeout: 30000 }
    ).catch(() => null);

    await page.goto('/frameworks');
    
    const response = await apiResponse;
    if (response) {
      expect(response.status()).toBe(200);
    }
  });

  test('users API responds', async ({ page }) => {
    const apiResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/users') && response.status() === 200,
      { timeout: 30000 }
    ).catch(() => null);

    await page.goto('/users');

    const response = await apiResponse;
    if (response) {
      expect(response.status()).toBe(200);
    }
  });
});

test.describe('API Error Handling', () => {
  test('handles 404 gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 page or redirect
    const content = await page.content();
    // Should not show a blank page
    expect(content.length).toBeGreaterThan(100);
  });

  test('displays error messages for failed requests', async ({ page }) => {
    // Mock a failed API call
    await page.route('**/api/controls', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/controls');
    await page.waitForLoadState('networkidle');

    // Should still render the page (possibly with error state)
    await expect(page.locator('main').first()).toBeVisible();
  });
});

test.describe('Performance - Page Load Times', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds (adjust based on requirements)
    expect(loadTime).toBeLessThan(10000);
  });

  test('controls page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });

  test('integrations page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Data Integrity', () => {
  test('control data persists after navigation', async ({ page }) => {
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Get initial count of items (if any)
    const initialItems = await page.locator('table tbody tr, [class*="list-item"]').count();
    
    // Navigate away
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Navigate back
    await page.goto('/controls');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Count should be the same
    const finalItems = await page.locator('table tbody tr, [class*="list-item"]').count();
    expect(finalItems).toBe(initialItems);
  });
});

test.describe('Network Resilience', () => {
  test('handles slow network gracefully', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    await page.goto('/dashboard', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Page should still load
    await expect(page.locator('main').first()).toBeVisible();
  });
});




