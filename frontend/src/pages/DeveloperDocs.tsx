import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CodeBracketIcon,
  ServerIcon,
  Cog6ToothIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

type DocSection = 'api' | 'architecture' | 'configuration' | 'deployment' | 'development';

const docSections: { id: DocSection; name: string; icon: typeof BookOpenIcon; description: string }[] = [
  { id: 'api', name: 'API Reference', icon: CodeBracketIcon, description: 'REST API endpoints and usage' },
  { id: 'architecture', name: 'Architecture', icon: ServerIcon, description: 'System design and components' },
  { id: 'configuration', name: 'Configuration', icon: Cog6ToothIcon, description: 'Environment variables and settings' },
  { id: 'deployment', name: 'Deployment', icon: RocketLaunchIcon, description: 'Production deployment guide' },
  { id: 'development', name: 'Development', icon: WrenchScrewdriverIcon, description: 'Local development setup' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-600 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative bg-surface-900 rounded-lg overflow-hidden my-4">
      <div className="absolute top-0 left-0 px-3 py-1 text-xs text-surface-500 bg-surface-800 rounded-br">
        {language}
      </div>
      <CopyButton text={code} />
      <pre className="p-4 pt-8 overflow-x-auto text-sm text-surface-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// API Documentation Content
function ApiDocs() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-surface-100 mb-4">API Overview</h2>
        <p className="text-surface-300 mb-4">
          GigaChad GRC provides a RESTful API for programmatic access to all platform features. 
          All API requests require authentication via API key or JWT token.
        </p>
        
        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
          <h4 className="font-semibold text-surface-200 mb-2">Base URL</h4>
          <code className="text-brand-400">https://api.gigachad-grc.com/v1</code>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Authentication</h3>
        <p className="text-surface-300 mb-4">
          Include your API key in the Authorization header:
        </p>
        <CodeBlock 
          code={`curl -X GET "https://api.gigachad-grc.com/v1/controls" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Common Endpoints</h3>
        
        <div className="space-y-4">
          <div className="bg-surface-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-surface-300 font-medium">Method</th>
                  <th className="px-4 py-3 text-left text-surface-300 font-medium">Endpoint</th>
                  <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/controls</td>
                  <td className="px-4 py-3 text-surface-400">List all controls</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">POST</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/controls</td>
                  <td className="px-4 py-3 text-surface-400">Create a control</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/frameworks</td>
                  <td className="px-4 py-3 text-surface-400">List all frameworks</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/evidence</td>
                  <td className="px-4 py-3 text-surface-400">List all evidence</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/vendors</td>
                  <td className="px-4 py-3 text-surface-400">List all vendors</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/risks</td>
                  <td className="px-4 py-3 text-surface-400">List all risks</td>
                </tr>
                <tr>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">GET</span></td>
                  <td className="px-4 py-3 text-surface-300 font-mono text-xs">/audits</td>
                  <td className="px-4 py-3 text-surface-400">List all audits</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Example: Create a Control</h3>
        <CodeBlock 
          language="bash"
          code={`curl -X POST "https://api.gigachad-grc.com/v1/controls" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Multi-Factor Authentication",
    "description": "Require MFA for all user accounts",
    "category": "Access Control",
    "status": "implemented",
    "owner": "security-team"
  }'`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Response Format</h3>
        <p className="text-surface-300 mb-4">
          All responses are JSON formatted with consistent structure:
        </p>
        <CodeBlock 
          language="json"
          code={`{
  "success": true,
  "data": {
    "id": "ctrl_abc123",
    "name": "Multi-Factor Authentication",
    "status": "implemented",
    "createdAt": "2025-12-07T10:30:00Z"
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Rate Limits</h3>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Plan</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Requests/minute</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Requests/day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-300">Starter</td>
                <td className="px-4 py-3 text-surface-400">60</td>
                <td className="px-4 py-3 text-surface-400">10,000</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Professional</td>
                <td className="px-4 py-3 text-surface-400">300</td>
                <td className="px-4 py-3 text-surface-400">100,000</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Enterprise</td>
                <td className="px-4 py-3 text-surface-400">1,000</td>
                <td className="px-4 py-3 text-surface-400">Unlimited</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Architecture Documentation Content
function ArchitectureDocs() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-surface-100 mb-4">System Architecture</h2>
        <p className="text-surface-300 mb-4">
          GigaChad GRC is built on a modern microservices architecture designed for scalability, 
          reliability, and security.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Core Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Controls Service', desc: 'Manages security controls, policies, and evidence', port: '3001' },
            { name: 'Frameworks Service', desc: 'Handles compliance frameworks and requirements mapping', port: '3002' },
            { name: 'Policies Service', desc: 'Policy document management and versioning', port: '3003' },
            { name: 'Trust Service', desc: 'Trust Center, questionnaires, knowledge base', port: '3004' },
            { name: 'Audit Service', desc: 'Audit management, findings, and remediation', port: '3005' },
            { name: 'TPRM Service', desc: 'Third-party risk, vendors, contracts', port: '3006' },
          ].map((service) => (
            <div key={service.name} className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
              <h4 className="font-semibold text-surface-200">{service.name}</h4>
              <p className="text-surface-400 text-sm mt-1">{service.desc}</p>
              <code className="text-xs text-brand-400 mt-2 block">Port: {service.port}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Technology Stack</h3>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Layer</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Technology</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-300">Frontend</td>
                <td className="px-4 py-3 text-surface-400">React 18, TypeScript, Tailwind CSS, Vite</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Backend</td>
                <td className="px-4 py-3 text-surface-400">NestJS, TypeScript, Prisma ORM</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Database</td>
                <td className="px-4 py-3 text-surface-400">PostgreSQL 15</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Cache</td>
                <td className="px-4 py-3 text-surface-400">Redis</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Authentication</td>
                <td className="px-4 py-3 text-surface-400">Keycloak (OIDC/OAuth 2.0)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-300">Container</td>
                <td className="px-4 py-3 text-surface-400">Docker, Docker Compose</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Data Flow</h3>
        <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
          <ol className="space-y-3 text-surface-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Client requests hit the frontend (React SPA)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>API requests are routed through the API Gateway</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Authentication validated via Keycloak</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Request routed to appropriate microservice</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <span>Service processes request, queries PostgreSQL via Prisma</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
              <span>Response returned to client</span>
            </li>
          </ol>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Security Architecture</h3>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>All data encrypted at rest (AES-256-GCM)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>TLS 1.3 for all data in transit</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Role-based access control (RBAC)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>Audit logging for all operations</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-400">✓</span>
            <span>API credentials encrypted with separate encryption keys</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

// Configuration Documentation Content
function ConfigurationDocs() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Configuration Guide</h2>
        <p className="text-surface-300 mb-4">
          GigaChad GRC uses environment variables for configuration. This guide covers all available 
          configuration options.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Required Environment Variables</h3>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Variable</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">DATABASE_URL</td>
                <td className="px-4 py-3 text-surface-400">PostgreSQL connection string</td>
                <td className="px-4 py-3 text-surface-500 font-mono text-xs">postgresql://user:pass@host:5432/db</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">ENCRYPTION_KEY</td>
                <td className="px-4 py-3 text-surface-400">32-byte hex key for credential encryption</td>
                <td className="px-4 py-3 text-surface-500 font-mono text-xs">64 hex characters</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">KEYCLOAK_URL</td>
                <td className="px-4 py-3 text-surface-400">Keycloak server URL</td>
                <td className="px-4 py-3 text-surface-500 font-mono text-xs">http://localhost:8080</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">KEYCLOAK_REALM</td>
                <td className="px-4 py-3 text-surface-400">Keycloak realm name</td>
                <td className="px-4 py-3 text-surface-500 font-mono text-xs">gigachad-grc</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">KEYCLOAK_CLIENT_ID</td>
                <td className="px-4 py-3 text-surface-400">Keycloak client ID</td>
                <td className="px-4 py-3 text-surface-500 font-mono text-xs">grc-frontend</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Example .env File</h3>
        <CodeBlock 
          language="env"
          code={`# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/gigachad_grc

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-character-hex-key-here

# Authentication (Keycloak)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=gigachad-grc
KEYCLOAK_CLIENT_ID=grc-frontend
KEYCLOAK_CLIENT_SECRET=your-client-secret

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# Service Ports
CONTROLS_SERVICE_PORT=3001
FRAMEWORKS_SERVICE_PORT=3002
POLICIES_SERVICE_PORT=3003
TRUST_SERVICE_PORT=3004
AUDIT_SERVICE_PORT=3005
TPRM_SERVICE_PORT=3006

# Frontend
VITE_API_URL=http://localhost:3001
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=gigachad-grc
VITE_KEYCLOAK_CLIENT_ID=grc-frontend`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Generating Encryption Key</h3>
        <p className="text-surface-300 mb-4">
          Generate a secure 32-byte encryption key:
        </p>
        <CodeBlock code="openssl rand -hex 32" />
        <div className="bg-amber-50 dark:bg-yellow-500/10 border border-amber-300 dark:border-yellow-500/30 rounded-lg p-4 mt-4">
          <p className="text-amber-700 dark:text-yellow-400 text-sm">
            <strong>Important:</strong> Store your encryption key securely. If lost, encrypted credentials cannot be recovered.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Optional Configuration</h3>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Variable</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Default</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">LOG_LEVEL</td>
                <td className="px-4 py-3 text-surface-400">info</td>
                <td className="px-4 py-3 text-surface-400">Logging level (debug, info, warn, error)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">CORS_ORIGINS</td>
                <td className="px-4 py-3 text-surface-400">*</td>
                <td className="px-4 py-3 text-surface-400">Allowed CORS origins</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">SESSION_TIMEOUT</td>
                <td className="px-4 py-3 text-surface-400">3600</td>
                <td className="px-4 py-3 text-surface-400">Session timeout in seconds</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">MAX_UPLOAD_SIZE</td>
                <td className="px-4 py-3 text-surface-400">10MB</td>
                <td className="px-4 py-3 text-surface-400">Maximum file upload size</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Deployment Documentation Content
function DeploymentDocs() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Deployment Guide</h2>
        <p className="text-surface-300 mb-4">
          This guide covers deploying GigaChad GRC to production environments using Docker and Docker Compose.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Prerequisites</h3>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Docker 20.10+ and Docker Compose 2.0+</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>PostgreSQL 15+ (or use included Docker container)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Redis 7+ (optional, for caching)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Minimum 4GB RAM, 2 CPU cores</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Quick Start with Docker Compose</h3>
        <CodeBlock 
          code={`# Clone the repository
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Production Checklist</h3>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Generate unique ENCRYPTION_KEY using <code className="text-brand-400 text-sm">openssl rand -hex 32</code></span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Configure SSL/TLS certificates (Let's Encrypt or custom)</span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Set up database backups (daily recommended)</span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Configure firewall rules (allow ports 80, 443)</span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Set up monitoring and alerting</span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Configure log aggregation</span>
          </li>
          <li className="flex gap-3">
            <input type="checkbox" className="mt-1 w-4 h-4 bg-surface-800 border-surface-600 rounded" />
            <span>Test disaster recovery procedures</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Database Migration</h3>
        <CodeBlock 
          code={`# Run database migrations
docker-compose exec controls npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec controls npx prisma db seed`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Health Checks</h3>
        <p className="text-surface-300 mb-4">
          Verify all services are running:
        </p>
        <CodeBlock 
          code={`# Check service health
curl http://localhost:3001/health  # Controls service
curl http://localhost:3002/health  # Frameworks service
curl http://localhost:3003/health  # Policies service

# Or use Docker
docker-compose ps`}
        />
      </section>
    </div>
  );
}

// Development Documentation Content
function DevelopmentDocs() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold text-surface-100 mb-4">Development Setup</h2>
        <p className="text-surface-300 mb-4">
          This guide walks through setting up a local development environment for GigaChad GRC.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Prerequisites</h3>
        <ul className="space-y-2 text-surface-300">
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Node.js 18+ and npm 9+</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Docker and Docker Compose</span>
          </li>
          <li className="flex gap-3">
            <span className="text-brand-400">•</span>
            <span>Git</span>
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Quick Start</h3>
        <CodeBlock 
          code={`# Clone the repository
git clone https://github.com/grcengineering/gigachad-grc.git
cd gigachad-grc

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, Keycloak)
docker-compose -f docker-compose.dev.yml up -d

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development servers
npm run dev`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Project Structure</h3>
        <CodeBlock 
          language="text"
          code={`gigachad-grc/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── lib/        # Utilities and API client
│   │   └── contexts/   # React contexts
│   └── package.json
├── services/           # Backend microservices
│   ├── controls/       # Controls service
│   ├── frameworks/     # Frameworks service
│   ├── policies/       # Policies service
│   ├── trust/          # Trust Center service
│   ├── audit/          # Audit service
│   ├── tprm/           # Third-party risk service
│   └── shared/         # Shared utilities and Prisma schema
├── database/           # Database migrations and seeds
├── docs/               # Documentation
└── docker-compose.yml  # Docker configuration`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Running Tests</h3>
        <CodeBlock 
          code={`# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Code Style</h3>
        <p className="text-surface-300 mb-4">
          The project uses ESLint and Prettier for code formatting:
        </p>
        <CodeBlock 
          code={`# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format`}
        />
      </section>

      <section>
        <h3 className="text-xl font-bold text-surface-100 mb-4">Useful Commands</h3>
        <div className="bg-surface-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-700">
              <tr>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Command</th>
                <th className="px-4 py-3 text-left text-surface-300 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">npm run dev</td>
                <td className="px-4 py-3 text-surface-400">Start all services in dev mode</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">npm run build</td>
                <td className="px-4 py-3 text-surface-400">Build all services for production</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">npx prisma studio</td>
                <td className="px-4 py-3 text-surface-400">Open Prisma database GUI</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">npx prisma migrate dev</td>
                <td className="px-4 py-3 text-surface-400">Run database migrations</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-surface-200 font-mono text-xs">docker-compose logs -f</td>
                <td className="px-4 py-3 text-surface-400">View service logs</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function DeveloperDocs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = (searchParams.get('section') as DocSection) || 'api';

  const renderContent = () => {
    switch (activeSection) {
      case 'api':
        return <ApiDocs />;
      case 'architecture':
        return <ArchitectureDocs />;
      case 'configuration':
        return <ConfigurationDocs />;
      case 'deployment':
        return <DeploymentDocs />;
      case 'development':
        return <DevelopmentDocs />;
      default:
        return <ApiDocs />;
    }
  };

  const currentSection = docSections.find(s => s.id === activeSection);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Link */}
      <Link
        to="/help"
        className="inline-flex items-center gap-2 text-surface-400 hover:text-surface-200 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Help Center
      </Link>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-surface-100">Developer Documentation</h1>
        <p className="text-surface-400 mt-2">Technical guides and API reference for developers</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="sticky top-4 space-y-1">
            {docSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setSearchParams({ section: section.id })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                      : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <div>
                    <span className="font-medium block">{section.name}</span>
                    <span className="text-xs opacity-70">{section.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-surface-800/30 border border-surface-700 rounded-xl p-6 lg:p-8">
            {currentSection && (
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-surface-700">
                <div className="p-2 bg-brand-600/20 rounded-lg">
                  <currentSection.icon className="w-6 h-6 text-brand-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-surface-100">{currentSection.name}</h2>
                  <p className="text-surface-400 text-sm">{currentSection.description}</p>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

