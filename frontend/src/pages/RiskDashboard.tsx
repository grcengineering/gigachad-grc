import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { risksApi } from '../lib/api';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Edit mode toggle for dashboard customization
function DashboardEditToggle({ 
  isEditing, 
  onToggle, 
  onSave, 
  onReset,
  isSaving,
}: { 
  isEditing: boolean; 
  onToggle: () => void; 
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-surface-400 hover:text-gray-800 dark:hover:text-surface-200 flex items-center gap-1"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
          <button
            onClick={onToggle}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-surface-700 text-gray-700 dark:text-surface-300 rounded-lg hover:bg-gray-300 dark:hover:bg-surface-600"
          >
            Done
          </button>
        </>
      ) : (
        <button
          onClick={onToggle}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-surface-400 hover:text-gray-800 dark:hover:text-surface-200 flex items-center gap-1"
          title="Customize dashboard layout"
        >
          <Cog6ToothIcon className="w-4 h-4" />
          Customize
        </button>
      )}
    </div>
  );
}

// Widget visibility configuration
interface WidgetConfig {
  totalRisks: boolean;
  openRisks: boolean;
  inTreatment: boolean;
  mitigatedThisMonth: boolean;
  riskLevelDistribution: boolean;
  risksByCategory: boolean;
  recentRisks: boolean;
  quickActions: boolean;
  riskAppetite: boolean;
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  totalRisks: true,
  openRisks: true,
  inTreatment: true,
  mitigatedThisMonth: true,
  riskLevelDistribution: true,
  risksByCategory: true,
  recentRisks: true,
  quickActions: true,
  riskAppetite: true,
};

const STORAGE_KEY = 'risk-dashboard-config';

export default function RiskDashboard() {
  const [isEditing, setIsEditing] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(saved) } : DEFAULT_WIDGET_CONFIG;
    } catch {
      return DEFAULT_WIDGET_CONFIG;
    }
  });
  const [tempConfig, setTempConfig] = useState<WidgetConfig>(widgetConfig);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      // Cancel editing - restore original config
      setTempConfig(widgetConfig);
    } else {
      // Start editing
      setTempConfig(widgetConfig);
    }
    setIsEditing(!isEditing);
  }, [isEditing, widgetConfig]);

  const handleSaveLayout = useCallback(() => {
    setWidgetConfig(tempConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tempConfig));
    setIsEditing(false);
    toast.success('Dashboard layout saved');
  }, [tempConfig]);

  const handleResetLayout = useCallback(() => {
    setTempConfig(DEFAULT_WIDGET_CONFIG);
  }, []);

  const toggleWidget = useCallback((key: keyof WidgetConfig) => {
    setTempConfig(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const activeConfig = isEditing ? tempConfig : widgetConfig;
  // Fetch dashboard stats
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['risk-dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Fetch recent risks
  const { data: recentRisks } = useQuery({
    queryKey: ['risks', 'recent'],
    queryFn: async () => {
      const response = await risksApi.list({ limit: 5 });
      return response.data;
    },
  });

  // Fetch trend data
  const { data: _trendData } = useQuery({
    queryKey: ['risk-trend'],
    queryFn: async () => {
      const response = await risksApi.getTrend(30);
      return response.data;
    },
  });
  void _trendData; // Available for trend chart

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-surface-500';
    }
  };

  const getStatusColor = (status: string) => {
    if (status.includes('complete') || status.includes('mitigat') || status.includes('accept') || status.includes('avoid') || status.includes('transfer')) {
      return 'text-emerald-400 bg-emerald-500/20';
    }
    if (status.includes('progress') || status.includes('review') || status.includes('approval')) {
      return 'text-amber-400 bg-amber-500/20';
    }
    return 'text-blue-400 bg-blue-500/20';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-surface-400">Loading risk dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Risk Dashboard</h1>
          <p className="text-gray-500 dark:text-surface-400 mt-1">Executive overview of your risk posture</p>
        </div>
        <div className="flex items-center gap-4">
          <DashboardEditToggle
            isEditing={isEditing}
            onToggle={handleToggleEdit}
            onSave={handleSaveLayout}
            onReset={handleResetLayout}
            isSaving={false}
          />
          <Link
            to="/risks"
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
          >
            <ExclamationTriangleIcon className="w-5 h-5" />
            View All Risks
          </Link>
        </div>
      </div>

      {/* Edit Mode: Widget Visibility Controls */}
      {isEditing && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
          <h3 className="text-amber-800 dark:text-amber-400 font-medium mb-3">Customize Dashboard</h3>
          <p className="text-amber-700 dark:text-amber-300 text-sm mb-4">Toggle widgets on/off to customize your dashboard view.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.entries(tempConfig) as [keyof WidgetConfig, boolean][]).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleWidget(key)}
                  className="rounded border-amber-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-amber-800 dark:text-amber-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {(activeConfig.totalRisks || activeConfig.openRisks || activeConfig.inTreatment || activeConfig.mitigatedThisMonth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeConfig.totalRisks && (
            <MetricCard
              title="Total Risks"
              value={dashboard?.totalRisks || 0}
              icon={ExclamationTriangleIcon}
              color="text-blue-400"
              bgColor="bg-blue-500/20"
            />
          )}
          {activeConfig.openRisks && (
            <MetricCard
              title="Open Risks"
              value={dashboard?.openRisks || 0}
              icon={ClockIcon}
              color="text-amber-400"
              bgColor="bg-amber-500/20"
              trend={dashboard?.openRisksTrend}
            />
          )}
          {activeConfig.inTreatment && (
            <MetricCard
              title="In Treatment"
              value={dashboard?.inTreatment || 0}
              icon={ArrowTrendingUpIcon}
              color="text-cyan-400"
              bgColor="bg-cyan-500/20"
            />
          )}
          {activeConfig.mitigatedThisMonth && (
            <MetricCard
              title="Mitigated This Month"
              value={dashboard?.mitigatedThisMonth || 0}
              icon={CheckCircleIcon}
              color="text-emerald-400"
              bgColor="bg-emerald-500/20"
            />
          )}
        </div>
      )}

      {/* Risk Level Distribution & Risk by Category */}
      {(activeConfig.riskLevelDistribution || activeConfig.risksByCategory) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Level Distribution */}
          {activeConfig.riskLevelDistribution && (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risk Level Distribution</h2>
              <div className="space-y-4">
                {[
                  { key: 'very_high', label: 'Critical' },
                  { key: 'high', label: 'High' },
                  { key: 'medium', label: 'Medium' },
                  { key: 'low', label: 'Low' },
                ].map(({ key, label }) => {
                  const count = dashboard?.byRiskLevel?.find((r: any) => 
                    r.level === key || r.inherent_risk === key || 
                    (key === 'very_high' && (r.level === 'critical' || r.inherent_risk === 'critical'))
                  )?.count || (dashboard?.byRiskLevel?.[key] as number) || 0;
                  const total = dashboard?.totalRisks || 1;
                  const percentage = Math.round((count / total) * 100);
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-surface-300">{label}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getRiskLevelColor(key === 'very_high' ? 'critical' : key)} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Risk by Category */}
          {activeConfig.risksByCategory && (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risks by Category</h2>
              <div className="space-y-3">
                {(dashboard?.byCategory || []).slice(0, 6).map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-surface-300 capitalize">{cat.category?.replace('_', ' ') || 'Uncategorized'}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-surface-700 rounded text-gray-900 dark:text-white text-sm font-medium">
                      {cat.count}
                    </span>
                  </div>
                ))}
                {(!dashboard?.byCategory || dashboard.byCategory.length === 0) && (
                  <p className="text-gray-500 dark:text-surface-500 text-center py-4">No risks categorized yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Risks & Quick Actions */}
      {(activeConfig.recentRisks || activeConfig.quickActions) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Risks */}
          {activeConfig.recentRisks && (
            <div className="lg:col-span-2 bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Risks</h2>
                <Link to="/risks" className="text-brand-500 dark:text-brand-400 text-sm hover:text-brand-600 dark:hover:text-brand-300">
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {(recentRisks?.risks || []).map((risk: any) => (
                  <Link
                    key={risk.id}
                    to={`/risks/${risk.id}`}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-surface-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${getRiskLevelColor(risk.inherentRisk)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{risk.title}</p>
                      <p className="text-gray-500 dark:text-surface-400 text-sm truncate">{risk.riskId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}>
                      {risk.status.replace(/_/g, ' ')}
                    </span>
                  </Link>
                ))}
                {(!recentRisks?.risks || recentRisks.risks.length === 0) && (
                  <p className="text-gray-500 dark:text-surface-500 text-center py-8">No risks recorded yet</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {activeConfig.quickActions && (
            <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/risks?create=true"
                  className="flex items-center gap-3 p-3 bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors"
                >
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span>Report New Risk</span>
                </Link>
                <Link
                  to="/risk-queue"
                  className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
                >
                  <ClockIcon className="w-5 h-5" />
                  <span>View My Queue</span>
                </Link>
                <Link
                  to="/risk-heatmap"
                  className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span>View Heatmap</span>
                </Link>
                <Link
                  to="/risk-reports"
                  className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 transition-colors"
                >
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  <span>Generate Report</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Appetite Indicator */}
      {activeConfig.riskAppetite && (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risk Appetite Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 mb-3">
              <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.withinAppetite || 0}</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">Within Appetite</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.nearingThreshold || 0}</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">Nearing Threshold</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-3">
              <ArrowTrendingDownIcon className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboard?.exceedsAppetite || 0}</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">Exceeds Appetite</p>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  trend?: number;
}) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-gray-500 dark:text-surface-400 text-sm">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {trend !== undefined && (
              <span className={`text-sm ${trend >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



