import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  CodeBracketIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

interface RawRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  description: string;
}

interface RawApiConfig {
  name: string;
  description: string;
  rawRequests: RawRequest[];
  customCode: string;
}

interface RawApiTabProps {
  config: RawApiConfig;
  onChange: (config: RawApiConfig) => void;
}

const DEFAULT_CODE_TEMPLATE = `// Custom integration code
// This code runs during each sync to collect evidence

/**
 * Main sync function - called by the GRC platform
 * @param {Object} context - Execution context
 * @param {string} context.baseUrl - Base URL for API calls
 * @param {Object} context.auth - Authentication headers
 * @param {Function} context.fetch - Fetch function for making requests
 * @param {Function} context.log - Logging function
 * @returns {Promise<Object>} - Evidence items to collect
 */
async function sync(context) {
  const { baseUrl, auth, fetch, log } = context;
  
  const evidence = [];
  
  try {
    // Example: Fetch users
    const response = await fetch(\`\${baseUrl}/api/v1/users\`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
    }
    
    const data = await response.json();
    
    // Transform response to evidence format
    evidence.push({
      title: 'User List',
      description: 'All users from the system',
      type: 'user_list',
      data: data,
      collectedAt: new Date().toISOString(),
    });
    
    log('Successfully collected user data');
    
  } catch (error) {
    log(\`Error: \${error.message}\`, 'error');
    throw error;
  }
  
  return { evidence };
}

// Export the sync function
module.exports = { sync };
`;

const CURL_EXAMPLE = `# Example cURL command - paste your own below
curl -X GET "https://api.example.com/v1/users" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`;

export default function RawApiTab({ config, onChange }: RawApiTabProps) {
  const [mode, setMode] = useState<'requests' | 'code'>('requests');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    config.rawRequests[0]?.id || null
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [parseInput, setParseInput] = useState('');
  const [showParseModal, setShowParseModal] = useState(false);

  const addRequest = () => {
    const newRequest: RawRequest = {
      id: `req_${Date.now()}`,
      name: `Request ${config.rawRequests.length + 1}`,
      method: 'GET',
      url: '',
      headers: 'Content-Type: application/json',
      body: '',
      description: '',
    };
    onChange({
      ...config,
      rawRequests: [...config.rawRequests, newRequest],
    });
    setSelectedRequestId(newRequest.id);
  };

  const updateRequest = (id: string, updates: Partial<RawRequest>) => {
    onChange({
      ...config,
      rawRequests: config.rawRequests.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    });
  };

  const deleteRequest = (id: string) => {
    onChange({
      ...config,
      rawRequests: config.rawRequests.filter((r) => r.id !== id),
    });
    if (selectedRequestId === id) {
      setSelectedRequestId(config.rawRequests[0]?.id || null);
    }
  };

  const duplicateRequest = (id: string) => {
    const original = config.rawRequests.find((r) => r.id === id);
    if (original) {
      const duplicate: RawRequest = {
        ...original,
        id: `req_${Date.now()}`,
        name: `${original.name} (copy)`,
      };
      onChange({
        ...config,
        rawRequests: [...config.rawRequests, duplicate],
      });
      setSelectedRequestId(duplicate.id);
    }
  };

  const parseCurlOrHttp = () => {
    try {
      let method = 'GET';
      let url = '';
      const headers: string[] = [];
      let body = '';

      const input = parseInput.trim();

      // Parse cURL command
      if (input.toLowerCase().startsWith('curl')) {
        // Extract method
        const methodMatch = input.match(/-X\s+(\w+)/i);
        if (methodMatch) method = methodMatch[1].toUpperCase();

        // Extract URL (handle quoted strings)
        const urlMatch =
          input.match(/curl\s+(?:-[^\s]+\s+)*["']?([^"'\s]+)["']?/i) ||
          input.match(/["']?(https?:\/\/[^"'\s]+)["']?/);
        if (urlMatch) url = urlMatch[1];

        // Extract headers
        const headerMatches = input.matchAll(/-H\s+["']([^"']+)["']/gi);
        for (const match of headerMatches) {
          headers.push(match[1]);
        }

        // Extract body
        const bodyMatch =
          input.match(/-d\s+["'](.+?)["'](?:\s|$)/is) ||
          input.match(/--data\s+["'](.+?)["'](?:\s|$)/is);
        if (bodyMatch) body = bodyMatch[1];

        // Parse raw HTTP request
      } else if (input.match(/^(GET|POST|PUT|DELETE|PATCH)\s/i)) {
        const lines = input.split('\n');
        const firstLine = lines[0].trim();
        const [reqMethod, path] = firstLine.split(/\s+/);
        method = reqMethod.toUpperCase();

        // Find host header for full URL
        const hostLine = lines.find((l) => l.toLowerCase().startsWith('host:'));
        const host = hostLine?.split(':').slice(1).join(':').trim() || 'api.example.com';
        url = `https://${host}${path}`;

        // Extract headers (skip first line and empty lines)
        let inBody = false;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line === '') {
            inBody = true;
            continue;
          }
          if (inBody) {
            body += line + '\n';
          } else if (line.includes(':') && !line.toLowerCase().startsWith('host:')) {
            headers.push(line);
          }
        }
      }

      if (url) {
        const newRequest: RawRequest = {
          id: `req_${Date.now()}`,
          name: `Parsed Request`,
          method,
          url,
          headers: headers.join('\n'),
          body: body.trim(),
          description: 'Parsed from clipboard',
        };
        onChange({
          ...config,
          rawRequests: [...config.rawRequests, newRequest],
        });
        setSelectedRequestId(newRequest.id);
        setShowParseModal(false);
        setParseInput('');
      }
    } catch (error) {
      console.error('Failed to parse input:', error);
    }
  };

  const testRequest = async () => {
    const request = config.rawRequests.find((r) => r.id === selectedRequestId);
    if (!request) return;

    setIsTesting(true);
    setTestResult(null);

    // Simulate test (in production this would go through backend)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setTestResult({
      success: true,
      status: 200,
      statusText: 'OK (Simulated)',
      duration: 234,
      response: {
        data: [
          { id: 1, name: 'Sample Item 1' },
          { id: 2, name: 'Sample Item 2' },
        ],
        meta: { total: 2 },
      },
    });

    setIsTesting(false);
  };

  const selectedRequest = config.rawRequests.find((r) => r.id === selectedRequestId);

  return (
    <div className="h-full flex flex-col">
      {/* Mode Toggle */}
      <div className="p-4 border-b border-surface-800">
        <div className="flex items-center gap-2 p-1 bg-surface-800 rounded-lg w-fit">
          <button
            onClick={() => setMode('requests')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
              mode === 'requests'
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-600 hover:text-surface-200'
            )}
          >
            <CommandLineIcon className="w-4 h-4" />
            HTTP Requests
          </button>
          <button
            onClick={() => setMode('code')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2',
              mode === 'code'
                ? 'bg-surface-700 text-surface-100'
                : 'text-surface-600 hover:text-surface-200'
            )}
          >
            <CodeBracketIcon className="w-4 h-4" />
            Custom Code
          </button>
        </div>
      </div>
      {mode === 'requests' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Request List Sidebar */}
          <div className="w-64 border-r border-surface-800 flex flex-col">
            <div className="p-3 border-b border-surface-800">
              <div className="flex gap-2">
                <button onClick={addRequest} className="flex-1 btn-secondary text-xs py-1.5">
                  <PlusIcon className="w-3.5 h-3.5 mr-1" />
                  New
                </button>
                <button
                  onClick={() => setShowParseModal(true)}
                  className="flex-1 btn-secondary text-xs py-1.5"
                >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5 mr-1" />
                  Paste
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {config.rawRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedRequestId(request.id)}
                  className={clsx(
                    'w-full text-left p-2 rounded-lg transition-colors group',
                    selectedRequestId === request.id
                      ? 'bg-brand-500/10 border border-brand-500/30'
                      : 'hover:bg-surface-800 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'px-1.5 py-0.5 text-[10px] font-mono rounded font-bold',
                        request.method === 'GET' && 'bg-green-500/20 text-green-600',
                        request.method === 'POST' && 'bg-blue-500/20 text-blue-600',
                        request.method === 'PUT' && 'bg-yellow-500/20 text-yellow-600',
                        request.method === 'DELETE' && 'bg-red-500/20 text-red-600',
                        request.method === 'PATCH' && 'bg-purple-500/20 text-purple-600'
                      )}
                    >
                      {request.method}
                    </span>
                    <span className="text-xs text-surface-200 truncate flex-1">{request.name}</span>
                  </div>
                  {request.url && (
                    <div className="text-[10px] text-surface-500 truncate mt-1 font-mono">
                      {request.url}
                    </div>
                  )}
                </button>
              ))}
              {config.rawRequests.length === 0 && (
                <div className="text-center py-8 text-surface-500 text-xs">
                  No requests yet.
                  <br />
                  Click "New" or "Paste" to add one.
                </div>
              )}
            </div>
          </div>

          {/* Request Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRequest ? (
              <>
                <div className="p-4 border-b border-surface-800 flex items-center justify-between">
                  <input
                    type="text"
                    value={selectedRequest.name}
                    onChange={(e) => updateRequest(selectedRequest.id, { name: e.target.value })}
                    className="text-lg font-semibold bg-transparent border-none text-surface-100 focus:outline-none p-0"
                    placeholder="Request Name"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => duplicateRequest(selectedRequest.id)}
                      className="p-1.5 text-surface-600 hover:text-surface-200 hover:bg-surface-800 rounded transition-colors"
                      title="Duplicate"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteRequest(selectedRequest.id)}
                      className="p-1.5 text-surface-600 hover:text-red-600 hover:bg-surface-800 rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Method & URL */}
                  <div className="flex gap-2">
                    <select
                      value={selectedRequest.method}
                      onChange={(e) =>
                        updateRequest(selectedRequest.id, { method: e.target.value })
                      }
                      className="input w-28 font-mono text-sm"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                    <input
                      type="text"
                      value={selectedRequest.url}
                      onChange={(e) => updateRequest(selectedRequest.id, { url: e.target.value })}
                      placeholder="https://api.example.com/v1/resource"
                      className="input flex-1 font-mono text-sm"
                    />
                  </div>

                  {/* Headers */}
                  <div>
                    <label className="text-sm font-medium text-surface-700 block mb-2">
                      Headers
                      <span className="text-xs font-normal text-surface-500 ml-2">
                        (one per line: Header-Name: value)
                      </span>
                    </label>
                    <Textarea
                      value={selectedRequest.headers}
                      onChange={(e) =>
                        updateRequest(selectedRequest.id, { headers: e.target.value })
                      }
                      placeholder="Authorization: Bearer YOUR_TOKEN&#10;Content-Type: application/json"
                      rows={4}
                      className="input w-full font-mono text-sm"
                    />
                  </div>

                  {/* Body */}
                  {['POST', 'PUT', 'PATCH'].includes(selectedRequest.method) && (
                    <div>
                      <label className="text-sm font-medium text-surface-700 block mb-2">
                        Request Body
                        <span className="text-xs font-normal text-surface-500 ml-2">(JSON)</span>
                      </label>
                      <Textarea
                        value={selectedRequest.body}
                        onChange={(e) =>
                          updateRequest(selectedRequest.id, { body: e.target.value })
                        }
                        placeholder={'{\n  "key": "value"\n}'}
                        rows={6}
                        className="input w-full font-mono text-sm"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-surface-700 block mb-2">
                      Description
                      <span className="text-xs font-normal text-surface-500 ml-2">(optional)</span>
                    </label>
                    <Textarea
                      value={selectedRequest.description}
                      onChange={(e) =>
                        updateRequest(selectedRequest.id, { description: e.target.value })
                      }
                      placeholder="What data does this request collect?"
                      rows={2}
                      className="input w-full text-sm"
                    />
                  </div>

                  {/* Test Button & Results */}
                  <div className="pt-4 border-t border-surface-800">
                    <button
                      onClick={testRequest}
                      disabled={isTesting || !selectedRequest.url}
                      className="btn-primary w-full"
                    >
                      {isTesting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4 mr-2" />
                          Test Request
                        </>
                      )}
                    </button>

                    {testResult && (
                      <div
                        className={clsx(
                          'mt-4 rounded-lg border overflow-hidden',
                          testResult.success
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        )}
                      >
                        <div
                          className={clsx(
                            'flex items-center justify-between p-3',
                            testResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {testResult.success ? (
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-5 h-5 text-red-600" />
                            )}
                            <span className="font-mono text-sm">
                              {testResult.status} {testResult.statusText}
                            </span>
                          </div>
                          <span className="text-xs text-surface-500">{testResult.duration}ms</span>
                        </div>
                        <pre className="p-3 text-xs font-mono text-surface-700 overflow-x-auto max-h-48">
                          {JSON.stringify(testResult.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-surface-500">
                Select a request or create a new one
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Custom Code Mode */
        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700">
            <div className="flex items-start gap-2">
              <InformationCircleIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-surface-600">
                <p className="font-medium text-surface-700 mb-1">Custom Integration Code</p>
                <p>
                  Write JavaScript code to define exactly how your integration collects data. The{' '}
                  <code className="text-brand-400">sync()</code> function is called during each sync
                  cycle.
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-surface-700">Integration Code</label>
              <button
                onClick={() => onChange({ ...config, customCode: DEFAULT_CODE_TEMPLATE })}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Reset to template
              </button>
            </div>
            <Textarea
              value={config.customCode || DEFAULT_CODE_TEMPLATE}
              onChange={(e) => onChange({ ...config, customCode: e.target.value })}
              className="flex-1 input font-mono text-sm resize-none"
              style={{ minHeight: '400px' }}
              spellCheck={false}
            />
          </div>
        </div>
      )}
      {/* Parse Modal */}
      {showParseModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowParseModal(false)} />
          <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-2xl mx-4 p-6">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">
              Paste cURL or HTTP Request
            </h3>
            <p className="text-sm text-surface-600 mb-4">
              Paste a cURL command or raw HTTP request and we'll parse it for you.
            </p>
            <Textarea
              value={parseInput}
              onChange={(e) => setParseInput(e.target.value)}
              placeholder={CURL_EXAMPLE}
              rows={10}
              className="input w-full font-mono text-sm mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowParseModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={parseCurlOrHttp}
                className="btn-primary"
                disabled={!parseInput.trim()}
              >
                Parse & Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
