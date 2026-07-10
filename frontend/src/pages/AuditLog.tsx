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
import { Button, Input, Select } from '@/components/ui';
import toast from 'react-hot-toast';

// Action chip styles, looked up by the "verb" at the end of the action string
// (e.g. "mapping_deleted" → "deleted", "evidence_bulk_uploaded" → "uploaded").
const ACTION_STYLE: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  uploaded: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  approved: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  enabled: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  updated: 'bg-sky-50 text-sky-800 border border-sky-200',
  changed: 'bg-sky-50 text-sky-800 border border-sky-200',
  deleted: 'bg-red-50 text-red-800 border border-red-200',
  rejected: 'bg-red-50 text-red-800 border border-red-200',
  disabled: 'bg-red-50 text-red-800 border border-red-200',
  failed: 'bg-red-50 text-red-800 border border-red-200',
  linked: 'bg-violet-50 text-violet-800 border border-violet-200',
  unlinked: 'bg-orange-50 text-orange-800 border border-orange-200',
  reviewed: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
  tested: 'bg-teal-50 text-teal-800 border border-teal-200',
  synced: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  reset: 'bg-amber-50 text-amber-800 border border-amber-200',
};
const ACTION_FALLBACK = 'bg-surface-100 text-surface-700 border border-surface-300';

function actionStyle(action: string): string {
  if (!action) return ACTION_FALLBACK;
  // Try exact match first, then the last underscore segment, then '.' segment.
  if (ACTION_STYLE[action]) return ACTION_STYLE[action];
  const underscoreVerb = action.split('_').pop() ?? '';
  if (ACTION_STYLE[underscoreVerb]) return ACTION_STYLE[underscoreVerb];
  const dotVerb = action.split('.').pop() ?? '';
  if (ACTION_STYLE[dotVerb]) return ACTION_STYLE[dotVerb];
  return ACTION_FALLBACK;
}

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
          <h1 className="text-2xl font-bold text-surface-900">Audit Log</h1>
          <p className="text-surface-600 mt-1">
            Track all actions and changes across your GRC platform
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExport}
          disabled={logs.length === 0}
          leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-surface-600">Total Events</div>
            <div className="text-2xl font-bold text-surface-900 mt-1">
              {stats.totalLogs?.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-600">Top Action</div>
            <div className="text-2xl font-bold text-surface-900 mt-1 capitalize">
              {stats.actionBreakdown?.[0]?.action || '-'}
            </div>
            <div className="text-xs text-surface-500">
              {stats.actionBreakdown?.[0]?.count?.toLocaleString()} events
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-600">Top Entity Type</div>
            <div className="text-2xl font-bold text-surface-900 mt-1 capitalize">
              {stats.entityTypeBreakdown?.[0]?.entityType || '-'}
            </div>
            <div className="text-xs text-surface-500">
              {stats.entityTypeBreakdown?.[0]?.count?.toLocaleString()} events
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-surface-600">Active Users</div>
            <div className="text-2xl font-bold text-surface-900 mt-1">
              {stats.topUsers?.length || 0}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search by description or entity name..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="secondary"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={clsx(hasActiveFilters && 'ring-2 ring-brand-500')}
            leftIcon={<FunnelIcon className="w-4 h-4" />}
          >
            Filters
            {hasActiveFilters && (
              <span className="bg-brand-500 text-white text-xs px-1.5 rounded-full ml-1">
                {[filters.entityType, filters.action, filters.userId, filters.startDate].filter(Boolean).length}
              </span>
            )}
          </Button>

          {/* Refresh */}
          <Button variant="secondary" size="icon" onClick={() => refetch()} title="Refresh">
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Expanded Filters */}
        {isFiltersOpen && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-surface-200">
            {/* Entity Type */}
            <div>
              <label className="block text-sm text-surface-600 mb-1">Entity Type</label>
              <Select
                value={filters.entityType}
                onChange={(v) => updateFilter('entityType', v)}
                options={[
                  { value: '', label: 'All Types' },
                  ...(filterOptions?.entityTypes?.map((type: string) => ({
                    value: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                  })) ?? []),
                ]}
              />
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm text-surface-600 mb-1">Action</label>
              <Select
                value={filters.action}
                onChange={(v) => updateFilter('action', v)}
                options={[
                  { value: '', label: 'All Actions' },
                  ...(filterOptions?.actions?.map((action: string) => ({
                    value: action,
                    label: action.replace('_', ' ').charAt(0).toUpperCase() + action.replace('_', ' ').slice(1),
                  })) ?? []),
                ]}
              />
            </div>

            {/* User */}
            <div>
              <label className="block text-sm text-surface-600 mb-1">User</label>
              <Select
                value={filters.userId}
                onChange={(v) => updateFilter('userId', v)}
                options={[
                  { value: '', label: 'All Users' },
                  ...(filterOptions?.users?.map((user: { id: string; name: string; email: string }) => ({
                    value: user.id,
                    label: user.name || user.email,
                  })) ?? []),
                ]}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm text-surface-600 mb-1">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm text-surface-600 mb-1">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="md:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="text-sm text-surface-600 hover:text-surface-800 flex items-center gap-1">
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
              <tr className="border-b border-surface-200">
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3">Timestamp</th>
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3">User</th>
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3">Action</th>
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3">Entity</th>
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3">Description</th>
                <th className="text-left text-sm font-medium text-surface-600 px-4 py-3 w-10"></th>
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
                  const actionCls = actionStyle(log.action);
                  const EntityIcon = ENTITY_ICONS[log.entityType] || DocumentIcon;
                  const isExpanded = expandedRow === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="border-b border-surface-200/50 hover:bg-surface-100/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm text-surface-800" title={formatDate(log.timestamp)}>
                            {formatRelativeTime(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-surface-600" />
                            </div>
                            <div>
                              <div className="text-sm text-surface-800">{log.userName || 'System'}</div>
                              {log.userEmail && (
                                <div className="text-xs text-surface-500">{log.userEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap capitalize', actionCls)}>
                            {(log.action || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <EntityIcon className="w-4 h-4 text-surface-500" />
                            <div>
                              <div className="text-sm text-surface-700 capitalize">{log.entityType}</div>
                              {log.entityName && (
                                <div className="text-xs text-surface-500 truncate max-w-[200px]" title={log.entityName}>
                                  {log.entityName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-surface-700 truncate max-w-[300px]" title={log.description}>
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
                        <tr className="bg-surface-100/20">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left - Details */}
                              <div className="space-y-3">
                                <h4 className="text-sm font-medium text-surface-700">Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Event ID:</span>
                                    <span className="text-surface-700 font-mono text-xs">{log.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Timestamp:</span>
                                    <span className="text-surface-700">{formatDate(log.timestamp)}</span>
                                  </div>
                                  {log.ipAddress && (
                                    <div className="flex justify-between">
                                      <span className="text-surface-500">IP Address:</span>
                                      <span className="text-surface-700 font-mono">{log.ipAddress}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-surface-500">Entity ID:</span>
                                    <span className="text-surface-700 font-mono text-xs">{log.entityId}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right - Changes/Metadata */}
                              <div className="space-y-3">
                                {log.changes && (
                                  <>
                                    <h4 className="text-sm font-medium text-surface-700">Changes</h4>
                                    <pre className="text-xs text-surface-600 bg-white/50 p-3 rounded-lg overflow-auto max-h-[200px]">
                                      {JSON.stringify(log.changes, null, 2)}
                                    </pre>
                                  </>
                                )}
                                {log.metadata && (
                                  <>
                                    <h4 className="text-sm font-medium text-surface-700">Metadata</h4>
                                    <pre className="text-xs text-surface-600 bg-white/50 p-3 rounded-lg overflow-auto max-h-[200px]">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200">
            <div className="text-sm text-surface-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => updateFilter('page', pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>
              <span className="text-sm text-surface-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => updateFilter('page', pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

