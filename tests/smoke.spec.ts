import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Visits every static (non :id) route, asserts:
 *  - page reaches a navigable URL (no infinite redirect / login bounce)
 *  - no React error boundary fallback was rendered
 *  - no uncaught page errors
 *  - console.error log is clean (with a small allowlist for known noise)
 *
 * Detail routes (with :id params) are covered by the interaction tests.
 */

const STATIC_ROUTES = [
  '/dashboard',
  '/controls',
  '/evidence',
  '/frameworks',
  '/policies',
  '/risks',
  '/risk-dashboard',
  '/risk-queue',
  '/risk-heatmap',
  '/risk-scenarios',
  '/risk-reports',
  '/vendors',
  '/assessments',
  '/contracts',
  '/questionnaires',
  '/knowledge-base',
  '/trust-center',
  '/audits',
  '/audit-requests',
  '/audit-findings',
  '/assets',
  '/integrations',
  '/audit',
  '/settings',
  '/settings/notifications',
  '/settings/risk',
  '/tools/awareness',
  '/users',
  '/permissions',
  '/design-system',
];

// Allowlisted console noise that doesn't indicate a real bug.
const CONSOLE_ALLOWLIST = [
  /Download the React DevTools/i,
  /Keycloak/i, // dev-mode init logs from AuthContext
  /Token parsed/,
  /Profile:/,
  /Restoring dev auth session/,
  /Dev login activated/,
  // Network errors are environment problems, not redesign bugs:
  /Failed to load resource/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_/,
  /AxiosError/,
  /404 \(Not Found\)/,
  /500 \(Internal Server Error\)/,
];

function isAllowlistedNoise(msg: ConsoleMessage | Error): boolean {
  const text = 'message' in msg ? msg.message : msg.text();
  return CONSOLE_ALLOWLIST.some((re) => re.test(text));
}

for (const route of STATIC_ROUTES) {
  test(`${route} loads without errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isAllowlistedNoise(msg)) {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      if (!isAllowlistedNoise(err)) {
        pageErrors.push(err.message);
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });

    // Did we end up on the route (not redirected to /login)?
    await expect(page).toHaveURL(new RegExp(route.replace(/\//g, '\\/') + '$'));

    // Give React + queries a moment to settle. Don't wait for networkidle —
    // backend services may have long-polling requests that never go idle.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Error boundary fallback should NOT be visible
    await expect(page.getByText('Something went wrong')).toHaveCount(0);

    // Sidebar should be present (layout mounted)
    await expect(page.getByText('GigaChad GRC').first()).toBeVisible();

    // No uncaught errors / no unexpected console errors
    expect(pageErrors, `Uncaught page errors on ${route}:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors on ${route}:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
}
