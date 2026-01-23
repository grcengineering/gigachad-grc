import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ReportBuilder, { ReportConfig } from '@/components/reports/ReportBuilder';
import { Modal } from '@/components/Modal';
import { format } from 'date-fns';
import { customReportsApi } from '@/lib/api';

// Use the API from lib/api.ts which has proper backend support with localStorage fallback

// ===========================================
// Report Templates
// ===========================================

const REPORT_TEMPLATES: ReportConfig[] = [
  {
    name: 'Compliance Summary Report',
    description: 'Overview of compliance status across all frameworks',
    sections: [
      { id: '1', type: 'heading', title: 'Executive Summary' },
      { id: '2', type: 'text', content: 'This report provides an overview of the organization\'s compliance posture.' },
      { id: '3', type: 'summary', dataSource: 'controls', fields: ['status'] },
      { id: '4', type: 'heading', title: 'Control Status by Category' },
      { id: '5', type: 'chart', dataSource: 'controls', chartType: 'bar', groupBy: 'category' },
      { id: '6', type: 'heading', title: 'Detailed Control List' },
      { id: '7', type: 'table', dataSource: 'controls', fields: ['title', 'status', 'category', 'owner'] },
    ],
  },
  {
    name: 'Risk Assessment Report',
    description: 'Comprehensive risk assessment with heat map and treatment plans',
    sections: [
      { id: '1', type: 'heading', title: 'Risk Overview' },
      { id: '2', type: 'summary', dataSource: 'risks', fields: ['riskLevel'] },
      { id: '3', type: 'heading', title: 'Risks by Category' },
      { id: '4', type: 'chart', dataSource: 'risks', chartType: 'pie', groupBy: 'category' },
      { id: '5', type: 'heading', title: 'Risk Register' },
      { id: '6', type: 'table', dataSource: 'risks', fields: ['title', 'riskLevel', 'likelihood', 'impact', 'owner'] },
    ],
  },
  {
    name: 'Vendor Risk Report',
    description: 'Third-party vendor risk assessment summary',
    sections: [
      { id: '1', type: 'heading', title: 'Vendor Risk Summary' },
      { id: '2', type: 'summary', dataSource: 'vendors', fields: ['riskTier', 'status'] },
      { id: '3', type: 'chart', dataSource: 'vendors', chartType: 'donut', groupBy: 'riskTier' },
      { id: '4', type: 'heading', title: 'Vendor List' },
      { id: '5', type: 'table', dataSource: 'vendors', fields: ['name', 'category', 'riskTier', 'status'] },
    ],
  },
];

// ===========================================
// Main Page Component
// ===========================================

export default function ReportBuilderPage() {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const queryClient = useQueryClient();
  const [showTemplates, setShowTemplates] = useState(false);

  const isEditing = !!reportId;

  // Fetch reports list
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['custom-reports'],
    queryFn: customReportsApi.list,
  });

  // Fetch single report for editing
  const { data: editingReport } = useQuery({
    queryKey: ['custom-report', reportId],
    queryFn: () => customReportsApi.get(reportId!),
    enabled: isEditing,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: customReportsApi.save,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report saved');
      navigate(`/reports/builder/${saved.id}`);
    },
    onError: () => {
      toast.error('Failed to save report');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: customReportsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report deleted');
    },
    onError: () => {
      toast.error('Failed to delete report');
    },
  });

  // Create from template
  const createFromTemplate = (template: ReportConfig) => {
    const newReport: ReportConfig = {
      ...template,
      id: undefined,
      name: `${template.name} (Copy)`,
      sections: template.sections.map(s => ({
        ...s,
        id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
    };
    saveMutation.mutate(newReport);
    setShowTemplates(false);
  };

  // Show builder if editing
  if (isEditing) {
    return (
      <div className="h-[calc(100vh-64px)]">
        <ReportBuilder
          initialConfig={editingReport as ReportConfig | undefined}
          onSave={config => saveMutation.mutate(config)}
        />
      </div>
    );
  }

  // Show reports list
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Report Builder</h1>
          <p className="text-surface-400 mt-1">Create custom reports with your data</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors"
          >
            <FolderIcon className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => saveMutation.mutate({ name: 'New Report', sections: [] })}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-surface-800/50 rounded-xl border border-surface-700">
          <DocumentTextIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Custom Reports Yet</h3>
          <p className="text-surface-400 mb-4">
            Create your first custom report or start from a template
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowTemplates(true)}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
            >
              Browse Templates
            </button>
            <button
              onClick={() => saveMutation.mutate({ name: 'New Report', sections: [] })}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              Create Blank Report
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(report => (
            <div
              key={report.id}
              className="p-5 bg-surface-800 rounded-xl border border-surface-700 hover:border-surface-600 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-500/20 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigate(`/reports/builder/${report.id}`)}
                    className="p-1.5 text-surface-400 hover:text-white rounded-lg hover:bg-surface-700"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this report?')) {
                        deleteMutation.mutate(report.id!);
                      }
                    }}
                    className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-surface-700"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-medium text-white mb-1">{report.name}</h3>
              {report.description && (
                <p className="text-sm text-surface-400 mb-3 line-clamp-2">{report.description}</p>
              )}
              
              <div className="flex items-center justify-between text-xs text-surface-500">
                <span>{report.sections.length} sections</span>
                {report.updatedAt && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {format(new Date(report.updatedAt), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Templates Modal */}
      <Modal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        title="Report Templates"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-surface-400">
            Start with a pre-built template and customize it to your needs.
          </p>
          <div className="grid gap-4">
            {REPORT_TEMPLATES.map((template, i) => (
              <button
                key={i}
                onClick={() => createFromTemplate(template)}
                className="p-4 text-left bg-surface-800 hover:bg-surface-700 rounded-lg border border-surface-700 hover:border-surface-600 transition-colors"
              >
                <h4 className="font-medium text-white mb-1">{template.name}</h4>
                <p className="text-sm text-surface-400">{template.description}</p>
                <p className="text-xs text-surface-500 mt-2">
                  {template.sections.length} sections
                </p>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

