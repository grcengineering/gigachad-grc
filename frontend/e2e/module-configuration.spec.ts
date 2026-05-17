import { test, expect } from '@playwright/test';

/**
 * Module Configuration E2E Tests
 * 
 * These tests verify:
 * - Disabled modules show the "Module Not Enabled" page when accessed directly
 * - Enabled modules render their normal UI
 * 
 * Behavior depends on environment configuration (VITE_ENABLE_*_MODULE flags),
 * but the assertions are tolerant: they accept either the feature UI or the
 * disabled-module page, and ensure one of them is shown.
 */

test.describe('Module Configuration - Disabled AI Module', () => {
  test('AI settings route shows AI config or disabled module page', async ({ page }) => {
    await page.goto('/settings/ai');
    await page.waitForLoadState('networkidle');

    const aiHeading = page.locator('h1, h2').filter({ hasText: /AI Configuration|AI Settings|AI/i });
    const disabledHeading = page.locator('text=Module Not Enabled');

    const aiVisible = await aiHeading.first().isVisible().catch(() => false);
    const disabledVisible = await disabledHeading.first().isVisible().catch(() => false);

    expect(aiVisible || disabledVisible).toBeTruthy();
  });
});

test.describe('Module Configuration - BC/DR Module', () => {
  test('BC/DR dashboard either loads or shows disabled module page', async ({ page }) => {
    await page.goto('/bcdr');

    // BCDRDashboard renders a skeleton (no h1/h2) while its two
    // useQuery calls are in flight, so `networkidle` is not enough —
    // poll for the heading or the disabled-module page to actually
    // appear in the DOM. The expect.toPass retries the inner check
    // until the 10s default expect timeout.
    await expect(async () => {
      const bcdrHeading = page
        .locator('h1, h2')
        .filter({ hasText: /BC\/DR|Business Continuity|Disaster Recovery/i });
      const disabledHeading = page.locator('text=Module Not Enabled');
      const bcdrVisible = await bcdrHeading.first().isVisible().catch(() => false);
      const disabledVisible = await disabledHeading.first().isVisible().catch(() => false);
      expect(bcdrVisible || disabledVisible).toBeTruthy();
    }).toPass({ timeout: 15_000 });
  });
});


