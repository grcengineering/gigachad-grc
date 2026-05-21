import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

interface BusinessProcess {
  id: string;
  process_id: string;
  name: string;
  description: string;
  department: string;
  criticality_tier: string;
  rto_hours: number;
  rpo_hours: number;
  is_active: boolean;
  owner_name: string;
  next_review_due: string;
  dependency_count: number;
  asset_count: number;
}

const criticalityColors: Record<string, string> = {
  tier_1_critical: 'bg-red-500/20 text-red-600 border-red-500/30',
  tier_2_essential: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  tier_3_important: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  tier_4_standard: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
};

const criticalityLabels: Record<string, string> = {
  tier_1_critical: 'Tier 1 - Critical',
  tier_2_essential: 'Tier 2 - Essential',
  tier_3_important: 'Tier 3 - Important',
  tier_4_standard: 'Tier 4 - Standard',
};

export default function BusinessProcesses() {
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, criticalityFilter]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-processes', debouncedSearch, criticalityFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (criticalityFilter) params.append('criticalityTier', criticalityFilter);
      params.append('page', page.toString());
      params.append('limit', '25');

      const res = await api.get(`/api/bcdr/processes?${params}`);
      return res.data;
    },
    retry: 1,
  });

  const processes = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-900 mb-2">
            Failed to load Business Processes
          </h2>
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
          <h1 className="text-2xl font-bold text-surface-900">Business Processes</h1>
          <p className="text-surface-600 mt-1">
            Manage critical business processes and their impact analysis
          </p>
        </div>
        <Link to="/bcdr/processes/new" className="">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Process
        </Link>
      </div>
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
              <Input
                type="text"
                placeholder="Search processes..."
                className="form-input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="w-48">
            <SelectNative
              className="form-select w-full"
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
            >
              <option value="">All Criticality</option>
              <option value="tier_1_critical">Tier 1 - Critical</option>
              <option value="tier_2_essential">Tier 2 - Essential</option>
              <option value="tier_3_important">Tier 3 - Important</option>
              <option value="tier_4_standard">Tier 4 - Standard</option>
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
        ) : processes.length === 0 ? (
          <div className="p-8 text-center text-surface-600">
            <p>No business processes found</p>
            <Link
              to="/bcdr/processes/new"
              className="text-brand-400 hover:text-brand-300 mt-2 inline-block"
            >
              Create your first process →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/50">
                <tr>
                  <th className="text-left p-4 text-surface-700 font-medium">Process</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Criticality</th>
                  <th className="text-left p-4 text-surface-700 font-medium">RTO/RPO</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Owner</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Dependencies</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Next Review</th>
                  <th className="text-left p-4 text-surface-700 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {processes.map((process: BusinessProcess) => (
                  <tr key={process.id} className="hover:bg-white/30 transition-colors">
                    <td className="p-4">
                      <Link
                        to={`/bcdr/processes/${process.id}`}
                        className="text-surface-900 font-medium hover:text-brand-400 transition-colors"
                      >
                        {process.name}
                      </Link>
                      <div className="text-surface-600 text-sm">{process.process_id}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          criticalityColors[process.criticality_tier]
                        )}
                      >
                        {criticalityLabels[process.criticality_tier] || process.criticality_tier}
                      </span>
                    </td>
                    <td className="p-4 text-surface-700">
                      <div className="text-sm">
                        <span className="text-surface-600">RTO:</span>{' '}
                        {process.rto_hours ? `${process.rto_hours}h` : 'N/A'}
                      </div>
                      <div className="text-sm">
                        <span className="text-surface-600">RPO:</span>{' '}
                        {process.rpo_hours ? `${process.rpo_hours}h` : 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 text-surface-700">{process.owner_name || '-'}</td>
                    <td className="p-4">
                      <div className="text-surface-700 text-sm">
                        {process.dependency_count || 0} deps
                      </div>
                      <div className="text-surface-600 text-sm">
                        {process.asset_count || 0} assets
                      </div>
                    </td>
                    <td className="p-4">
                      {process.next_review_due ? (
                        <span
                          className={clsx(
                            'text-sm',
                            isOverdue(process.next_review_due) ? 'text-red-600' : 'text-surface-700'
                          )}
                        >
                          {new Date(process.next_review_due).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-surface-600 text-sm">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          process.is_active
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-surface-600 text-surface-600'
                        )}
                      >
                        {process.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-surface-200">
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
