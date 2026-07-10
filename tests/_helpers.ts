/**
 * Test helpers: fetch real seed-data IDs at test runtime via Vite proxy (port 3000)
 * which routes to the correct backend service.
 */
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const HEADERS = {
  'x-user-id': '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
  'x-organization-id': '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
};

async function getJson<T = any>(req: APIRequestContext, path: string): Promise<T | null> {
  try {
    const r = await req.get(`${BASE}${path}`, { headers: HEADERS });
    if (!r.ok()) return null;
    return (await r.json()) as T;
  } catch {
    return null;
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
  return extractFirstId(await getJson(req, '/api/assessments'));
}

export async function firstContractId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/contracts'));
}

export async function firstQuestionnaireId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/questionnaires'));
}

export async function firstKnowledgeBaseId(req: APIRequestContext): Promise<string> {
  return extractFirstId(await getJson(req, '/api/knowledge-base'));
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
