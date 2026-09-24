import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { risksApi } from '../lib/api';
import { saveBlob } from '../lib/download';
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
  { value: 'very_high', label: 'Very High' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'very_low', label: 'Very Low' },
];

const STATUS_OPTS = [
  { value: 'risk_identified', label: 'Risk Identified' },
  { value: 'actual_risk', label: 'Validated Risk' },
  { value: 'risk_analysis_in_progress', label: 'Analysis In Progress' },
  { value: 'risk_analyzed', label: 'Risk Analyzed' },
  { value: 'not_a_risk', label: 'Not a Risk' },
];

const RISK_LEVEL_BG: Record<string, string> = {
  very_high: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
  very_low: 'bg-emerald-400',
};

export default function RiskReports() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ category: '', riskLevel: '', status: '' });
  const { data: risksData, isLoading } = useQuery({
    queryKey: ['risks', 'report', filters],
    queryFn: () =>
      api.get('/api/risks/full', { params: { ...filters, limit: 1000 } }).then((r) => r.data),
    enabled: !!selectedReport,
  });

  const previewRisks: PreviewRisk[] = (risksData?.risks ?? []).filter((risk: PreviewRisk) => {
    const createdAt = risk.createdAt ? new Date(risk.createdAt).getTime() : undefined;
    if (dateRange.start && createdAt && createdAt < new Date(dateRange.start).getTime())
      return false;
    if (dateRange.end && createdAt) {
      const end = new Date(`${dateRange.end}T23:59:59.999`).getTime();
      if (createdAt > end) return false;
    }
    return true;
  });
  const previewData = {
    totalRisks: previewRisks.length,
    openRisks: previewRisks.filter((risk) => risk.status !== 'not_a_risk').length,
    inTreatment: previewRisks.filter((risk) => risk.treatmentStatus === 'in_progress').length,
    mitigatedThisMonth: previewRisks.filter((risk) => risk.treatmentStatus === 'completed').length,
    byRiskLevel: Object.entries(
      previewRisks.reduce<Record<string, number>>((counts, risk) => {
        counts[risk.inherentRisk] = (counts[risk.inherentRisk] ?? 0) + 1;
        return counts;
      }, {})
    ).map(([level, count]) => ({ level, count })),
    byCategory: Object.entries(
      previewRisks.reduce<Record<string, number>>((counts, risk) => {
        counts[risk.category] = (counts[risk.category] ?? 0) + 1;
        return counts;
      }, {})
    ).map(([category, count]) => ({ category, count })),
  };

  const trendDays = (() => {
    if (!dateRange.start) return 90;
    const end = dateRange.end ? new Date(dateRange.end) : new Date();
    const start = new Date(dateRange.start);
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Number.isFinite(days) && days > 0 ? Math.min(days, 3650) : 90;
  })();

  const { data: trendData, isLoading: trendLoading } = useQuery<RiskTrendPoint[]>({
    queryKey: ['risks', 'trend', trendDays],
    queryFn: () => risksApi.getTrend(trendDays).then((r) => r.data),
    enabled: selectedReport === 'risk-trends',
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReport) throw new Error('Select a report first');
      return api.post(
        '/api/reports/generate',
        {
          reportType: selectedReport.replace(/-/g, '_'),
          periodStart: dateRange.start || undefined,
          periodEnd: dateRange.end || undefined,
          category: filters.category || undefined,
          riskLevel: filters.riskLevel || undefined,
          status: filters.status || undefined,
          confidential: true,
        },
        { responseType: 'blob' }
      );
    },
    onSuccess: (response) => {
      const disposition = response.headers['content-disposition'];
      const filename = getDownloadFilename(disposition, `${selectedReport}-report.pdf`);
      saveBlob(response.data, filename);
      toast.success('Report exported');
    },
    onError: () => toast.error('Unable to export report'),
  });

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
                    <span className="text-small text-surface-600">
                      Exported as an authenticated PDF.
                    </span>
                    <Button
                      size="sm"
                      leftIcon={<Download className="h-4 w-4" />}
                      loading={exportMutation.isPending}
                      onClick={() => exportMutation.mutate()}
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
                        <ExecutiveSummaryPreview data={previewData} />
                      )}
                      {selectedReport === 'risk-register' && (
                        <RiskRegisterPreview risks={previewRisks} />
                      )}
                      {selectedReport === 'risk-summary' && (
                        <RiskSummaryPreview data={previewData} />
                      )}
                      {selectedReport === 'treatment-status' && (
                        <TreatmentStatusPreview risks={previewRisks} />
                      )}
                      {selectedReport === 'risk-trends' &&
                        (trendLoading ? (
                          <Skeleton className="h-40" />
                        ) : (
                          <RiskTrendsPreview trends={trendData ?? []} />
                        ))}
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
  treatmentStatus?: string;
  createdAt?: string;
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
      <div className="grid grid-cols-5 gap-3">
        {(['very_high', 'high', 'medium', 'low', 'very_low'] as const).map((level) => (
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

interface RiskTrendPoint {
  week: string;
  created: number;
  assessed: number;
  mitigated: number;
  accepted: number;
}

export function getDownloadFilename(
  contentDisposition: string | undefined,
  fallback: string
): string {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  return contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallback;
}

function RiskTrendsPreview({ trends }: { trends: RiskTrendPoint[] }) {
  if (trends.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-8 w-8" />}
        title="No trend activity"
        description="No risk workflow changes were recorded during this period."
        size="sm"
      />
    );
  }

  const maxTotal = Math.max(
    1,
    ...trends.map((point) => point.created + point.assessed + point.mitigated + point.accepted)
  );
  const series = [
    { key: 'created' as const, label: 'Created', className: 'bg-red-500' },
    { key: 'assessed' as const, label: 'Assessed', className: 'bg-blue-500' },
    { key: 'mitigated' as const, label: 'Mitigated', className: 'bg-emerald-500' },
    { key: 'accepted' as const, label: 'Accepted', className: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48 border-b border-surface-200 px-2">
        {trends.map((point) => {
          const total = point.created + point.assessed + point.mitigated + point.accepted;
          return (
            <div
              key={point.week}
              className="flex-1 min-w-6 h-full flex flex-col justify-end group"
              title={`${point.week}: ${total} workflow events`}
            >
              <div
                className="w-full rounded-t overflow-hidden flex flex-col-reverse"
                style={{ height: `${Math.max(4, (total / maxTotal) * 100)}%` }}
              >
                {series.map(({ key, className }) =>
                  point[key] > 0 ? (
                    <div
                      key={key}
                      className={className}
                      style={{ height: `${(point[key] / Math.max(total, 1)) * 100}%` }}
                    />
                  ) : null
                )}
              </div>
              <span className="text-[10px] text-surface-500 mt-1 truncate">
                {new Date(`${point.week}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4">
        {series.map(({ key, label, className }) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-xs text-surface-600">
            <span className={cn('h-2.5 w-2.5 rounded-sm', className)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
