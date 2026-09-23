import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, CheckCircle2, ClockAlert, ShieldCheck, Search, Mail } from 'lucide-react';
import { employeeComplianceApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  CategoryChip,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Select,
  StatCard,
  type ActiveFilter,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface Employee {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobTitle?: string;
  department?: string;
  status?: string;
  complianceScore?: number;
  lastCorrelatedAt?: string;
  overdueTrainings?: number;
}

interface EmployeesResponse {
  data: Employee[];
  total: number;
  stats?: {
    total?: number;
    active?: number;
    compliantPct?: number;
    overdue?: number;
  };
  departments?: string[];
}

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'offboarded', label: 'Offboarded' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  onboarding: 'info',
  inactive: 'neutral',
  offboarded: 'neutral',
};

function getDisplayName(emp: Employee): string {
  if (emp.fullName) return emp.fullName;
  const composed = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
  return composed || emp.email;
}

function getInitials(emp: Employee): string {
  const name = getDisplayName(emp);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function CompletionBar({ pct }: { pct: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(pct)));
  const tone = safe >= 80 ? 'bg-emerald-500' : safe >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[8rem]">
      <div className="flex-1 h-1.5 rounded-full bg-surface-200 overflow-hidden">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${safe}%` }} />
      </div>
      <span className="text-xs tabular-nums text-surface-700 w-9 text-right">{safe}%</span>
    </div>
  );
}

export default function Employees() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  const department = searchParams.get('department') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const { data, isLoading, isError, refetch } = useQuery<EmployeesResponse>({
    queryKey: ['people', { search: debouncedSearch, department, status }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (department) params.department = department;
      if (status) params.status = status;
      const [list, departments, dashboard] = await Promise.all([
        employeeComplianceApi.list({ ...params, limit: 100 }),
        employeeComplianceApi.getDepartments(),
        employeeComplianceApi.getDashboard(),
      ]);
      const body = list.data ?? {};
      const rows: Employee[] = (body.data ?? []).map((employee: any) => ({
        ...employee,
        status: employee.employmentStatus,
      }));
      return {
        data: rows,
        total: body.pagination?.total ?? rows.length,
        stats: {
          total: body.pagination?.total,
          active: dashboard.data?.totalEmployees,
          compliantPct: dashboard.data?.complianceRate,
          overdue: dashboard.data?.issueBreakdown?.overdueTrainings,
        },
        departments: departments.data,
      };
    },
    staleTime: 30_000,
  });

  const employees = data?.data ?? [];
  const stats = data?.stats ?? {};

  // Build department options. Prefer server-provided list; fall back to unique values present.
  const departmentOptions: { value: string; label: string }[] = (() => {
    const fromServer = data?.departments ?? [];
    const fromRows = Array.from(
      new Set(employees.map((e) => e.department).filter((d): d is string => !!d))
    );
    const merged = Array.from(new Set([...fromServer, ...fromRows])).sort();
    return merged.map((d) => ({ value: d, label: d }));
  })();

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => {
        setSearchInput('');
      },
    });
  }
  if (department) {
    activeFilters.push({
      key: 'department',
      label: `Department: ${department}`,
      onClear: () => setParam('department', ''),
    });
  }
  if (status) {
    const lbl = STATUS_OPTS.find((s) => s.value === status)?.label ?? status;
    activeFilters.push({
      key: 'status',
      label: `Status: ${lbl}`,
      onClear: () => setParam('status', ''),
    });
  }

  const columns: DataTableColumn<Employee>[] = [
    {
      id: 'name',
      accessorKey: 'fullName',
      header: 'Employee',
      mobileLabel: 'Employee',
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {getInitials(emp)}
            </div>
            <div className="min-w-0">
              <p className="text-surface-900 truncate">{getDisplayName(emp)}</p>
              <p className="text-xs text-surface-500 truncate flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {emp.email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'jobTitle',
      accessorKey: 'jobTitle',
      header: 'Role',
      mobileLabel: 'Role',
      cell: ({ row }) =>
        row.original.jobTitle ? (
          <span className="text-surface-800">{row.original.jobTitle}</span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'department',
      accessorKey: 'department',
      header: 'Department',
      mobileLabel: 'Department',
      cell: ({ row }) =>
        row.original.department ? (
          <CategoryChip value={row.original.department} />
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant={STATUS_VARIANT[s] ?? 'neutral'} dot>
            {s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'training',
      accessorKey: 'complianceScore',
      header: 'Compliance',
      mobileLabel: 'Compliance',
      cell: ({ row }) => <CompletionBar pct={row.original.complianceScore ?? 0} />,
    },
    {
      id: 'lastCorrelatedAt',
      accessorKey: 'lastCorrelatedAt',
      header: 'Last synced',
      mobileLabel: 'Last synced',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.lastCorrelatedAt)}
        </span>
      ),
    },
  ];

  const compliantPct = Math.round(stats.compliantPct ?? 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="People"
        description="Employee compliance records correlated from connected systems."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total ?? data?.total ?? employees.length}
          icon={<Users className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Active"
          value={stats.active ?? employees.filter((e) => e.status === 'active').length}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Compliant"
          value={`${compliantPct}%`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="blue"
          caption="Employees scoring 80 or higher"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue ?? employees.reduce((sum, e) => sum + (e.overdueTrainings ?? 0), 0)}
          icon={<ClockAlert className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search name or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Departments"
          value={department}
          onChange={(v) => setParam('department', v)}
          options={departmentOptions}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={status}
          onChange={(v) => setParam('status', v)}
          options={STATUS_OPTS}
          clearable
        />
      </FilterBar>

      {isError ? (
        <div className="rounded-lg border bg-white">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="Couldn't load employees"
            description="The employee compliance service didn't respond."
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        </div>
      ) : (
        <DataTable
          data={employees}
          columns={columns}
          loading={isLoading}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/people/${r.id}`)}
          emptyState={
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="No employees found"
              description={
                activeFilters.length
                  ? 'Try clearing your filters to see all employees.'
                  : 'No employee compliance records have been correlated yet.'
              }
              action={
                activeFilters.length ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}
    </div>
  );
}
