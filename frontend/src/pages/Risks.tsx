import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { risksApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { useCurrentWorkspaceId } from '../contexts/WorkspaceContext';
import { useDebounce } from '../hooks/useDebounce';
import { usePrefetch } from '../hooks/usePrefetch';
import { Button } from '../components/Button';
import { useModules } from '../contexts/ModuleContext';
import { FormField, Input, Textarea, Select } from '../components/Form';
import { SkeletonTable, SkeletonStatCard } from '../components/Skeleton';
import { ExportDropdown } from '../components/ExportDropdown';
import { exportConfigs } from '../lib/export';
import { AdvancedFilters, conditionsToQueryParams } from '../components/AdvancedFilters';

// Define filter fields for risks
const RISK_FILTER_FIELDS = [
  { key: 'title', label: 'Title', type: 'string' as const },
  {
    key: 'category',
    label: 'Category',
    type: 'select' as const,
    options: [
      { value: 'security', label: 'Security' },
      { value: 'compliance', label: 'Compliance' },
      { value: 'operational', label: 'Operational' },
      { value: 'financial', label: 'Financial' },
      { value: 'strategic', label: 'Strategic' },
      { value: 'reputational', label: 'Reputational' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select' as const,
    options: [
      { value: 'identified', label: 'Identified' },
      { value: 'assessing', label: 'Assessing' },
      { value: 'treating', label: 'Treating' },
      { value: 'monitoring', label: 'Monitoring' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  {
    key: 'riskLevel',
    label: 'Risk Level',
    type: 'select' as const,
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'likelihood',
    label: 'Likelihood',
    type: 'select' as const,
    options: [
      { value: 'rare', label: 'Rare' },
      { value: 'unlikely', label: 'Unlikely' },
      { value: 'possible', label: 'Possible' },
      { value: 'likely', label: 'Likely' },
      { value: 'almost_certain', label: 'Almost Certain' },
    ],
  },
  {
    key: 'impact',
    label: 'Impact',
    type: 'select' as const,
    options: [
      { value: 'negligible', label: 'Negligible' },
      { value: 'minor', label: 'Minor' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'significant', label: 'Significant' },
      { value: 'severe', label: 'Severe' },
    ],
  },
  { key: 'owner', label: 'Owner', type: 'string' as const },
];
import { AlertTriangle, Plus, Search, BarChart3, Shield, Clock, Target, X } from 'lucide-react';
import clsx from 'clsx';

// Risk create form schema
const riskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Category is required'),
  likelihood: z.string().min(1, 'Likelihood is required'),
  impact: z.string().min(1, 'Impact is required'),
  likelihoodPct: z.number().min(0).max(100).optional().nullable(),
  impactValue: z.number().min(0).optional().nullable(),
  tags: z.array(z.string()).optional(),
});

type RiskCreateInput = z.infer<typeof riskCreateSchema>;

const severityFromInput = (
  likelihood: string,
  impact: string
): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' => {
  const likelihoodRank: Record<string, number> = {
    rare: 1,
    unlikely: 2,
    possible: 3,
    likely: 4,
    almost_certain: 5,
  };
  const impactRank: Record<string, number> = {
    negligible: 1,
    minor: 2,
    moderate: 3,
    major: 4,
    severe: 5,
  };
  const score = (likelihoodRank[likelihood] || 3) * (impactRank[impact] || 3);
  if (score >= 20) return 'very_high';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  if (score >= 3) return 'low';
  return 'very_low';
};

// Types - Use local interface for page-specific risk data structure
interface RiskData {
  id: string;
  riskId?: string;
  title: string;
  description: string;
  category: string;
  status: string;
  likelihood?: string;
  impact?: string;
  inherentRisk?: string;
  residualRisk?: string;
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  treatmentPlan?: string;
  ownerId?: string;
  ownerName?: string;
  reviewFrequency?: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  tags?: string[];
  assetCount?: number;
  controlCount?: number;
  scenarioCount?: number;
  createdAt: string;
}

interface RiskListResponse {
  risks: RiskData[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORIES = [
  { value: 'operational', label: 'Operational' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'security', label: 'Security' },
  { value: 'financial', label: 'Financial' },
];

// Workflow statuses (simplified for display)
const STATUSES = [
  // Risk Intake stages
  { value: 'risk_identified', label: 'Identified', stage: 'intake' },
  { value: 'not_a_risk', label: 'Not a Risk', stage: 'intake' },
  { value: 'actual_risk', label: 'Validated', stage: 'intake' },
  { value: 'risk_analysis_in_progress', label: 'Analysis In Progress', stage: 'assessment' },
  { value: 'risk_analyzed', label: 'Analyzed', stage: 'assessment' },
  // Legacy statuses (kept for compatibility)
  { value: 'open', label: 'Open', stage: 'intake' },
  { value: 'in_treatment', label: 'In Treatment', stage: 'treatment' },
  { value: 'accepted', label: 'Accepted', stage: 'treatment' },
  { value: 'mitigated', label: 'Mitigated', stage: 'treatment' },
  { value: 'closed', label: 'Closed', stage: 'complete' },
];

const RISK_LEVELS = [
  { value: 'very_low', label: 'Very Low', color: 'bg-emerald-600' },
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'very_high', label: 'Very High', color: 'bg-red-600' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const LIKELIHOODS = [
  { value: 'rare', label: 'Rare' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'almost_certain', label: 'Almost Certain' },
];

const IMPACTS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

export default function Risks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const workspaceId = useCurrentWorkspaceId();
  const { prefetchRisk } = usePrefetch();
  const { isModuleEnabled } = useModules();
  const aiEnabled = isModuleEnabled('ai');

  const [_showFilters, _setShowFilters] = useState(false);
  void _showFilters; // Available for filter panel
  void _setShowFilters;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statFilter, setStatFilter] = useState<'all' | 'open' | 'reviews_due' | 'mitigated'>('all');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Debounced search
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Form setup with react-hook-form + zod
  const form = useForm<RiskCreateInput>({
    resolver: zodResolver(riskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'security',
      likelihood: 'possible',
      impact: 'moderate',
      likelihoodPct: null,
      impactValue: null,
      tags: [],
    },
  });

  // Get filters from URL - use debounced search
  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      category: searchParams.get('category') || '',
      status: searchParams.get('status') || '',
      riskLevel: searchParams.get('riskLevel') || '',
      page: parseInt(searchParams.get('page') || '1', 10),
      statFilter, // Include stat card filter
    }),
    [debouncedSearch, searchParams, statFilter]
  );

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== 'page') {
        params.set('page', '1');
      }
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Sync debounced search to URL
  useEffect(() => {
    const currentSearch = searchParams.get('search') || '';
    if (debouncedSearch !== currentSearch) {
      updateFilter('search', debouncedSearch);
    }
  }, [debouncedSearch]);

  // Fetch risks
  const { data, isLoading } = useQuery<RiskListResponse>({
    queryKey: ['risks', filters, workspaceId],
    queryFn: async () => {
      const params: any = { page: filters.page, limit: 25 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.riskLevel) params.riskLevel = filters.riskLevel;
      // Apply workspace filter for multi-workspace mode
      if (workspaceId) params.workspaceId = workspaceId;
      // Apply stat card filters
      if (statFilter === 'open') {
        params.isOpen = 'true';
      } else if (statFilter === 'mitigated') {
        params.status = 'mitigated';
      } else if (statFilter === 'reviews_due') {
        params.reviewsDue = 'true';
      }
      const response = await risksApi.list(params);
      return response.data;
    },
  });

  // Fetch dashboard stats
  const { data: dashboard } = useQuery({
    queryKey: ['risks', 'dashboard', workspaceId],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Create risk mutation
  const createMutation = useMutation({
    mutationFn: async (data: RiskCreateInput) => {
      const payload = {
        title: data.title,
        description: data.description,
        source: 'employee_reporting',
        initialSeverity: severityFromInput(data.likelihood, data.impact),
        tags,
        workspaceId,
      };
      const response = await risksApi.create(payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      setShowCreateModal(false);
      form.reset();
      setTags([]);
      toast.success(`Risk "${data.riskId}" created successfully`);
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const onSubmit = (data: RiskCreateInput) => {
    createMutation.mutate(data);
  };

  const getRiskLevelColor = (level: string) => {
    const levelConfig = RISK_LEVELS.find((l) => l.value === level);
    return levelConfig?.color || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // Risk Intake stages
      case 'risk_identified':
        return 'bg-purple-500/20 text-purple-400';
      case 'not_a_risk':
        return 'bg-surface-500/20 text-surface-400';
      case 'actual_risk':
        return 'bg-blue-500/20 text-blue-400';
      case 'risk_analysis_in_progress':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'risk_analyzed':
        return 'bg-indigo-500/20 text-indigo-400';
      // Legacy / Treatment stages
      case 'open':
        return 'bg-red-500/20 text-red-400';
      case 'in_treatment':
        return 'bg-amber-500/20 text-amber-400';
      case 'accepted':
        return 'bg-blue-500/20 text-blue-400';
      case 'mitigated':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'closed':
        return 'bg-surface-500/20 text-surface-400';
      default:
        return 'bg-surface-500/20 text-surface-400';
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Risk Register</h1>
          <p className="text-surface-400 mt-1">Identify, assess, and manage organizational risks</p>
          {aiEnabled && (
            <p className="text-xs text-brand-400 mt-1">
              AI assistance is available for risk analysis and treatment planning.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <AdvancedFilters
            fields={RISK_FILTER_FIELDS}
            onApply={(conditions) => {
              const params = conditionsToQueryParams(conditions);
              // Apply advanced filter conditions to URL params
              const newSearchParams = new URLSearchParams(searchParams);
              // Apply params from conditions
              Object.entries(params).forEach(([key, value]) => {
                if (value) {
                  newSearchParams.set(key, value as string);
                } else {
                  newSearchParams.delete(key);
                }
              });
              setSearchParams(newSearchParams, { replace: true });
            }}
            storageKey="risks"
          />
          <ExportDropdown
            data={data?.risks || []}
            columns={exportConfigs.risks}
            filename="risks"
            sheetName="Risks"
            disabled={isLoading || !data?.risks?.length}
          />
          {aiEnabled && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                navigate('/tools/ai-risk-assistant');
              }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              AI Risk Assistant
            </Button>
          )}
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-brand-500 hover:bg-brand-600"
          >
            Add Risk
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {!dashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonStatCard key={i} className="bg-surface-800 border border-surface-700" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setStatFilter(statFilter === 'all' ? 'all' : 'all')}
            className={clsx(
              'bg-surface-800 rounded-xl border p-4 text-left transition-all',
              statFilter === 'all'
                ? 'border-brand-500 ring-2 ring-brand-500'
                : 'border-surface-700 hover:bg-surface-700/50 cursor-pointer'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Total Risks</p>
                <p className="text-2xl font-semibold text-white">{dashboard.totalRisks}</p>
              </div>
            </div>
            {statFilter !== 'all' && (
              <p className="text-xs text-brand-400 mt-2">Click to show all</p>
            )}
          </button>
          <button
            onClick={() => setStatFilter(statFilter === 'open' ? 'all' : 'open')}
            className={clsx(
              'bg-surface-800 rounded-xl border p-4 text-left transition-all',
              statFilter === 'open'
                ? 'border-red-500 ring-2 ring-red-500'
                : 'border-surface-700 hover:bg-surface-700/50 cursor-pointer'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Open Risks</p>
                <p className="text-2xl font-semibold text-white">{dashboard.openRisks}</p>
              </div>
            </div>
            {statFilter === 'open' && (
              <p className="text-xs text-red-400 mt-2">Click to clear filter</p>
            )}
          </button>
          <button
            onClick={() => setStatFilter(statFilter === 'reviews_due' ? 'all' : 'reviews_due')}
            className={clsx(
              'bg-surface-800 rounded-xl border p-4 text-left transition-all',
              statFilter === 'reviews_due'
                ? 'border-amber-500 ring-2 ring-amber-500'
                : 'border-surface-700 hover:bg-surface-700/50 cursor-pointer'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Reviews Due</p>
                <p className="text-2xl font-semibold text-white">
                  {dashboard.upcomingReviews?.length || 0}
                </p>
              </div>
            </div>
            {statFilter === 'reviews_due' && (
              <p className="text-xs text-amber-400 mt-2">Click to clear filter</p>
            )}
          </button>
          <button
            onClick={() => setStatFilter(statFilter === 'mitigated' ? 'all' : 'mitigated')}
            className={clsx(
              'bg-surface-800 rounded-xl border p-4 text-left transition-all',
              statFilter === 'mitigated'
                ? 'border-emerald-500 ring-2 ring-emerald-500'
                : 'border-surface-700 hover:bg-surface-700/50 cursor-pointer'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Mitigated</p>
                <p className="text-2xl font-semibold text-white">
                  {dashboard.byStatus?.find((s: any) => s.status === 'mitigated')?.count || 0}
                </p>
              </div>
            </div>
            {statFilter === 'mitigated' && (
              <p className="text-xs text-emerald-400 mt-2">Click to clear filter</p>
            )}
          </button>
        </div>
      )}

      {/* Active Filter Indicator */}
      {statFilter !== 'all' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-surface-400">Filtering by:</span>
          <span
            className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium',
              statFilter === 'open' && 'bg-red-500/20 text-red-400',
              statFilter === 'reviews_due' && 'bg-amber-500/20 text-amber-400',
              statFilter === 'mitigated' && 'bg-emerald-500/20 text-emerald-400'
            )}
          >
            {statFilter === 'open' && 'Open Risks'}
            {statFilter === 'reviews_due' && 'Reviews Due'}
            {statFilter === 'mitigated' && 'Mitigated Risks'}
          </span>
          <span className="text-surface-500">({data?.total || 0} results)</span>
          <button
            onClick={() => setStatFilter('all')}
            className="text-surface-400 hover:text-surface-100 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search risks..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-3">
            <select
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => updateFilter('riskLevel', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Risk Levels</option>
              {RISK_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => navigate('/risks/heatmap')}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-300 hover:text-white hover:bg-surface-600 transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Risks Table */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} columns={8} className="border-none shadow-none" />
        ) : data?.risks.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-surface-500 mx-auto mb-4" />
            <p className="text-surface-400">No risks found</p>
            <p className="text-surface-500 text-sm mt-2">Create your first risk to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">
                  Risk ID
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">
                  Inherent Risk
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">
                  Residual Risk
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-surface-400">
                  Assets
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-surface-400">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.risks.map((risk) => (
                <tr
                  key={risk.id}
                  onClick={() => navigate(`/risks/${risk.id}`)}
                  onMouseEnter={() => prefetchRisk(risk.id)}
                  className="border-b border-surface-700 hover:bg-surface-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-brand-400 font-mono text-sm">{risk.riskId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">{risk.title}</p>
                      <p className="text-surface-400 text-sm truncate max-w-md">
                        {risk.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-surface-300 capitalize">{risk.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}
                    >
                      {risk.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${getRiskLevelColor(risk.inherentRisk || '')}`}
                      />
                      <span className="text-surface-300 capitalize">{risk.inherentRisk}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {risk.residualRisk ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${getRiskLevelColor(risk.residualRisk)}`}
                        />
                        <span className="text-surface-300 capitalize">{risk.residualRisk}</span>
                      </div>
                    ) : (
                      <span className="text-surface-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-surface-300">{risk.assetCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-surface-300">{risk.controlCount}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.total > 25 && (
          <div className="px-4 py-3 border-t border-surface-700 flex items-center justify-between">
            <p className="text-sm text-surface-400">
              Showing {(filters.page - 1) * 25 + 1} to {Math.min(filters.page * 25, data.total)} of{' '}
              {data.total} risks
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('page', String(filters.page - 1))}
                disabled={filters.page === 1}
                className="px-3 py-1 bg-surface-700 rounded text-surface-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-600"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilter('page', String(filters.page + 1))}
                disabled={filters.page * 25 >= data.total}
                className="px-3 py-1 bg-surface-700 rounded text-surface-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-600"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Risk Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Create New Risk</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Title */}
              <FormField label="Title" error={form.formState.errors.title} required>
                <Input
                  {...form.register('title')}
                  error={!!form.formState.errors.title}
                  placeholder="e.g., Data breach from unauthorized access"
                />
              </FormField>

              {/* Description */}
              <FormField label="Description" error={form.formState.errors.description} required>
                <Textarea
                  {...form.register('description')}
                  rows={3}
                  error={!!form.formState.errors.description}
                  placeholder="Describe the risk in detail..."
                />
              </FormField>

              {/* Category */}
              <FormField label="Category" error={form.formState.errors.category} required>
                <Select {...form.register('category')} error={!!form.formState.errors.category}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* Qualitative Scoring */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Likelihood" error={form.formState.errors.likelihood} required>
                  <Select
                    {...form.register('likelihood')}
                    error={!!form.formState.errors.likelihood}
                  >
                    {LIKELIHOODS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Impact" error={form.formState.errors.impact} required>
                  <Select {...form.register('impact')} error={!!form.formState.errors.impact}>
                    {IMPACTS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              {/* Quantitative Scoring (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Likelihood % (Optional)" hint="0-100">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('likelihoodPct', { valueAsNumber: true })}
                    placeholder="0-100"
                  />
                </FormField>
                <FormField label="Impact Value $ (Optional)">
                  <Input
                    type="number"
                    min="0"
                    {...form.register('impactValue', { valueAsNumber: true })}
                    placeholder="Dollar amount"
                  />
                </FormField>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-brand-500/20 text-brand-400 rounded text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-brand-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tag..."
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCreateModal(false);
                    form.reset();
                    setTags([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending}
                  loadingText="Creating..."
                >
                  Create Risk
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
