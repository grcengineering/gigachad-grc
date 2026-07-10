import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { risksApi } from '../lib/api';
import {
  FileBarChart,
  Download,
  Calendar,
  Filter,
  BarChart,
  Table,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  PageHeader,
  EmptyState,
  Skeleton,
} from '@/components/ui';

type ReportType =
  'risk-register' | 'risk-summary' | 'treatment-status' | 'risk-trends' | 'executive-summary';

interface ReportTemplate {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const REPORTS: ReportTemplate[] = [
  {
    id: 'risk-register',
    name: 'Full Risk Register',
    description: 'Complete list of all risks with details, scores, and treatment status',
    icon: Table,
  },
  {
    id: 'risk-summary',
    name: 'Risk Summary',
    description: 'High-level overview of risks by category and risk level',
    icon: BarChart,
  },
  {
    id: 'treatment-status',
    name: 'Treatment Status Report',
    description: 'Progress on risk treatments and mitigation activities',
    icon: FileText,
  },
  {
    id: 'risk-trends',
    name: 'Risk Trend Analysis',
    description: 'Historical trends in risk identification, treatment, and closure',
    icon: TrendingUp,
  },
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'Board-ready summary with key metrics and top risks',
    icon: FileBarChart,
  },
];

const CATEGORY_OPTS = [
  { value: 'security', label: 'Security' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'operational', label: 'Operational' },
  { value: 'financial', label: 'Financial' },
  { value: 'strategic', label: 'Strategic' },
];

const LEVEL_OPTS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTS = [
  { value: 'open', label: 'Open' },
  { value: 'in_treatment', label: 'In Treatment' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'accepted', label: 'Accepted' },
];

const RISK_LEVEL_BG: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

export default function RiskReports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ category: '', riskLevel: '', status: '' });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');

  const { data: dashboardData } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: () => risksApi.getDashboard().then((r) => r.data),
  });

  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', 'report', filters],
    queryFn: () => risksApi.list({ ...filters, limit: 1000 }).then((r) => r.data),
    enabled: !!selectedReport,
  });

  const handleExport = () => {
    alert(`Exporting ${selectedReport} report as ${exportFormat.toUpperCase()}…`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Risk Reports" description="Generate and export risk reports." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Templates */}
        <div className="space-y-3">
          <h2 className="text-h3 text-surface-900">Report Templates</h2>
          <div className="space-y-2">
            {REPORTS.map((template) => {
              const Icon = template.icon;
              const active = selectedReport === template.id;
              return (
                <Card
                  key={template.id}
                  interactive
                  onClick={() => setSelectedReport(template.id)}
                  className={cn(active && 'border-brand-500 bg-brand-500/5')}
                >
                  <CardBody density="cozy" className="flex items-center gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-md',
                        active
                          ? 'bg-brand-500/20 text-brand-700'
                          : 'bg-surface-100 text-surface-600'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-surface-900 font-medium">{template.name}</p>
                      <p className="text-xs text-surface-600">{template.description}</p>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Config + Preview */}
        <div className="lg:col-span-2 space-y-5">
          {selectedReport ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                </CardHeader>
                <CardBody density="comfy">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="rep-start">
                        <Calendar className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        Start Date
                      </Label>
                      <Input
                        id="rep-start"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) =>
                          setDateRange((prev) => ({ ...prev, start: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="rep-end">
                        <Calendar className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        End Date
                      </Label>
                      <Input
                        id="rep-end"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label>
                        <Filter className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
                        Category
                      </Label>
                      <Select
                        value={filters.category}
                        onChange={(v) => setFilters((p) => ({ ...p, category: v }))}
                        options={CATEGORY_OPTS}
                        placeholder="All Categories"
                        clearable
                      />
                    </div>
                    <div>
                      <Label>Risk Level</Label>
                      <Select
                        value={filters.riskLevel}
                        onChange={(v) => setFilters((p) => ({ ...p, riskLevel: v }))}
                        options={LEVEL_OPTS}
                        placeholder="All Levels"
                        clearable
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={filters.status}
                        onChange={(v) => setFilters((p) => ({ ...p, status: v }))}
                        options={STATUS_OPTS}
                        placeholder="All Statuses"
                        clearable
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-surface-200">
                    <div className="flex items-center gap-3">
                      <span className="text-small text-surface-600">Export Format:</span>
                      <div className="flex gap-1">
                        {(['pdf', 'excel', 'csv'] as const).map((format) => (
                          <Button
                            key={format}
                            size="sm"
                            variant={exportFormat === format ? 'primary' : 'ghost'}
                            onClick={() => setExportFormat(format)}
                          >
                            {format.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={handleExport}
                    >
                      Export Report
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardBody density="comfy">
                  {isLoading ? (
                    <Skeleton className="h-40" />
                  ) : (
                    <>
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
                      {selectedReport === 'risk-trends' && <RiskTrendsPreview />}
                    </>
                  )}
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState
                icon={<FileBarChart className="h-8 w-8" />}
                title="Select a report template"
                description="Choose a template from the left to configure and preview a report."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'red' | 'amber' | 'emerald';
}) {
  const tones = {
    red: 'text-red-600',
    amber: 'text-amber-700',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="p-3 bg-surface-100 rounded-md text-center">
      <p className={cn('text-h2', tone ? tones[tone] : 'text-surface-900')}>{value}</p>
      <p className="text-xs text-surface-600">{label}</p>
    </div>
  );
}

function ExecutiveSummaryPreview({
  data,
}: {
  data:
    | { totalRisks?: number; openRisks?: number; inTreatment?: number; mitigatedThisMonth?: number }
    | undefined;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <PreviewStat label="Total Risks" value={data?.totalRisks || 0} />
        <PreviewStat label="Open" value={data?.openRisks || 0} tone="red" />
        <PreviewStat label="In Treatment" value={data?.inTreatment || 0} tone="amber" />
        <PreviewStat label="Mitigated" value={data?.mitigatedThisMonth || 0} tone="emerald" />
      </div>
      <p className="text-xs text-surface-500 italic">
        Full executive summary will include charts, top risks, and recommendations.
      </p>
    </div>
  );
}

interface PreviewRisk {
  id: string;
  riskId: string;
  title: string;
  category: string;
  inherentRisk: string;
  status?: string;
  treatmentPlan?: string;
}

function RiskRegisterPreview({ risks }: { risks: PreviewRisk[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-small">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-surface-500 border-b border-surface-200">
            <th className="pb-2 font-medium">Risk ID</th>
            <th className="pb-2 font-medium">Title</th>
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium">Risk Level</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {risks.slice(0, 5).map((risk) => (
            <tr key={risk.id} className="border-b border-surface-200/60">
              <td className="py-2 text-brand-700 font-mono text-xs">{risk.riskId}</td>
              <td className="py-2 text-surface-900">{risk.title}</td>
              <td className="py-2 text-surface-700 capitalize">{risk.category}</td>
              <td className="py-2">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] text-surface-900 capitalize',
                    RISK_LEVEL_BG[risk.inherentRisk] || 'bg-surface-500'
                  )}
                >
                  {risk.inherentRisk}
                </span>
              </td>
              <td className="py-2 text-surface-700 capitalize">
                {risk.status?.replace(/_/g, ' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {risks.length > 5 && (
        <p className="text-xs text-surface-500 mt-2">… and {risks.length - 5} more rows</p>
      )}
    </div>
  );
}

function RiskSummaryPreview({
  data,
}: {
  data:
    | {
        byRiskLevel?: { level: string; count: number }[];
        byCategory?: { category: string; count: number }[];
      }
    | undefined;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-h3 text-surface-900">By Risk Level</h4>
      <div className="grid grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
          <PreviewStat
            key={level}
            label={level}
            value={data?.byRiskLevel?.find((r) => r.level === level)?.count || 0}
          />
        ))}
      </div>
      <h4 className="text-h3 text-surface-900">By Category</h4>
      <div className="space-y-1.5">
        {(data?.byCategory || []).slice(0, 4).map((cat) => (
          <div
            key={cat.category}
            className="flex justify-between items-center px-2.5 py-1.5 bg-surface-100 rounded"
          >
            <span className="text-small text-surface-700 capitalize">{cat.category}</span>
            <span className="text-small text-surface-900 font-medium">{cat.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentStatusPreview({ risks }: { risks: PreviewRisk[] }) {
  const inTreatment = risks.filter((r) => r.treatmentPlan);
  const counts = {
    mitigate: inTreatment.filter((r) => r.treatmentPlan === 'mitigate').length,
    accept: inTreatment.filter((r) => r.treatmentPlan === 'accept').length,
    transfer: inTreatment.filter((r) => r.treatmentPlan === 'transfer').length,
    avoid: inTreatment.filter((r) => r.treatmentPlan === 'avoid').length,
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <PreviewStat label="Mitigating" value={counts.mitigate} />
        <PreviewStat label="Accepting" value={counts.accept} />
        <PreviewStat label="Transferring" value={counts.transfer} />
        <PreviewStat label="Avoiding" value={counts.avoid} />
      </div>
      <p className="text-xs text-surface-500 italic">
        Full report includes due dates, progress, and owner details.
      </p>
    </div>
  );
}

function RiskTrendsPreview() {
  return (
    <div className="space-y-3">
      <div className="h-32 bg-surface-100 rounded-md flex items-center justify-center">
        <p className="text-small text-surface-500">Trend chart visualization will appear here.</p>
      </div>
      <p className="text-xs text-surface-500 italic">
        Shows risk trends over selected time period.
      </p>
    </div>
  );
}
