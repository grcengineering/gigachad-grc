import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { risksApi } from '../lib/api';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';

type ReportType = 'risk-register' | 'risk-summary' | 'treatment-status' | 'risk-trends' | 'executive-summary';

interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'risk-register',
    name: 'Full Risk Register',
    description: 'Complete list of all risks with details, scores, and treatment status',
    icon: TableCellsIcon,
    fields: ['riskId', 'title', 'category', 'status', 'likelihood', 'impact', 'inherentRisk', 'treatmentPlan', 'owner'],
  },
  {
    id: 'risk-summary',
    name: 'Risk Summary',
    description: 'High-level overview of risks by category and risk level',
    icon: ChartBarIcon,
    fields: ['category', 'riskLevel', 'count', 'percentageOfTotal'],
  },
  {
    id: 'treatment-status',
    name: 'Treatment Status Report',
    description: 'Progress on risk treatments and mitigation activities',
    icon: DocumentTextIcon,
    fields: ['riskId', 'title', 'treatmentPlan', 'treatmentStatus', 'dueDate', 'owner', 'progress'],
  },
  {
    id: 'risk-trends',
    name: 'Risk Trend Analysis',
    description: 'Historical trends in risk identification, treatment, and closure',
    icon: PresentationChartLineIcon,
    fields: ['period', 'newRisks', 'closedRisks', 'openRisks', 'avgRiskScore'],
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'Board-ready summary with key metrics and top risks',
    icon: DocumentChartBarIcon,
    fields: ['keyMetrics', 'topRisks', 'riskAppetite', 'recommendations'],
  },
];

export default function RiskReports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({
    category: '',
    riskLevel: '',
    status: '',
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  // Fetch dashboard data for preview
  const { data: dashboardData } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Fetch risks for the selected report
  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', 'report', filters],
    queryFn: async () => {
      const response = await risksApi.list({ ...filters, limit: 1000 });
      return response.data;
    },
    enabled: !!selectedReport,
  });

  const handleExport = () => {
    // In a real app, this would call the backend to generate the report
    alert(`Exporting ${selectedReport} report as ${exportFormat.toUpperCase()}...`);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-surface-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Risk Reports</h1>
          <p className="text-surface-400 mt-1">Generate and export risk reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Templates */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-medium text-white">Report Templates</h2>
          <div className="space-y-2">
            {reportTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => setSelectedReport(template.id)}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  selectedReport === template.id
                    ? 'bg-brand-500/20 border-brand-500'
                    : 'bg-surface-800 border-surface-700 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedReport === template.id ? 'bg-brand-500/30' : 'bg-surface-700'}`}>
                    <template.icon className={`w-5 h-5 ${selectedReport === template.id ? 'text-brand-400' : 'text-surface-400'}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium">{template.name}</p>
                    <p className="text-surface-400 text-sm">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Configuration & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {selectedReport ? (
            <>
              {/* Configuration */}
              <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
                <h3 className="text-lg font-medium text-white mb-4">Report Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-2">
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-2">
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-surface-400 mb-2">
                      <FunnelIcon className="w-4 h-4 inline mr-1" />
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    >
                      <option value="">All Categories</option>
                      <option value="security">Security</option>
                      <option value="compliance">Compliance</option>
                      <option value="operational">Operational</option>
                      <option value="financial">Financial</option>
                      <option value="strategic">Strategic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-2">Risk Level</label>
                    <select
                      value={filters.riskLevel}
                      onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    >
                      <option value="">All Levels</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-surface-400 mb-2">Status</label>
                    <select
                      value={filters.status}
                      onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    >
                      <option value="">All Statuses</option>
                      <option value="open">Open</option>
                      <option value="in_treatment">In Treatment</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-surface-700">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-surface-400">Export Format:</span>
                    <div className="flex gap-2">
                      {(['pdf', 'excel', 'csv'] as const).map(format => (
                        <button
                          key={format}
                          onClick={() => setExportFormat(format)}
                          className={`px-3 py-1 rounded text-sm ${
                            exportFormat === format
                              ? 'bg-brand-500 text-white'
                              : 'bg-surface-700 text-surface-300 hover:bg-surface-600'
                          }`}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Export Report
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
                <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
                
                {isLoading ? (
                  <div className="text-center py-8 text-surface-400">Loading preview...</div>
                ) : (
                  <div className="space-y-4">
                    {selectedReport === 'executive-summary' && (
                      <ExecutiveSummaryPreview data={dashboardData} />
                    )}
                    {selectedReport === 'risk-register' && (
                      <RiskRegisterPreview risks={risksData?.risks || []} />
                    )}
                    {selectedReport === 'risk-summary' && (
                      <RiskSummaryPreview data={dashboardData} />
                    )}
                    {selectedReport === 'treatment-status' && (
                      <TreatmentStatusPreview risks={risksData?.risks || []} />
                    )}
                    {selectedReport === 'risk-trends' && (
                      <RiskTrendsPreview />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-12 text-center">
              <DocumentChartBarIcon className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <p className="text-surface-400">Select a report template to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Preview Components
function ExecutiveSummaryPreview({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-surface-700 rounded-lg text-center">
          <p className="text-2xl font-bold text-white">{data?.totalRisks || 0}</p>
          <p className="text-surface-400 text-sm">Total Risks</p>
        </div>
        <div className="p-4 bg-surface-700 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-400">{data?.openRisks || 0}</p>
          <p className="text-surface-400 text-sm">Open</p>
        </div>
        <div className="p-4 bg-surface-700 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-400">{data?.inTreatment || 0}</p>
          <p className="text-surface-400 text-sm">In Treatment</p>
        </div>
        <div className="p-4 bg-surface-700 rounded-lg text-center">
          <p className="text-2xl font-bold text-emerald-400">{data?.mitigatedThisMonth || 0}</p>
          <p className="text-surface-400 text-sm">Mitigated</p>
        </div>
      </div>
      <p className="text-surface-500 text-sm italic">Full executive summary will include charts, top risks, and recommendations</p>
    </div>
  );
}

function RiskRegisterPreview({ risks }: { risks: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-surface-400 border-b border-surface-700">
            <th className="pb-2">Risk ID</th>
            <th className="pb-2">Title</th>
            <th className="pb-2">Category</th>
            <th className="pb-2">Risk Level</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {risks.slice(0, 5).map((risk: any) => (
            <tr key={risk.id} className="border-b border-surface-700/50">
              <td className="py-2 text-brand-400 font-mono">{risk.riskId}</td>
              <td className="py-2 text-white">{risk.title}</td>
              <td className="py-2 text-surface-300 capitalize">{risk.category}</td>
              <td className="py-2">
                <span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${
                  risk.inherentRisk === 'critical' ? 'bg-red-500' :
                  risk.inherentRisk === 'high' ? 'bg-orange-500' :
                  risk.inherentRisk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  {risk.inherentRisk}
                </span>
              </td>
              <td className="py-2 text-surface-300 capitalize">{risk.status?.replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {risks.length > 5 && (
        <p className="text-surface-500 text-sm mt-2">... and {risks.length - 5} more rows</p>
      )}
    </div>
  );
}

function RiskSummaryPreview({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <h4 className="text-white font-medium">By Risk Level</h4>
      <div className="grid grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map(level => (
          <div key={level} className="p-3 bg-surface-700 rounded-lg">
            <p className="text-lg font-bold text-white">
              {data?.byRiskLevel?.find((r: any) => r.level === level)?.count || 0}
            </p>
            <p className="text-surface-400 text-sm capitalize">{level}</p>
          </div>
        ))}
      </div>
      <h4 className="text-white font-medium mt-4">By Category</h4>
      <div className="space-y-2">
        {(data?.byCategory || []).slice(0, 4).map((cat: any) => (
          <div key={cat.category} className="flex justify-between items-center">
            <span className="text-surface-300 capitalize">{cat.category}</span>
            <span className="text-white font-medium">{cat.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentStatusPreview({ risks }: { risks: any[] }) {
  const inTreatment = risks.filter((r: any) => r.treatmentPlan);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-surface-700 rounded-lg text-center">
          <p className="text-lg font-bold text-white">{inTreatment.filter((r: any) => r.treatmentPlan === 'mitigate').length}</p>
          <p className="text-surface-400 text-xs">Mitigating</p>
        </div>
        <div className="p-3 bg-surface-700 rounded-lg text-center">
          <p className="text-lg font-bold text-white">{inTreatment.filter((r: any) => r.treatmentPlan === 'accept').length}</p>
          <p className="text-surface-400 text-xs">Accepting</p>
        </div>
        <div className="p-3 bg-surface-700 rounded-lg text-center">
          <p className="text-lg font-bold text-white">{inTreatment.filter((r: any) => r.treatmentPlan === 'transfer').length}</p>
          <p className="text-surface-400 text-xs">Transferring</p>
        </div>
        <div className="p-3 bg-surface-700 rounded-lg text-center">
          <p className="text-lg font-bold text-white">{inTreatment.filter((r: any) => r.treatmentPlan === 'avoid').length}</p>
          <p className="text-surface-400 text-xs">Avoiding</p>
        </div>
      </div>
      <p className="text-surface-500 text-sm italic">Full report includes due dates, progress, and owner details</p>
    </div>
  );
}

function RiskTrendsPreview() {
  return (
    <div className="space-y-4">
      <div className="h-32 bg-surface-700 rounded-lg flex items-center justify-center">
        <p className="text-surface-400">Trend chart visualization will appear here</p>
      </div>
      <p className="text-surface-500 text-sm italic">Shows risk trends over selected time period</p>
    </div>
  );
}



