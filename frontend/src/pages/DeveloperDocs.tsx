import { useState } from 'react';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  type BadgeVariant,
} from '@/components/ui';
import { cn } from '@/lib/cn';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface EndpointParam {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface EndpointDoc {
  method: HttpMethod;
  path: string;
  description: string;
  params: EndpointParam[];
  exampleRequest: string;
  exampleResponse: string;
}

interface DocCategory {
  id: string;
  name: string;
  description: string;
  endpoints: EndpointDoc[];
}

const METHOD_VARIANT: Record<HttpMethod, BadgeVariant> = {
  GET: 'info',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'danger',
};

const DOCS: DocCategory[] = [
  {
    id: 'auth',
    name: 'Auth',
    description: 'Authenticate users and manage sessions and API keys.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Exchange email + password for a bearer token.',
        params: [
          { name: 'email', type: 'string', required: true, description: 'User email.' },
          { name: 'password', type: 'string', required: true, description: 'User password.' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@example.com",
    "password": "••••••••"
  }'`,
        exampleResponse: `{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "usr_01",
    "email": "you@example.com",
    "role": "admin"
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Invalidate the current session token.',
        params: [],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/auth/logout \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{ "success": true }`,
      },
      {
        method: 'GET',
        path: '/api/auth/session',
        description: 'Return the current authenticated user and active workspace.',
        params: [],
        exampleRequest: `curl https://api.gigachad-grc.com/api/auth/session \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "user": { "id": "usr_01", "email": "you@example.com" },
  "workspace": { "id": "ws_01", "slug": "acme" }
}`,
      },
    ],
  },
  {
    id: 'controls',
    name: 'Controls',
    description: 'Create and manage security and compliance controls.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/controls',
        description: 'List all controls in the active workspace.',
        params: [
          { name: 'q', type: 'string', description: 'Search query against control name and code.' },
          { name: 'category', type: 'string', description: 'Filter by category id.' },
          { name: 'status', type: 'string', description: 'Filter by status (implemented, planned, etc.).' },
        ],
        exampleRequest: `curl "https://api.gigachad-grc.com/api/controls?status=implemented" \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    {
      "id": "ctrl_01",
      "code": "AC-2",
      "name": "Account Management",
      "status": "implemented"
    }
  ],
  "total": 1
}`,
      },
      {
        method: 'POST',
        path: '/api/controls',
        description: 'Create a new control.',
        params: [
          { name: 'name', type: 'string', required: true, description: 'Display name.' },
          { name: 'code', type: 'string', required: true, description: 'Short identifier (e.g., AC-2).' },
          { name: 'description', type: 'string', description: 'Long-form description.' },
          { name: 'category', type: 'string', description: 'Category id.' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/controls \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Multi-Factor Authentication",
    "code": "IA-2",
    "category": "access-control"
  }'`,
        exampleResponse: `{
  "id": "ctrl_42",
  "code": "IA-2",
  "name": "Multi-Factor Authentication",
  "status": "planned"
}`,
      },
      {
        method: 'PUT',
        path: '/api/controls/:id',
        description: 'Update an existing control.',
        params: [
          { name: 'id', type: 'path', required: true, description: 'Control id.' },
          { name: 'name', type: 'string', description: 'Display name.' },
          { name: 'status', type: 'string', description: 'New status.' },
        ],
        exampleRequest: `curl -X PUT https://api.gigachad-grc.com/api/controls/ctrl_42 \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "implemented" }'`,
        exampleResponse: `{
  "id": "ctrl_42",
  "status": "implemented",
  "updatedAt": "2026-01-01T12:00:00Z"
}`,
      },
    ],
  },
  {
    id: 'evidence',
    name: 'Evidence',
    description: 'Upload and link evidence artifacts to controls.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/evidence',
        description: 'List evidence in the active workspace.',
        params: [
          { name: 'controlId', type: 'string', description: 'Filter to evidence for a control.' },
          { name: 'status', type: 'string', description: 'Filter by status.' },
        ],
        exampleRequest: `curl "https://api.gigachad-grc.com/api/evidence?controlId=ctrl_42" \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    {
      "id": "ev_01",
      "name": "MFA Policy v3.pdf",
      "status": "valid",
      "expiresAt": "2026-12-31"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/evidence',
        description: 'Register a new evidence artifact.',
        params: [
          { name: 'name', type: 'string', required: true, description: 'Display name.' },
          { name: 'controlId', type: 'string', description: 'Control to attach to.' },
          { name: 'expiresAt', type: 'string', description: 'ISO date when evidence expires.' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/evidence \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Quarterly Access Review", "controlId": "ctrl_42" }'`,
        exampleResponse: `{
  "id": "ev_99",
  "name": "Quarterly Access Review",
  "status": "pending"
}`,
      },
      {
        method: 'DELETE',
        path: '/api/evidence/:id',
        description: 'Delete an evidence artifact.',
        params: [{ name: 'id', type: 'path', required: true, description: 'Evidence id.' }],
        exampleRequest: `curl -X DELETE https://api.gigachad-grc.com/api/evidence/ev_99 \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{ "success": true }`,
      },
    ],
  },
  {
    id: 'frameworks',
    name: 'Frameworks',
    description: 'Manage compliance frameworks and their requirement mappings.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/frameworks',
        description: 'List frameworks enabled in the workspace.',
        params: [],
        exampleRequest: `curl https://api.gigachad-grc.com/api/frameworks \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    { "id": "fw_soc2", "name": "SOC 2", "type": "soc2" },
    { "id": "fw_iso", "name": "ISO 27001", "type": "iso27001" }
  ]
}`,
      },
      {
        method: 'GET',
        path: '/api/frameworks/:id',
        description: 'Fetch a framework with its requirements.',
        params: [{ name: 'id', type: 'path', required: true, description: 'Framework id.' }],
        exampleRequest: `curl https://api.gigachad-grc.com/api/frameworks/fw_soc2 \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "id": "fw_soc2",
  "name": "SOC 2",
  "requirements": [
    { "id": "cc1.1", "title": "Control Environment" }
  ]
}`,
      },
    ],
  },
  {
    id: 'risks',
    name: 'Risks',
    description: 'Track enterprise risks, their treatments, and review cadence.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/risks',
        description: 'List risks in the active workspace.',
        params: [
          { name: 'level', type: 'string', description: 'Filter by risk level (low, medium, high, critical).' },
          { name: 'owner', type: 'string', description: 'Filter by risk owner id.' },
        ],
        exampleRequest: `curl "https://api.gigachad-grc.com/api/risks?level=high" \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    {
      "id": "rsk_01",
      "title": "Unencrypted backups",
      "level": "high",
      "status": "open"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/risks',
        description: 'Create a new risk.',
        params: [
          { name: 'title', type: 'string', required: true, description: 'Short title.' },
          { name: 'likelihood', type: 'number', description: 'Likelihood weight (1-5).' },
          { name: 'impact', type: 'number', description: 'Impact weight (1-5).' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/risks \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "title": "Vendor outage", "likelihood": 3, "impact": 4 }'`,
        exampleResponse: `{
  "id": "rsk_55",
  "title": "Vendor outage",
  "level": "high"
}`,
      },
    ],
  },
  {
    id: 'audits',
    name: 'Audits',
    description: 'Plan audits and capture findings and remediation work.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/audits',
        description: 'List audits.',
        params: [
          { name: 'status', type: 'string', description: 'Filter by status.' },
        ],
        exampleRequest: `curl https://api.gigachad-grc.com/api/audits \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    { "id": "aud_01", "name": "Q4 SOC 2 Type II", "status": "in_progress" }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/audits/:id/findings',
        description: 'Record a finding against an audit.',
        params: [
          { name: 'id', type: 'path', required: true, description: 'Audit id.' },
          { name: 'title', type: 'string', required: true, description: 'Finding title.' },
          { name: 'severity', type: 'string', description: 'low | medium | high | critical.' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/audits/aud_01/findings \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "title": "Missing access review evidence", "severity": "medium" }'`,
        exampleResponse: `{
  "id": "fnd_07",
  "auditId": "aud_01",
  "title": "Missing access review evidence",
  "severity": "medium"
}`,
      },
    ],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Subscribe to platform events delivered to your HTTPS endpoint.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/webhooks',
        description: 'List configured webhook subscriptions.',
        params: [],
        exampleRequest: `curl https://api.gigachad-grc.com/api/webhooks \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "data": [
    {
      "id": "whk_01",
      "url": "https://hooks.example.com/grc",
      "events": ["control.updated", "evidence.expired"]
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/webhooks',
        description: 'Create a new webhook subscription.',
        params: [
          { name: 'url', type: 'string', required: true, description: 'HTTPS endpoint that will receive events.' },
          { name: 'events', type: 'string[]', required: true, description: 'Array of event names to subscribe to.' },
        ],
        exampleRequest: `curl -X POST https://api.gigachad-grc.com/api/webhooks \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://hooks.example.com/grc",
    "events": ["risk.created", "audit.finding.created"]
  }'`,
        exampleResponse: `{
  "id": "whk_42",
  "url": "https://hooks.example.com/grc",
  "secret": "whsec_..."
}`,
      },
      {
        method: 'DELETE',
        path: '/api/webhooks/:id',
        description: 'Remove a webhook subscription.',
        params: [{ name: 'id', type: 'path', required: true, description: 'Webhook id.' }],
        exampleRequest: `curl -X DELETE https://api.gigachad-grc.com/api/webhooks/whk_42 \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{ "success": true }`,
      },
    ],
  },
  {
    id: 'rate-limits',
    name: 'Rate Limits',
    description: 'Per-token request budgets and headers returned on every response.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/rate-limits',
        description: 'Return the current request budget for your token.',
        params: [],
        exampleRequest: `curl https://api.gigachad-grc.com/api/rate-limits \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "plan": "professional",
  "perMinute": 300,
  "perDay": 100000,
  "remaining": 297
}`,
      },
      {
        method: 'GET',
        path: '/api/rate-limits/usage',
        description: 'Return a 24-hour rolling usage breakdown.',
        params: [],
        exampleRequest: `curl https://api.gigachad-grc.com/api/rate-limits/usage \\
  -H "Authorization: Bearer YOUR_TOKEN"`,
        exampleResponse: `{
  "windowStart": "2026-05-18T00:00:00Z",
  "windowEnd": "2026-05-19T00:00:00Z",
  "calls": 18452
}`,
      },
    ],
  },
];

function EndpointBlock({ endpoint }: { endpoint: EndpointDoc }) {
  return (
    <div className="rounded-lg border border-surface-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-200">
        <Badge variant={METHOD_VARIANT[endpoint.method]} capitalize={false}>
          {endpoint.method}
        </Badge>
        <code className="font-mono text-small text-surface-900">{endpoint.path}</code>
      </div>
      <div className="px-4 py-4 space-y-4">
        <p className="text-small text-surface-700">{endpoint.description}</p>

        {endpoint.params.length > 0 && (
          <div>
            <h4 className="text-small font-semibold text-surface-900 mb-2">Parameters</h4>
            <div className="rounded-md border border-surface-200 overflow-hidden">
              <table className="w-full text-small">
                <thead className="bg-surface-50/60">
                  <tr className="text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.params.map((p) => (
                    <tr key={p.name} className="border-t border-surface-200/60 align-top">
                      <td className="px-3 py-2 font-mono text-surface-900">
                        {p.name}
                        {p.required && <span className="ml-1 text-red-600">*</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-surface-700">{p.type}</td>
                      <td className="px-3 py-2 text-surface-700">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-small font-semibold text-surface-900 mb-2">Example request</h4>
            <pre className="rounded-md border border-surface-200 bg-surface-50/40 p-3 overflow-x-auto text-xs font-mono text-surface-800">
              <code>{endpoint.exampleRequest}</code>
            </pre>
          </div>
          <div>
            <h4 className="text-small font-semibold text-surface-900 mb-2">Example response</h4>
            <pre className="rounded-md border border-surface-200 bg-surface-50/40 p-3 overflow-x-auto text-xs font-mono text-surface-800">
              <code>{endpoint.exampleResponse}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeveloperDocs() {
  const [activeId, setActiveId] = useState<string>(DOCS[0].id);
  const active = DOCS.find((d) => d.id === activeId) ?? DOCS[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Developer Docs"
        description="Reference for the GigaChad GRC REST API. Browse categories on the left."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardBody density="compact">
              <ul className="space-y-1">
                {DOCS.map((cat) => {
                  const isActive = cat.id === activeId;
                  return (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(cat.id)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-md transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                          isActive
                            ? 'bg-brand-50 text-brand-800'
                            : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900',
                        )}
                      >
                        <span className="block text-body font-medium">{cat.name}</span>
                        <span className="block text-xs text-surface-600 mt-0.5">
                          {cat.endpoints.length} endpoint
                          {cat.endpoints.length === 1 ? '' : 's'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-h2 text-surface-900">{active.name}</h2>
            <p className="text-small text-surface-600 mt-1">{active.description}</p>
          </div>
          <div className="space-y-4">
            {active.endpoints.map((ep) => (
              <EndpointBlock key={`${ep.method}-${ep.path}`} endpoint={ep} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
