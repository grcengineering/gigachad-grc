import { expect, test } from '@playwright/test';

test.describe('theme preferences', () => {
  test('applies and persists dark mode from Settings', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Appearance' }).click();

    await page.getByRole('button', { name: 'System' }).click();
    await page.getByRole('option', { name: 'Dark' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('system mode follows the browser color scheme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => localStorage.setItem('theme', 'system'));
    await page.goto('/settings');

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveClass(/light/);
  });
});
