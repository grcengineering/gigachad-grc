import { useState } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface EndpointConfig {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: Record<string, any>;
  responseMapping: {
    title?: string;
    description?: string;
    data?: string;
  };
}

interface AuthConfig {
  // API Key
  keyName?: string;
  keyValue?: string;
  location?: 'header' | 'query';
  // OAuth2
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

interface VisualConfig {
  baseUrl: string;
  endpoints: EndpointConfig[];
  authType: 'none' | 'api_key' | 'oauth2' | 'basic' | null;
  authConfig: AuthConfig | null;
}

interface Props {
  config: VisualConfig;
  onChange: (config: VisualConfig) => void;
  onTest: (endpointIndex: number) => void;
  isTestLoading?: boolean;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

export default function VisualConfigBuilder({ config, onChange, onTest, isTestLoading }: Props) {
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(0);

  const updateBaseUrl = (baseUrl: string) => {
    onChange({ ...config, baseUrl });
  };

  const updateAuthType = (authType: 'api_key' | 'oauth2' | null) => {
    onChange({
      ...config,
      authType,
      authConfig: authType ? {} : null,
    });
  };

  const updateAuthConfig = (authConfig: AuthConfig) => {
    onChange({ ...config, authConfig });
  };

  const addEndpoint = () => {
    const newEndpoint: EndpointConfig = {
      name: `Endpoint ${config.endpoints.length + 1}`,
      description: '',
      method: 'GET',
      path: '/api/endpoint',
      headers: {},
      params: {},
      body: {},
      responseMapping: {},
    };
    onChange({
      ...config,
      endpoints: [...config.endpoints, newEndpoint],
    });
    setExpandedEndpoint(config.endpoints.length);
  };

  const updateEndpoint = (index: number, updates: Partial<EndpointConfig>) => {
    const endpoints = [...config.endpoints];
    endpoints[index] = { ...endpoints[index], ...updates };
    onChange({ ...config, endpoints });
  };

  const removeEndpoint = (index: number) => {
    const endpoints = config.endpoints.filter((_, i) => i !== index);
    onChange({ ...config, endpoints });
    if (expandedEndpoint === index) {
      setExpandedEndpoint(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Base URL */}
      <div>
        <label className="block text-sm font-medium text-surface-700 mb-2">Base URL</label>
        <Input
          type="text"
          value={config.baseUrl}
          onChange={(e) => updateBaseUrl(e.target.value)}
          placeholder="https://api.example.com"
          className="input w-full"
        />
        <p className="text-xs text-surface-500 mt-1">The base URL for all API requests</p>
      </div>
      {/* Authentication */}
      <div className="border border-surface-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-surface-800 mb-4">Authentication</h3>

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="authType"
              checked={config.authType === null}
              onChange={() => updateAuthType(null)}
              className="text-brand-500"
            />
            <span className="text-sm text-surface-700">None</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="authType"
              checked={config.authType === 'api_key'}
              onChange={() => updateAuthType('api_key')}
              className="text-brand-500"
            />
            <span className="text-sm text-surface-700">API Key</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="authType"
              checked={config.authType === 'oauth2'}
              onChange={() => updateAuthType('oauth2')}
              className="text-brand-500"
            />
            <span className="text-sm text-surface-700">OAuth 2.0</span>
          </label>
        </div>

        {config.authType === 'api_key' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-600 mb-1">Key Name</label>
                <Input
                  type="text"
                  value={config.authConfig?.keyName || ''}
                  onChange={(e) =>
                    updateAuthConfig({ ...config.authConfig, keyName: e.target.value })
                  }
                  placeholder="X-API-Key"
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-600 mb-1">Key Value</label>
                <Input
                  type="password"
                  value={config.authConfig?.keyValue || ''}
                  onChange={(e) =>
                    updateAuthConfig({ ...config.authConfig, keyValue: e.target.value })
                  }
                  placeholder="Your API key"
                  className="input w-full text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-600 mb-1">Send In</label>
              <SelectNative
                value={config.authConfig?.location || 'header'}
                onChange={(e) =>
                  updateAuthConfig({
                    ...config.authConfig,
                    location: e.target.value as 'header' | 'query',
                  })
                }
                className="input w-full text-sm"
              >
                <option value="header">Header</option>
                <option value="query">Query Parameter</option>
              </SelectNative>
            </div>
          </div>
        )}

        {config.authType === 'oauth2' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-surface-600 mb-1">Token URL</label>
              <Input
                type="text"
                value={config.authConfig?.tokenUrl || ''}
                onChange={(e) =>
                  updateAuthConfig({ ...config.authConfig, tokenUrl: e.target.value })
                }
                placeholder="https://auth.example.com/oauth/token"
                className="input w-full text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-surface-600 mb-1">Client ID</label>
                <Input
                  type="text"
                  value={config.authConfig?.clientId || ''}
                  onChange={(e) =>
                    updateAuthConfig({ ...config.authConfig, clientId: e.target.value })
                  }
                  placeholder="client_id"
                  className="input w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-600 mb-1">Client Secret</label>
                <Input
                  type="password"
                  value={config.authConfig?.clientSecret || ''}
                  onChange={(e) =>
                    updateAuthConfig({ ...config.authConfig, clientSecret: e.target.value })
                  }
                  placeholder="client_secret"
                  className="input w-full text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-600 mb-1">Scope (optional)</label>
              <Input
                type="text"
                value={config.authConfig?.scope || ''}
                onChange={(e) => updateAuthConfig({ ...config.authConfig, scope: e.target.value })}
                placeholder="read write"
                className="input w-full text-sm"
              />
            </div>
          </div>
        )}
      </div>
      {/* Endpoints */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-surface-800">Endpoints</h3>
          <Button
            onClick={addEndpoint}
            className="text-sm flex items-center gap-1"
            variant="secondary"
          >
            <PlusIcon className="w-4 h-4" />
            Add Endpoint
          </Button>
        </div>

        {config.endpoints.length === 0 ? (
          <div className="text-center py-8 text-surface-500 border border-dashed border-surface-200 rounded-lg">
            No endpoints configured. Add an endpoint to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {config.endpoints.map((endpoint, index) => (
              <EndpointCard
                key={index}
                endpoint={endpoint}
                isExpanded={expandedEndpoint === index}
                onToggle={() => setExpandedEndpoint(expandedEndpoint === index ? null : index)}
                onChange={(updates) => updateEndpoint(index, updates)}
                onRemove={() => removeEndpoint(index)}
                onTest={() => onTest(index)}
                isTestLoading={isTestLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EndpointCardProps {
  endpoint: EndpointConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<EndpointConfig>) => void;
  onRemove: () => void;
  onTest: () => void;
  isTestLoading?: boolean;
}

function EndpointCard({
  endpoint,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
  onTest,
  isTestLoading,
}: EndpointCardProps) {
  const [headersText, setHeadersText] = useState(
    Object.entries(endpoint.headers || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
  );
  const [paramsText, setParamsText] = useState(
    Object.entries(endpoint.params || {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  );

  const parseKeyValue = (text: string, separator: string): Record<string, string> => {
    const result: Record<string, string> = {};
    text.split('\n').forEach((line) => {
      const idx = line.indexOf(separator);
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (key) result[key] = value;
      }
    });
    return result;
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-600',
    POST: 'bg-blue-500/20 text-blue-600',
    PUT: 'bg-yellow-500/20 text-yellow-600',
    DELETE: 'bg-red-500/20 text-red-600',
    PATCH: 'bg-purple-500/20 text-purple-600',
  };

  return (
    <div className="border border-surface-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-white/50 cursor-pointer dark:bg-surface-900/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-medium',
              methodColors[endpoint.method]
            )}
          >
            {endpoint.method}
          </span>
          <span className="text-surface-800 font-medium">{endpoint.name || endpoint.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTest();
            }}
            disabled={isTestLoading}
            className="text-xs px-2 py-1 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
          >
            {isTestLoading ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1 text-surface-500 hover:text-red-600"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-surface-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-surface-500" />
          )}
        </div>
      </div>
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white/30 dark:bg-surface-900/30">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-surface-600 mb-1">Name</label>
              <Input
                type="text"
                value={endpoint.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Endpoint name"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-600 mb-1">Description</label>
              <Input
                type="text"
                value={endpoint.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="What this endpoint does"
                className="input w-full text-sm"
              />
            </div>
          </div>

          {/* Method & Path */}
          <div className="flex gap-4">
            <div className="w-32">
              <label className="block text-xs text-surface-600 mb-1">Method</label>
              <SelectNative
                value={endpoint.method}
                onChange={(e) => onChange({ method: e.target.value as any })}
                className="input w-full text-sm"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-surface-600 mb-1">Path</label>
              <Input
                type="text"
                value={endpoint.path}
                onChange={(e) => onChange({ path: e.target.value })}
                placeholder="/api/endpoint"
                className="input w-full text-sm font-mono"
              />
            </div>
          </div>

          {/* Headers */}
          <div>
            <label className="block text-xs text-surface-600 mb-1">
              Headers <span className="text-surface-600">(one per line, format: Key: Value)</span>
            </label>
            <Textarea
              value={headersText}
              onChange={(e) => {
                setHeadersText(e.target.value);
                onChange({ headers: parseKeyValue(e.target.value, ':') });
              }}
              placeholder="Content-Type: application/json"
              rows={2}
              className="input w-full text-sm font-mono"
            />
          </div>

          {/* Query Params */}
          <div>
            <label className="block text-xs text-surface-600 mb-1">
              Query Parameters{' '}
              <span className="text-surface-600">(one per line, format: key=value)</span>
            </label>
            <Textarea
              value={paramsText}
              onChange={(e) => {
                setParamsText(e.target.value);
                onChange({ params: parseKeyValue(e.target.value, '=') });
              }}
              placeholder="page=1&#10;limit=100"
              rows={2}
              className="input w-full text-sm font-mono"
            />
          </div>

          {/* Request Body (for POST/PUT/PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(endpoint.method) && (
            <div>
              <label className="block text-xs text-surface-600 mb-1">Request Body (JSON)</label>
              <Textarea
                value={JSON.stringify(endpoint.body || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const body = JSON.parse(e.target.value);
                    onChange({ body });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder='{"key": "value"}'
                rows={4}
                className="input w-full text-sm font-mono"
              />
            </div>
          )}

          {/* Response Mapping */}
          <div className="border-t border-surface-200 pt-4">
            <h4 className="text-xs font-medium text-surface-700 mb-3">
              Response Mapping (JSONPath)
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Title Field</label>
                <Input
                  type="text"
                  value={endpoint.responseMapping?.title || ''}
                  onChange={(e) =>
                    onChange({
                      responseMapping: { ...endpoint.responseMapping, title: e.target.value },
                    })
                  }
                  placeholder="$.data.name"
                  className="input w-full text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Description Field</label>
                <Input
                  type="text"
                  value={endpoint.responseMapping?.description || ''}
                  onChange={(e) =>
                    onChange({
                      responseMapping: { ...endpoint.responseMapping, description: e.target.value },
                    })
                  }
                  placeholder="$.data.summary"
                  className="input w-full text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Data Field</label>
                <Input
                  type="text"
                  value={endpoint.responseMapping?.data || ''}
                  onChange={(e) =>
                    onChange({
                      responseMapping: { ...endpoint.responseMapping, data: e.target.value },
                    })
                  }
                  placeholder="$.data"
                  className="input w-full text-sm font-mono"
                />
              </div>
            </div>
            <p className="text-xs text-surface-600 mt-2">
              Use JSONPath syntax to extract values from the API response for evidence records.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
