import { test, expect } from '@playwright/test';

/**
 * BC/DR Module E2E Tests
 * 
 * These tests focus on:
 * - Basic navigation to BC/DR pages
 * - Verifying that routes either render the BC/DR UI or the "Module Not Enabled" page
 *   depending on module configuration.
 */

test.describe('BC/DR - Navigation & Module Configuration', () => {
  test('BC/DR dashboard route respects module configuration', async ({ page }) => {
    await page.goto('/bcdr');

    // BCDRDashboard renders a skeleton (no h1/h2) while its two
    // useQuery calls are in flight, so `networkidle` is not enough —
    // poll until the heading or the disabled-module page appears.
    await expect(async () => {
      const disabledHeading = page.locator('text=Module Not Enabled');
      const bcdrHeading = page
        .locator('h1, h2')
        .filter({ hasText: /BC\/DR|Business Continuity|Disaster Recovery/i });
      const disabledVisible = await disabledHeading.first().isVisible().catch(() => false);
      const bcdrVisible = await bcdrHeading.first().isVisible().catch(() => false);
      expect(disabledVisible || bcdrVisible).toBeTruthy();
    }).toPass({ timeout: 15_000 });
  });

  test('BC/DR list pages load or show disabled message', async ({ page }) => {
    const routes = [
      { path: '/bcdr/processes', text: /Business Processes|Processes/i },
      { path: '/bcdr/plans', text: /BC\/DR Plans|Continuity Plans|Recovery Plans/i },
      { path: '/bcdr/tests', text: /DR Tests|Disaster Recovery Tests|Exercises/i },
      { path: '/bcdr/runbooks', text: /Runbooks|Recovery Runbooks/i },
      { path: '/bcdr/communication', text: /Communication Plans|Escalation/i },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const disabledHeading = page.locator('text=Module Not Enabled');
      const pageHeading = page.locator('h1, h2').filter({ hasText: route.text });

      const disabledVisible = await disabledHeading.first().isVisible().catch(() => false);
      const headingVisible = await pageHeading.first().isVisible().catch(() => false);

      expect(disabledVisible || headingVisible).toBeTruthy();
    }
  });
});


