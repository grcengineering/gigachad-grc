import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { risksApi } from '../lib/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
  EmptyState,
} from '@/components/ui';
import { riskStatusVariant } from '@/lib/riskStatus';

const LEVEL_BG: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};


export default function RiskDashboard() {
  const navigate = useNavigate();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: () => risksApi.getDashboard().then((r) => r.data),
  });

  const { data: recentRisks } = useQuery({
    queryKey: ['risks', 'recent'],
    queryFn: () => risksApi.list({ limit: 5 }).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader title="Risk Dashboard" description="Executive overview of your risk posture." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Risk Dashboard"
        description="Executive overview of your risk posture."
        actions={
          <Link to="/risks">
            <Button size="sm" leftIcon={<AlertTriangle className="h-4 w-4" />}>
              View All Risks
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Risks"
          value={dashboard?.totalRisks || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="blue"
          onClick={() => navigate('/risks')}
        />
        <MetricCard
          title="Open Risks"
          value={dashboard?.openRisks || 0}
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          trend={dashboard?.openRisksTrend}
          onClick={() => navigate('/risks?status=open')}
        />
        <MetricCard
          title="In Treatment"
          value={dashboard?.inTreatment || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="cyan"
          onClick={() => navigate('/risks?status=in_treatment')}
        />
        <MetricCard
          title="Mitigated This Month"
          value={dashboard?.mitigatedThisMonth || 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          onClick={() => navigate('/risks?status=mitigated')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Risk Level Distribution</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <div className="space-y-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((level) => {
                const count = dashboard?.byRiskLevel?.find((r: { level: string; count: number }) => r.level === level)?.count || 0;
                const total = dashboard?.totalRisks || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-small">
                      <span className="text-surface-700 capitalize">{level}</span>
                      <span className="text-surface-900 font-medium tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-500', LEVEL_BG[level])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risks by Category</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {dashboard?.byCategory && dashboard.byCategory.length > 0 ? (
              <div className="space-y-2">
                {dashboard.byCategory.slice(0, 6).map((cat: { category: string; count: number }) => (
                  <button
                    key={cat.category}
                    type="button"
                    onClick={() => navigate(`/risks?category=${encodeURIComponent(cat.category || '')}`)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded transition-colors text-left"
                  >
                    <span className="text-small text-surface-700 capitalize">
                      {cat.category?.replace(/_/g, ' ') || 'Uncategorized'}
                    </span>
                    <span className="text-small text-surface-900 font-medium tabular-nums">{cat.count}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No risks categorized yet" size="sm" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Risks</CardTitle>
            <Link to="/risks" className="text-small text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          </CardHeader>
          <CardBody density="comfy">
            {recentRisks?.risks && recentRisks.risks.length > 0 ? (
              <div className="space-y-2">
                {recentRisks.risks.map((risk: { id: string; riskId: string; title: string; status: string; inherentRisk: string }) => (
                  <Link
                    key={risk.id}
                    to={`/risks/${risk.id}`}
                    className="flex items-center gap-3 p-2.5 bg-surface-100/60 rounded-md hover:bg-surface-100 transition-colors"
                  >
                    <span className={cn('h-2 w-2 rounded-full shrink-0', LEVEL_BG[risk.inherentRisk] || 'bg-surface-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-900 font-medium truncate">{risk.title}</p>
                      <p className="text-xs text-surface-500 font-mono">{risk.riskId}</p>
                    </div>
                    <Badge variant={riskStatusVariant(risk.status)} size="sm">
                      {(risk.status || '').replace(/_/g, ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No risks recorded yet" size="sm" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            <div className="space-y-2">
              <QuickAction to="/risks?create=true" icon={<AlertTriangle className="h-4 w-4" />} tone="brand">
                Report New Risk
              </QuickAction>
              <QuickAction to="/risk-queue" icon={<Clock className="h-4 w-4" />}>
                View My Queue
              </QuickAction>
              <QuickAction to="/risk-heatmap" icon={<BarChart className="h-4 w-4" />}>
                View Heatmap
              </QuickAction>
              <QuickAction to="/risk-reports" icon={<TrendingUp className="h-4 w-4" />}>
                Generate Report
              </QuickAction>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Appetite Status</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AppetiteTile
              icon={<CheckCircle2 className="h-7 w-7" />}
              tone="emerald"
              label="Within Appetite"
              value={dashboard?.withinAppetite || 0}
            />
            <AppetiteTile
              icon={<AlertTriangle className="h-7 w-7" />}
              tone="amber"
              label="Nearing Threshold"
              value={dashboard?.nearingThreshold || 0}
            />
            <AppetiteTile
              icon={<TrendingDown className="h-7 w-7" />}
              tone="red"
              label="Exceeds Appetite"
              value={dashboard?.exceedsAppetite || 0}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
  trend,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'blue' | 'amber' | 'cyan' | 'emerald';
  trend?: number;
  onClick?: () => void;
}) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-600',
    amber: 'bg-amber-500/10 text-amber-700',
    cyan: 'bg-cyan-500/10 text-cyan-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };
  return (
    <Card interactive={!!onClick} onClick={onClick}>
      <CardBody density="comfy" className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-md', tones[tone])}>{icon}</div>
        <div>
          <p className="text-xs text-surface-500 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-h1 text-surface-900">{value}</p>
            {trend !== undefined && (
              <span className={cn('text-xs', trend >= 0 ? 'text-red-600' : 'text-emerald-600')}>
                {trend >= 0 ? '+' : ''}
                {trend}%
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function QuickAction({
  to,
  icon,
  children,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'brand';
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 p-2.5 rounded-md text-small transition-colors',
        tone === 'brand'
          ? 'bg-brand-500/10 text-brand-700 hover:bg-brand-500/20'
          : 'bg-surface-100 text-surface-700 hover:bg-surface-200 hover:text-surface-900',
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function AppetiteTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'red';
}) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-700',
    red: 'bg-red-500/10 text-red-600',
  };
  return (
    <div className="text-center">
      <div className={cn('inline-flex items-center justify-center w-14 h-14 rounded-full mb-3', tones[tone])}>
        {icon}
      </div>
      <p className="text-h1 text-surface-900">{value}</p>
      <p className="text-small text-surface-600">{label}</p>
    </div>
  );
}
