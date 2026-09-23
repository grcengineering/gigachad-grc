import { expect, test } from '@playwright/test';

test('awareness page renders API-backed training and phishing data', async ({ page }) => {
  await page.route('**/api/training/modules', (route) =>
    route.fulfill({
      json: {
        builtIn: [
          {
            id: 'general-cybersecurity',
            name: 'General Cybersecurity Awareness',
            category: 'general',
            duration: 15,
            difficulty: 'beginner',
            isBuiltIn: true,
          },
        ],
        custom: [],
      },
    })
  );
  await page.route('**/api/training/admin/campaigns**', (route) =>
    route.fulfill({
      json: {
        campaigns: [
          {
            id: 'campaign-1',
            name: 'Annual Awareness',
            status: 'active',
            assigned: 12,
            completed: 9,
            overdue: 1,
          },
        ],
      },
    })
  );
  await page.route('**/api/phishing/campaigns', (route) =>
    route.fulfill({
      json: [
        {
          id: 'phish-1',
          name: 'Quarterly simulation',
          status: 'active',
          targetCount: 20,
          clickedCount: 2,
          reportedCount: 11,
        },
      ],
    })
  );

  await page.goto('/tools/awareness');
  await expect(page.getByText('General Cybersecurity Awareness')).toBeVisible();
  await expect(page.getByText('Quarterly simulation')).toBeVisible();
  await expect(page.getByText('20 targets · 2 clicked · 11 reported')).toBeVisible();
});

test('training admin creates a campaign using backend endpoints', async ({ page }) => {
  let createPayload: Record<string, unknown> | undefined;
  await page.route('**/api/training/admin/campaigns**', (route) =>
    route.fulfill({
      json: {
        campaigns: [],
        summary: {
          activeCampaigns: 0,
          totalAssignments: 0,
          completionPct: 0,
          overdueCount: 0,
        },
      },
    })
  );
  await page.route('**/api/training/modules', (route) =>
    route.fulfill({
      json: {
        builtIn: [
          {
            id: 'general-cybersecurity',
            name: 'General Cybersecurity Awareness',
            isBuiltIn: true,
          },
        ],
        custom: [],
      },
    })
  );
  await page.route('**/api/training/campaigns', async (route) => {
    if (route.request().method() === 'POST') {
      createPayload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: 'new-campaign' } });
    }
    return route.continue();
  });

  await page.goto('/settings/training');
  await page.getByRole('button', { name: 'Create campaign' }).first().click();
  await page.getByLabel('Campaign name').fill('Secure engineering refresher');
  await page.getByRole('button', { name: /General Cybersecurity Awareness/ }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();

  await expect.poll(() => createPayload?.name).toBe('Secure engineering refresher');
  expect(createPayload?.moduleIds).toEqual(['general-cybersecurity']);
  expect(createPayload?.targetGroups).toEqual(['all']);
});

test('account shows real provider availability instead of placeholder success', async ({
  page,
}) => {
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: {
        id: 'user-1',
        name: 'Alex Rivera',
        email: 'alex@example.com',
        role: 'admin',
        avatarUrl: null,
        timezone: 'UTC',
        twoFactorEnabled: null,
        identity: {
          accountConsoleAvailable: false,
          passwordApiAvailable: false,
          totpApiAvailable: false,
          sessionsApiAvailable: false,
          accountUrl: null,
        },
        apiKeys: [],
        notifications: [],
      },
    })
  );
  await page.route('**/api/me/totp', (route) =>
    route.fulfill({ json: { enabled: null, status: 'unavailable', setupUrl: null } })
  );
  await page.route('**/api/me/sessions', (route) =>
    route.fulfill({ json: { status: 'unavailable', sessions: [], manageUrl: null } })
  );

  await page.goto('/account');
  await expect(page.getByLabel('Email')).toBeDisabled();
  await page.getByRole('tab', { name: 'Password' }).click();
  await expect(page.getByText('Identity provider unavailable')).toBeVisible();
  await page.getByRole('tab', { name: '2FA' }).click();
  await expect(page.getByText('Setup unavailable')).toBeVisible();
});

test('help routes and article content come from docs/help', async ({ page }) => {
  await page.goto('/help');
  const article = page.getByRole('link', { name: 'Awareness Training' });
  await expect(article).toBeVisible();
  await article.click();
  await expect(page).toHaveURL(/\/help\/employee-compliance\/training$/);
  await expect(page.getByRole('heading', { name: 'Training Programs' })).toBeVisible();
});
