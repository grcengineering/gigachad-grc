import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customDashboardsApi } from '@/lib/api';
import {
  DashboardWidget,
  WIDGET_TYPES,
  DataSourceType,
  FilterOperator,
  DataQuery,
  WidgetConfig,
} from '@/lib/dashboardWidgets';
import { XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface WidgetConfigModalProps {
  widget: DashboardWidget;
  onSave: (data: Partial<DashboardWidget>) => void;
  onClose: () => void;
}

export default function WidgetConfigModal({ widget, onSave, onClose }: WidgetConfigModalProps) {
  const [title, setTitle] = useState(widget.title);
  const [dataSource, setDataSource] = useState<DataQuery>(
    widget.dataSource || { source: DataSourceType.CONTROLS }
  );
  const [config, setConfig] = useState<WidgetConfig>(widget.config || {});
  const [activeTab, setActiveTab] = useState<'data' | 'appearance'>('data');
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const widgetDef = WIDGET_TYPES[widget.widgetType];

  // Fetch available data sources
  const { data: dataSources } = useQuery({
    queryKey: ['data-sources'],
    queryFn: () => customDashboardsApi.getDataSources().then((res) => res.data),
  });

  const handlePreview = async () => {
    if (!dataSource.source) return;
    setIsPreviewLoading(true);
    try {
      const res = await customDashboardsApi.executeQuery(dataSource, true);
      setPreviewData(res.data);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSave = () => {
    onSave({
      title,
      dataSource,
      config,
    });
  };

  // Get fields for selected data source
  const selectedSourceDef = dataSources?.find((ds: any) => ds.type === dataSource.source);
  const availableFields = selectedSourceDef?.fields || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Configure Widget</h2>
            <p className="text-sm text-surface-600">{widgetDef?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-700 rounded text-surface-600 hover:text-surface-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-700">
          <button
            onClick={() => setActiveTab('data')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'data'
                ? 'text-brand-400 border-b-2 border-brand-400'
                : 'text-surface-600 hover:text-surface-200'
            )}
          >
            Data Source
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'appearance'
                ? 'text-brand-400 border-b-2 border-brand-400'
                : 'text-surface-600 hover:text-surface-200'
            )}
          >
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Title field (always visible) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-surface-700 mb-2">Widget Title</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full"
              placeholder="Enter widget title"
            />
          </div>

          {activeTab === 'data' && widgetDef?.requiresDataSource && (
            <div className="space-y-6">
              {/* Data Source Selection */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Data Source
                </label>
                <SelectNative
                  value={dataSource.source || ''}
                  onChange={(e) =>
                    setDataSource({ ...dataSource, source: e.target.value as DataSourceType })
                  }
                  className="input w-full"
                >
                  <option value="">Select a data source</option>
                  {dataSources?.map((ds: any) => (
                    <option key={ds.type} value={ds.type}>
                      {ds.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              {/* Group By */}
              {availableFields.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Group By (for charts)
                  </label>
                  <SelectNative
                    value={dataSource.groupBy || ''}
                    onChange={(e) =>
                      setDataSource({ ...dataSource, groupBy: e.target.value || undefined })
                    }
                    className="input w-full"
                  >
                    <option value="">No grouping</option>
                    {availableFields
                      .filter((f: any) => f.aggregatable)
                      .map((field: any) => (
                        <option key={field.name} value={field.name}>
                          {field.label}
                        </option>
                      ))}
                  </SelectNative>
                </div>
              )}

              {/* Filters */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Filters</label>
                <FilterBuilder
                  filters={dataSource.filters || []}
                  onChange={(filters) => setDataSource({ ...dataSource, filters })}
                  availableFields={availableFields}
                />
              </div>

              {/* Limit */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Limit Results
                </label>
                <Input
                  type="number"
                  value={dataSource.limit || ''}
                  onChange={(e) =>
                    setDataSource({
                      ...dataSource,
                      limit: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="input w-32"
                  placeholder="No limit"
                  min={1}
                  max={1000}
                />
              </div>

              {/* Preview Button */}
              <div className="flex items-center gap-4">
                <Button
                  onClick={handlePreview}
                  disabled={!dataSource.source || isPreviewLoading}
                  className="btn-sm"
                  variant="ghost"
                >
                  <PlayIcon className="w-4 h-4 mr-1" />
                  {isPreviewLoading ? 'Loading...' : 'Preview Data'}
                </Button>
              </div>

              {/* Preview Results */}
              {previewData && (
                <div className="bg-surface-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-surface-700 mb-2">
                    Preview ({previewData.length} results)
                  </h4>
                  <pre className="text-xs text-surface-600 overflow-auto max-h-48">
                    {JSON.stringify(previewData.slice(0, 5), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Show Legend */}
              {widgetDef?.configOptions.includes('showLegend') && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showLegend"
                    checked={config.showLegend || false}
                    onChange={(e) => setConfig({ ...config, showLegend: e.target.checked })}
                    className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="showLegend" className="text-sm text-surface-700">
                    Show Legend
                  </label>
                </div>
              )}

              {/* Show Values */}
              {widgetDef?.configOptions.includes('showValues') && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showValues"
                    checked={config.showValues || false}
                    onChange={(e) => setConfig({ ...config, showValues: e.target.checked })}
                    className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                  />
                  <label htmlFor="showValues" className="text-sm text-surface-700">
                    Show Values on Chart
                  </label>
                </div>
              )}

              {/* Orientation */}
              {widgetDef?.configOptions.includes('orientation') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Chart Orientation
                  </label>
                  <SelectNative
                    value={config.orientation || 'vertical'}
                    onChange={(e) => setConfig({ ...config, orientation: e.target.value as any })}
                    className="input w-48"
                  >
                    <option value="vertical">Vertical</option>
                    <option value="horizontal">Horizontal</option>
                  </SelectNative>
                </div>
              )}

              {/* Value Format */}
              {widgetDef?.configOptions.includes('valueFormat') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Value Format
                  </label>
                  <Input
                    type="text"
                    value={config.valueFormat || ''}
                    onChange={(e) => setConfig({ ...config, valueFormat: e.target.value })}
                    className="input w-full"
                    placeholder="{value} or {value}%"
                  />
                  <p className="text-xs text-surface-500 mt-1">
                    Use {'{value}'} as placeholder for the actual value
                  </p>
                </div>
              )}

              {/* Target Value */}
              {widgetDef?.configOptions.includes('targetValue') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Target Value
                  </label>
                  <Input
                    type="number"
                    value={config.targetValue || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        targetValue: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="input w-32"
                    placeholder="100"
                  />
                </div>
              )}

              {/* Max Value */}
              {widgetDef?.configOptions.includes('maxValue') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Max Value
                  </label>
                  <Input
                    type="number"
                    value={config.maxValue || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maxValue: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="input w-32"
                    placeholder="100"
                  />
                </div>
              )}

              {/* Markdown Content */}
              {widgetDef?.configOptions.includes('markdownContent') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Content (Markdown)
                  </label>
                  <Textarea
                    value={config.markdownContent || ''}
                    onChange={(e) => setConfig({ ...config, markdownContent: e.target.value })}
                    className="input w-full h-32 font-mono text-sm"
                    placeholder="# Heading\n\nSome **bold** text..."
                  />
                </div>
              )}

              {/* IFrame URL */}
              {widgetDef?.configOptions.includes('iframeUrl') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Embed URL
                  </label>
                  <Input
                    type="url"
                    value={config.iframeUrl || ''}
                    onChange={(e) => setConfig({ ...config, iframeUrl: e.target.value })}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              )}

              {/* Page Size for tables */}
              {widgetDef?.configOptions.includes('pageSize') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Rows per Page
                  </label>
                  <Input
                    type="number"
                    value={config.pageSize || 10}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        pageSize: parseInt(e.target.value) || 10,
                      })
                    }
                    className="input w-32"
                    min={5}
                    max={100}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && !widgetDef?.requiresDataSource && (
            <div className="text-surface-500 text-sm">
              This widget doesn't require data configuration.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-700">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// Filter Builder Component
function FilterBuilder({
  filters,
  onChange,
  availableFields,
}: {
  filters: any[];
  onChange: (filters: any[]) => void;
  availableFields: any[];
}) {
  const addFilter = () => {
    onChange([...filters, { field: '', operator: FilterOperator.EQ, value: '' }]);
  };

  const updateFilter = (index: number, updates: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {filters.map((filter, index) => (
        <div key={index} className="flex items-center gap-2">
          <SelectNative
            value={filter.field}
            onChange={(e) => updateFilter(index, { field: e.target.value })}
            className="input flex-1"
          >
            <option value="">Select field</option>
            {availableFields
              .filter((f: any) => f.filterable)
              .map((field: any) => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
          </SelectNative>
          <SelectNative
            value={filter.operator}
            onChange={(e) => updateFilter(index, { operator: e.target.value })}
            className="input w-32"
          >
            <option value={FilterOperator.EQ}>equals</option>
            <option value={FilterOperator.NEQ}>not equals</option>
            <option value={FilterOperator.GT}>greater than</option>
            <option value={FilterOperator.LT}>less than</option>
            <option value={FilterOperator.CONTAINS}>contains</option>
            <option value={FilterOperator.IN}>in list</option>
          </SelectNative>
          <Input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            className="input flex-1"
            placeholder="Value"
          />
          <button
            onClick={() => removeFilter(index)}
            className="p-2 text-red-600 hover:text-red-700"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <Button onClick={addFilter} className="btn-sm" variant="ghost">
        + Add Filter
      </Button>
    </div>
  );
}
