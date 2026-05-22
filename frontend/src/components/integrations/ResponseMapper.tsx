import { useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { ResponseMapping } from './AdvancedBuilderTab';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface ResponseMapperProps {
  mappings: ResponseMapping[];
  onChange: (mappings: ResponseMapping[]) => void;
  sampleResponse?: any;
}

const DATA_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'array', label: 'Array' },
  { value: 'object', label: 'Object' },
] as const;

const COMMON_TRANSFORMATIONS = [
  { value: '', label: 'None' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'parseDate', label: 'Parse as date' },
  { value: 'toString', label: 'Convert to string' },
  { value: 'toNumber', label: 'Convert to number' },
  { value: 'toBoolean', label: 'Convert to boolean' },
  { value: 'first', label: 'First element (array)' },
  { value: 'join', label: 'Join array' },
  { value: 'count', label: 'Count elements' },
];

const SUGGESTED_FIELDS = [
  { field: 'id', description: 'Unique identifier' },
  { field: 'name', description: 'Display name' },
  { field: 'email', description: 'Email address' },
  { field: 'created_at', description: 'Creation timestamp' },
  { field: 'updated_at', description: 'Last update timestamp' },
  { field: 'status', description: 'Current status' },
  { field: 'type', description: 'Resource type' },
  { field: 'description', description: 'Description text' },
  { field: 'owner', description: 'Owner/assignee' },
  { field: 'tags', description: 'Labels/tags' },
];

// Helper to get JSON paths from a sample object
function extractJsonPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];

  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        paths.push(...extractJsonPaths(obj[0], `${prefix}[0]`));
      }
      paths.push(`${prefix}[*]`);
    } else {
      Object.keys(obj).forEach((key) => {
        const newPath = prefix ? `${prefix}.${key}` : key;
        paths.push(newPath);
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          paths.push(...extractJsonPaths(obj[key], newPath));
        }
      });
    }
  }

  return paths;
}

export default function ResponseMapper({
  mappings,
  onChange,
  sampleResponse,
}: ResponseMapperProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const availablePaths = sampleResponse ? extractJsonPaths(sampleResponse) : [];

  const addMapping = () => {
    const newMapping: ResponseMapping = {
      id: `map_${Date.now()}`,
      sourcePath: '',
      targetField: '',
      dataType: 'string',
    };
    onChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, updates: Partial<ResponseMapping>) => {
    onChange(mappings.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMapping = (id: string) => {
    onChange(mappings.filter((m) => m.id !== id));
  };

  const addSuggestedField = (field: string) => {
    const newMapping: ResponseMapping = {
      id: `map_${Date.now()}`,
      sourcePath: field,
      targetField: field,
      dataType: 'string',
    };
    onChange([...mappings, newMapping]);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-surface-600">
            <p className="font-medium text-surface-700 mb-1">Response Mapping</p>
            <p>
              Map fields from the API response to evidence fields. Use JSON path notation (e.g.,{' '}
              <code className="text-brand-400">data.users[0].email</code>) to extract nested values.
            </p>
          </div>
        </div>
      </div>
      {/* Quick Add Suggestions */}
      <div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm text-brand-400 hover:text-brand-300 mb-2"
        >
          {showSuggestions ? 'Hide suggestions' : 'Show common field suggestions'}
        </button>
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 p-3 bg-white/30 rounded-lg dark:bg-surface-900/30">
            {SUGGESTED_FIELDS.map(({ field, description }) => (
              <button
                key={field}
                onClick={() => addSuggestedField(field)}
                className="px-2 py-1 text-xs bg-surface-200 hover:bg-surface-600 rounded border border-surface-300 hover:border-surface-500 transition-colors"
                title={description}
              >
                {field}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Sample Response Paths */}
      {availablePaths.length > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-600 font-medium mb-2">
            Detected paths from sample response:
          </p>
          <div className="flex flex-wrap gap-1">
            {availablePaths.slice(0, 15).map((path) => (
              <button
                key={path}
                onClick={() => addSuggestedField(path)}
                className="px-2 py-0.5 text-xs font-mono bg-green-500/20 hover:bg-green-500/30 rounded text-green-700 transition-colors"
              >
                {path}
              </button>
            ))}
            {availablePaths.length > 15 && (
              <span className="px-2 py-0.5 text-xs text-green-600">
                +{availablePaths.length - 15} more
              </span>
            )}
          </div>
        </div>
      )}
      {/* Mapping List */}
      <div className="space-y-3">
        {mappings.map((mapping) => (
          <div
            key={mapping.id}
            className="p-4 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Path */}
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Source Path (JSON)</label>
                  <Input
                    type="text"
                    value={mapping.sourcePath}
                    onChange={(e) => updateMapping(mapping.id, { sourcePath: e.target.value })}
                    placeholder="data.items[0].name"
                    className="input w-full font-mono text-sm"
                    list={`paths-${mapping.id}`}
                  />
                  {availablePaths.length > 0 && (
                    <datalist id={`paths-${mapping.id}`}>
                      {availablePaths.map((path) => (
                        <option key={path} value={path} />
                      ))}
                    </datalist>
                  )}
                </div>

                {/* Target Field */}
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Target Field</label>
                  <div className="flex items-center gap-2">
                    <ArrowRightIcon className="w-4 h-4 text-surface-500 flex-shrink-0 hidden md:block" />
                    <Input
                      type="text"
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(mapping.id, { targetField: e.target.value })}
                      placeholder="user_email"
                      className="input w-full text-sm"
                    />
                  </div>
                </div>

                {/* Data Type */}
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Data Type</label>
                  <SelectNative
                    value={mapping.dataType}
                    onChange={(e) =>
                      updateMapping(mapping.id, {
                        dataType: e.target.value as ResponseMapping['dataType'],
                      })
                    }
                    className="input w-full text-sm"
                  >
                    {DATA_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </SelectNative>
                </div>

                {/* Transformation */}
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Transformation</label>
                  <SelectNative
                    value={mapping.transformation || ''}
                    onChange={(e) =>
                      updateMapping(mapping.id, { transformation: e.target.value || undefined })
                    }
                    className="input w-full text-sm"
                  >
                    {COMMON_TRANSFORMATIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => deleteMapping(mapping.id)}
                className="p-2 text-surface-600 hover:text-red-600 hover:bg-white rounded-lg transition-colors dark:bg-surface-900 dark:hover:bg-surface-800"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            {mapping.sourcePath && mapping.targetField && (
              <div className="mt-3 pt-3 border-t border-surface-200 text-xs text-surface-500">
                <code className="text-brand-400">{mapping.sourcePath}</code>
                {' → '}
                <code className="text-green-600">{mapping.targetField}</code>
                {mapping.transformation && (
                  <span className="text-surface-600"> ({mapping.transformation})</span>
                )}
              </div>
            )}
          </div>
        ))}

        {mappings.length === 0 && (
          <div className="text-center py-8 text-surface-500 bg-white/30 rounded-lg border border-dashed border-surface-200 dark:bg-surface-900/30">
            No field mappings configured. Add mappings to extract data from API responses.
          </div>
        )}
      </div>
      {/* Add Button */}
      <button
        onClick={addMapping}
        className="w-full p-3 rounded-lg border border-dashed border-surface-200 hover:border-surface-500 text-surface-600 hover:text-surface-800 transition-colors flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-4 h-4" />
        Add Field Mapping
      </button>
    </div>
  );
}
