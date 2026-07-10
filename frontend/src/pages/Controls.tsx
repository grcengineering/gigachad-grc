import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { controlsApi, frameworksApi } from '@/lib/api';
import { CategoryChip } from '@/components/ui';
import {
  Search,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  Inbox,
} from 'lucide-react';
import BulkUploadModal from '@/components/BulkUploadModal';
import { ControlDrawer, type Control } from '@/components/ControlDrawer';
import {
  Button,
  Badge,
  Input,
  Select,
  PageHeader,
  FilterBar,
  DataTable,
  EmptyState,
  type DataTableColumn,
  type ActiveFilter,
} from '@/components/ui';

type Status = 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; variant: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  implemented: { label: 'Implemented', icon: CheckCircle2, variant: 'success' },
  in_progress: { label: 'In Progress', icon: Clock, variant: 'warning' },
  not_started: { label: 'Not Started', icon: MinusCircle, variant: 'neutral' },
  not_applicable: { label: 'N/A', icon: XCircle, variant: 'info' },
};

export default function Controls() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [drawerControl, setDrawerControl] = useState<Control | null>(null);

  const currentUrl = location.pathname + location.search;

  const search = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const selectedStatus = searchParams.get('status') || '';
  const selectedFramework = searchParams.get('framework') || '';

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    setSearchParams(newParams, { replace: true });
  };

  const clearAllFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    ['search', 'category', 'status', 'framework'].forEach((k) => newParams.delete(k));
    setSearchParams(newParams, { replace: true });
  };

  const { data: controlsData, isLoading } = useQuery({
    queryKey: ['controls', search, selectedCategory, selectedStatus, selectedFramework],
    queryFn: () =>
      controlsApi
        .list({
          search: search || undefined,
          category: selectedCategory ? [selectedCategory] : undefined,
          status: selectedStatus ? [selectedStatus] : undefined,
          frameworkId: selectedFramework || undefined,
          limit: 50,
        })
        .then((res) => res.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['control-categories'],
    queryFn: () => controlsApi.getCategories().then((res) => res.data),
  });

  const { data: frameworks } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const controls: Control[] = controlsData?.data || [];

  const categoryOptions = useMemo<{ value: string; label: string }[]>(
    () =>
      categories?.map((c: { category: string; count: number }) => ({
        value: c.category,
        label: `${c.category.replace(/_/g, ' ')} (${c.count})`,
      })) || [],
    [categories]
  );

  const statusOptions = useMemo(
    () =>
      (Object.entries(STATUS_CONFIG) as [Status, (typeof STATUS_CONFIG)[Status]][]).map(
        ([value, cfg]) => ({ value, label: cfg.label })
      ),
    []
  );

  const frameworkOptions = useMemo<{ value: string; label: string }[]>(
    () =>
      frameworks?.map((fw: { id: string; name: string }) => ({
        value: fw.id,
        label: fw.name,
      })) || [],
    [frameworks]
  );

  const activeFilters: ActiveFilter[] = [];
  if (search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${search}`,
      onClear: () => updateFilter('search', ''),
    });
  }
  if (selectedCategory) {
    const label =
      categoryOptions.find((o) => o.value === selectedCategory)?.label ?? selectedCategory;
    activeFilters.push({
      key: 'category',
      label: `Category: ${label}`,
      onClear: () => updateFilter('category', ''),
    });
  }
  if (selectedStatus) {
    activeFilters.push({
      key: 'status',
      label: `Status: ${STATUS_CONFIG[selectedStatus as Status]?.label ?? selectedStatus}`,
      onClear: () => updateFilter('status', ''),
    });
  }
  if (selectedFramework) {
    const label =
      frameworkOptions.find((o) => o.value === selectedFramework)?.label ?? selectedFramework;
    activeFilters.push({
      key: 'framework',
      label: `Framework: ${label}`,
      onClear: () => updateFilter('framework', ''),
    });
  }

  const columns: DataTableColumn<Control>[] = [
    {
      id: 'controlId',
      accessorKey: 'controlId',
      header: 'Control ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.controlId}</span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => <span className="text-surface-900">{row.original.title}</span>,
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) => <CategoryChip value={row.original.category} />,
    },
    {
      id: 'status',
      accessorFn: (row) => row.implementation?.status || 'not_started',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const status: Status = row.original.implementation?.status || 'not_started';
        const cfg = STATUS_CONFIG[status];
        const Icon = cfg.icon;
        return (
          <Badge variant={cfg.variant} className="inline-flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      id: 'evidence',
      accessorFn: (row) => row.evidenceCount || 0,
      header: 'Evidence',
      mobileLabel: 'Evidence',
      cell: ({ row }) => (
        <span className="text-surface-600 tabular-nums">{row.original.evidenceCount || 0}</span>
      ),
    },
    {
      id: 'frameworks',
      header: 'Frameworks',
      mobileLabel: 'Frameworks',
      enableSorting: false,
      cell: ({ row }) => {
        const mappings = row.original.frameworkMappings || [];
        return (
          <div className="flex flex-wrap gap-1">
            {mappings.slice(0, 2).map((m) => (
              <Badge key={m.frameworkId} variant="info" size="sm">
                {m.frameworkName}
              </Badge>
            ))}
            {mappings.length > 2 && (
              <Badge variant="neutral" size="sm">
                +{mappings.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Controls"
        description="Manage your security controls and track implementation status."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              onClick={() => setIsBulkUploadOpen(true)}
            >
              Bulk Upload
            </Button>
            <Link to="/controls/new" state={{ from: currentUrl }}>
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Add Control
              </Button>
            </Link>
          </>
        }
      />

      <BulkUploadModal isOpen={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} />

      <FilterBar
        active={activeFilters}
        onClearAll={activeFilters.length > 0 ? clearAllFilters : undefined}
      >
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search controls…"
          value={search}
          onChange={(e) => updateFilter('search', e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Categories"
          value={selectedCategory}
          onChange={(v) => updateFilter('category', v)}
          options={categoryOptions}
          clearable
          searchable={categoryOptions.length > 7}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-40"
          placeholder="All Statuses"
          value={selectedStatus}
          onChange={(v) => updateFilter('status', v)}
          options={statusOptions}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Frameworks"
          value={selectedFramework}
          onChange={(v) => updateFilter('framework', v)}
          options={frameworkOptions}
          clearable
          searchable={frameworkOptions.length > 7}
        />
      </FilterBar>

      <DataTable
        data={controls}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => setDrawerControl(row)}
        emptyState={
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title="No controls found"
            description={
              activeFilters.length > 0
                ? 'Try adjusting your filters or clear them to see all controls.'
                : 'Add your first control to start tracking implementation.'
            }
            action={
              activeFilters.length > 0 ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              ) : (
                <Link to="/controls/new">
                  <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                    Add Control
                  </Button>
                </Link>
              )
            }
          />
        }
      />

      {controlsData?.meta && (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>
            Showing {controls.length} of {controlsData.meta.total} controls
          </span>
          <span>
            Page {controlsData.meta.page} of {controlsData.meta.totalPages}
          </span>
        </div>
      )}

      <ControlDrawer
        control={drawerControl}
        open={!!drawerControl}
        onClose={() => setDrawerControl(null)}
      />
    </div>
  );
}
