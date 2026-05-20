import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface DRTest {
  id: string;
  test_id: string;
  name: string;
  description: string;
  test_type: string;
  status: string;
  result: string | null;
  scheduled_date: string;
  actual_end_at: string;
  coordinator_name: string;
  plan_title: string;
  finding_count: number;
  actual_recovery_time_minutes: number;
}

const statusColors: Record<string, string> = {
  planned: 'bg-surface-600 text-surface-700',
  scheduled: 'bg-blue-500/20 text-blue-600',
  in_progress: 'bg-yellow-500/20 text-yellow-600',
  completed: 'bg-green-500/20 text-green-600',
  cancelled: 'bg-red-500/20 text-red-600',
  postponed: 'bg-orange-500/20 text-orange-600',
};

const resultColors: Record<string, { bg: string; icon: React.ElementType }> = {
  passed: { bg: 'text-green-600', icon: CheckCircleIcon },
  passed_with_issues: { bg: 'text-yellow-600', icon: ExclamationTriangleIcon },
  failed: { bg: 'text-red-600', icon: XCircleIcon },
  incomplete: { bg: 'text-surface-600', icon: ExclamationTriangleIcon },
};

const testTypeLabels: Record<string, string> = {
  tabletop: 'Tabletop Exercise',
  walkthrough: 'Walkthrough',
  simulation: 'Simulation',
  parallel: 'Parallel Test',
  full_interruption: 'Full Interruption',
};

export default function DRTests() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter, statusFilter]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dr-tests', debouncedSearch, typeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter) params.append('testType', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '25');

      const res = await api.get(`/api/bcdr/tests?${params}`);
      return res.data;
    },
    retry: 1,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dr-tests-stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/tests/stats');
      return res.data;
    },
    staleTime: 30000, // Cache stats for 30 seconds
  });

  const tests = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Calculate pass rate with proper type safety
  const completedCount = Number(stats?.completed_count) || 0;
  const passedCount = Number(stats?.passed_count) || 0;
  const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 100) : 0;

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">Failed to load DR Tests</h2>
          <p className="text-surface-600 mb-4">
            {(error as Error).message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => refetch()} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">DR Tests</h1>
          <p className="text-surface-600 mt-1">Schedule and track disaster recovery tests</p>
        </div>
        <Link to="/bcdr/tests/new" className="">
          <PlusIcon className="w-5 h-5 mr-2" />
          Schedule Test
        </Link>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Total Tests</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-700 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-surface-100">{stats?.total || 0}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Pass Rate</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-700 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-green-600">{passRate}%</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Open Findings</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-700 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-yellow-600">{stats?.openFindingsCount || 0}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Avg Recovery Time</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-700 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-surface-100">
              {stats?.avg_recovery_time ? `${Math.round(Number(stats.avg_recovery_time))}m` : 'N/A'}
            </p>
          )}
        </div>
      </div>
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
              <Input
                type="text"
                placeholder="Search tests..."
                className="form-input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-40">
            <SelectNative
              className="form-select w-full"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(testTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="w-36">
            <SelectNative
              className="form-select w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="planned">Planned</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </SelectNative>
          </div>
          <Button onClick={() => refetch()} variant="secondary">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-600">Loading...</div>
        ) : tests.length === 0 ? (
          <div className="p-8 text-center text-surface-600">
            <BeakerIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No DR tests found</p>
            <Link
              to="/bcdr/tests/new"
              className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
            >
              Schedule your first test →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="text-left p-4 text-surface-700 font-medium">Test</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Type</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Status</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Result</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Date</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Findings</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Coordinator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700">
                {tests.map((test: DRTest) => {
                  const ResultIcon = test.result ? resultColors[test.result]?.icon : null;

                  return (
                    <tr key={test.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="p-4">
                        <Link
                          to={`/bcdr/tests/${test.id}`}
                          className="text-surface-100 font-medium hover:text-brand-400 transition-colors"
                        >
                          {test.name}
                        </Link>
                        <div className="text-surface-600 text-sm">{test.test_id}</div>
                        {test.plan_title && (
                          <div className="text-surface-500 text-xs mt-1">
                            Plan: {test.plan_title}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-surface-700 text-sm">
                        {testTypeLabels[test.test_type] || test.test_type}
                      </td>
                      <td className="p-4">
                        <span
                          className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            statusColors[test.status]
                          )}
                        >
                          {test.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        {test.result ? (
                          <div
                            className={clsx(
                              'flex items-center gap-1',
                              resultColors[test.result]?.bg
                            )}
                          >
                            {ResultIcon && <ResultIcon className="w-4 h-4" />}
                            <span className="text-sm capitalize">
                              {test.result.replace('_', ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-surface-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-surface-700 text-sm">
                        {test.actual_end_at
                          ? new Date(test.actual_end_at).toLocaleDateString()
                          : test.scheduled_date
                            ? new Date(test.scheduled_date).toLocaleDateString()
                            : '-'}
                      </td>
                      <td className="p-4">
                        {test.finding_count > 0 ? (
                          <span className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium">
                            {test.finding_count} findings
                          </span>
                        ) : (
                          <span className="text-surface-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="p-4 text-surface-700 text-sm">
                        {test.coordinator_name || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-700">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className=""
              variant="secondary"
            >
              Previous
            </Button>
            <span className="text-surface-600 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className=""
              variant="secondary"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
