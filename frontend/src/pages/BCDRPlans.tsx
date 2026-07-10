import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
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
  type ActiveFilter,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface BCDRPlan {
  id: string;
  plan_id?: string;
  planId?: string;
  title: string;
  description?: string;
  plan_type?: string;
  planType?: string;
  status: string;
  version?: string | number;
  owner_id?: string;
  owner_name?: string;
  ownerName?: string;
  effective_date?: string;
  effectiveDate?: string;
  next_review_due?: string;
  nextReviewDue?: string;
  updated_at?: string;
  updatedAt?: string;
  last_updated?: string;
  lastUpdated?: string;
}

interface PlansResponse {
  data?: BCDRPlan[];
  plans?: BCDRPlan[];
  total?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
}

const PLAN_TYPE_OPTS: { value: string; label: string }[] = [
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'disaster_recovery', label: 'Disaster Recovery' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'crisis_communication', label: 'Crisis Communication' },
  { value: 'pandemic_response', label: 'Pandemic Response' },
  { value: 'it_recovery', label: 'IT Recovery' },
  { value: 'data_backup', label: 'Data Backup' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'info',
  published: 'success',
  archived: 'neutral',
  expired: 'danger',
};

const PAGE_SIZE = 25;

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function getPlanType(plan: BCDRPlan): string {
  return plan.planType || plan.plan_type || '';
}

function getPlanCode(plan: BCDRPlan): string {
  return plan.planId || plan.plan_id || '';
}

function getOwner(plan: BCDRPlan): string {
  return plan.ownerName || plan.owner_name || '';
}

function getLastUpdated(plan: BCDRPlan): string | undefined {
  return plan.lastUpdated || plan.last_updated || plan.updatedAt || plan.updated_at;
}

function planTypeLabel(value: string) {
  return PLAN_TYPE_OPTS.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

function statusLabel(value: string) {
  return STATUS_OPTS.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ');
}

export default function BCDRPlans() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const planType = searchParams.get('planType') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Inline debounce: push searchInput into URL after a delay.
  useEffect(() => {
    if (searchInput === search) return;
    const handle = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set('search', searchInput);
      else next.delete('search');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const clearAll = () => {
    const next = new URLSearchParams(searchParams);
    ['search', 'planType', 'status', 'page'].forEach((k) => next.delete(k));
    setSearchInput('');
    setSearchParams(next);
  };

  const { data, isLoading } = useQuery<PlansResponse>({
    queryKey: ['bcdr', 'plans', { search, planType, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (planType) params.set('planType', planType);
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      const res = await api.get(`/api/bcdr/plans?${params.toString()}`);
      return res.data ?? {};
    },
  });

  const plans: BCDRPlan[] = useMemo(() => {
    if (Array.isArray(data?.data)) return data!.data;
    if (Array.isArray(data?.plans)) return data!.plans;
    return [];
  }, [data]);

  const total = data?.total ?? plans.length;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilters: ActiveFilter[] = [];
  if (search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${search}`,
      onClear: () => updateParam('search', ''),
    });
  }
  if (planType) {
    activeFilters.push({
      key: 'planType',
      label: `Type: ${planTypeLabel(planType)}`,
      onClear: () => updateParam('planType', ''),
    });
  }
  if (status) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${statusLabel(status)}`,
      onClear: () => updateParam('status', ''),
    });
  }

  const columns: DataTableColumn<BCDRPlan>[] = [
    {
      id: 'planId',
      header: 'Plan ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{getPlanCode(row.original) || '—'}</span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-surface-900 truncate">{row.original.title}</p>
          {row.original.description && (
            <p className="text-xs text-surface-500 truncate max-w-md">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'planType',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => {
        const t = getPlanType(row.original);
        if (!t) return <span className="text-surface-500">—</span>;
        return <span className="text-surface-700">{planTypeLabel(t)}</span>;
      },
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
            {statusLabel(s)}
          </Badge>
        );
      },
    },
    {
      id: 'version',
      header: 'Version',
      mobileLabel: 'Version',
      cell: ({ row }) => (
        <span className="font-mono text-small text-surface-700">
          {row.original.version ? `v${row.original.version}` : '—'}
        </span>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      cell: ({ row }) => (
        <span className="text-surface-700">{getOwner(row.original) || '—'}</span>
      ),
    },
    {
      id: 'lastUpdated',
      header: 'Last Updated',
      mobileLabel: 'Updated',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{formatDate(getLastUpdated(row.original))}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="BC/DR Plans"
        description="Manage business continuity and disaster recovery plans."
        actions={
          <Link to="/bcdr/plans/new">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Create Plan
            </Button>
          </Link>
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
          className="w-52"
          placeholder="All Types"
          value={planType}
          onChange={(v) => updateParam('planType', v)}
          options={PLAN_TYPE_OPTS}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={status}
          onChange={(v) => updateParam('status', v)}
          options={STATUS_OPTS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={plans}
        columns={columns}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/bcdr/plans/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No plans found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all plans.'
                : 'Create your first BC/DR plan to begin tracking continuity coverage.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Link to="/bcdr/plans/new">
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Create Plan
                  </Button>
                </Link>
              )
            }
          />
        }
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => updateParam('page', String(page - 1))}
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
              onClick={() => updateParam('page', String(page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
