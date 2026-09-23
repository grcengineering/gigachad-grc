import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Play,
  Users,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Building2,
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
  Label,
  PageHeader,
  Select,
  Skeleton,
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
  moduleIds?: string[];
  targetGroups?: string[];
  isActive?: boolean;
  assignments?: Array<{
    id: string;
    name: string;
    email: string;
    moduleName: string;
    status: string;
    dueDate?: string;
  }>;
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

interface TrainingModuleOption {
  id: string;
  name: string;
  isBuiltIn: boolean;
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

function ProgressBar({ completed, assigned }: { completed: number; assigned: number }) {
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
  const [editingCampaign, setEditingCampaign] = useState<AdminCampaign | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, refetch } = useQuery<CampaignListResponse>({
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
            <p className="text-xs text-surface-500 truncate max-w-md">{row.original.description}</p>
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
      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
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

      {isError ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="Campaigns unavailable"
              description="The training API could not load campaign data."
              action={
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
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
      )}

      {/* Campaign detail dialog */}
      <CampaignDetailDialog
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onEdit={(campaign) => {
          setSelectedCampaign(null);
          setEditingCampaign(campaign);
        }}
      />

      <CampaignFormDialog
        open={createOpen || !!editingCampaign}
        campaign={editingCampaign}
        onClose={() => {
          setCreateOpen(false);
          setEditingCampaign(null);
        }}
      />
    </div>
  );
}

function CampaignDetailDialog({
  campaign,
  onClose,
  onEdit,
}: {
  campaign: AdminCampaign | null;
  onClose: () => void;
  onEdit: (campaign: AdminCampaign) => void;
}) {
  const open = !!campaign;
  const departments = campaign?.departmentBreakdown ?? [];
  const overdueUsers = campaign?.overdueUsers ?? [];
  const assignments = campaign?.assignments ?? [];

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
          <Button onClick={() => campaign && onEdit(campaign)} disabled={!campaign}>
            Edit
          </Button>
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
              <ProgressBar completed={campaign.completed ?? 0} assigned={campaign.assigned ?? 0} />
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
                      const pct = dept.completionPct ?? computePct(dept.completed, dept.assigned);
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
                          <ProgressBar completed={dept.completed} assigned={dept.assigned} />
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

          <Card>
            <CardBody density="cozy">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-h3 text-surface-900">Assignments</h4>
                <Badge variant="info" size="sm" capitalize={false}>
                  {assignments.length}
                </Badge>
              </div>
              {assignments.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No assignments yet"
                  description="Save the campaign as active and launch it to create assignments."
                  size="sm"
                />
              ) : (
                <ul className="divide-y divide-surface-200 max-h-72 overflow-y-auto">
                  {assignments.map((assignment) => (
                    <li
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-small font-medium text-surface-900 truncate">
                          {assignment.name}
                        </p>
                        <p className="text-xs text-surface-500 truncate">
                          {assignment.email} · {assignment.moduleName}
                        </p>
                      </div>
                      <Badge
                        variant={
                          assignment.status === 'completed'
                            ? 'success'
                            : assignment.status === 'overdue'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                        dot
                      >
                        {assignment.status.replace(/_/g, ' ')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </Dialog>
  );
}

function toDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function CampaignFormDialog({
  open,
  campaign,
  onClose,
}: {
  open: boolean;
  campaign: AdminCampaign | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleIds, setModuleIds] = useState<string[]>([]);
  const [targetGroup, setTargetGroup] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lifecycle, setLifecycle] = useState<'draft' | 'active'>('draft');

  useEffect(() => {
    if (!open) return;
    setName(campaign?.name ?? '');
    setDescription(campaign?.description ?? '');
    setModuleIds(campaign?.moduleIds ?? []);
    setTargetGroup(campaign?.targetGroups?.[0] ?? 'all');
    setStartDate(toDateInput(campaign?.startDate) || new Date().toISOString().slice(0, 10));
    setEndDate(toDateInput(campaign?.dueDate));
    setLifecycle(campaign?.isActive ? 'active' : 'draft');
  }, [campaign, open]);

  const modules = useQuery<TrainingModuleOption[]>({
    queryKey: ['training', 'modules'],
    enabled: open,
    queryFn: async () => {
      const response = await api.get('/api/training/modules');
      return [...(response.data?.builtIn ?? []), ...(response.data?.custom ?? [])];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        moduleIds,
        targetGroups: [targetGroup],
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        endDate: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null,
        isActive: lifecycle === 'active',
      };
      const response = campaign
        ? await api.put(`/api/training/campaigns/${campaign.id}`, payload)
        : await api.post('/api/training/campaigns', payload);
      const campaignId = campaign?.id ?? response.data.id;
      if (lifecycle === 'active') {
        await api.post(`/api/training/campaigns/${campaignId}/launch`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training'] });
      onClose();
    },
  });

  const toggleModule = (moduleId: string) => {
    setModuleIds((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId]
    );
  };
  const invalidDates = Boolean(endDate && startDate && endDate < startDate);
  const canSave = Boolean(name.trim() && moduleIds.length > 0 && startDate && !invalidDates);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={campaign ? 'Edit campaign' : 'Create campaign'}
      description="Choose training content, an audience, dates, and whether to create assignments now."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            {lifecycle === 'active' ? 'Save and assign' : 'Save draft'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="training-campaign-name" required>
            Campaign name
          </Label>
          <Input
            id="training-campaign-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Annual security awareness"
          />
        </div>
        <div>
          <Label htmlFor="training-campaign-description">Description</Label>
          <Input
            id="training-campaign-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Required annual refresher"
          />
        </div>

        <div>
          <Label required>Training modules</Label>
          {modules.isLoading ? (
            <Skeleton className="h-24" />
          ) : modules.isError ? (
            <p className="text-small text-red-700">Training modules could not be loaded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(modules.data ?? []).map((trainingModule) => {
                const selected = moduleIds.includes(trainingModule.id);
                return (
                  <button
                    key={trainingModule.id}
                    type="button"
                    aria-pressed={selected}
                    className={cn(
                      'rounded-md border p-3 text-left transition-colors',
                      selected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 bg-white hover:border-surface-300'
                    )}
                    onClick={() => toggleModule(trainingModule.id)}
                  >
                    <span className="text-small font-medium text-surface-900">
                      {trainingModule.name}
                    </span>
                    <span className="block text-xs text-surface-500 mt-0.5">
                      {trainingModule.isBuiltIn ? 'Built-in' : 'Custom'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="training-target" required>
              Audience
            </Label>
            <Select
              value={targetGroup}
              onChange={setTargetGroup}
              options={[
                { value: 'all', label: 'All employees' },
                { value: 'admin', label: 'Administrators' },
                { value: 'compliance_manager', label: 'Compliance managers' },
                { value: 'auditor', label: 'Auditors' },
                { value: 'viewer', label: 'Viewers' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="training-lifecycle" required>
              Status
            </Label>
            <Select
              value={lifecycle}
              onChange={(value) => setLifecycle(value as 'draft' | 'active')}
              options={[
                { value: 'draft', label: 'Draft — no assignments' },
                { value: 'active', label: 'Active — create assignments' },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="training-start" required>
              Start date
            </Label>
            <Input
              id="training-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="training-end">Due date</Label>
            <Input
              id="training-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        {invalidDates && (
          <p className="text-small text-red-700">Due date must be on or after the start date.</p>
        )}
        {save.isError && (
          <p className="text-small text-red-700">
            The campaign could not be saved. Check the selected audience and dates.
          </p>
        )}
      </div>
    </Dialog>
  );
}
