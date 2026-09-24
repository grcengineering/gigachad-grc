/**
 * One-off page stubs for surfaces that do not yet have a local service.
 */

import { type StubHandler, stubId, now } from './_helpers';

// ============================================================
// /api/answer-templates
// ============================================================
export const answerTemplatesHandlers: StubHandler[] = [
  { method: 'GET', path: '/', body: () => ({ data: [], total: 0 }) },
  {
    method: 'POST',
    path: '/',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      createdAt: now(),
      usageCount: 0,
    }),
  },
  {
    method: 'PUT',
    path: '/:id',
    body: ({ id }, payload) => ({ id, ...(payload as object), updatedAt: now() }),
  },
  { method: 'DELETE', path: '/:id', body: () => ({ success: true }) },
];

