import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { controlsApi, frameworksApi } from '@/lib/api';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MinusCircleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import BulkUploadModal from '@/components/BulkUploadModal';

const STATUS_CONFIG = {
  implemented: { label: 'Implemented', icon: CheckCircleIcon, color: 'text-green-400 bg-green-400/10' },
  in_progress: { label: 'In Progress', icon: ClockIcon, color: 'text-yellow-400 bg-yellow-400/10' },
  not_started: { label: 'Not Started', icon: MinusCircleIcon, color: 'text-surface-400 bg-surface-400/10' },
  not_applicable: { label: 'N/A', icon: XCircleIcon, color: 'text-blue-400 bg-blue-400/10' },
};

export default function Controls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Current URL with search params for back navigation
  const currentUrl = location.pathname + location.search;

  // Read initial values from URL
  const search = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedStatus = searchParams.get('status') || '';
  const selectedFramework = searchParams.get('framework') || '';

  // Update URL when filters change
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  const { data: controlsData, isLoading } = useQuery({
    queryKey: ['controls', search, selectedCategory, selectedStatus, selectedFramework],
    queryFn: () =>
      controlsApi.list({
        search: search || undefined,
        category: selectedCategory ? [selectedCategory] : undefined,
        status: selectedStatus ? [selectedStatus] : undefined,
        frameworkId: selectedFramework || undefined,
        limit: 50,
      }).then((res) => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['control-categories'],
    queryFn: () => controlsApi.getCategories().then((res) => res.data),
  });

  const { data: frameworks } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const controls = controlsData?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Controls</h1>
          <p className="text-surface-400 mt-1">
            Manage your security controls and track implementation status
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="btn-secondary"
          >
            <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
            Bulk Upload
          </button>
          <Link to="/controls/new" className="btn-primary">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Control
          </Link>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal 
        isOpen={isBulkUploadOpen} 
        onClose={() => setIsBulkUploadOpen(false)} 
      />

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              placeholder="Search controls..."
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">All Categories</option>
            {categories?.map((cat: any) => (
              <option key={cat.category} value={cat.category}>
                {cat.category.replace('_', ' ')} ({cat.count})
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="input w-full md:w-40"
          >
            <option value="">All Statuses</option>
            <option value="implemented">Implemented</option>
            <option value="in_progress">In Progress</option>
            <option value="not_started">Not Started</option>
            <option value="not_applicable">N/A</option>
          </select>
          <select
            value={selectedFramework}
            onChange={(e) => updateFilter('framework', e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">All Frameworks</option>
            {frameworks?.map((fw: any) => (
              <option key={fw.id} value={fw.id}>
                {fw.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controls Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
          </div>
        ) : controls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-surface-500">
            <FunnelIcon className="w-12 h-12 mb-4" />
            <p>No controls found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Control ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Evidence</th>
                  <th>Frameworks</th>
                </tr>
              </thead>
              <tbody>
                {controls.map((control: any) => {
                  const status = control.implementation?.status || 'not_started';
                  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={control.id}>
                      <td>
                        <Link
                          to={`/controls/${control.id}`}
                          state={{ from: currentUrl }}
                          className="font-mono text-brand-400 hover:text-brand-300"
                        >
                          {control.controlId}
                        </Link>
                      </td>
                      <td>
                        <Link
                          to={`/controls/${control.id}`}
                          state={{ from: currentUrl }}
                          className="text-surface-100 hover:text-brand-400"
                        >
                          {control.title}
                        </Link>
                      </td>
                      <td>
                        <span className="badge badge-neutral capitalize">
                          {control.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className={clsx('badge', statusConfig.color)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </div>
                      </td>
                      <td>
                        <span className="text-surface-400">
                          {control.evidenceCount || 0}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {control.frameworkMappings?.slice(0, 2).map((mapping: any) => (
                            <span
                              key={mapping.frameworkId}
                              className="badge badge-info text-xs"
                            >
                              {mapping.frameworkName}
                            </span>
                          ))}
                          {control.frameworkMappings?.length > 2 && (
                            <span className="badge badge-neutral text-xs">
                              +{control.frameworkMappings.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {controlsData?.meta && (
        <div className="flex items-center justify-between text-sm text-surface-500">
          <span>
            Showing {controls.length} of {controlsData.meta.total} controls
          </span>
          <span>
            Page {controlsData.meta.page} of {controlsData.meta.totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

