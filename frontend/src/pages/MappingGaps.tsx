import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileText, Link2, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  CategoryChip,
  DataTable,
  EmptyState,
  PageHeader,
  Skeleton,
  StatCard,
  Tabs,
  type DataTableColumn,
} from '@/components/ui';

interface RequirementGap {
  id: string;
  framework: string;
  requirementCode: string;
  requirementTitle: string;
  mappedControlCount: number;
}

interface ControlGap {
  id: string;
  controlCode: string;
  controlTitle: string;
  evidenceCount: number;
  lastReviewDate?: string;
}

interface EvidenceGap {
  id: string;
  evidenceTitle: string;
  type: string;
  status: string;
  daysPending: number;
}

interface MappingGapsResponse {
  totals?: {
    totalGaps?: number;
    requirementsWithoutControls?: number;
    controlsWithoutEvidence?: number;
    evidenceWithoutApproval?: number;
  };
  requirementGaps?: RequirementGap[];
  controlGaps?: ControlGap[];
  evidenceGaps?: EvidenceGap[];
}

const EVIDENCE_STATUS_VARIANT: Record<
  string,
  'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'
> = {
  approved: 'success',
  pending: 'warning',
  pending_review: 'warning',
  in_review: 'info',
  rejected: 'danger',
  expired: 'danger',
  draft: 'neutral',
};

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

function severityFromMappedCount(count: number): {
  variant: 'success' | 'warning' | 'danger';
  label: string;
} {
  if (count === 0) return { variant: 'danger', label: 'Critical' };
  if (count <= 2) return { variant: 'warning', label: 'Partial' };
  return { variant: 'success', label: 'Covered' };
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join(
    '\n'
  );
}

export default function MappingGaps() {
  const { data, isLoading } = useQuery<MappingGapsResponse>({
    queryKey: ['reports', 'mapping-gaps'],
    queryFn: async () => {
      const res = await api.get('/api/reports/mapping-gaps');
      return res.data ?? {};
    },
  });

  const requirementGaps = useMemo(() => data?.requirementGaps ?? [], [data?.requirementGaps]);
  const controlGaps = useMemo(() => data?.controlGaps ?? [], [data?.controlGaps]);
  const evidenceGaps = useMemo(() => data?.evidenceGaps ?? [], [data?.evidenceGaps]);

  const handleExportCSV = () => {
    const sections: { name: string; rows: Record<string, unknown>[] }[] = [
      {
        name: 'requirements_to_controls',
        rows: requirementGaps.map((r) => ({
          framework: r.framework,
          requirement_code: r.requirementCode,
          requirement_title: r.requirementTitle,
          mapped_controls: r.mappedControlCount,
          severity: severityFromMappedCount(r.mappedControlCount).label,
        })),
      },
      {
        name: 'controls_to_evidence',
        rows: controlGaps.map((c) => ({
          control_code: c.controlCode,
          control_title: c.controlTitle,
          evidence_count: c.evidenceCount,
          last_review_date: c.lastReviewDate ?? '',
        })),
      },
      {
        name: 'evidence_to_approval',
        rows: evidenceGaps.map((e) => ({
          evidence_title: e.evidenceTitle,
          type: e.type,
          status: e.status,
          days_pending: e.daysPending,
        })),
      },
    ];
    const body = sections.map((s) => `# ${s.name}\n${toCSV(s.rows)}`).join('\n\n');
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapping-gaps-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const requirementColumns: DataTableColumn<RequirementGap>[] = [
    {
      id: 'framework',
      accessorKey: 'framework',
      header: 'Framework',
      mobileLabel: 'Framework',
      cell: ({ row }) => <CategoryChip value={row.original.framework} case="upper" />,
    },
    {
      id: 'requirementCode',
      accessorKey: 'requirementCode',
      header: 'Code',
      mobileLabel: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.requirementCode}</span>
      ),
    },
    {
      id: 'requirementTitle',
      accessorKey: 'requirementTitle',
      header: 'Requirement',
      mobileLabel: 'Requirement',
      cell: ({ row }) => <span className="text-surface-900">{row.original.requirementTitle}</span>,
    },
    {
      id: 'mappedControlCount',
      accessorKey: 'mappedControlCount',
      header: 'Mapped controls',
      mobileLabel: 'Mapped',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{row.original.mappedControlCount}</span>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      mobileLabel: 'Severity',
      cell: ({ row }) => {
        const s = severityFromMappedCount(row.original.mappedControlCount);
        return (
          <Badge variant={s.variant} dot>
            {s.label}
          </Badge>
        );
      },
    },
  ];

  const controlColumns: DataTableColumn<ControlGap>[] = [
    {
      id: 'controlCode',
      accessorKey: 'controlCode',
      header: 'Code',
      mobileLabel: 'Code',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.controlCode}</span>
      ),
    },
    {
      id: 'controlTitle',
      accessorKey: 'controlTitle',
      header: 'Control',
      mobileLabel: 'Control',
      cell: ({ row }) => <span className="text-surface-900">{row.original.controlTitle}</span>,
    },
    {
      id: 'evidenceCount',
      accessorKey: 'evidenceCount',
      header: 'Evidence',
      mobileLabel: 'Evidence',
      cell: ({ row }) => {
        const c = row.original.evidenceCount;
        const variant: 'success' | 'warning' | 'danger' =
          c === 0 ? 'danger' : c <= 2 ? 'warning' : 'success';
        return (
          <Badge variant={variant} dot>
            {c}
          </Badge>
        );
      },
    },
    {
      id: 'lastReviewDate',
      accessorKey: 'lastReviewDate',
      header: 'Last review',
      mobileLabel: 'Last review',
      cell: ({ row }) => (
        <span className="text-surface-700">{formatDate(row.original.lastReviewDate)}</span>
      ),
    },
  ];

  const evidenceColumns: DataTableColumn<EvidenceGap>[] = [
    {
      id: 'evidenceTitle',
      accessorKey: 'evidenceTitle',
      header: 'Evidence',
      mobileLabel: 'Evidence',
      cell: ({ row }) => <span className="text-surface-900">{row.original.evidenceTitle}</span>,
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => <CategoryChip value={row.original.type} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = EVIDENCE_STATUS_VARIANT[status] ?? 'neutral';
        return (
          <Badge variant={variant} dot>
            {status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'daysPending',
      accessorKey: 'daysPending',
      header: 'Days pending',
      mobileLabel: 'Days pending',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{row.original.daysPending}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Mapping Gaps"
          description="Find unmapped requirements, controls without evidence, and stalled approvals."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totals = data?.totals ?? {};

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Mapping Gaps"
        description="Find unmapped requirements, controls without evidence, and stalled approvals."
        actions={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Gaps"
          value={totals.totalGaps ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
        <StatCard
          label="Requirements w/o Controls"
          value={totals.requirementsWithoutControls ?? 0}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Controls w/o Evidence"
          value={totals.controlsWithoutEvidence ?? 0}
          icon={<Link2 className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Evidence w/o Approval"
          value={totals.evidenceWithoutApproval ?? 0}
          icon={<FileText className="h-5 w-5" />}
          tone="purple"
        />
      </div>

      <Tabs
        tabs={[
          {
            label: `Requirements → Controls (${requirementGaps.length})`,
            content: (
              <DataTable
                data={requirementGaps}
                columns={requirementColumns}
                getRowId={(r) => r.id}
                emptyState={
                  <EmptyState
                    icon={<CheckCircle2 className="h-8 w-8" />}
                    title="No requirement gaps"
                    description="Every requirement has at least one mapped control."
                  />
                }
              />
            ),
          },
          {
            label: `Controls → Evidence (${controlGaps.length})`,
            content: (
              <DataTable
                data={controlGaps}
                columns={controlColumns}
                getRowId={(r) => r.id}
                emptyState={
                  <EmptyState
                    icon={<CheckCircle2 className="h-8 w-8" />}
                    title="No control evidence gaps"
                    description="Every control has supporting evidence."
                  />
                }
              />
            ),
          },
          {
            label: `Evidence → Approval (${evidenceGaps.length})`,
            content: (
              <DataTable
                data={evidenceGaps}
                columns={evidenceColumns}
                getRowId={(r) => r.id}
                emptyState={
                  <EmptyState
                    icon={<CheckCircle2 className="h-8 w-8" />}
                    title="No pending approvals"
                    description="All evidence has been reviewed and approved."
                  />
                }
              />
            ),
          },
        ]}
      />
    </div>
  );
}
