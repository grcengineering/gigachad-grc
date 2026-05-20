import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { LazyRechartsWrapper } from '@/components/charts/LazyCharts';

interface DashboardStats {
  totalAudits: number;
  activeAudits: number;
  completedAudits: number;
  totalFindings: number;
  openFindings: number;
  criticalFindings: number;
  overdueFindings: number;
  totalRequests: number;
  openRequests: number;
}

interface FindingAnalytics {
  bySeverity: { severity: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  avgRemediationDays: number;
}

interface TrendData {
  period: string;
  audits: { period: string; count: number }[];
  findings: { period: string; count: number }[];
}

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  observation: '#6b7280',
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  icon: typeof ChartBarIcon;
  trend?: string;
  color?: string;
}) {
  return (
    <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-surface-600 text-sm">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color || 'text-white'}`}>{value}</p>
          {trend && <p className="text-sm text-surface-500 mt-1">{trend}</p>}
        </div>
        <div
          className={`p-3 rounded-lg ${color ? 'bg-opacity-10' : 'bg-surface-700'}`}
          style={{ backgroundColor: color ? `${color}20` : undefined }}
        >
          <Icon className="h-6 w-6" style={{ color: color || '#9ca3af' }} />
        </div>
      </div>
    </div>
  );
}

export default function AuditAnalytics() {
  const { data: dashboard } = useQuery<DashboardStats>({
    queryKey: ['audit-analytics-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/audit/analytics/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
  });

  const { data: findings } = useQuery<FindingAnalytics>({
    queryKey: ['audit-analytics-findings'],
    queryFn: async () => {
      const res = await fetch('/api/audit/analytics/findings');
      if (!res.ok) throw new Error('Failed to fetch findings');
      return res.json();
    },
  });

  const { data: trends } = useQuery<TrendData>({
    queryKey: ['audit-analytics-trends'],
    queryFn: async () => {
      const res = await fetch('/api/audit/analytics/trends?period=monthly');
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Analytics</h1>
        <p className="text-surface-600 mt-1">Insights and trends across your audit program</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Audits"
          value={dashboard?.totalAudits || 0}
          icon={DocumentMagnifyingGlassIcon}
        />
        <StatCard
          title="Active Audits"
          value={dashboard?.activeAudits || 0}
          icon={ClockIcon}
          color="#3b82f6"
        />
        <StatCard
          title="Open Findings"
          value={dashboard?.openFindings || 0}
          icon={ExclamationTriangleIcon}
          color="#f97316"
        />
        <StatCard
          title="Critical Findings"
          value={dashboard?.criticalFindings || 0}
          icon={ExclamationTriangleIcon}
          color="#ef4444"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings by Severity */}
        <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
          <h3 className="text-lg font-semibold text-white mb-4">Findings by Severity</h3>
          <div className="h-64">
            <LazyRechartsWrapper height={256}>
              {(Recharts) => {
                const { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = Recharts;
                const data = (findings?.bySeverity || []).map((item) => ({
                  name: item.severity,
                  value: item.count,
                }));
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={severityColors[entry.name] || '#6b7280'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              }}
            </LazyRechartsWrapper>
          </div>
        </div>

        {/* Findings Trend */}
        <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
          <h3 className="text-lg font-semibold text-white mb-4">Findings Trend</h3>
          <div className="h-64">
            <LazyRechartsWrapper height={256}>
              {(Recharts) => {
                const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;
                const data = trends?.findings || [];
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf680" />
                    </AreaChart>
                  </ResponsiveContainer>
                );
              }}
            </LazyRechartsWrapper>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avg Remediation Time */}
        <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-4">
            <ClockIcon className="h-6 w-6 text-brand-400" />
            <h3 className="text-lg font-semibold text-white">Avg Remediation Time</h3>
          </div>
          <p className="text-4xl font-bold text-white">
            {findings?.avgRemediationDays || 0}
            <span className="text-lg font-normal text-surface-600 ml-2">days</span>
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-white">Audit Completion Rate</h3>
          </div>
          <p className="text-4xl font-bold text-white">
            {dashboard?.totalAudits
              ? Math.round((dashboard.completedAudits / dashboard.totalAudits) * 100)
              : 0}
            <span className="text-lg font-normal text-surface-600 ml-1">%</span>
          </p>
        </div>

        {/* Request Status */}
        <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
          <div className="flex items-center gap-3 mb-4">
            <DocumentMagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-white">Request Completion</h3>
          </div>
          <p className="text-4xl font-bold text-white">
            {dashboard?.totalRequests
              ? Math.round(
                  ((dashboard.totalRequests - dashboard.openRequests) / dashboard.totalRequests) *
                    100
                )
              : 0}
            <span className="text-lg font-normal text-surface-600 ml-1">%</span>
          </p>
        </div>
      </div>

      {/* Findings by Category */}
      <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
        <h3 className="text-lg font-semibold text-white mb-4">Findings by Category</h3>
        <div className="h-64">
          <LazyRechartsWrapper height={256}>
            {(Recharts) => {
              const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } = Recharts;
              const data = findings?.byCategory || [];
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical">
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="#6b7280"
                      fontSize={12}
                      width={150}
                      tickFormatter={(val) => val.replace(/_/g, ' ')}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            }}
          </LazyRechartsWrapper>
        </div>
      </div>
    </div>
  );
}
