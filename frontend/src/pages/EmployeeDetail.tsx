import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  MapPinIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ComputerDesktopIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  KeyIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { employeeComplianceApi } from '../lib/api';

interface Tab {
  id: string;
  label: string;
  icon: typeof UserIcon;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: UserIcon },
  { id: 'background', label: 'Background Check', icon: ShieldCheckIcon },
  { id: 'training', label: 'Training', icon: AcademicCapIcon },
  { id: 'assets', label: 'Assets', icon: ComputerDesktopIcon },
  { id: 'access', label: 'Access', icon: KeyIcon },
  { id: 'attestations', label: 'Attestations', icon: DocumentTextIcon },
];

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getScoreColor(score: number | undefined): string {
  if (score === undefined) return 'text-gray-400 dark:text-surface-500';
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number | undefined): string {
  if (score === undefined) return 'bg-gray-500/20 dark:bg-surface-500/20';
  if (score >= 80) return 'bg-green-500/20';
  if (score >= 60) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-muted-foreground text-sm">—</span>;

  const configs: Record<string, { color: string; icon: typeof CheckCircleIcon }> = {
    clear: { color: 'bg-green-500/20 text-green-600', icon: CheckCircleIcon },
    completed: { color: 'bg-green-500/20 text-green-600', icon: CheckCircleIcon },
    acknowledged: { color: 'bg-green-500/20 text-green-600', icon: CheckCircleIcon },
    approved: { color: 'bg-green-500/20 text-green-600', icon: CheckCircleIcon },
    pending: { color: 'bg-yellow-500/20 text-yellow-600', icon: ClockIcon },
    assigned: { color: 'bg-blue-500/20 text-blue-600', icon: ClockIcon },
    in_progress: { color: 'bg-blue-500/20 text-blue-600', icon: ArrowPathIcon },
    flagged: { color: 'bg-red-500/20 text-red-600', icon: XCircleIcon },
    overdue: { color: 'bg-red-500/20 text-red-600', icon: ExclamationTriangleIcon },
    declined: { color: 'bg-red-500/20 text-red-600', icon: XCircleIcon },
  };
  const config = configs[status] || {
    color: 'bg-gray-500/20 text-gray-400 dark:bg-surface-500/20 dark:text-surface-500',
    icon: ExclamationTriangleIcon,
  };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}
    >
      <Icon className="h-3 w-3" />
      {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-lg bg-surface-200 h-9 w-9 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-48 bg-surface-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-200 rounded animate-pulse" />
        </div>
        <div className="h-20 w-20 rounded-full bg-surface-200 animate-pulse" />
      </div>
      <div className="h-12 bg-surface-200 rounded animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 h-48 bg-surface-200 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-6">
      <div className="card p-12 text-center">
        <UserIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Employee Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The employee you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/people" className="">
          Back to Employees
        </Link>
      </div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No employee ID');
      const response = await employeeComplianceApi.get(id);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingState />;
  if (error || !employee) return <NotFound />;

  // Transform data with defaults
  const fullName =
    employee.fullName ||
    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
    employee.email;
  const complianceScore = employee.complianceScore ?? 0;
  const backgroundChecks = employee.backgroundChecks || [];
  const trainingRecords = employee.trainingRecords || [];
  const assetAssignments = employee.assetAssignments || [];
  const accessRecords = employee.accessRecords || [];
  const attestations = employee.attestations || [];
  const complianceIssues = employee.complianceIssues || [];
  const dataSources = employee.dataSources || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/people"
          className="p-2 rounded-lg hover:bg-surface-200 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
          <p className="text-sm text-muted-foreground">{employee.email}</p>
        </div>
        <div
          className={`flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${getScoreBgColor(complianceScore)} ${getScoreColor(complianceScore)}`}
        >
          {complianceScore}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Employee Info */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Employee Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{employee.email}</span>
                </div>
                {employee.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee.department}</span>
                  </div>
                )}
                {employee.jobTitle && (
                  <div className="flex items-center gap-3 text-sm">
                    <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee.jobTitle}</span>
                  </div>
                )}
                {employee.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{employee.location}</span>
                  </div>
                )}
                {employee.hireDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Hired {formatDate(employee.hireDate)}</span>
                  </div>
                )}
                {employee.managerEmail && (
                  <div className="flex items-center gap-3 text-sm">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">Manager: {employee.managerEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance Issues */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Compliance Issues</h3>
              {complianceIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>No compliance issues</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {complianceIssues.map((issue: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-surface-200/50">
                      <ExclamationTriangleIcon
                        className={`h-4 w-4 mt-0.5 ${issue.severity === 'critical' ? 'text-red-600' : issue.severity === 'high' ? 'text-orange-600' : 'text-yellow-600'}`}
                      />
                      <div>
                        <p className="text-sm text-foreground">{issue.message}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {(issue.type || '').replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Data Sources */}
            <div className="card p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Data Sources</h3>
              {dataSources.length === 0 ? (
                <p className="text-muted-foreground text-sm">No data sources configured</p>
              ) : (
                <div className="space-y-2">
                  {dataSources.map((source: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-surface-200/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{source.integration}</p>
                        <p className="text-xs text-muted-foreground">{source.type}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Synced {formatDate(source.lastSyncedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Background Check History</h3>
            {backgroundChecks.length === 0 ? (
              <p className="text-muted-foreground">No background check records found</p>
            ) : (
              <div className="space-y-4">
                {backgroundChecks.map((check: any) => (
                  <div key={check.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={check.status} />
                        <span className="text-sm text-muted-foreground capitalize">
                          {check.checkType || 'Background'} Check
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        via {check.integration?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Initiated:</span>{' '}
                        <span className="text-foreground ml-1">
                          {formatDate(check.initiatedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>{' '}
                        <span className="text-foreground ml-1">
                          {formatDate(check.completedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expires:</span>{' '}
                        <span className="text-foreground ml-1">{formatDate(check.expiresAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'training' && (
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Training Records</h3>
            {trainingRecords.length === 0 ? (
              <p className="text-muted-foreground">No training records found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium text-muted-foreground">Course</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">
                        Due Date
                      </th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Score</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingRecords.map((training: any) => (
                      <tr key={training.id} className="border-b border-border">
                        <td className="p-3 text-foreground">{training.courseName}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              training.courseType === 'required'
                                ? 'bg-red-500/20 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                                : 'bg-surface-500/20 dark:bg-surface-500/20 text-surface-500 dark:text-surface-400'
                            }`}
                          >
                            {training.courseType || 'optional'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <StatusBadge status={training.status} />
                        </td>
                        <td className="p-3 text-center text-muted-foreground">
                          {formatDate(training.dueDate || training.completedAt)}
                        </td>
                        <td className="p-3 text-center text-foreground">{training.score ?? '—'}</td>
                        <td className="p-3 text-right text-muted-foreground">
                          {training.integration?.name || 'Manual'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Assigned Assets</h3>
            {assetAssignments.length === 0 ? (
              <p className="text-muted-foreground">No assets assigned</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assetAssignments.map((asset: any) => (
                  <div key={asset.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ComputerDesktopIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {asset.deviceName || asset.name || 'Unknown Device'}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${asset.isCompliant ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}
                      >
                        {asset.isCompliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{' '}
                        <span className="text-foreground ml-1 capitalize">
                          {asset.deviceType || asset.type || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Model:</span>{' '}
                        <span className="text-foreground ml-1">{asset.model || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Serial:</span>{' '}
                        <span className="text-foreground ml-1">{asset.serialNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">OS:</span>{' '}
                        <span className="text-foreground ml-1">{asset.osVersion || '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Last Check-in:</span>{' '}
                        <span className="text-foreground ml-1">
                          {formatDate(asset.lastCheckIn)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'access' && (
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Access & Systems</h3>
            {accessRecords.length === 0 ? (
              <p className="text-muted-foreground">No access records found</p>
            ) : (
              accessRecords.map((record: any) => (
                <div key={record.id} className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-surface-200/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <KeyIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-foreground">MFA Status:</span>
                      <span className={record.mfaEnabled ? 'text-green-600' : 'text-red-600'}>
                        {record.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Last Review:</span>
                      <span className="text-foreground">{formatDate(record.lastReviewDate)}</span>
                      <StatusBadge status={record.reviewStatus} />
                    </div>
                  </div>
                  {record.systemsAccess && record.systemsAccess.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              System
                            </th>
                            <th className="text-left p-3 font-medium text-muted-foreground">
                              Access Level
                            </th>
                            <th className="text-right p-3 font-medium text-muted-foreground">
                              Last Accessed
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.systemsAccess.map((sys: any, i: number) => (
                            <tr key={i} className="border-b border-border">
                              <td className="p-3 text-foreground">{sys.name}</td>
                              <td className="p-3 text-muted-foreground">{sys.accessLevel}</td>
                              <td className="p-3 text-right text-muted-foreground">
                                {formatDate(sys.lastAccessed)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'attestations' && (
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Policy Attestations</h3>
            {attestations.length === 0 ? (
              <p className="text-muted-foreground">No attestation records found</p>
            ) : (
              <div className="space-y-3">
                {attestations.map((attestation: any) => (
                  <div
                    key={attestation.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">
                          {attestation.policy?.title || 'Unknown Policy'}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {attestation.policy?.category || ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          Requested: {formatDate(attestation.requestedAt)}
                        </p>
                        {attestation.respondedAt && (
                          <p className="text-muted-foreground">
                            Responded: {formatDate(attestation.respondedAt)}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={attestation.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
