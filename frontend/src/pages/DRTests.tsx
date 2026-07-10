import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Beaker, CheckCircle2, AlertTriangle, ListChecks, Search, Plus } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
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

// Inline debounce hook (avoids creating files outside the 6 pages while still
// debouncing the search input as called for in the spec).
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface DRTest {
  id: string;
  test_id: string;
  name: string;
  description?: string;
  test_type: string;
  status: string;
  result: string | null;
  scheduled_date: string;
  actual_end_at?: string | null;
  coordinator_name?: string;
  plan_title?: string;
  finding_count?: number;
}

interface DRTestStats {
  total?: number;
  completed_count?: number;
  passed_count?: number;
  openFindingsCount?: number;
  avg_recovery_time?: number | string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  planned: 'neutral',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
  postponed: 'warning',
};

const RESULT_VARIANT: Record<string, BadgeVariant> = {
  passed: 'success',
  passed_with_issues: 'warning',
  failed: 'danger',
  incomplete: 'neutral',
};

const TEST_TYPE_LABELS: Record<string, string> = {
  tabletop: 'Tabletop Exercise',
  walkthrough: 'Walkthrough',
  simulation: 'Simulation',
  parallel: 'Parallel Test',
  full_interruption: 'Full Interruption',
};

const TEST_TYPE_OPTIONS = Object.entries(TEST_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'postponed', label: 'Postponed' },
];

const PAGE_SIZE = 25;

function humanize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

export default function DRTests() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['dr-tests', debouncedSearch, typeFilter, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter) params.testType = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/api/bcdr/tests', { params });
      return res.data;
    },
  });

  const { data: stats } = useQuery<DRTestStats>({
    queryKey: ['dr-tests', 'stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/tests/stats');
      return res.data;
    },
    staleTime: 30_000,
  });

  const tests: DRTest[] = data?.data ?? [];
  const total: number = data?.total ?? tests.length;
  const totalPages: number = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const completedCount = Number(stats?.completed_count) || 0;
  const passedCount = Number(stats?.passed_count) || 0;
  const openFindings = Number(stats?.openFindingsCount) || 0;
  const totalCount = Number(stats?.total) || 0;

  const updateStatusFilter = (value: string) =>
    setStatusFilter(value === statusFilter ? '' : value);

  const clearAll = () => {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  };

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch)
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  if (typeFilter) {
    const l = TEST_TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? typeFilter;
    activeFilters.push({ key: 'type', label: `Type: ${l}`, onClear: () => setTypeFilter('') });
  }
  if (statusFilter) {
    const l = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({
      key: 'status',
      label: `Status: ${l}`,
      onClear: () => setStatusFilter(''),
    });
  }

  const columns: DataTableColumn<DRTest>[] = [
    {
      id: 'test_id',
      accessorKey: 'test_id',
      header: 'Test ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.test_id}</span>
      ),
    },
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="text-surface-900">{row.original.name}</p>
          {row.original.plan_title && (
            <p className="text-xs text-surface-500 truncate max-w-sm">
              Plan: {row.original.plan_title}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'test_type',
      accessorKey: 'test_type',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {TEST_TYPE_LABELS[row.original.test_type] ?? humanize(row.original.test_type)}
        </span>
      ),
    },
    {
      id: 'scheduled_date',
      accessorKey: 'scheduled_date',
      header: 'Scheduled',
      mobileLabel: 'Scheduled',
      cell: ({ row }) => {
        const d = row.original.scheduled_date;
        if (!d) return <span className="text-surface-500">—</span>;
        return <span className="text-surface-700">{new Date(d).toLocaleDateString()}</span>;
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return <span className="text-surface-500">—</span>;
        const variant = STATUS_VARIANT[status] ?? 'neutral';
        return (
          <Badge variant={variant} dot>
            {humanize(status)}
          </Badge>
        );
      },
    },
    {
      id: 'result',
      accessorKey: 'result',
      header: 'Result',
      mobileLabel: 'Result',
      cell: ({ row }) => {
        const result = row.original.result;
        if (!result) return <span className="text-surface-500">—</span>;
        const variant = RESULT_VARIANT[result] ?? 'neutral';
        return <Badge variant={variant}>{humanize(result)}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="DR Tests"
        description="Schedule and track disaster recovery test exercises."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/bcdr/tests/new')}
          >
            Schedule Test
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Tests"
          value={totalCount}
          icon={<Beaker className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={<ListChecks className="h-5 w-5" />}
          tone="blue"
          onClick={() => updateStatusFilter('completed')}
        />
        <StatCard
          label="Passed"
          value={passedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          caption={
            completedCount > 0
              ? `${Math.round((passedCount / completedCount) * 100)}% pass rate`
              : undefined
          }
        />
        <StatCard
          label="Open Findings"
          value={openFindings}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search tests…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Types"
          value={typeFilter}
          onChange={(v) => setTypeFilter(v)}
          options={TEST_TYPE_OPTIONS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={STATUS_OPTIONS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={tests}
        columns={columns}
        loading={isLoading}
        getRowId={(t) => t.id}
        onRowClick={(t) => navigate(`/bcdr/tests/${t.id}`)}
        emptyState={
          <EmptyState
            icon={<Beaker className="h-8 w-8" />}
            title="No DR tests found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all tests.'
                : 'Schedule your first DR test to start tracking recovery readiness.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate('/bcdr/tests/new')}
                >
                  Schedule Test
                </Button>
              )
            }
          />
        }
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-surface-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
