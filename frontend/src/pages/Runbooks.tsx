import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface Runbook {
  id: string;
  runbook_id: string;
  title: string;
  description: string;
  category: string;
  system_name: string;
  status: string;
  version: string;
  owner_name: string;
  process_name: string;
  step_count: number;
  estimated_duration_minutes: number;
  last_reviewed_at: string;
  next_review_due: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-surface-600 text-surface-700',
  approved: 'bg-blue-500/20 text-blue-600',
  published: 'bg-green-500/20 text-green-600',
  needs_review: 'bg-yellow-500/20 text-yellow-600',
  archived: 'bg-surface-200 text-surface-600',
};

const categoryIcons: Record<string, string> = {
  system_recovery: '💻',
  data_restore: '💾',
  failover: '🔄',
  communication: '📢',
  network: '🌐',
  security: '🔒',
  general: '📋',
};

export default function Runbooks() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  const {
    data: runbooksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['runbooks', debouncedSearch, statusFilter, categoryFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      params.append('page', page.toString());
      params.append('limit', '24'); // Multiple of 3 for grid layout

      const res = await api.get(`/api/bcdr/runbooks?${params}`);
      return res.data;
    },
    retry: 1,
  });

  // Handle both { data: [...] } and direct array response
  const runbooks = Array.isArray(runbooksData) ? runbooksData : (runbooksData?.data ?? []);
  const totalPages = runbooksData?.totalPages || 1;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['runbooks-stats'],
    queryFn: async () => {
      const res = await api.get('/api/bcdr/runbooks/stats');
      return res.data;
    },
    staleTime: 30000, // Cache stats for 30 seconds
  });

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-900 mb-2">Failed to load Runbooks</h2>
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
          <h1 className="text-2xl font-bold text-surface-900">Runbooks</h1>
          <p className="text-surface-600 mt-1">
            Step-by-step recovery procedures for systems and processes
          </p>
        </div>
        <Link to="/bcdr/runbooks/new" className="">
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Runbook
        </Link>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Total Runbooks</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-surface-900">{stats?.total || 0}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Published</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-green-600">{stats?.published_count || 0}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Drafts</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-surface-700">{stats?.draft_count || 0}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-surface-600 text-sm">Needs Review</p>
          {statsLoading ? (
            <div className="h-8 w-16 bg-surface-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-yellow-600">{stats?.needs_review_count || 0}</p>
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
                placeholder="Search runbooks..."
                className="form-input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-40">
            <SelectNative
              className="form-select w-full"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="system_recovery">System Recovery</option>
              <option value="data_restore">Data Restore</option>
              <option value="failover">Failover</option>
              <option value="communication">Communication</option>
              <option value="network">Network</option>
              <option value="security">Security</option>
            </SelectNative>
          </div>
          <div className="w-36">
            <SelectNative
              className="form-select w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="needs_review">Needs Review</option>
            </SelectNative>
          </div>
          <Button onClick={() => refetch()} variant="secondary">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>
      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-surface-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-surface-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-surface-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : !runbooks || runbooks.length === 0 ? (
        <div className="card p-8 text-center text-surface-600">
          <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No runbooks found</p>
          <Link
            to="/bcdr/runbooks/new"
            className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
          >
            Create your first runbook →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {runbooks.map((runbook: Runbook) => (
            <Link
              key={runbook.id}
              to={`/bcdr/runbooks/${runbook.id}`}
              className="card p-6 hover:border-brand-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoryIcons[runbook.category] || '📋'}</span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      statusColors[runbook.status]
                    )}
                  >
                    {runbook.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-surface-600 text-xs">v{runbook.version}</span>
              </div>

              <h3 className="text-lg font-semibold text-surface-900 mb-1">{runbook.title}</h3>
              <p className="text-surface-600 text-sm mb-3">{runbook.runbook_id}</p>

              {runbook.description && (
                <p className="text-surface-600 text-sm mb-4 line-clamp-2">{runbook.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {runbook.system_name && (
                  <div className="flex justify-between">
                    <span className="text-surface-600">System</span>
                    <span className="text-surface-700">{runbook.system_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-surface-600">Steps</span>
                  <span className="text-surface-700">{runbook.step_count || 0}</span>
                </div>
                {runbook.estimated_duration_minutes && (
                  <div className="flex justify-between">
                    <span className="text-surface-600">Duration</span>
                    <span className="text-surface-700 flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {runbook.estimated_duration_minutes}m
                    </span>
                  </div>
                )}
                {runbook.process_name && (
                  <div className="flex justify-between">
                    <span className="text-surface-600">Process</span>
                    <span className="text-surface-700 truncate max-w-32">
                      {runbook.process_name}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
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
  );
}
