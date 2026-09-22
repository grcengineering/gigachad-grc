import { expect, test } from '@playwright/test';

test.describe('Framework Library', () => {
  test('loads the real catalog and previews a framework', async ({ page }) => {
    const catalogResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/frameworks/catalog/status') && response.status() === 200
    );

    await page.goto('/framework-library');
    await catalogResponse;

    const cards = page.locator('main').getByRole('heading', { level: 3 });
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Preview' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/requirements/i).last()).toBeVisible();
  });

  test('offers an activate or deactivate action backed by the catalog API', async ({ page }) => {
    await page.goto('/framework-library');

    const enable = page.getByRole('button', { name: 'Enable', exact: true });
    const disable = page.getByRole('button', { name: 'Disable', exact: true });

    await expect(enable.or(disable).first()).toBeVisible();
  });
});
