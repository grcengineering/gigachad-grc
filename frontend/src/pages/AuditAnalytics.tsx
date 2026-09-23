import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import api from '@/lib/api';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface SeverityBucket {
  severity: string;
  count: number;
}

interface TimelineBucket {
  period: string;
  count: number;
}

interface NameCount {
  name: string;
  count: number;
}

interface AnalyticsResponse {
  auditsInFlight?: number;
  findingsOpen?: number;
  completionRate?: number;
  avgRemediationDays?: number;
  findingsBySeverity?: SeverityBucket[];
  auditCreationTrend?: TimelineBucket[];
  byFramework?: NameCount[];
  byAuditType?: NameCount[];
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'observation'];

const SEVERITY_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
  observation: 'bg-surface-400',
};

const SEVERITY_LABEL_COLOR: Record<string, string> = {
  critical: 'text-red-700',
  high: 'text-orange-700',
  medium: 'text-amber-700',
  low: 'text-blue-700',
  observation: 'text-surface-700',
};

function formatPercent(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return '0%';
  return `${Math.round(value)}%`;
}

function maxValue(values: number[]) {
  return values.length === 0 ? 0 : Math.max(...values);
}

export default function AuditAnalytics() {
  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['audits', 'analytics'],
    queryFn: async () => {
      const [dashboard, findings, trends] = await Promise.all([
        api.get('/api/audit/analytics/dashboard'),
        api.get('/api/audit/analytics/findings'),
        api.get('/api/audit/analytics/trends', { params: { period: 'monthly' } }),
      ]);
      const dashboardData = dashboard.data ?? {};
      const findingsData = findings.data ?? {};
      const trendsData = trends.data ?? {};
      return {
        auditsInFlight: dashboardData.activeAudits ?? 0,
        findingsOpen: dashboardData.openFindings ?? 0,
        completionRate:
          dashboardData.totalAudits > 0
            ? (dashboardData.completedAudits / dashboardData.totalAudits) * 100
            : 0,
        avgRemediationDays: findingsData.avgRemediationDays ?? 0,
        findingsBySeverity: findingsData.bySeverity ?? [],
        auditCreationTrend: trendsData.audits ?? [],
        byFramework: [],
        byAuditType: [],
      };
    },
    staleTime: 30_000,
  });

  const severityData = useMemo(() => {
    const list = data?.findingsBySeverity ?? [];
    const sorted = [...list].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
    const total = sorted.reduce((s, b) => s + (b.count ?? 0), 0);
    return { sorted, total };
  }, [data?.findingsBySeverity]);

  const timeline = useMemo(() => data?.auditCreationTrend ?? [], [data?.auditCreationTrend]);
  const timelineMax = useMemo(() => {
    return maxValue(timeline.map((bucket) => bucket.count ?? 0));
  }, [timeline]);

  const byFramework = useMemo(() => data?.byFramework ?? [], [data?.byFramework]);
  const byAuditType = useMemo(() => data?.byAuditType ?? [], [data?.byAuditType]);
  const frameworkMax = useMemo(() => maxValue(byFramework.map((b) => b.count ?? 0)), [byFramework]);
  const typeMax = useMemo(() => maxValue(byAuditType.map((b) => b.count ?? 0)), [byAuditType]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Audit Analytics"
          description="Insights and trends across your audit program."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Analytics"
        description="Insights and trends across your audit program."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Audits in Flight"
          value={data?.auditsInFlight ?? 0}
          icon={<Activity className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Findings Open"
          value={data?.findingsOpen ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Completion Rate"
          value={formatPercent(data?.completionRate)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Avg Remediation Days"
          value={data?.avgRemediationDays ?? 0}
          icon={<Clock className="h-5 w-5" />}
          tone="blue"
          caption="Time to resolve findings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Findings by Severity</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {severityData.sorted.length === 0 || severityData.total === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="h-6 w-6" />}
                title="No findings yet"
                description="Severity distribution will appear once findings exist."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {severityData.sorted.map((bucket) => {
                  const pct =
                    severityData.total > 0
                      ? Math.round((bucket.count / severityData.total) * 100)
                      : 0;
                  return (
                    <div key={bucket.severity}>
                      <div className="flex items-center justify-between text-small">
                        <span
                          className={`capitalize font-medium ${
                            SEVERITY_LABEL_COLOR[bucket.severity] ?? 'text-surface-700'
                          }`}
                        >
                          {bucket.severity}
                        </span>
                        <span className="text-surface-700 tabular-nums">
                          {bucket.count} <span className="text-surface-500">({pct}%)</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-md bg-surface-100 overflow-hidden">
                        <div
                          className={`h-full rounded-md ${
                            SEVERITY_BAR[bucket.severity] ?? 'bg-surface-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit Creation Trend</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {timeline.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-6 w-6" />}
                title="No timeline data"
                description="Monthly audit creation counts will appear here."
                size="sm"
              />
            ) : (
              <>
                <div className="flex items-end gap-3 h-48">
                  {timeline.map((bucket) => {
                    const height = timelineMax > 0 ? ((bucket.count ?? 0) / timelineMax) * 100 : 0;
                    return (
                      <div
                        key={bucket.period}
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full bg-blue-500 rounded-t-md transition-all"
                            style={{ height: `${height}%` }}
                            title={`Created: ${bucket.count ?? 0}`}
                          />
                        </div>
                        <span className="text-xs text-surface-500 tabular-nums">
                          {bucket.period}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-surface-200 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                    <span className="text-surface-700">Created</span>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>By Framework</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {byFramework.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" />}
                title="No framework data"
                description="Audits grouped by framework will appear here."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {byFramework.map((row) => {
                  const pct = frameworkMax > 0 ? (row.count / frameworkMax) * 100 : 0;
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-small">
                        <span className="text-surface-900 font-medium truncate">{row.name}</span>
                        <span className="text-surface-700 tabular-nums">{row.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-md bg-surface-100 overflow-hidden">
                        <div
                          className="h-full rounded-md bg-brand-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Audit Type</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {byAuditType.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-6 w-6" />}
                title="No type data"
                description="Audits grouped by type will appear here."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {byAuditType.map((row) => {
                  const pct = typeMax > 0 ? (row.count / typeMax) * 100 : 0;
                  return (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-small">
                        <span className="text-surface-900 font-medium capitalize truncate">
                          {row.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-surface-700 tabular-nums">{row.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-md bg-surface-100 overflow-hidden">
                        <div
                          className="h-full rounded-md bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
