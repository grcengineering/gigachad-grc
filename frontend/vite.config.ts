import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Prevent accidental shipping of dev-only auth flags in production builds
  if (mode === 'production' && env.VITE_ENABLE_DEV_AUTH === 'true') {
    throw new Error(
      'VITE_ENABLE_DEV_AUTH must be false or unset for production builds. ' +
      'Disable dev auth in your production env before building.'
    );
  }

  const isAnalyze = process.env.ANALYZE === 'true';

  return {
  plugins: [
    react(),
    // Bundle analysis – only enabled when ANALYZE=true
    isAnalyze &&
      visualizer({
        filename: 'dist/bundle-stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - split ONLY truly independent large libraries
          // Many libraries have circular dependencies with React - keep those in vendor
          if (id.includes('node_modules')) {
            // XLSX is independent and large - safe to split
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            
            // Zod is independent - safe to split
            if (id.includes('zod')) {
              return 'vendor-zod';
            }
            
            // date-fns is independent - safe to split
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            
            // Axios is independent - safe to split
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            
            // Recharts and ALL its dependencies must stay together to avoid
            // "Cannot access 'N' before initialization" errors caused by
            // circular dependencies between recharts, d3-*, and react-smooth.
            // This includes all d3 modules that recharts depends on.
            if (
              id.includes('recharts') ||
              id.includes('d3-interpolate') ||
              id.includes('d3-color') ||
              id.includes('d3-path') ||
              id.includes('d3-shape') ||
              id.includes('d3-scale') ||
              id.includes('d3-array') ||
              id.includes('d3-format') ||
              id.includes('d3-time') ||
              id.includes('d3-time-format') ||
              id.includes('react-smooth') ||
              id.includes('react-is') ||
              id.includes('victory-vendor') ||
              id.includes('internmap')
            ) {
              return 'vendor-charts';
            }
            
            // Everything else stays in the main vendor bundle to avoid
            // circular dependency issues that cause "Cannot access 'X' before initialization"
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500, // Warn at 500KB
    // Enable source maps for production debugging (disable for smaller builds)
    sourcemap: process.env.NODE_ENV !== 'production',
    // Optimize CSS
    cssCodeSplit: true,
    // Minification options
    // Using esbuild for minification - terser can incorrectly optimize conditionals
    // involving import.meta.env when building with --mode development
    minify: 'esbuild',
    // Target modern browsers for smaller bundles
    target: 'es2020',
  },
  // Optimize deps for faster dev startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@tanstack/react-virtual',
      'axios',
      'clsx',
      'date-fns',
      'react-hot-toast',
      // Pre-bundle recharts to avoid circular dependency issues in production
      'recharts',
    ],
    exclude: [
      // Exclude large libraries that are dynamically imported
      'xlsx',
      'mammoth',
      '@monaco-editor/react',
    ],
  },
  // Enable preview to test production builds locally
  preview: {
    port: 4173,
    strictPort: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
  },
  // Improve caching
  cacheDir: 'node_modules/.vite',
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
      '/api/dashboards': {
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
      '/api/api-keys': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/risks': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/calendar': {
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
      '/api/risk-scenarios': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/risk-tasks': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/seed': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/employee-compliance': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/notifications-config': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/training': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/ai': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/mcp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/system': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/bulk': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/modules': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/config-as-code': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // BC/DR service (business continuity, disaster recovery plans)
      '/api/bcdr': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Scheduled Reports service
      '/api/scheduled-reports': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/workspaces': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Framework catalog (controls service)
      '/api/frameworks/catalog': {
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
      // TPRM service (vendors, contracts, assessments, config)
      '/api/vendors': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/contracts': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/vendor-assessments': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vendor-assessments/, '/assessments'),
      },
      '/api/tprm-config': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Trust service (questionnaires, knowledge base, trust center)
      '/api/questionnaires': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/knowledge-base': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/trust-center': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/trust-config': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/answer-templates': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/trust-ai': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
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
      '/api/findings': {
        target: 'http://localhost:3007',
        changeOrigin: true,
      },
      // Audit module routes (templates, workpapers, test procedures, etc.)
      '/api/audit/templates': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/templates', '/templates'),
      },
      '/api/audit/workpapers': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/workpapers', '/workpapers'),
      },
      '/api/audit/test-procedures': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/test-procedures', '/test-procedures'),
      },
      '/api/audit/remediation': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/remediation', '/remediation'),
      },
      '/api/audit/analytics': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/analytics', '/analytics'),
      },
      '/api/audit/planning': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/planning', '/planning'),
      },
      '/api/audit/reports': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/reports', '/reports'),
      },
      '/api/audit/audit-ai': {
        target: 'http://localhost:3007',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/audit/audit-ai', '/audit-ai'),
      },
      // Audit log/trail (controls service) - MUST be after /api/audits and other audit routes
      '/api/audit': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
};
});

