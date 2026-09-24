import { expect, test, type ConsoleMessage } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/controls',
  '/controls/new',
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
  '/vendors/new',
  '/assessments',
  '/contracts',
  '/questionnaires',
  '/knowledge-base',
  '/trust-center',
  '/audits',
  '/audits/new',
  '/audit-requests',
  '/audit-findings',
  '/audit-templates',
  '/audit-workpapers',
  '/audit-analytics',
  '/audit-calendar',
  '/test-procedures',
  '/auditor-portal',
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
  '/bcdr',
  '/bcdr/plans',
  '/bcdr/incidents',
  '/bcdr/tests',
  '/bcdr/runbooks',
  '/bcdr/processes',
  '/bcdr/recovery-teams',
  '/bcdr/communication',
  '/bcdr/exercise-templates',
  '/people',
  '/people/training',
  '/settings/employee-compliance',
  '/settings/training',
  '/settings/mcp',
  '/settings/tprm',
  '/settings/trust',
  '/settings/config-as-code',
  '/settings/workspaces',
  '/account',
  '/docs',
  '/dashboards',
  '/calendar',
  '/framework-library',
  '/reports/mapping-gaps',
  '/reports/builder',
  '/scheduled-reports',
  '/tools/ai-risk-assistant',
  '/answer-templates',
  '/trust-center/settings',
  '/help',
] as const;

const CONSOLE_ALLOWLIST = [
  /Download the React DevTools/i,
  /Restoring dev auth session/i,
  /Failed to load resource: the server responded with a status of 404/i,
];

function isUnexpectedConsoleError(message: ConsoleMessage): boolean {
  return (
    message.type() === 'error' && !CONSOLE_ALLOWLIST.some((allowed) => allowed.test(message.text()))
  );
}

for (const route of ROUTES) {
  test(`${route} has a healthy real-data contract`, async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedApis: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (isUnexpectedConsoleError(message)) consoleErrors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        failedApis.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(page.getByText(/couldn't load|service didn't respond/i)).toHaveCount(0);
    expect(pageErrors, `Uncaught errors on ${route}`).toEqual([]);
    expect(failedApis, `Failed API calls on ${route}`).toEqual([]);
    expect(consoleErrors, `Console errors on ${route}`).toEqual([]);
  });
}

test('public login routes render without crashes', async ({ page }) => {
  for (const route of ['/login', '/auditor-login']) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(250);
    expect(errors, route).toEqual([]);
  }
});
