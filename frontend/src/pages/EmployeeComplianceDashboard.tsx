import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ClockAlert,
  ShieldCheck,
  Users,
  Building2,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CategoryChip,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
} from '@/components/ui';

interface DepartmentStat {
  department: string;
  employeeCount: number;
  compliantPct: number;
}

interface AssignmentFunnel {
  assigned: number;
  inProgress: number;
  completed: number;
}

interface OverdueEmployee {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  department?: string;
  overdueCount: number;
  oldestDueAt?: string;
}

interface EmployeeComplianceDashboardData {
  compliantPct?: number;
  totalEmployees?: number;
  overdue?: number;
  expiringSoon?: number;
  departments?: DepartmentStat[];
  funnel?: AssignmentFunnel;
  overdueEmployees?: OverdueEmployee[];
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function getDisplayName(emp: OverdueEmployee): string {
  if (emp.fullName) return emp.fullName;
  const composed = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
  return composed || emp.email;
}

function DepartmentRow({ stat }: { stat: DepartmentStat }) {
  const safe = Math.max(0, Math.min(100, Math.round(stat.compliantPct ?? 0)));
  const tone = safe >= 80 ? 'bg-emerald-500' : safe >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-40 shrink-0 min-w-0">
        <Building2 className="h-4 w-4 text-surface-500 shrink-0" />
        <span className="text-small text-surface-900 truncate">{stat.department}</span>
      </div>
      <span className="text-xs text-surface-500 tabular-nums w-12 shrink-0 text-right">
        {stat.employeeCount}
      </span>
      <div className="flex-1 h-2 rounded-full bg-surface-200 overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${safe}%` }} />
      </div>
      <span className="text-xs text-surface-700 tabular-nums w-10 shrink-0 text-right">
        {safe}%
      </span>
    </div>
  );
}

function FunnelStage({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: string;
}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-small text-surface-700">{label}</span>
        <span className="text-small text-surface-900 tabular-nums font-medium">
          {value.toLocaleString()}
        </span>
      </div>
      <div
        className={`h-8 rounded-md ${tone} transition-all`}
        style={{ width: `${Math.max(8, safe)}%` }}
      />
    </div>
  );
}

export default function EmployeeComplianceDashboard() {
  const { data, isLoading } = useQuery<EmployeeComplianceDashboardData>({
    queryKey: ['employee-compliance', 'dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/employee-compliance/dashboard');
      return res.data ?? {};
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Employee Compliance"
          description="Training compliance, attestations, and assignment health across the organization."
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
        <Skeleton className="h-48" />
      </div>
    );
  }

  const compliantPct = Math.round(data?.compliantPct ?? 0);
  const totalEmployees = data?.totalEmployees ?? 0;
  const overdue = data?.overdue ?? 0;
  const expiringSoon = data?.expiringSoon ?? 0;
  const departments = data?.departments ?? [];
  const funnel = data?.funnel ?? { assigned: 0, inProgress: 0, completed: 0 };
  const overdueEmployees = data?.overdueEmployees ?? [];

  const funnelMax = Math.max(funnel.assigned, funnel.inProgress, funnel.completed, 1);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Employee Compliance"
        description="Training compliance, attestations, and assignment health across the organization."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Compliant"
          value={`${compliantPct}%`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="emerald"
          caption="All training current"
        />
        <StatCard
          label="Total Employees"
          value={totalEmployees}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Overdue"
          value={overdue}
          icon={<ClockAlert className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Expiring Soon"
          value={expiringSoon}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
          caption="Next 30 days"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Compliance by Department</CardTitle>
            {departments.length > 0 && (
              <Badge variant="neutral" size="sm" capitalize={false}>
                {departments.length}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {departments.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-6 w-6" />}
                title="No department data"
                description="Compliance breakdown by department will appear here once data is available."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {departments.map((dept) => (
                  <DepartmentRow key={dept.department} stat={dept} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment Funnel</CardTitle>
          </CardHeader>
          <CardBody density="comfy">
            {funnel.assigned === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No assignments yet"
                description="Once training is assigned, its journey through completion will appear here."
                size="sm"
              />
            ) : (
              <div className="space-y-4">
                <FunnelStage
                  label="Assigned"
                  value={funnel.assigned}
                  pct={(funnel.assigned / funnelMax) * 100}
                  tone="bg-blue-500/80"
                />
                <FunnelStage
                  label="In progress"
                  value={funnel.inProgress}
                  pct={(funnel.inProgress / funnelMax) * 100}
                  tone="bg-amber-500/80"
                />
                <FunnelStage
                  label="Completed"
                  value={funnel.completed}
                  pct={(funnel.completed / funnelMax) * 100}
                  tone="bg-emerald-500/80"
                />
                <div className="pt-2 border-t border-surface-200 text-xs text-surface-500 flex items-center justify-between">
                  <span>Completion rate</span>
                  <span className="tabular-nums text-surface-700">
                    {funnel.assigned > 0
                      ? Math.round((funnel.completed / funnel.assigned) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overdue Employees</CardTitle>
          {overdueEmployees.length > 0 && (
            <Badge variant="warning" size="sm" capitalize={false}>
              {overdueEmployees.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {overdueEmployees.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Everyone's on track"
              description="No employees currently have overdue training or attestations."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {overdueEmployees.map((emp) => (
                <Link
                  key={emp.id}
                  to={`/people/${emp.id}`}
                  className="flex items-center gap-3 p-3 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                >
                  <ClockAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-surface-900 font-medium truncate">{getDisplayName(emp)}</p>
                    <p className="text-xs text-surface-500 truncate">{emp.email}</p>
                  </div>
                  {emp.department && (
                    <div className="shrink-0 hidden sm:block">
                      <CategoryChip value={emp.department} />
                    </div>
                  )}
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant="danger" size="sm" capitalize={false}>
                      {emp.overdueCount} overdue
                    </Badge>
                    {emp.oldestDueAt && (
                      <span className="text-xs text-surface-500 tabular-nums hidden md:inline">
                        Since {formatDate(emp.oldestDueAt)}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-surface-500 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
