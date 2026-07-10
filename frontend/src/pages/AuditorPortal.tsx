import { useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ClipboardList,
  FileText,
  FolderOpen,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  SkeletonText,
  StatCard,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface PortalAudit {
  id: string;
  auditId?: string;
  name: string;
  status?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

interface PortalRequest {
  id: string;
  requestId?: string;
  requestNumber?: string;
  title?: string;
  status: string;
  dueDate?: string;
  audit?: { id?: string; auditId?: string; name?: string } | null;
  auditName?: string;
}

interface PortalWorkpaper {
  id: string;
  workpaperId?: string;
  workpaperNumber?: string;
  title: string;
  status?: string;
  audit?: { name?: string; auditId?: string } | null;
}

interface AuditorPortalResponse {
  auditorName?: string;
  auditor?: { name?: string; displayName?: string; email?: string };
  stats?: {
    activeAudits?: number;
    pendingRequests?: number;
    workpapersAwaiting?: number;
    findingsToReview?: number;
  };
  activeAudits?: PortalAudit[];
  audits?: PortalAudit[];
  requests?: PortalRequest[];
  workpapers?: PortalWorkpaper[];
}

const REQUEST_STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'info',
  in_progress: 'warning',
  submitted: 'brand',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  clarification_needed: 'warning',
};

const REQUEST_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  clarification_needed: 'Clarification Needed',
};

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatWindow(start?: string, end?: string) {
  if (!start && !end) return null;
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export default function AuditorPortal() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<AuditorPortalResponse>({
    queryKey: ['auditor-portal'],
    queryFn: async () => {
      const res = await api.get('/api/auditor/portal');
      return res.data;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/auditor/auth/logout');
    },
    onSettled: () => {
      try {
        localStorage.removeItem('auditorToken');
      } catch {
        /* ignore */
      }
      navigate('/auditor-login');
    },
  });

  const auditorName =
    data?.auditorName ??
    data?.auditor?.displayName ??
    data?.auditor?.name ??
    data?.auditor?.email ??
    'Auditor';

  const stats = data?.stats ?? {};
  const audits = useMemo(() => data?.activeAudits ?? data?.audits ?? [], [data]);
  const requests = useMemo(() => data?.requests ?? [], [data]);
  const workpapers = useMemo(() => data?.workpapers ?? [], [data]);

  const requestColumns: DataTableColumn<PortalRequest>[] = [
    {
      id: 'requestId',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">
          {row.original.requestId ??
            row.original.requestNumber ??
            row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'audit',
      header: 'Audit',
      mobileLabel: 'Audit',
      cell: ({ row }) => {
        const name = row.original.audit?.name ?? row.original.auditName;
        return name ? (
          <span className="text-surface-900">{name}</span>
        ) : (
          <span className="text-surface-500">—</span>
        );
      },
    },
    {
      id: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) =>
        row.original.title ? (
          <span className="text-surface-900">{row.original.title}</span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'dueDate',
      header: 'Due',
      mobileLabel: 'Due',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{formatDate(row.original.dueDate)}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s) return <span className="text-surface-500">—</span>;
        return (
          <Badge variant={REQUEST_STATUS_VARIANT[s] ?? 'neutral'} dot>
            {REQUEST_STATUS_LABEL[s] ?? s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <CardBody density="cozy" className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-md bg-brand-500/10 text-brand-700 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Auditor Portal</p>
              {isLoading ? (
                <SkeletonText lines={1} className="w-40" />
              ) : (
                <p className="text-h3 text-surface-900 truncate">Welcome, {auditorName}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<LogOut className="h-4 w-4" />}
            loading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            Sign out
          </Button>
        </CardBody>
      </Card>

      <PageHeader
        title="Your audit work"
        description="Active engagements, requests assigned to you, and workpapers awaiting your review."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Audits"
          value={stats.activeAudits ?? audits.length}
          icon={<ClipboardList className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingRequests ?? requests.length}
          icon={<FolderOpen className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="Workpapers Awaiting"
          value={stats.workpapersAwaiting ?? workpapers.length}
          icon={<FileText className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="Findings to Review"
          value={stats.findingsToReview ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Request inbox</CardTitle>
          </CardHeader>
          <DataTable
            data={requests}
            columns={requestColumns}
            loading={isLoading}
            getRowId={(r) => r.id}
            className="border-0 rounded-none"
            emptyState={
              <EmptyState
                icon={<FolderOpen className="h-8 w-8" />}
                title="No requests"
                description="Nothing in your inbox right now."
              />
            }
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active audits</CardTitle>
          </CardHeader>
          <CardBody density="cozy">
            {isLoading ? (
              <SkeletonText lines={4} />
            ) : audits.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-8 w-8" />}
                title="No active audits"
                description="You're not currently assigned to any active audits."
                size="sm"
              />
            ) : (
              <ul className="divide-y divide-surface-200">
                {audits.map((a) => {
                  const window = formatWindow(a.plannedStartDate, a.plannedEndDate);
                  return (
                    <li
                      key={a.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-surface-900 truncate">{a.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-surface-500">
                          {a.auditId && (
                            <span className="font-mono text-brand-700">{a.auditId}</span>
                          )}
                          {window && <span className="tabular-nums">{window}</span>}
                        </div>
                      </div>
                      {a.status && (
                        <Badge variant="info">
                          {a.status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workpapers</CardTitle>
        </CardHeader>
        <CardBody density="cozy">
          {isLoading ? (
            <SkeletonText lines={3} />
          ) : workpapers.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No workpapers"
              description="You'll see workpapers awaiting your review here."
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {workpapers.map((w) => (
                <Card key={w.id} className="border-surface-200">
                  <CardBody density="cozy" className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-brand-500/10 text-brand-700 shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-small text-surface-900 truncate">{w.title}</p>
                        {w.audit?.name && (
                          <p className="text-xs text-surface-500 truncate">{w.audit.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-brand-700">
                        {w.workpaperId ?? w.workpaperNumber ?? w.id.slice(0, 8)}
                      </span>
                      {w.status && (
                        <Badge variant="info" size="sm">
                          {w.status.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
