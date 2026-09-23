import { test, expect } from '@playwright/test';

test('risk scenarios render backend data instead of static fixtures', async ({ page }) => {
  await page.route('**/api/risk-scenarios**', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 'scenario-1',
            title: 'API-backed scenario',
            description: 'Loaded from the backend.',
            category: 'Data Breach',
            threatActor: 'external_attacker',
            attackVector: 'phishing',
            targetAssets: ['Email'],
            likelihood: 'likely',
            impact: 'major',
            tags: ['api'],
            isTemplate: false,
            usageCount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    })
  );
  await page.goto('/risk-scenarios');
  await expect(page.getByText('API-backed scenario')).toBeVisible();
});

test('employees map employee-compliance fields', async ({ page }) => {
  await page.route('**/api/employee-compliance**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/departments')) return route.fulfill({ json: ['Engineering'] });
    if (path.endsWith('/dashboard')) {
      return route.fulfill({
        json: { totalEmployees: 1, complianceRate: 100, issueBreakdown: { overdueTrainings: 0 } },
      });
    }
    return route.fulfill({
      json: {
        data: [
          {
            id: 'employee-1',
            email: 'alex@example.com',
            fullName: 'Alex Rivera',
            employmentStatus: 'active',
            complianceScore: 86,
            lastCorrelatedAt: '2026-09-20T12:00:00.000Z',
          },
        ],
        pagination: { total: 1 },
      },
    });
  });
  await page.goto('/people');
  await expect(page.getByText('Alex Rivera').first()).toBeVisible();
  await expect(page.getByText('86%').first()).toBeVisible();
});

test('evidence download uses authenticated metadata request and blob', async ({ page }) => {
  let headers: Record<string, string> = {};
  await page.route('**/api/evidence**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/download')) {
      headers = route.request().headers();
      return route.fulfill({ json: { url: '/api/evidence-file', filename: 'evidence.pdf' } });
    }
    if (path.endsWith('/stats')) return route.fulfill({ json: {} });
    return route.fulfill({
      json: {
        data: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            title: 'Access Review',
            filename: 'evidence.pdf',
            type: 'document',
            status: 'approved',
            createdAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      },
    });
  });
  await page.route('**/api/evidence-file', (route) =>
    route.fulfill({ body: 'pdf', headers: { 'Content-Type': 'application/pdf' } })
  );
  await page.goto('/evidence');
  const download = page.waitForEvent('download');
  await page.getByLabel('Download').click();
  expect((await download).suggestedFilename()).toBe('evidence.pdf');
  expect(headers['x-user-id']).not.toBe('system');
  expect(headers['x-organization-id']).toBeTruthy();
});
