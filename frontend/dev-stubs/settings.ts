/**
 * Settings + Account dev stubs. Covers /api/me, workspaces, dashboards,
 * MCP, TPRM config, Trust config, config-as-code. Each handler returns
 * realistic empty shapes so the UI renders without errors.
 */

import { type StubHandler, stubId, stubToken, now } from './_helpers';

// ============================================================
// /api/me
// ============================================================
export const meHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/',
    body: () => ({
      id: 'stub-me',
      name: 'Dev User',
      email: 'dev@example.com',
      role: 'admin',
      timezone: 'America/New_York',
      avatarUrl: null,
      mfaEnabled: false,
      apiKeys: [],
      notifications: {
        email: { risk_assigned: true, evidence_review: true, audit_request: true },
        inApp: { risk_assigned: true, evidence_review: true, audit_request: true },
      },
    }),
  },
  {
    method: 'PUT',
    path: '/',
    body: (_p, payload) => ({ id: 'stub-me', ...(payload as object), updatedAt: now() }),
  },
  { method: 'POST', path: '/password', body: () => ({ success: true }) },
  { method: 'GET', path: '/2fa', body: () => ({ enabled: false, secret: null, qrCodeUrl: null }) },
  {
    method: 'POST',
    path: '/2fa',
    body: (_p, payload) => ({ success: true, ...(payload as object) }),
  },
  { method: 'GET', path: '/api-keys', body: () => [] },
  {
    method: 'POST',
    path: '/api-keys',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      secret: stubToken('gck'),
      createdAt: now(),
      lastUsedAt: null,
    }),
  },
  { method: 'DELETE', path: '/api-keys/:id', body: () => ({ success: true }) },
  {
    method: 'PUT',
    path: '/notifications',
    body: (_p, payload) => ({ ...(payload as object), updatedAt: now() }),
  },
];

// ============================================================
// /api/workspaces
// ============================================================
export const workspacesHandlers: StubHandler[] = [
  { method: 'GET', path: '/', body: () => [] },
  {
    method: 'POST',
    path: '/',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      memberCount: 1,
      isActive: true,
      createdAt: now(),
    }),
  },
  {
    method: 'GET',
    path: '/:id',
    body: ({ id }) => ({ __status: 404, body: { message: `Workspace ${id} not found` } }),
  },
  {
    method: 'PUT',
    path: '/:id',
    body: ({ id }, payload) => ({ id, ...(payload as object), updatedAt: now() }),
  },
  {
    method: 'PUT',
    path: '/:id/modules',
    body: ({ id }, payload) => ({ id, modules: payload, updatedAt: now() }),
  },
  { method: 'POST', path: '/:id/switch', body: ({ id }) => ({ success: true, workspaceId: id }) },
];

// ============================================================
// /api/dashboards (custom dashboards)
// ============================================================
export const dashboardsHandlers: StubHandler[] = [
  { method: 'GET', path: '/', body: () => [] },
  {
    method: 'POST',
    path: '/',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      widgetCount: 0,
      createdAt: now(),
      updatedAt: now(),
    }),
  },
  { method: 'DELETE', path: '/:id', body: () => ({ success: true }) },
  {
    method: 'POST',
    path: '/:id/duplicate',
    body: ({ id }) => ({ id: stubId(), name: `Copy of ${id}`, widgetCount: 0, createdAt: now() }),
  },
];

// ============================================================
// /api/mcp (servers)
// ============================================================
export const mcpHandlers: StubHandler[] = [
  { method: 'GET', path: '/servers', body: () => [] },
  {
    method: 'POST',
    path: '/servers',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      status: 'unknown',
      lastHealthCheck: null,
      latencyMs: null,
      createdAt: now(),
    }),
  },
  { method: 'DELETE', path: '/servers/:id', body: () => ({ success: true }) },
  {
    method: 'POST',
    path: '/servers/:id/test',
    body: ({ id }) => ({ id, ok: true, latencyMs: 42, testedAt: now() }),
  },
];

// ============================================================
// /api/config/tprm
// ============================================================
export const tprmConfigHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/',
    body: () => ({
      tiers: [
        {
          id: 'critical',
          name: 'Critical',
          description: 'Mission-critical vendors',
          scoreMin: 80,
          scoreMax: 100,
        },
        { id: 'high', name: 'High', description: 'Important vendors', scoreMin: 60, scoreMax: 79 },
        {
          id: 'medium',
          name: 'Medium',
          description: 'Standard vendors',
          scoreMin: 30,
          scoreMax: 59,
        },
        { id: 'low', name: 'Low', description: 'Low-risk vendors', scoreMin: 0, scoreMax: 29 },
      ],
      assessmentTemplates: [],
      autotaggingRules: [],
    }),
  },
  {
    method: 'PUT',
    path: '/',
    body: (_p, payload) => ({ ...(payload as object), updatedAt: now() }),
  },
];

// ============================================================
// /api/trust-config
// ============================================================
export const trustConfigHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/',
    body: () => ({
      visibility: 'private',
      customDomain: '',
      brandColor: '#059669',
      sections: {
        compliance: true,
        policies: true,
        documents: true,
        subprocessors: false,
        security: true,
      },
      ndaRequired: true,
      loginMethod: 'email',
      sessionTimeoutMinutes: 60,
    }),
  },
  {
    method: 'PUT',
    path: '/',
    body: (_p, payload) => ({ ...(payload as object), updatedAt: now() }),
  },
];

// ============================================================
// /api/config-as-code
// ============================================================
export const configAsCodeHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/',
    body: () => ({
      yaml: '# GigaChad GRC config-as-code\nversion: 1\norganization:\n  name: ""\n  domain: ""\n',
      schema: {
        version: 'integer',
        organization: { name: 'string', domain: 'string' },
      },
      updatedAt: now(),
    }),
  },
  {
    method: 'PUT',
    path: '/',
    body: (_p, payload) => ({ ...(payload as object), updatedAt: now() }),
  },
  {
    method: 'POST',
    path: '/validate',
    body: (_p, payload) => ({ valid: true, errors: [], payloadReceived: !!payload }),
  },
];

// ============================================================
// /api/trust-center  (analytics + settings)
// ============================================================
export const trustCenterHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/analytics',
    body: () => ({
      pageviews: 0,
      uniqueVisitors: 0,
      ndaSigns: 0,
      downloads: 0,
      topDocuments: [],
      recentVisitors: [],
      pageviewsByDay: [],
    }),
  },
  {
    method: 'GET',
    path: '/settings',
    body: () => ({
      companyName: '',
      logoUrl: '',
      brandColor: '#059669',
      visibility: 'private',
      customDomain: '',
      ndaRequired: true,
      ndaTemplate: '',
      sections: {
        compliance: true,
        policies: true,
        documents: true,
        subprocessors: false,
        security: true,
      },
    }),
  },
  {
    method: 'PUT',
    path: '/settings',
    body: (_p, payload) => ({ ...(payload as object), updatedAt: now() }),
  },
];
