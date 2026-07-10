import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Workflow, Search, Plus } from 'lucide-react';
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

interface BusinessProcess {
  id: string;
  process_id: string;
  name: string;
  description?: string;
  department?: string;
  category?: string;
  criticality_tier: string;
  criticality?: string;
  rto_hours?: number;
  rpo_hours?: number;
  is_active?: boolean;
  owner_name?: string;
  next_review_due?: string | null;
  dependency_count?: number;
  asset_count?: number;
}

const TIER_VARIANT: Record<string, BadgeVariant> = {
  tier_1_critical: 'danger',
  tier_2_essential: 'warning',
  tier_3_important: 'info',
  tier_4_standard: 'neutral',
};

const TIER_LABELS: Record<string, string> = {
  tier_1_critical: 'Tier 1 — Critical',
  tier_2_essential: 'Tier 2 — Essential',
  tier_3_important: 'Tier 3 — Important',
  tier_4_standard: 'Tier 4 — Standard',
};

const TIER_OPTIONS = [
  { value: 'tier_1_critical', label: 'Tier 1 — Critical' },
  { value: 'tier_2_essential', label: 'Tier 2 — Essential' },
  { value: 'tier_3_important', label: 'Tier 3 — Important' },
  { value: 'tier_4_standard', label: 'Tier 4 — Standard' },
];

const CRITICALITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

const CRITICALITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CATEGORY_OPTIONS = [
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'sales', label: 'Sales' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'support', label: 'Support' },
  { value: 'hr', label: 'HR' },
  { value: 'legal', label: 'Legal' },
];

const PAGE_SIZE = 25;

function humanize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

export default function BusinessProcesses() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tierFilter, categoryFilter, criticalityFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ['business-processes', debouncedSearch, tierFilter, categoryFilter, criticalityFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.search = debouncedSearch;
      if (tierFilter) params.criticalityTier = tierFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (criticalityFilter) params.criticality = criticalityFilter;
      const res = await api.get('/api/bcdr/processes', { params });
      return res.data;
    },
  });

  const processes: BusinessProcess[] = data?.data ?? [];
  const total: number = data?.total ?? processes.length;
  const totalPages: number = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tierCounts = processes.reduce<Record<string, number>>((acc, p) => {
    if (p.criticality_tier) acc[p.criticality_tier] = (acc[p.criticality_tier] ?? 0) + 1;
    return acc;
  }, {});

  const clearAll = () => {
    setSearch('');
    setTierFilter('');
    setCategoryFilter('');
    setCriticalityFilter('');
  };

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch)
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  if (tierFilter) {
    const l = TIER_OPTIONS.find((o) => o.value === tierFilter)?.label ?? tierFilter;
    activeFilters.push({ key: 'tier', label: `Tier: ${l}`, onClear: () => setTierFilter('') });
  }
  if (categoryFilter) {
    const l = CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label ?? categoryFilter;
    activeFilters.push({
      key: 'category',
      label: `Category: ${l}`,
      onClear: () => setCategoryFilter(''),
    });
  }
  if (criticalityFilter) {
    const l =
      CRITICALITY_OPTIONS.find((o) => o.value === criticalityFilter)?.label ?? criticalityFilter;
    activeFilters.push({
      key: 'criticality',
      label: `Criticality: ${l}`,
      onClear: () => setCriticalityFilter(''),
    });
  }

  const columns: DataTableColumn<BusinessProcess>[] = [
    {
      id: 'process_id',
      accessorKey: 'process_id',
      header: 'Process ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.process_id}</span>
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
          {row.original.description && (
            <p className="text-xs text-surface-500 truncate max-w-md">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'tier',
      accessorKey: 'criticality_tier',
      header: 'Tier',
      mobileLabel: 'Tier',
      cell: ({ row }) => {
        const tier = row.original.criticality_tier;
        if (!tier) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant={TIER_VARIANT[tier] ?? 'neutral'}>
            {TIER_LABELS[tier] ?? humanize(tier)}
          </Badge>
        );
      },
    },
    {
      id: 'criticality',
      accessorKey: 'criticality',
      header: 'Criticality',
      mobileLabel: 'Criticality',
      cell: ({ row }) => {
        const c = row.original.criticality;
        if (!c) return <span className="text-surface-500">—</span>;
        return <Badge variant={CRITICALITY_VARIANT[c] ?? 'neutral'}>{humanize(c)}</Badge>;
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
      id: 'rto',
      accessorKey: 'rto_hours',
      header: 'RTO',
      mobileLabel: 'RTO',
      cell: ({ row }) =>
        row.original.rto_hours !== undefined && row.original.rto_hours !== null ? (
          <span className="text-surface-700">{row.original.rto_hours}h</span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'rpo',
      accessorKey: 'rpo_hours',
      header: 'RPO',
      mobileLabel: 'RPO',
      cell: ({ row }) =>
        row.original.rpo_hours !== undefined && row.original.rpo_hours !== null ? (
          <span className="text-surface-700">{row.original.rpo_hours}h</span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Business Processes"
        description="Track critical business processes and their recovery objectives."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/bcdr/processes/new')}
          >
            Add Process
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TIER_OPTIONS.map((tier) => (
          <StatCard
            key={tier.value}
            label={tier.label}
            value={tierCounts[tier.value] ?? 0}
            icon={<Workflow className="h-5 w-5" />}
            tone={
              tier.value === 'tier_1_critical'
                ? 'red'
                : tier.value === 'tier_2_essential'
                  ? 'amber'
                  : tier.value === 'tier_3_important'
                    ? 'blue'
                    : 'neutral'
            }
            onClick={() => setTierFilter(tierFilter === tier.value ? '' : tier.value)}
          />
        ))}
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search processes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-52"
          placeholder="All Tiers"
          value={tierFilter}
          onChange={(v) => setTierFilter(v)}
          options={TIER_OPTIONS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
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
          placeholder="All Criticality"
          value={criticalityFilter}
          onChange={(v) => setCriticalityFilter(v)}
          options={CRITICALITY_OPTIONS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={processes}
        columns={columns}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/bcdr/processes/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<Workflow className="h-8 w-8" />}
            title="No business processes found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all processes.'
                : 'Add a business process to start tracking continuity requirements.'
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
                  onClick={() => navigate('/bcdr/processes/new')}
                >
                  Add Process
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
