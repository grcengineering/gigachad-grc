/**
 * Settings + Account dev stubs for surfaces without local service coverage.
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
