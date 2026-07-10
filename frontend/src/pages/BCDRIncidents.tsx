import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Search,
  Activity,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
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
  StatCard,
  type DataTableColumn,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface BCDRIncident {
  id: string;
  incidentId?: string;
  incident_id?: string;
  title: string;
  description?: string;
  incidentType?: string;
  incident_type?: string;
  severity: string;
  status: string;
  declaredAt?: string;
  declared_at?: string;
  resolvedAt?: string;
  resolved_at?: string;
  declaredByName?: string;
  declared_by_name?: string;
  commanderName?: string;
  commander_name?: string;
}

interface IncidentStats {
  total?: number;
  active_count?: number;
  declared_count?: number;
  in_progress_count?: number;
  recovering_count?: number;
  resolved_count?: number;
  resolved_this_month?: number;
}

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'major', label: 'Major' },
  { value: 'medium', label: 'Medium' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
  { value: 'minor', label: 'Minor' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'declared', label: 'Declared' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'recovering', label: 'Recovering' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  major: 'danger',
  medium: 'warning',
  moderate: 'warning',
  low: 'info',
  minor: 'info',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'danger',
  declared: 'danger',
  in_progress: 'warning',
  recovering: 'warning',
  resolved: 'success',
  closed: 'neutral',
};

function getIncidentCode(i: BCDRIncident) {
  return i.incidentId ?? i.incident_id ?? '';
}

function getDeclaredAt(i: BCDRIncident) {
  return i.declaredAt ?? i.declared_at;
}

function getResolvedAt(i: BCDRIncident) {
  return i.resolvedAt ?? i.resolved_at;
}

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function BCDRIncidents() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    search: searchParams.get('search') ?? '',
    severity: searchParams.get('severity') ?? '',
    status: searchParams.get('status') ?? '',
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
      { replace: true },
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

  const { data: incidents = [], isLoading } = useQuery<BCDRIncident[]>({
    queryKey: ['bcdr-incidents', debouncedSearch, filters.severity, filters.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.status) params.append('status', filters.status);
      const qs = params.toString();
      const res = await api.get(`/api/bcdr/incidents${qs ? `?${qs}` : ''}`);
      const body = res.data;
      if (Array.isArray(body)) return body;
      return body?.data ?? [];
    },
  });

  const { data: stats } = useQuery<IncidentStats>({
    queryKey: ['bcdr-incidents-stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/incidents/stats');
      return res.data ?? {};
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
  if (filters.severity) {
    const l = SEVERITY_OPTIONS.find((o) => o.value === filters.severity)?.label ?? filters.severity;
    activeFilters.push({
      key: 'severity',
      label: `Severity: ${l}`,
      onClear: () => updateFilter('severity', ''),
    });
  }
  if (filters.status) {
    const l = STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? filters.status;
    activeFilters.push({
      key: 'status',
      label: `Status: ${l}`,
      onClear: () => updateFilter('status', ''),
    });
  }

  const columns: DataTableColumn<BCDRIncident>[] = [
    {
      id: 'incidentId',
      header: 'Incident ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{getIncidentCode(row.original)}</span>
      ),
    },
    {
      id: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-surface-900">{row.original.title}</p>
          {row.original.description && (
            <p className="text-xs text-surface-500 truncate max-w-md">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      mobileLabel: 'Severity',
      cell: ({ row }) => {
        const s = row.original.severity;
        if (!s) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant={SEVERITY_VARIANT[s] ?? 'neutral'} dot>
            {s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'status',
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
      id: 'declaredAt',
      header: 'Declared',
      mobileLabel: 'Declared',
      cell: ({ row }) => <span className="text-surface-700">{formatDate(getDeclaredAt(row.original))}</span>,
    },
    {
      id: 'resolvedAt',
      header: 'Resolved',
      mobileLabel: 'Resolved',
      cell: ({ row }) => <span className="text-surface-700">{formatDate(getResolvedAt(row.original))}</span>,
    },
  ];

  const activeCount =
    stats?.active_count ??
    incidents.filter((i) => i.status === 'active').length;
  const declaredCount =
    stats?.declared_count ??
    incidents.filter((i) => i.status === 'declared').length;
  const inProgressCount =
    stats?.in_progress_count ??
    stats?.recovering_count ??
    incidents.filter((i) => i.status === 'in_progress' || i.status === 'recovering').length;
  const resolvedCount =
    stats?.resolved_this_month ?? stats?.resolved_count ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="BC/DR Incidents"
        description="Track and manage business continuity and disaster recovery incidents."
        actions={
          <Button size="sm" leftIcon={<AlertTriangle className="h-4 w-4" />}>
            Declare Incident
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          value={activeCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          onClick={() => updateFilter('status', filters.status === 'active' ? '' : 'active')}
        />
        <StatCard
          label="Declared"
          value={declaredCount}
          icon={<PlayCircle className="h-5 w-5" />}
          tone="amber"
          onClick={() => updateFilter('status', filters.status === 'declared' ? '' : 'declared')}
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<Activity className="h-5 w-5" />}
          tone="blue"
          onClick={() => updateFilter('status', filters.status === 'in_progress' ? '' : 'in_progress')}
        />
        <StatCard
          label="Resolved This Month"
          value={resolvedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search incidents…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Severities"
          value={filters.severity}
          onChange={(v) => updateFilter('severity', v)}
          options={SEVERITY_OPTIONS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          options={STATUS_OPTIONS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={incidents}
        columns={columns}
        loading={isLoading}
        getRowId={(i) => i.id}
        onRowClick={(i) => navigate(`/bcdr/incidents/${i.id}`)}
        emptyState={
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No incidents found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all incidents.'
                : 'When an incident is declared it will appear here.'
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
