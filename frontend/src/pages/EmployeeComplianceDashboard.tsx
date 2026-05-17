import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UsersIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  AcademicCapIcon,
  ComputerDesktopIcon,
  KeyIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { employeeComplianceApi } from '@/lib/api';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import { useToast } from '@/hooks/useToast';

interface DashboardMetrics {
  totalEmployees: number;
  averageScore: number;
  complianceRate: number;
  scoreDistribution: {
    compliant: number;
    atRisk: number;
    nonCompliant: number;
  };
  issueBreakdown: {
    overdueTrainings: number;
    missingBackgroundChecks: number;
    pendingAttestations: number;
    mfaNotEnabled: number;
    nonCompliantDevices: number;
  };
  departmentStats: {
    department: string;
    employeeCount: number;
    averageScore: number;
  }[];
  upcomingDeadlines: {
    expiringBackgroundChecks: DeadlineItem[];
    overdueTrainings: DeadlineItem[];
    pendingAttestations: DeadlineItem[];
  };
  dataCoverage: {
    hris: number;
    backgroundCheck: number;
    training: number;
    assets: number;
    access: number;
  };
}

interface DeadlineItem {
  type: string;
  employeeEmail: string;
  employeeName: string;
  deadline: string;
  details: Record<string, string>;
}

// Fallback mock data when API returns empty or no data
const FALLBACK_METRICS: DashboardMetrics = {
  totalEmployees: 0,
  averageScore: 0,
  complianceRate: 0,
  scoreDistribution: { compliant: 0, atRisk: 0, nonCompliant: 0 },
  issueBreakdown: {
    overdueTrainings: 0,
    missingBackgroundChecks: 0,
    pendingAttestations: 0,
    mfaNotEnabled: 0,
    nonCompliantDevices: 0,
  },
  departmentStats: [],
  upcomingDeadlines: {
    expiringBackgroundChecks: [],
    overdueTrainings: [],
    pendingAttestations: [],
  },
  dataCoverage: { hris: 0, backgroundCheck: 0, training: 0, assets: 0, access: 0 },
};

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color,
  isLoading = false,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: typeof UsersIcon; 
  color: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface-700 rounded" />
            <div className="h-8 w-16 bg-surface-700 rounded" />
            <div className="h-3 w-20 bg-surface-700 rounded" />
          </div>
          <div className="p-3 rounded-lg bg-surface-700 h-12 w-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-lg bg-surface-700">
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ range, count, total, color }: { range: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24">{range}</span>
      <div className="flex-1 h-6 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-sm text-foreground w-10 text-right">{count}</span>
    </div>
  );
}

function DataCoverageBar({ label, percentage, icon: Icon, color }: { label: string; percentage: number; icon: typeof UsersIcon; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-sm text-muted-foreground w-32">{label}</span>
      <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${percentage >= 90 ? 'bg-green-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-red-500'} rounded-full transition-all duration-500`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      <span className="text-sm text-foreground w-12 text-right">{percentage}%</span>
    </div>
  );
}

function EmptyState({ message, icon: Icon }: { message: string; icon: typeof UsersIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="h-12 w-12 text-surface-500 mb-3" />
      <p className="text-surface-400">{message}</p>
      <Link to="/settings/employee-compliance" className="text-brand-400 hover:text-brand-300 mt-2 text-sm flex items-center gap-1">
        <Cog6ToothIcon className="h-4 w-4" />
        Configure Integrations
      </Link>
    </div>
  );
}

export default function EmployeeComplianceDashboard() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch dashboard metrics from API
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['employee-compliance-dashboard'],
    queryFn: async () => {
      const response = await employeeComplianceApi.getDashboard();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch missing data report
  const { data: missingData } = useQuery({
    queryKey: ['employee-compliance-missing'],
    queryFn: async () => {
      const response = await employeeComplianceApi.getMissingData();
      return response.data;
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => employeeComplianceApi.triggerSync(),
    onSuccess: () => {
      toast.success('Sync initiated. Data will be refreshed shortly.');
      queryClient.invalidateQueries({ queryKey: ['employee-compliance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['employee-compliance-missing'] });
    },
    onError: () => {
      toast.error('Failed to initiate sync. Please try again.');
    },
  });

  // Transform API data to component format
  const metrics: DashboardMetrics = dashboardData ? {
    totalEmployees: dashboardData.totalEmployees || 0,
    averageScore: Math.round(dashboardData.averageScore || 0),
    complianceRate: Math.round(dashboardData.complianceRate || 0),
    scoreDistribution: {
      compliant: dashboardData.scoreDistribution?.compliant || 0,
      atRisk: dashboardData.scoreDistribution?.atRisk || 0,
      nonCompliant: dashboardData.scoreDistribution?.nonCompliant || 0,
    },
    issueBreakdown: {
      overdueTrainings: dashboardData.issueBreakdown?.overdueTrainings || 0,
      missingBackgroundChecks: dashboardData.issueBreakdown?.missingBackgroundChecks || 0,
      pendingAttestations: dashboardData.issueBreakdown?.pendingAttestations || 0,
      mfaNotEnabled: dashboardData.issueBreakdown?.mfaNotEnabled || 0,
      nonCompliantDevices: dashboardData.issueBreakdown?.nonCompliantDevices || 0,
    },
    departmentStats: dashboardData.departmentStats || [],
    upcomingDeadlines: dashboardData.upcomingDeadlines || {
      expiringBackgroundChecks: [],
      overdueTrainings: [],
      pendingAttestations: [],
    },
    dataCoverage: {
      hris: dashboardData.dataCoverage?.hris || 0,
      backgroundCheck: dashboardData.dataCoverage?.backgroundCheck || 0,
      training: dashboardData.dataCoverage?.training || 0,
      assets: dashboardData.dataCoverage?.assets || 0,
      access: dashboardData.dataCoverage?.access || 0,
    },
  } : FALLBACK_METRICS;

  // Calculate issue breakdown for display
  const issueBreakdownItems = [
    { type: 'training', count: metrics.issueBreakdown.overdueTrainings, label: 'Training Overdue', icon: AcademicCapIcon, color: 'text-purple-400' },
    { type: 'background_check', count: metrics.issueBreakdown.missingBackgroundChecks, label: 'Missing Background Check', icon: ShieldCheckIcon, color: 'text-green-400' },
    { type: 'attestation', count: metrics.issueBreakdown.pendingAttestations, label: 'Pending Attestations', icon: ClockIcon, color: 'text-yellow-400' },
    { type: 'mfa', count: metrics.issueBreakdown.mfaNotEnabled, label: 'MFA Not Enabled', icon: KeyIcon, color: 'text-cyan-400' },
    { type: 'device', count: metrics.issueBreakdown.nonCompliantDevices, label: 'Non-Compliant Devices', icon: ComputerDesktopIcon, color: 'text-orange-400' },
  ];

  const totalIssues = issueBreakdownItems.reduce((sum, i) => sum + i.count, 0);
  const hasData = metrics.totalEmployees > 0;

  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            There was an error loading the employee compliance dashboard. Please try again later.
          </p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['employee-compliance-dashboard'] })}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Compliance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of employee compliance across all systems</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/settings/employee-compliance" className="btn btn-secondary">
            <Cog6ToothIcon className="h-5 w-5" />
            Settings
          </Link>
          <button 
            onClick={() => syncMutation.mutate()} 
            disabled={syncMutation.isPending} 
            className="btn btn-secondary"
          >
            <ArrowPathIcon className={`h-5 w-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync All'}
          </button>
          <Link to="/people" className="btn btn-primary">View All Employees</Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Employees" 
          value={metrics.totalEmployees} 
          subtitle="Active employees" 
          icon={UsersIcon} 
          color="text-blue-400" 
          isLoading={isLoading}
        />
        <StatCard 
          title="Average Score" 
          value={metrics.averageScore} 
          subtitle="Out of 100" 
          icon={ChartBarIcon} 
          color={metrics.averageScore >= 80 ? 'text-green-400' : metrics.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'} 
          isLoading={isLoading}
        />
        <StatCard 
          title="Compliance Rate" 
          value={`${metrics.complianceRate}%`} 
          subtitle="Score ≥ 80" 
          icon={CheckCircleIcon} 
          color="text-green-400" 
          isLoading={isLoading}
        />
        <StatCard 
          title="Issues Found" 
          value={totalIssues} 
          subtitle="Across all categories" 
          icon={ExclamationTriangleIcon} 
          color="text-orange-400" 
          isLoading={isLoading}
        />
      </div>

      {!isLoading && !hasData && (
        <div className="card p-8 text-center">
          <UsersIcon className="h-16 w-16 text-surface-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No Employee Data Yet</h2>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Connect your HRIS, background check, training, and MDM integrations to start tracking employee compliance.
          </p>
          <Link to="/settings/employee-compliance" className="btn btn-primary">
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Configure Data Sources
          </Link>
        </div>
      )}

      {(isLoading || hasData) && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <div className="card p-6">
              <h3 className="font-semibold text-foreground mb-4">Score Distribution</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 bg-surface-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : !hasData ? (
                <EmptyState message="No score data available" icon={ChartBarIcon} />
              ) : (
                <div className="space-y-3">
                  <ScoreBar 
                    range="Compliant (≥80)" 
                    count={metrics.scoreDistribution.compliant} 
                    total={metrics.totalEmployees} 
                    color="bg-green-500" 
                  />
                  <ScoreBar 
                    range="At Risk (60-79)" 
                    count={metrics.scoreDistribution.atRisk} 
                    total={metrics.totalEmployees} 
                    color="bg-yellow-500" 
                  />
                  <ScoreBar 
                    range="Non-Compliant (<60)" 
                    count={metrics.scoreDistribution.nonCompliant} 
                    total={metrics.totalEmployees} 
                    color="bg-red-500" 
                  />
                </div>
              )}
            </div>

            {/* Issue Breakdown */}
            <div className="card p-6">
              <h3 className="font-semibold text-foreground mb-4">Issue Breakdown</h3>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-surface-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : totalIssues === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircleIcon className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-green-400 font-medium">All Clear!</p>
                  <p className="text-surface-400 text-sm">No compliance issues detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issueBreakdownItems.filter(i => i.count > 0).map((issue) => (
                    <div key={issue.type} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg hover:bg-surface-700 transition-colors">
                      <div className="flex items-center gap-3">
                        <issue.icon className={`h-5 w-5 ${issue.color}`} />
                        <span className="text-foreground">{issue.label}</span>
                      </div>
                      <span className="text-lg font-semibold text-foreground">{issue.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Stats */}
            <div className="card p-6">
              <h3 className="font-semibold text-foreground mb-4">Compliance by Department</h3>
              {isLoading ? (
                <SkeletonTable rows={5} columns={3} />
              ) : metrics.departmentStats.length === 0 ? (
                <EmptyState message="No department data available" icon={BuildingOffice2Icon} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-medium text-muted-foreground">Department</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Employees</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.departmentStats.map((dept) => (
                        <tr key={dept.department} className="border-b border-border hover:bg-surface-700/30 transition-colors">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{dept.department}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center text-muted-foreground">{dept.employeeCount}</td>
                          <td className="p-2 text-center">
                            <span className={`font-semibold ${dept.averageScore >= 80 ? 'text-green-400' : dept.averageScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {dept.averageScore}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Data Coverage */}
            <div className="card p-6">
              <h3 className="font-semibold text-foreground mb-4">Data Coverage</h3>
              <p className="text-sm text-muted-foreground mb-4">Percentage of employees with data from each integration type</p>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-5 bg-surface-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <DataCoverageBar label="HRIS" percentage={metrics.dataCoverage.hris} icon={BuildingOffice2Icon} color="text-blue-400" />
                  <DataCoverageBar label="Background Check" percentage={metrics.dataCoverage.backgroundCheck} icon={ShieldCheckIcon} color="text-green-400" />
                  <DataCoverageBar label="Training (LMS)" percentage={metrics.dataCoverage.training} icon={AcademicCapIcon} color="text-purple-400" />
                  <DataCoverageBar label="Assets (MDM)" percentage={metrics.dataCoverage.assets} icon={ComputerDesktopIcon} color="text-orange-400" />
                  <DataCoverageBar label="Access (IdP)" percentage={metrics.dataCoverage.access} icon={KeyIcon} color="text-cyan-400" />
                </div>
              )}
              
              {/* Missing Data Alert */}
              {missingData && (
                (missingData.noBackgroundCheck?.length > 0 || 
                 missingData.noTrainingData?.length > 0 ||
                 missingData.noDeviceData?.length > 0 ||
                 missingData.noAccessData?.length > 0) && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-yellow-500/10 border border-amber-300 dark:border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-amber-700 dark:text-yellow-400 font-medium mb-1">Missing Data Detected</p>
                    <p className="text-xs text-amber-600 dark:text-yellow-400/80">
                      {missingData.noBackgroundCheck?.length || 0} employees missing background checks, {' '}
                      {missingData.noTrainingData?.length || 0} missing training data
                    </p>
                    <Link to="/people?filter=missing-data" className="text-xs text-amber-700 dark:text-yellow-300 hover:text-amber-800 dark:hover:text-yellow-200 mt-1 inline-block">
                      View details →
                    </Link>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="card p-6">
            <h3 className="font-semibold text-foreground mb-4">Upcoming Deadlines & Issues</h3>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overdue Trainings */}
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AcademicCapIcon className="h-5 w-5 text-red-400" />
                    <span className="font-medium text-foreground">Overdue Trainings</span>
                    {metrics.upcomingDeadlines.overdueTrainings.length > 0 && (
                      <span className="ml-auto bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs">
                        {metrics.upcomingDeadlines.overdueTrainings.length}
                      </span>
                    )}
                  </div>
                  {metrics.upcomingDeadlines.overdueTrainings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overdue trainings</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {metrics.upcomingDeadlines.overdueTrainings.slice(0, 5).map((item, i) => (
                        <div key={i} className="text-sm p-2 bg-surface-700/30 rounded hover:bg-surface-700/50 transition-colors">
                          <p className="text-foreground font-medium">{item.employeeName || item.employeeEmail}</p>
                          <p className="text-muted-foreground text-xs">{item.details?.courseName || 'Training course'}</p>
                          <p className="text-red-400 text-xs">Due: {new Date(item.deadline).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {metrics.upcomingDeadlines.overdueTrainings.length > 5 && (
                        <Link to="/people?filter=overdue-training" className="text-xs text-brand-400 hover:text-brand-300 block text-center mt-2">
                          View all {metrics.upcomingDeadlines.overdueTrainings.length} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Expiring Background Checks */}
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheckIcon className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium text-foreground">Expiring Background Checks</span>
                    {metrics.upcomingDeadlines.expiringBackgroundChecks.length > 0 && (
                      <span className="ml-auto bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-xs">
                        {metrics.upcomingDeadlines.expiringBackgroundChecks.length}
                      </span>
                    )}
                  </div>
                  {metrics.upcomingDeadlines.expiringBackgroundChecks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No expiring checks</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {metrics.upcomingDeadlines.expiringBackgroundChecks.slice(0, 5).map((item, i) => (
                        <div key={i} className="text-sm p-2 bg-surface-700/30 rounded hover:bg-surface-700/50 transition-colors">
                          <p className="text-foreground font-medium">{item.employeeName || item.employeeEmail}</p>
                          <p className="text-muted-foreground text-xs capitalize">{item.details?.checkType || 'Background'} check</p>
                          <p className="text-yellow-400 text-xs">Expires: {new Date(item.deadline).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {metrics.upcomingDeadlines.expiringBackgroundChecks.length > 5 && (
                        <Link to="/people?filter=expiring-background" className="text-xs text-brand-400 hover:text-brand-300 block text-center mt-2">
                          View all {metrics.upcomingDeadlines.expiringBackgroundChecks.length} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Pending Attestations */}
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClockIcon className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-foreground">Pending Attestations</span>
                    {metrics.upcomingDeadlines.pendingAttestations.length > 0 && (
                      <span className="ml-auto bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-xs">
                        {metrics.upcomingDeadlines.pendingAttestations.length}
                      </span>
                    )}
                  </div>
                  {metrics.upcomingDeadlines.pendingAttestations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending attestations</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {metrics.upcomingDeadlines.pendingAttestations.slice(0, 5).map((item, i) => (
                        <div key={i} className="text-sm p-2 bg-surface-700/30 rounded hover:bg-surface-700/50 transition-colors">
                          <p className="text-foreground font-medium">{item.employeeName || item.employeeEmail}</p>
                          <p className="text-muted-foreground text-xs">{item.details?.policyTitle || 'Policy attestation'}</p>
                          <p className="text-blue-400 text-xs">Requested: {new Date(item.deadline).toLocaleDateString()}</p>
                        </div>
                      ))}
                      {metrics.upcomingDeadlines.pendingAttestations.length > 5 && (
                        <Link to="/people?filter=pending-attestation" className="text-xs text-brand-400 hover:text-brand-300 block text-center mt-2">
                          View all {metrics.upcomingDeadlines.pendingAttestations.length} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
