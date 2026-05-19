import { useState, useEffect, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, customDashboardsApi } from '@/lib/api';
import { Link, useNavigate } from 'react-router-dom';
import { CompactRiskHeatMap } from '@/components/risk/RiskHeatMap';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { LazyRechartsWrapper } from '@/components/charts/LazyCharts';
import clsx from 'clsx';
import { SkeletonDashboard } from '@/components/Skeleton';
import { ActivityFeed } from '@/components/ActivityFeed';
import { QuickActions } from '@/components/QuickActions';
import OnboardingBanner from '@/components/OnboardingBanner';
import DemoModeBanner from '@/components/DemoModeBanner';
import { WorkspaceComparisonWidget } from '@/components/dashboard/WorkspaceComparisonWidget';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { ReportDownloadButton } from '@/components/ReportDownloadButton';
import { ActionItemsWidget } from '@/components/ActionItemsWidget';
import { VendorReviewsDueWidget } from '@/components/vendor/VendorReviewsDueWidget';
import { TrustAnalystQueueWidget } from '@/components/trust/TrustAnalystQueueWidget';
import { MappingCoverageWidget } from '@/components/widgets/MappingCoverageWidget';

// Dashboard widget configuration
interface DashboardConfig {
  widgets: {
    statsRow: boolean;
    alertBanner: boolean;
    frameworkReadiness: boolean;
    controlStatus: boolean;
    riskHeatMap: boolean;
    vendorReviewsDue: boolean;
    trustQueue: boolean;
    mappingCoverage: boolean;
    policyLifecycle: boolean;
    controlsByCategory: boolean;
    quickActions: boolean;
    recentActivity: boolean;
  };
}

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: {
    statsRow: true,
    alertBanner: true,
    frameworkReadiness: true,
    controlStatus: true,
    riskHeatMap: true,
    vendorReviewsDue: true,
    trustQueue: true,
    mappingCoverage: true,
    policyLifecycle: true,
    controlsByCategory: true,
    quickActions: true,
    recentActivity: true,
  },
};

const WIDGET_LABELS: Record<keyof DashboardConfig['widgets'], string> = {
  statsRow: 'Stats Cards',
  alertBanner: 'Alert Banner',
  frameworkReadiness: 'Framework Readiness',
  controlStatus: 'Control Status',
  riskHeatMap: 'Risk Heat Map',
  vendorReviewsDue: 'Vendor Reviews Due',
  trustQueue: 'Trust Queue',
  mappingCoverage: 'Mapping Coverage',
  policyLifecycle: 'Policy Lifecycle',
  controlsByCategory: 'Controls by Category',
  quickActions: 'Quick Actions',
  recentActivity: 'Recent Activity',
};

function loadDashboardConfig(): DashboardConfig {
  try {
    const saved = localStorage.getItem('dashboard-config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load dashboard config:', e);
  }
  return DEFAULT_CONFIG;
}

function saveDashboardConfig(config: DashboardConfig) {
  try {
    localStorage.setItem('dashboard-config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save dashboard config:', e);
  }
}

import { CONTROL_STATUS_COLORS, POLICY_STATUS_COLORS } from '@/lib/constants';

import { Button } from '@/components/ui/Button';

// Default empty summary to prevent crashes
const DEFAULT_SUMMARY = {
  complianceScore: { overall: 0, byFramework: {} },
  controls: { total: 0, byStatus: {}, byCategory: {}, overdue: 0 },
  evidence: { total: 0, pendingReview: 0, expiringSoon: 0, expired: 0 },
  upcomingTests: [],
  recentActivity: [],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<DashboardConfig>(loadDashboardConfig);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDashboardSelector, setShowDashboardSelector] = useState(false);

  // Save config whenever it changes
  useEffect(() => {
    saveDashboardConfig(config);
  }, [config]);

  const toggleWidget = (widget: keyof DashboardConfig['widgets']) => {
    setConfig((prev) => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [widget]: !prev.widgets[widget],
      },
    }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_CONFIG);
  };

  // Use consolidated dashboard endpoint - reduces 6 API calls to 1
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ['dashboard-full'],
    queryFn: () =>
      dashboardApi
        .getFull()
        .then((res) => res.data)
        .catch((error) => {
          console.error('Failed to load dashboard:', error);
          return null;
        }),
    staleTime: 5 * 60 * 1000, // 5 minute cache - matches backend
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Extract data from consolidated response with defaults
  const summary = dashboardData?.summary || DEFAULT_SUMMARY;
  const frameworksData = dashboardData?.frameworks || [];
  const policyStats = dashboardData?.policyStats || {
    total: 0,
    published: 0,
    approved: 0,
    inReview: 0,
    draft: 0,
    overdueReview: 0,
  };
  const risksData = dashboardData?.riskSummary || { risks: [], total: 0, byLevel: {} };
  const vendorData = dashboardData?.vendorSummary || null;

  // Fetch custom dashboards for the selector (separate query - user-specific)
  const { data: customDashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () =>
      customDashboardsApi
        .list()
        .then((res) => res.data)
        .catch(() => []),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isLoading = dashboardLoading;

  // IMPORTANT: All hooks must be called before any early returns
  // Use default summary if data is not available
  const safeSummary = summary || DEFAULT_SUMMARY;

  const frameworks = useMemo(
    () => (Array.isArray(frameworksData) ? frameworksData : []),
    [frameworksData]
  );

  // Framework readiness chart data - memoized to prevent recalculation
  const frameworkChartData = useMemo(
    () =>
      frameworks.map((f: any) => ({
        name: f.name?.replace('ISO/IEC ', '').replace(' Type II', '') || 'Unknown',
        score: f.readiness?.score || 0,
      })),
    [frameworks]
  );

  // Control status donut data - memoized
  const controlStatusData = useMemo(
    () =>
      safeSummary.controls?.byStatus
        ? Object.entries(safeSummary.controls.byStatus)
            .filter(([_, value]) => (value as number) > 0)
            .map(([name, value]) => ({
              name: name.replace(/_/g, ' '),
              value,
              color: CONTROL_STATUS_COLORS[name] || '#6b7280',
            }))
        : [],
    [safeSummary.controls?.byStatus]
  );

  // Policy status donut data - memoized
  const policyStatusData = useMemo(
    () =>
      [
        {
          name: 'Published',
          value: policyStats?.published || 0,
          color: POLICY_STATUS_COLORS.published,
        },
        {
          name: 'Approved',
          value: policyStats?.approved || 0,
          color: POLICY_STATUS_COLORS.approved,
        },
        {
          name: 'In Review',
          value: policyStats?.inReview || 0,
          color: POLICY_STATUS_COLORS.in_review,
        },
        { name: 'Draft', value: policyStats?.draft || 0, color: POLICY_STATUS_COLORS.draft },
      ].filter((d) => d.value > 0),
    [policyStats]
  );

  // Calculate action items - memoized
  const actionItems = useMemo(
    () =>
      (safeSummary.evidence?.pendingReview || 0) +
      (safeSummary.evidence?.expiringSoon || 0) +
      (safeSummary.controls?.overdue || 0) +
      (policyStats?.overdueReview || 0),
    [safeSummary.evidence, safeSummary.controls?.overdue, policyStats?.overdueReview]
  );

  const userDashboards = useMemo(
    () => customDashboards?.filter((d: any) => !d.isTemplate) || [],
    [customDashboards]
  );

  // Early return after all hooks
  if (isLoading) {
    return <SkeletonDashboard className="animate-fade-in" />;
  }

  // Show error banner if critical data failed to load
  const hasErrors = dashboardError;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error Banner */}
      {hasErrors && (
        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-600">Some data failed to load</p>
            <p className="text-sm text-yellow-700/80 mt-1">
              The dashboard is showing partial data. Some widgets may be empty or show default
              values.
            </p>
          </div>
        </div>
      )}
      {/* Header with Dashboard Selector and Configuration */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Dashboard</h1>
            <p className="text-surface-600 mt-1">Your compliance overview at a glance</p>
          </div>
          {/* Dashboard Selector Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowDashboardSelector(!showDashboardSelector)}
              className="btn-sm flex items-center gap-1 text-surface-600 hover:text-surface-200"
              variant="ghost"
            >
              <Squares2X2Icon className="w-4 h-4" />
              <span className="hidden sm:inline">Switch Dashboard</span>
              <ChevronDownIcon className="w-4 h-4" />
            </Button>
            {showDashboardSelector && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDashboardSelector(false)}
                />
                <div className="absolute left-0 mt-2 w-64 bg-surface-800 border border-surface-700 rounded-lg shadow-xl z-20">
                  <div className="p-3 border-b border-surface-700">
                    <p className="text-sm font-medium text-surface-700">My Dashboards</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {userDashboards.length === 0 ? (
                      <div className="p-3 text-sm text-surface-500">No custom dashboards yet</div>
                    ) : (
                      userDashboards.map((dashboard: any) => (
                        <button
                          key={dashboard.id}
                          onClick={() => {
                            navigate(`/dashboards`);
                            setShowDashboardSelector(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-700 flex items-center justify-between group"
                        >
                          <span className="text-sm text-surface-700 group-hover:text-surface-100">
                            {dashboard.name}
                          </span>
                          {dashboard.isDefault && (
                            <span className="text-xs text-yellow-600">Default</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-surface-700">
                    <Link
                      to="/dashboards"
                      onClick={() => setShowDashboardSelector(false)}
                      className="w-full btn btn-ghost btn-sm justify-start text-brand-400 hover:text-brand-300"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" /> Create Custom Dashboard
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportDownloadButton />
          <Button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2"
            title="Customize Dashboard"
            variant="secondary"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Customize</span>
          </Button>
        </div>
      </div>
      {/* Dashboard Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfigModal(false)} />
          <div className="relative bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-surface-700">
              <h3 className="text-lg font-semibold text-surface-100">Customize Dashboard</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-surface-600 hover:text-surface-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-surface-600 mb-4">
                Toggle widgets to show or hide them on your dashboard.
              </p>
              {(Object.keys(WIDGET_LABELS) as Array<keyof DashboardConfig['widgets']>).map(
                (widget) => (
                  <button
                    key={widget}
                    onClick={() => toggleWidget(widget)}
                    className={clsx(
                      'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                      config.widgets[widget]
                        ? 'bg-brand-500/10 border-brand-500/30 text-surface-100'
                        : 'bg-surface-800 border-surface-700 text-surface-600'
                    )}
                  >
                    <span className="font-medium">{WIDGET_LABELS[widget]}</span>
                    {config.widgets[widget] ? (
                      <EyeIcon className="w-5 h-5 text-brand-400" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5 text-surface-500" />
                    )}
                  </button>
                )
              )}
            </div>
            <div className="flex items-center justify-between p-4 border-t border-surface-700">
              <button
                onClick={resetConfig}
                className="text-sm text-surface-600 hover:text-surface-100 transition-colors"
              >
                Reset to Default
              </button>
              <Button onClick={() => setShowConfigModal(false)} variant="primary">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Onboarding Banner - Shows when organization is empty */}
      <OnboardingBanner />
      {/* Demo Mode Banner - Shows when demo data is active */}
      <DemoModeBanner />
      {/* First-run Onboarding Wizard */}
      <OnboardingWizard />
      {/* Top Stats Row - 4 distinct KPIs */}
      {config.widgets.statsRow && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Compliance Score"
            value={`${safeSummary.complianceScore?.overall || 0}%`}
            icon={ShieldCheckIcon}
            color="brand"
          />
          <StatCard
            title="Total Controls"
            value={safeSummary.controls?.total || 0}
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
            value={safeSummary.evidence?.total || 0}
            icon={FolderOpenIcon}
            color="purple"
            linkTo="/evidence"
          />
        </div>
      )}
      {/* Alert Banner - Only show if there are action items and widget is enabled */}
      {config.widgets.alertBanner && actionItems > 0 && (
        <div className="bg-amber-50 dark:bg-yellow-500/10 border border-amber-300 dark:border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-amber-700 dark:text-yellow-600 font-medium">
                {actionItems} items need attention:
              </span>
              <span className="text-gray-600 dark:text-surface-600 ml-2">
                {(safeSummary.evidence?.pendingReview ?? 0) > 0 &&
                  `${safeSummary.evidence?.pendingReview} pending review`}
                {(safeSummary.evidence?.expiringSoon ?? 0) > 0 &&
                  `, ${safeSummary.evidence?.expiringSoon} expiring soon`}
                {(policyStats?.overdueReview ?? 0) > 0 &&
                  `, ${policyStats?.overdueReview} overdue policy reviews`}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Main Charts Row */}
      {(config.widgets.frameworkReadiness || config.widgets.controlStatus) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Framework Readiness */}
          {config.widgets.frameworkReadiness && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-100">Framework Readiness</h2>
                <Link
                  to="/frameworks"
                  className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  View all <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
              <div className="h-56">
                {frameworkChartData.length > 0 ? (
                  <LazyRechartsWrapper height={224}>
                    {({ BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer }) => (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={frameworkChartData}
                          layout="vertical"
                          margin={{ left: 10, right: 20 }}
                        >
                          <XAxis
                            type="number"
                            domain={[0, 100]}
                            stroke="#71717a"
                            tickFormatter={(v: number) => `${v}%`}
                          />
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
                            {frameworkChartData.map(
                              (entry: { name: string; score: number }, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.score >= 70
                                      ? '#22c55e'
                                      : entry.score >= 40
                                        ? '#eab308'
                                        : '#ef4444'
                                  }
                                />
                              )
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </LazyRechartsWrapper>
                ) : (
                  <div className="flex items-center justify-center h-full text-surface-500">
                    No frameworks configured
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Control Implementation Status */}
          {config.widgets.controlStatus && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-100">Control Status</h2>
                <Link
                  to="/controls"
                  className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  View all <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
              <div className="h-44">
                <LazyRechartsWrapper height={176}>
                  {({ PieChart, Pie, Cell, Tooltip, ResponsiveContainer }) => (
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
                  )}
                </LazyRechartsWrapper>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {controlStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-surface-600 capitalize">
                      {item.name}: {String(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Risk Summary Row - Vendor Risk + Heat Map */}
      {config.widgets.riskHeatMap && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendor Risk Summary */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">Vendor Risk Summary</h2>
              <Link
                to="/vendors"
                className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                View all <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <VendorRiskSummary data={vendorData} />
          </div>

          {/* Risk Heat Map - Always show, with empty state if no risks */}
          <div className="card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-surface-100">Risk Heat Map</h2>
              <Link
                to="/risks"
                className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                View all <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>
            {risksData.risks && risksData.risks.length > 0 ? (
              <>
                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                  <div className="w-full max-w-[280px]">
                    <CompactRiskHeatMap risks={risksData.risks as any[]} showCounts />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-700">
                  <p className="text-sm text-surface-600">
                    <span className="font-semibold text-surface-200">{risksData.risks.length}</span>{' '}
                    risks tracked
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-red-400"></span>
                      <span className="text-surface-500">Critical</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-orange-400"></span>
                      <span className="text-surface-500">High</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-400"></span>
                      <span className="text-surface-500">Medium</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-emerald-400"></span>
                      <span className="text-surface-500">Low</span>
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-center">
                <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center mb-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-surface-500" />
                </div>
                <p className="text-surface-600 text-sm mb-2">No risks registered yet</p>
                <Link
                  to="/risks"
                  className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1"
                >
                  Add your first risk <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Bottom Row */}
      {(config.widgets.policyLifecycle || config.widgets.controlsByCategory) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Policy Lifecycle */}
          {config.widgets.policyLifecycle && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-surface-100">Policy Lifecycle</h2>
                <Link
                  to="/policies"
                  className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
                >
                  Manage <ChevronRightIcon className="w-4 h-4" />
                </Link>
              </div>
              <div className="h-44">
                <LazyRechartsWrapper height={176}>
                  {({ PieChart, Pie, Cell, Tooltip, ResponsiveContainer }) => (
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
                  )}
                </LazyRechartsWrapper>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {policyStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-surface-600">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls by Category - Top 6 */}
          {config.widgets.controlsByCategory && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Controls by Category</h2>
              <div className="space-y-3">
                {Object.entries(safeSummary.controls?.byCategory || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 6)
                  .map(([category, count]) => {
                    const percentage = Math.round(
                      ((count as number) / (safeSummary.controls?.total || 1)) * 100
                    );
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-surface-600 capitalize">
                            {category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-surface-700">{String(count)}</span>
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
          )}
        </div>
      )}
      {/* Workspace Comparison (admin only, when multi-workspace is enabled) */}
      <WorkspaceComparisonWidget />
      {/* Vendor Reviews & Trust Queue Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {config.widgets.vendorReviewsDue && <VendorReviewsDueWidget />}
        {config.widgets.trustQueue && <TrustAnalystQueueWidget />}
        {config.widgets.mappingCoverage && <MappingCoverageWidget frameworkId={undefined} />}
      </div>
      {/* Action Items Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActionItemsWidget limit={5} />

        {/* Quick Actions */}
        {config.widgets.quickActions && <QuickActions />}
      </div>
      {/* Recent Activity */}
      {config.widgets.recentActivity && <ActivityFeed limit={8} />}
    </div>
  );
}

const COLOR_CLASSES = {
  brand: 'bg-brand-600/20 text-brand-400',
  green: 'bg-green-600/20 text-green-600',
  blue: 'bg-blue-600/20 text-blue-600',
  yellow: 'bg-yellow-600/20 text-yellow-600',
  red: 'bg-red-600/20 text-red-600',
  purple: 'bg-purple-600/20 text-purple-600',
} as const;

const StatCard = memo(function StatCard({
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
  const content = (
    <div
      className={clsx(
        'stat-card h-full',
        linkTo && 'hover:border-surface-600 cursor-pointer transition-colors'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-600">{title}</p>
          <p className="stat-value mt-1">{value}</p>
        </div>
        <div className={clsx('p-2 rounded-lg', COLOR_CLASSES[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
});

interface VendorRiskSummaryProps {
  data?: {
    total: number;
    recentVendors: Array<{ id: string; name: string; criticality: string; status: string }>;
    byCriticality: Record<string, number>;
    active: number;
    pendingReview: number;
  } | null;
}

const VendorRiskSummary = memo(function VendorRiskSummary({ data }: VendorRiskSummaryProps) {
  // Use pre-fetched data from consolidated endpoint - no separate API call needed
  const vendors = data?.recentVendors || [];

  // Use pre-calculated stats from the backend
  const stats = useMemo(
    () => ({
      total: data?.total || 0,
      critical: data?.byCriticality?.critical || 0,
      high: data?.byCriticality?.high || 0,
      medium: data?.byCriticality?.medium || 0,
      low: data?.byCriticality?.low || 0,
      active: data?.active || 0,
      pendingReview: data?.pendingReview || 0,
    }),
    [data]
  );

  // Memoize criticality data
  const criticialityData = useMemo(
    () => [
      { label: 'Critical', count: stats.critical, color: 'bg-red-500', textColor: 'text-red-600' },
      { label: 'High', count: stats.high, color: 'bg-orange-500', textColor: 'text-orange-600' },
      {
        label: 'Medium',
        count: stats.medium,
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
      },
      { label: 'Low', count: stats.low, color: 'bg-green-500', textColor: 'text-green-600' },
    ],
    [stats]
  );

  // No loading state needed - data is pre-fetched with the consolidated endpoint

  if (stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-700 flex items-center justify-center mb-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-surface-500" />
        </div>
        <p className="text-surface-600 text-sm">No vendors configured yet</p>
        <Link to="/vendors" className="text-brand-400 text-sm mt-2 hover:text-brand-300">
          Add your first vendor →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-surface-800/50 rounded-lg">
          <p className="text-2xl font-bold text-surface-100">{stats.total}</p>
          <p className="text-xs text-surface-600">Total Vendors</p>
        </div>
        <div className="text-center p-3 bg-surface-800/50 rounded-lg">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-surface-600">Active</p>
        </div>
        <div className="text-center p-3 bg-surface-800/50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
          <p className="text-xs text-surface-600">Pending Review</p>
        </div>
      </div>

      {/* Criticality Breakdown */}
      <div>
        <p className="text-sm text-surface-600 mb-2">By Criticality</p>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-surface-800">
          {criticialityData.map(
            (item) =>
              item.count > 0 && (
                <div
                  key={item.label}
                  className={`${item.color} transition-all`}
                  style={{ width: `${(item.count / stats.total) * 100}%` }}
                  title={`${item.label}: ${item.count}`}
                />
              )
          )}
        </div>
        <div className="flex justify-between mt-2">
          {criticialityData.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-xs text-surface-600">
                {item.label}: <span className={item.textColor}>{item.count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Vendors */}
      <div>
        <p className="text-sm text-surface-600 mb-2">Recent Vendors</p>
        <div className="space-y-2">
          {vendors.slice(0, 4).map((vendor: any) => (
            <Link
              key={vendor.id}
              to={`/vendors/${vendor.id}`}
              className="flex items-center justify-between p-2 bg-surface-800/50 rounded-lg hover:bg-surface-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full',
                    vendor.criticality === 'critical'
                      ? 'bg-red-500'
                      : vendor.criticality === 'high'
                        ? 'bg-orange-500'
                        : vendor.criticality === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                  )}
                />
                <span className="text-sm text-surface-200 truncate max-w-[180px]">
                  {vendor.name}
                </span>
              </div>
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded',
                  vendor.status === 'active'
                    ? 'bg-green-500/20 text-green-600'
                    : vendor.status === 'pending_review'
                      ? 'bg-yellow-500/20 text-yellow-600'
                      : 'bg-surface-600 text-surface-600'
                )}
              >
                {vendor.status?.replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});
