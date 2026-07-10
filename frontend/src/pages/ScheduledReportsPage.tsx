import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Play, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  CategoryChip,
  DataTable,
  Dialog,
  EmptyState,
  PageHeader,
  type DataTableColumn,
} from '@/components/ui';

interface ScheduledReportRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  durationMs?: number;
  fileUrl?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  templateLabel?: string;
  schedule: string;
  scheduleLabel?: string;
  format: 'pdf' | 'xlsx' | 'csv';
  recipients: string[];
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'running' | 'pending';
  runs?: ScheduledReportRun[];
}

interface ScheduledReportsResponse {
  reports: ScheduledReport[];
}

const STATUS_VARIANT: Record<
  string,
  'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'
> = {
  success: 'success',
  failed: 'danger',
  running: 'info',
  pending: 'warning',
};

function formatDateTime(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

function templateLabel(report: ScheduledReport): string {
  if (report.templateLabel) return report.templateLabel;
  return report.templateId
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scheduleLabel(report: ScheduledReport): string {
  if (report.scheduleLabel) return report.scheduleLabel;
  switch (report.schedule) {
    case 'one_time':
      return 'One-time';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return report.schedule;
  }
}

export default function ScheduledReportsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [detailReport, setDetailReport] = useState<ScheduledReport | null>(null);

  const { data, isLoading } = useQuery<ScheduledReportsResponse>({
    queryKey: ['reports', 'scheduled'],
    queryFn: async () => {
      const res = await api.get('/api/reports/scheduled');
      const payload = res.data;
      if (Array.isArray(payload)) return { reports: payload };
      return { reports: payload?.reports ?? [] };
    },
  });

  const reports = data?.reports ?? [];

  const runMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/reports/scheduled/${id}/run`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/reports/scheduled/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'scheduled'] });
      setDetailReport(null);
    },
  });

  const handleDelete = (report: ScheduledReport) => {
    if (
      !window.confirm(
        `Delete "${report.name}"? This cannot be undone.`,
      )
    )
      return;
    deleteMutation.mutate(report.id);
  };

  const columns: DataTableColumn<ScheduledReport>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => (
        <span className="text-surface-900 font-medium">{row.original.name}</span>
      ),
    },
    {
      id: 'template',
      accessorKey: 'templateId',
      header: 'Template',
      mobileLabel: 'Template',
      cell: ({ row }) => (
        <CategoryChip
          value={row.original.templateId}
          label={templateLabel(row.original)}
        />
      ),
    },
    {
      id: 'schedule',
      accessorKey: 'schedule',
      header: 'Schedule',
      mobileLabel: 'Schedule',
      cell: ({ row }) => (
        <span className="text-surface-700">{scheduleLabel(row.original)}</span>
      ),
    },
    {
      id: 'format',
      accessorKey: 'format',
      header: 'Format',
      mobileLabel: 'Format',
      cell: ({ row }) => (
        <Badge variant="neutral" capitalize={false}>
          {row.original.format.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: 'lastRun',
      accessorKey: 'lastRunAt',
      header: 'Last run',
      mobileLabel: 'Last run',
      cell: ({ row }) => {
        const { lastRunAt, lastRunStatus } = row.original;
        if (!lastRunAt)
          return <span className="text-surface-500">Never</span>;
        return (
          <div className="flex items-center gap-2">
            <span className="text-surface-700">{formatDateTime(lastRunAt)}</span>
            {lastRunStatus && (
              <Badge
                variant={STATUS_VARIANT[lastRunStatus] ?? 'neutral'}
                dot
                size="sm"
              >
                {lastRunStatus}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'recipients',
      accessorKey: 'recipients',
      header: 'Recipients',
      mobileLabel: 'Recipients',
      cell: ({ row }) => {
        const list = row.original.recipients ?? [];
        if (list.length === 0)
          return <span className="text-surface-500">—</span>;
        return (
          <span className="text-surface-700">
            {list.length === 1 ? list[0] : `${list[0]} +${list.length - 1}`}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Play className="h-3.5 w-3.5" />}
            loading={
              runMutation.isPending && runMutation.variables === row.original.id
            }
            onClick={(e) => {
              e.stopPropagation();
              runMutation.mutate(row.original.id);
            }}
          >
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row.original);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Scheduled Reports"
        description="Recurring and one-time GRC reports configured for your organization."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/reports/builder')}
          >
            Schedule new report
          </Button>
        }
      />

      <DataTable
        data={reports}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        onRowClick={(r) => setDetailReport(r)}
        emptyState={
          <EmptyState
            icon={<CalendarClock className="h-8 w-8" />}
            title="No scheduled reports"
            description="Schedule your first report to start delivering recurring GRC insights to stakeholders."
            action={
              <Button
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/reports/builder')}
              >
                Schedule new report
              </Button>
            }
          />
        }
      />

      <Dialog
        open={!!detailReport}
        onClose={() => setDetailReport(null)}
        title={detailReport?.name ?? 'Report details'}
        description={
          detailReport
            ? `${templateLabel(detailReport)} · ${scheduleLabel(detailReport)}`
            : undefined
        }
        size="lg"
        footer={
          detailReport && (
            <div className="flex items-center justify-between gap-2 w-full">
              <Button
                variant="danger"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={deleteMutation.isPending}
                onClick={() => handleDelete(detailReport)}
              >
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setDetailReport(null)}
                >
                  Close
                </Button>
                <Button
                  leftIcon={<Play className="h-4 w-4" />}
                  loading={
                    runMutation.isPending &&
                    runMutation.variables === detailReport.id
                  }
                  onClick={() => runMutation.mutate(detailReport.id)}
                >
                  Run now
                </Button>
              </div>
            </div>
          )
        }
      >
        {detailReport && (
          <div className="space-y-5">
            <div>
              <h4 className="text-h3 text-surface-900 mb-2">Recipients</h4>
              {detailReport.recipients && detailReport.recipients.length > 0 ? (
                <ul className="space-y-1">
                  {detailReport.recipients.map((r) => (
                    <li
                      key={r}
                      className="text-small text-surface-800 font-mono"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-surface-500">
                  No recipients configured.
                </p>
              )}
            </div>

            <div>
              <h4 className="text-h3 text-surface-900 mb-2">Run history</h4>
              {detailReport.runs && detailReport.runs.length > 0 ? (
                <div className="rounded-lg border border-surface-200 bg-white overflow-hidden">
                  <table className="w-full text-small">
                    <thead className="bg-surface-50/40">
                      <tr className="border-b border-surface-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                          Started
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                          Finished
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-surface-600 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailReport.runs.map((run) => (
                        <tr
                          key={run.id}
                          className="border-b border-surface-200/60 last:border-b-0"
                        >
                          <td className="px-3 py-2 text-surface-800">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="px-3 py-2 text-surface-800">
                            {formatDateTime(run.finishedAt)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={STATUS_VARIANT[run.status] ?? 'neutral'}
                              dot
                            >
                              {run.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-small text-surface-500">
                  This report has not run yet.
                </p>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
