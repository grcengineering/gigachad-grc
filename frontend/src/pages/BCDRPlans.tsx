import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

interface BCDRPlan {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  plan_type: string;
  status: string;
  version: string;
  owner_name: string;
  effective_date: string;
  next_review_due: string;
  control_count: number;
}

const statusColors: Record<string, string> = {
  draft: 'bg-surface-600 text-surface-700',
  in_review: 'bg-yellow-500/20 text-yellow-600',
  approved: 'bg-blue-500/20 text-blue-600',
  published: 'bg-green-500/20 text-green-600',
  archived: 'bg-surface-700 text-surface-600',
  expired: 'bg-red-500/20 text-red-600',
};

const planTypeLabels: Record<string, string> = {
  business_continuity: 'Business Continuity',
  disaster_recovery: 'Disaster Recovery',
  incident_response: 'Incident Response',
  crisis_communication: 'Crisis Communication',
  pandemic_response: 'Pandemic Response',
  it_recovery: 'IT Recovery',
  data_backup: 'Data Backup',
  other: 'Other',
};

export default function BCDRPlans() {
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
    queryKey: ['bcdr-plans', debouncedSearch, typeFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (typeFilter) params.append('planType', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', page.toString());
      params.append('limit', '25');

      const res = await api.get(`/api/bcdr/plans?${params}`);
      return res.data;
    },
    retry: 1,
  });

  const plans = data?.data || [];
  const totalPages = data?.totalPages || 1;

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">
            Failed to load BC/DR Plans
          </h2>
          <p className="text-surface-600 mb-4">
            {(error as Error).message || 'An unexpected error occurred'}
          </p>
          <button onClick={() => refetch()} className="btn btn-primary">
            Try Again
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
          <h1 className="text-2xl font-bold text-surface-100">BC/DR Plans</h1>
          <p className="text-surface-600 mt-1">
            Manage business continuity and disaster recovery plans
          </p>
        </div>
        <Link to="/bcdr/plans/new" className="btn btn-primary">
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Plan
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
              <input
                type="text"
                placeholder="Search plans..."
                className="form-input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-48">
            <select
              className="form-select w-full"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {Object.entries(planTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <select
              className="form-select w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button onClick={() => refetch()} className="btn btn-secondary">
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-surface-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-surface-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-surface-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-8 text-center text-surface-600">
          <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No BC/DR plans found</p>
          <Link
            to="/bcdr/plans/new"
            className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
          >
            Create your first plan →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan: BCDRPlan) => (
            <Link
              key={plan.id}
              to={`/bcdr/plans/${plan.id}`}
              className="card p-6 hover:border-brand-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-brand-400" />
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      statusColors[plan.status]
                    )}
                  >
                    {plan.status}
                  </span>
                </div>
                <span className="text-surface-600 text-xs">v{plan.version}</span>
              </div>

              <h3 className="text-lg font-semibold text-surface-100 mb-1">{plan.title}</h3>
              <p className="text-surface-600 text-sm mb-3">{plan.plan_id}</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-600">Type</span>
                  <span className="text-surface-700">
                    {planTypeLabels[plan.plan_type] || plan.plan_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Owner</span>
                  <span className="text-surface-700">{plan.owner_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Linked Controls</span>
                  <span className="text-surface-700">{plan.control_count || 0}</span>
                </div>
                {plan.effective_date && (
                  <div className="flex justify-between">
                    <span className="text-surface-600">Effective</span>
                    <span className="text-surface-700">
                      {new Date(plan.effective_date).toLocaleDateString()}
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
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            Previous
          </button>
          <span className="text-surface-600 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
