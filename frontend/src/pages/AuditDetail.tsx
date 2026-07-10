import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  Pencil,
  AlertTriangle,
  Calendar,
  User,
  Layers,
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
  Skeleton,
  Tabs,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface Finding {
  id: string;
  findingNumber?: string;
  title: string;
  severity: string;
  status: string;
}

interface AuditRequest {
  id: string;
  requestNumber?: string;
  title: string;
  status: string;
  dueDate?: string;
}

interface Workpaper {
  id: string;
  name?: string;
  title?: string;
  reference?: string;
  status?: string;
}

interface Procedure {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  description?: string;
}

interface Audit {
  id: string;
  auditId: string;
  name: string;
  description?: string;
  auditType: string;
  framework?: string;
  status: string;
  isExternal: boolean;
  leadAuditor?: string;
  leadAuditorName?: string;
  externalFirmName?: string;
  externalFirmContact?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  scope?: string;
  findings?: Finding[];
  requests?: AuditRequest[];
  workpapers?: Workpaper[];
  procedures?: Procedure[];
  _count?: {
    findings?: number;
    requests?: number;
    workpapers?: number;
    procedures?: number;
  };
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  planning: 'info',
  fieldwork: 'warning',
  testing: 'warning',
  reporting: 'brand',
  completed: 'success',
  cancelled: 'neutral',
};

const TYPE_LABEL: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  surveillance: 'Surveillance',
  certification: 'Certification',
  regulatory: 'Regulatory',
  internal_review: 'Internal Review',
};

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  observation: 'neutral',
};

const FINDING_STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'success',
  accepted: 'neutral',
  deferred: 'neutral',
};

const REQUEST_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'neutral',
  in_progress: 'info',
  submitted: 'info',
  approved: 'success',
  completed: 'success',
  rejected: 'danger',
  overdue: 'danger',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function MetaCell({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-500 uppercase tracking-wider font-medium">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-body text-surface-900">{children}</div>
    </div>
  );
}

export default function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: audit, isLoading, error } = useQuery<Audit>({
    queryKey: ['audits', id],
    queryFn: async () => {
      const res = await api.get(`/api/audits/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/audits"
          className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Audits
        </Link>
        <Card>
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="Audit not found"
            description="The audit you're looking for doesn't exist or has been deleted."
            action={
              <Button onClick={() => navigate('/audits')} size="sm">
                Back to Audits
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const findings = audit.findings ?? [];
  const requests = audit.requests ?? [];
  const workpapers = audit.workpapers ?? [];
  const procedures = audit.procedures ?? [];
  const findingsCount = audit._count?.findings ?? findings.length;
  const typeLabel = TYPE_LABEL[audit.auditType] ?? audit.auditType;

  const findingColumns: DataTableColumn<Finding>[] = [
    {
      id: 'findingNumber',
      accessorKey: 'findingNumber',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">
          {row.original.findingNumber ?? row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => <span className="text-surface-900">{row.original.title}</span>,
    },
    {
      id: 'severity',
      accessorKey: 'severity',
      header: 'Severity',
      mobileLabel: 'Severity',
      cell: ({ row }) => (
        <Badge variant={SEVERITY_VARIANT[row.original.severity] ?? 'neutral'} size="sm">
          {row.original.severity}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant={FINDING_STATUS_VARIANT[row.original.status] ?? 'neutral'} size="sm">
          {(row.original.status || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  const overviewTab = (
    <Card>
      <CardBody density="comfy" className="space-y-5">
        {audit.description ? (
          <div>
            <h4 className="text-xs text-surface-500 uppercase tracking-wider font-medium mb-1.5">
              Description
            </h4>
            <p className="text-body text-surface-800 whitespace-pre-wrap">{audit.description}</p>
          </div>
        ) : null}
        {audit.scope ? (
          <div>
            <h4 className="text-xs text-surface-500 uppercase tracking-wider font-medium mb-1.5">
              Scope
            </h4>
            <p className="text-body text-surface-800 whitespace-pre-wrap">{audit.scope}</p>
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-200">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Actual Start
            </p>
            <p className="mt-1 text-body text-surface-900 tabular-nums">
              {formatDate(audit.actualStartDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Actual End
            </p>
            <p className="mt-1 text-body text-surface-900 tabular-nums">
              {formatDate(audit.actualEndDate)}
            </p>
          </div>
          {audit.externalFirmName && (
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                External Firm
              </p>
              <p className="mt-1 text-body text-surface-900">{audit.externalFirmName}</p>
            </div>
          )}
          {audit.externalFirmContact && (
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                Firm Contact
              </p>
              <p className="mt-1 text-body text-surface-900">{audit.externalFirmContact}</p>
            </div>
          )}
        </div>
        {!audit.description && !audit.scope && (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No overview yet"
            description="Add a description and scope to this audit."
            size="sm"
          />
        )}
      </CardBody>
    </Card>
  );

  const findingsTab = (
    <Card>
      <CardHeader>
        <CardTitle>Findings</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {findingsCount}
        </Badge>
      </CardHeader>
      <CardBody density="cozy">
        {findings.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="No findings"
            description="No findings have been recorded for this audit."
            size="sm"
          />
        ) : (
          <DataTable
            data={findings}
            columns={findingColumns}
            density="cozy"
            getRowId={(row) => row.id}
          />
        )}
      </CardBody>
    </Card>
  );

  const requestsTab = (
    <Card>
      <CardHeader>
        <CardTitle>Requests</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {requests.length}
        </Badge>
      </CardHeader>
      <CardBody density="comfy">
        {requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="No evidence requests"
            description="No requests have been created for this audit."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md bg-white border border-surface-200"
              >
                <div className="min-w-0">
                  <p className="text-surface-900 font-medium truncate">{request.title}</p>
                  <p className="text-xs text-surface-500">
                    {request.requestNumber ?? request.id.slice(0, 8)}
                    {request.dueDate ? ` · Due ${formatDate(request.dueDate)}` : ''}
                  </p>
                </div>
                <Badge variant={REQUEST_STATUS_VARIANT[request.status] ?? 'neutral'} size="sm">
                  {(request.status || '').replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  const workpapersTab = (
    <Card>
      <CardHeader>
        <CardTitle>Workpapers</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {workpapers.length}
        </Badge>
      </CardHeader>
      <CardBody density="comfy">
        {workpapers.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No workpapers"
            description="Workpapers added to this audit will appear here."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {workpapers.map((wp) => (
              <div
                key={wp.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md bg-white border border-surface-200"
              >
                <div className="min-w-0">
                  <p className="text-surface-900 font-medium truncate">
                    {wp.name ?? wp.title ?? wp.reference ?? 'Untitled workpaper'}
                  </p>
                  {wp.reference && (
                    <p className="text-xs text-surface-500 font-mono">{wp.reference}</p>
                  )}
                </div>
                {wp.status && (
                  <Badge variant="neutral" size="sm">
                    {wp.status.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  const proceduresTab = (
    <Card>
      <CardHeader>
        <CardTitle>Procedures</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {procedures.length}
        </Badge>
      </CardHeader>
      <CardBody density="comfy">
        {procedures.length === 0 ? (
          <EmptyState
            icon={<FlaskConical className="h-6 w-6" />}
            title="No procedures"
            description="Test procedures linked to this audit will appear here."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {procedures.map((proc) => (
              <div
                key={proc.id}
                className="p-3 rounded-md bg-white border border-surface-200"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-surface-900 font-medium truncate">
                    {proc.name ?? proc.title ?? 'Untitled procedure'}
                  </p>
                  {proc.status && (
                    <Badge variant="neutral" size="sm">
                      {proc.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
                {proc.description && (
                  <p className="mt-1 text-small text-surface-600">{proc.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/audits"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Audits
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-h2 text-surface-700">{audit.auditId}</span>
            <span>{audit.name}</span>
          </span>
        }
        meta={
          <Badge variant={STATUS_VARIANT[audit.status] ?? 'neutral'} dot>
            {(audit.status || '').replace(/_/g, ' ')}
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </>
        }
      />

      <Card>
        <CardBody density="comfy">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetaCell label="Type" icon={<Layers className="h-3.5 w-3.5" />}>
              {typeLabel}
            </MetaCell>
            <MetaCell label="Framework" icon={<FileText className="h-3.5 w-3.5" />}>
              {audit.framework ?? '—'}
            </MetaCell>
            <MetaCell label="Lead Auditor" icon={<User className="h-3.5 w-3.5" />}>
              {audit.leadAuditorName ?? audit.leadAuditor ?? '—'}
            </MetaCell>
            <MetaCell label="Window" icon={<Calendar className="h-3.5 w-3.5" />}>
              <span className="tabular-nums">
                {formatDate(audit.plannedStartDate)} – {formatDate(audit.plannedEndDate)}
              </span>
            </MetaCell>
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: `Findings (${findingsCount})`, content: findingsTab },
          { label: `Requests (${requests.length})`, content: requestsTab },
          { label: `Workpapers (${workpapers.length})`, content: workpapersTab },
          { label: `Procedures (${procedures.length})`, content: proceduresTab },
        ]}
      />
    </div>
  );
}
