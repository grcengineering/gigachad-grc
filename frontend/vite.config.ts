import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
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

