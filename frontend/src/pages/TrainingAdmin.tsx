import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Play,
  Users,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Building2,
  ExternalLink,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Select,
  StatCard,
  type ActiveFilter,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';

interface DepartmentBreakdown {
  department: string;
  assigned: number;
  completed: number;
  completionPct?: number;
}

interface OverdueUser {
  id: string;
  name: string;
  email?: string;
  department?: string;
  dueDate?: string;
}

interface AdminCampaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  audience?: string;
  audienceLabel?: string;
  assigned: number;
  completed: number;
  completionPct?: number;
  overdue?: number;
  dueDate?: string;
  startDate?: string;
  departmentBreakdown?: DepartmentBreakdown[];
  overdueUsers?: OverdueUser[];
}

interface CampaignListResponse {
  campaigns: AdminCampaign[];
  total?: number;
  summary?: {
    activeCampaigns?: number;
    totalAssignments?: number;
    completionPct?: number;
    overdueCount?: number;
  };
}

const STATUS_OPTS: { value: CampaignStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const STATUS_VARIANT: Record<CampaignStatus, BadgeVariant> = {
  draft: 'neutral',
  scheduled: 'info',
  active: 'success',
  completed: 'brand',
  archived: 'neutral',
};

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function computePct(completed: number, assigned: number): number {
  if (assigned <= 0) return 0;
  return Math.min(100, Math.round((completed / assigned) * 100));
}

function ProgressBar({
  completed,
  assigned,
}: {
  completed: number;
  assigned: number;
}) {
  const pct = computePct(completed, assigned);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 w-40">
      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div className={cn('h-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-surface-700 tabular-nums w-9 text-right">{pct}%</span>
    </div>
  );
}

export default function TrainingAdmin() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [selectedCampaign, setSelectedCampaign] = useState<AdminCampaign | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery<CampaignListResponse>({
    queryKey: ['training', 'admin', 'campaigns', debouncedSearch, status],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      const res = await api.get('/api/training/admin/campaigns', { params });
      const payload = res.data;
      if (Array.isArray(payload)) {
        return { campaigns: payload } as CampaignListResponse;
      }
      return {
        campaigns: payload?.campaigns ?? payload?.data ?? [],
        total: payload?.total,
        summary: payload?.summary,
      };
    },
    staleTime: 30_000,
  });

  const campaigns = useMemo(() => data?.campaigns ?? [], [data?.campaigns]);
  const summary = data?.summary;

  const computed = useMemo(() => {
    const totalAssignments = campaigns.reduce((sum, c) => sum + (c.assigned ?? 0), 0);
    const totalCompleted = campaigns.reduce((sum, c) => sum + (c.completed ?? 0), 0);
    const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
    const overdueCount = campaigns.reduce((sum, c) => sum + (c.overdue ?? 0), 0);
    const completionPct = computePct(totalCompleted, totalAssignments);
    return { totalAssignments, activeCampaigns, overdueCount, completionPct };
  }, [campaigns]);

  const stats = {
    activeCampaigns: summary?.activeCampaigns ?? computed.activeCampaigns,
    totalAssignments: summary?.totalAssignments ?? computed.totalAssignments,
    completionPct: summary?.completionPct ?? computed.completionPct,
    overdueCount: summary?.overdueCount ?? computed.overdueCount,
  };

  const activeFilters: ActiveFilter[] = [];
  if (search) {
    activeFilters.push({
      key: 'search',
      label: `Search: ${search}`,
      onClear: () => setSearch(''),
    });
  }
  if (status) {
    const label = STATUS_OPTS.find((o) => o.value === status)?.label ?? status;
    activeFilters.push({
      key: 'status',
      label: `Status: ${label}`,
      onClear: () => setStatus(''),
    });
  }
  const clearAll = () => {
    setSearch('');
    setStatus('');
  };

  const columns: DataTableColumn<AdminCampaign>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Campaign',
      mobileLabel: 'Campaign',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-surface-900 font-medium truncate">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-surface-500 truncate max-w-md">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'audience',
      accessorKey: 'audience',
      header: 'Audience',
      mobileLabel: 'Audience',
      cell: ({ row }) => (
        <span className="text-surface-700">
          {row.original.audienceLabel || row.original.audience || 'All employees'}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <Badge variant={STATUS_VARIANT[s] ?? 'neutral'} dot>
            {s}
          </Badge>
        );
      },
    },
    {
      id: 'assigned',
      accessorKey: 'assigned',
      header: 'Assigned',
      mobileLabel: 'Assigned',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{row.original.assigned ?? 0}</span>
      ),
    },
    {
      id: 'progress',
      accessorKey: 'completed',
      header: 'Completion',
      mobileLabel: 'Completion',
      cell: ({ row }) => (
        <ProgressBar
          completed={row.original.completed ?? 0}
          assigned={row.original.assigned ?? 0}
        />
      ),
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: 'Due',
      mobileLabel: 'Due',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{formatDate(row.original.dueDate)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Training Campaigns"
        description="Manage organization-wide training campaigns, audiences, and completion."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create campaign
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Campaigns"
          value={stats.activeCampaigns}
          icon={<Play className="h-5 w-5" />}
          tone="brand"
          caption="Currently running"
        />
        <StatCard
          label="Total Assignments"
          value={stats.totalAssignments}
          icon={<Users className="h-5 w-5" />}
          tone="blue"
          caption="Across all campaigns"
        />
        <StatCard
          label="Completion %"
          value={`${stats.completionPct}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          caption="Overall completion rate"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          caption={stats.overdueCount > 0 ? 'Past their due date' : 'Nothing overdue'}
        />
      </div>

      {/* Filters */}
      <FilterBar
        active={activeFilters}
        onClearAll={activeFilters.length ? clearAll : undefined}
      >
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search campaigns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All statuses"
          value={status}
          onChange={(v) => setStatus((v as CampaignStatus) || '')}
          options={STATUS_OPTS.filter((o) => o.value !== '').map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          clearable
        />
      </FilterBar>

      <DataTable
        data={campaigns}
        columns={columns}
        loading={isLoading}
        getRowId={(c) => c.id}
        onRowClick={(c) => setSelectedCampaign(c)}
        emptyState={
          <EmptyState
            icon={<GraduationCap className="h-8 w-8" />}
            title="No campaigns found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all campaigns.'
                : 'Create your first training campaign to start assigning courses.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Create campaign
                </Button>
              )
            }
          />
        }
      />

      {/* Campaign detail dialog */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />

      {/* Create campaign placeholder */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create campaign"
        description="A guided campaign builder lives in the awareness-training module."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setCreateOpen(false)}>Got it</Button>
          </>
        }
      >
        <p className="text-small text-surface-700">
          Use the awareness-training workflow to build and launch a new training campaign. Once
          launched, campaigns will appear in this list.
        </p>
      </Dialog>
    </div>
  );
}

function CampaignDetailDialog({
  campaign,
  onClose,
}: {
  campaign: AdminCampaign | null;
  onClose: () => void;
}) {
  const open = !!campaign;
  const departments = campaign?.departmentBreakdown ?? [];
  const overdueUsers = campaign?.overdueUsers ?? [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={campaign?.name || 'Campaign'}
      description={campaign?.description || undefined}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
            View assignments
          </Button>
          <Button>Edit</Button>
        </>
      }
    >
      {!campaign ? null : (
        <div className="space-y-5">
          {/* Top meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Status</p>
              <div className="mt-1">
                <Badge variant={STATUS_VARIANT[campaign.status] ?? 'neutral'} dot>
                  {campaign.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Audience</p>
              <p className="text-small text-surface-900 mt-1">
                {campaign.audienceLabel || campaign.audience || 'All employees'}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Assigned</p>
              <p className="text-h2 text-surface-900 tabular-nums mt-0.5">
                {campaign.assigned ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Due</p>
              <p className="text-small text-surface-900 mt-1 tabular-nums">
                {formatDate(campaign.dueDate)}
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <Card>
            <CardBody density="cozy">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-surface-500 uppercase tracking-wider">
                  Overall completion
                </p>
                <p className="text-small text-surface-900 tabular-nums">
                  {campaign.completed ?? 0} / {campaign.assigned ?? 0}
                </p>
              </div>
              <ProgressBar
                completed={campaign.completed ?? 0}
                assigned={campaign.assigned ?? 0}
              />
            </CardBody>
          </Card>

          {/* Two columns: per-department, overdue users */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardBody density="cozy">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-surface-700" />
                  <h4 className="text-h3 text-surface-900">By department</h4>
                </div>
                {departments.length === 0 ? (
                  <EmptyState
                    icon={<Building2 className="h-6 w-6" />}
                    title="No department data"
                    description="Department breakdown isn't available for this campaign."
                    size="sm"
                  />
                ) : (
                  <ul className="space-y-2">
                    {departments.map((dept) => {
                      const pct =
                        dept.completionPct ?? computePct(dept.completed, dept.assigned);
                      return (
                        <li
                          key={dept.department}
                          className="flex items-center gap-3 rounded-md border border-surface-200 bg-white p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-surface-900 text-small truncate">
                              {dept.department}
                            </p>
                            <p className="text-xs text-surface-500 tabular-nums">
                              {dept.completed} of {dept.assigned} completed
                            </p>
                          </div>
                          <ProgressBar
                            completed={dept.completed}
                            assigned={dept.assigned}
                          />
                          <span className="text-xs text-surface-700 tabular-nums w-9 text-right">
                            {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody density="cozy">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-700" />
                    <h4 className="text-h3 text-surface-900">Overdue users</h4>
                  </div>
                  {overdueUsers.length > 0 && (
                    <Badge variant="danger" size="sm" capitalize={false}>
                      {overdueUsers.length}
                    </Badge>
                  )}
                </div>
                {overdueUsers.length === 0 ? (
                  <EmptyState
                    icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                    title="No overdue users"
                    description="Everyone on this campaign is on track."
                    size="sm"
                  />
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {overdueUsers.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center gap-3 rounded-md border border-surface-200 bg-white p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-surface-900 text-small truncate">{user.name}</p>
                          <p className="text-xs text-surface-500 truncate">
                            {user.email}
                            {user.department ? ` · ${user.department}` : ''}
                          </p>
                        </div>
                        {user.dueDate && (
                          <span className="text-xs text-red-700 tabular-nums shrink-0">
                            Due {formatDate(user.dueDate)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Dialog>
  );
}
