import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Edit2,
  Key,
  Mail,
  MapPin,
  ShieldCheck,
  UserIcon,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CategoryChip,
  DataTable,
  EmptyState,
  PageHeader,
  Skeleton,
  Tabs,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface TrainingRecord {
  id: string;
  courseName?: string;
  courseType?: string;
  status?: string;
  dueDate?: string;
  completedAt?: string;
  score?: number;
}

interface Certification {
  id: string;
  name: string;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: string;
}

interface Attestation {
  id: string;
  policyTitle?: string;
  policyCategory?: string;
  status?: string;
  requestedAt?: string;
  respondedAt?: string;
}

interface AssignedControl {
  id: string;
  controlId?: string;
  title: string;
  status?: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface SystemAccess {
  id: string;
  system: string;
  accessLevel?: string;
  lastAccessed?: string;
  source?: string;
}

interface EmployeeDetailData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  jobTitle?: string;
  department?: string;
  status?: string;
  location?: string;
  hireDate?: string;
  managerName?: string;
  managerEmail?: string;
  employmentType?: string;
  mfaEnabled?: boolean;
  ssoEnabled?: boolean;
  lastLoginAt?: string;
  trainingRecords?: TrainingRecord[];
  certifications?: Certification[];
  attestations?: Attestation[];
  assignedControls?: AssignedControl[];
  permissionGroups?: PermissionGroup[];
  systemAccess?: SystemAccess[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  onboarding: 'info',
  inactive: 'neutral',
  offboarded: 'neutral',
};

const TRAINING_STATUS_VARIANT: Record<string, BadgeVariant> = {
  completed: 'success',
  passed: 'success',
  assigned: 'info',
  in_progress: 'info',
  pending: 'warning',
  overdue: 'danger',
  failed: 'danger',
};

const ATTESTATION_STATUS_VARIANT: Record<string, BadgeVariant> = {
  acknowledged: 'success',
  approved: 'success',
  pending: 'warning',
  declined: 'danger',
  overdue: 'danger',
};

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function getDisplayName(emp: EmployeeDetailData): string {
  if (emp.fullName) return emp.fullName;
  const composed = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
  return composed || emp.email;
}

function getInitials(emp: EmployeeDetailData): string {
  const name = getDisplayName(emp);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 min-w-0">
      <span className="p-1.5 rounded-md bg-surface-100 text-surface-700 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
        <p className="text-small text-surface-900 truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-200 last:border-b-0">
      <span className="text-small text-surface-600">{label}</span>
      <span className="text-small text-surface-900">{value}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: employee, isLoading } = useQuery<EmployeeDetailData>({
    queryKey: ['people', id],
    queryFn: async () => {
      const res = await api.get(`/api/people/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-5 animate-fade-in">
        <Link
          to="/people"
          className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to People
        </Link>
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<UserIcon className="h-8 w-8" />}
              title="Employee not found"
              description="The employee you're looking for doesn't exist or you don't have access."
              action={
                <Link to="/people">
                  <Button variant="outline" size="sm">
                    Back to People
                  </Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const name = getDisplayName(employee);
  const trainingRecords = employee.trainingRecords ?? [];
  const certifications = employee.certifications ?? [];
  const attestations = employee.attestations ?? [];
  const assignedControls = employee.assignedControls ?? [];
  const permissionGroups = employee.permissionGroups ?? [];
  const systemAccess = employee.systemAccess ?? [];

  const trainingColumns: DataTableColumn<TrainingRecord>[] = [
    {
      id: 'courseName',
      accessorKey: 'courseName',
      header: 'Course',
      mobileLabel: 'Course',
      cell: ({ row }) => <span className="text-surface-900">{row.original.courseName ?? '—'}</span>,
    },
    {
      id: 'courseType',
      accessorKey: 'courseType',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) =>
        row.original.courseType ? (
          <CategoryChip value={row.original.courseType} />
        ) : (
          <span className="text-surface-500">—</span>
        ),
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
          <Badge variant={TRAINING_STATUS_VARIANT[s] ?? 'neutral'} dot>
            {s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Due',
      mobileLabel: 'Due',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{formatDate(row.original.dueDate)}</span>
      ),
    },
    {
      id: 'completedAt',
      accessorKey: 'completedAt',
      header: 'Completed',
      mobileLabel: 'Completed',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.completedAt)}
        </span>
      ),
    },
    {
      id: 'score',
      accessorKey: 'score',
      header: 'Score',
      mobileLabel: 'Score',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{row.original.score ?? '—'}</span>
      ),
    },
  ];

  const attestationColumns: DataTableColumn<Attestation>[] = [
    {
      id: 'policyTitle',
      accessorKey: 'policyTitle',
      header: 'Policy',
      mobileLabel: 'Policy',
      cell: ({ row }) => (
        <span className="text-surface-900">{row.original.policyTitle ?? '—'}</span>
      ),
    },
    {
      id: 'policyCategory',
      accessorKey: 'policyCategory',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) =>
        row.original.policyCategory ? (
          <CategoryChip value={row.original.policyCategory} />
        ) : (
          <span className="text-surface-500">—</span>
        ),
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
          <Badge variant={ATTESTATION_STATUS_VARIANT[s] ?? 'neutral'} dot>
            {s.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'requestedAt',
      accessorKey: 'requestedAt',
      header: 'Requested',
      mobileLabel: 'Requested',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.requestedAt)}
        </span>
      ),
    },
    {
      id: 'respondedAt',
      accessorKey: 'respondedAt',
      header: 'Responded',
      mobileLabel: 'Responded',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">
          {formatDate(row.original.respondedAt)}
        </span>
      ),
    },
  ];

  const profileTab = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          <FactRow label="Email" value={employee.email} />
          <FactRow label="Department" value={employee.department ?? '—'} />
          <FactRow label="Role" value={employee.jobTitle ?? '—'} />
          <FactRow label="Location" value={employee.location ?? '—'} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Employment</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          <FactRow label="Hire date" value={formatDate(employee.hireDate)} />
          <FactRow label="Manager" value={employee.managerName ?? employee.managerEmail ?? '—'} />
          <FactRow
            label="Employment type"
            value={
              employee.employmentType ? (
                <span className="capitalize">{employee.employmentType}</span>
              ) : (
                '—'
              )
            }
          />
          <FactRow
            label="Status"
            value={
              employee.status ? (
                <Badge variant={STATUS_VARIANT[employee.status] ?? 'neutral'} dot>
                  {employee.status.replace(/_/g, ' ')}
                </Badge>
              ) : (
                '—'
              )
            }
          />
        </CardBody>
      </Card>
    </div>
  );

  const trainingTab = (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Training records</CardTitle>
          {trainingRecords.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {trainingRecords.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="cozy" className="p-0">
          {trainingRecords.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="No training records"
                description="No assigned or completed training for this employee."
                size="sm"
              />
            </div>
          ) : (
            <DataTable
              data={trainingRecords}
              columns={trainingColumns}
              getRowId={(r) => r.id}
              density="compact"
              className="rounded-none border-0"
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
          {certifications.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {certifications.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {certifications.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title="No certifications"
              description="Issue or track a certification for this employee."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-50 border border-surface-200"
                >
                  <div className="min-w-0">
                    <p className="text-surface-900 font-medium truncate">{cert.name}</p>
                    <p className="text-xs text-surface-500 truncate">
                      {cert.issuer ?? 'Unknown issuer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-surface-700 tabular-nums">
                      Issued {formatDate(cert.issuedAt)}
                    </span>
                    {cert.expiresAt && (
                      <span className="text-xs text-surface-500 tabular-nums">
                        Expires {formatDate(cert.expiresAt)}
                      </span>
                    )}
                    {cert.status && (
                      <Badge variant={cert.status === 'expired' ? 'danger' : 'success'} size="sm">
                        {cert.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const complianceTab = (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Identity & access facts</CardTitle>
        </CardHeader>
        <CardBody density="comfy">
          <FactRow
            label="MFA"
            value={
              employee.mfaEnabled ? (
                <Badge variant="success" dot capitalize={false}>
                  Enabled
                </Badge>
              ) : (
                <Badge variant="danger" dot capitalize={false}>
                  Disabled
                </Badge>
              )
            }
          />
          <FactRow
            label="SSO"
            value={
              employee.ssoEnabled ? (
                <Badge variant="success" dot capitalize={false}>
                  Enabled
                </Badge>
              ) : (
                <Badge variant="neutral" dot capitalize={false}>
                  Not configured
                </Badge>
              )
            }
          />
          <FactRow label="Last login" value={formatDate(employee.lastLoginAt)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policy attestations</CardTitle>
          {attestations.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {attestations.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="cozy" className="p-0">
          {attestations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6" />}
                title="No attestations"
                description="No policy attestations have been requested."
                size="sm"
              />
            </div>
          ) : (
            <DataTable
              data={attestations}
              columns={attestationColumns}
              getRowId={(r) => r.id}
              density="compact"
              className="rounded-none border-0"
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned controls</CardTitle>
          {assignedControls.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {assignedControls.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {assignedControls.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title="No assigned controls"
              description="This employee is not currently an owner on any control."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {assignedControls.map((control) => (
                <Link
                  key={control.id}
                  to={`/controls/${control.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors"
                >
                  <div className="min-w-0">
                    {control.controlId && (
                      <span className="font-mono text-xs text-brand-700">{control.controlId}</span>
                    )}
                    <p className="text-surface-900 truncate">{control.title}</p>
                  </div>
                  {control.status && (
                    <Badge variant="info" size="sm">
                      {control.status.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  const accessTab = (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Permission groups</CardTitle>
          {permissionGroups.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {permissionGroups.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {permissionGroups.length === 0 ? (
            <EmptyState
              icon={<Key className="h-6 w-6" />}
              title="No permission groups"
              description="This employee is not a member of any permission group."
              size="sm"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissionGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-3 rounded-md bg-surface-50 border border-surface-200"
                >
                  <p className="text-surface-900 font-medium">{group.name}</p>
                  {group.description && (
                    <p className="text-xs text-surface-500 mt-0.5">{group.description}</p>
                  )}
                  {typeof group.memberCount === 'number' && (
                    <p className="text-xs text-surface-500 mt-1 tabular-nums">
                      {group.memberCount} members
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System access</CardTitle>
          {systemAccess.length > 0 && (
            <Badge variant="neutral" size="sm" capitalize={false}>
              {systemAccess.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {systemAccess.length === 0 ? (
            <EmptyState
              icon={<Key className="h-6 w-6" />}
              title="No system access records"
              description="No grants discovered from connected systems."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {systemAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-50 border border-surface-200"
                >
                  <div className="min-w-0">
                    <p className="text-surface-900 font-medium truncate">{access.system}</p>
                    {access.source && (
                      <p className="text-xs text-surface-500 truncate">via {access.source}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {access.accessLevel && (
                      <Badge variant="info" size="sm">
                        {access.accessLevel.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {access.lastAccessed && (
                      <span className="text-xs text-surface-500 tabular-nums">
                        {formatDate(access.lastAccessed)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <Link
        to="/people"
        className="inline-flex items-center gap-1 text-small text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to People
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-small font-semibold shrink-0">
              {getInitials(employee)}
            </span>
            <span>{name}</span>
          </span>
        }
        meta={
          <>
            {employee.status && (
              <Badge variant={STATUS_VARIANT[employee.status] ?? 'neutral'} dot>
                {employee.status.replace(/_/g, ' ')}
              </Badge>
            )}
            {employee.jobTitle && (
              <span className="text-small text-surface-700">{employee.jobTitle}</span>
            )}
            {employee.department && <CategoryChip value={employee.department} />}
          </>
        }
        actions={
          <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-4 w-4" />}>
            Edit
          </Button>
        }
      />

      <Card>
        <CardBody density="comfy">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetaItem icon={<Mail className="h-4 w-4" />} label="Email" value={employee.email} />
            <MetaItem
              icon={<UserIcon className="h-4 w-4" />}
              label="Manager"
              value={employee.managerName ?? employee.managerEmail ?? '—'}
            />
            <MetaItem
              icon={<Calendar className="h-4 w-4" />}
              label="Hire date"
              value={formatDate(employee.hireDate)}
            />
            <MetaItem
              icon={<MapPin className="h-4 w-4" />}
              label="Location"
              value={employee.location ?? '—'}
            />
            {employee.department && (
              <MetaItem
                icon={<Building2 className="h-4 w-4" />}
                label="Department"
                value={employee.department}
              />
            )}
            {employee.employmentType && (
              <MetaItem
                icon={<Briefcase className="h-4 w-4" />}
                label="Type"
                value={<span className="capitalize">{employee.employmentType}</span>}
              />
            )}
            <MetaItem
              icon={
                employee.mfaEnabled ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )
              }
              label="MFA"
              value={employee.mfaEnabled ? 'Enabled' : 'Disabled'}
            />
            <MetaItem
              icon={<Key className="h-4 w-4" />}
              label="Last login"
              value={formatDate(employee.lastLoginAt)}
            />
          </div>
        </CardBody>
      </Card>

      <Tabs
        tabs={[
          { label: 'Profile', content: profileTab },
          { label: 'Training', content: trainingTab },
          { label: 'Compliance', content: complianceTab },
          { label: 'Access', content: accessTab },
        ]}
      />
    </div>
  );
}
