import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/controls', name: 'controls-list' },
  { path: '/frameworks', name: 'frameworks-list' },
  { path: '/vendors', name: 'vendors-list' },
  { path: '/policies', name: 'policies-list' },
  { path: '/audits', name: 'audits-list' },
  { path: '/settings', name: 'settings' },
  { path: '/trust-center', name: 'trust-center' },
];

for (const p of PAGES) {
  test(`@visual ${p.name}`, async ({ page }) => {
    await page.goto(p.path);
    await page.locator('main h1, main h2').first().waitFor({ state: 'visible', timeout: 20_000 });
    // Mask relative timestamps to avoid flake
    await expect(page).toHaveScreenshot(`${p.name}.png`, {
      fullPage: false,
      maxDiffPixels: 100,
      mask: [
        page.locator('text=/\\d+ (second|minute|hour|day|week|month|year)s? ago/i'),
        page.locator('text=/Updated|Last|Just now/i'),
      ],
    });
  });
}

test(`@visual control-detail`, async ({ page }) => {
  await page.goto('/controls');
  await page.locator('main h1, main h2').first().waitFor({ state: 'visible', timeout: 20_000 });
  const firstLink = page.locator('a[href^="/controls/"]').first();
  test.skip(!(await firstLink.count()), 'No controls in seed data to detail-view');
  await firstLink.click();
  await page.locator('main h1, main h2').first().waitFor({ state: 'visible', timeout: 20_000 });
  await expect(page).toHaveScreenshot('control-detail.png', {
    fullPage: false,
    maxDiffPixels: 100,
  });
});
