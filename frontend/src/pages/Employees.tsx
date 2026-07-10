import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  ClockAlert,
  ShieldCheck,
  Search,
  Mail,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
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
  trainingCompletionPct?: number;
  lastTrainingAt?: string;
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
  const tone =
    safe >= 80 ? 'bg-emerald-500' : safe >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[8rem]">
      <div className="flex-1 h-1.5 rounded-full bg-surface-200 overflow-hidden">
        <div
          className={`h-full ${tone} transition-all`}
          style={{ width: `${safe}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-surface-700 w-9 text-right">
        {safe}%
      </span>
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

  const { data, isLoading } = useQuery<EmployeesResponse>({
    queryKey: ['people', { search: debouncedSearch, department, status }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (department) params.department = department;
      if (status) params.status = status;
      const res = await api.get('/api/people', { params });
      const body = res.data ?? {};
      const rows: Employee[] = Array.isArray(body)
        ? body
        : (body.data ?? body.people ?? body.employees ?? []);
      return {
        data: rows,
        total: body.total ?? rows.length,
        stats: body.stats,
        departments: body.departments,
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
      new Set(employees.map((e) => e.department).filter((d): d is string => !!d)),
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
      accessorKey: 'trainingCompletionPct',
      header: 'Training',
      mobileLabel: 'Training',
      cell: ({ row }) => (
        <CompletionBar pct={row.original.trainingCompletionPct ?? 0} />
      ),
    },
    {
      id: 'lastTrainingAt',
      accessorKey: 'lastTrainingAt',
      header: 'Last Training',
      mobileLabel: 'Last Training',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.lastTrainingAt)}
        </span>
      ),
    },
  ];

  const compliantPct = Math.round(stats.compliantPct ?? 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="People"
        description="Employees, training, and access compliance."
        actions={
          <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
            Invite employee
          </Button>
        }
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
          value={
            stats.active ??
            employees.filter((e) => e.status === 'active').length
          }
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Compliant"
          value={`${compliantPct}%`}
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="blue"
          caption="Training up to date"
        />
        <StatCard
          label="Overdue"
          value={
            stats.overdue ??
            employees.reduce((sum, e) => sum + (e.overdueTrainings ?? 0), 0)
          }
          icon={<ClockAlert className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <FilterBar
        active={activeFilters}
        onClearAll={activeFilters.length ? clearAll : undefined}
      >
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
                : 'Invite an employee or connect an HRIS integration to begin.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
                  Invite employee
                </Button>
              )
            }
          />
        }
      />
    </div>
  );
}
