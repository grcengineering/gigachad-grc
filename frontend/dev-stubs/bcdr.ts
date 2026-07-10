/**
 * BC/DR dev stubs. See `_helpers.ts` for the middleware factory.
 */

import { type StubHandler, EMPTY_PAGED, stubId, now } from './_helpers';

export const bcdrHandlers: StubHandler[] = [
  // Dashboard
  { method: 'GET', path: '/dashboard', body: () => ({
    processes: { total: 0, tier_1_count: 0, tier_2_count: 0, tier_3_count: 0, tier_4_count: 0, overdue_review_count: 0 },
    plans: { total: 0, published_count: 0, draft_count: 0, overdue_review_count: 0 },
    tests: { total: 0, completed_count: 0, passed_count: 0, failed_count: 0, upcoming_count: 0, openFindingsCount: 0 },
    runbooks: { total: 0, published_count: 0, needs_review_count: 0 },
    upcomingTests: [],
    overdueItems: { totalOverdue: 0, plans: [], processes: [], findings: [] },
  })},
  { method: 'GET', path: '/dashboard/metrics', body: () => ({
    readinessScore: 0,
    metrics: { rtoCoverage: 0, planCoverage: 0, testSuccessRate: 0, overdueItems: 0 },
  })},
  { method: 'GET', path: '/dashboard/vendor-gaps', body: () => [] },
  { method: 'GET', path: '/attestations/pending', body: () => [] },

  // Plans
  { method: 'GET', path: '/plans', body: () => EMPTY_PAGED },
  { method: 'POST', path: '/plans', body: (_p, payload) => ({ id: stubId(), ...(payload as object), status: 'draft', version: '0.1', createdAt: now() }) },
  { method: 'GET', path: '/plans/:id', body: () => ({ __status: 404, body: { message: 'Plan not found' } }) },
  { method: 'PUT', path: '/plans/:id', body: ({ id }, payload) => ({ id, ...(payload as object), updatedAt: now() }) },
  { method: 'DELETE', path: '/plans/:id', body: () => ({ success: true }) },

  // Incidents
  { method: 'GET', path: '/incidents', body: () => EMPTY_PAGED },
  { method: 'GET', path: '/incidents/active', body: () => [] },
  { method: 'GET', path: '/incidents/stats', body: () => ({ active_count: 0, resolved_30d: 0, avg_time_to_contain: null, total_ytd: 0 }) },
  { method: 'POST', path: '/incidents', body: (_p, payload) => ({ id: stubId(), ...(payload as object), status: 'declared', declared_at: now() }) },
  { method: 'GET', path: '/incidents/:id', body: () => ({ __status: 404, body: { message: 'Incident not found' } }) },
  { method: 'PUT', path: '/incidents/:id', body: ({ id }, payload) => ({ id, ...(payload as object), updatedAt: now() }) },

  // DR tests
  { method: 'GET', path: '/tests', body: () => EMPTY_PAGED },
  { method: 'GET', path: '/tests/stats', body: () => ({ upcoming: 0, pass_rate: 0, open_findings: 0, total: 0 }) },
  { method: 'POST', path: '/tests', body: (_p, payload) => ({ id: stubId(), ...(payload as object), status: 'scheduled', createdAt: now() }) },
  { method: 'GET', path: '/tests/:id', body: () => ({ __status: 404, body: { message: 'Test not found' } }) },
  { method: 'PUT', path: '/tests/:id', body: ({ id }, payload) => ({ id, ...(payload as object) }) },

  // Runbooks
  { method: 'GET', path: '/runbooks', body: () => EMPTY_PAGED },
  { method: 'GET', path: '/runbooks/stats', body: () => ({ published_count: 0, needs_review_count: 0, total: 0 }) },
  { method: 'POST', path: '/runbooks', body: (_p, payload) => ({ id: stubId(), ...(payload as object), status: 'draft', createdAt: now() }) },
  { method: 'GET', path: '/runbooks/:id', body: () => ({ __status: 404, body: { message: 'Runbook not found' } }) },
  { method: 'PUT', path: '/runbooks/:id', body: ({ id }, payload) => ({ id, ...(payload as object) }) },

  // Business processes
  { method: 'GET', path: '/processes', body: () => EMPTY_PAGED },
  { method: 'POST', path: '/processes', body: (_p, payload) => ({ id: stubId(), ...(payload as object), createdAt: now() }) },
  { method: 'GET', path: '/processes/:id', body: () => ({ __status: 404, body: { message: 'Process not found' } }) },
  { method: 'PUT', path: '/processes/:id', body: ({ id }, payload) => ({ id, ...(payload as object) }) },

  // Recovery teams
  { method: 'GET', path: '/recovery-teams', body: () => EMPTY_PAGED },
  { method: 'GET', path: '/recovery-teams/stats', body: () => ({ total: 0, member_total: 0, on_call_count: 0 }) },
  { method: 'POST', path: '/recovery-teams', body: (_p, payload) => ({ id: stubId(), ...(payload as object), createdAt: now() }) },
  { method: 'GET', path: '/recovery-teams/:id', body: () => ({ __status: 404, body: { message: 'Recovery team not found' } }) },
  { method: 'PUT', path: '/recovery-teams/:id', body: ({ id }, payload) => ({ id, ...(payload as object) }) },

  // Communication plans — static "/escalation" before "/:id"
  { method: 'GET', path: '/communication/escalation', body: () => [] },
  { method: 'GET', path: '/communication', body: () => EMPTY_PAGED },
  { method: 'POST', path: '/communication', body: (_p, payload) => ({ id: stubId(), ...(payload as object), status: 'draft', createdAt: now() }) },
  { method: 'GET', path: '/communication/:id', body: () => ({ __status: 404, body: { message: 'Communication plan not found' } }) },
  { method: 'PUT', path: '/communication/:id', body: ({ id }, payload) => ({ id, ...(payload as object) }) },

  // Exercise templates — static "/categories" before "/:id"
  { method: 'GET', path: '/exercise-templates/categories', body: () => ['tabletop', 'walkthrough', 'simulation', 'full_interruption'] },
  { method: 'GET', path: '/exercise-templates', body: () => ({ data: [] }) },
  { method: 'POST', path: '/exercise-templates', body: (_p, payload) => ({ id: stubId(), ...(payload as object), createdAt: now() }) },
  { method: 'GET', path: '/exercise-templates/:id', body: () => ({ __status: 404, body: { message: 'Exercise template not found' } }) },
];
