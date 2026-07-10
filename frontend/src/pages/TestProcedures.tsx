import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Beaker, CheckCircle, Clock, ListChecks, XCircle } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  Select,
  StatCard,
  type ActiveFilter,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface ProcedureAudit {
  id: string;
  auditId?: string;
  name?: string;
}

interface TestProcedure {
  id: string;
  procedureId?: string;
  procedureNumber?: string;
  title: string;
  status?: string;
  result?: string | null;
  conclusion?: string | null;
  steps?: unknown[];
  stepsCount?: number;
  expectedResult?: string | null;
  actualResult?: string | null;
  audit?: ProcedureAudit | null;
  auditId?: string;
}

interface ProceduresResponse {
  procedures?: TestProcedure[];
  data?: TestProcedure[];
}

const STATUS_OPTS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'blocked', label: 'Blocked' },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTS.map((o) => [o.value, o.label])
);

const RESULT_OPTS = [
  { value: 'passing', label: 'Passing' },
  { value: 'failing', label: 'Failing' },
  { value: 'partially_effective', label: 'Partially Effective' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const RESULT_LABEL: Record<string, string> = Object.fromEntries(
  RESULT_OPTS.map((o) => [o.value, o.label])
);

const RESULT_VARIANT: Record<string, BadgeVariant> = {
  passing: 'success',
  effective: 'success',
  failing: 'danger',
  ineffective: 'danger',
  partially_effective: 'warning',
  not_applicable: 'neutral',
};

function isPassing(p: TestProcedure) {
  const r = p.result ?? p.conclusion ?? '';
  return r === 'passing' || r === 'effective';
}
function isFailing(p: TestProcedure) {
  const r = p.result ?? p.conclusion ?? '';
  return r === 'failing' || r === 'ineffective';
}
function isPending(p: TestProcedure) {
  if (p.status === 'pending' || p.status === 'in_progress') return true;
  return !p.result && !p.conclusion;
}

function truncate(s: string | null | undefined, n = 80) {
  if (!s) return null;
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export default function TestProcedures() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [auditFilter, setAuditFilter] = useState('');

  const { data, isLoading } = useQuery<ProceduresResponse | TestProcedure[]>({
    queryKey: ['test-procedures', { status, result, auditFilter }],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (result) params.result = result;
      if (auditFilter) params.audit = auditFilter;
      const res = await api.get('/api/audits/test-procedures', { params });
      return res.data;
    },
  });

  const procedures: TestProcedure[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.procedures ?? data.data ?? [];
  }, [data]);

  const auditOptions = useMemo(() => {
    const map = new Map<string, string>();
    procedures.forEach((p) => {
      const id = p.audit?.id ?? p.auditId;
      if (!id) return;
      const label = p.audit?.name
        ? p.audit.auditId
          ? `${p.audit.name} (${p.audit.auditId})`
          : p.audit.name
        : id;
      if (!map.has(id)) map.set(id, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [procedures]);

  const stats = useMemo(() => {
    const total = procedures.length;
    let passing = 0;
    let failing = 0;
    let pending = 0;
    procedures.forEach((p) => {
      if (isPassing(p)) passing += 1;
      else if (isFailing(p)) failing += 1;
      if (isPending(p)) pending += 1;
    });
    return { total, passing, failing, pending };
  }, [procedures]);

  const activeFilters: ActiveFilter[] = [];
  if (status) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${STATUS_LABEL[status] ?? status}`,
      onClear: () => setStatus(''),
    });
  }
  if (result) {
    activeFilters.push({
      key: 'result',
      label: `Result: ${RESULT_LABEL[result] ?? result}`,
      onClear: () => setResult(''),
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
  const clearAll = () => {
    setStatus('');
    setResult('');
    setAuditFilter('');
  };

  const columns: DataTableColumn<TestProcedure>[] = [
    {
      id: 'procedureId',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">
          {row.original.procedureId ?? row.original.procedureNumber ?? row.original.id.slice(0, 8)}
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
      id: 'steps',
      header: 'Steps',
      mobileLabel: 'Steps',
      cell: ({ row }) => {
        const n =
          row.original.stepsCount ??
          (Array.isArray(row.original.steps) ? row.original.steps.length : 0);
        return <span className="text-surface-700 tabular-nums">{n}</span>;
      },
    },
    {
      id: 'expectedResult',
      header: 'Expected',
      mobileLabel: 'Expected',
      cell: ({ row }) => {
        const v = truncate(row.original.expectedResult, 70);
        return v ? (
          <span className="text-small text-surface-700">{v}</span>
        ) : (
          <span className="text-surface-500">—</span>
        );
      },
    },
    {
      id: 'actualResult',
      header: 'Actual',
      mobileLabel: 'Actual',
      cell: ({ row }) => {
        const v = truncate(row.original.actualResult, 70);
        return v ? (
          <span className="text-small text-surface-700">{v}</span>
        ) : (
          <span className="text-surface-500">—</span>
        );
      },
    },
    {
      id: 'result',
      header: 'Result',
      mobileLabel: 'Result',
      cell: ({ row }) => {
        const r = row.original.result ?? row.original.conclusion;
        if (!r) return <span className="text-surface-500">—</span>;
        const variant = RESULT_VARIANT[r] ?? 'neutral';
        return (
          <Badge variant={variant} dot>
            {RESULT_LABEL[r] ?? r.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Test Procedures"
        description="Control testing procedures with sampling, expected vs. actual results, and conclusions."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<ListChecks className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Passing"
          value={stats.passing}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Failing"
          value={stats.failing}
          icon={<XCircle className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Statuses"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Results"
          value={result}
          onChange={setResult}
          options={RESULT_OPTS}
          clearable
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
      </FilterBar>

      <DataTable
        data={procedures}
        columns={columns}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => {
          const auditId = p.audit?.id ?? p.auditId;
          if (auditId) navigate(`/audits/${auditId}`);
        }}
        emptyState={
          <EmptyState
            icon={<Beaker className="h-8 w-8" />}
            title="No test procedures found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all procedures.'
                : 'Test procedures will appear here once audits define them.'
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
