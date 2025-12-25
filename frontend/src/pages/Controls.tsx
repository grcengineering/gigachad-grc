import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { controlsApi, frameworksApi } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { usePrefetch } from '@/hooks/usePrefetch';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  MinusCircleIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import BulkUploadModal from '@/components/BulkUploadModal';
import { Button } from '@/components/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { ExportDropdown } from '@/components/ExportDropdown';
import { exportConfigs } from '@/lib/export';
import { useSelection, SelectCheckbox, BulkActionsBar, StatusUpdateDropdown } from '@/components/BulkActions';
import { AdvancedFilters, conditionsToQueryParams } from '@/components/AdvancedFilters';

// Define filter fields for controls
const CONTROL_FILTER_FIELDS = [
  { key: 'title', label: 'Title', type: 'string' as const },
  { key: 'controlId', label: 'Control ID', type: 'string' as const },
  { key: 'category', label: 'Category', type: 'select' as const, options: [
    { value: 'access_control', label: 'Access Control' },
    { value: 'data_protection', label: 'Data Protection' },
    { value: 'network_security', label: 'Network Security' },
    { value: 'physical_security', label: 'Physical Security' },
    { value: 'incident_response', label: 'Incident Response' },
    { value: 'business_continuity', label: 'Business Continuity' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'risk_management', label: 'Risk Management' },
  ]},
  { key: 'status', label: 'Status', type: 'select' as const, options: [
    { value: 'implemented', label: 'Implemented' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'not_started', label: 'Not Started' },
    { value: 'not_applicable', label: 'N/A' },
  ]},
  { key: 'owner', label: 'Owner', type: 'string' as const },
];

const STATUS_CONFIG = {
  implemented: { label: 'Implemented', icon: CheckCircleIcon, color: 'text-green-400 bg-green-400/10' },
  in_progress: { label: 'In Progress', icon: ClockIcon, color: 'text-yellow-400 bg-yellow-400/10' },
  not_started: { label: 'Not Started', icon: MinusCircleIcon, color: 'text-surface-400 bg-surface-400/10' },
  not_applicable: { label: 'N/A', icon: XCircleIcon, color: 'text-blue-400 bg-blue-400/10' },
};

const STATUS_OPTIONS = [
  { value: 'implemented', label: 'Implemented', color: 'bg-green-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'not_started', label: 'Not Started', color: 'bg-surface-500' },
  { value: 'not_applicable', label: 'N/A', color: 'bg-blue-500' },
];

export default function Controls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { prefetchControl } = usePrefetch();

  // Current URL with search params for back navigation
  const currentUrl = location.pathname + location.search;

  // Read initial values from URL
  const selectedCategory = searchParams.get('category') || '';
  const selectedStatus = searchParams.get('status') || '';
  const selectedFramework = searchParams.get('framework') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local state for search input with debouncing
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL when filters change
  const updateFilter = useCallback((key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to page 1 when any filter changes (except page itself)
    if (key !== 'page') {
      newParams.delete('page');
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Sync debounced search to URL
  const updateSearch = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  // Update URL only when debounced value changes
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateFilter('search', debouncedSearch);
    }
  }, [debouncedSearch, updateFilter, searchParams]);

  const { data: controlsData, isLoading } = useQuery({
    queryKey: ['controls', debouncedSearch, selectedCategory, selectedStatus, selectedFramework, currentPage],
    queryFn: () =>
      controlsApi.list({
        search: debouncedSearch || undefined,
        category: selectedCategory ? [selectedCategory] : undefined,
        status: selectedStatus ? [selectedStatus] : undefined,
        frameworkId: selectedFramework || undefined,
        limit: 25, // Reduced from 50 for faster initial load
        page: currentPage,
      }).then((res) => res.data),
    staleTime: 30 * 1000, // 30 second cache
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

  // Selection state
  const selection = useSelection(controls);

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete controls one by one (backend may not have bulk delete endpoint)
      await Promise.all(ids.map(id => controlsApi.delete(id)));
      return ids.length; // Return count for use in onSuccess
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      selection.clearSelection();
      toast.success(`Deleted ${deletedCount} control${deletedCount > 1 ? 's' : ''}`);
    },
    onError: () => {
      toast.error('Failed to delete some controls');
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(ids.map(id => 
        controlsApi.update(id, { implementation: { status } })
      ));
      return ids.length; // Return count for use in onSuccess
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      selection.clearSelection();
      toast.success(`Updated ${updatedCount} control${updatedCount > 1 ? 's' : ''}`);
    },
    onError: () => {
      toast.error('Failed to update some controls');
    },
  });

  const handleBulkAction = async (actionId: string) => {
    const selectedIds = Array.from(selection.selectedIds);
    
    if (actionId === 'delete') {
      setIsProcessing(true);
      try {
        await bulkDeleteMutation.mutateAsync(selectedIds);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    const selectedIds = Array.from(selection.selectedIds);
    setIsProcessing(true);
    try {
      await bulkStatusMutation.mutateAsync({ ids: selectedIds, status });
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkActions = [
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="w-4 h-4" />,
      variant: 'danger' as const,
      requiresConfirmation: true,
      confirmMessage: `Are you sure you want to delete ${selection.count} control${selection.count > 1 ? 's' : ''}? This action cannot be undone.`,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selection.count}
        totalCount={controls.length}
        onClear={selection.clearSelection}
        actions={bulkActions}
        onAction={handleBulkAction}
        isProcessing={isProcessing}
        processingLabel={bulkDeleteMutation.isPending ? 'Deleting...' : 'Processing...'}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Controls</h1>
          <p className="text-surface-400 mt-1">
            Manage your security controls and track implementation status
          </p>
        </div>
        <div className="flex gap-3">
          {selection.count > 0 && (
            <StatusUpdateDropdown
              options={STATUS_OPTIONS}
              onSelect={handleBulkStatusUpdate}
              disabled={isProcessing}
              buttonText="Update Status"
            />
          )}
          <AdvancedFilters
            fields={CONTROL_FILTER_FIELDS}
            onApply={(conditions) => {
              const params = conditionsToQueryParams(conditions);
              // Apply advanced filter conditions to URL params
              const newSearchParams = new URLSearchParams(searchParams);
              // Clear existing filter params first
              newSearchParams.delete('category');
              newSearchParams.delete('status');
              // Apply new params from conditions
              Object.entries(params).forEach(([key, value]) => {
                if (value) {
                  newSearchParams.set(key, value as string);
                }
              });
              setSearchParams(newSearchParams, { replace: true });
            }}
            storageKey="controls"
          />
          <ExportDropdown
            data={selection.count > 0 ? selection.selectedItems : controls}
            columns={exportConfigs.controls}
            filename="controls"
            sheetName="Controls"
            disabled={isLoading || controls.length === 0}
            buttonText={selection.count > 0 ? `Export (${selection.count})` : 'Export'}
          />
          <Button
            variant="secondary"
            onClick={() => setIsBulkUploadOpen(true)}
            leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
          >
            Bulk Upload
          </Button>
          <Button
            onClick={() => navigate('/controls/new')}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            Add Control
          </Button>
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
              value={searchInput}
              onChange={(e) => updateSearch(e.target.value)}
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
          <SkeletonTable rows={10} columns={7} className="border-none shadow-none" />
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
                  <th className="w-12">
                    <SelectCheckbox
                      checked={selection.isAllSelected}
                      indeterminate={selection.isPartialSelected}
                      onChange={selection.toggleAll}
                    />
                  </th>
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
                  // Status can be directly on control (from list API) or nested under implementation (from detail API)
                  const status = control.status || control.implementation?.status || 'not_started';
                  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                  const StatusIcon = statusConfig.icon;
                  const isSelected = selection.isSelected(control.id);

                  return (
                    <tr 
                      key={control.id}
                      className={clsx(isSelected && 'bg-brand-500/10')}
                      onMouseEnter={() => prefetchControl(control.id)}
                    >
                      <td>
                        <SelectCheckbox
                          checked={isSelected}
                          onChange={() => selection.toggle(control.id)}
                        />
                      </td>
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

      {/* Pagination */}
      {controlsData?.meta && controlsData.meta.totalPages > 1 && (
        <div className="card px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-surface-500">
            Showing {((controlsData.meta.page - 1) * 25) + 1} to{' '}
            {Math.min(controlsData.meta.page * 25, controlsData.meta.total)} of{' '}
            {controlsData.meta.total.toLocaleString()} controls
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateFilter('page', String(currentPage - 1))}
              disabled={currentPage <= 1}
              className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm text-surface-400">
              Page {controlsData.meta.page} of {controlsData.meta.totalPages}
            </span>
            <button
              onClick={() => updateFilter('page', String(currentPage + 1))}
              disabled={currentPage >= controlsData.meta.totalPages}
              className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
