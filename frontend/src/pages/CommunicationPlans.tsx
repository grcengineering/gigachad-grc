import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Megaphone } from 'lucide-react';
import api from '@/lib/api';
import {
  Button,
  Badge,
  PageHeader,
  FilterBar,
  Select,
  Input,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface CommunicationPlan {
  id: string;
  planId?: string;
  plan_id?: string;
  name?: string;
  title?: string;
  description?: string;
  planType?: string;
  plan_type?: string;
  audience?: string;
  channel?: string;
  status?: string;
  isActive?: boolean;
  is_active?: boolean;
  ownerName?: string;
  owner_name?: string;
  lastUpdated?: string;
  last_updated?: string;
  updatedAt?: string;
  updated_at?: string;
}

const AUDIENCE_OPTIONS = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'customer', label: 'Customers' },
  { value: 'vendor', label: 'Vendors' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'media', label: 'Media' },
  { value: 'stakeholder', label: 'Stakeholders' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
  inactive: 'neutral',
};

function pick<T>(...vals: (T | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
}

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return v;
  }
}

export default function CommunicationPlans() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') ?? '',
    audience: searchParams.get('audience') ?? '',
  };

  const [searchInput, setSearchInput] = useState(filters.search);
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (debouncedSearch) params.set('search', debouncedSearch);
        else params.delete('search');
        return params;
      },
      { replace: true }
    );
  }, [debouncedSearch, setSearchParams]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const clearAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const { data: plans = [], isLoading } = useQuery<CommunicationPlan[]>({
    queryKey: ['communication-plans', debouncedSearch, filters.audience],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.audience) params.append('audience', filters.audience);
      const qs = params.toString();
      const res = await api.get(`/api/bcdr/communication${qs ? `?${qs}` : ''}`);
      const body = res.data;
      if (Array.isArray(body)) return body;
      return body?.data ?? [];
    },
  });

  // Side-fetch escalation contacts (per task spec; result not rendered as table)
  useQuery({
    queryKey: ['communication-escalation'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/communication/escalation');
      return res.data;
    },
  });

  const activeFilters: ActiveFilter[] = [];
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      onClear: () => {
        setSearchInput('');
        updateFilter('search', '');
      },
    });
  }
  if (filters.audience) {
    const l = AUDIENCE_OPTIONS.find((o) => o.value === filters.audience)?.label ?? filters.audience;
    activeFilters.push({
      key: 'audience',
      label: `Audience: ${l}`,
      onClear: () => updateFilter('audience', ''),
    });
  }

  const columns: DataTableColumn<CommunicationPlan>[] = [
    {
      id: 'planId',
      header: 'Plan ID',
      mobileLabel: 'ID',
      cell: ({ row }) => {
        const code = pick(row.original.planId, row.original.plan_id);
        return code ? (
          <span className="font-mono text-small text-brand-700">{code}</span>
        ) : (
          <span className="text-surface-500">—</span>
        );
      },
    },
    {
      id: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => {
        const title = pick(row.original.title, row.original.name) ?? 'Untitled plan';
        return (
          <div className="min-w-0">
            <p className="text-surface-900">{title}</p>
            {row.original.description && (
              <p className="text-xs text-surface-500 truncate max-w-md">
                {row.original.description}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: 'audience',
      header: 'Audience',
      mobileLabel: 'Audience',
      cell: ({ row }) => {
        const a = row.original.audience;
        if (!a) return <span className="text-surface-500">—</span>;
        return <span className="capitalize text-surface-700">{a.replace(/_/g, ' ')}</span>;
      },
    },
    {
      id: 'channel',
      header: 'Channel',
      mobileLabel: 'Channel',
      cell: ({ row }) => {
        const c = row.original.channel;
        if (!c) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant="info" size="sm">
            {c.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const explicit = row.original.status;
        const isActive = pick(row.original.isActive, row.original.is_active);
        const s =
          explicit ?? (isActive === undefined ? undefined : isActive ? 'active' : 'inactive');
        if (!s) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant={STATUS_VARIANT[s] ?? 'neutral'} dot>
            {s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {pick(row.original.ownerName, row.original.owner_name) ?? '—'}
        </span>
      ),
    },
    {
      id: 'lastUpdated',
      header: 'Last Updated',
      mobileLabel: 'Updated',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {formatDate(
            pick(
              row.original.lastUpdated,
              row.original.last_updated,
              row.original.updatedAt,
              row.original.updated_at
            )
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Communication Plans"
        description="Emergency contact lists, stakeholder messaging, and escalation paths."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Create Plan
          </Button>
        }
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search plans…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Audiences"
          value={filters.audience}
          onChange={(v) => updateFilter('audience', v)}
          options={AUDIENCE_OPTIONS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={plans}
        columns={columns}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/bcdr/communication/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<Megaphone className="h-8 w-8" />}
            title="No communication plans found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all plans.'
                : 'Create your first communication plan to coordinate emergency messaging.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create Plan
                </Button>
              )
            }
          />
        }
      />
    </div>
  );
}
