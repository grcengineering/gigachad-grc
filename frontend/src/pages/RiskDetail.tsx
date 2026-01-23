import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi, assetsApi, controlsApi } from '../lib/api';
import { RiskDetail as RiskDetailData } from '../lib/apiTypes';
import RiskWorkflowPanel from '../components/risk/RiskWorkflowPanel';
import RiskTasksPanel from '../components/risk/RiskTasksPanel';
import EntityAuditHistory from '../components/EntityAuditHistory';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Shield,
  Server,
  Target,
  Clock,
  CheckCircle,
  X,
  Plus,
  History,
  DollarSign,
  TrendingUp,
  Percent,
  ClipboardList,
} from 'lucide-react';

// Using RiskDetail from apiTypes as RiskDetailData

const RISK_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const LIKELIHOODS = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
const IMPACTS = ['negligible', 'minor', 'moderate', 'major', 'severe'];

const TREATMENT_PLANS = [
  { value: 'accept', label: 'Accept', description: 'Accept the risk as-is' },
  { value: 'mitigate', label: 'Mitigate', description: 'Implement controls to reduce risk' },
  { value: 'transfer', label: 'Transfer', description: 'Transfer risk to third party' },
  { value: 'avoid', label: 'Avoid', description: 'Eliminate the risk entirely' },
];

const CONTROL_EFFECTIVENESS = [
  { value: 'none', label: 'None', color: 'text-red-400' },
  { value: 'partial', label: 'Partial', color: 'text-amber-400' },
  { value: 'full', label: 'Full', color: 'text-emerald-400' },
];

export default function RiskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Read initial tab from URL query param
  const tabFromUrl = searchParams.get('tab') as 'assets' | 'controls' | 'scenarios' | 'tasks' | 'history' | null;
  const validTabs = ['assets', 'controls', 'scenarios', 'tasks', 'history'];
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'controls';

  const [activeTab, setActiveTab] = useState<'assets' | 'controls' | 'scenarios' | 'tasks' | 'history'>(initialTab);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showLinkControlModal, setShowLinkControlModal] = useState(false);
  const [showLinkAssetModal, setShowLinkAssetModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);

  // Fetch risk details
  const { data: risk, isLoading } = useQuery<RiskDetailData>({
    queryKey: ['risks', id],
    queryFn: async () => {
      const response = await risksApi.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Fetch available controls for linking
  const { data: availableControls } = useQuery({
    queryKey: ['controls', 'all'],
    queryFn: async () => {
      const response = await controlsApi.list({ limit: 500 });
      return response.data;
    },
  });

  // Fetch available assets for linking
  const { data: availableAssets } = useQuery({
    queryKey: ['assets', 'all'],
    queryFn: async () => {
      const response = await assetsApi.list({ limit: 500 });
      return response.data;
    },
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await risksApi.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowEditModal(false);
      toast.success('Risk updated successfully');
    },
    onError: () => toast.error('Failed to update risk'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await risksApi.delete(id!);
    },
    onSuccess: () => {
      toast.success('Risk deleted successfully');
      navigate('/risks');
    },
    onError: () => toast.error('Failed to delete risk'),
  });

  const updateTreatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await risksApi.updateTreatment(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowTreatmentModal(false);
      toast.success('Treatment plan updated');
    },
    onError: () => toast.error('Failed to update treatment'),
  });

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      const response = await risksApi.markReviewed(id!);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      toast.success('Risk marked as reviewed');
    },
    onError: () => toast.error('Failed to mark as reviewed'),
  });

  const linkControlMutation = useMutation({
    mutationFn: async (data: { controlId: string; effectiveness?: string }) => {
      await risksApi.linkControl(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowLinkControlModal(false);
      toast.success('Control linked');
    },
    onError: () => toast.error('Failed to link control'),
  });

  const unlinkControlMutation = useMutation({
    mutationFn: async (controlId: string) => {
      await risksApi.unlinkControl(id!, controlId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      toast.success('Control unlinked');
    },
    onError: () => toast.error('Failed to unlink control'),
  });

  const linkAssetsMutation = useMutation({
    mutationFn: async (assetIds: string[]) => {
      await risksApi.linkAssets(id!, assetIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowLinkAssetModal(false);
      toast.success('Assets linked');
    },
    onError: () => toast.error('Failed to link assets'),
  });

  const unlinkAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      await risksApi.unlinkAsset(id!, assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      toast.success('Asset unlinked');
    },
    onError: () => toast.error('Failed to unlink asset'),
  });

  const createScenarioMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await risksApi.createScenario(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowScenarioModal(false);
      toast.success('Scenario created');
    },
    onError: () => toast.error('Failed to create scenario'),
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      await risksApi.deleteScenario(id!, scenarioId);
    },
    onSuccess: () => {
      toast.success('Scenario deleted');
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
    },
    onError: () => toast.error('Failed to delete scenario'),
  });

  const getRiskLevelColor = (level: string) => {
    const levelConfig = RISK_LEVELS.find(l => l.value === level);
    return levelConfig?.color || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Loading risk details...</div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-400">Risk not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/risks')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-brand-400 font-mono">{risk.riskId}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(risk.status)}`}>
                {risk.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white mt-1">{risk.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => markReviewedMutation.mutate()}
            disabled={markReviewedMutation.isPending}
            className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Reviewed
          </button>
          <button
            onClick={() => setShowTreatmentModal(true)}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Treatment Plan
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this risk?')) {
                deleteMutation.mutate();
              }
            }}
            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Workflow Panel */}
      <RiskWorkflowPanel
        risk={risk}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['risks', id] })}
      />

      {/* Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 bg-surface-800 rounded-xl border border-surface-700 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-surface-400 mb-2">Description</h3>
            <p className="text-surface-200">{risk.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-surface-400 mb-2">Category</h3>
              <p className="text-white capitalize">{risk.category}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-surface-400 mb-2">Review Frequency</h3>
              <p className="text-white capitalize">{risk.reviewFrequency}</p>
            </div>
            {risk.lastReviewedAt && (
              <div>
                <h3 className="text-sm font-medium text-surface-400 mb-2">Last Reviewed</h3>
                <p className="text-white">
                  {new Date(risk.lastReviewedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {risk.nextReviewDue && (
              <div>
                <h3 className="text-sm font-medium text-surface-400 mb-2">Next Review Due</h3>
                <p className="text-white">
                  {new Date(risk.nextReviewDue).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {(risk?.tags?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-400 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {risk?.tags?.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-brand-500/20 text-brand-400 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Treatment Info */}
          {risk.treatmentPlan && (
            <div className="pt-4 border-t border-surface-700">
              <h3 className="text-sm font-medium text-surface-400 mb-2">Treatment Plan</h3>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-brand-500/20 text-brand-400 rounded capitalize">
                  {risk.treatmentPlan}
                </span>
                {risk.treatmentDueDate && (
                  <span className="text-surface-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(risk.treatmentDueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {risk.treatmentNotes && (
                <p className="text-surface-300 mt-2">{risk.treatmentNotes}</p>
              )}
            </div>
          )}
        </div>

        {/* Risk Scoring */}
        <div className="space-y-4">
          {/* Qualitative */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Risk Assessment</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-surface-400">Likelihood</span>
                <span className="text-white capitalize">{(risk.likelihood || '').replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-400">Impact</span>
                <span className="text-white capitalize">{risk.impact}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-surface-700">
                <span className="text-surface-400">Inherent Risk</span>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.inherentRisk || '')}`} />
                  <span className="text-white capitalize font-medium">{risk.inherentRisk}</span>
                </div>
              </div>
              {risk.residualRisk && (
                <div className="flex justify-between items-center">
                  <span className="text-surface-400">Residual Risk</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.residualRisk)}`} />
                    <span className="text-white capitalize font-medium">{risk.residualRisk}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quantitative */}
          {(risk.likelihoodPct !== undefined || risk.impactValue !== undefined) && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Quantitative Analysis</h3>
              <div className="space-y-4">
                {risk.likelihoodPct !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-surface-400 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Likelihood
                    </span>
                    <span className="text-white">{risk.likelihoodPct}%</span>
                  </div>
                )}
                {risk.impactValue !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-surface-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Impact Value
                    </span>
                    <span className="text-white">{formatCurrency(risk.impactValue)}</span>
                  </div>
                )}
                {risk.annualLossExp !== undefined && (
                  <div className="flex justify-between items-center pt-2 border-t border-surface-700">
                    <span className="text-surface-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Annual Loss Exp.
                    </span>
                    <span className="text-white font-medium">{formatCurrency(risk.annualLossExp)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Linked Items</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-surface-400 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Assets
                </span>
                <span className="text-white">{risk.assetCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-400 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Controls
                </span>
                <span className="text-white">{risk.controlCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-400 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Scenarios
                </span>
                <span className="text-white">{risk.scenarioCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface-800 rounded-xl border border-surface-700">
        {/* Tab Headers */}
        <div className="flex border-b border-surface-700">
          {[
            { key: 'controls', label: 'Controls', icon: Shield, count: risk?.controls?.length ?? 0 },
            { key: 'assets', label: 'Assets', icon: Server, count: risk?.assets?.length ?? 0 },
            { key: 'scenarios', label: 'Scenarios', icon: Target, count: risk?.scenarios?.length ?? 0 },
            { key: 'tasks', label: 'Tasks', icon: ClipboardList, count: null },
            { key: 'history', label: 'History', icon: History, count: risk?.history?.length ?? 0 },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && (
                <span className="px-2 py-0.5 bg-surface-700 rounded text-xs">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-surface-400">Controls that mitigate this risk</p>
                <button
                  onClick={() => setShowLinkControlModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Link Control
                </button>
              </div>
              {(risk?.controls?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No controls linked to this risk
                </div>
              ) : (
                <div className="space-y-2">
                  {risk?.controls?.map(control => (
                    <div
                      key={control.id}
                      className="flex items-center justify-between p-4 bg-surface-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-brand-400 font-mono text-sm">{control.controlId}</span>
                          <p className="text-white">{control.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm ${
                            CONTROL_EFFECTIVENESS.find(e => e.value === control.effectiveness)?.color
                          }`}
                        >
                          {control.effectiveness} effectiveness
                        </span>
                        <button
                          onClick={() => unlinkControlMutation.mutate(control.id)}
                          className="p-1 hover:bg-surface-600 rounded text-surface-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-surface-400">Assets affected by this risk</p>
                <button
                  onClick={() => setShowLinkAssetModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Link Asset
                </button>
              </div>
              {(risk?.assets?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No assets linked to this risk
                </div>
              ) : (
                <div className="space-y-2">
                  {risk?.assets?.map(asset => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-4 bg-surface-700 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Server className="w-8 h-8 text-surface-400" />
                        <div>
                          <p className="text-white">{asset.name}</p>
                          <p className="text-sm text-surface-400">
                            {asset.type} • {asset.criticality} criticality • {asset.source}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => unlinkAssetMutation.mutate(asset.id)}
                        className="p-1 hover:bg-surface-600 rounded text-surface-400 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-surface-400">Threat scenarios and attack vectors</p>
                <button
                  onClick={() => setShowScenarioModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Scenario
                </button>
              </div>
              {(risk?.scenarios?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No scenarios defined for this risk
                </div>
              ) : (
                <div className="space-y-3">
                  {risk?.scenarios?.map(scenario => (
                    <div key={scenario.id} className="p-4 bg-surface-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-medium">{scenario.title}</h4>
                          <p className="text-surface-400 mt-1">{scenario.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            {scenario.threatActor && (
                              <span className="text-surface-400">
                                Threat Actor: <span className="text-surface-300">{scenario.threatActor}</span>
                              </span>
                            )}
                            {scenario.attackVector && (
                              <span className="text-surface-400">
                                Vector: <span className="text-surface-300">{scenario.attackVector}</span>
                              </span>
                            )}
                            <span className="text-surface-400">
                              L: <span className="text-surface-300 capitalize">{scenario.likelihood.replace('_', ' ')}</span>
                            </span>
                            <span className="text-surface-400">
                              I: <span className="text-surface-300 capitalize">{scenario.impact}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteScenarioMutation.mutate(scenario.id)}
                          className="p-1 hover:bg-surface-600 rounded text-surface-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <RiskTasksPanel 
              riskId={id!} 
              onTaskAction={() => queryClient.invalidateQueries({ queryKey: ['risks', id] })}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <EntityAuditHistory entityType="risk" entityId={id!} />
          )}
        </div>
      </div>

      {/* Link Control Modal */}
      {showLinkControlModal && (
        <LinkControlModal
          controls={(availableControls as any)?.data || []}
          linkedControlIds={risk?.controls?.map(c => c.id) ?? []}
          onLink={(controlId, effectiveness) =>
            linkControlMutation.mutate({ controlId, effectiveness })
          }
          onClose={() => setShowLinkControlModal(false)}
          isPending={linkControlMutation.isPending}
        />
      )}

      {/* Link Asset Modal */}
      {showLinkAssetModal && (
        <LinkAssetModal
          assets={availableAssets?.assets || []}
          linkedAssetIds={risk?.assets?.map(a => a.id) ?? []}
          onLink={assetIds => linkAssetsMutation.mutate(assetIds)}
          onClose={() => setShowLinkAssetModal(false)}
          isPending={linkAssetsMutation.isPending}
        />
      )}

      {/* Treatment Plan Modal */}
      {showTreatmentModal && (
        <TreatmentModal
          currentPlan={risk.treatmentPlan}
          currentNotes={risk.treatmentNotes}
          currentDueDate={risk.treatmentDueDate}
          onSave={data => updateTreatmentMutation.mutate(data)}
          onClose={() => setShowTreatmentModal(false)}
          isPending={updateTreatmentMutation.isPending}
        />
      )}

      {/* Add Scenario Modal */}
      {showScenarioModal && (
        <ScenarioModal
          onCreate={data => createScenarioMutation.mutate(data)}
          onClose={() => setShowScenarioModal(false)}
          isPending={createScenarioMutation.isPending}
        />
      )}

      {/* Edit Risk Modal */}
      {showEditModal && (
        <EditRiskModal
          risk={risk}
          onSave={data => updateMutation.mutate(data)}
          onClose={() => setShowEditModal(false)}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Sub-components

function LinkControlModal({
  controls,
  linkedControlIds,
  onLink,
  onClose,
  isPending,
}: {
  controls: any[];
  linkedControlIds: string[];
  onLink: (controlId: string, effectiveness: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selectedControlId, setSelectedControlId] = useState('');
  const [effectiveness, setEffectiveness] = useState('partial');
  const [search, setSearch] = useState('');

  const availableControls = controls.filter(
    c =>
      !linkedControlIds.includes(c.id) &&
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.controlId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Link Control</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <input
            type="text"
            placeholder="Search controls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          />
          <div className="max-h-60 overflow-y-auto space-y-2">
            {availableControls.map(control => (
              <label
                key={control.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                  selectedControlId === control.id ? 'bg-brand-500/20' : 'bg-surface-700 hover:bg-surface-600'
                }`}
              >
                <input
                  type="radio"
                  name="control"
                  value={control.id}
                  checked={selectedControlId === control.id}
                  onChange={e => setSelectedControlId(e.target.value)}
                  className="sr-only"
                />
                <div>
                  <span className="text-brand-400 font-mono text-sm">{control.controlId}</span>
                  <p className="text-white">{control.title}</p>
                </div>
              </label>
            ))}
          </div>
          {selectedControlId && (
            <div>
              <label className="block text-sm text-surface-400 mb-2">Control Effectiveness</label>
              <select
                value={effectiveness}
                onChange={e => setEffectiveness(e.target.value)}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="none">None</option>
                <option value="partial">Partial</option>
                <option value="full">Full</option>
              </select>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => selectedControlId && onLink(selectedControlId, effectiveness)}
            disabled={!selectedControlId || isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Linking...' : 'Link Control'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkAssetModal({
  assets,
  linkedAssetIds,
  onLink,
  onClose,
  isPending,
}: {
  assets: any[];
  linkedAssetIds: string[];
  onLink: (assetIds: string[]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const availableAssets = assets.filter(
    a =>
      !linkedAssetIds.includes(a.id) &&
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAsset = (id: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Link Assets</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
          />
          <div className="max-h-60 overflow-y-auto space-y-2">
            {availableAssets.length === 0 ? (
              <p className="text-center text-surface-500 py-4">No assets available</p>
            ) : (
              availableAssets.map(asset => (
                <label
                  key={asset.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                    selectedAssetIds.includes(asset.id) ? 'bg-brand-500/20' : 'bg-surface-700 hover:bg-surface-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAssetIds.includes(asset.id)}
                    onChange={() => toggleAsset(asset.id)}
                    className="rounded border-surface-500"
                  />
                  <div>
                    <p className="text-white">{asset.name}</p>
                    <p className="text-sm text-surface-400">{asset.type} • {asset.source}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => onLink(selectedAssetIds)}
            disabled={selectedAssetIds.length === 0 || isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Linking...' : `Link ${selectedAssetIds.length} Asset(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function TreatmentModal({
  currentPlan,
  currentNotes,
  currentDueDate,
  onSave,
  onClose,
  isPending,
}: {
  currentPlan?: string;
  currentNotes?: string;
  currentDueDate?: string;
  onSave: (data: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [plan, setPlan] = useState(currentPlan || 'mitigate');
  const [notes, setNotes] = useState(currentNotes || '');
  const [dueDate, setDueDate] = useState(currentDueDate ? currentDueDate.split('T')[0] : '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Treatment Plan</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-surface-400 mb-2">Treatment Strategy</label>
            <div className="grid grid-cols-2 gap-2">
              {TREATMENT_PLANS.map(tp => (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => setPlan(tp.value)}
                  className={`p-3 rounded-lg text-left ${
                    plan === tp.value
                      ? 'bg-brand-500/20 border border-brand-500'
                      : 'bg-surface-700 border border-surface-600 hover:bg-surface-600'
                  }`}
                >
                  <p className="text-white font-medium">{tp.label}</p>
                  <p className="text-surface-400 text-sm">{tp.description}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="Describe the treatment approach..."
            />
          </div>
        </div>
        <div className="p-4 border-t border-surface-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                treatmentPlan: plan,
                treatmentNotes: notes,
                treatmentDueDate: dueDate || undefined,
              })
            }
            disabled={isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Treatment'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioModal({
  onCreate,
  onClose,
  isPending,
}: {
  onCreate: (data: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [scenario, setScenario] = useState({
    title: '',
    description: '',
    threatActor: '',
    attackVector: '',
    likelihood: 'possible',
    impact: 'moderate',
    notes: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-lg">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Add Scenario</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            onCreate(scenario);
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm text-surface-400 mb-2">Title *</label>
            <input
              type="text"
              value={scenario.title}
              onChange={e => setScenario(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              placeholder="e.g., Phishing attack on employees"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-400 mb-2">Description *</label>
            <textarea
              value={scenario.description}
              onChange={e => setScenario(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={2}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-2">Threat Actor</label>
              <select
                value={scenario.threatActor}
                onChange={e => setScenario(prev => ({ ...prev, threatActor: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                <option value="">Select...</option>
                <option value="insider">Insider</option>
                <option value="external">External</option>
                <option value="natural">Natural Event</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-2">Attack Vector</label>
              <input
                type="text"
                value={scenario.attackVector}
                onChange={e => setScenario(prev => ({ ...prev, attackVector: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                placeholder="e.g., Email, Network"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-surface-400 mb-2">Likelihood</label>
              <select
                value={scenario.likelihood}
                onChange={e => setScenario(prev => ({ ...prev, likelihood: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                {LIKELIHOODS.map(l => (
                  <option key={l} value={l}>
                    {l.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-surface-400 mb-2">Impact</label>
              <select
                value={scenario.impact}
                onChange={e => setScenario(prev => ({ ...prev, impact: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
              >
                {IMPACTS.map(i => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'process_compliance', label: 'Process & Compliance' },
  { value: 'third_party', label: 'Third Party' },
  { value: 'operational', label: 'Operational' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'security', label: 'Security' },
  { value: 'financial', label: 'Financial' },
];

const SOURCES = [
  { value: 'internal_security_reviews', label: 'Internal Security Reviews' },
  { value: 'ad_hoc_discovery', label: 'Ad Hoc Discovery' },
  { value: 'external_security_reviews', label: 'External Security Reviews' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'policy_exception', label: 'Policy Exception' },
  { value: 'employee_reporting', label: 'Employee Reporting' },
];

const SEVERITIES = [
  { value: 'very_low', label: 'Very Low' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
];

function EditRiskModal({
  risk,
  onSave,
  onClose,
  isPending,
}: {
  risk: RiskDetailData;
  onSave: (data: any) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    title: risk.title,
    description: risk.description,
    category: risk.category || 'security',
    source: risk.source || 'employee_reporting',
    initialSeverity: risk.initialSeverity || 'medium',
    tags: risk.tags || [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-surface-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit Risk</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            onSave(formData);
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
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={4}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Category and Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Source
              </label>
              <select
                value={formData.source}
                onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SOURCES.map(src => (
                  <option key={src.value} value={src.value}>
                    {src.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial Severity */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Initial Severity
            </label>
            <select
              value={formData.initialSeverity}
              onChange={e => setFormData(prev => ({ ...prev, initialSeverity: e.target.value as any }))}
              className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SEVERITIES.map(sev => (
                <option key={sev.value} value={sev.value}>
                  {sev.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {formData.tags.map(tag => (
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
              onClick={onClose}
              className="px-4 py-2 bg-surface-700 text-surface-300 rounded-lg hover:bg-surface-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

