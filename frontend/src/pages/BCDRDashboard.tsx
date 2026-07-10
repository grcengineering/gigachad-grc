import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FileText,
  FlaskConical,
  BookOpen,
  ShieldAlert,
  ClipboardCheck,
  Building2,
  ClockAlert,
  CheckCircle2,
  Activity,
  Plus,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface DashboardSummary {
  processes?: {
    total?: number;
    tier_1_count?: number;
    tier_2_count?: number;
    tier_3_count?: number;
    tier_4_count?: number;
    overdue_review_count?: number;
  };
  plans?: {
    total?: number;
    published_count?: number;
    draft_count?: number;
    overdue_review_count?: number;
  };
  tests?: {
    total?: number;
    completed_count?: number;
    passed_count?: number;
    failed_count?: number;
    upcoming_count?: number;
    openFindingsCount?: number;
  };
  runbooks?: {
    total?: number;
    published_count?: number;
    needs_review_count?: number;
  };
  upcomingTests?: Array<{
    id: string;
    test_id?: string;
    name: string;
    scheduled_date?: string;
    test_type?: string;
  }>;
  overdueItems?: {
    totalOverdue?: number;
    plans?: Array<{ id: string; title: string }>;
    processes?: Array<{ id: string; title?: string; name?: string }>;
    findings?: Array<{ id: string; title: string; test_id?: string }>;
  };
}

interface BCDRMetrics {
  readinessScore?: number;
  metrics?: {
    rtoCoverage?: number;
    planCoverage?: number;
    testSuccessRate?: number;
    overdueItems?: number;
  };
}

interface ActiveIncident {
  id: string;
  title: string;
  severity?: string;
  status?: string;
  detected_at?: string;
}

interface VendorGap {
  id: string;
  vendor_name: string;
  process_id?: string;
  process_name?: string;
  rto_gap_hours?: number;
}

interface PendingAttestation {
  id: string;
  plan_id: string;
  plan_title: string;
  attestation_type?: string;
  due_at?: string;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function BCDRDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ['bcdr', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard');
      return res.data ?? {};
    },
    staleTime: 30_000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<BCDRMetrics>({
    queryKey: ['bcdr', 'metrics'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard/metrics');
      return res.data ?? {};
    },
    staleTime: 30_000,
  });

  const { data: activeIncidents } = useQuery<ActiveIncident[]>({
    queryKey: ['bcdr', 'active-incidents'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/incidents/active');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 10_000,
  });

  const { data: pendingAttestations } = useQuery<PendingAttestation[]>({
    queryKey: ['bcdr', 'pending-attestations'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/attestations/pending');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 30_000,
  });

  const { data: vendorGaps } = useQuery<VendorGap[]>({
    queryKey: ['bcdr', 'vendor-gaps'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard/vendor-gaps');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60_000,
  });

  const isLoading = summaryLoading || metricsLoading;

  const incidents = activeIncidents ?? [];
  const attestations = pendingAttestations ?? [];
  const gaps = vendorGaps ?? [];

  const plans = summary?.plans ?? {};
  const tests = summary?.tests ?? {};
  const runbooks = summary?.runbooks ?? {};
  const processes = summary?.processes ?? {};
  const upcomingTests = summary?.upcomingTests ?? [];
  const overdue = summary?.overdueItems ?? {};
  const overduePlans = overdue.plans ?? [];
  const overdueProcesses = overdue.processes ?? [];
  const overdueFindings = overdue.findings ?? [];
  const totalOverdue = overdue.totalOverdue ?? overduePlans.length + overdueProcesses.length + overdueFindings.length;

  const readiness = metrics?.readinessScore ?? 0;
  const rtoCoverage = metrics?.metrics?.rtoCoverage ?? 0;
  const planCoverage = metrics?.metrics?.planCoverage ?? 0;
  const testSuccess = metrics?.metrics?.testSuccessRate ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="BC/DR Dashboard"
          description="Business Continuity and Disaster Recovery readiness at a glance."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="BC/DR Dashboard"
        description="Business Continuity and Disaster Recovery readiness at a glance."
        actions={
          <>
            <Link to="/bcdr/plans">
              <Button variant="outline" size="sm" leftIcon={<FileText className="h-4 w-4" />}>
                View Plans
              </Button>
            </Link>
            <Link to="/bcdr/plans/new">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Create Plan
              </Button>
            </Link>
          </>
        }
      />

      {incidents.length > 0 && (
        <Card className="border-red-200 bg-red-50/40">
          <CardBody density="cozy" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-md bg-red-500/10 text-red-700 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-h3 text-red-800">
                  {incidents.length} Active Incident{incidents.length > 1 ? 's' : ''}
                </p>
                <p className="text-small text-red-700 truncate">
                  {incidents.slice(0, 2).map((i) => i.title).join(', ')}
                  {incidents.length > 2 && ` and ${incidents.length - 2} more`}
                </p>
              </div>
            </div>
            <Link to={`/bcdr/incidents/${incidents[0].id}`} className="shrink-0">
              <Button size="sm" variant="danger" leftIcon={<Activity className="h-4 w-4" />}>
                View Active
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody density="comfy" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Readiness Score
            </p>
            <p className="text-display text-surface-900 tabular-nums mt-1">{readiness}%</p>
            <p className="text-small text-surface-600 mt-1">
              Composite of RTO coverage, plan coverage, and test success.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">RTO</p>
              <p className="text-h2 text-surface-900 tabular-nums">{rtoCoverage}%</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Plans</p>
              <p className="text-h2 text-surface-900 tabular-nums">{planCoverage}%</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Tests</p>
              <p className="text-h2 text-surface-900 tabular-nums">{testSuccess}%</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Plans"
          value={plans.total ?? 0}
          icon={<FileText className="h-5 w-5" />}
          tone="blue"
          caption={`${plans.published_count ?? 0} published · ${plans.draft_count ?? 0} draft`}
        />
        <StatCard
          label="Tests"
          value={tests.completed_count ?? 0}
          icon={<FlaskConical className="h-5 w-5" />}
          tone="purple"
          caption={`${tests.passed_count ?? 0} passed · ${tests.failed_count ?? 0} failed`}
        />
        <StatCard
          label="Runbooks"
          value={runbooks.total ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          tone="emerald"
          caption={`${runbooks.published_count ?? 0} published`}
        />
        <StatCard
          label="Processes"
          value={processes.total ?? 0}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="brand"
          caption={`Tier 1: ${processes.tier_1_count ?? 0} · Tier 2: ${processes.tier_2_count ?? 0}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tests</CardTitle>
            <Link to="/bcdr/tests" className="text-small text-brand-700 hover:text-brand-800">
              View all →
            </Link>
          </CardHeader>
          <CardBody density="comfy">
            {upcomingTests.length === 0 ? (
              <EmptyState
                icon={<FlaskConical className="h-6 w-6" />}
                title="No upcoming tests"
                description="Schedule a DR test to validate recovery."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {upcomingTests.slice(0, 5).map((test) => (
                  <Link
                    key={test.id}
                    to={`/bcdr/tests/${test.id}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-surface-900 font-medium truncate">{test.name}</p>
                      <p className="text-xs text-surface-500 capitalize">
                        {(test.test_type || 'test').replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className="text-small text-surface-700 tabular-nums shrink-0">
                      {formatDate(test.scheduled_date)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Incidents</CardTitle>
            {incidents.length > 0 && (
              <Badge variant="danger" size="sm" capitalize={false}>
                {incidents.length}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {incidents.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="No active incidents"
                description="All clear right now."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {incidents.slice(0, 5).map((incident) => (
                  <Link
                    key={incident.id}
                    to={`/bcdr/incidents/${incident.id}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-surface-900 font-medium truncate">{incident.title}</p>
                      <p className="text-xs text-surface-500">
                        {formatDate(incident.detected_at)}
                      </p>
                    </div>
                    {incident.severity && (
                      <Badge
                        variant={
                          incident.severity === 'critical' || incident.severity === 'high'
                            ? 'danger'
                            : incident.severity === 'medium'
                              ? 'warning'
                              : 'info'
                        }
                        size="sm"
                      >
                        {incident.severity}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue Items</CardTitle>
            {totalOverdue > 0 && (
              <Badge variant="warning" size="sm" capitalize={false}>
                {totalOverdue}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {totalOverdue === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="Nothing overdue"
                description="Every item is on track for review."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {overduePlans.slice(0, 3).map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/bcdr/plans/${plan.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-amber-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 truncate">{plan.title}</p>
                      <p className="text-xs text-surface-500">Plan review overdue</p>
                    </div>
                    <ClockAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  </Link>
                ))}
                {overdueProcesses.slice(0, 3).map((process) => (
                  <Link
                    key={process.id}
                    to={`/bcdr/processes/${process.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 truncate">{process.name || process.title}</p>
                      <p className="text-xs text-surface-500">BIA review overdue</p>
                    </div>
                    <ClockAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  </Link>
                ))}
                {overdueFindings.slice(0, 2).map((finding) => (
                  <Link
                    key={finding.id}
                    to={finding.test_id ? `/bcdr/tests/${finding.test_id}` : '/bcdr'}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <FlaskConical className="h-4 w-4 text-amber-700 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 truncate">{finding.title}</p>
                      <p className="text-xs text-surface-500">Remediation overdue</p>
                    </div>
                    <ClockAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Recovery Gaps</CardTitle>
            {gaps.length > 0 && (
              <Badge variant="danger" size="sm" capitalize={false}>
                {gaps.length}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {gaps.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="No vendor gaps"
                description="Vendor RTOs meet process requirements."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {gaps.slice(0, 5).map((gap) => (
                  <Link
                    key={gap.id}
                    to={gap.process_id ? `/bcdr/processes/${gap.process_id}` : '/bcdr'}
                    className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-red-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 font-medium truncate">{gap.vendor_name}</p>
                      <p className="text-xs text-surface-500 truncate">
                        RTO gap: {gap.rto_gap_hours ?? '?'}h
                        {gap.process_name ? ` for ${gap.process_name}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {attestations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Attestations</CardTitle>
            <Badge variant="warning" size="sm" capitalize={false}>
              {attestations.length}
            </Badge>
          </CardHeader>
          <CardBody density="comfy">
            <div className="space-y-2">
              {attestations.slice(0, 5).map((attestation) => (
                <Link
                  key={attestation.id}
                  to={`/bcdr/plans/${attestation.plan_id}`}
                  className="flex items-center gap-3 p-2.5 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                >
                  <ClipboardCheck className="h-4 w-4 text-amber-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-surface-900 truncate">{attestation.plan_title}</p>
                    <p className="text-xs text-surface-500 capitalize">
                      {(attestation.attestation_type || 'attestation').replace(/_/g, ' ')}
                    </p>
                  </div>
                  {attestation.due_at && (
                    <span className="text-xs text-surface-500 tabular-nums shrink-0">
                      Due {formatDate(attestation.due_at)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
