import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

const FRONTEND_URL = process.env.CLEAN_STACK_FRONTEND_URL || 'http://127.0.0.1:3000';
const GATEWAY_URL = process.env.CLEAN_STACK_GATEWAY_URL || 'https://127.0.0.1';
const CONTROLS_URL = process.env.CLEAN_STACK_CONTROLS_URL || 'http://127.0.0.1:3001';

const ADMIN_A = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';
const COMPLIANCE_A = 'a1b2c3d4-0001-0000-0000-000000000001';
const VIEWER_A = 'a1b2c3d4-0003-0000-0000-000000000003';
const ADMIN_B = 'b1b2c3d4-0001-0000-0000-000000000001';

function asUser(userId: string) {
  return { 'x-dev-user-id': userId };
}

async function json<T>(response: APIResponse, expectedStatus = 200): Promise<T> {
  expect(response.status()).toBe(expectedStatus);
  expect(response.headers()['content-type']).toContain('application/json');
  return (await response.json()) as T;
}

async function getControls(request: APIRequestContext, userId: string, search: string) {
  const response = await request.get(`${CONTROLS_URL}/api/controls`, {
    headers: asUser(userId),
    params: { search, limit: 100 },
  });
  return json<{
    data: Array<{ id: string; controlId: string; title: string }>;
    meta: { total: number };
  }>(response);
}

test.describe.serial('clean stack release gate', () => {
  test('serves SPA routes as HTML and API routes as JSON', async ({ request }) => {
    const spa = await request.get(`${FRONTEND_URL}/settings`);
    expect(spa.status()).toBe(200);
    expect(spa.headers()['content-type']).toContain('text/html');

    const apiRoutes = [
      `${GATEWAY_URL}/api/controls?limit=1`,
      `${GATEWAY_URL}/api/seed/status`,
      `${FRONTEND_URL}/api/organization`,
      `${FRONTEND_URL}/api/frameworks/catalog`,
    ];

    for (const route of apiRoutes) {
      const response = await request.get(route, { headers: asUser(ADMIN_A) });
      expect(response.status(), route).toBe(200);
      expect(response.headers()['content-type'], route).toContain('application/json');
    }
  });

  test('persists organization appearance settings through the API', async ({ request }) => {
    const current = await json<{
      id: string;
      name: string;
      settings: { dateFormat: string; timezone: string };
    }>(
      await request.get(`${CONTROLS_URL}/api/organization`, {
        headers: asUser(ADMIN_A),
      })
    );
    const nextDateFormat =
      current.settings.dateFormat === 'MM/DD/YYYY' ? 'YYYY-MM-DD' : 'MM/DD/YYYY';

    const updated = await json<{ id: string; settings: { dateFormat: string } }>(
      await request.patch(`${CONTROLS_URL}/api/organization`, {
        headers: asUser(ADMIN_A),
        data: { settings: { dateFormat: nextDateFormat } },
      })
    );
    expect(updated.id).toBe(current.id);
    expect(updated.settings.dateFormat).toBe(nextDateFormat);

    const reloaded = await json<{ settings: { dateFormat: string } }>(
      await request.get(`${CONTROLS_URL}/api/organization`, {
        headers: asUser(ADMIN_A),
      })
    );
    expect(reloaded.settings.dateFormat).toBe(nextDateFormat);
  });

  test('restores the persisted theme in the built frontend', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(`${FRONTEND_URL}/login`);

    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
  });

  test('persists an activated framework catalog selection', async ({ request }) => {
    type CatalogItem = {
      id: string;
      requirementCount: number;
      isActivated: boolean;
      activatedFrameworkId?: string;
    };

    const status = await json<CatalogItem[]>(
      await request.get(`${CONTROLS_URL}/api/frameworks/catalog/status`, {
        headers: asUser(ADMIN_A),
      })
    );
    const target = status
      .filter((item) => !item.isActivated)
      .sort((left, right) => left.requirementCount - right.requirementCount)[0];
    expect(target, 'expected at least one unactivated catalog framework').toBeTruthy();
    if (!target) throw new Error('No unactivated catalog framework available');

    const activated = await json<{ frameworkId: string; requirementsCreated: number }>(
      await request.post(`${CONTROLS_URL}/api/frameworks/catalog/${target.id}/activate`, {
        headers: asUser(ADMIN_A),
      }),
      201
    );
    expect(activated.requirementsCreated).toBeGreaterThan(0);

    const reloaded = await json<CatalogItem[]>(
      await request.get(`${CONTROLS_URL}/api/frameworks/catalog/status`, {
        headers: asUser(ADMIN_A),
      })
    );
    expect(reloaded.find((item) => item.id === target.id)).toMatchObject({
      isActivated: true,
      activatedFrameworkId: activated.frameworkId,
    });
  });

  test('isolates tenant data in list and detail APIs', async ({ request }) => {
    const tenantA = await getControls(request, ADMIN_A, 'B-CTRL-');
    const tenantB = await getControls(request, ADMIN_B, 'B-CTRL-');

    expect(tenantA.meta.total).toBe(0);
    expect(tenantA.data).toEqual([]);
    expect(tenantB.meta.total).toBe(5);
    expect(tenantB.data).toHaveLength(5);
    expect(tenantB.data.every((control) => control.controlId.startsWith('B-CTRL-'))).toBe(true);

    const tenantBControl = tenantB.data[0];
    await json(
      await request.get(`${CONTROLS_URL}/api/controls/${tenantBControl.id}`, {
        headers: asUser(ADMIN_A),
      }),
      404
    );
    const visibleToOwner = await json<{ id: string }>(
      await request.get(`${CONTROLS_URL}/api/controls/${tenantBControl.id}`, {
        headers: asUser(ADMIN_B),
      })
    );
    expect(visibleToOwner.id).toBe(tenantBControl.id);
  });

  test('enforces control creation roles through the real API', async ({ request }) => {
    const payload = {
      controlId: `CI-RBAC-${Date.now()}`,
      title: 'CI RBAC gate control',
      description: 'Created only to verify the clean-stack role gate.',
      category: 'access_control',
    };

    await json(
      await request.post(`${CONTROLS_URL}/api/controls`, {
        headers: asUser(VIEWER_A),
        data: payload,
      }),
      403
    );

    const created = await json<{ id: string; controlId: string }>(
      await request.post(`${CONTROLS_URL}/api/controls`, {
        headers: asUser(COMPLIANCE_A),
        data: payload,
      }),
      201
    );
    expect(created.controlId).toBe(payload.controlId);

    const viewerCanRead = await json<{ id: string }>(
      await request.get(`${CONTROLS_URL}/api/controls/${created.id}`, {
        headers: asUser(VIEWER_A),
      })
    );
    expect(viewerCanRead.id).toBe(created.id);
  });

  test('prevents viewers from mutating tasks and assets', async ({ request }) => {
    const task = await request.post(`${CONTROLS_URL}/api/tasks`, {
      headers: asUser(VIEWER_A),
      data: { title: 'Unauthorized task mutation' },
    });
    expect(task.status()).toBe(403);

    const asset = await request.post(`${CONTROLS_URL}/api/assets`, {
      headers: asUser(VIEWER_A),
      data: { name: 'Unauthorized asset mutation', assetType: 'server' },
    });
    expect(asset.status()).toBe(403);
  });
});
