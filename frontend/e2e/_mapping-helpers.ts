/**
 * Shared helpers for the mapping e2e specs.
 *
 * The seeded catalog frameworks (SOC 2, ISO 27001, HIPAA) have ONLY
 * category rows at the top level — non-category leaves are nested 1+
 * levels deep via parentId. `GET /api/frameworks/:id/requirements`
 * defaults to parentId=null, so it never returns leaves directly.
 *
 * `discoverMappingFixture` walks `.children` recursively (via the
 * `/requirements/tree` endpoint) to find the first non-category leaf
 * plus the chain of ancestor refs needed to expand the tree in the UI.
 *
 * `openRequirementDetail` navigates to the framework page and clicks
 * each ancestor's `aria-label="Toggle <ref>"` chevron in order before
 * clicking the leaf row.
 *
 * Every mapping spec that needs to drive the FrameworkDetail UI should
 * import these helpers rather than re-implementing them.
 */
import { expect, APIRequestContext } from '@playwright/test';

export const URL_CONTROLS = 'http://127.0.0.1:3001';
export const URL_FRAMEWORKS = 'http://127.0.0.1:3002';

export interface MappingFixture {
  frameworkId: string;
  requirementId: string;
  requirementRef: string;
  /**
   * Top-down chain of ancestor category references that must be expanded
   * in the FrameworkDetail tree before the leaf row becomes visible.
   * For HIPAA leaf `164.308(a)(1)(i)` this is
   * `["164.308", "164.308(a)", "164.308(a)(1)"]`.
   * Empty when the leaf is at the top level.
   */
  ancestorRefs: string[];
  controlAId: string;
  controlBId: string;
  /** Full controls list returned by /api/controls?limit=100 (max). */
  controls: any[];
}

interface FoundLeaf {
  leaf: any;
  ancestorRefs: string[];
}

function findLeafWithAncestors(nodes: any[], ancestors: string[] = []): FoundLeaf | undefined {
  for (const n of nodes) {
    if (!n.isCategory) return { leaf: n, ancestorRefs: ancestors };
    if (Array.isArray(n.children) && n.children.length > 0) {
      const hit = findLeafWithAncestors(n.children, [...ancestors, n.reference]);
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * Find a seeded framework that has at least one non-category requirement,
 * a leaf requirement under it, and two unmapped controls to wire up.
 * Throws with a specific message if discovery fails — important so the
 * cause surfaces immediately rather than as opaque test timeouts.
 */
export async function discoverMappingFixture(api: APIRequestContext): Promise<MappingFixture> {
  const fwRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks`);
  if (!fwRes.ok()) {
    throw new Error(`Could not list frameworks: ${fwRes.status()}`);
  }
  const fwBody = await fwRes.json();
  const frameworks: any[] = Array.isArray(fwBody)
    ? fwBody
    : (fwBody.data ?? fwBody.items ?? fwBody.frameworks ?? []);
  if (frameworks.length === 0) {
    throw new Error('Seed produced no frameworks; cannot pick a target');
  }

  let chosenFwId: string | undefined;
  let chosenReq: any | undefined;
  let chosenAncestors: string[] = [];
  for (const fw of frameworks) {
    // Prefer the `/tree` endpoint (full hierarchy); fall back to the
    // regular endpoint + recurse into `.children` if `/tree` is unavailable.
    let reqs: any[] = [];
    const treeRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${fw.id}/requirements/tree`);
    if (treeRes.ok()) {
      const body = await treeRes.json();
      reqs = Array.isArray(body) ? body : (body.data ?? body.items ?? body.requirements ?? []);
    } else {
      const reqRes = await api.get(`${URL_FRAMEWORKS}/api/frameworks/${fw.id}/requirements`);
      if (!reqRes.ok()) continue;
      const reqBody = await reqRes.json();
      reqs = Array.isArray(reqBody)
        ? reqBody
        : (reqBody.data ?? reqBody.items ?? reqBody.requirements ?? []);
    }
    const candidate = findLeafWithAncestors(reqs);
    if (candidate) {
      chosenFwId = fw.id;
      chosenReq = candidate.leaf;
      chosenAncestors = candidate.ancestorRefs;
      break;
    }
  }
  if (!chosenFwId || !chosenReq) {
    throw new Error(
      'No framework with a non-category requirement found in seed. ' +
        'This is a test-code bug, not a seed bug: every seeded catalog has ' +
        'non-category leaves nested under categories. Use `.children` recursively.'
    );
  }

  // The backend caps controls list at 100. Anything higher returns 400.
  const ctrlRes = await api.get(`${URL_CONTROLS}/api/controls?limit=100`);
  if (!ctrlRes.ok()) {
    throw new Error(`Could not list controls: ${ctrlRes.status()}`);
  }
  const ctrlBody = await ctrlRes.json();
  const controls: any[] = Array.isArray(ctrlBody)
    ? ctrlBody
    : (ctrlBody.data ?? ctrlBody.items ?? ctrlBody.controls ?? []);
  const mappedIds = new Set<string>(
    (chosenReq.mappings ?? []).map((m: any) => m.control?.id ?? m.controlId)
  );
  const unmapped = controls.filter((c) => !mappedIds.has(c.id));
  if (unmapped.length < 2) {
    throw new Error('Need at least two unmapped controls to exercise multi-select');
  }

  return {
    frameworkId: chosenFwId,
    requirementId: chosenReq.id,
    requirementRef: chosenReq.reference ?? '',
    ancestorRefs: chosenAncestors,
    controlAId: unmapped[0].id,
    controlBId: unmapped[1].id,
    controls,
  };
}

/**
 * Navigate to the framework detail page and click into the chosen
 * requirement. Expands each ancestor category in the FrameworkDetail
 * tree first so the leaf row becomes visible.
 */
export async function openRequirementDetail(
  page: import('@playwright/test').Page,
  frameworkId: string,
  requirementRef: string,
  ancestorRefs: string[] = []
): Promise<void> {
  await page.goto(`/frameworks/${frameworkId}`);
  await page.waitForLoadState('networkidle');

  for (const ref of ancestorRefs) {
    // The chevron carries `aria-label="Toggle <reference>"` so we can target
    // it reliably without relying on Tailwind classes or row layout.
    // `exact: true` matters: ref="164.308" must not match "164.308(a)" via
    // Playwright's default substring fuzzy-match.
    const toggle = page.getByRole('button', { name: `Toggle ${ref}`, exact: true });
    const expanded = await toggle.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await toggle.click();
    }
  }

  const row = page.getByText(requirementRef, { exact: true }).first();
  await row.click();
  await expect(page.getByText(/Mapped Controls/i)).toBeVisible();
}

/** Delete every mapping currently attached to a requirement. Best-effort. */
export async function cleanRequirementMappings(
  api: APIRequestContext,
  requirementId: string
): Promise<void> {
  const res = await api.get(`${URL_FRAMEWORKS}/api/mappings/by-requirement/${requirementId}`);
  if (!res.ok()) return;
  const body = await res.json();
  const items: any[] = Array.isArray(body) ? body : (body.data ?? body.items ?? []);
  for (const m of items) {
    if (m.id) await api.delete(`${URL_FRAMEWORKS}/api/mappings/${m.id}`).catch(() => undefined);
  }
}
