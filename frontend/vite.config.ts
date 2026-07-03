import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createStubMiddleware } from './dev-stubs/_helpers';
import { bcdrHandlers } from './dev-stubs/bcdr';
import {
  meHandlers,
  workspacesHandlers,
  dashboardsHandlers,
  mcpHandlers,
  tprmConfigHandlers,
  trustConfigHandlers,
  configAsCodeHandlers,
  trustCenterHandlers,
} from './dev-stubs/settings';
import {
  peopleHandlers,
  trainingHandlers,
  employeeComplianceHandlers,
} from './dev-stubs/people';
import { auditDeepHandlers, auditorPortalHandlers } from './dev-stubs/audit-deep';
import {
  aiHandlers,
  answerTemplatesHandlers,
  reportsHandlers,
  calendarHandlers,
  helpHandlers,
  frameworkLibraryHandlers,
} from './dev-stubs/one-offs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'grc-dev-stubs',
      configureServer(server) {
        // Dev-only stubs for endpoints whose real backend services aren't built yet.
        // Each prefix is checked first; falls through to Vite's proxy for non-matches.
        server.middlewares.use(createStubMiddleware('/api/bcdr', bcdrHandlers));
        server.middlewares.use(createStubMiddleware('/api/me', meHandlers));
        server.middlewares.use(createStubMiddleware('/api/workspaces', workspacesHandlers));
        server.middlewares.use(createStubMiddleware('/api/dashboards', dashboardsHandlers));
        server.middlewares.use(createStubMiddleware('/api/mcp', mcpHandlers));
        server.middlewares.use(createStubMiddleware('/api/config/tprm', tprmConfigHandlers));
        server.middlewares.use(createStubMiddleware('/api/trust-config', trustConfigHandlers));
        server.middlewares.use(createStubMiddleware('/api/config-as-code', configAsCodeHandlers));
        server.middlewares.use(createStubMiddleware('/api/trust-center', trustCenterHandlers));
        server.middlewares.use(createStubMiddleware('/api/people', peopleHandlers));
        server.middlewares.use(createStubMiddleware('/api/training', trainingHandlers));
        server.middlewares.use(createStubMiddleware('/api/employee-compliance', employeeComplianceHandlers));
        // Audit deep: only stubs the paths the real audit service does NOT serve
        // (analytics/calendar/templates/workpapers/test-procedures). The middleware
        // returns 404 for unmatched paths under its prefix, but the real audit
        // service is reached via the Vite proxy further down — so we need to
        // route ONLY the unmatched-here paths through the proxy. To avoid
        // shadowing the real /api/audits endpoints, audit-deep is mounted as
        // separate prefixes that don't collide.
        server.middlewares.use(createStubMiddleware('/api/audits/analytics', [
          { method: 'GET', path: '/', body: auditDeepHandlers[0].body },
        ]));
        server.middlewares.use(createStubMiddleware('/api/audits/calendar', [
          { method: 'GET', path: '/', body: auditDeepHandlers[1].body },
        ]));
        server.middlewares.use(createStubMiddleware('/api/audits/templates', [
          { method: 'GET', path: '/', body: auditDeepHandlers[2].body },
        ]));
        server.middlewares.use(createStubMiddleware('/api/audits/workpapers', [
          { method: 'GET', path: '/', body: auditDeepHandlers[3].body },
        ]));
        server.middlewares.use(createStubMiddleware('/api/audits/test-procedures', [
          { method: 'GET', path: '/', body: auditDeepHandlers[4].body },
        ]));
        server.middlewares.use(createStubMiddleware('/api/auditor', auditorPortalHandlers));
        // One-offs
        server.middlewares.use(createStubMiddleware('/api/ai', aiHandlers));
        server.middlewares.use(createStubMiddleware('/api/answer-templates', answerTemplatesHandlers));
        server.middlewares.use(createStubMiddleware('/api/reports', reportsHandlers));
        server.middlewares.use(createStubMiddleware('/api/calendar', calendarHandlers));
        server.middlewares.use(createStubMiddleware('/api/help', helpHandlers));
        server.middlewares.use(createStubMiddleware('/api/framework-library', frameworkLibraryHandlers));
      },
    },
  ],
  resolve: {
    alias: {
      '@heroicons/react/24/outline': path.resolve(__dirname, './src/lib/heroicons-outline.ts'),
      '@heroicons/react/24/solid': path.resolve(__dirname, './src/lib/heroicons-solid.ts'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // Controls service (controls, evidence, implementations, dashboard)
      '/api/controls': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/evidence': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/implementations': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/dashboard': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/comments': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/tasks': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/integrations': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/notifications': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/permissions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/risks': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/assets': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/risk-config': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Frameworks service (frameworks, assessments, mappings)
      '/api/frameworks': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/assessments': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/mappings': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      // Policies service
      '/api/policies': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      // TPRM service (vendors, contracts, assessments)
      '/api/vendors': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/api/contracts': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      // Trust service (questionnaires, knowledge base, trust center)
      '/api/questionnaires': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/api/knowledge-base': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/api/trust-center': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '^/trust-center/(config|content|public)': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '^/knowledge-base/(bulk)': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      // Audit service (audits, audit requests)
      '/api/audits': {
        target: 'http://localhost:3007',
        changeOrigin: true,
      },
      '/api/audit-requests': {
        target: 'http://localhost:3007',
        changeOrigin: true,
      },
      // Audit log/trail (controls service) - MUST be after /api/audits and /api/audit-requests
      '/api/audit': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

