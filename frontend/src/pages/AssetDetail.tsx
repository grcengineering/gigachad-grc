import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Cpu,
  Globe,
  MapPin,
  Pencil,
  Shield,
  User as UserIcon,
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

interface AssetRisk {
  id: string;
  riskId: string;
  title: string;
  severity: string;
  status: string;
}

interface AssetControl {
  id: string;
  controlId: string;
  title: string;
  status: string;
}

interface AssetFinding {
  id: string;
  findingNumber?: string;
  title: string;
  severity: string;
  status: string;
  reportedAt?: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  category?: string;
  criticality: string;
  status?: string;
  owner?: string;
  ownerName?: string;
  location?: string;
  environment?: string;
  os?: string;
  osVersion?: string;
  department?: string;
  lastSeenAt?: string;
  acquiredAt?: string;
  retiresAt?: string;
  decommissionedAt?: string;
  description?: string;
  source?: string;
  risks?: AssetRisk[];
  controls?: AssetControl[];
  findings?: AssetFinding[];
}

const CRITICALITY_VARIANT: Record<string, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
  very_high: 'danger',
  very_low: 'neutral',
};

const CONTROL_STATUS_VARIANT: Record<string, BadgeVariant> = {
  not_started: 'neutral',
  in_progress: 'info',
  implemented: 'success',
  not_applicable: 'neutral',
};

const FINDING_STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: 'warning',
  in_review: 'info',
  remediated: 'success',
  closed: 'neutral',
  accepted: 'neutral',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ['assets', id],
    queryFn: async () => {
      const res = await api.get(`/api/assets/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assets
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="Asset not found"
              description="The asset you're looking for doesn't exist or has been deleted."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const risks = asset.risks ?? [];
  const controls = asset.controls ?? [];
  const findings = asset.findings ?? [];

  const riskColumns: DataTableColumn<AssetRisk>[] = [
    {
      id: 'riskId',
      accessorKey: 'riskId',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <Link
          to={`/risks/${row.original.id}`}
          className="font-mono text-small text-brand-700 hover:text-brand-800"
        >
          {row.original.riskId}
        </Link>
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
          {(row.original.severity || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant="neutral" size="sm">
          {(row.original.status || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  const controlColumns: DataTableColumn<AssetControl>[] = [
    {
      id: 'controlId',
      accessorKey: 'controlId',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <Link
          to={`/controls/${row.original.id}`}
          className="font-mono text-small text-brand-700 hover:text-brand-800"
        >
          {row.original.controlId}
        </Link>
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
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={CONTROL_STATUS_VARIANT[row.original.status] ?? 'neutral'}
          size="sm"
        >
          {(row.original.status || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
  ];

  const findingColumns: DataTableColumn<AssetFinding>[] = [
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
          {(row.original.severity || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={FINDING_STATUS_VARIANT[row.original.status] ?? 'neutral'}
          size="sm"
        >
          {(row.original.status || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'reportedAt',
      accessorKey: 'reportedAt',
      header: 'Reported',
      mobileLabel: 'Reported',
      cell: ({ row }) => (
        <span className="text-small text-surface-700 tabular-nums">
          {formatDate(row.original.reportedAt)}
        </span>
      ),
    },
  ];

  const overviewTab = (
    <Card>
      <CardBody density="comfy" className="space-y-5">
        {asset.description && (
          <div>
            <h4 className="text-xs text-surface-500 uppercase tracking-wider font-medium mb-1.5">
              Description
            </h4>
            <p className="text-body text-surface-800 whitespace-pre-wrap">
              {asset.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-surface-200">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Category
            </p>
            <p className="mt-1 text-body text-surface-900 capitalize">
              {asset.category ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Source
            </p>
            <p className="mt-1 text-body text-surface-900">{asset.source ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Department
            </p>
            <p className="mt-1 text-body text-surface-900">{asset.department ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Status
            </p>
            <p className="mt-1 text-body text-surface-900 capitalize">
              {asset.status ?? '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-surface-200">
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Acquired
            </p>
            <p className="mt-1 text-body text-surface-900 tabular-nums">
              {formatDate(asset.acquiredAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Retires
            </p>
            <p className="mt-1 text-body text-surface-900 tabular-nums">
              {formatDate(asset.retiresAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
              Decommissioned
            </p>
            <p className="mt-1 text-body text-surface-900 tabular-nums">
              {formatDate(asset.decommissionedAt)}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );

  const risksTab = (
    <Card>
      <CardHeader>
        <CardTitle>Risks</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {risks.length}
        </Badge>
      </CardHeader>
      <CardBody density="cozy">
        {risks.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="No risks linked"
            description="Risks tied to this asset will appear here."
            size="sm"
          />
        ) : (
          <DataTable
            data={risks}
            columns={riskColumns}
            density="cozy"
            getRowId={(row) => row.id}
          />
        )}
      </CardBody>
    </Card>
  );

  const controlsTab = (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
        <Badge variant="neutral" size="sm" capitalize={false}>
          {controls.length}
        </Badge>
      </CardHeader>
      <CardBody density="cozy">
        {controls.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            title="No controls covering this asset"
            description="Controls scoped to this asset will appear here."
            size="sm"
          />
        ) : (
          <DataTable
            data={controls}
            columns={controlColumns}
            density="cozy"
            getRowId={(row) => row.id}
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
          {findings.length}
        </Badge>
      </CardHeader>
      <CardBody density="cozy">
        {findings.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" />}
            title="No findings"
            description="Recent findings against this asset will appear here."
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

  const osLabel = asset.os
    ? asset.osVersion
      ? `${asset.os} ${asset.osVersion}`
      : asset.os
    : '—';

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/assets"
        className="inline-flex items-center gap-1.5 text-small text-surface-600 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assets
      </Link>

      <PageHeader
        title={asset.name}
        meta={
          <>
            <Badge variant="neutral" capitalize>
              {(asset.type || '').replace(/_/g, ' ')}
            </Badge>
            <Badge
              variant={CRITICALITY_VARIANT[asset.criticality] ?? 'neutral'}
              dot
              capitalize
            >
              {(asset.criticality || '').replace(/_/g, ' ')}
            </Badge>
          </>
        }
        actions={
          <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody density="comfy">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <MetaCell label="Owner" icon={<UserIcon className="h-3.5 w-3.5" />}>
              {asset.ownerName ?? asset.owner ?? '—'}
            </MetaCell>
            <MetaCell label="Location" icon={<MapPin className="h-3.5 w-3.5" />}>
              {asset.location ?? '—'}
            </MetaCell>
            <MetaCell label="Environment" icon={<Globe className="h-3.5 w-3.5" />}>
              <span className="capitalize">{asset.environment ?? '—'}</span>
            </MetaCell>
            <MetaCell label="OS" icon={<Cpu className="h-3.5 w-3.5" />}>
              {osLabel}
            </MetaCell>
            <MetaCell label="Last seen" icon={<Calendar className="h-3.5 w-3.5" />}>
              <span className="tabular-nums">{formatDate(asset.lastSeenAt)}</span>
            </MetaCell>
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Overview', content: overviewTab },
          { label: `Risks (${risks.length})`, content: risksTab },
          { label: `Controls (${controls.length})`, content: controlsTab },
          { label: `Findings (${findings.length})`, content: findingsTab },
        ]}
      />
    </div>
  );
}
