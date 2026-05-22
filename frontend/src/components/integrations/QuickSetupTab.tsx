import { useState, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { IntegrationType, ConfigField, EvidenceType } from '@/lib/integrationTypes';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

interface QuickSetupConfig {
  name: string;
  description: string;
  credentials: Record<string, string>;
  evidenceTypes: string[];
  syncFrequency: string;
}

interface QuickSetupTabProps {
  typeMeta: IntegrationType;
  config: QuickSetupConfig;
  onChange: (config: QuickSetupConfig) => void;
}

// Preset configurations
const PRESETS = {
  security_essentials: {
    label: 'Security Essentials',
    description: 'Core security data for compliance',
    filter: (e: EvidenceType) =>
      e.key.includes('security') ||
      e.key.includes('audit') ||
      e.key.includes('iam') ||
      e.key.includes('users') ||
      e.key.includes('mfa') ||
      e.key.includes('policy'),
  },
  full_compliance: {
    label: 'Full Compliance',
    description: 'All available evidence types',
    filter: () => true,
  },
  minimal: {
    label: 'Minimal',
    description: 'Only essential data',
    filter: (e: EvidenceType) => e.defaultEnabled,
  },
};

// Group evidence types by category (derived from key naming)
function groupEvidenceTypes(evidenceTypes: EvidenceType[]): Record<string, EvidenceType[]> {
  const groups: Record<string, EvidenceType[]> = {};

  evidenceTypes.forEach((et) => {
    let category = 'General';
    const key = et.key.toLowerCase();

    if (
      key.includes('user') ||
      key.includes('member') ||
      key.includes('people') ||
      key.includes('iam')
    ) {
      category = 'Users & Access';
    } else if (
      key.includes('security') ||
      key.includes('threat') ||
      key.includes('vuln') ||
      key.includes('alert')
    ) {
      category = 'Security';
    } else if (key.includes('audit') || key.includes('log') || key.includes('event')) {
      category = 'Audit & Logs';
    } else if (key.includes('policy') || key.includes('rule') || key.includes('compliance')) {
      category = 'Policies & Compliance';
    } else if (
      key.includes('device') ||
      key.includes('asset') ||
      key.includes('instance') ||
      key.includes('server')
    ) {
      category = 'Assets & Infrastructure';
    } else if (key.includes('app') || key.includes('service') || key.includes('project')) {
      category = 'Applications';
    }

    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(et);
  });

  return groups;
}

export default function QuickSetupTab({ typeMeta, config, onChange }: QuickSetupTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Users & Access', 'Security'])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const groupedEvidence = useMemo(
    () => groupEvidenceTypes(typeMeta.evidenceTypes || []),
    [typeMeta.evidenceTypes]
  );

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedEvidence;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, EvidenceType[]> = {};

    Object.entries(groupedEvidence).forEach(([category, types]) => {
      const matchingTypes = types.filter(
        (t) =>
          t.label.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.key.toLowerCase().includes(query)
      );
      if (matchingTypes.length > 0) {
        filtered[category] = matchingTypes;
      }
    });

    return filtered;
  }, [groupedEvidence, searchQuery]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleEvidenceType = (key: string) => {
    const newTypes = config.evidenceTypes.includes(key)
      ? config.evidenceTypes.filter((k) => k !== key)
      : [...config.evidenceTypes, key];
    onChange({ ...config, evidenceTypes: newTypes });
  };

  const selectAllInCategory = (category: string) => {
    const categoryKeys = groupedEvidence[category]?.map((e) => e.key) || [];
    const allSelected = categoryKeys.every((k) => config.evidenceTypes.includes(k));

    if (allSelected) {
      onChange({
        ...config,
        evidenceTypes: config.evidenceTypes.filter((k) => !categoryKeys.includes(k)),
      });
    } else {
      const newTypes = new Set([...config.evidenceTypes, ...categoryKeys]);
      onChange({ ...config, evidenceTypes: Array.from(newTypes) });
    }
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    const selectedTypes = (typeMeta.evidenceTypes || []).filter(preset.filter).map((e) => e.key);
    onChange({ ...config, evidenceTypes: selectedTypes });
  };

  const updateCredential = (key: string, value: string) => {
    onChange({
      ...config,
      credentials: { ...config.credentials, [key]: value },
    });
  };

  const renderConfigField = (field: ConfigField) => {
    const value = config.credentials[field.key] || '';

    switch (field.type) {
      case 'select':
        return (
          <SelectNative
            value={value}
            onChange={(e) => updateCredential(field.key, e.target.value)}
            className="input w-full"
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((opt) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={optValue} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </SelectNative>
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateCredential(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="input w-full font-mono text-sm"
          />
        );
      case 'password':
        return (
          <Input
            type="password"
            value={value}
            onChange={(e) => updateCredential(field.key, e.target.value)}
            placeholder={field.placeholder || '••••••••'}
            className="input w-full"
          />
        );
      default:
        return (
          <Input
            type={field.type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={(e) => updateCredential(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
          />
        );
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Basic Info */}
      <section>
        <h3 className="text-sm font-semibold text-surface-800 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1.5">Name</label>
            <Input
              type="text"
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1.5">Sync Frequency</label>
            <SelectNative
              value={config.syncFrequency}
              onChange={(e) => onChange({ ...config, syncFrequency: e.target.value })}
              className="input w-full"
            >
              {typeMeta.syncFrequencies?.map((freq) => (
                <option key={freq} value={freq}>
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-surface-600 mb-1.5">Description (optional)</label>
            <Textarea
              value={config.description}
              onChange={(e) => onChange({ ...config, description: e.target.value })}
              placeholder="Brief description of this integration instance"
              rows={2}
              className="input w-full"
            />
          </div>
        </div>
      </section>
      {/* Connection Settings */}
      <section>
        <h3 className="text-sm font-semibold text-surface-800 mb-4">Connection Settings</h3>
        <div className="space-y-4">
          {typeMeta.configFields?.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-surface-600 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {renderConfigField(field)}
              {field.helpText && (
                <p className="text-xs text-surface-500 mt-1.5 flex items-start gap-1">
                  <InformationCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {field.helpText}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      {/* Data Selection */}
      {typeMeta.evidenceTypes && typeMeta.evidenceTypes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-800">Data to Collect</h3>
            <span className="text-xs text-surface-500">
              {config.evidenceTypes.length} of {typeMeta.evidenceTypes.length} selected
            </span>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
                className="px-3 py-1.5 text-xs bg-white hover:bg-surface-200 border border-surface-200 rounded-lg transition-colors dark:bg-surface-900"
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <Input
              type="text"
              placeholder="Search data types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full text-sm"
            />
          </div>

          {/* Category Groups */}
          <div className="space-y-2 border border-surface-200 rounded-lg overflow-hidden">
            {Object.entries(filteredGroups).map(([category, types]) => {
              const isExpanded = expandedCategories.has(category);
              const selectedCount = types.filter((t) =>
                config.evidenceTypes.includes(t.key)
              ).length;
              const allSelected = selectedCount === types.length;

              return (
                <div key={category} className="bg-white/50 dark:bg-surface-900/50">
                  {/* Category Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white transition-colors dark:bg-surface-900 dark:hover:bg-surface-800"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4 text-surface-600" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4 text-surface-600" />
                      )}
                      <span className="font-medium text-surface-800">{category}</span>
                      <span className="text-xs text-surface-500">
                        ({selectedCount}/{types.length})
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInCategory(category);
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* Evidence Types */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-1">
                      {types.map((evidenceType) => {
                        const isSelected = config.evidenceTypes.includes(evidenceType.key);
                        return (
                          <div
                            key={evidenceType.key}
                            onClick={() => toggleEvidenceType(evidenceType.key)}
                            className={clsx(
                              'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                              isSelected
                                ? 'bg-brand-500/10 border border-brand-500/30'
                                : 'bg-white/50 border border-transparent hover:border-surface-200 dark:bg-surface-900/50'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                                isSelected
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-surface-200 border border-surface-300'
                              )}
                            >
                              {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-surface-800">
                                {evidenceType.label}
                              </div>
                              <div className="text-xs text-surface-500 mt-0.5">
                                {evidenceType.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {config.evidenceTypes.length > 0 && (
            <div className="mt-4 p-4 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50">
              <h4 className="text-xs font-semibold text-surface-700 uppercase mb-2">
                Collection Summary
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {config.evidenceTypes.slice(0, 10).map((key) => {
                  const et = typeMeta.evidenceTypes?.find((e) => e.key === key);
                  return (
                    <span
                      key={key}
                      className="px-2 py-1 text-xs bg-surface-200 rounded text-surface-700"
                    >
                      {et?.label || key}
                    </span>
                  );
                })}
                {config.evidenceTypes.length > 10 && (
                  <span className="px-2 py-1 text-xs bg-surface-200 rounded text-surface-600">
                    +{config.evidenceTypes.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
