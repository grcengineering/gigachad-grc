import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { collectorsApi, integrationsApi } from '@/lib/api';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface Props {
  controlId: string;
  implementationId: string;
  collector?: any; // If editing
  onClose: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const SCHEDULE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function CollectorConfigModal({
  controlId,
  implementationId,
  collector,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const isEditing = !!collector;

  // Form state
  const [name, setName] = useState(collector?.name || '');
  const [description, setDescription] = useState(collector?.description || '');
  const [mode, setMode] = useState<'standalone' | 'integration'>(collector?.mode || 'standalone');
  const [integrationId, setIntegrationId] = useState(collector?.integrationId || '');
  const [baseUrl, setBaseUrl] = useState(collector?.baseUrl || '');
  const [endpoint, setEndpoint] = useState(collector?.endpoint || '');
  const [method, setMethod] = useState(collector?.method || 'GET');
  const [headers, setHeaders] = useState(
    collector?.headers
      ? Object.entries(collector.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      : ''
  );
  const [queryParams, setQueryParams] = useState(
    collector?.queryParams
      ? Object.entries(collector.queryParams)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n')
      : ''
  );
  const [body, setBody] = useState(collector?.body ? JSON.stringify(collector.body, null, 2) : '');
  const [authType, setAuthType] = useState(collector?.authType || '');
  const [authConfig, setAuthConfig] = useState<Record<string, string>>({
    keyName: collector?.authConfig?.keyName || '',
    keyValue: collector?.authConfig?.keyValue || '',
    location: collector?.authConfig?.location || 'header',
    tokenUrl: collector?.authConfig?.tokenUrl || '',
    clientId: collector?.authConfig?.clientId || '',
    clientSecret: collector?.authConfig?.clientSecret || '',
    scope: collector?.authConfig?.scope || '',
    token: collector?.authConfig?.token || '',
    username: collector?.authConfig?.username || '',
    password: collector?.authConfig?.password || '',
  });
  const [evidenceTitle, setEvidenceTitle] = useState(collector?.evidenceTitle || '');
  const [evidenceType, setEvidenceType] = useState(collector?.evidenceType || 'automated');
  const [responseMapping, setResponseMapping] = useState({
    titleField: collector?.responseMapping?.titleField || '',
    descriptionField: collector?.responseMapping?.descriptionField || '',
    dataField: collector?.responseMapping?.dataField || '',
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(collector?.scheduleEnabled || false);
  const [scheduleFrequency, setScheduleFrequency] = useState(
    collector?.scheduleFrequency || 'daily'
  );

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Fetch integrations for the dropdown
  const { data: integrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list().then((res) => res.data),
  });

  const integrations = integrationsData || [];

  // Parse helpers
  const parseHeaders = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    text.split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (key) result[key] = value;
      }
    });
    return result;
  };

  const parseQueryParams = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    text.split('\n').forEach((line) => {
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        if (key) result[key] = value;
      }
    });
    return result;
  };

  // Build the data object
  const buildData = () => {
    const data: any = {
      name,
      description,
      mode,
      endpoint,
      method,
      evidenceTitle,
      evidenceType,
      scheduleEnabled,
      scheduleFrequency: scheduleEnabled ? scheduleFrequency : undefined,
      responseMapping:
        responseMapping.titleField || responseMapping.descriptionField || responseMapping.dataField
          ? responseMapping
          : undefined,
    };

    if (mode === 'integration') {
      data.integrationId = integrationId;
    } else {
      data.baseUrl = baseUrl;
      if (authType) {
        data.authType = authType;
        data.authConfig = authConfig;
      }
    }

    const parsedHeaders = parseHeaders(headers);
    if (Object.keys(parsedHeaders).length > 0) {
      data.headers = parsedHeaders;
    }

    const parsedParams = parseQueryParams(queryParams);
    if (Object.keys(parsedParams).length > 0) {
      data.queryParams = parsedParams;
    }

    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      try {
        data.body = JSON.parse(body);
      } catch {
        // Invalid JSON
      }
    }

    return data;
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEditing
        ? collectorsApi.update(controlId, implementationId, collector.id, data)
        : collectorsApi.create(controlId, implementationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collectors', controlId, implementationId] });
      toast.success(isEditing ? 'Collector updated' : 'Collector created');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save collector');
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        return collectorsApi.test(controlId, implementationId, collector.id);
      }
      // For new collectors, we need to save first then test
      throw new Error('Save the collector first before testing');
    },
    onSuccess: (res) => {
      setTestResult(res.data);
      if (res.data.success) {
        toast.success('Connection test successful');
      } else {
        toast.error('Connection test failed');
      }
    },
    onError: (error: any) => {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message || 'Test failed');
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    saveMutation.mutate(buildData());
  };

  return (
    <Dialog open onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">
            {isEditing ? 'Edit Evidence Collector' : 'Create Evidence Collector'}
          </h2>
          <p className="text-sm text-surface-600">
            Configure an API endpoint to automatically collect evidence
          </p>
        </div>
        <button onClick={onClose} className="p-2 text-surface-600 hover:text-surface-200">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name *</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="MFA Status Collector"
              className="input mt-1"
            />
          </div>
          <div>
            <label className="label">Evidence Type</label>
            <SelectNative
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              className="input mt-1"
            >
              <option value="automated">Automated</option>
              <option value="config">Configuration</option>
              <option value="log">Log</option>
              <option value="report">Report</option>
            </SelectNative>
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this collector does..."
            rows={2}
            className="input mt-1"
          />
        </div>

        {/* Mode Selection */}
        <div className="border border-surface-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-surface-200 mb-3">Configuration Mode</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'integration'}
                onChange={() => setMode('integration')}
                className="text-brand-500"
              />
              <div>
                <span className="text-sm text-surface-700">Use Existing Integration</span>
                <p className="text-xs text-surface-500">
                  Leverage auth from a configured integration
                </p>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'standalone'}
                onChange={() => setMode('standalone')}
                className="text-brand-500"
              />
              <div>
                <span className="text-sm text-surface-700">Standalone API</span>
                <p className="text-xs text-surface-500">
                  Configure a completely separate API endpoint
                </p>
              </div>
            </label>
          </div>

          {mode === 'integration' && (
            <div className="mt-4">
              <label className="label">Integration</label>
              <SelectNative
                value={integrationId}
                onChange={(e) => setIntegrationId(e.target.value)}
                className="input mt-1"
              >
                <option value="">Select an integration...</option>
                {integrations.map((int: any) => (
                  <option key={int.id} value={int.id}>
                    {int.name} ({int.type})
                  </option>
                ))}
              </SelectNative>
            </div>
          )}

          {mode === 'standalone' && (
            <div className="mt-4">
              <label className="label">Base URL</label>
              <Input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="input mt-1"
              />
            </div>
          )}
        </div>

        {/* Endpoint Configuration */}
        <div className="border border-surface-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-surface-200">Endpoint Configuration</h3>

          <div className="flex gap-4">
            <div className="w-32">
              <label className="label">Method</label>
              <SelectNative
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="input mt-1"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="flex-1">
              <label className="label">Endpoint Path</label>
              <Input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/api/users/mfa-status"
                className="input mt-1 font-mono text-sm"
              />
            </div>
          </div>

          <div>
            <label className="label">Headers (one per line: Key: Value)</label>
            <Textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder="Accept: application/json"
              rows={2}
              className="input mt-1 font-mono text-sm"
            />
          </div>

          <div>
            <label className="label">Query Parameters (one per line: key=value)</label>
            <Textarea
              value={queryParams}
              onChange={(e) => setQueryParams(e.target.value)}
              placeholder="page=1&#10;limit=100"
              rows={2}
              className="input mt-1 font-mono text-sm"
            />
          </div>

          {['POST', 'PUT', 'PATCH'].includes(method) && (
            <div>
              <label className="label">Request Body (JSON)</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className="input mt-1 font-mono text-sm"
              />
            </div>
          )}
        </div>

        {/* Authentication (Standalone mode only) */}
        {mode === 'standalone' && (
          <div className="border border-surface-700 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium text-surface-200">Authentication</h3>

            <div>
              <label className="label">Auth Type</label>
              <SelectNative
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="input mt-1"
              >
                <option value="">None</option>
                <option value="api_key">API Key</option>
                <option value="oauth2">OAuth 2.0</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </SelectNative>
            </div>

            {authType === 'api_key' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Key Name</label>
                  <Input
                    type="text"
                    value={authConfig.keyName}
                    onChange={(e) => setAuthConfig({ ...authConfig, keyName: e.target.value })}
                    placeholder="X-API-Key"
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="label">Key Value</label>
                  <Input
                    type="password"
                    value={authConfig.keyValue}
                    onChange={(e) => setAuthConfig({ ...authConfig, keyValue: e.target.value })}
                    placeholder="Your API key"
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="label">Send In</label>
                  <SelectNative
                    value={authConfig.location}
                    onChange={(e) => setAuthConfig({ ...authConfig, location: e.target.value })}
                    className="input mt-1"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Parameter</option>
                  </SelectNative>
                </div>
              </div>
            )}

            {authType === 'oauth2' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Token URL</label>
                  <Input
                    type="text"
                    value={authConfig.tokenUrl}
                    onChange={(e) => setAuthConfig({ ...authConfig, tokenUrl: e.target.value })}
                    placeholder="https://auth.example.com/oauth/token"
                    className="input mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Client ID</label>
                    <Input
                      type="text"
                      value={authConfig.clientId}
                      onChange={(e) => setAuthConfig({ ...authConfig, clientId: e.target.value })}
                      className="input mt-1"
                    />
                  </div>
                  <div>
                    <label className="label">Client Secret</label>
                    <Input
                      type="password"
                      value={authConfig.clientSecret}
                      onChange={(e) =>
                        setAuthConfig({ ...authConfig, clientSecret: e.target.value })
                      }
                      className="input mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Scope (optional)</label>
                  <Input
                    type="text"
                    value={authConfig.scope}
                    onChange={(e) => setAuthConfig({ ...authConfig, scope: e.target.value })}
                    placeholder="read write"
                    className="input mt-1"
                  />
                </div>
              </div>
            )}

            {authType === 'bearer' && (
              <div>
                <label className="label">Bearer Token</label>
                <Input
                  type="password"
                  value={authConfig.token}
                  onChange={(e) => setAuthConfig({ ...authConfig, token: e.target.value })}
                  placeholder="Your bearer token"
                  className="input mt-1"
                />
              </div>
            )}

            {authType === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Username</label>
                  <Input
                    type="text"
                    value={authConfig.username}
                    onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <Input
                    type="password"
                    value={authConfig.password}
                    onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
                    className="input mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evidence Configuration */}
        <div className="border border-surface-700 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-surface-200">Evidence Configuration</h3>

          <div>
            <label className="label">Evidence Title Template</label>
            <Input
              type="text"
              value={evidenceTitle}
              onChange={(e) => setEvidenceTitle(e.target.value)}
              placeholder="MFA Status - {{date}}"
              className="input mt-1"
            />
            <p className="text-xs text-surface-500 mt-1">
              Use {'{{field}}'} to interpolate values from the response
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Title Field (JSONPath)</label>
              <Input
                type="text"
                value={responseMapping.titleField}
                onChange={(e) =>
                  setResponseMapping({ ...responseMapping, titleField: e.target.value })
                }
                placeholder="$.data.name"
                className="input mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <label className="label">Description Field</label>
              <Input
                type="text"
                value={responseMapping.descriptionField}
                onChange={(e) =>
                  setResponseMapping({ ...responseMapping, descriptionField: e.target.value })
                }
                placeholder="$.data.summary"
                className="input mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <label className="label">Data Field</label>
              <Input
                type="text"
                value={responseMapping.dataField}
                onChange={(e) =>
                  setResponseMapping({ ...responseMapping, dataField: e.target.value })
                }
                placeholder="$.data"
                className="input mt-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="border border-surface-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-surface-200">Schedule</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-surface-700">Enable scheduled collection</span>
            </label>
          </div>

          {scheduleEnabled && (
            <div>
              <label className="label">Frequency</label>
              <SelectNative
                value={scheduleFrequency}
                onChange={(e) => setScheduleFrequency(e.target.value)}
                className="input mt-1"
              >
                {SCHEDULE_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </SelectNative>
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={clsx(
              'p-4 rounded-lg border',
              testResult.success
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            )}
          >
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={clsx(
                    'text-sm',
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {testResult.message}
                </p>
                {testResult.data && (
                  <pre className="mt-2 p-2 bg-surface-900/50 rounded text-xs text-surface-600 overflow-auto max-h-32">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 bg-surface-800/50">
        <div>
          {isEditing && (
            <Button
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="text-sm"
              variant="secondary"
            >
              {testMutation.isPending ? (
                <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-4 h-4 mr-1" />
              )}
              Test Connection
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !name.trim()}
            variant="primary"
          >
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Collector'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
