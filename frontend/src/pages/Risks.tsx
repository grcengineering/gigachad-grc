import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { risksApi } from '../lib/api';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronDown,
  BarChart3,
  Shield,
  Clock,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';

// Types
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

  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Get filters from URL
  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    status: searchParams.get('status') || '',
    riskLevel: searchParams.get('riskLevel') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const updateFilter = (key: string, value: string) => {
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
  };

  // Fetch risks
  const { data, isLoading } = useQuery<RiskListResponse>({
    queryKey: ['risks', filters],
    queryFn: async () => {
      const params: any = { page: filters.page, limit: 25 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.riskLevel) params.riskLevel = filters.riskLevel;
      const response = await risksApi.list(params);
      return response.data;
    },
  });

  // Fetch dashboard stats
  const { data: dashboard } = useQuery({
    queryKey: ['risks', 'dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Create risk mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newRisk) => {
      const response = await risksApi.create(data);
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

  const getRiskLevelColor = (level: string) => {
    const levelConfig = RISK_LEVELS.find(l => l.value === level);
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
    if (tagInput.trim() && !newRisk.tags.includes(tagInput.trim())) {
      setNewRisk(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewRisk(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Risk Register</h1>
          <p className="text-surface-400 mt-1">
            Identify, assess, and manage organizational risks
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Risk
        </button>
      </div>

      {/* Stats Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Total Risks</p>
                <p className="text-2xl font-semibold text-white">{dashboard.totalRisks}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Target className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Open Risks</p>
                <p className="text-2xl font-semibold text-white">{dashboard.openRisks}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-surface-400">Reviews Due</p>
                <p className="text-2xl font-semibold text-white">{dashboard.upcomingReviews?.length || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
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
          </div>
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
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-3">
            <select
              value={filters.category}
              onChange={e => updateFilter('category', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={e => updateFilter('status', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={filters.riskLevel}
              onChange={e => updateFilter('riskLevel', e.target.value)}
              className="px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Risk Levels</option>
              {RISK_LEVELS.map(level => (
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
          <div className="p-8 text-center text-surface-400">Loading risks...</div>
        ) : data?.risks.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-surface-500 mx-auto mb-4" />
            <p className="text-surface-400">No risks found</p>
            <p className="text-surface-500 text-sm mt-2">
              Create your first risk to get started
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700">
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Risk ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Inherent Risk</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Residual Risk</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-surface-400">Assets</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-surface-400">Controls</th>
              </tr>
            </thead>
            <tbody>
              {data?.risks.map(risk => (
                <tr
                  key={risk.id}
                  onClick={() => navigate(`/risks/${risk.id}`)}
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
                        className={`w-2 h-2 rounded-full ${getRiskLevelColor(risk.inherentRisk)}`}
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
              Showing {(filters.page - 1) * 25 + 1} to{' '}
              {Math.min(filters.page * 25, data.total)} of {data.total} risks
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

            <form
              onSubmit={e => {
                e.preventDefault();
                createMutation.mutate(newRisk);
              }}
              className="p-6 space-y-4"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newRisk.title}
                  onChange={e => setNewRisk(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g., Data breach from unauthorized access"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={newRisk.description}
                  onChange={e => setNewRisk(prev => ({ ...prev, description: e.target.value }))}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Describe the risk in detail..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Category *
                </label>
                <select
                  value={newRisk.category}
                  onChange={e => setNewRisk(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Qualitative Scoring */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Likelihood *
                  </label>
                  <select
                    value={newRisk.likelihood}
                    onChange={e => setNewRisk(prev => ({ ...prev, likelihood: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {LIKELIHOODS.map(l => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Impact *
                  </label>
                  <select
                    value={newRisk.impact}
                    onChange={e => setNewRisk(prev => ({ ...prev, impact: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {IMPACTS.map(i => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantitative Scoring (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Likelihood % (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRisk.likelihoodPct ?? ''}
                    onChange={e =>
                      setNewRisk(prev => ({
                        ...prev,
                        likelihoodPct: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="0-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Impact Value $ (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newRisk.impactValue ?? ''}
                    onChange={e =>
                      setNewRisk(prev => ({
                        ...prev,
                        impactValue: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Dollar amount"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {newRisk.tags.map(tag => (
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
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Add tag..."
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

