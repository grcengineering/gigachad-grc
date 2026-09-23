import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createStubMiddleware } from './dev-stubs/_helpers';
import { bcdrHandlers } from './dev-stubs/bcdr';
import { meHandlers, workspacesHandlers, tprmConfigHandlers } from './dev-stubs/settings';
import { peopleHandlers, trainingHandlers, employeeComplianceHandlers } from './dev-stubs/people';
import { auditDeepHandlers, auditorPortalHandlers } from './dev-stubs/audit-deep';
import { answerTemplatesHandlers } from './dev-stubs/one-offs';

export default defineConfig(({ mode }) => {
  const enableDevStubs = loadEnv(mode, process.cwd(), '').VITE_ENABLE_DEV_STUBS === 'true';

  return {
    plugins: [
      react(),
      {
        name: 'grc-dev-stubs',
        configureServer(server) {
          // Stubs are strictly opt-in so they cannot silently shadow an implemented
          // backend. Set VITE_ENABLE_DEV_STUBS=true only for isolated UI work.
          if (!enableDevStubs) return;

          server.middlewares.use(createStubMiddleware('/api/bcdr', bcdrHandlers));
          server.middlewares.use(createStubMiddleware('/api/me', meHandlers));
          server.middlewares.use(createStubMiddleware('/api/workspaces', workspacesHandlers));
          server.middlewares.use(createStubMiddleware('/api/config/tprm', tprmConfigHandlers));
          server.middlewares.use(createStubMiddleware('/api/people', peopleHandlers));
          server.middlewares.use(createStubMiddleware('/api/training', trainingHandlers));
          server.middlewares.use(
            createStubMiddleware('/api/employee-compliance', employeeComplianceHandlers)
          );
          server.middlewares.use(
            createStubMiddleware('/api/audits/analytics', [
              { method: 'GET', path: '/', body: auditDeepHandlers[0].body },
            ])
          );
          server.middlewares.use(
            createStubMiddleware('/api/audits/calendar', [
              { method: 'GET', path: '/', body: auditDeepHandlers[1].body },
            ])
          );
          server.middlewares.use(
            createStubMiddleware('/api/audits/templates', [
              { method: 'GET', path: '/', body: auditDeepHandlers[2].body },
            ])
          );
          server.middlewares.use(
            createStubMiddleware('/api/audits/workpapers', [
              { method: 'GET', path: '/', body: auditDeepHandlers[3].body },
            ])
          );
          server.middlewares.use(
            createStubMiddleware('/api/audits/test-procedures', [
              { method: 'GET', path: '/', body: auditDeepHandlers[4].body },
            ])
          );
          server.middlewares.use(createStubMiddleware('/api/auditor', auditorPortalHandlers));
          server.middlewares.use(
            createStubMiddleware('/api/answer-templates', answerTemplatesHandlers)
          );
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
        // Controls service
        '/api/controls': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/evidence': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/implementations': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/dashboards': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/dashboard': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/calendar': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/config-as-code': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/mcp': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/reports': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/ai': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/comments': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/tasks': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/integrations': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/notifications': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/users': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/permissions': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/risks': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/assets': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/risk-config': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/organization': { target: 'http://localhost:3001', changeOrigin: true },
        '/api/frameworks/catalog': { target: 'http://localhost:3001', changeOrigin: true },

        // Frameworks service
        '/api/frameworks': { target: 'http://localhost:3002', changeOrigin: true },
        '/api/assessments': { target: 'http://localhost:3002', changeOrigin: true },
        '/api/mappings': { target: 'http://localhost:3002', changeOrigin: true },

        // Policies service
        '/api/policies': { target: 'http://localhost:3004', changeOrigin: true },

        // TPRM service
        '/api/vendors': { target: 'http://localhost:3005', changeOrigin: true },
        '/api/contracts': { target: 'http://localhost:3005', changeOrigin: true },
        '/api/vendor-assessments': { target: 'http://localhost:3005', changeOrigin: true },
        '/api/tprm-config': { target: 'http://localhost:3005', changeOrigin: true },

        // Trust service
        '/api/questionnaires': { target: 'http://localhost:3006', changeOrigin: true },
        '/api/knowledge-base': { target: 'http://localhost:3006', changeOrigin: true },
        '/api/trust-center': { target: 'http://localhost:3006', changeOrigin: true },
        '/api/answer-templates': { target: 'http://localhost:3006', changeOrigin: true },
        '/api/trust-config': { target: 'http://localhost:3006', changeOrigin: true },
        '^/trust-center/(config|content|public)': {
          target: 'http://localhost:3006',
          changeOrigin: true,
        },
        '^/knowledge-base/(bulk)': {
          target: 'http://localhost:3006',
          changeOrigin: true,
        },

        // Audit service
        '/api/audits': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit-requests': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit-portal': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/templates': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/workpapers': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/test-procedures': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/remediation': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/analytics': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/planning': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/reports': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/audit/audit-ai': { target: 'http://localhost:3007', changeOrigin: true },
        '/api/findings': { target: 'http://localhost:3007', changeOrigin: true },

        // Audit log/trail (controls service) - MUST remain after audit service routes.
        '/api/audit': { target: 'http://localhost:3001', changeOrigin: true },

        // Safe fallback. Unknown APIs receive a backend JSON 404, never SPA HTML.
        '/api': { target: 'http://localhost:3001', changeOrigin: true },
      },
    },
  };
});
