/**
 * Audit-deep dev stubs: analytics, calendar, templates, workpapers,
 * test-procedures, auditor portal, auditor auth. The base `/api/audits`
 * CRUD is implemented by the real audit service — do NOT re-stub it
 * here. We only stub the endpoints the audit service doesn't have.
 *
 * Mounted at `/api/audits` (alongside the real backend). The middleware
 * factory falls through to the real service for unmatched paths via
 * Vite's proxy chain.
 */

import { type StubHandler, stubToken, now } from './_helpers';

export const auditDeepHandlers: StubHandler[] = [
  // Analytics
  {
    method: 'GET',
    path: '/analytics',
    body: () => ({
      auditsInFlight: 0,
      findingsOpen: 0,
      completionRate: 0,
      avgCycleDays: 0,
      findingsBySeverity: [],
      completionTimeline: [],
      byFramework: [],
      byAuditType: [],
    }),
  },
  // Calendar
  { method: 'GET', path: '/calendar', body: () => ({ events: [] }) },
  // Templates
  { method: 'GET', path: '/templates', body: () => ({ templates: [] }) },
  // Workpapers
  { method: 'GET', path: '/workpapers', body: () => ({ workpapers: [] }) },
  // Test procedures
  { method: 'GET', path: '/test-procedures', body: () => ({ procedures: [] }) },
];

export const auditorPortalHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/portal',
    body: () => ({
      auditor: { name: 'Auditor', email: 'auditor@example.com' },
      audits: [],
      requests: [],
      workpapers: [],
      stats: { activeAudits: 0, pendingRequests: 0, workpapersAwaiting: 0, findingsToReview: 0 },
    }),
  },
  {
    method: 'POST',
    path: '/auth/login',
    body: (_p, payload) => {
      const body = (payload as { email?: string; token?: string }) || {};
      if (body.token) {
        return {
          token: stubToken('aud', 12),
          redirectTo: '/auditor-portal',
        };
      }
      return {
        sent: true,
        email: body.email ?? null,
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      };
    },
  },
  { method: 'POST', path: '/auth/logout', body: () => ({ success: true, signedOutAt: now() }) },
];
