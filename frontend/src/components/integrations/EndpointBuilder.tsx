import { useState } from 'react';
import { TrashIcon, PlusIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { ApiEndpoint } from './AdvancedBuilderTab';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

interface EndpointBuilderProps {
  endpoint: ApiEndpoint;
  onChange: (updates: Partial<ApiEndpoint>) => void;
  onDelete: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const PAGINATION_TYPES = [
  { value: 'none', label: 'None', description: 'No pagination' },
  { value: 'offset', label: 'Offset/Limit', description: 'Uses offset and limit parameters' },
  { value: 'page', label: 'Page Number', description: 'Uses page number parameter' },
  { value: 'cursor', label: 'Cursor-based', description: 'Uses cursor/token for next page' },
] as const;

export default function EndpointBuilder({ endpoint, onChange, onDelete }: EndpointBuilderProps) {
  const [showBodyEditor, setShowBodyEditor] = useState(false);

  const addHeader = () => {
    onChange({
      headers: { ...endpoint.headers, '': '' },
    });
  };

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...endpoint.headers };
    if (oldKey !== newKey) {
      delete newHeaders[oldKey];
    }
    newHeaders[newKey] = value;
    onChange({ headers: newHeaders });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...endpoint.headers };
    delete newHeaders[key];
    onChange({ headers: newHeaders });
  };

  const addQueryParam = () => {
    onChange({
      queryParams: { ...endpoint.queryParams, '': '' },
    });
  };

  const updateQueryParam = (oldKey: string, newKey: string, value: string) => {
    const newParams = { ...endpoint.queryParams };
    if (oldKey !== newKey) {
      delete newParams[oldKey];
    }
    newParams[newKey] = value;
    onChange({ queryParams: newParams });
  };

  const removeQueryParam = (key: string) => {
    const newParams = { ...endpoint.queryParams };
    delete newParams[key];
    onChange({ queryParams: newParams });
  };

  const showRequestBody =
    endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          type="text"
          value={endpoint.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="text-lg font-semibold bg-transparent border-none text-surface-100 focus:outline-none focus:ring-0 p-0"
          placeholder="Endpoint Name"
        />
        <button
          onClick={onDelete}
          className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-800 rounded-lg transition-colors"
          title="Delete endpoint"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
      {/* Method & Path */}
      <div className="flex gap-2">
        <select
          value={endpoint.method}
          onChange={(e) => onChange({ method: e.target.value as (typeof HTTP_METHODS)[number] })}
          className={clsx(
            'input w-28 font-mono text-sm',
            endpoint.method === 'GET' && 'text-green-600',
            endpoint.method === 'POST' && 'text-blue-600',
            endpoint.method === 'PUT' && 'text-yellow-600',
            endpoint.method === 'DELETE' && 'text-red-600',
            endpoint.method === 'PATCH' && 'text-purple-600'
          )}
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <Input
          type="text"
          value={endpoint.path}
          onChange={(e) => onChange({ path: e.target.value })}
          placeholder="/api/v1/users"
          className="input flex-1 font-mono text-sm"
        />
      </div>
      <p className="text-xs text-surface-500 flex items-center gap-1">
        <InformationCircleIcon className="w-3.5 h-3.5" />
        Use {'{{variable}}'} syntax for dynamic values (e.g., {'{{baseUrl}}/users/{{userId}}'})
      </p>
      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-surface-700">Headers</label>
          <button
            onClick={addHeader}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            Add Header
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(endpoint.headers).map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="text"
                value={key}
                onChange={(e) => updateHeader(key, e.target.value, value)}
                placeholder="Header name"
                className="input flex-1 text-sm font-mono"
              />
              <Input
                type="text"
                value={value}
                onChange={(e) => updateHeader(key, key, e.target.value)}
                placeholder="Value"
                className="input flex-1 text-sm"
              />
              <button
                onClick={() => removeHeader(key)}
                className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Object.keys(endpoint.headers).length === 0 && (
            <p className="text-xs text-surface-500 py-2">No custom headers configured</p>
          )}
        </div>
      </div>
      {/* Query Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-surface-700">Query Parameters</label>
          <button
            onClick={addQueryParam}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
          >
            <PlusIcon className="w-3 h-3" />
            Add Parameter
          </button>
        </div>
        <div className="space-y-2">
          {Object.entries(endpoint.queryParams).map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="text"
                value={key}
                onChange={(e) => updateQueryParam(key, e.target.value, value)}
                placeholder="Parameter name"
                className="input flex-1 text-sm font-mono"
              />
              <Input
                type="text"
                value={value}
                onChange={(e) => updateQueryParam(key, key, e.target.value)}
                placeholder="Value"
                className="input flex-1 text-sm"
              />
              <button
                onClick={() => removeQueryParam(key)}
                className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-800 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {Object.keys(endpoint.queryParams).length === 0 && (
            <p className="text-xs text-surface-500 py-2">No query parameters configured</p>
          )}
        </div>
      </div>
      {/* Request Body */}
      {showRequestBody && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-surface-700">Request Body</label>
            <button
              onClick={() => setShowBodyEditor(!showBodyEditor)}
              className="text-xs text-brand-400 hover:text-brand-300"
            >
              {showBodyEditor ? 'Hide' : 'Edit'}
            </button>
          </div>
          {showBodyEditor && (
            <Textarea
              value={endpoint.body || ''}
              onChange={(e) => onChange({ body: e.target.value })}
              placeholder={'{\n  "key": "value"\n}'}
              rows={8}
              className="input w-full font-mono text-sm"
            />
          )}
          {!showBodyEditor && endpoint.body && (
            <pre className="p-3 bg-surface-800 rounded-lg text-xs text-surface-700 overflow-x-auto">
              {endpoint.body.slice(0, 200)}
              {endpoint.body.length > 200 && '...'}
            </pre>
          )}
        </div>
      )}
      {/* Pagination */}
      <div>
        <label className="text-sm font-medium text-surface-700 block mb-2">Pagination</label>
        <select
          value={endpoint.pagination?.type || 'none'}
          onChange={(e) =>
            onChange({
              pagination: {
                ...endpoint.pagination,
                type: e.target.value as 'offset' | 'cursor' | 'page' | 'none',
              },
            })
          }
          className="input w-full text-sm mb-3"
        >
          {PAGINATION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label} - {type.description}
            </option>
          ))}
        </select>

        {endpoint.pagination?.type === 'offset' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-600 block mb-1">Limit Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.limitParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, limitParam: e.target.value },
                  })
                }
                placeholder="limit"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-600 block mb-1">Offset Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.offsetParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, offsetParam: e.target.value },
                  })
                }
                placeholder="offset"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-600 block mb-1">Max Per Page</label>
              <Input
                type="number"
                value={endpoint.pagination.maxPerPage || ''}
                onChange={(e) =>
                  onChange({
                    pagination: {
                      ...endpoint.pagination!,
                      maxPerPage: parseInt(e.target.value) || undefined,
                    },
                  })
                }
                placeholder="100"
                className="input w-full text-sm"
              />
            </div>
          </div>
        )}

        {endpoint.pagination?.type === 'page' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-600 block mb-1">Page Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.pageParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, pageParam: e.target.value },
                  })
                }
                placeholder="page"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-600 block mb-1">Page Size Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.limitParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, limitParam: e.target.value },
                  })
                }
                placeholder="per_page"
                className="input w-full text-sm"
              />
            </div>
          </div>
        )}

        {endpoint.pagination?.type === 'cursor' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-surface-600 block mb-1">Cursor Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.cursorParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, cursorParam: e.target.value },
                  })
                }
                placeholder="cursor"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-surface-600 block mb-1">Limit Parameter</label>
              <Input
                type="text"
                value={endpoint.pagination.limitParam || ''}
                onChange={(e) =>
                  onChange({
                    pagination: { ...endpoint.pagination!, limitParam: e.target.value },
                  })
                }
                placeholder="limit"
                className="input w-full text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
