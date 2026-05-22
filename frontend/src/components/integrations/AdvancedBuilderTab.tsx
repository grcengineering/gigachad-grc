import { useState } from 'react';
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import EndpointBuilder from './EndpointBuilder';
import AuthConfigPanel from './AuthConfigPanel';
import ResponseMapper from './ResponseMapper';
import RequestTester from './RequestTester';

import { Input } from '@/components/ui/Input';

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
  pagination?: {
    type: 'offset' | 'cursor' | 'page' | 'none';
    limitParam?: string;
    offsetParam?: string;
    cursorParam?: string;
    pageParam?: string;
    maxPerPage?: number;
  };
  responseMapping?: ResponseMapping[];
}

export interface AuthConfiguration {
  type: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  credentials: Record<string, string>;
  headerName?: string;
  headerPrefix?: string;
  oauth2Config?: {
    tokenUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    grantType?: 'client_credentials' | 'authorization_code';
  };
}

export interface ResponseMapping {
  id: string;
  sourcePath: string;
  targetField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  transformation?: string;
}

export interface DataTransformation {
  id: string;
  type: 'filter' | 'map' | 'compute';
  condition?: string;
  sourceField?: string;
  targetField?: string;
  expression?: string;
}

interface AdvancedConfig {
  name: string;
  description: string;
  endpoints: ApiEndpoint[];
  authConfig: AuthConfiguration;
  responseMappings: ResponseMapping[];
  transformations: DataTransformation[];
}

interface AdvancedBuilderTabProps {
  config: AdvancedConfig;
  onChange: (config: AdvancedConfig) => void;
}

type Section = 'endpoints' | 'auth' | 'mapping' | 'testing';

export default function AdvancedBuilderTab({ config, onChange }: AdvancedBuilderTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(
    new Set(['endpoints', 'auth'])
  );
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  const toggleSection = (section: Section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const addEndpoint = () => {
    const newEndpoint: ApiEndpoint = {
      id: `ep_${Date.now()}`,
      name: `Endpoint ${config.endpoints.length + 1}`,
      method: 'GET',
      path: '/',
      headers: {},
      queryParams: {},
      pagination: { type: 'none' },
    };
    onChange({
      ...config,
      endpoints: [...config.endpoints, newEndpoint],
    });
    setSelectedEndpointId(newEndpoint.id);
  };

  const updateEndpoint = (id: string, updates: Partial<ApiEndpoint>) => {
    onChange({
      ...config,
      endpoints: config.endpoints.map((ep) => (ep.id === id ? { ...ep, ...updates } : ep)),
    });
  };

  const deleteEndpoint = (id: string) => {
    onChange({
      ...config,
      endpoints: config.endpoints.filter((ep) => ep.id !== id),
    });
    if (selectedEndpointId === id) {
      setSelectedEndpointId(null);
    }
  };

  const updateAuthConfig = (updates: Partial<AuthConfiguration>) => {
    onChange({
      ...config,
      authConfig: { ...config.authConfig, ...updates },
    });
  };

  const selectedEndpoint = config.endpoints.find((ep) => ep.id === selectedEndpointId);

  const SectionHeader = ({
    section,
    title,
    count,
  }: {
    section: Section;
    title: string;
    count?: number;
  }) => {
    const isExpanded = expandedSections.has(section);
    return (
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white transition-colors dark:bg-surface-900/50 dark:hover:bg-surface-800"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-surface-600" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-surface-600" />
          )}
          <span className="font-medium text-surface-800">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-surface-500 bg-surface-200 px-2 py-0.5 rounded">
              {count}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="divide-y divide-surface-200">
      {/* Basic Info */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-surface-800 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1.5">Integration Name</label>
            <Input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1.5">Description</label>
            <Input
              type="text"
              value={config.description}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              placeholder="Custom API integration"
              className="input w-full"
            />
          </div>
        </div>
      </div>
      {/* Authentication Section */}
      <div>
        <SectionHeader section="auth" title="Authentication" />
        {expandedSections.has('auth') && (
          <div className="p-6 bg-white/50 dark:bg-surface-900/50">
            <AuthConfigPanel config={config.authConfig} onChange={updateAuthConfig} />
          </div>
        )}
      </div>
      {/* Endpoints Section */}
      <div>
        <SectionHeader section="endpoints" title="API Endpoints" count={config.endpoints.length} />
        {expandedSections.has('endpoints') && (
          <div className="p-6 bg-white/50 dark:bg-surface-900/50">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Endpoint List */}
              <div className="w-full lg:w-64 space-y-2">
                {config.endpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => setSelectedEndpointId(endpoint.id)}
                    className={clsx(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedEndpointId === endpoint.id
                        ? 'bg-brand-500/10 border-brand-500/30'
                        : 'bg-white border-surface-200 hover:border-surface-300 dark:bg-surface-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'px-1.5 py-0.5 text-xs font-mono rounded',
                          endpoint.method === 'GET' && 'bg-green-500/20 text-green-600',
                          endpoint.method === 'POST' && 'bg-blue-500/20 text-blue-600',
                          endpoint.method === 'PUT' && 'bg-yellow-500/20 text-yellow-600',
                          endpoint.method === 'DELETE' && 'bg-red-500/20 text-red-600',
                          endpoint.method === 'PATCH' && 'bg-purple-500/20 text-purple-600'
                        )}
                      >
                        {endpoint.method}
                      </span>
                      <span className="text-sm text-surface-800 truncate">{endpoint.name}</span>
                    </div>
                    <div className="text-xs text-surface-500 truncate mt-1 font-mono">
                      {endpoint.path}
                    </div>
                  </button>
                ))}
                <button
                  onClick={addEndpoint}
                  className="w-full p-3 rounded-lg border border-dashed border-surface-200 hover:border-surface-500 text-surface-600 hover:text-surface-800 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Endpoint
                </button>
              </div>

              {/* Endpoint Editor */}
              <div className="flex-1">
                {selectedEndpoint ? (
                  <EndpointBuilder
                    endpoint={selectedEndpoint}
                    onChange={(updates) => updateEndpoint(selectedEndpoint.id, updates)}
                    onDelete={() => deleteEndpoint(selectedEndpoint.id)}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-surface-500 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50">
                    Select an endpoint to configure or add a new one
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Response Mapping Section */}
      <div>
        <SectionHeader
          section="mapping"
          title="Response Mapping"
          count={config.responseMappings.length}
        />
        {expandedSections.has('mapping') && (
          <div className="p-6 bg-white/50 dark:bg-surface-900/50">
            <ResponseMapper
              mappings={config.responseMappings}
              onChange={(mappings) => onChange({ ...config, responseMappings: mappings })}
              sampleResponse={testResults?.data}
            />
          </div>
        )}
      </div>
      {/* Testing Section */}
      <div>
        <SectionHeader section="testing" title="Test & Preview" />
        {expandedSections.has('testing') && (
          <div className="p-6 bg-white/50 dark:bg-surface-900/50">
            <RequestTester
              endpoints={config.endpoints}
              authConfig={config.authConfig}
              onTestComplete={setTestResults}
            />
          </div>
        )}
      </div>
    </div>
  );
}
