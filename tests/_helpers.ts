/**
 * Test helpers: fetch real seed-data IDs at test runtime via Vite proxy (port 3000)
 * which routes to the correct backend service.
 */
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const HEADERS = {
  'x-user-id': '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  'x-organization-id': '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
};

async function getJson<T = any>(req: APIRequestContext, path: string): Promise<T | null> {
  let lastFailure = 'request did not complete';
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await req.get(`${BASE}${path}`, { headers: HEADERS });
      if (r.ok()) return (await r.json()) as T;
      lastFailure = `${r.status()} ${await r.text()}`;
      if (r.status() !== 429 && r.status() < 500) break;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw new Error(`GET ${path} failed: ${lastFailure}`);
}

async function postJson<T = any>(
  req: APIRequestContext,
  path: string,
  data: Record<string, unknown>
): Promise<T | null> {
  try {
    const response = await req.post(`${BASE}${path}`, { headers: HEADERS, data });
    if (!response.ok()) {
      throw new Error(`POST ${path} failed: ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

function extractFirstId(body: any): string {
  if (!body) return '';
  if (Array.isArray(body)) return body[0]?.id ?? '';
  if (Array.isArray(body.data)) return body.data[0]?.id ?? '';
  if (Array.isArray(body.risks)) return body.risks[0]?.id ?? '';
  return '';
}

export async function firstControlId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/controls?limit=1'));
}

export async function firstEvidenceId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/evidence?limit=1'));
}

export async function firstFrameworkId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/frameworks'));
}

export async function firstPolicyId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/policies?limit=1'));
}

export async function firstRiskId(req: APIRequestContext): Promise<string> {
  // Risks endpoint returns { risks: [], total, page, limit }
  const body = await getJson<any>(req, '/api/risks?limit=1');
  return body?.risks?.[0]?.id ?? extractFirstId(body);
}

export async function firstVendorId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/vendors'));
}

export async function firstAssessmentId(req: APIRequestContext): Promise<string> {
  const existing = extractFirstId(await getJson(req, '/api/assessments'));
  if (existing) return existing;
  const frameworkId = await firstFrameworkId(req);
  if (!frameworkId) return '';
  const created = await postJson(req, '/api/assessments', {
    frameworkId,
    name: `Playwright assessment ${Date.now()}`,
    description: 'Created by end-to-end detail coverage',
  });
  return created?.id ?? '';
}

export async function firstContractId(req: APIRequestContext): Promise<string> {
  const existing = extractFirstId(await getJson(req, '/api/contracts'));
  if (existing) return existing;
  const vendorId = await firstVendorId(req);
  if (!vendorId) return '';
  const created = await postJson(req, '/api/contracts', {
    vendorId,
    contractType: 'msa',
    title: `Playwright contract ${Date.now()}`,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return created?.id ?? '';
}

export async function firstQuestionnaireId(req: APIRequestContext): Promise<string> {
  const existing = extractFirstId(await getJson(req, '/api/questionnaires'));
  if (existing) return existing;
  const created = await postJson(req, '/api/questionnaires', {
    requesterName: 'Playwright Requester',
    requesterEmail: 'playwright@example.com',
    title: `Playwright questionnaire ${Date.now()}`,
    description: 'Created by end-to-end detail coverage',
    status: 'pending',
    priority: 'medium',
  });
  return created?.id ?? '';
}

export async function firstKnowledgeBaseId(req: APIRequestContext): Promise<string> {
  const existing = extractFirstId(await getJson(req, '/api/knowledge-base'));
  if (existing) return existing;
  const created = await postJson(req, '/api/knowledge-base', {
    category: 'security',
    title: `Playwright knowledge entry ${Date.now()}`,
    question: 'How is this detail flow tested?',
    answer: 'With a persisted API fixture and a real browser navigation.',
    status: 'approved',
  });
  return created?.id ?? '';
}

/** Common assertions: no error boundary, no uncaught errors, app shell mounted. */
export async function expectPageHealthy(page: Page, pageErrors: string[]): Promise<void> {
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(page.getByText('GigaChad GRC').first()).toBeVisible();
  expect(pageErrors, `Uncaught errors:\n${pageErrors.join('\n')}`).toEqual([]);
}

export function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`${err.name}: ${err.message}`));
  return errors;
}

/** Console-error allowlist — known noise from dev tooling / network / CSP. */
export const CONSOLE_ALLOWLIST = [
  /Download the React DevTools/i,
  /Keycloak/i,
  /Token parsed/,
  /Profile:/,
  /Restoring dev auth session/,
  /Dev login activated/,
  /Failed to load resource/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /ERR_/,
  /AxiosError/,
  /404 \(Not Found\)/,
  /500 \(Internal Server Error\)/,
  /frame-ancestors/i, // CSP block on embedded PDF previews in dev
  /Content Security Policy/i,
];

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (CONSOLE_ALLOWLIST.some((re) => re.test(text))) return;
    errors.push(text);
  });
  return errors;
}
