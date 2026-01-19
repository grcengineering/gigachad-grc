import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldExclamationIcon,
  DocumentTextIcon,
  BeakerIcon,
  BookOpenIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import clsx from 'clsx';

interface DashboardSummary {
  processes: {
    total: number;
    tier_1_count: number;
    tier_2_count: number;
    tier_3_count: number;
    tier_4_count: number;
    overdue_review_count: number;
  };
  plans: {
    total: number;
    published_count: number;
    draft_count: number;
    overdue_review_count: number;
  };
  tests: {
    total: number;
    completed_count: number;
    passed_count: number;
    failed_count: number;
    upcoming_count: number;
    openFindingsCount: number;
  };
  runbooks: {
    total: number;
    published_count: number;
    needs_review_count: number;
  };
  upcomingTests: Array<{
    id: string;
    test_id: string;
    name: string;
    scheduled_date: string;
    test_type: string;
  }>;
  overdueItems: {
    totalOverdue: number;
    plans: any[];
    processes: any[];
    findings: any[];
  };
}

interface BCDRMetrics {
  readinessScore: number;
  metrics: {
    rtoCoverage: number;
    planCoverage: number;
    testSuccessRate: number;
    overdueItems: number;
  };
}

// Default values for safe rendering when data is not available
const DEFAULT_SUMMARY: DashboardSummary = {
  processes: { total: 0, tier_1_count: 0, tier_2_count: 0, tier_3_count: 0, tier_4_count: 0, overdue_review_count: 0 },
  plans: { total: 0, published_count: 0, draft_count: 0, overdue_review_count: 0 },
  tests: { total: 0, completed_count: 0, passed_count: 0, failed_count: 0, upcoming_count: 0, openFindingsCount: 0 },
  runbooks: { total: 0, published_count: 0, needs_review_count: 0 },
  upcomingTests: [],
  overdueItems: { totalOverdue: 0, plans: [], processes: [], findings: [] },
};

const DEFAULT_METRICS: BCDRMetrics = {
  readinessScore: 0,
  metrics: { rtoCoverage: 0, planCoverage: 0, testSuccessRate: 0, overdueItems: 0 },
};

export default function BCDRDashboard() {
  const { data: summaryData, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ['bcdr-dashboard'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard');
      return res.data;
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  const { data: metricsData, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery<BCDRMetrics>({
    queryKey: ['bcdr-metrics'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard/metrics');
      return res.data;
    },
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
  });

  // Fetch additional data for new widgets - must be before any early returns
  const { data: activeIncidents } = useQuery({
    queryKey: ['bcdr-active-incidents'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/incidents/active');
      return res.data || [];
    },
    staleTime: 10000,
  });

  const { data: pendingAttestations } = useQuery({
    queryKey: ['bcdr-pending-attestations'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/attestations/pending');
      return res.data || [];
    },
    staleTime: 30000,
  });

  const { data: vendorGaps } = useQuery({
    queryKey: ['bcdr-vendor-gaps'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/dashboard/vendor-gaps');
      return res.data || [];
    },
    staleTime: 60000,
  });

  const isLoading = summaryLoading || metricsLoading;
  const hasError = summaryError || metricsError;
  
  // Use default values if data is undefined or incomplete
  const summary = summaryData ? { ...DEFAULT_SUMMARY, ...summaryData } : DEFAULT_SUMMARY;
  const metrics = metricsData ? { ...DEFAULT_METRICS, ...metricsData } : DEFAULT_METRICS;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-8 bg-surface-700 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-6 h-32"></div>
          ))}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">Failed to load BC/DR Dashboard</h2>
          <p className="text-surface-400 mb-4">
            {((summaryError || metricsError) as Error)?.message || 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => {
              refetchSummary();
              refetchMetrics();
            }} 
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const readinessColor = (metrics.readinessScore ?? 0) >= 80 
    ? 'text-green-400' 
    : (metrics.readinessScore ?? 0) >= 60 
      ? 'text-yellow-400' 
      : 'text-red-400';

  // Safe array accessors
  const activeIncidentsList = Array.isArray(activeIncidents) ? activeIncidents : [];
  const pendingAttestationsList = Array.isArray(pendingAttestations) ? pendingAttestations : [];
  const vendorGapsList = Array.isArray(vendorGaps) ? vendorGaps : [];

  return (
    <div className="p-6 space-y-6">
      {/* Active Incidents Banner */}
      {activeIncidentsList.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400 animate-pulse" />
              <div>
                <h3 className="text-lg font-medium text-red-400">
                  {activeIncidentsList.length} Active Incident{activeIncidentsList.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-red-300">
                  {activeIncidentsList.slice(0, 2).map((i: any) => i.title).join(', ')}
                  {activeIncidentsList.length > 2 && ` and ${activeIncidentsList.length - 2} more`}
                </p>
              </div>
            </div>
            <Link
              to={`/bcdr/incidents/${activeIncidentsList[0].id}`}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-red-200 transition-colors"
            >
              <PlayIcon className="h-4 w-4" />
              View Active
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">BC/DR Dashboard</h1>
          <p className="text-surface-400 mt-1">
            Business Continuity & Disaster Recovery Overview
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/bcdr/incidents" className="btn btn-secondary">
            Incidents
          </Link>
          <Link to="/bcdr/processes/new" className="btn btn-primary">
            Add Process
          </Link>
          <Link to="/bcdr/plans/new" className="btn btn-secondary">
            Create Plan
          </Link>
        </div>
      </div>

      {/* Readiness Score */}
      <div className="card p-6 bg-gradient-to-r from-brand-900/50 to-surface-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-200">BC/DR Readiness Score</h2>
            <p className="text-surface-400 text-sm mt-1">
              Overall preparedness based on RTO coverage, plan coverage, and test success rate
            </p>
          </div>
          <div className="text-right">
            <div className={clsx("text-5xl font-bold", readinessColor)}>
              {metrics.readinessScore ?? 0}%
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-surface-400">
              <span>RTO: {metrics.metrics?.rtoCoverage ?? 0}%</span>
              <span>Plans: {metrics.metrics?.planCoverage ?? 0}%</span>
              <span>Tests: {metrics.metrics?.testSuccessRate ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/bcdr/processes" className="card p-6 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Business Processes</p>
              <p className="text-3xl font-bold text-surface-100 mt-1">
                {summary.processes?.total ?? 0}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-red-400">Tier 1: {summary.processes?.tier_1_count ?? 0}</span>
                <span className="text-yellow-400">Tier 2: {summary.processes?.tier_2_count ?? 0}</span>
              </div>
            </div>
            <ShieldExclamationIcon className="w-10 h-10 text-brand-400" />
          </div>
          {(summary.processes?.overdue_review_count ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {summary.processes?.overdue_review_count} overdue for review
            </div>
          )}
        </Link>

        <Link to="/bcdr/plans" className="card p-6 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">BC/DR Plans</p>
              <p className="text-3xl font-bold text-surface-100 mt-1">
                {summary.plans?.total ?? 0}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-green-400">{summary.plans?.published_count ?? 0} published</span>
                <span className="text-surface-400">{summary.plans?.draft_count ?? 0} draft</span>
              </div>
            </div>
            <DocumentTextIcon className="w-10 h-10 text-blue-400" />
          </div>
        </Link>

        <Link to="/bcdr/tests" className="card p-6 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">DR Tests</p>
              <p className="text-3xl font-bold text-surface-100 mt-1">
                {summary.tests?.completed_count ?? 0}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-green-400">{summary.tests?.passed_count ?? 0} passed</span>
                <span className="text-red-400">{summary.tests?.failed_count ?? 0} failed</span>
              </div>
            </div>
            <BeakerIcon className="w-10 h-10 text-purple-400" />
          </div>
          {(summary.tests?.openFindingsCount ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {summary.tests?.openFindingsCount} open findings
            </div>
          )}
        </Link>

        <Link to="/bcdr/runbooks" className="card p-6 hover:border-brand-500/50 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-400">Runbooks</p>
              <p className="text-3xl font-bold text-surface-100 mt-1">
                {summary.runbooks?.total ?? 0}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="text-green-400">{summary.runbooks?.published_count ?? 0} published</span>
              </div>
            </div>
            <BookOpenIcon className="w-10 h-10 text-teal-400" />
          </div>
          {(summary.runbooks?.needs_review_count ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-1 text-yellow-400 text-xs">
              <ClockIcon className="w-4 h-4" />
              {summary.runbooks?.needs_review_count} need review
            </div>
          )}
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tests */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Upcoming DR Tests</h2>
            <Link to="/bcdr/tests" className="text-brand-400 text-sm hover:text-brand-300">
              View all →
            </Link>
          </div>
          {summary.upcomingTests && summary.upcomingTests.length > 0 ? (
            <div className="space-y-3">
              {summary.upcomingTests.map((test) => (
                <Link
                  key={test.id}
                  to={`/bcdr/tests/${test.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors"
                >
                  <div>
                    <p className="text-surface-100 font-medium">{test.name}</p>
                    <p className="text-surface-400 text-sm">{test.test_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-surface-300 text-sm">
                      {new Date(test.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-surface-400">
              <BeakerIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming tests scheduled</p>
              <Link to="/bcdr/tests/new" className="text-brand-400 text-sm hover:text-brand-300 mt-2 inline-block">
                Schedule a test →
              </Link>
            </div>
          )}
        </div>

        {/* Overdue Items */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100">Overdue Items</h2>
            {(summary.overdueItems?.totalOverdue ?? 0) > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                {summary.overdueItems?.totalOverdue} items
              </span>
            )}
          </div>
          {(summary.overdueItems?.totalOverdue ?? 0) === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-400 opacity-50" />
              <p className="text-green-400">All items are up to date!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(summary.overdueItems?.plans ?? []).slice(0, 3).map((plan) => (
                <Link
                  key={plan.id}
                  to={`/bcdr/plans/${plan.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  <DocumentTextIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 truncate">{plan.title}</p>
                    <p className="text-red-400 text-xs">Review overdue</p>
                  </div>
                </Link>
              ))}
              {(summary.overdueItems?.processes ?? []).slice(0, 2).map((process) => (
                <Link
                  key={process.id}
                  to={`/bcdr/processes/${process.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
                >
                  <ShieldExclamationIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 truncate">{process.title}</p>
                    <p className="text-yellow-400 text-xs">BIA review overdue</p>
                  </div>
                </Link>
              ))}
              {(summary.overdueItems?.findings ?? []).slice(0, 2).map((finding) => (
                <Link
                  key={finding.id}
                  to={`/bcdr/tests/${finding.test_id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
                >
                  <XCircleIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 truncate">{finding.title}</p>
                    <p className="text-orange-400 text-xs">Remediation overdue</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Attestations */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-surface-400" />
              Pending Attestations
            </h2>
            {pendingAttestationsList.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                {pendingAttestationsList.length} pending
              </span>
            )}
          </div>
          {pendingAttestationsList.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-400 opacity-50" />
              <p className="text-green-400">All attestations complete!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAttestationsList.slice(0, 3).map((attestation: any) => (
                <Link
                  key={attestation.id}
                  to={`/bcdr/plans/${attestation.plan_id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
                >
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 truncate">{attestation.plan_title}</p>
                    <p className="text-yellow-400 text-xs capitalize">
                      {attestation.attestation_type?.replace('_', ' ')} attestation
                    </p>
                  </div>
                </Link>
              ))}
              {pendingAttestationsList.length > 3 && (
                <Link to="/bcdr/attestations" className="text-brand-400 text-sm hover:text-brand-300 block text-center">
                  View all {pendingAttestationsList.length} pending →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Vendor Recovery Gaps */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5 text-surface-400" />
              Vendor Recovery Gaps
            </h2>
            {vendorGapsList.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                {vendorGapsList.length} gaps
              </span>
            )}
          </div>
          {vendorGapsList.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-400 opacity-50" />
              <p className="text-green-400">No vendor recovery gaps!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendorGapsList.slice(0, 3).map((gap: any) => (
                <Link
                  key={gap.id}
                  to={`/bcdr/processes/${gap.process_id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  <BuildingOfficeIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-100 truncate">{gap.vendor_name}</p>
                    <p className="text-red-400 text-xs">
                      RTO gap: {gap.rto_gap_hours}h for {gap.process_name}
                    </p>
                  </div>
                </Link>
              ))}
              {vendorGapsList.length > 3 && (
                <p className="text-surface-400 text-sm text-center">
                  +{vendorGapsList.length - 3} more gaps
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-surface-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/bcdr/processes/new"
            className="p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-center"
          >
            <ShieldExclamationIcon className="w-8 h-8 mx-auto mb-2 text-brand-400" />
            <span className="text-surface-200 text-sm">Add Process</span>
          </Link>
          <Link
            to="/bcdr/plans/new"
            className="p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-center"
          >
            <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <span className="text-surface-200 text-sm">Create Plan</span>
          </Link>
          <Link
            to="/bcdr/tests/new"
            className="p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-center"
          >
            <BeakerIcon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <span className="text-surface-200 text-sm">Schedule Test</span>
          </Link>
          <Link
            to="/bcdr/runbooks/new"
            className="p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-center"
          >
            <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-teal-400" />
            <span className="text-surface-200 text-sm">Create Runbook</span>
          </Link>
          <Link
            to="/bcdr/recovery-teams"
            className="p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors text-center"
          >
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <span className="text-surface-200 text-sm">Recovery Teams</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

