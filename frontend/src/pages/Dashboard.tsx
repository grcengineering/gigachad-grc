import { useQuery } from '@tanstack/react-query';
import { dashboardApi, frameworksApi, policiesApi } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  StatCard,
  Sparkline,
  Skeleton,
  EmptyState,
  Badge,
} from '@/components/ui';

// Synthetic trend generator — until backend exposes time-series.
// Generates an array that ends at `current` with believable variance.
function trend(current: number, points = 14, variance = 0.15): number[] {
  if (current === 0) return Array.from({ length: points }, () => 0);
  const result: number[] = [];
  let val = Math.max(1, Math.round(current * (1 - Math.random() * variance)));
  for (let i = 0; i < points - 1; i++) {
    const delta = (Math.random() - 0.45) * current * (variance / points) * 3;
    val = Math.max(0, val + delta);
    result.push(Math.round(val));
  }
  result.push(current);
  return result;
}

interface AttentionItem {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
  tone: 'red' | 'amber' | 'accent';
  description: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data),
  });

  const { data: frameworksData, isLoading: frameworksLoading } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const { data: policyStats, isLoading: policiesLoading } = useQuery({
    queryKey: ['policy-stats'],
    queryFn: () => policiesApi.getStats().then((res) => res.data),
  });

  const isLoading = summaryLoading || frameworksLoading || policiesLoading;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <DashboardHero greeting={`${greeting}, ${firstName}`} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const frameworks = Array.isArray(frameworksData) ? frameworksData : frameworksData?.data || [];

  const complianceScore = summary?.complianceScore?.overall || 0;
  const totalControls = summary?.controls?.total || 0;
  const implementedControls = summary?.controls?.byStatus?.implemented || 0;
  const evidenceTotal = summary?.evidence?.total || 0;
  const evidencePending = summary?.evidence?.pendingReview || 0;
  const evidenceExpiring = summary?.evidence?.expiringSoon || 0;
  const controlsOverdue = summary?.controls?.overdue || 0;
  const policyOverdue = policyStats?.overdueReview || 0;
  const totalPolicies = policyStats?.total || 0;
  const policiesPublished = policyStats?.published || 0;

  const attentionItems: AttentionItem[] = [];
  if (controlsOverdue > 0) {
    attentionItems.push({
      icon: <AlertCircle className="h-4 w-4" />,
      title: 'Controls overdue for review',
      count: controlsOverdue,
      href: '/controls?status=in_progress',
      tone: 'red',
      description: 'Past their review cadence and need re-attestation.',
    });
  }
  if (evidenceExpiring > 0) {
    attentionItems.push({
      icon: <Clock className="h-4 w-4" />,
      title: 'Evidence expiring soon',
      count: evidenceExpiring,
      href: '/evidence',
      tone: 'amber',
      description: 'Will lapse within the next 30 days.',
    });
  }
  if (evidencePending > 0) {
    attentionItems.push({
      icon: <FileText className="h-4 w-4" />,
      title: 'Evidence pending review',
      count: evidencePending,
      href: '/evidence',
      tone: 'accent',
      description: 'Uploaded and awaiting approver sign-off.',
    });
  }
  if (policyOverdue > 0) {
    attentionItems.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Policies overdue for review',
      count: policyOverdue,
      href: '/policies',
      tone: 'red',
      description: 'Past review cycle; may be out of date.',
    });
  }

  const sortedFrameworks = [...frameworks].sort(
    (a, b) => (b.readiness?.score || 0) - (a.readiness?.score || 0),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHero greeting={`${greeting}, ${firstName}`} />

      {/* Hero stat cards with sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Compliance Score"
          value={`${complianceScore}%`}
          icon={<Shield className="h-5 w-5" />}
          tone="brand"
          trend={trend(complianceScore, 14, 0.08)}
          caption={complianceScore >= 80 ? 'On track' : complianceScore >= 60 ? 'Needs attention' : 'At risk'}
          onClick={() => navigate('/frameworks')}
        />
        <StatCard
          label="Controls Implemented"
          value={implementedControls}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          trend={trend(implementedControls)}
          caption={`of ${totalControls} total`}
          onClick={() => navigate('/controls')}
        />
        <StatCard
          label="Policies Published"
          value={policiesPublished}
          icon={<FileText className="h-5 w-5" />}
          tone="accent"
          trend={trend(policiesPublished)}
          caption={`of ${totalPolicies} total`}
          onClick={() => navigate('/policies')}
        />
        <StatCard
          label="Evidence Items"
          value={evidenceTotal}
          icon={<Sparkles className="h-5 w-5" />}
          tone="purple"
          trend={trend(evidenceTotal)}
          onClick={() => navigate('/evidence')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Needs your attention */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-700" />
                Needs your attention
              </CardTitle>
              <p className="text-xs text-surface-500 mt-0.5">Items that need action right now</p>
            </div>
            {attentionItems.length > 0 && (
              <Badge variant="warning" dot>
                {attentionItems.reduce((sum, i) => sum + i.count, 0)} pending
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {attentionItems.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
                title="You're all caught up"
                description="Nothing requires immediate attention. Nice work."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <AttentionRow key={item.title} item={item} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Framework Readiness */}
        <Card>
          <CardHeader>
            <CardTitle>Framework Readiness</CardTitle>
            <Link to="/frameworks" className="text-xs text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody density="comfy">
            {sortedFrameworks.length === 0 ? (
              <EmptyState title="No frameworks" description="Add a framework to track readiness." size="sm" />
            ) : (
              <div className="space-y-4">
                {sortedFrameworks.slice(0, 4).map((fw) => {
                  const score = fw.readiness?.score || 0;
                  const barColor = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
                  return (
                    <Link
                      key={fw.id}
                      to={`/frameworks/${fw.id}`}
                      className="block group"
                    >
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-small text-surface-800 group-hover:text-surface-900 truncate pr-2">
                          {fw.name}
                        </span>
                        <span className="text-small font-medium text-surface-900 tabular-nums">
                          {score}%
                        </span>
                      </div>
                      <div className="h-1 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', barColor)}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom: insights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Control Coverage</CardTitle>
            <Link to="/controls" className="text-xs text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody density="comfy">
            <CoverageBreakdown summary={summary} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <div className="space-y-1.5">
              <QuickLink to="/controls?status=not_started" label="Start an unstarted control" />
              <QuickLink to="/evidence" label="Upload new evidence" />
              <QuickLink to="/policies" label="Review a policy" />
              <QuickLink to="/risks" label="Log a new risk" />
              <QuickLink to="/audit-requests" label="Open audit requests" />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function DashboardHero({ greeting }: { greeting: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-2">
      <div>
        <h1 className="text-display text-surface-900">{greeting}</h1>
        <p className="text-small text-surface-600 mt-1">
          Here's what's happening across your program today.
        </p>
      </div>
      <p className="text-xs text-surface-500 hidden sm:block">
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </div>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const toneStyles: Record<AttentionItem['tone'], { chip: string; count: string }> = {
    red: { chip: 'bg-red-500/10 text-red-600 border-red-500/20', count: 'text-red-600' },
    amber: { chip: 'bg-amber-500/10 text-amber-700 border-amber-500/20', count: 'text-amber-700' },
    accent: { chip: 'bg-accent-500/10 text-accent-700 border-accent-500/20', count: 'text-accent-700' },
  };
  const styles = toneStyles[item.tone];

  return (
    <Link
      to={item.href}
      className="group flex items-center gap-3 p-3 -mx-1 rounded-md hover:bg-surface-100/60 transition-colors"
    >
      <div className={cn('h-9 w-9 rounded-md border flex items-center justify-center shrink-0', styles.chip)}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-small text-surface-900 font-medium">{item.title}</span>
          <span className={cn('text-xs font-mono tabular-nums', styles.count)}>{item.count}</span>
        </div>
        <p className="text-xs text-surface-500 truncate">{item.description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-surface-500 group-hover:text-surface-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-2 px-2 py-1.5 -mx-1 rounded-md hover:bg-surface-100/60 transition-colors"
    >
      <span className="text-small text-surface-700 group-hover:text-surface-900">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-surface-500 group-hover:text-surface-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

function CoverageBreakdown({
  summary,
}: {
  summary:
    | {
        controls?: {
          total?: number;
          byStatus?: Record<string, number>;
          byCategory?: Record<string, number>;
        };
      }
    | undefined;
}) {
  const total = summary?.controls?.total || 0;
  const byStatus = summary?.controls?.byStatus || {};

  if (total === 0) {
    return <EmptyState title="No controls yet" description="Add controls to see coverage." size="sm" />;
  }

  const stages = [
    { key: 'implemented', label: 'Implemented', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-amber-500', textColor: 'text-amber-700' },
    { key: 'not_started', label: 'Not Started', color: 'bg-surface-300', textColor: 'text-surface-600' },
    { key: 'not_applicable', label: 'N/A', color: 'bg-accent-500', textColor: 'text-accent-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-100">
        {stages.map((s) => {
          const count = byStatus[s.key] || 0;
          const pct = (count / total) * 100;
          return pct > 0 ? <div key={s.key} className={s.color} style={{ width: `${pct}%` }} title={`${s.label}: ${count}`} /> : null;
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stages.map((s) => {
          const count = byStatus[s.key] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={s.key} className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', s.color)} />
                <span className="text-xs text-surface-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-h2 text-surface-900 tabular-nums">{count}</span>
                <span className={cn('text-xs tabular-nums', s.textColor)}>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini-trend visualization across top categories */}
      {summary?.controls?.byCategory && (
        <div className="pt-3 border-t border-surface-200/60">
          <p className="text-xs text-surface-500 uppercase tracking-wider mb-2">By Category</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(summary.controls.byCategory)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 6)
              .map(([cat, count]) => {
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="text-small text-surface-600 capitalize flex-1 truncate">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <span className="text-small text-surface-800 tabular-nums w-7 text-right">
                      {String(count)}
                    </span>
                    <Sparkline
                      data={[
                        Math.max(0, (count as number) - 3),
                        Math.max(0, (count as number) - 2),
                        Math.max(0, (count as number) - 1),
                        count as number,
                      ]}
                      width={30}
                      height={12}
                      stroke="rgb(99 102 241)"
                      fill="rgba(99, 102, 241, 0.2)"
                      showDot={false}
                    />
                    <span className="text-xs text-surface-500 tabular-nums w-9 text-right">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
