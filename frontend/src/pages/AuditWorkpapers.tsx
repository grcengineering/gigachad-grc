import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
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

interface WorkpaperAudit {
  id: string;
  auditId?: string;
  name?: string;
}

interface Workpaper {
  id: string;
  workpaperId?: string;
  workpaperNumber?: string;
  title: string;
  status: string;
  owner?: string;
  ownerId?: string;
  ownerName?: string;
  preparedByUser?: { displayName?: string };
  lastUpdated?: string;
  updatedAt?: string;
  audit?: WorkpaperAudit | null;
  auditId?: string;
}

interface WorkpapersResponse {
  workpapers?: Workpaper[];
  data?: Workpaper[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  pending_review: 'warning',
  in_review: 'warning',
  reviewed: 'info',
  approved: 'success',
  rejected: 'danger',
  archived: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  in_review: 'In Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

const STATUS_OPTS = Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }));

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AuditWorkpapers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery<WorkpapersResponse | Workpaper[]>({
    queryKey: ['audit-workpapers', { search: debouncedSearch, status, auditFilter, ownerFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      if (auditFilter) params.audit = auditFilter;
      if (ownerFilter) params.owner = ownerFilter;
      const res = await api.get('/api/audits/workpapers', { params });
      return res.data;
    },
  });

  const workpapers: Workpaper[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.workpapers ?? data.data ?? [];
  }, [data]);

  // Derive filter options from data
  const auditOptions = useMemo(() => {
    const map = new Map<string, string>();
    workpapers.forEach((w) => {
      const id = w.audit?.id ?? w.auditId;
      if (!id) return;
      const label = w.audit?.name
        ? w.audit.auditId
          ? `${w.audit.name} (${w.audit.auditId})`
          : w.audit.name
        : id;
      if (!map.has(id)) map.set(id, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [workpapers]);

  const ownerOptions = useMemo(() => {
    const set = new Set<string>();
    workpapers.forEach((w) => {
      const name = w.ownerName ?? w.owner ?? w.preparedByUser?.displayName;
      if (name) set.add(name);
    });
    return Array.from(set).map((name) => ({ value: name, label: name }));
  }, [workpapers]);

  const activeFilters: ActiveFilter[] = [];
  if (debouncedSearch) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${debouncedSearch}`,
      onClear: () => setSearch(''),
    });
  }
  if (status) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${STATUS_LABEL[status] ?? status}`,
      onClear: () => setStatus(''),
    });
  }
  if (auditFilter) {
    const opt = auditOptions.find((o) => o.value === auditFilter);
    activeFilters.push({
      key: 'audit',
      label: `Audit: ${opt?.label ?? auditFilter}`,
      onClear: () => setAuditFilter(''),
    });
  }
  if (ownerFilter) {
    activeFilters.push({
      key: 'owner',
      label: `Owner: ${ownerFilter}`,
      onClear: () => setOwnerFilter(''),
    });
  }
  const clearAll = () => {
    setSearch('');
    setStatus('');
    setAuditFilter('');
    setOwnerFilter('');
  };

  const columns: DataTableColumn<Workpaper>[] = [
    {
      id: 'workpaperId',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">
          {row.original.workpaperId ?? row.original.workpaperNumber ?? row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'audit',
      header: 'Audit',
      mobileLabel: 'Audit',
      cell: ({ row }) => {
        const a = row.original.audit;
        if (!a) return <span className="text-surface-500">—</span>;
        return (
          <div className="min-w-0">
            <div className="text-surface-900 truncate">{a.name ?? '—'}</div>
            {a.auditId && (
              <div className="text-xs text-surface-500 font-mono truncate">{a.auditId}</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => <span className="text-surface-900">{row.original.title}</span>,
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
            {STATUS_LABEL[s] ?? s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      cell: ({ row }) => {
        const name =
          row.original.ownerName ?? row.original.owner ?? row.original.preparedByUser?.displayName;
        return name ? (
          <span className="text-surface-700">{name}</span>
        ) : (
          <span className="text-surface-500">—</span>
        );
      },
    },
    {
      id: 'lastUpdated',
      header: 'Last Updated',
      mobileLabel: 'Updated',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.lastUpdated ?? row.original.updatedAt)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Workpapers"
        description="Formal documentation produced during fieldwork, with version control and review workflow."
      />

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search workpapers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Audits"
          value={auditFilter}
          onChange={setAuditFilter}
          options={auditOptions}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Statuses"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Owners"
          value={ownerFilter}
          onChange={setOwnerFilter}
          options={ownerOptions}
          clearable
          searchable
        />
      </FilterBar>

      <DataTable
        data={workpapers}
        columns={columns}
        loading={isLoading}
        getRowId={(w) => w.id}
        onRowClick={(w) => {
          const auditId = w.audit?.id ?? w.auditId;
          if (auditId) navigate(`/audits/${auditId}`);
        }}
        emptyState={
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No workpapers found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all workpapers.'
                : 'Workpapers will appear here once audits begin generating them.'
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
    </div>
  );
}
