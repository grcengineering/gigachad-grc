import { useState, useEffect, useCallback } from 'react';
import {
  FunnelIcon,
  PlusIcon,
  TrashIcon,
  BookmarkIcon,
  ChevronDownIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

// ===========================================
// Types
// ===========================================

type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty';

interface FilterField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select' | 'multi_select' | 'boolean';
  options?: { value: string; label: string }[];
}

interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | string[] | number | boolean | null;
}

interface FilterPreset {
  id: string;
  name: string;
  conditions: FilterCondition[];
  createdAt: string;
}

interface AdvancedFiltersProps {
  fields: FilterField[];
  onApply: (conditions: FilterCondition[]) => void;
  storageKey?: string; // For persisting presets
  className?: string;
}

// ===========================================
// Operator Configuration
// ===========================================

const OPERATORS: Record<string, { label: string; requiresValue: boolean; types: string[] }> = {
  equals: {
    label: 'equals',
    requiresValue: true,
    types: ['string', 'number', 'date', 'select', 'boolean'],
  },
  not_equals: {
    label: 'does not equal',
    requiresValue: true,
    types: ['string', 'number', 'date', 'select', 'boolean'],
  },
  contains: { label: 'contains', requiresValue: true, types: ['string'] },
  not_contains: { label: 'does not contain', requiresValue: true, types: ['string'] },
  starts_with: { label: 'starts with', requiresValue: true, types: ['string'] },
  ends_with: { label: 'ends with', requiresValue: true, types: ['string'] },
  greater_than: { label: 'greater than', requiresValue: true, types: ['number', 'date'] },
  less_than: { label: 'less than', requiresValue: true, types: ['number', 'date'] },
  between: { label: 'between', requiresValue: true, types: ['number', 'date'] },
  in: { label: 'is any of', requiresValue: true, types: ['select', 'multi_select'] },
  not_in: { label: 'is none of', requiresValue: true, types: ['select', 'multi_select'] },
  is_empty: {
    label: 'is empty',
    requiresValue: false,
    types: ['string', 'select', 'multi_select'],
  },
  is_not_empty: {
    label: 'is not empty',
    requiresValue: false,
    types: ['string', 'select', 'multi_select'],
  },
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ===========================================
// Main Component
// ===========================================

export function AdvancedFilters({ fields, onApply, storageKey, className }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Load presets from localStorage
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(`filters_${storageKey}`);
      if (saved) {
        try {
          setPresets(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load filter presets:', e);
        }
      }
    }
  }, [storageKey]);

  // Save presets to localStorage
  const savePresetsToStorage = useCallback(
    (newPresets: FilterPreset[]) => {
      if (storageKey) {
        localStorage.setItem(`filters_${storageKey}`, JSON.stringify(newPresets));
      }
      setPresets(newPresets);
    },
    [storageKey]
  );

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: generateId(),
      field: fields[0]?.key || '',
      operator: 'equals',
      value: '',
    };
    setConditions([...conditions, newCondition]);
    setActivePresetId(null);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setActivePresetId(null);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
    setActivePresetId(null);
  };

  const clearAll = () => {
    setConditions([]);
    setActivePresetId(null);
    onApply([]);
  };

  const applyFilters = () => {
    onApply(conditions);
    setIsOpen(false);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: FilterPreset = {
      id: generateId(),
      name: presetName.trim(),
      conditions: [...conditions],
      createdAt: new Date().toISOString(),
    };

    savePresetsToStorage([...presets, newPreset]);
    setPresetName('');
    setShowSavePreset(false);
    setActivePresetId(newPreset.id);
  };

  const loadPreset = (preset: FilterPreset) => {
    setConditions([...preset.conditions]);
    setActivePresetId(preset.id);
  };

  const deletePreset = (presetId: string) => {
    savePresetsToStorage(presets.filter((p) => p.id !== presetId));
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  };

  const getFieldByKey = (key: string) => fields.find((f) => f.key === key);

  const getOperatorsForField = (fieldKey: string) => {
    const field = getFieldByKey(fieldKey);
    if (!field) return [];
    return Object.entries(OPERATORS)
      .filter(([_, config]) => config.types.includes(field.type))
      .map(([key, config]) => ({ value: key, label: config.label }));
  };

  const activeFilterCount = conditions.length;

  return (
    <div className={clsx('relative', className)}>
      {/* Trigger Button */}
      <Button
        variant={activeFilterCount > 0 ? 'primary' : 'secondary'}
        onClick={() => setIsOpen(!isOpen)}
        leftIcon={<FunnelIcon className="w-4 h-4" />}
        rightIcon={
          activeFilterCount > 0 ? (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
              {activeFilterCount}
            </span>
          ) : (
            <ChevronDownIcon
              className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
            />
          )
        }
      >
        Filters
      </Button>
      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-[480px] bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h3 className="font-medium text-white">Advanced Filters</h3>
              <div className="flex items-center gap-2">
                {conditions.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-surface-600 hover:text-surface-200"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-surface-700 rounded"
                >
                  <XMarkIcon className="w-5 h-5 text-surface-600" />
                </button>
              </div>
            </div>

            {/* Presets */}
            {presets.length > 0 && (
              <div className="p-3 border-b border-surface-700 bg-surface-800/50">
                <p className="text-xs text-surface-500 mb-2">Saved Filters</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className={clsx(
                        'group flex items-center gap-1 px-2 py-1 rounded-lg text-sm cursor-pointer',
                        activePresetId === preset.id
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'bg-surface-700 text-surface-700 hover:bg-surface-600'
                      )}
                      onClick={() => loadPreset(preset)}
                    >
                      <BookmarkIcon className="w-3 h-3" />
                      {preset.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-600"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conditions */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {conditions.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  <FunnelIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No filters applied</p>
                  <p className="text-xs mt-1">Click "Add Filter" to get started</p>
                </div>
              ) : (
                conditions.map((condition, index) => (
                  <FilterConditionRow
                    key={condition.id}
                    condition={condition}
                    fields={fields}
                    operators={getOperatorsForField(condition.field)}
                    onUpdate={(updates) => updateCondition(condition.id, updates)}
                    onRemove={() => removeCondition(condition.id)}
                    showAndLabel={index > 0}
                  />
                ))
              )}

              <button
                onClick={addCondition}
                className="flex items-center gap-2 px-3 py-2 text-sm text-brand-400 hover:text-brand-300 hover:bg-surface-700 rounded-lg w-full"
              >
                <PlusIcon className="w-4 h-4" />
                Add Filter
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-surface-700 flex items-center justify-between">
              {showSavePreset ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Filter name..."
                    className="flex-1 px-3 py-1.5 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                  />
                  <Button size="sm" onClick={savePreset} disabled={!presetName.trim()}>
                    <CheckIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSavePreset(false)}>
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSavePreset(true)}
                    disabled={conditions.length === 0}
                    leftIcon={<BookmarkIcon className="w-4 h-4" />}
                  >
                    Save Filter
                  </Button>
                  <Button onClick={applyFilters} disabled={conditions.length === 0}>
                    Apply Filters
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================
// Filter Condition Row
// ===========================================

interface FilterConditionRowProps {
  condition: FilterCondition;
  fields: FilterField[];
  operators: { value: string; label: string }[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  showAndLabel: boolean;
}

function FilterConditionRow({
  condition,
  fields,
  operators,
  onUpdate,
  onRemove,
  showAndLabel,
}: FilterConditionRowProps) {
  const field = fields.find((f) => f.key === condition.field);
  const operatorConfig = OPERATORS[condition.operator];

  const handleFieldChange = (fieldKey: string) => {
    const newField = fields.find((f) => f.key === fieldKey);
    const validOperators = Object.entries(OPERATORS)
      .filter(([_, config]) => config.types.includes(newField?.type || 'string'))
      .map(([key]) => key);

    onUpdate({
      field: fieldKey,
      operator: validOperators.includes(condition.operator)
        ? condition.operator
        : (validOperators[0] as FilterOperator),
      value: '',
    });
  };

  return (
    <div className="space-y-2">
      {showAndLabel && <span className="text-xs text-surface-500 font-medium">AND</span>}
      <div className="flex items-center gap-2">
        {/* Field Select */}
        <SelectNative
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white"
        >
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </SelectNative>

        {/* Operator Select */}
        <SelectNative
          value={condition.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator, value: '' })}
          className="w-36 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </SelectNative>

        {/* Value Input */}
        {operatorConfig?.requiresValue && (
          <ValueInput
            field={field}
            operator={condition.operator}
            value={condition.value}
            onChange={(value) => onUpdate({ value })}
          />
        )}

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="p-2 hover:bg-surface-700 rounded-lg text-surface-600 hover:text-red-600"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===========================================
// Value Input Component
// ===========================================

interface ValueInputProps {
  field?: FilterField;
  operator: FilterOperator;
  value: string | string[] | number | boolean | null;
  onChange: (value: string | string[] | number | boolean | null) => void;
}

function ValueInput({ field, operator, value, onChange }: ValueInputProps) {
  if (!field) return null;

  // Boolean field
  if (field.type === 'boolean') {
    return (
      <SelectNative
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white"
      >
        <option value="">Select...</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </SelectNative>
    );
  }

  // Select field (single or multi)
  if ((field.type === 'select' || field.type === 'multi_select') && field.options) {
    if (operator === 'in' || operator === 'not_in') {
      // Multi-select
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 p-2 bg-surface-700 border border-surface-600 rounded-lg min-h-[38px]">
            {selectedValues.map((v) => {
              const opt = field.options?.find((o) => o.value === v);
              return (
                <span
                  key={v}
                  className="flex items-center gap-1 px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded text-xs"
                >
                  {opt?.label || v}
                  <button
                    onClick={() => onChange(selectedValues.filter((sv) => sv !== v))}
                    className="hover:text-brand-300"
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <SelectNative
              value=""
              onChange={(e) => {
                if (e.target.value && !selectedValues.includes(e.target.value)) {
                  onChange([...selectedValues, e.target.value]);
                }
              }}
              className="flex-1 min-w-[100px] bg-transparent text-sm text-white outline-none"
            >
              <option value="">Add...</option>
              {field.options
                .filter((o) => !selectedValues.includes(o.value))
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </SelectNative>
          </div>
        </div>
      );
    } else {
      // Single select
      return (
        <SelectNative
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white"
        >
          <option value="">Select...</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectNative>
      );
    }
  }

  // Date field
  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white"
      />
    );
  }

  // Number field
  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder="Enter value..."
        className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500"
      />
    );
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={String(value || '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value..."
      className="flex-1 px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-white placeholder-surface-500"
    />
  );
}

// ===========================================
// Helper: Convert conditions to query params
// ===========================================

export function conditionsToQueryParams(conditions: FilterCondition[]): Record<string, string> {
  const params: Record<string, string> = {};

  conditions.forEach((condition) => {
    const key = condition.field;
    const value = Array.isArray(condition.value)
      ? condition.value.join(',')
      : String(condition.value || '');

    // Simple mapping - extend based on your API needs
    if (condition.operator === 'equals') {
      params[key] = value;
    } else if (condition.operator === 'contains') {
      params[`${key}_contains`] = value;
    } else if (condition.operator === 'in') {
      params[`${key}_in`] = value;
    }
    // Add more operators as needed
  });

  return params;
}

export default AdvancedFilters;
