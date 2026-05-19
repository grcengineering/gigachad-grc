import { useState } from 'react';
import {
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { ApiEndpoint, AuthConfiguration } from './AdvancedBuilderTab';

import { Input } from '@/components/ui/Input';

interface RequestTesterProps {
  endpoints: ApiEndpoint[];
  authConfig: AuthConfiguration;
  onTestComplete: (result: TestResult | null) => void;
}

interface TestResult {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
  error?: string;
}

export default function RequestTester({
  endpoints,
  authConfig,
  onTestComplete,
}: RequestTesterProps) {
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(
    endpoints[0]?.id || null
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);
  const [showRawResponse, setShowRawResponse] = useState(false);

  const selectedEndpoint = endpoints.find((ep) => ep.id === selectedEndpointId);

  const buildRequestUrl = () => {
    if (!selectedEndpoint || !baseUrl) return '';

    let url = baseUrl.replace(/\/$/, '') + selectedEndpoint.path;

    // Add query params
    const params = new URLSearchParams();
    Object.entries(selectedEndpoint.queryParams || {}).forEach(([key, value]) => {
      if (key && value) params.append(key, value);
    });

    const queryString = params.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }

    return url;
  };

  const handleTest = async () => {
    if (!selectedEndpoint || !baseUrl) return;

    setIsTesting(true);
    setTestResult(null);

    const startTime = Date.now();

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...selectedEndpoint.headers,
      };

      // Add auth headers based on config
      if (authConfig.type === 'api_key' && authConfig.credentials.apiKey) {
        const headerName = authConfig.headerName || 'X-API-Key';
        if (authConfig.credentials.location === 'header') {
          headers[headerName] = authConfig.credentials.apiKey;
        }
      } else if (authConfig.type === 'bearer' && authConfig.credentials.token) {
        const prefix = authConfig.headerPrefix || 'Bearer';
        headers['Authorization'] = `${prefix} ${authConfig.credentials.token}`;
      } else if (authConfig.type === 'basic' && authConfig.credentials.username) {
        const encoded = btoa(
          `${authConfig.credentials.username}:${authConfig.credentials.password || ''}`
        );
        headers['Authorization'] = `Basic ${encoded}`;
      } else if (authConfig.type === 'custom' && authConfig.credentials.customValue) {
        const headerName = authConfig.headerName || 'Authorization';
        const prefix = authConfig.headerPrefix ? `${authConfig.headerPrefix} ` : '';
        headers[headerName] = `${prefix}${authConfig.credentials.customValue}`;
      }

      // Build URL with query params (including API key if in query)
      let url = buildRequestUrl();
      if (authConfig.type === 'api_key' && authConfig.credentials.location === 'query') {
        const paramName = authConfig.headerName || 'api_key';
        url += (url.includes('?') ? '&' : '?') + `${paramName}=${authConfig.credentials.apiKey}`;
      }

      // Note: In a real implementation, this would go through a backend proxy
      // to avoid CORS issues. For now, we'll simulate a test response.

      // Simulated response for demo purposes
      // In production, this would call: await fetch(url, { method, headers, body })

      const duration = Date.now() - startTime;

      const result: TestResult = {
        success: true,
        status: 200,
        statusText: 'OK (Simulated)',
        headers: {
          'content-type': 'application/json',
          'x-request-id': `req_${Date.now()}`,
        },
        data: {
          message:
            'This is a simulated response. In production, actual API calls will be made through a secure backend proxy.',
          url: url,
          endpoint: selectedEndpoint.path,
          method: selectedEndpoint.method,
          auth_type: authConfig.type,
          timestamp: new Date().toISOString(),
          sample_data: [
            { id: 1, name: 'Sample Item 1', status: 'active' },
            { id: 2, name: 'Sample Item 2', status: 'inactive' },
          ],
        },
        duration,
      };

      setTestResult(result);
      onTestComplete(result);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        success: false,
        status: 0,
        statusText: 'Error',
        headers: {},
        data: null,
        duration,
        error: error.message || 'Request failed',
      };
      setTestResult(result);
      onTestComplete(result);
    } finally {
      setIsTesting(false);
    }
  };

  const copyResponse = () => {
    if (testResult?.data) {
      navigator.clipboard.writeText(JSON.stringify(testResult.data, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Endpoint & Base URL Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-surface-600 block mb-1.5">Base URL</label>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="input w-full"
          />
        </div>
        <div>
          <label className="text-sm text-surface-600 block mb-1.5">Endpoint to Test</label>
          <select
            value={selectedEndpointId || ''}
            onChange={(e) => setSelectedEndpointId(e.target.value || null)}
            className="input w-full"
            disabled={endpoints.length === 0}
          >
            {endpoints.length === 0 ? (
              <option value="">No endpoints configured</option>
            ) : (
              endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.method} {ep.path} - {ep.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      {/* Request Preview */}
      {selectedEndpoint && baseUrl && (
        <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-500 uppercase font-medium">Request Preview</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-sm">
            <span
              className={clsx(
                'px-2 py-0.5 rounded text-xs font-bold',
                selectedEndpoint.method === 'GET' && 'bg-green-500/20 text-green-600',
                selectedEndpoint.method === 'POST' && 'bg-blue-500/20 text-blue-600',
                selectedEndpoint.method === 'PUT' && 'bg-yellow-500/20 text-yellow-600',
                selectedEndpoint.method === 'DELETE' && 'bg-red-500/20 text-red-600',
                selectedEndpoint.method === 'PATCH' && 'bg-purple-500/20 text-purple-600'
              )}
            >
              {selectedEndpoint.method}
            </span>
            <span className="text-surface-700 truncate">{buildRequestUrl()}</span>
          </div>

          {/* Auth Info */}
          <div className="mt-2 text-xs text-surface-500">
            Auth:{' '}
            <span className="text-surface-600">
              {authConfig.type.replace('_', ' ').toUpperCase()}
            </span>
            {authConfig.type === 'api_key' && authConfig.credentials.apiKey && ' ✓'}
            {authConfig.type === 'bearer' && authConfig.credentials.token && ' ✓'}
            {authConfig.type === 'basic' && authConfig.credentials.username && ' ✓'}
          </div>
        </div>
      )}
      {/* Test Button */}
      <button
        onClick={handleTest}
        disabled={isTesting || !selectedEndpoint || !baseUrl}
        className={clsx(
          'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
          isTesting
            ? 'bg-surface-700 text-surface-600 cursor-wait'
            : 'bg-brand-500 hover:bg-brand-600 text-white'
        )}
      >
        {isTesting ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-surface-400 border-t-transparent rounded-full" />
            Testing...
          </>
        ) : (
          <>
            <PlayIcon className="w-5 h-5" />
            Test Request
          </>
        )}
      </button>
      {/* Test Result */}
      {testResult && (
        <div
          className={clsx(
            'rounded-lg border overflow-hidden',
            testResult.success
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          )}
        >
          {/* Result Header */}
          <div
            className={clsx(
              'flex items-center justify-between p-4',
              testResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
            )}
          >
            <div className="flex items-center gap-3">
              {testResult.success ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-red-600" />
              )}
              <div>
                <span
                  className={clsx(
                    'font-mono font-bold',
                    testResult.success ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {testResult.status} {testResult.statusText}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-600">
              <div className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {testResult.duration}ms
              </div>
              {testResult.data && (
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1 hover:text-surface-200 transition-colors"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {testResult.error && (
            <div className="p-4 border-t border-red-500/20">
              <p className="text-sm text-red-600">{testResult.error}</p>
            </div>
          )}

          {/* Response Headers */}
          {testResult.success && Object.keys(testResult.headers).length > 0 && (
            <div className="border-t border-surface-800">
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="w-full flex items-center gap-2 p-3 text-sm text-surface-600 hover:text-surface-200 transition-colors"
              >
                {showHeaders ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
                Response Headers ({Object.keys(testResult.headers).length})
              </button>
              {showHeaders && (
                <div className="px-4 pb-3">
                  <div className="p-3 bg-surface-800/50 rounded font-mono text-xs space-y-1">
                    {Object.entries(testResult.headers).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-surface-500">{key}:</span>{' '}
                        <span className="text-surface-700">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Response Body */}
          {testResult.data && (
            <div className="border-t border-surface-800">
              <button
                onClick={() => setShowRawResponse(!showRawResponse)}
                className="w-full flex items-center gap-2 p-3 text-sm text-surface-600 hover:text-surface-200 transition-colors"
              >
                {showRawResponse ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
                Response Body
              </button>
              {showRawResponse && (
                <div className="px-4 pb-4">
                  <pre className="p-4 bg-surface-900 rounded-lg overflow-x-auto text-xs font-mono text-surface-700 max-h-96">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Help Text */}
      <p className="text-xs text-surface-500 text-center">
        Note: Test requests are currently simulated. In production, requests will be made through a
        secure backend proxy.
      </p>
    </div>
  );
}
