import { test, expect } from '@playwright/test';
import {
  firstControlId,
  firstEvidenceId,
  firstFrameworkId,
  firstPolicyId,
  firstRiskId,
  firstVendorId,
  firstAssessmentId,
  firstContractId,
  firstQuestionnaireId,
  firstKnowledgeBaseId,
  expectPageHealthy,
  trackPageErrors,
  trackConsoleErrors,
} from './_helpers';

const detailRoutes: Array<{
  name: string;
  path: (id: string) => string;
  fetchId: (req: import('@playwright/test').APIRequestContext) => Promise<string>;
}> = [
  { name: 'ControlDetail', path: (id) => `/controls/${id}`, fetchId: firstControlId },
  { name: 'EvidenceDetail', path: (id) => `/evidence/${id}`, fetchId: firstEvidenceId },
  { name: 'FrameworkDetail', path: (id) => `/frameworks/${id}`, fetchId: firstFrameworkId },
  { name: 'PolicyDetail', path: (id) => `/policies/${id}`, fetchId: firstPolicyId },
  { name: 'RiskDetail', path: (id) => `/risks/${id}`, fetchId: firstRiskId },
  { name: 'VendorDetail', path: (id) => `/vendors/${id}`, fetchId: firstVendorId },
  { name: 'AssessmentDetail', path: (id) => `/assessments/${id}`, fetchId: firstAssessmentId },
  { name: 'ContractDetail', path: (id) => `/contracts/${id}`, fetchId: firstContractId },
  {
    name: 'QuestionnaireDetail',
    path: (id) => `/questionnaires/${id}`,
    fetchId: firstQuestionnaireId,
  },
  {
    name: 'KnowledgeBaseDetail',
    path: (id) => `/knowledge-base/${id}`,
    fetchId: firstKnowledgeBaseId,
  },
];

for (const route of detailRoutes) {
  test(`${route.name} loads cleanly`, async ({ page, request }) => {
    const id = await route.fetchId(request);
    test.skip(!id, `No seed data — skipping ${route.name}`);

    const pageErrors = trackPageErrors(page);
    const consoleErrors = trackConsoleErrors(page);

    await page.goto(route.path(id), { waitUntil: 'domcontentloaded' });
    // Give detail data + child queries time to settle
    await page.waitForTimeout(800);

    // URL didn't bounce
    await expect(page).toHaveURL(
      new RegExp(route.path(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')
    );

    await expectPageHealthy(page, pageErrors);
    expect(consoleErrors, `Console errors on ${route.name}:\n${consoleErrors.join('\n')}`).toEqual(
      []
    );
  });
}

test('/controls/new loads (Add Control path)', async ({ page }) => {
  const pageErrors = trackPageErrors(page);
  await page.goto('/controls/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  // It routes to ControlDetail with id="new". We tolerate either a form/empty-state OR error fallback,
  // but require no uncaught exception.
  expect(pageErrors, `Uncaught errors on /controls/new:\n${pageErrors.join('\n')}`).toEqual([]);
});
