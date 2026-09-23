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

// ============================================================
// /api/help (articles)
// ============================================================
export const helpHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/articles',
    body: () => ({
      categories: [
        {
          id: 'getting-started',
          name: 'Getting Started',
          icon: '🚀',
          articles: [
            { id: 'welcome', title: 'Welcome to GigaChad GRC' },
            { id: 'first-steps', title: 'Your first steps' },
          ],
        },
        {
          id: 'controls',
          name: 'Controls',
          icon: '🛡️',
          articles: [
            { id: 'creating-controls', title: 'Creating a control' },
            { id: 'mapping-frameworks', title: 'Mapping controls to frameworks' },
          ],
        },
        {
          id: 'risk',
          name: 'Risk Management',
          icon: '⚠️',
          articles: [{ id: 'risk-workflow', title: 'The risk workflow' }],
        },
        {
          id: 'audits',
          name: 'Audits',
          icon: '📋',
          articles: [{ id: 'starting-an-audit', title: 'Starting an audit' }],
        },
      ],
    }),
  },
];
