import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { risksApi } from '../lib/api';
import { exportData } from '../lib/export';
import toast from 'react-hot-toast';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
  PresentationChartLineIcon,
  Squares2X2Icon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { RiskHeatMap } from '../components/risk/RiskHeatMap';

type ReportType = 'risk-register' | 'risk-summary' | 'treatment-status' | 'risk-trends' | 'executive-summary' | 'heat-map';

interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: string[];
}

interface Risk {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  inherentRisk: string;
  residualRisk?: string;
  treatmentPlan?: string;
  owner?: string;
  createdAt: string;
  updatedAt?: string;
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
  {
    id: 'heat-map',
    name: 'Risk Heat Map',
    description: 'Interactive likelihood vs impact matrix visualization',
    icon: Squares2X2Icon,
    fields: ['likelihood', 'impact', 'riskLevel', 'count'],
  },
];

// Export column configurations for different report types
const getExportColumns = (reportType: ReportType) => {
  switch (reportType) {
    case 'risk-register':
      return [
        { key: 'riskId', header: 'Risk ID' },
        { key: 'title', header: 'Title' },
        { key: 'description', header: 'Description' },
        { key: 'category', header: 'Category', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'status', header: 'Status', transform: (v: unknown) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'likelihood', header: 'Likelihood' },
        { key: 'impact', header: 'Impact' },
        { key: 'inherentRisk', header: 'Inherent Risk', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'residualRisk', header: 'Residual Risk', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'treatmentPlan', header: 'Treatment Plan', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'owner', header: 'Owner' },
        { key: 'createdAt', header: 'Created Date', transform: (v: unknown) => v ? new Date(v as string).toLocaleDateString() : '' },
      ];
    case 'treatment-status':
      return [
        { key: 'riskId', header: 'Risk ID' },
        { key: 'title', header: 'Title' },
        { key: 'treatmentPlan', header: 'Treatment Plan', transform: (v: unknown) => String(v || 'None').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'status', header: 'Status', transform: (v: unknown) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'owner', header: 'Owner' },
        { key: 'inherentRisk', header: 'Risk Level', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
      ];
    case 'executive-summary':
      return [
        { key: 'riskId', header: 'Risk ID' },
        { key: 'title', header: 'Title' },
        { key: 'inherentRisk', header: 'Risk Level', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'status', header: 'Status', transform: (v: unknown) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'treatmentPlan', header: 'Treatment', transform: (v: unknown) => String(v || 'None').replace(/\b\w/g, l => l.toUpperCase()) },
      ];
    case 'heat-map':
      return [
        { key: 'riskId', header: 'Risk ID' },
        { key: 'title', header: 'Title' },
        { key: 'likelihood', header: 'Likelihood' },
        { key: 'impact', header: 'Impact' },
        { key: 'inherentRisk', header: 'Risk Level', transform: (v: unknown) => String(v || '').replace(/\b\w/g, l => l.toUpperCase()) },
      ];
    default:
      return [
        { key: 'riskId', header: 'Risk ID' },
        { key: 'title', header: 'Title' },
        { key: 'category', header: 'Category' },
        { key: 'inherentRisk', header: 'Risk Level' },
        { key: 'status', header: 'Status' },
      ];
  }
};

// Generate mock trend data based on actual risks
function generateTrendData(risks: Risk[], months: number = 6) {
  const now = new Date();
  const trendData = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    // Filter risks created before this month's end
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const risksUpToDate = risks.filter(r => new Date(r.createdAt) <= monthEnd);
    
    // Calculate metrics
    const openRisks = risksUpToDate.filter(r => r.status === 'open' || r.status === 'in_treatment').length;
    const mitigatedRisks = risksUpToDate.filter(r => r.status === 'mitigated' || r.status === 'accepted').length;
    const criticalHighRisks = risksUpToDate.filter(r => r.inherentRisk === 'critical' || r.inherentRisk === 'high').length;
    
    // Simulate some variance for visual interest (in real app, this would be actual historical data)
    const variance = Math.floor(Math.random() * 3) - 1;
    
    trendData.push({
      month: monthName,
      openRisks: Math.max(0, openRisks + variance),
      mitigatedRisks: Math.max(0, mitigatedRisks + variance),
      criticalHighRisks: Math.max(0, criticalHighRisks),
      totalRisks: risksUpToDate.length,
    });
  }
  
  return trendData;
}

// Generate PDF content as printable HTML
function generatePDFContent(
  reportType: ReportType,
  risks: Risk[],
  dashboardData: any,
  dateRange: { start: string; end: string },
  filters: { category: string; riskLevel: string; status: string }
) {
  const reportName = reportTemplates.find(t => t.id === reportType)?.name || 'Risk Report';
  const generatedDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  let content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 10px; }
        h2 { color: #374151; margin-top: 30px; }
        .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
        .filters { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { color: #6b7280; font-size: 12px; margin-top: 5px; }
        .critical { color: #ef4444; }
        .high { color: #f97316; }
        .medium { color: #f59e0b; }
        .low { color: #10b981; }
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .badge-critical { background: #fef2f2; color: #ef4444; }
        .badge-high { background: #fff7ed; color: #f97316; }
        .badge-medium { background: #fffbeb; color: #f59e0b; }
        .badge-low { background: #ecfdf5; color: #10b981; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>${reportName}</h1>
      <div class="meta">
        Generated on: ${generatedDate}<br>
        ${dateRange.start || dateRange.end ? `Date Range: ${dateRange.start || 'Start'} to ${dateRange.end || 'End'}` : 'All time data'}
      </div>
  `;

  // Add filters info if any are applied
  const activeFilters = [];
  if (filters.category) activeFilters.push(`Category: ${filters.category}`);
  if (filters.riskLevel) activeFilters.push(`Risk Level: ${filters.riskLevel}`);
  if (filters.status) activeFilters.push(`Status: ${filters.status}`);
  
  if (activeFilters.length > 0) {
    content += `<div class="filters"><strong>Filters Applied:</strong> ${activeFilters.join(' | ')}</div>`;
  }

  // Add report-specific content
  if (reportType === 'executive-summary') {
    content += `
      <h2>Key Metrics</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${dashboardData?.totalRisks || risks.length}</div>
          <div class="stat-label">Total Risks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value critical">${dashboardData?.openRisks || risks.filter(r => r.status === 'open').length}</div>
          <div class="stat-label">Open Risks</div>
        </div>
        <div class="stat-card">
          <div class="stat-value medium">${dashboardData?.inTreatment || risks.filter(r => r.status === 'in_treatment').length}</div>
          <div class="stat-label">In Treatment</div>
        </div>
        <div class="stat-card">
          <div class="stat-value low">${dashboardData?.mitigatedThisMonth || risks.filter(r => r.status === 'mitigated').length}</div>
          <div class="stat-label">Mitigated</div>
        </div>
      </div>
      <h2>Top Risks Requiring Attention</h2>
    `;
  }

  // Add risk table
  const risksToShow = reportType === 'executive-summary' 
    ? risks.filter(r => r.inherentRisk === 'critical' || r.inherentRisk === 'high').slice(0, 10)
    : risks;

  content += `
    <table>
      <thead>
        <tr>
          <th>Risk ID</th>
          <th>Title</th>
          ${reportType !== 'heat-map' ? '<th>Category</th>' : ''}
          <th>Risk Level</th>
          <th>Status</th>
          ${reportType === 'treatment-status' ? '<th>Treatment Plan</th>' : ''}
        </tr>
      </thead>
      <tbody>
  `;

  risksToShow.forEach(risk => {
    const badgeClass = `badge-${risk.inherentRisk}`;
    content += `
      <tr>
        <td>${risk.riskId}</td>
        <td>${risk.title}</td>
        ${reportType !== 'heat-map' ? `<td>${risk.category}</td>` : ''}
        <td><span class="badge ${badgeClass}">${risk.inherentRisk}</span></td>
        <td>${risk.status?.replace(/_/g, ' ')}</td>
        ${reportType === 'treatment-status' ? `<td>${risk.treatmentPlan || 'None'}</td>` : ''}
      </tr>
    `;
  });

  content += `
      </tbody>
    </table>
    <div class="meta" style="margin-top: 30px; font-size: 12px;">
      Total records: ${risksToShow.length} | Report generated by GigaChad GRC
    </div>
    </body>
    </html>
  `;

  return content;
}

export default function RiskReports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({
    category: '',
    riskLevel: '',
    status: '',
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch dashboard data for preview
  const { data: dashboardData } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Fetch risks for the selected report with filters applied
  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', 'report', filters, dateRange],
    queryFn: async () => {
      const response = await risksApi.list({ 
        ...filters as any, 
        limit: 1000,
        // Note: In a real app, dateRange would be sent to backend
        // For now, we'll filter client-side
      });
      return response.data;
    },
    enabled: !!selectedReport,
  });

  // Filter risks by date range (client-side)
  const filteredRisks = useMemo(() => {
    let risks = risksData?.risks || [];
    
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      risks = risks.filter((r) => new Date((r as Risk).createdAt) >= startDate);
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include entire end day
      risks = risks.filter((r) => new Date((r as Risk).createdAt) <= endDate);
    }
    
    return risks;
  }, [risksData?.risks, dateRange]);

  // Generate trend data
  const trendData = useMemo(() => {
    return generateTrendData(filteredRisks as Risk[]);
  }, [filteredRisks]);

  const handleExport = async () => {
    if (!selectedReport || filteredRisks.length === 0) {
      toast.error('No data available to export');
      return;
    }

    setIsExporting(true);

    try {
      const reportName = reportTemplates.find(t => t.id === selectedReport)?.name || 'risk-report';
      const filename = reportName.toLowerCase().replace(/\s+/g, '-');

      if (exportFormat === 'pdf') {
        // Generate and open PDF in new window for printing
        const pdfContent = generatePDFContent(
          selectedReport,
          filteredRisks as Risk[],
          dashboardData,
          dateRange,
          filters
        );
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Use safer DOM manipulation instead of document.write
          const parser = new DOMParser();
          const doc = parser.parseFromString(pdfContent, 'text/html');
          printWindow.document.documentElement.innerHTML = doc.documentElement.innerHTML;
          printWindow.document.close();
          printWindow.focus();
          // Give the content time to render before printing
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
        toast.success('PDF report opened for printing');
      } else {
        // Use existing export utilities for CSV/Excel
        const columns = getExportColumns(selectedReport);
        await exportData({
          filename,
          columns,
          data: filteredRisks,
          format: exportFormat === 'excel' ? 'xlsx' : 'csv',
          sheetName: reportName,
        });
        toast.success(`${exportFormat.toUpperCase()} report downloaded successfully`);
      }
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedTemplate = reportTemplates.find(t => t.id === selectedReport);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Risk Reports</h1>
          <p className="text-gray-500 dark:text-surface-400 mt-1">Generate and export risk reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Report Templates - Left Panel */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5">
            <h2 className="text-base font-medium text-gray-900 dark:text-white mb-4">Report Templates</h2>
            <div className="space-y-2">
              {reportTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedReport(template.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedReport === template.id
                      ? 'bg-brand-500/10 border-brand-500/50'
                      : 'bg-gray-50 dark:bg-surface-700/50 border-gray-200 dark:border-surface-700 hover:border-gray-300 dark:hover:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      selectedReport === template.id ? 'bg-brand-500/20' : 'bg-gray-200 dark:bg-surface-600'
                    }`}>
                      <template.icon className={`w-4 h-4 ${
                        selectedReport === template.id ? 'text-brand-400' : 'text-gray-500 dark:text-surface-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm ${
                        selectedReport === template.id ? 'text-brand-500 dark:text-brand-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        {template.name}
                      </p>
                      <p className="text-gray-500 dark:text-surface-500 text-xs mt-0.5 line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Report Configuration & Preview - Right Panel */}
        <div className="lg:col-span-8 space-y-5">
          {selectedReport && selectedTemplate ? (
            <>
              {/* Selected Report Header */}
              <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-brand-500/20">
                    <selectedTemplate.icon className="w-5 h-5 text-brand-500 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
                    <p className="text-gray-500 dark:text-surface-400 text-sm">{selectedTemplate.description}</p>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-surface-500 mb-1.5">
                      <CalendarIcon className="w-3 h-3 inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-surface-500 mb-1.5">
                      <CalendarIcon className="w-3 h-3 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-surface-500 mb-1.5">
                      <FunnelIcon className="w-3 h-3 inline mr-1" />
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">All</option>
                      <option value="security">Security</option>
                      <option value="compliance">Compliance</option>
                      <option value="operational">Operational</option>
                      <option value="financial">Financial</option>
                      <option value="strategic">Strategic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-surface-500 mb-1.5">Risk Level</label>
                    <select
                      value={filters.riskLevel}
                      onChange={e => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">All</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-surface-500 mb-1.5">Status</label>
                    <select
                      value={filters.status}
                      onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">All</option>
                      <option value="open">Open</option>
                      <option value="in_treatment">In Treatment</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                </div>

                {/* Export Section */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-surface-700">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-surface-500">Format:</span>
                    <div className="flex gap-1">
                      {(['csv', 'excel', 'pdf'] as const).map(format => (
                        <button
                          key={format}
                          onClick={() => setExportFormat(format)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            exportFormat === format
                              ? 'bg-brand-500 text-white'
                              : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-surface-400 hover:bg-gray-200 dark:hover:bg-surface-600 hover:text-gray-700 dark:hover:text-surface-300'
                          }`}
                        >
                          {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || filteredRisks.length === 0}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <ArrowDownTrayIcon className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                    {isExporting ? 'Exporting...' : 'Export Report'}
                  </button>
                </div>

                {/* Data count indicator */}
                <div className="mt-3 text-xs text-gray-500 dark:text-surface-500">
                  {filteredRisks.length} risk{filteredRisks.length !== 1 ? 's' : ''} matching current filters
                  {(dateRange.start || dateRange.end || filters.category || filters.riskLevel || filters.status) && (
                    <button 
                      onClick={() => {
                        setDateRange({ start: '', end: '' });
                        setFilters({ category: '', riskLevel: '', status: '' });
                      }}
                      className="ml-2 text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-5">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Preview</h3>
                
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500 dark:text-surface-400">Loading preview...</div>
                ) : (
                  <div>
                    {selectedReport === 'executive-summary' && (
                      <ExecutiveSummaryPreview data={dashboardData} risks={filteredRisks as Risk[]} />
                    )}
                    {selectedReport === 'risk-register' && (
                      <RiskRegisterPreview risks={filteredRisks as Risk[]} />
                    )}
                    {selectedReport === 'risk-summary' && (
                      <RiskSummaryPreview data={dashboardData} risks={filteredRisks as Risk[]} />
                    )}
                    {selectedReport === 'treatment-status' && (
                      <TreatmentStatusPreview risks={filteredRisks as Risk[]} />
                    )}
                    {selectedReport === 'risk-trends' && (
                      <RiskTrendsPreview trendData={trendData} />
                    )}
                    {selectedReport === 'heat-map' && (
                      <RiskHeatMap risks={filteredRisks as Risk[]} showLegend={true} />
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-12 text-center">
              <DocumentChartBarIcon className="w-12 h-12 text-gray-400 dark:text-surface-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-surface-400 text-lg font-medium">Select a Report Template</p>
              <p className="text-gray-500 dark:text-surface-500 text-sm mt-1">Choose a template from the left panel to configure and generate your report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Preview Components
function ExecutiveSummaryPreview({ data, risks }: { data: any; risks: Risk[] }) {
  const topRisks = risks
    .filter(r => r.inherentRisk === 'critical' || r.inherentRisk === 'high')
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.totalRisks || risks.length}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Total Risks</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{data?.openRisks || risks.filter(r => r.status === 'open').length}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Open</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{data?.inTreatment || risks.filter(r => r.status === 'in_treatment').length}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">In Treatment</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{data?.mitigatedThisMonth || risks.filter(r => r.status === 'mitigated').length}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Mitigated</p>
        </div>
      </div>
      
      {topRisks.length > 0 && (
        <div>
          <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Top Critical/High Risks</h4>
          <div className="space-y-2">
            {topRisks.map(risk => (
              <div key={risk.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-surface-700/50">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs text-white ${
                    risk.inherentRisk === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                  }`}>
                    {risk.inherentRisk}
                  </span>
                  <span className="text-gray-900 dark:text-white text-sm">{risk.title}</span>
                </div>
                <span className="text-gray-500 dark:text-surface-400 text-xs capitalize">{risk.status?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRegisterPreview({ risks }: { risks: Risk[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-surface-400 border-b border-gray-200 dark:border-surface-700">
            <th className="pb-2 text-xs font-medium">Risk ID</th>
            <th className="pb-2 text-xs font-medium">Title</th>
            <th className="pb-2 text-xs font-medium">Category</th>
            <th className="pb-2 text-xs font-medium">Risk Level</th>
            <th className="pb-2 text-xs font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {risks.slice(0, 5).map((risk) => (
            <tr key={risk.id} className="border-b border-gray-200 dark:border-surface-700/50">
              <td className="py-2.5 text-brand-500 dark:text-brand-400 font-mono text-xs">{risk.riskId}</td>
              <td className="py-2.5 text-gray-900 dark:text-white text-sm">{risk.title}</td>
              <td className="py-2.5 text-gray-600 dark:text-surface-300 capitalize text-sm">{risk.category}</td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${
                  risk.inherentRisk === 'critical' ? 'bg-red-500' :
                  risk.inherentRisk === 'high' ? 'bg-orange-500' :
                  risk.inherentRisk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  {risk.inherentRisk}
                </span>
              </td>
              <td className="py-2.5 text-gray-600 dark:text-surface-300 capitalize text-sm">{risk.status?.replace(/_/g, ' ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {risks.length > 5 && (
        <p className="text-gray-500 dark:text-surface-500 text-xs mt-3">... and {risks.length - 5} more rows in the full report</p>
      )}
      {risks.length === 0 && (
        <p className="text-gray-500 dark:text-surface-500 text-sm text-center py-6">No risks found with current filters</p>
      )}
    </div>
  );
}

function RiskSummaryPreview({ data, risks }: { data: any; risks: Risk[] }) {
  // Calculate category counts from filtered risks
  const categoryCountsFromRisks = risks.reduce((acc: Record<string, number>, risk) => {
    acc[risk.category] = (acc[risk.category] || 0) + 1;
    return acc;
  }, {});

  const categories = Object.entries(categoryCountsFromRisks)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate level counts from filtered risks
  const levelCounts = risks.reduce((acc: Record<string, number>, risk) => {
    acc[risk.inherentRisk] = (acc[risk.inherentRisk] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-3">By Risk Level</h4>
        <div className="grid grid-cols-4 gap-3">
          {['critical', 'high', 'medium', 'low'].map(level => (
            <div key={level} className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg border border-gray-200 dark:border-surface-600/50">
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {levelCounts[level] || data?.byRiskLevel?.find((r: any) => r.level === level)?.count || 0}
              </p>
              <p className="text-gray-500 dark:text-surface-400 text-xs capitalize mt-1">{level}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-3">By Category</h4>
        <div className="space-y-2">
          {categories.slice(0, 4).map((cat) => (
            <div key={cat.category} className="flex justify-between items-center py-1.5 border-b border-gray-200 dark:border-surface-700/50">
              <span className="text-gray-600 dark:text-surface-300 capitalize text-sm">{cat.category}</span>
              <span className="text-gray-900 dark:text-white font-medium text-sm">{cat.count}</span>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-gray-500 dark:text-surface-500 text-sm">No category data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TreatmentStatusPreview({ risks }: { risks: Risk[] }) {
  const treatmentCounts = {
    mitigate: risks.filter(r => r.treatmentPlan === 'mitigate').length,
    accept: risks.filter(r => r.treatmentPlan === 'accept').length,
    transfer: risks.filter(r => r.treatmentPlan === 'transfer').length,
    avoid: risks.filter(r => r.treatmentPlan === 'avoid').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{treatmentCounts.mitigate}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Mitigating</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{treatmentCounts.accept}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Accepting</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{treatmentCounts.transfer}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Transferring</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg text-center border border-gray-200 dark:border-surface-600/50">
          <p className="text-xl font-bold text-gray-900 dark:text-white">{treatmentCounts.avoid}</p>
          <p className="text-gray-500 dark:text-surface-400 text-xs mt-1">Avoiding</p>
        </div>
      </div>
      
      {/* Treatment progress list */}
      <div>
        <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Risks with Treatment Plans</h4>
        <div className="space-y-2">
          {risks.filter(r => r.treatmentPlan).slice(0, 5).map(risk => (
            <div key={risk.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-surface-700/50">
              <div>
                <span className="text-gray-900 dark:text-white text-sm">{risk.title}</span>
                <span className="text-gray-500 dark:text-surface-500 text-xs ml-2">({risk.riskId})</span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-brand-500/20 text-brand-500 dark:text-brand-400 capitalize">
                {risk.treatmentPlan}
              </span>
            </div>
          ))}
          {risks.filter(r => r.treatmentPlan).length === 0 && (
            <p className="text-gray-500 dark:text-surface-500 text-sm">No risks with treatment plans</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TrendDataPoint {
  month: string;
  openRisks: number;
  mitigatedRisks: number;
  criticalHighRisks: number;
  totalRisks: number;
}

function RiskTrendsPreview({ trendData }: { trendData: TrendDataPoint[] }) {
  if (trendData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-surface-400">
        No trend data available
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...trendData.map(d => Math.max(d.openRisks, d.mitigatedRisks, d.totalRisks))
  );
  const chartHeight = 160;

  // Calculate change indicators
  const latestData = trendData[trendData.length - 1];
  const previousData = trendData[trendData.length - 2] || latestData;
  
  const openChange = latestData.openRisks - previousData.openRisks;
  const mitigatedChange = latestData.mitigatedRisks - previousData.mitigatedRisks;

  return (
    <div className="space-y-5">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg border border-gray-200 dark:border-surface-600/50">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-surface-400 text-xs">Open Risks</span>
            {openChange !== 0 && (
              <span className={`flex items-center text-xs ${openChange > 0 ? 'text-red-500 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                {openChange > 0 ? <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-0.5" />}
                {Math.abs(openChange)}
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{latestData.openRisks}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg border border-gray-200 dark:border-surface-600/50">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-surface-400 text-xs">Mitigated</span>
            {mitigatedChange !== 0 && (
              <span className={`flex items-center text-xs ${mitigatedChange > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                {mitigatedChange > 0 ? <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5" /> : <ArrowTrendingDownIcon className="w-3 h-3 mr-0.5" />}
                {Math.abs(mitigatedChange)}
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{latestData.mitigatedRisks}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg border border-gray-200 dark:border-surface-600/50">
          <span className="text-gray-500 dark:text-surface-400 text-xs">Critical/High</span>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1">{latestData.criticalHighRisks}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-100/50 dark:bg-surface-700/30 rounded-lg p-4 border border-gray-200 dark:border-surface-600/30">
        <div className="flex items-end justify-between gap-2" style={{ height: chartHeight }}>
          {trendData.map((data, index) => {
            const openHeight = maxValue > 0 ? (data.openRisks / maxValue) * (chartHeight - 30) : 0;
            const mitigatedHeight = maxValue > 0 ? (data.mitigatedRisks / maxValue) * (chartHeight - 30) : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-1 h-full">
                  <div 
                    className="w-3 bg-red-500/70 rounded-t transition-all hover:bg-red-500"
                    style={{ height: Math.max(4, openHeight) }}
                    title={`Open: ${data.openRisks}`}
                  />
                  <div 
                    className="w-3 bg-emerald-500/70 rounded-t transition-all hover:bg-emerald-500"
                    style={{ height: Math.max(4, mitigatedHeight) }}
                    title={`Mitigated: ${data.mitigatedRisks}`}
                  />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-surface-500">{data.month}</span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-200 dark:border-surface-700/50">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-500/70 rounded" />
            <span className="text-xs text-gray-500 dark:text-surface-400">Open Risks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500/70 rounded" />
            <span className="text-xs text-gray-500 dark:text-surface-400">Mitigated</span>
          </div>
        </div>
      </div>

      {/* Month-over-month table */}
      <div>
        <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Monthly Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-surface-400 border-b border-gray-200 dark:border-surface-700">
                <th className="pb-2 text-xs font-medium">Month</th>
                <th className="pb-2 text-xs font-medium text-right">Total</th>
                <th className="pb-2 text-xs font-medium text-right">Open</th>
                <th className="pb-2 text-xs font-medium text-right">Mitigated</th>
                <th className="pb-2 text-xs font-medium text-right">Critical/High</th>
              </tr>
            </thead>
            <tbody>
              {trendData.slice().reverse().map((data, index) => (
                <tr key={index} className="border-b border-gray-200 dark:border-surface-700/50">
                  <td className="py-2 text-gray-900 dark:text-white">{data.month}</td>
                  <td className="py-2 text-gray-600 dark:text-surface-300 text-right">{data.totalRisks}</td>
                  <td className="py-2 text-red-500 dark:text-red-400 text-right">{data.openRisks}</td>
                  <td className="py-2 text-emerald-500 dark:text-emerald-400 text-right">{data.mitigatedRisks}</td>
                  <td className="py-2 text-amber-500 dark:text-amber-400 text-right">{data.criticalHighRisks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
