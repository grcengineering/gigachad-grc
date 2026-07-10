import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { risksApi } from '../lib/api';
import { RiskDrawer, type RiskItem } from '@/components/RiskDrawer';
import {
  AlertTriangle,
  Plus,
  Search,
  BarChart3,
  Shield,
  Clock,
  Target,
  X,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
  Textarea,
  Label,
  Select,
  PageHeader,
  FilterBar,
  DataTable,
  EmptyState,
  Dialog,
  type DataTableColumn,
  type ActiveFilter,
} from '@/components/ui';

interface Risk {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  inherentRisk: string;
  residualRisk?: string;
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  treatmentPlan?: string;
  ownerId?: string;
  ownerName?: string;
  reviewFrequency: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  tags: string[];
  assetCount: number;
  controlCount: number;
  scenarioCount: number;
  createdAt: string;
}

interface RiskListResponse {
  risks: Risk[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORY_OPTS = [
  { value: 'operational', label: 'Operational' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'security', label: 'Security' },
  { value: 'financial', label: 'Financial' },
];

const STATUS_OPTS = [
  { value: 'risk_identified', label: 'Identified' },
  { value: 'not_a_risk', label: 'Not a Risk' },
  { value: 'actual_risk', label: 'Validated' },
  { value: 'risk_analysis_in_progress', label: 'Analysis In Progress' },
  { value: 'risk_analyzed', label: 'Analyzed' },
  { value: 'open', label: 'Open' },
  { value: 'in_treatment', label: 'In Treatment' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'closed', label: 'Closed' },
];

const RISK_LEVEL_OPTS = [
  { value: 'very_low', label: 'Very Low' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
  { value: 'critical', label: 'Critical' },
];

const RISK_LEVEL_DOT: Record<string, string> = {
  very_low: 'bg-emerald-600',
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  very_high: 'bg-red-600',
  critical: 'bg-red-500',
};

const LIKELIHOOD_OPTS = [
  { value: 'rare', label: 'Rare' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'almost_certain', label: 'Almost Certain' },
];

const IMPACT_OPTS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'> = {
  risk_identified: 'brand',
  not_a_risk: 'neutral',
  actual_risk: 'info',
  risk_analysis_in_progress: 'info',
  risk_analyzed: 'info',
  open: 'danger',
  in_treatment: 'warning',
  accepted: 'info',
  mitigated: 'success',
  closed: 'neutral',
};

const PAGE_SIZE = 25;

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: 'brand' | 'red' | 'amber' | 'emerald';
  onClick?: () => void;
  active?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    brand: 'bg-brand-500/10 text-brand-700',
    red: 'bg-red-500/10 text-red-600',
    amber: 'bg-amber-500/10 text-amber-700',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };
  return (
    <Card
      interactive={!!onClick}
      onClick={onClick}
      className={active ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-50' : undefined}
    >
      <CardBody density="cozy" className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${tones[tone]}`}>{icon}</div>
        <div>
          <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
          <p className="text-h1 text-surface-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

export default function Risks() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerRisk, setDrawerRisk] = useState<RiskItem | null>(null);

  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    category: 'security',
    likelihood: 'possible',
    impact: 'moderate',
    likelihoodPct: undefined as number | undefined,
    impactValue: undefined as number | undefined,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    riskLevel: searchParams.get('riskLevel') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams);
    ['search', 'category', 'status', 'riskLevel', 'page'].forEach((k) => params.delete(k));
    setSearchParams(params);
  };

  const { data, isLoading } = useQuery<RiskListResponse>({
    queryKey: ['risks', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, limit: PAGE_SIZE };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.riskLevel) params.riskLevel = filters.riskLevel;
      const response = await risksApi.list(params);
      return response.data;
    },
  });

  const { data: dashboard } = useQuery({
    queryKey: ['risks', 'dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newRisk) => {
      const response = await risksApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      setShowCreateModal(false);
      setNewRisk({
        title: '',
        description: '',
        category: 'security',
        likelihood: 'possible',
        impact: 'moderate',
        likelihoodPct: undefined,
        impactValue: undefined,
        tags: [],
      });
    },
  });

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !newRisk.tags.includes(t)) {
      setNewRisk((prev) => ({ ...prev, tags: [...prev.tags, t] }));
      setTagInput('');
    }
  };
  const handleRemoveTag = (tag: string) =>
    setNewRisk((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));

  const activeFilters: ActiveFilter[] = [];
  if (filters.search)
    activeFilters.push({ key: 'search', label: `Search: ${filters.search}`, onClear: () => updateFilter('search', '') });
  if (filters.category) {
    const l = CATEGORY_OPTS.find((o) => o.value === filters.category)?.label ?? filters.category;
    activeFilters.push({ key: 'category', label: `Category: ${l}`, onClear: () => updateFilter('category', '') });
  }
  if (filters.status) {
    const l = STATUS_OPTS.find((o) => o.value === filters.status)?.label ?? filters.status;
    activeFilters.push({ key: 'status', label: `Status: ${l}`, onClear: () => updateFilter('status', '') });
  }
  if (filters.riskLevel) {
    const l = RISK_LEVEL_OPTS.find((o) => o.value === filters.riskLevel)?.label ?? filters.riskLevel;
    activeFilters.push({ key: 'riskLevel', label: `Level: ${l}`, onClear: () => updateFilter('riskLevel', '') });
  }

  const columns: DataTableColumn<Risk>[] = [
    {
      id: 'riskId',
      accessorKey: 'riskId',
      header: 'Risk ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-small text-brand-700">{row.original.riskId}</span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Title',
      mobileLabel: 'Title',
      cell: ({ row }) => (
        <div>
          <p className="text-surface-900">{row.original.title}</p>
          <p className="text-xs text-surface-500 truncate max-w-md">{row.original.description}</p>
        </div>
      ),
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) => (
        <span className="capitalize text-surface-700">{row.original.category}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return <span className="text-surface-500">—</span>;
        const variant = STATUS_VARIANT[status] ?? 'neutral';
        return (
          <Badge variant={variant} dot>
            {STATUS_OPTS.find((o) => o.value === status)?.label ?? status.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      id: 'inherentRisk',
      accessorKey: 'inherentRisk',
      header: 'Inherent',
      mobileLabel: 'Inherent',
      cell: ({ row }) => {
        const level = row.original.inherentRisk;
        if (!level) return <span className="text-surface-500">—</span>;
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${RISK_LEVEL_DOT[level] || 'bg-surface-300'}`} />
            <span className="capitalize text-surface-700">{level.replace(/_/g, ' ')}</span>
          </div>
        );
      },
    },
    {
      id: 'residualRisk',
      accessorKey: 'residualRisk',
      header: 'Residual',
      mobileLabel: 'Residual',
      cell: ({ row }) =>
        row.original.residualRisk ? (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${RISK_LEVEL_DOT[row.original.residualRisk] || 'bg-surface-300'}`} />
            <span className="capitalize text-surface-700">{row.original.residualRisk.replace(/_/g, ' ')}</span>
          </div>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'assetCount',
      accessorKey: 'assetCount',
      header: 'Assets',
      mobileLabel: 'Assets',
      cell: ({ row }) => <span className="text-surface-700">{row.original.assetCount}</span>,
    },
    {
      id: 'controlCount',
      accessorKey: 'controlCount',
      header: 'Controls',
      mobileLabel: 'Controls',
      cell: ({ row }) => <span className="text-surface-700">{row.original.controlCount}</span>,
    },
  ];

  const risks: Risk[] = data?.risks ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Risk Register"
        description="Identify, assess, and manage organizational risks."
        actions={
          <>
            <Link to="/risk-heatmap">
              <Button variant="outline" size="sm" leftIcon={<BarChart3 className="h-4 w-4" />}>
                Heatmap
              </Button>
            </Link>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
              Add Risk
            </Button>
          </>
        }
      />

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Total Risks"
            value={dashboard.totalRisks ?? 0}
            tone="brand"
            active={!filters.status}
            onClick={() => updateFilter('status', '')}
          />
          <StatCard
            icon={<Target className="h-5 w-5" />}
            label="Open"
            value={dashboard.openRisks ?? 0}
            tone="red"
            active={filters.status === 'open'}
            onClick={() => updateFilter('status', filters.status === 'open' ? '' : 'open')}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Reviews Due"
            value={dashboard.upcomingReviews?.length ?? 0}
            tone="amber"
            onClick={() => navigate('/risk-queue')}
          />
          <StatCard
            icon={<Shield className="h-5 w-5" />}
            label="Mitigated"
            value={
              dashboard.byStatus?.find((s: { status: string; count: number }) => s.status === 'mitigated')?.count ?? 0
            }
            tone="emerald"
            active={filters.status === 'mitigated'}
            onClick={() => updateFilter('status', filters.status === 'mitigated' ? '' : 'mitigated')}
          />
        </div>
      )}

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAllFilters : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search risks…"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Categories"
          value={filters.category}
          onChange={(v) => updateFilter('category', v)}
          options={CATEGORY_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Statuses"
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          options={STATUS_OPTS}
          clearable
          searchable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-44"
          placeholder="All Risk Levels"
          value={filters.riskLevel}
          onChange={(v) => updateFilter('riskLevel', v)}
          options={RISK_LEVEL_OPTS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={risks}
        columns={columns}
        loading={isLoading}
        getRowId={(r) => r.id}
        onRowClick={(r) => setDrawerRisk(r)}
        emptyState={
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="No risks found"
            description={
              activeFilters.length
                ? 'Try clearing your filters to see all risks.'
                : 'Create your first risk to get started tracking organizational risk.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                  Add Risk
                </Button>
              )
            }
          />
        }
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>
            Showing {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => updateFilter('page', String(filters.page - 1))}
            >
              Previous
            </Button>
            <span className="text-surface-500">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page * PAGE_SIZE >= total}
              onClick={() => updateFilter('page', String(filters.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <RiskDrawer risk={drawerRisk} open={!!drawerRisk} onClose={() => setDrawerRisk(null)} />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create new risk"
        description="Capture a risk for assessment and treatment."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(newRisk)}
              disabled={!newRisk.title || !newRisk.description}
            >
              Create Risk
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="risk-title" required>
              Title
            </Label>
            <Input
              id="risk-title"
              value={newRisk.title}
              onChange={(e) => setNewRisk((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Data breach from unauthorized access"
            />
          </div>

          <div>
            <Label htmlFor="risk-description" required>
              Description
            </Label>
            <Textarea
              id="risk-description"
              value={newRisk.description}
              onChange={(e) => setNewRisk((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe the risk in detail…"
            />
          </div>

          <div>
            <Label required>Category</Label>
            <Select
              value={newRisk.category}
              onChange={(v) => setNewRisk((prev) => ({ ...prev, category: v }))}
              options={CATEGORY_OPTS}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Likelihood</Label>
              <Select
                value={newRisk.likelihood}
                onChange={(v) => setNewRisk((prev) => ({ ...prev, likelihood: v }))}
                options={LIKELIHOOD_OPTS}
              />
            </div>
            <div>
              <Label required>Impact</Label>
              <Select
                value={newRisk.impact}
                onChange={(v) => setNewRisk((prev) => ({ ...prev, impact: v }))}
                options={IMPACT_OPTS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="risk-lpct">Likelihood % (optional)</Label>
              <Input
                id="risk-lpct"
                type="number"
                min={0}
                max={100}
                value={newRisk.likelihoodPct ?? ''}
                onChange={(e) =>
                  setNewRisk((prev) => ({
                    ...prev,
                    likelihoodPct: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="0–100"
              />
            </div>
            <div>
              <Label htmlFor="risk-impactv">Impact $ (optional)</Label>
              <Input
                id="risk-impactv"
                type="number"
                min={0}
                value={newRisk.impactValue ?? ''}
                onChange={(e) =>
                  setNewRisk((prev) => ({
                    ...prev,
                    impactValue: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="Dollar amount"
              />
            </div>
          </div>

          <div>
            <Label>Tags</Label>
            {newRisk.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {newRisk.tags.map((tag) => (
                  <Badge key={tag} variant="brand" className="inline-flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-brand-800"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag…"
              />
              <Button variant="outline" type="button" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
