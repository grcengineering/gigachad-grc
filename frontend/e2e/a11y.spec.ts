import { test, expect } from '@playwright/test';
import { countByImpact, runA11yScan } from './_a11y';

const PAGES: { path: string; name: string }[] = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/controls', name: 'controls' },
  { path: '/risks', name: 'risks' },
  { path: '/policies', name: 'policies' },
  { path: '/vendors', name: 'vendors' },
  { path: '/audits', name: 'audits' },
  { path: '/frameworks', name: 'frameworks' },
  { path: '/evidence', name: 'evidence' },
  { path: '/trust-center', name: 'trust-center' },
  { path: '/settings', name: 'settings' },
];

const blockOnCritical = process.env.A11Y_BLOCK_ON_CRITICAL === '1';
const blockOnSerious = process.env.A11Y_BLOCK_ON_SERIOUS === '1';

for (const p of PAGES) {
  test(`a11y: ${p.name}`, async ({ page }) => {
    await page.goto(p.path);
    await page.locator('main h1, main h2').first().waitFor({ state: 'visible', timeout: 20_000 });
    const violations = await runA11yScan(page);
    const counts = countByImpact(violations);
    console.log(
      `[a11y:${p.name}] minor=${counts.minor} moderate=${counts.moderate} serious=${counts.serious} critical=${counts.critical}`,
    );
    if (blockOnCritical)
      expect(counts.critical, `${p.name} has critical a11y violations`).toBe(0);
    if (blockOnSerious)
      expect(counts.serious, `${p.name} has serious a11y violations`).toBe(0);
  });
}
