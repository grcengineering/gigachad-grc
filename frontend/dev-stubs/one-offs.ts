/**
 * One-off page stubs: AI Risk Assistant, Answer Templates, Reports,
 * Compliance Calendar, Help Center, Framework Library.
 */

import { type StubHandler, EMPTY_PAGED, stubId, now } from './_helpers';

// ============================================================
// /api/ai
// ============================================================
export const aiHandlers: StubHandler[] = [
  {
    method: 'POST',
    path: '/risk-assistant',
    body: (_p, payload) => {
      const body = (payload as { messages?: Array<{ role: string; content: string }> }) || {};
      const last = body.messages?.at(-1)?.content || '';
      return {
        message: {
          role: 'assistant',
          content: `Stub response: I see you asked "${last.slice(0, 80)}". The AI risk assistant backend isn't wired yet — when it is, you'll get a real answer here.`,
        },
      };
    },
  },
];

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
// /api/reports/*
// ============================================================
export const reportsHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/mapping-gaps',
    body: () => ({
      totals: {
        totalGaps: 0,
        requirementsWithoutControls: 0,
        controlsWithoutEvidence: 0,
        evidenceWithoutApproval: 0,
      },
      requirementGaps: [],
      controlGaps: [],
      evidenceGaps: [],
    }),
  },
  { method: 'GET', path: '/scheduled', body: () => EMPTY_PAGED },
  {
    method: 'POST',
    path: '/scheduled',
    body: (_p, payload) => ({
      id: stubId(),
      ...(payload as object),
      createdAt: now(),
      lastRunAt: null,
      lastRunStatus: null,
    }),
  },
  {
    method: 'POST',
    path: '/scheduled/:id/run',
    body: ({ id }) => ({ id, runId: stubId(), status: 'queued', startedAt: now() }),
  },
  { method: 'DELETE', path: '/scheduled/:id', body: () => ({ success: true }) },
];

// ============================================================
// /api/calendar (compliance calendar)
// ============================================================
export const calendarHandlers: StubHandler[] = [
  { method: 'GET', path: '/', body: () => ({ events: [] }) },
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

// ============================================================
// /api/framework-library
// ============================================================
export const frameworkLibraryHandlers: StubHandler[] = [
  {
    method: 'GET',
    path: '/',
    body: () => ({
      frameworks: [
        {
          id: 'soc-2-type-ii',
          type: 'SOC 2',
          name: 'SOC 2 Type II',
          description:
            'Trust Services Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy',
          requirementCount: 64,
          category: 'security',
          enabled: false,
        },
        {
          id: 'iso-27001-2022',
          type: 'ISO 27001',
          name: 'ISO/IEC 27001:2022',
          description: 'Information security management system requirements',
          requirementCount: 93,
          category: 'security',
          enabled: false,
        },
        {
          id: 'hipaa',
          type: 'HIPAA',
          name: 'HIPAA Security Rule',
          description: 'Health Insurance Portability and Accountability Act',
          requirementCount: 54,
          category: 'healthcare',
          enabled: false,
        },
        {
          id: 'nist-csf',
          type: 'NIST CSF',
          name: 'NIST Cybersecurity Framework',
          description: 'Framework for Improving Critical Infrastructure Cybersecurity',
          requirementCount: 108,
          category: 'security',
          enabled: false,
        },
        {
          id: 'pci-dss-4',
          type: 'PCI DSS',
          name: 'PCI DSS 4.0',
          description: 'Payment Card Industry Data Security Standard',
          requirementCount: 248,
          category: 'payments',
          enabled: false,
        },
        {
          id: 'gdpr',
          type: 'GDPR',
          name: 'GDPR',
          description: 'EU General Data Protection Regulation',
          requirementCount: 99,
          category: 'privacy',
          enabled: false,
        },
        {
          id: 'fedramp-moderate',
          type: 'FEDRAMP',
          name: 'FedRAMP Moderate',
          description: 'Federal Risk and Authorization Management Program',
          requirementCount: 325,
          category: 'government',
          enabled: false,
        },
      ],
    }),
  },
  {
    method: 'POST',
    path: '/:id/enable',
    body: ({ id }) => ({ id, enabled: true, enabledAt: now() }),
  },
];
