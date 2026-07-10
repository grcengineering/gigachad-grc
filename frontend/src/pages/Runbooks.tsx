import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, FileEdit, AlertTriangle, Search, Plus } from 'lucide-react';
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

interface Runbook {
  id: string;
  runbook_id: string;
  title: string;
  description?: string;
  category?: string;
  system_name?: string;
  status: string;
  version?: string;
  owner_name?: string;
  process_name?: string;
  step_count?: number;
  estimated_duration_minutes?: number;
  last_reviewed_at?: string | null;
  next_review_due?: string | null;
  scenario?: string;
}

interface RunbookStats {
  total?: number;
  published_count?: number;
  draft_count?: number;
  needs_review_count?: number;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  approved: 'info',
  published: 'success',
  needs_review: 'warning',
  archived: 'neutral',
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'archived', label: 'Archived' },
];

const CATEGORY_OPTIONS = [
  { value: 'system_recovery', label: 'System Recovery' },
  { value: 'data_restore', label: 'Data Restore' },
  { value: 'failover', label: 'Failover' },
  { value: 'communication', label: 'Communication' },
  { value: 'network', label: 'Network' },
  { value: 'security', label: 'Security' },
  { value: 'general', label: 'General' },
];

const PAGE_SIZE = 25;

function humanize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

export default function Runbooks() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['runbooks', debouncedSearch, statusFilter, categoryFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await api.get('/api/bcdr/runbooks', { params });
      return res.data;
    },
  });

  const { data: stats } = useQuery<RunbookStats>({
    queryKey: ['runbooks', 'stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/runbooks/stats');
      return res.data;
    },
    staleTime: 30_000,
  });

  const runbooks: Runbook[] = Array.isArray(data) ? data : (data?.data ?? []);
  const total: number = data?.total ?? runbooks.length;
  const totalPages: number = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const clearAll = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
  };

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch)
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  if (categoryFilter) {
    const l = CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label ?? categoryFilter;
    activeFilters.push({
      key: 'category',
      label: `Category: ${l}`,
      onClear: () => setCategoryFilter(''),
    });
  }
  if (statusFilter) {
    const l = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;
    activeFilters.push({
      key: 'status',
      label: `Status: ${l}`,
      onClear: () => setStatusFilter(''),
    });
  }

  const columns: DataTableColumn<Runbook>[] = [
    {
      id: 'runbook_id',
      accessorKey: 'runbook_id',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.runbook_id}</span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => (
        <div>
          <p className="text-surface-900">{row.original.title}</p>
          {row.original.description && (
            <p className="text-xs text-surface-500 truncate max-w-md">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'scenario',
      accessorKey: 'category',
      header: 'Scenario',
      mobileLabel: 'Scenario',
      cell: ({ row }) => {
        const scenario = row.original.scenario || row.original.category;
        if (!scenario) return <span className="text-surface-500">—</span>;
        const label =
          CATEGORY_OPTIONS.find((c) => c.value === scenario)?.label ?? humanize(scenario);
        return <span className="text-surface-700">{label}</span>;
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
        return (
          <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} dot>
            {humanize(status)}
          </Badge>
        );
      },
    },
    {
      id: 'owner',
      accessorKey: 'owner_name',
      header: 'Owner',
      mobileLabel: 'Owner',
      cell: ({ row }) =>
        row.original.owner_name ? (
          <span className="text-surface-700">{row.original.owner_name}</span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'lastReviewed',
      accessorKey: 'last_reviewed_at',
      header: 'Last Reviewed',
      mobileLabel: 'Last Reviewed',
      cell: ({ row }) => {
        const d = row.original.last_reviewed_at;
        if (!d) return <span className="text-surface-500">—</span>;
        return <span className="text-surface-700">{new Date(d).toLocaleDateString()}</span>;
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Runbooks"
        description="Step-by-step recovery procedures for systems and processes."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/bcdr/runbooks/new')}
          >
            Create Runbook
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Runbooks"
          value={stats?.total ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Published"
          value={stats?.published_count ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          onClick={() => setStatusFilter(statusFilter === 'published' ? '' : 'published')}
        />
        <StatCard
          label="Drafts"
          value={stats?.draft_count ?? 0}
          icon={<FileEdit className="h-5 w-5" />}
          tone="neutral"
          onClick={() => setStatusFilter(statusFilter === 'draft' ? '' : 'draft')}
        />
        <StatCard
          label="Needs Review"
          value={stats?.needs_review_count ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
          onClick={() => setStatusFilter(statusFilter === 'needs_review' ? '' : 'needs_review')}
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search runbooks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Categories"
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v)}
          options={CATEGORY_OPTIONS}
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
        data={runbooks}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/bcdr/runbooks/${r.id}`)}
        emptyState={
          <EmptyState
            icon={<BookOpen className="h-8 w-8" />}
            title="No runbooks found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all runbooks.'
                : 'Create your first runbook to start documenting recovery procedures.'
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
                  onClick={() => navigate('/bcdr/runbooks/new')}
                >
                  Create Runbook
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
