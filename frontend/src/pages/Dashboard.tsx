import { useQuery } from '@tanstack/react-query';
import { dashboardApi, frameworksApi, policiesApi } from '@/lib/api';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import clsx from 'clsx';

const STATUS_COLORS = {
  implemented: '#22c55e',
  in_progress: '#eab308',
  not_started: '#6b7280',
  not_applicable: '#3b82f6',
};

const POLICY_COLORS = {
  published: '#22c55e',
  approved: '#3b82f6',
  in_review: '#eab308',
  draft: '#6b7280',
};

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getSummary().then((res) => res.data),
  });

  const { data: frameworksData, isLoading: frameworksLoading } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const { data: policyStats, isLoading: policiesLoading } = useQuery({
    queryKey: ['policy-stats'],
    queryFn: () => policiesApi.getStats().then((res) => res.data),
  });

  const isLoading = summaryLoading || frameworksLoading || policiesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  const frameworks = Array.isArray(frameworksData) ? frameworksData : frameworksData?.data || [];

  // Framework readiness chart data
  const frameworkChartData = frameworks.map((f: any) => ({
    name: f.name?.replace('ISO/IEC ', '').replace(' Type II', '') || 'Unknown',
    score: f.readiness?.score || 0,
  }));

  // Control status donut data
  const controlStatusData = summary?.controls?.byStatus
    ? Object.entries(summary.controls.byStatus)
        .filter(([_, value]) => (value as number) > 0)
        .map(([name, value]) => ({
          name: name.replace('_', ' '),
          value,
          color: STATUS_COLORS[name as keyof typeof STATUS_COLORS] || '#6b7280',
        }))
    : [];

  // Policy status donut data
  const policyStatusData = [
    { name: 'Published', value: policyStats?.published || 0, color: POLICY_COLORS.published },
    { name: 'Approved', value: policyStats?.approved || 0, color: POLICY_COLORS.approved },
    { name: 'In Review', value: policyStats?.inReview || 0, color: POLICY_COLORS.in_review },
    { name: 'Draft', value: policyStats?.draft || 0, color: POLICY_COLORS.draft },
  ].filter(d => d.value > 0);

  // Calculate action items
  const actionItems = 
    (summary?.evidence?.pendingReview || 0) + 
    (summary?.evidence?.expiringSoon || 0) + 
    (summary?.controls?.overdue || 0) +
    (policyStats?.overdueReview || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
        <p className="text-surface-400 mt-1">Your compliance overview at a glance</p>
      </div>

      {/* Top Stats Row - 4 distinct KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Compliance Score"
          value={`${summary?.complianceScore?.overall || 0}%`}
          icon={ShieldCheckIcon}
          color="brand"
        />
        <StatCard
          title="Total Controls"
          value={summary?.controls?.total || 0}
          icon={CheckCircleIcon}
          color="green"
          linkTo="/controls"
        />
        <StatCard
          title="Total Policies"
          value={policyStats?.total || 0}
          icon={DocumentTextIcon}
          color="blue"
          linkTo="/policies"
        />
        <StatCard
          title="Evidence Items"
          value={summary?.evidence?.total || 0}
          icon={FolderOpenIcon}
          color="purple"
          linkTo="/evidence"
        />
      </div>

      {/* Alert Banner - Only show if there are action items */}
      {actionItems > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-yellow-400 font-medium">{actionItems} items need attention:</span>
              <span className="text-surface-400 ml-2">
                {summary?.evidence?.pendingReview > 0 && `${summary.evidence.pendingReview} pending review`}
                {summary?.evidence?.expiringSoon > 0 && `, ${summary.evidence.expiringSoon} expiring soon`}
                {policyStats?.overdueReview > 0 && `, ${policyStats.overdueReview} overdue policy reviews`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Framework Readiness */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Framework Readiness</h2>
            <Link to="/frameworks" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-56">
            {frameworkChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frameworkChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="#71717a" tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#71717a"
                    width={90}
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Readiness']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {frameworkChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.score >= 70 ? '#22c55e' : entry.score >= 40 ? '#eab308' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-surface-500">
                No frameworks configured
              </div>
            )}
          </div>
        </div>

        {/* Control Implementation Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Control Status</h2>
            <Link to="/controls" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={controlStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {controlStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {controlStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-surface-400 capitalize">{item.name}: {String(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Lifecycle */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Policy Lifecycle</h2>
            <Link to="/policies" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Manage <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={policyStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {policyStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {policyStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-surface-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Controls by Category - Top 6 */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4">Controls by Category</h2>
          <div className="space-y-3">
            {Object.entries(summary?.controls?.byCategory || {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 6)
              .map(([category, count]) => {
                const percentage = Math.round(((count as number) / (summary?.controls?.total || 1)) * 100);
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-surface-400 capitalize">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-surface-300">{String(count)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  linkTo,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: 'brand' | 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  linkTo?: string;
}) {
  const colorClasses = {
    brand: 'bg-brand-600/20 text-brand-400',
    green: 'bg-green-600/20 text-green-400',
    blue: 'bg-blue-600/20 text-blue-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
    red: 'bg-red-600/20 text-red-400',
    purple: 'bg-purple-600/20 text-purple-400',
  };

  const content = (
    <div className={clsx('stat-card h-full', linkTo && 'hover:border-surface-600 cursor-pointer transition-colors')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-400">{title}</p>
          <p className="stat-value mt-1">{value}</p>
        </div>
        <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}
