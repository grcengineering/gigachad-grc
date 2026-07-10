import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { risksApi, assetsApi, controlsApi } from '../lib/api';
import RiskWorkflowPanel from '../components/risk/RiskWorkflowPanel';
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
} from 'lucide-react';
import { Badge, Button, Dialog, Input, Select, Textarea } from '@/components/ui';
import { riskStatusVariant } from '@/lib/riskStatus';

// Types
interface RiskDetail {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category: string;
  source?: string;
  initialSeverity?: string;
  status: string;
  likelihood: string;
  impact: string;
  inherentRisk: string;
  residualRisk?: string;
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  treatmentPlan?: string;
  treatmentNotes?: string;
  treatmentDueDate?: string;
  ownerId?: string;
  ownerName?: string;
  reporterId?: string;
  grcSmeId?: string;
  riskAssessorId?: string;
  riskOwnerId?: string;
  reviewFrequency: string;
  lastReviewedAt?: string;
  nextReviewDue?: string;
  tags: string[];
  assetCount: number;
  controlCount: number;
  scenarioCount: number;
  createdAt: string;
  assets: { id: string; name: string; type: string; criticality: string; source: string }[];
  controls: {
    id: string;
    controlId: string;
    title: string;
    status: string;
    effectiveness: string;
  }[];
  scenarios: {
    id: string;
    title: string;
    description: string;
    threatActor?: string;
    attackVector?: string;
    likelihood: string;
    impact: string;
    createdAt: string;
  }[];
  history: {
    id: string;
    action: string;
    changes?: any;
    notes?: string;
    changedBy: string;
    changedAt: string;
  }[];
  // Workflow fields
  assessment?: {
    id: string;
    status: string;
    riskAssessorId?: string;
    threatDescription?: string;
    affectedAssets?: string[];
    existingControls?: string[];
    vulnerabilities?: string;
    likelihoodScore?: string;
    likelihoodRationale?: string;
    impactScore?: string;
    impactRationale?: string;
    recommendedOwnerId?: string;
    assessmentNotes?: string;
    treatmentRecommendation?: string;
    calculatedRiskScore?: string;
    grcReviewedBy?: string;
    grcReviewNotes?: string;
    grcDeclinedReason?: string;
  };
  treatment?: {
    id: string;
    status: string;
    riskOwnerId?: string;
    decision?: string;
    justification?: string;
    mitigationDescription?: string;
    mitigationTargetDate?: string;
    mitigationStatus?: string;
    mitigationProgress?: number;
    transferTo?: string;
    transferCost?: number;
    avoidStrategy?: string;
    acceptanceRationale?: string;
    acceptanceExpiresAt?: string;
    executiveApproverId?: string;
    executiveApproved?: boolean;
    executiveNotes?: string;
    executiveDeniedReason?: string;
    residualLikelihood?: string;
    residualImpact?: string;
    residualRiskLevel?: string;
  };
}

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
  { value: 'none', label: 'None', color: 'text-red-600' },
  { value: 'partial', label: 'Partial', color: 'text-amber-700' },
  { value: 'full', label: 'Full', color: 'text-emerald-600' },
];

export default function RiskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'assets' | 'controls' | 'scenarios' | 'history'>(
    'controls'
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showLinkControlModal, setShowLinkControlModal] = useState(false);
  const [showLinkAssetModal, setShowLinkAssetModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);

  // Fetch risk details
  const { data: risk, isLoading } = useQuery<RiskDetail>({
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await risksApi.delete(id!);
    },
    onSuccess: () => {
      navigate('/risks');
    },
  });

  const updateTreatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await risksApi.updateTreatment(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowTreatmentModal(false);
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      const response = await risksApi.markReviewed(id!);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
    },
  });

  const linkControlMutation = useMutation({
    mutationFn: async (data: { controlId: string; effectiveness?: string }) => {
      await risksApi.linkControl(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowLinkControlModal(false);
    },
  });

  const unlinkControlMutation = useMutation({
    mutationFn: async (controlId: string) => {
      await risksApi.unlinkControl(id!, controlId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
    },
  });

  const linkAssetsMutation = useMutation({
    mutationFn: async (assetIds: string[]) => {
      await risksApi.linkAssets(id!, assetIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowLinkAssetModal(false);
    },
  });

  const unlinkAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      await risksApi.unlinkAsset(id!, assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
    },
  });

  const createScenarioMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await risksApi.createScenario(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
      setShowScenarioModal(false);
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (scenarioId: string) => {
      await risksApi.deleteScenario(id!, scenarioId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risks', id] });
    },
  });

  const getRiskLevelColor = (level: string) => {
    const levelConfig = RISK_LEVELS.find((l) => l.value === level);
    return levelConfig?.color || 'bg-surface-300';
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
        <div className="text-surface-600">Loading risk details...</div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-600">Risk not found</div>
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
            className="p-2 hover:bg-surface-200 rounded-lg text-surface-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-brand-700 font-mono">{risk.riskId}</span>
              <Badge variant={riskStatusVariant(risk.status)} size="sm">
                {(risk.status || '').replace(/_/g, ' ')}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold text-surface-900 mt-1">{risk.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => markReviewedMutation.mutate()}
            disabled={markReviewedMutation.isPending}
            className="px-4 py-2 bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300 flex items-center gap-2"
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
            className="p-2 hover:bg-surface-200 rounded-lg text-surface-600"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this risk?')) {
                deleteMutation.mutate();
              }
            }}
            className="p-2 hover:bg-red-500/20 rounded-lg text-red-600"
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
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-6 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-surface-600 mb-2">Description</h3>
            <p className="text-surface-800">{risk.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Category</h3>
              <p className="text-surface-900 capitalize">{risk.category}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Review Frequency</h3>
              <p className="text-surface-900 capitalize">{risk.reviewFrequency}</p>
            </div>
            {risk.lastReviewedAt && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Last Reviewed</h3>
                <p className="text-surface-900">
                  {new Date(risk.lastReviewedAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {risk.nextReviewDue && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Next Review Due</h3>
                <p className="text-surface-900">
                  {new Date(risk.nextReviewDue).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          {risk.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {risk.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-brand-500/20 text-brand-700 rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Treatment Info */}
          {risk.treatmentPlan && (
            <div className="pt-4 border-t border-surface-300">
              <h3 className="text-sm font-medium text-surface-600 mb-2">Treatment Plan</h3>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-brand-500/20 text-brand-700 rounded capitalize">
                  {risk.treatmentPlan}
                </span>
                {risk.treatmentDueDate && (
                  <span className="text-surface-600 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due: {new Date(risk.treatmentDueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {risk.treatmentNotes && (
                <p className="text-surface-700 mt-2">{risk.treatmentNotes}</p>
              )}
            </div>
          )}
        </div>

        {/* Risk Scoring */}
        <div className="space-y-4">
          {/* Qualitative */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Risk Assessment</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-surface-600">Likelihood</span>
                <span className="text-surface-900 capitalize">
                  {risk.likelihood.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-600">Impact</span>
                <span className="text-surface-900 capitalize">{risk.impact}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-surface-300">
                <span className="text-surface-600">Inherent Risk</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.inherentRisk)}`}
                  />
                  <span className="text-surface-900 capitalize font-medium">
                    {risk.inherentRisk}
                  </span>
                </div>
              </div>
              {risk.residualRisk && (
                <div className="flex justify-between items-center">
                  <span className="text-surface-600">Residual Risk</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${getRiskLevelColor(risk.residualRisk)}`}
                    />
                    <span className="text-surface-900 capitalize font-medium">
                      {risk.residualRisk}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quantitative */}
          {(risk.likelihoodPct !== undefined || risk.impactValue !== undefined) && (
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h3 className="text-lg font-medium text-surface-900 mb-4">Quantitative Analysis</h3>
              <div className="space-y-4">
                {risk.likelihoodPct !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-surface-600 flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Likelihood
                    </span>
                    <span className="text-surface-900">{risk.likelihoodPct}%</span>
                  </div>
                )}
                {risk.impactValue !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-surface-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Impact Value
                    </span>
                    <span className="text-surface-900">{formatCurrency(risk.impactValue)}</span>
                  </div>
                )}
                {risk.annualLossExp !== undefined && (
                  <div className="flex justify-between items-center pt-2 border-t border-surface-300">
                    <span className="text-surface-600 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Annual Loss Exp.
                    </span>
                    <span className="text-surface-900 font-medium">
                      {formatCurrency(risk.annualLossExp)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Linked Items</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-surface-600 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Assets
                </span>
                <span className="text-surface-900">{risk.assetCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Controls
                </span>
                <span className="text-surface-900">{risk.controlCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-600 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Scenarios
                </span>
                <span className="text-surface-900">{risk.scenarioCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-surface-200">
        {/* Tab Headers */}
        <div className="flex border-b border-surface-300">
          {[
            { key: 'controls', label: 'Controls', icon: Shield, count: risk.controls.length },
            { key: 'assets', label: 'Assets', icon: Server, count: risk.assets.length },
            { key: 'scenarios', label: 'Scenarios', icon: Target, count: risk.scenarios.length },
            { key: 'history', label: 'History', icon: History, count: risk.history.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-700'
                  : 'border-transparent text-surface-600 hover:text-surface-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="px-2 py-0.5 bg-surface-200 rounded text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-surface-600">Controls that mitigate this risk</p>
                <button
                  onClick={() => setShowLinkControlModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Link Control
                </button>
              </div>
              {risk.controls.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No controls linked to this risk
                </div>
              ) : (
                <div className="space-y-2">
                  {risk.controls.map((control) => (
                    <div
                      key={control.id}
                      className="flex items-center justify-between p-4 bg-surface-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-brand-700 font-mono text-sm">
                            {control.controlId}
                          </span>
                          <p className="text-surface-900">{control.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm ${
                            CONTROL_EFFECTIVENESS.find((e) => e.value === control.effectiveness)
                              ?.color
                          }`}
                        >
                          {control.effectiveness} effectiveness
                        </span>
                        <button
                          onClick={() => unlinkControlMutation.mutate(control.id)}
                          className="p-1 hover:bg-surface-300 rounded text-surface-600 hover:text-red-600"
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
                <p className="text-surface-600">Assets affected by this risk</p>
                <button
                  onClick={() => setShowLinkAssetModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Link Asset
                </button>
              </div>
              {risk.assets.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No assets linked to this risk
                </div>
              ) : (
                <div className="space-y-2">
                  {risk.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-4 bg-surface-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Server className="w-8 h-8 text-surface-600" />
                        <div>
                          <p className="text-surface-900">{asset.name}</p>
                          <p className="text-sm text-surface-600">
                            {asset.type} • {asset.criticality} criticality • {asset.source}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => unlinkAssetMutation.mutate(asset.id)}
                        className="p-1 hover:bg-surface-300 rounded text-surface-600 hover:text-red-600"
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
                <p className="text-surface-600">Threat scenarios and attack vectors</p>
                <button
                  onClick={() => setShowScenarioModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Scenario
                </button>
              </div>
              {risk.scenarios.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  No scenarios defined for this risk
                </div>
              ) : (
                <div className="space-y-3">
                  {risk.scenarios.map((scenario) => (
                    <div key={scenario.id} className="p-4 bg-surface-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-surface-900 font-medium">{scenario.title}</h4>
                          <p className="text-surface-600 mt-1">{scenario.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            {scenario.threatActor && (
                              <span className="text-surface-600">
                                Threat Actor:{' '}
                                <span className="text-surface-700">{scenario.threatActor}</span>
                              </span>
                            )}
                            {scenario.attackVector && (
                              <span className="text-surface-600">
                                Vector:{' '}
                                <span className="text-surface-700">{scenario.attackVector}</span>
                              </span>
                            )}
                            <span className="text-surface-600">
                              L:{' '}
                              <span className="text-surface-700 capitalize">
                                {scenario.likelihood.replace('_', ' ')}
                              </span>
                            </span>
                            <span className="text-surface-600">
                              I:{' '}
                              <span className="text-surface-700 capitalize">{scenario.impact}</span>
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteScenarioMutation.mutate(scenario.id)}
                          className="p-1 hover:bg-surface-300 rounded text-surface-600 hover:text-red-600"
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

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <p className="text-surface-600">Activity history for this risk</p>
              {risk.history.length === 0 ? (
                <div className="text-center py-8 text-surface-500">No history recorded</div>
              ) : (
                <div className="space-y-3">
                  {risk.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 bg-surface-200 rounded-lg"
                    >
                      <div className="p-2 bg-surface-300 rounded-lg">
                        <History className="w-4 h-4 text-surface-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-surface-900 capitalize">
                          {entry.action.replace('_', ' ')}
                        </p>
                        {entry.notes && (
                          <p className="text-surface-600 text-sm mt-1">{entry.notes}</p>
                        )}
                        <p className="text-surface-500 text-sm mt-2">
                          {new Date(entry.changedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Link Control Modal */}
      {showLinkControlModal && (
        <LinkControlModal
          controls={availableControls?.controls || []}
          linkedControlIds={risk.controls.map((c) => c.id)}
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
          linkedAssetIds={risk.assets.map((a) => a.id)}
          onLink={(assetIds) => linkAssetsMutation.mutate(assetIds)}
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
          onSave={(data) => updateTreatmentMutation.mutate(data)}
          onClose={() => setShowTreatmentModal(false)}
          isPending={updateTreatmentMutation.isPending}
        />
      )}

      {/* Add Scenario Modal */}
      {showScenarioModal && (
        <ScenarioModal
          onCreate={(data) => createScenarioMutation.mutate(data)}
          onClose={() => setShowScenarioModal(false)}
          isPending={createScenarioMutation.isPending}
        />
      )}

      {/* Edit Risk Modal */}
      {showEditModal && (
        <EditRiskModal
          risk={risk}
          onSave={(data) => updateMutation.mutate(data)}
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
    (c) =>
      !linkedControlIds.includes(c.id) &&
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.controlId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="Link Control"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => selectedControlId && onLink(selectedControlId, effectiveness)}
            disabled={!selectedControlId || isPending}
          >
            {isPending ? 'Linking...' : 'Link Control'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Search controls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto space-y-2">
          {availableControls.map((control) => (
            <label
              key={control.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                selectedControlId === control.id
                  ? 'bg-brand-500/20'
                  : 'bg-surface-100 hover:bg-surface-200'
              }`}
            >
              <input
                type="radio"
                name="control"
                value={control.id}
                checked={selectedControlId === control.id}
                onChange={(e) => setSelectedControlId(e.target.value)}
                className="sr-only"
              />
              <div>
                <span className="text-brand-700 font-mono text-sm">{control.controlId}</span>
                <p className="text-surface-900">{control.title}</p>
              </div>
            </label>
          ))}
        </div>
        {selectedControlId && (
          <div>
            <label className="block text-sm text-surface-600 mb-2">Control Effectiveness</label>
            <Select
              value={effectiveness}
              onChange={setEffectiveness}
              options={[
                { value: 'none', label: 'None' },
                { value: 'partial', label: 'Partial' },
                { value: 'full', label: 'Full' },
              ]}
            />
          </div>
        )}
      </div>
    </Dialog>
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
    (a) => !linkedAssetIds.includes(a.id) && a.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Link Assets"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onLink(selectedAssetIds)}
            disabled={selectedAssetIds.length === 0 || isPending}
          >
            {isPending ? 'Linking...' : `Link ${selectedAssetIds.length} Asset(s)`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto space-y-2">
          {availableAssets.length === 0 ? (
            <p className="text-center text-surface-500 py-4">No assets available</p>
          ) : (
            availableAssets.map((asset) => (
              <label
                key={asset.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                  selectedAssetIds.includes(asset.id)
                    ? 'bg-brand-500/20'
                    : 'bg-surface-100 hover:bg-surface-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAssetIds.includes(asset.id)}
                  onChange={() => toggleAsset(asset.id)}
                  className="rounded border-surface-500"
                />
                <div>
                  <p className="text-surface-900">{asset.name}</p>
                  <p className="text-sm text-surface-600">
                    {asset.type} • {asset.source}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
      </div>
    </Dialog>
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
    <Dialog
      open
      onClose={onClose}
      title="Treatment Plan"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              onSave({
                treatmentPlan: plan,
                treatmentNotes: notes,
                treatmentDueDate: dueDate || undefined,
              })
            }
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Treatment'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-surface-600 mb-2">Treatment Strategy</label>
          <div className="grid grid-cols-2 gap-2">
            {TREATMENT_PLANS.map((tp) => (
              <button
                key={tp.value}
                type="button"
                onClick={() => setPlan(tp.value)}
                className={`p-3 rounded-lg text-left ${
                  plan === tp.value
                    ? 'bg-brand-500/20 border border-brand-500'
                    : 'bg-surface-100 border border-surface-300 hover:bg-surface-200'
                }`}
              >
                <p className="text-surface-900 font-medium">{tp.label}</p>
                <p className="text-surface-600 text-sm">{tp.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-2">Due Date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-2">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe the treatment approach..."
          />
        </div>
      </div>
    </Dialog>
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

  const formId = 'scenario-modal-form';
  return (
    <Dialog
      open
      onClose={onClose}
      title="Add Scenario"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Scenario'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(scenario);
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm text-surface-600 mb-2">Title *</label>
          <Input
            type="text"
            value={scenario.title}
            onChange={(e) => setScenario((prev) => ({ ...prev, title: e.target.value }))}
            required
            placeholder="e.g., Phishing attack on employees"
          />
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-2">Description *</label>
          <Textarea
            value={scenario.description}
            onChange={(e) => setScenario((prev) => ({ ...prev, description: e.target.value }))}
            required
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Threat Actor</label>
            <Select
              value={scenario.threatActor}
              onChange={(v) => setScenario((prev) => ({ ...prev, threatActor: v }))}
              placeholder="Select..."
              options={[
                { value: '', label: 'Select...' },
                { value: 'insider', label: 'Insider' },
                { value: 'external', label: 'External' },
                { value: 'natural', label: 'Natural Event' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-2">Attack Vector</label>
            <Input
              type="text"
              value={scenario.attackVector}
              onChange={(e) => setScenario((prev) => ({ ...prev, attackVector: e.target.value }))}
              placeholder="e.g., Email, Network"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Likelihood</label>
            <Select
              value={scenario.likelihood}
              onChange={(v) => setScenario((prev) => ({ ...prev, likelihood: v }))}
              options={LIKELIHOODS.map((l) => ({ value: l, label: l.replace('_', ' ') }))}
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-2">Impact</label>
            <Select
              value={scenario.impact}
              onChange={(v) => setScenario((prev) => ({ ...prev, impact: v }))}
              options={IMPACTS.map((i) => ({ value: i, label: i }))}
            />
          </div>
        </div>
      </form>
    </Dialog>
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
  risk: RiskDetail;
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
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const formId = 'edit-risk-modal-form';
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit Risk"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
        }}
        className="space-y-4"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Title *</label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Description *</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            required
            rows={4}
          />
        </div>

        {/* Category and Source */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Category</label>
            <Select
              value={formData.category}
              onChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
              options={CATEGORIES}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Source</label>
            <Select
              value={formData.source}
              onChange={(v) => setFormData((prev) => ({ ...prev, source: v }))}
              options={SOURCES}
            />
          </div>
        </div>

        {/* Initial Severity */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Initial Severity
          </label>
          <Select
            value={formData.initialSeverity}
            onChange={(v) => setFormData((prev) => ({ ...prev, initialSeverity: v }))}
            options={SEVERITIES}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">Tags</label>
          <div className="flex gap-2 mb-2 flex-wrap">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-brand-500/20 text-brand-700 rounded text-sm flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-brand-800"
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
            />
            <Button type="button" variant="secondary" onClick={handleAddTag}>
              Add
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
