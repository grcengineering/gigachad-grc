import { useState, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon,
  Squares2X2Icon,
  ArrowDownTrayIcon,
  EyeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

// ===========================================
// Types
// ===========================================

export type ReportSectionType = 'heading' | 'text' | 'table' | 'chart' | 'summary' | 'divider';
export type DataSource =
  | 'controls'
  | 'risks'
  | 'policies'
  | 'vendors'
  | 'evidence'
  | 'audits'
  | 'employees';
export type ChartType = 'bar' | 'pie' | 'line' | 'donut';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: string | number | string[];
}

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title?: string;
  content?: string;
  dataSource?: DataSource;
  fields?: string[];
  filters?: ReportFilter[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  chartType?: ChartType;
  chartConfig?: {
    xAxis?: string;
    yAxis?: string;
    colorBy?: string;
  };
}

export interface ReportConfig {
  id?: string;
  name: string;
  description?: string;
  sections: ReportSection[];
  createdAt?: string;
  updatedAt?: string;
}

// ===========================================
// Data Source Definitions
// ===========================================

const DATA_SOURCES: Record<DataSource, { label: string; fields: string[] }> = {
  controls: {
    label: 'Controls',
    fields: [
      'title',
      'description',
      'status',
      'category',
      'owner',
      'lastReviewDate',
      'nextReviewDate',
    ],
  },
  risks: {
    label: 'Risks',
    fields: [
      'title',
      'description',
      'status',
      'category',
      'likelihood',
      'impact',
      'riskLevel',
      'owner',
      'treatmentPlan',
    ],
  },
  policies: {
    label: 'Policies',
    fields: [
      'title',
      'description',
      'status',
      'category',
      'version',
      'owner',
      'effectiveDate',
      'reviewDate',
    ],
  },
  vendors: {
    label: 'Vendors',
    fields: ['name', 'description', 'category', 'riskTier', 'status', 'primaryContact', 'website'],
  },
  evidence: {
    label: 'Evidence',
    fields: ['title', 'description', 'type', 'status', 'uploadedAt', 'reviewedAt', 'expiresAt'],
  },
  audits: {
    label: 'Audits',
    fields: ['name', 'type', 'status', 'auditor', 'startDate', 'endDate', 'framework'],
  },
  employees: {
    label: 'Employees',
    fields: [
      'name',
      'email',
      'department',
      'complianceScore',
      'trainingStatus',
      'backgroundCheckStatus',
    ],
  },
};

const SECTION_TYPES: { type: ReportSectionType; label: string; icon: typeof DocumentTextIcon }[] = [
  { type: 'heading', label: 'Heading', icon: DocumentTextIcon },
  { type: 'text', label: 'Text Block', icon: DocumentTextIcon },
  { type: 'table', label: 'Data Table', icon: TableCellsIcon },
  { type: 'chart', label: 'Chart', icon: ChartBarIcon },
  { type: 'summary', label: 'Summary Stats', icon: Squares2X2Icon },
  { type: 'divider', label: 'Divider', icon: DocumentTextIcon },
];

// ===========================================
// Main Component
// ===========================================

interface ReportBuilderProps {
  initialConfig?: ReportConfig;
  onSave?: (config: ReportConfig) => void;
  className?: string;
}

export default function ReportBuilder({ initialConfig, onSave, className }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      name: 'Untitled Report',
      description: '',
      sections: [],
    }
  );
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Generate unique ID
  const generateId = () => `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add new section
  const addSection = useCallback((type: ReportSectionType) => {
    const newSection: ReportSection = {
      id: generateId(),
      type,
      title: type === 'heading' ? 'New Section' : undefined,
      content: type === 'text' ? 'Enter your text here...' : undefined,
      dataSource: ['table', 'chart', 'summary'].includes(type) ? 'controls' : undefined,
      fields: ['table', 'chart', 'summary'].includes(type) ? ['title', 'status'] : undefined,
      filters: [],
    };

    setConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setSelectedSection(newSection.id);
  }, []);

  // Update section
  const updateSection = useCallback((id: string, updates: Partial<ReportSection>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  }, []);

  // Remove section
  const removeSection = useCallback(
    (id: string) => {
      setConfig((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== id),
      }));
      if (selectedSection === id) {
        setSelectedSection(null);
      }
    },
    [selectedSection]
  );

  // Move section
  const moveSection = useCallback((id: string, direction: 'up' | 'down') => {
    setConfig((prev) => {
      const index = prev.sections.findIndex((s) => s.id === id);
      if (
        (direction === 'up' && index === 0) ||
        (direction === 'down' && index === prev.sections.length - 1)
      ) {
        return prev;
      }

      const newSections = [...prev.sections];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];

      return { ...prev, sections: newSections };
    });
  }, []);

  // Handle save
  const handleSave = () => {
    if (!config.name.trim()) {
      toast.error('Please enter a report name');
      return;
    }
    onSave?.(config);
    toast.success('Report saved');
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    if (!config.name.trim()) {
      toast.error('Please enter a report name before exporting');
      return;
    }

    try {
      // For now, export the report definition as JSON that can be re-imported
      // in other environments. This is a safe first step toward full
      // server-side PDF/Excel generation.
      const filename =
        config.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'custom-report';

      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          formatRequested: format,
          version: 1,
        },
        config,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.report.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Report definition downloaded (${format.toUpperCase()} export coming later)`);
    } catch (error) {
      console.error('Error exporting report definition', error);
      toast.error('Failed to export report definition');
    }
  };

  return (
    <div className={clsx('flex h-full', className)}>
      {/* Sidebar - Section Types */}
      <div className="w-64 bg-white border-r border-surface-200 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-surface-600 mb-2">Add Section</h3>
          <div className="space-y-1">
            {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => addSection(type)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:text-white hover:bg-white rounded-lg transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-surface-200 pt-4">
          <h3 className="text-sm font-medium text-surface-600 mb-2">Report Settings</h3>
          <Input
            type="text"
            value={config.name}
            onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Report Name"
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500"
          />
          <Textarea
            value={config.description || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full mt-2 px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm focus:outline-none focus:border-brand-500 resize-none"
          />
        </div>

        <div className="border-t border-surface-200 pt-4 space-y-2">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-surface-200 text-white rounded-lg text-sm transition-colors"
          >
            <EyeIcon className="w-4 h-4" />
            {isPreviewMode ? 'Edit Mode' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm transition-colors"
          >
            Save Report
          </button>
        </div>
      </div>
      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{config.name}</h1>
              {config.description && <p className="text-surface-600 mt-1">{config.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-200 text-white rounded-lg text-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-surface-200 text-white rounded-lg text-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Sections */}
          {config.sections.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-surface-200 rounded-xl">
              <SparklesIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-surface-600 mb-2">
                Start Building Your Report
              </h3>
              <p className="text-sm text-surface-500 mb-4">
                Add sections from the sidebar to create your custom report
              </p>
              <button
                onClick={() => addSection('heading')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Add First Section
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {config.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  isSelected={selectedSection === section.id}
                  isFirst={index === 0}
                  isLast={index === config.sections.length - 1}
                  isPreview={isPreviewMode}
                  onSelect={() => setSelectedSection(section.id)}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onRemove={() => removeSection(section.id)}
                  onMoveUp={() => moveSection(section.id, 'up')}
                  onMoveDown={() => moveSection(section.id, 'down')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Right Sidebar - Section Config */}
      {selectedSection && !isPreviewMode && (
        <SectionConfigPanel
          section={config.sections.find((s) => s.id === selectedSection)!}
          onUpdate={(updates) => updateSection(selectedSection, updates)}
          onClose={() => setSelectedSection(null)}
        />
      )}
    </div>
  );
}

// ===========================================
// Section Editor Component
// ===========================================

interface SectionEditorProps {
  section: ReportSection;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  isPreview: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ReportSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionEditor({
  section,
  isSelected,
  isFirst,
  isLast,
  isPreview,
  onSelect,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SectionEditorProps) {
  if (isPreview) {
    return <SectionPreview section={section} />;
  }

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative p-4 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-brand-500 bg-brand-500/5'
          : 'border-surface-200 hover:border-surface-300 bg-white/50'
      )}
    >
      {/* Controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          disabled={isFirst}
          className="p-1 text-surface-600 hover:text-white disabled:opacity-30"
        >
          <ChevronUpIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          disabled={isLast}
          className="p-1 text-surface-600 hover:text-white disabled:opacity-30"
        >
          <ChevronDownIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-red-600 hover:text-red-700"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
      {/* Section Content */}
      {section.type === 'heading' && (
        <Input
          type="text"
          value={section.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="text-xl font-semibold text-white bg-transparent border-none focus:outline-none w-full"
          placeholder="Section Title"
        />
      )}
      {section.type === 'text' && (
        <Textarea
          value={section.content || ''}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={3}
          className="w-full text-surface-700 bg-transparent border-none focus:outline-none resize-none"
          placeholder="Enter text content..."
        />
      )}
      {section.type === 'table' && (
        <div className="text-sm text-surface-600">
          <div className="flex items-center gap-2 mb-2">
            <TableCellsIcon className="w-4 h-4" />
            <span>Data Table: {DATA_SOURCES[section.dataSource || 'controls'].label}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(section.fields || []).map((field) => (
              <span key={field} className="px-2 py-0.5 bg-surface-200 rounded text-xs">
                {field}
              </span>
            ))}
          </div>
        </div>
      )}
      {section.type === 'chart' && (
        <div className="text-sm text-surface-600">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            <span>
              {section.chartType?.toUpperCase() || 'Bar'} Chart:{' '}
              {DATA_SOURCES[section.dataSource || 'controls'].label}
            </span>
          </div>
        </div>
      )}
      {section.type === 'summary' && (
        <div className="text-sm text-surface-600">
          <div className="flex items-center gap-2">
            <Squares2X2Icon className="w-4 h-4" />
            <span>Summary Stats: {DATA_SOURCES[section.dataSource || 'controls'].label}</span>
          </div>
        </div>
      )}
      {section.type === 'divider' && <div className="border-t border-surface-300 my-2" />}
    </div>
  );
}

// ===========================================
// Section Preview Component
// ===========================================

function SectionPreview({ section }: { section: ReportSection }) {
  if (section.type === 'heading') {
    return <h2 className="text-xl font-semibold text-white">{section.title}</h2>;
  }

  if (section.type === 'text') {
    return <p className="text-surface-700">{section.content}</p>;
  }

  if (section.type === 'divider') {
    return <hr className="border-surface-200" />;
  }

  // Placeholder for dynamic content
  return (
    <div className="p-4 bg-white/50 rounded-lg border border-surface-200">
      <p className="text-sm text-surface-600">
        [Preview: {section.type} from {section.dataSource}]
      </p>
    </div>
  );
}

// ===========================================
// Section Config Panel Component
// ===========================================

interface SectionConfigPanelProps {
  section: ReportSection;
  onUpdate: (updates: Partial<ReportSection>) => void;
  onClose: () => void;
}

function SectionConfigPanel({ section, onUpdate, onClose }: SectionConfigPanelProps) {
  const showDataConfig = ['table', 'chart', 'summary'].includes(section.type);

  return (
    <div className="w-80 bg-white border-l border-surface-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">Section Settings</h3>
        <button onClick={onClose} className="text-surface-600 hover:text-white">
          ×
        </button>
      </div>
      <div className="space-y-4">
        {section.type === 'heading' && (
          <div>
            <label className="block text-sm text-surface-600 mb-1">Title</label>
            <Input
              type="text"
              value={section.title || ''}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
            />
          </div>
        )}

        {section.type === 'text' && (
          <div>
            <label className="block text-sm text-surface-600 mb-1">Content</label>
            <Textarea
              value={section.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm resize-none"
            />
          </div>
        )}

        {showDataConfig && (
          <>
            <div>
              <label className="block text-sm text-surface-600 mb-1">Data Source</label>
              <SelectNative
                value={section.dataSource || 'controls'}
                onChange={(e) => onUpdate({ dataSource: e.target.value as DataSource })}
                className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
              >
                {Object.entries(DATA_SOURCES).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm text-surface-600 mb-1">Fields</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {DATA_SOURCES[section.dataSource || 'controls'].fields.map((field) => (
                  <label key={field} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(section.fields || []).includes(field)}
                      onChange={(e) => {
                        const fields = section.fields || [];
                        onUpdate({
                          fields: e.target.checked
                            ? [...fields, field]
                            : fields.filter((f) => f !== field),
                        });
                      }}
                      className="rounded border-surface-300 bg-white text-brand-500"
                    />
                    <span className="text-surface-700">{field}</span>
                  </label>
                ))}
              </div>
            </div>

            {section.type === 'chart' && (
              <div>
                <label className="block text-sm text-surface-600 mb-1">Chart Type</label>
                <SelectNative
                  value={section.chartType || 'bar'}
                  onChange={(e) => onUpdate({ chartType: e.target.value as ChartType })}
                  className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="donut">Donut Chart</option>
                </SelectNative>
              </div>
            )}

            <div>
              <label className="block text-sm text-surface-600 mb-1">Group By</label>
              <SelectNative
                value={section.groupBy || ''}
                onChange={(e) => onUpdate({ groupBy: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
              >
                <option value="">No grouping</option>
                {DATA_SOURCES[section.dataSource || 'controls'].fields.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <label className="block text-sm text-surface-600 mb-1">Sort By</label>
              <div className="flex gap-2">
                <SelectNative
                  value={section.sortBy || ''}
                  onChange={(e) => onUpdate({ sortBy: e.target.value || undefined })}
                  className="flex-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
                >
                  <option value="">Default</option>
                  {DATA_SOURCES[section.dataSource || 'controls'].fields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </SelectNative>
                <SelectNative
                  value={section.sortOrder || 'asc'}
                  onChange={(e) => onUpdate({ sortOrder: e.target.value as 'asc' | 'desc' })}
                  className="w-20 px-2 py-2 bg-white border border-surface-200 rounded-lg text-white text-sm"
                >
                  <option value="asc">↑</option>
                  <option value="desc">↓</option>
                </SelectNative>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
