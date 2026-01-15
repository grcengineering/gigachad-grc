import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { trainingApi, employeeComplianceApi } from '@/lib/api';
import { SkeletonCard, SkeletonTable } from '@/components/Skeleton';
import clsx from 'clsx';

interface TrainingOrgStats {
  totalEmployees: number;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  inProgressAssignments: number;
  completionRate: number;
  averageScore: number;
  courseStats: {
    courseId: string;
    courseName: string;
    assigned: number;
    completed: number;
    overdue: number;
    averageScore: number;
  }[];
  departmentStats: {
    department: string;
    employeeCount: number;
    completionRate: number;
    overdueCount: number;
  }[];
  recentCompletions: {
    employeeName: string;
    employeeEmail: string;
    courseName: string;
    completedAt: string;
    score?: number;
  }[];
  upcomingDue: {
    employeeName: string;
    employeeEmail: string;
    courseName: string;
    dueDate: string;
  }[];
}

// Fallback data for when API returns empty
const FALLBACK_STATS: TrainingOrgStats = {
  totalEmployees: 0,
  totalAssignments: 0,
  completedAssignments: 0,
  overdueAssignments: 0,
  inProgressAssignments: 0,
  completionRate: 0,
  averageScore: 0,
  courseStats: [],
  departmentStats: [],
  recentCompletions: [],
  upcomingDue: [],
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  isLoading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof UsersIcon;
  color: string;
  trend?: { value: number; isPositive: boolean };
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <SkeletonCard className="h-32" />;
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-sm',
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              <ArrowTrendingUpIcon className={clsx('w-4 h-4', !trend.isPositive && 'rotate-180')} />
              <span>{trend.value}% vs last month</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-surface-400 w-12 text-right">{percentage}%</span>
    </div>
  );
}

export default function SecurityTrainingDashboard() {
  // Fetch organization-level training stats
  const { data: orgStatsData, isLoading: isLoadingOrgStats } = useQuery({
    queryKey: ['training-org-stats'],
    queryFn: async () => {
      const response = await trainingApi.getOrgStats();
      return response.data;
    },
    retry: 1,
    staleTime: 60000,
  });

  // Fetch employee compliance data for overdue trainings
  const { data: complianceData, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ['employee-compliance-dashboard'],
    queryFn: async () => {
      const response = await employeeComplianceApi.getDashboard();
      return response.data;
    },
    retry: 1,
    staleTime: 60000,
  });

  const isLoading = isLoadingOrgStats || isLoadingCompliance;

  // Merge data from both sources with fallback - handle different API response formats
  const stats: TrainingOrgStats = {
    ...FALLBACK_STATS,
    // From training API (different field names)
    totalAssignments: orgStatsData?.totalAssignments || 0,
    completedAssignments: orgStatsData?.completedAssignments || 0,
    overdueAssignments: orgStatsData?.overdueAssignments || complianceData?.issueBreakdown?.overdueTrainings || 0,
    inProgressAssignments: (orgStatsData?.totalAssignments || 0) - (orgStatsData?.completedAssignments || 0) - (orgStatsData?.overdueAssignments || 0),
    completionRate: orgStatsData?.completionRate || orgStatsData?.assignmentCompletionRate || 0,
    averageScore: orgStatsData?.averageScore || 0,
    // From compliance API
    totalEmployees: complianceData?.totalEmployees || 0,
    departmentStats: (complianceData?.departmentStats || []).map((d: any) => ({
      department: d.department || 'Unknown',
      employeeCount: d.employeeCount || 0,
      completionRate: d.averageScore || 0,
      overdueCount: 0,
    })),
    upcomingDue: (complianceData?.upcomingDeadlines?.overdueTrainings || []).map((t: any) => ({
      employeeName: t.employeeName || '',
      employeeEmail: t.employeeEmail || '',
      courseName: t.details?.courseName || 'Security Training',
      dueDate: t.deadline || '',
    })),
    courseStats: orgStatsData?.courseStats || [],
    recentCompletions: orgStatsData?.recentCompletions || [],
  };

  const pendingCount = stats.totalAssignments - stats.completedAssignments - stats.overdueAssignments;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Security Training Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Organization-wide security awareness training metrics and compliance
          </p>
        </div>
        <Link to="/tools/awareness" className="btn-primary">
          Manage Training
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          subtitle="Enrolled in training"
          icon={UsersIcon}
          color="bg-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate || 0}%`}
          subtitle={`${stats.completedAssignments} of ${stats.totalAssignments} completed`}
          icon={CheckCircleIcon}
          color="bg-green-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Overdue Trainings"
          value={stats.overdueAssignments}
          subtitle="Require immediate attention"
          icon={ExclamationTriangleIcon}
          color="bg-red-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Average Score"
          value={stats.averageScore ? `${stats.averageScore}%` : 'N/A'}
          subtitle="Across all assessments"
          icon={AcademicCapIcon}
          color="bg-purple-500"
          isLoading={isLoading}
        />
      </div>

      {/* Training Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Training Status</h2>
          {isLoading ? (
            <SkeletonTable rows={3} />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-surface-300">Completed</span>
                </div>
                <span className="text-foreground font-medium">{stats.completedAssignments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-surface-300">In Progress</span>
                </div>
                <span className="text-foreground font-medium">{stats.inProgressAssignments}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-surface-300">Pending</span>
                </div>
                <span className="text-foreground font-medium">{pendingCount > 0 ? pendingCount : 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-surface-300">Overdue</span>
                </div>
                <span className="text-foreground font-medium">{stats.overdueAssignments}</span>
              </div>
            </div>
          )}
        </div>

        {/* Course Performance */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Course Completion Rates</h2>
          {isLoading ? (
            <SkeletonTable rows={4} />
          ) : !stats.courseStats?.length ? (
            <div className="text-center py-8 text-surface-400">
              <AcademicCapIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No course data available</p>
              <p className="text-sm mt-1">Training courses will appear here once assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(stats.courseStats || []).slice(0, 5).map((course) => (
                <div key={course.courseId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-surface-300 text-sm">{course.courseName}</span>
                    <span className="text-surface-400 text-sm">
                      {course.completed}/{course.assigned}
                    </span>
                  </div>
                  <ProgressBar
                    value={course.completed}
                    max={course.assigned}
                    color="bg-green-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Department Stats & Overdue Trainings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Compliance */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Training by Department</h2>
            <BuildingOffice2Icon className="w-5 h-5 text-surface-400" />
          </div>
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : stats.departmentStats.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <BuildingOffice2Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No department data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.departmentStats.slice(0, 6).map((dept) => (
                <div key={dept.department} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                  <div>
                    <p className="text-foreground font-medium">{dept.department}</p>
                    <p className="text-sm text-surface-400">{dept.employeeCount} employees</p>
                  </div>
                  <div className="text-right">
                    <p className={clsx(
                      'font-medium',
                      dept.completionRate >= 80 ? 'text-green-400' :
                      dept.completionRate >= 60 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {dept.completionRate}%
                    </p>
                    {dept.overdueCount > 0 && (
                      <p className="text-sm text-red-400">{dept.overdueCount} overdue</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Trainings */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Overdue Trainings</h2>
            <span className="text-sm text-red-400 bg-red-500/10 px-2 py-1 rounded">
              {stats.overdueAssignments} total
            </span>
          </div>
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : stats.upcomingDue.length === 0 && stats.overdueAssignments === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-50" />
              <p>No overdue trainings</p>
              <p className="text-sm mt-1">All employees are up to date</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {stats.upcomingDue.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                  <div>
                    <p className="text-foreground font-medium">{item.employeeName || item.employeeEmail}</p>
                    <p className="text-sm text-surface-400">{item.courseName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-400">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Overdue'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Completions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Completions</h2>
          <CalendarDaysIcon className="w-5 h-5 text-surface-400" />
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : stats.recentCompletions.length === 0 ? (
          <div className="text-center py-8 text-surface-400">
            <ClockIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No recent completions</p>
            <p className="text-sm mt-1">Training completions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-700">
                  <th className="text-left text-sm font-medium text-surface-400 pb-3">Employee</th>
                  <th className="text-left text-sm font-medium text-surface-400 pb-3">Course</th>
                  <th className="text-left text-sm font-medium text-surface-400 pb-3">Completed</th>
                  <th className="text-right text-sm font-medium text-surface-400 pb-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentCompletions.slice(0, 10).map((completion, idx) => (
                  <tr key={idx} className="border-b border-surface-700/50">
                    <td className="py-3">
                      <p className="text-foreground">{completion.employeeName}</p>
                      <p className="text-sm text-surface-400">{completion.employeeEmail}</p>
                    </td>
                    <td className="py-3 text-surface-300">{completion.courseName}</td>
                    <td className="py-3 text-surface-400">
                      {new Date(completion.completedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      {completion.score !== undefined ? (
                        <span className={clsx(
                          'font-medium',
                          completion.score >= 80 ? 'text-green-400' :
                          completion.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {completion.score}%
                        </span>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
