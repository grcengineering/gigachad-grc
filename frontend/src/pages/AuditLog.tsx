import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  UserIcon,
  DocumentIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { auditApi } from '../lib/api';
import toast from 'react-hot-toast';

// Action icons and colors
const ACTION_CONFIG: Record<string, { color: string; bg: string }> = {
  created: { color: 'text-green-400', bg: 'bg-green-500/10' },
  uploaded: { color: 'text-green-400', bg: 'bg-green-500/10' },
  updated: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  deleted: { color: 'text-red-400', bg: 'bg-red-500/10' },
  linked: { color: 'text-purple-400', bg: 'bg-purple-500/10' },
  unlinked: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
  status_changed: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  reviewed: { color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  approved: { color: 'text-green-400', bg: 'bg-green-500/10' },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/10' },
  synced: { color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  tested: { color: 'text-teal-400', bg: 'bg-teal-500/10' },
  version_created: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  bulk_uploaded: { color: 'text-green-400', bg: 'bg-green-500/10' },
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  control: DocumentIcon,
  evidence: DocumentIcon,
  policy: DocumentIcon,
  framework: DocumentIcon,
  integration: ArrowPathIcon,
  task: ClockIcon,
  comment: DocumentIcon,
};

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(date: string) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export default function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Get filter values from URL
  const filters = useMemo(
    () => ({
      search: searchParams.get('search') || '',
      entityType: searchParams.get('entityType') || '',
      action: searchParams.get('action') || '',
      userId: searchParams.get('userId') || '',
      startDate: searchParams.get('startDate') || '',
      endDate: searchParams.get('endDate') || '',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    }),
    [searchParams]
  );

  const updateFilter = (key: string, value: string | number) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === '' || value === 0) {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    // Reset to page 1 when filters change
    if (key !== 'page') {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  // Fetch audit logs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.list(filters).then((res) => res.data),
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: () => auditApi.getFilters().then((res) => res.data),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['audit-stats', filters.startDate, filters.endDate],
    queryFn: () => auditApi.getStats(filters.startDate, filters.endDate).then((res) => res.data),
  });

  const handleExport = async () => {
    try {
      const response = await auditApi.export({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        userId: filters.userId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit log exported successfully');
    } catch {
      toast.error('Failed to export audit log');
    }
  };

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, pages: 1 };
  const hasActiveFilters =
    filters.entityType || filters.action || filters.userId || filters.startDate || filters.endDate;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Audit Log</h1>
          <p className="text-surface-400 mt-1">
            Track all actions and changes across your GRC platform
          </p>
        </div>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center gap-2"
          disabled={logs.length === 0}
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-surface-400">Total Events</div>
            <div className="text-2xl font-bold text-surface-100 mt-1">
              {stats.totalLogs?.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-400">Top Action</div>
            <div className="text-2xl font-bold text-surface-100 mt-1 capitalize">
              {stats.actionBreakdown?.[0]?.action || '-'}
            </div>
            <div className="text-xs text-surface-500">
              {stats.actionBreakdown?.[0]?.count?.toLocaleString()} events
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-400">Top Entity Type</div>
            <div className="text-2xl font-bold text-surface-100 mt-1 capitalize">
              {stats.entityTypeBreakdown?.[0]?.entityType || '-'}
            </div>
            <div className="text-xs text-surface-500">
              {stats.entityTypeBreakdown?.[0]?.count?.toLocaleString()} events
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-400">Active Users</div>
            <div className="text-2xl font-bold text-surface-100 mt-1">
              {stats.topUsers?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              type="text"
              placeholder="Search by description or entity name..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={clsx(
              'btn-secondary flex items-center gap-2',
              hasActiveFilters && 'ring-2 ring-brand-500'
            )}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-brand-500 text-white text-xs px-1.5 rounded-full">
                {[filters.entityType, filters.action, filters.userId, filters.startDate].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button onClick={() => refetch()} className="btn-secondary p-2" title="Refresh">
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded Filters */}
        {isFiltersOpen && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-surface-800">
            {/* Entity Type */}
            <div>
              <label className="block text-sm text-surface-400 mb-1">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => updateFilter('entityType', e.target.value)}
                className="input w-full"
              >
                <option value="">All Types</option>
                {filterOptions?.entityTypes?.map((type: string) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm text-surface-400 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => updateFilter('action', e.target.value)}
                className="input w-full"
              >
                <option value="">All Actions</option>
                {filterOptions?.actions?.map((action: string) => (
                  <option key={action} value={action}>
                    {action.replace('_', ' ').charAt(0).toUpperCase() + action.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* User */}
            <div>
              <label className="block text-sm text-surface-400 mb-1">User</label>
              <select
                value={filters.userId}
                onChange={(e) => updateFilter('userId', e.target.value)}
                className="input w-full"
              >
                <option value="">All Users</option>
                {filterOptions?.users?.map((user: { id: string; name: string; email: string }) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm text-surface-400 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="input w-full"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm text-surface-400 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="input w-full"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="md:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="text-sm text-surface-400 hover:text-surface-200 flex items-center gap-1">
                  <XMarkIcon className="w-4 h-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3">Timestamp</th>
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3">User</th>
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3">Action</th>
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3">Entity</th>
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3">Description</th>
                <th className="text-left text-sm font-medium text-surface-400 px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-surface-500">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-surface-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const actionConfig = ACTION_CONFIG[log.action] || { color: 'text-surface-400', bg: 'bg-surface-800' };
                  const EntityIcon = ENTITY_ICONS[log.entityType] || DocumentIcon;
                  const isExpanded = expandedRow === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="border-b border-surface-800/50 hover:bg-surface-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-surface-200" title={formatDate(log.timestamp)}>
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-surface-700 flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-surface-400" />
                            </div>
                            <div>
                              <div className="text-sm text-surface-200">{log.userName || 'System'}</div>
                              {log.userEmail && (
                                <div className="text-xs text-surface-500">{log.userEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('px-2 py-1 rounded text-xs font-medium', actionConfig.bg, actionConfig.color)}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EntityIcon className="w-4 h-4 text-surface-500" />
                            <div>
                              <div className="text-sm text-surface-300 capitalize">{log.entityType}</div>
                              {log.entityName && (
                                <div className="text-xs text-surface-500 truncate max-w-[200px]" title={log.entityName}>
                                  {log.entityName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-surface-300 truncate max-w-[300px]" title={log.description}>
                            {log.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronUpIcon className="w-4 h-4 text-surface-500" />
                          ) : (
                            <ChevronDownIcon className="w-4 h-4 text-surface-500" />
                          )}
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr className="bg-surface-800/20">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left - Details */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-surface-300">Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Event ID:</span>
                                    <span className="text-surface-300 font-mono text-xs">{log.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Timestamp:</span>
                                    <span className="text-surface-300">{formatDate(log.timestamp)}</span>
                                  </div>
                                  {log.ipAddress && (
                                    <div className="flex justify-between">
                                      <span className="text-surface-500">IP Address:</span>
                                      <span className="text-surface-300 font-mono">{log.ipAddress}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Entity ID:</span>
                                    <span className="text-surface-300 font-mono text-xs">{log.entityId}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right - Changes/Metadata */}
                              <div className="space-y-3">
                                {log.changes && (
                                  <>
                                    <h4 className="text-sm font-medium text-surface-300">Changes</h4>
                                    <pre className="text-xs text-surface-400 bg-surface-900/50 p-3 rounded-lg overflow-auto max-h-[200px]">
                                      {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                  </>
                                )}
                                {log.metadata && (
                                  <>
                                    <h4 className="text-sm font-medium text-surface-300">Metadata</h4>
                                    <pre className="text-xs text-surface-400 bg-surface-900/50 p-3 rounded-lg overflow-auto max-h-[200px]">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800">
            <div className="text-sm text-surface-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilter('page', pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm text-surface-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => updateFilter('page', pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

