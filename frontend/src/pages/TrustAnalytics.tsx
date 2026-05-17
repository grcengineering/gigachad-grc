import { useQuery } from '@tanstack/react-query';
import { 
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { questionnairesApi, knowledgeBaseApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { LazyRechartsWrapper } from '@/components/charts/LazyCharts';
import clsx from 'clsx';

export default function TrustAnalytics() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['questionnaire-analytics', organizationId],
    queryFn: async () => {
      const response = await questionnairesApi.getAnalytics(organizationId!);
      return response.data;
    },
    enabled: !!organizationId,
  });

  const { data: kbStats } = useQuery({
    queryKey: ['kb-stats', organizationId],
    queryFn: async () => {
      const response = await knowledgeBaseApi.getStats(organizationId!);
      return response.data;
    },
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <EmptyState
        variant="warning"
        title="Sign in required"
        description="You need to be signed in to view trust analytics."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-surface-700 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-surface-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-surface-800 rounded-xl animate-pulse" />
          <div className="h-80 bg-surface-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  const summary = analytics?.summary || {
    totalQuestionnaires: 0,
    completedQuestionnaires: 0,
    completionRate: 0,
    avgQuestionsPerQuestionnaire: 0,
    totalQuestions: 0,
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: '#F59E0B',
    answered: '#10B981',
    approved: '#3B82F6',
    in_progress: '#6366F1',
    rejected: '#EF4444',
  };

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#6B7280',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Trust Analytics</h1>
          <p className="mt-1 text-surface-400">
            Insights into questionnaire performance and knowledge base usage
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Questionnaires"
          value={summary.totalQuestionnaires}
          icon={DocumentTextIcon}
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${summary.completionRate}%`}
          icon={CheckCircleIcon}
          color="green"
          subtitle={`${summary.completedQuestionnaires} completed`}
        />
        <StatCard
          title="Total Questions"
          value={summary.totalQuestions}
          icon={ChartBarIcon}
          color="purple"
          subtitle={`~${summary.avgQuestionsPerQuestionnaire} per questionnaire`}
        />
        <StatCard
          title="KB Entries"
          value={kbStats?.total || 0}
          icon={BookOpenIcon}
          color="amber"
          subtitle={`${kbStats?.approved || 0} approved`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions by Status */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">Questions by Status</h3>
          <LazyRechartsWrapper height={250}>
            {(Recharts) => analytics?.questionsByStatus ? (
              <Recharts.ResponsiveContainer width="100%" height={250}>
                <Recharts.PieChart>
                  <Recharts.Pie
                    data={analytics.questionsByStatus.map((s: any) => ({
                      name: s.status.charAt(0).toUpperCase() + s.status.slice(1).replace('_', ' '),
                      value: s.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics.questionsByStatus.map((entry: any, index: number) => (
                      <Recharts.Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.status] || '#6B7280'} 
                      />
                    ))}
                  </Recharts.Pie>
                  <Recharts.Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                </Recharts.PieChart>
              </Recharts.ResponsiveContainer>
            ) : null}
          </LazyRechartsWrapper>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {analytics?.questionsByStatus?.map((s: any) => (
              <div key={s.status} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: STATUS_COLORS[s.status] || '#6B7280' }} 
                />
                <span className="text-surface-300 capitalize">{s.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Questionnaires by Priority */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">Questionnaires by Priority</h3>
          <LazyRechartsWrapper height={250}>
            {(Recharts) => analytics?.questionnairesByPriority ? (
              <Recharts.ResponsiveContainer width="100%" height={250}>
                <Recharts.BarChart
                  data={analytics.questionnairesByPriority.map((p: any) => ({
                    name: p.priority.charAt(0).toUpperCase() + p.priority.slice(1),
                    count: p.count,
                    fill: PRIORITY_COLORS[p.priority] || '#6B7280',
                  }))}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <Recharts.XAxis type="number" stroke="#9CA3AF" />
                  <Recharts.YAxis type="category" dataKey="name" stroke="#9CA3AF" />
                  <Recharts.Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Recharts.Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {analytics.questionnairesByPriority.map((entry: any, index: number) => (
                      <Recharts.Cell 
                        key={`cell-${index}`} 
                        fill={PRIORITY_COLORS[entry.priority] || '#6B7280'} 
                      />
                    ))}
                  </Recharts.Bar>
                </Recharts.BarChart>
              </Recharts.ResponsiveContainer>
            ) : null}
          </LazyRechartsWrapper>
        </div>
      </div>

      {/* Response Time & Completion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Response Time by Priority */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ClockIcon className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-semibold text-surface-100">Average Response Time</h3>
          </div>
          <div className="space-y-4">
            {analytics?.responseTimeByPriority?.map((item: any) => (
              <div key={item.priority} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PRIORITY_COLORS[item.priority] || '#6B7280' }}
                  />
                  <span className="text-surface-200 capitalize">{item.priority}</span>
                </div>
                <div className="text-right">
                  <span className="text-surface-100 font-semibold">
                    {formatHours(item.avgHours)}
                  </span>
                  <span className="text-xs text-surface-500 ml-2">
                    ({item.count} completed)
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-surface-400 text-sm">No completion data available</p>
            )}
          </div>
        </div>

        {/* Completion Trend */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <ArrowTrendingUpIcon className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-semibold text-surface-100">Completion Trend</h3>
          </div>
          <LazyRechartsWrapper height={200}>
            {(Recharts) => analytics?.completionTrend && analytics.completionTrend.length > 0 ? (
              <Recharts.ResponsiveContainer width="100%" height={200}>
                <Recharts.AreaChart
                  data={analytics.completionTrend.map((t: any) => ({
                    week: new Date(t.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    completions: t.count,
                  }))}
                  margin={{ left: 0, right: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCompletions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <Recharts.XAxis dataKey="week" stroke="#9CA3AF" fontSize={12} />
                  <Recharts.YAxis stroke="#9CA3AF" fontSize={12} />
                  <Recharts.Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Recharts.Area 
                    type="monotone" 
                    dataKey="completions" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorCompletions)" 
                  />
                </Recharts.AreaChart>
              </Recharts.ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-surface-400 text-sm">
                No completion data for this period
              </div>
            )}
          </LazyRechartsWrapper>
        </div>
      </div>

      {/* Top Knowledge Base Entries */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpenIcon className="w-5 h-5 text-surface-400" />
          <h3 className="text-lg font-semibold text-surface-100">Most Used Knowledge Base Entries</h3>
        </div>
        {analytics?.topKbEntries && analytics.topKbEntries.length > 0 ? (
          <div className="divide-y divide-surface-700">
            {analytics.topKbEntries.map((entry: any, index: number) => (
              <div key={entry.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-surface-700 text-surface-400 text-sm font-bold rounded">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-surface-100 font-medium">{entry.title}</p>
                    {entry.category && (
                      <span className="text-xs text-surface-500 capitalize">{entry.category}</span>
                    )}
                  </div>
                </div>
                <span className="text-surface-400 text-sm">
                  {entry.usageCount} uses
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-surface-400 text-sm">No usage data available yet</p>
        )}
      </div>
    </div>
  );
}

// Helper function to format hours
function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-surface-400">{title}</span>
      </div>
      <p className="text-3xl font-bold text-surface-100">{value}</p>
      {subtitle && (
        <p className="text-xs text-surface-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

