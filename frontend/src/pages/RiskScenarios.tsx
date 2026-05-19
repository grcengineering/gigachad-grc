import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BoltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  PlayCircleIcon,
  TrashIcon,
  PencilIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { riskScenariosApi, RiskScenario } from '@/lib/api';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { SkeletonTable } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/useToast';

interface SimulationResult {
  inherentRisk: { score: number; level: string };
  residualRisk: { score: number; level: string };
  riskReduction: number;
  recommendations: string[];
}

const THREAT_ACTORS = [
  { value: 'external_attacker', label: 'External Attacker' },
  { value: 'insider_malicious', label: 'Malicious Insider' },
  { value: 'insider_negligent', label: 'Negligent Insider' },
  { value: 'nation_state', label: 'Nation State' },
  { value: 'organized_crime', label: 'Organized Crime' },
  { value: 'hacktivist', label: 'Hacktivist' },
  { value: 'competitor', label: 'Competitor' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
];

const ATTACK_VECTORS = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'malware', label: 'Malware' },
  { value: 'social_engineering', label: 'Social Engineering' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'supply_chain', label: 'Supply Chain' },
  { value: 'physical', label: 'Physical Access' },
  { value: 'insider_access', label: 'Insider Access' },
  { value: 'web_application', label: 'Web Application' },
  { value: 'network', label: 'Network Attack' },
  { value: 'api', label: 'API Exploitation' },
];

const CATEGORIES = [
  'Data Breach',
  'System Compromise',
  'Service Disruption',
  'Financial Fraud',
  'Compliance Violation',
  'Reputation Damage',
  'Physical Security',
  'Third Party Risk',
  'Cloud Security',
  'AI/ML Risk',
  'Remote Work',
  'IoT/OT Security',
];

const LIKELIHOOD_OPTIONS = [
  { value: 'rare', label: 'Rare' },
  { value: 'unlikely', label: 'Unlikely' },
  { value: 'possible', label: 'Possible' },
  { value: 'likely', label: 'Likely' },
  { value: 'almost_certain', label: 'Almost Certain' },
];

const IMPACT_OPTIONS = [
  { value: 'negligible', label: 'Negligible' },
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'severe', label: 'Severe' },
];

const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical':
      return 'text-red-500 bg-red-500/20';
    case 'high':
      return 'text-orange-500 bg-orange-500/20';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/20';
    case 'low':
      return 'text-green-500 bg-green-500/20';
    default:
      return 'text-surface-600 bg-surface-500/20';
  }
};

export default function RiskScenarios() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [threatActorFilter, setThreatActorFilter] = useState('');
  const [showTemplatesOnly, setShowTemplatesOnly] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState<RiskScenario | null>(null);
  const [simulatingScenario, setSimulatingScenario] = useState<RiskScenario | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationParams, setSimulationParams] = useState({
    controlEffectiveness: 50,
    mitigations: [] as string[],
  });

  // Fetch scenarios
  const { data: scenariosData, isLoading } = useQuery({
    queryKey: ['risk-scenarios', searchTerm, categoryFilter, threatActorFilter, showTemplatesOnly],
    queryFn: async () => {
      const response = await riskScenariosApi.list({
        search: searchTerm || undefined,
        category: categoryFilter || undefined,
        threatActor: threatActorFilter || undefined,
        isTemplate: showTemplatesOnly || undefined,
      });
      return response.data;
    },
  });

  // Fetch library templates (global templates available to all orgs)
  const { data: libraryData } = useQuery({
    queryKey: ['risk-scenario-library'],
    queryFn: async () => {
      const response = await riskScenariosApi.getLibraryByCategory();
      return response.data;
    },
  });

  // Fetch statistics
  const { data: statsData } = useQuery({
    queryKey: ['risk-scenario-stats'],
    queryFn: async () => {
      const response = await riskScenariosApi.getStatistics();
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof riskScenariosApi.create>[0]) =>
      riskScenariosApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['risk-scenario-stats'] });
      setIsCreateModalOpen(false);
      toast.success('Scenario created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create scenario');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => riskScenariosApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-scenarios'] });
      setEditingScenario(null);
      toast.success('Scenario updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update scenario');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => riskScenariosApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['risk-scenario-stats'] });
      toast.success('Scenario deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete scenario');
    },
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: ({ id, newTitle }: { id: string; newTitle?: string }) =>
      riskScenariosApi.clone(id, newTitle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-scenarios'] });
      toast.success('Scenario cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone scenario');
    },
  });

  // Simulate mutation
  const simulateMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: typeof simulationParams }) =>
      riskScenariosApi.simulate(id, params),
    onSuccess: (response) => {
      setSimulationResult(response.data);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to run simulation');
    },
  });

  const scenarios = (scenariosData as any)?.data || [];
  const libraryCategories = libraryData || [];
  const stats = statsData || {
    total: 0,
    templates: 0,
    byCategory: [],
    byThreatActor: [],
    byRiskLevel: [],
  };

  const handleRunSimulation = () => {
    if (simulatingScenario) {
      simulateMutation.mutate({ id: simulatingScenario.id, params: simulationParams });
    }
  };

  const getThreatActorLabel = (value: string) =>
    THREAT_ACTORS.find((t) => t.value === value)?.label || value;

  const getAttackVectorLabel = (value: string) =>
    ATTACK_VECTORS.find((v) => v.value === value)?.label || value;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BoltIcon className="h-7 w-7 text-brand-400" />
            Risk Scenarios
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage risk scenarios and run simulations to analyze potential threats
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<PlusIcon className="h-5 w-5" />}
        >
          New Scenario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Total Scenarios</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Templates</p>
          <p className="text-2xl font-bold text-brand-400">{stats.templates}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">High/Critical Risk</p>
          <p className="text-2xl font-bold text-red-600">
            {stats.byRiskLevel
              ?.filter((r: any) => ['high', 'critical'].includes(r.level))
              .reduce((sum: number, r: any) => sum + r.count, 0) || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold text-foreground">{stats.byCategory?.length || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search scenarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
              />
            </div>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={threatActorFilter}
            onChange={(e) => setThreatActorFilter(e.target.value)}
            className="px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            <option value="">All Threat Actors</option>
            {THREAT_ACTORS.map((actor) => (
              <option key={actor.value} value={actor.value}>
                {actor.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-foreground">
            <input
              type="checkbox"
              checked={showTemplatesOnly}
              onChange={(e) => setShowTemplatesOnly(e.target.checked)}
              className="rounded border-surface-600"
            />
            Templates Only
          </label>
        </div>
      </div>

      {/* Scenarios List */}
      {isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : scenarios.length === 0 ? (
        <EmptyState
          variant="chart"
          title="No scenarios found"
          description="Create your first risk scenario or import from the template library."
          action={{
            label: 'Create Scenario',
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <div className="grid gap-4">
          {scenarios.map((scenario: RiskScenario) => (
            <div
              key={scenario.id}
              className="card p-4 hover:border-brand-500/50 transition-colors cursor-pointer"
              onClick={() => setEditingScenario(scenario)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{scenario.title}</h3>
                    {scenario.isTemplate && (
                      <span className="px-2 py-0.5 text-xs bg-brand-500/20 text-brand-400 rounded-full">
                        Template
                      </span>
                    )}
                    {scenario.riskLevel && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${getRiskColor(scenario.riskLevel)}`}
                      >
                        {scenario.riskLevel.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {scenario.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      {getThreatActorLabel(scenario.threatActor)}
                    </span>
                    <span>{getAttackVectorLabel(scenario.attackVector)}</span>
                    <span className="bg-surface-700 px-2 py-0.5 rounded">{scenario.category}</span>
                    {scenario.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1">
                        <TagIcon className="h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                    {(scenario.usageCount ?? 0) > 0 && <span>Used {scenario.usageCount}x</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSimulatingScenario(scenario);
                      setSimulationResult(null);
                      setSimulationParams({ controlEffectiveness: 50, mitigations: [] });
                    }}
                    className="p-2 text-surface-600 hover:text-brand-400 hover:bg-surface-700 rounded-lg transition-colors"
                    title="Run Simulation"
                  >
                    <PlayCircleIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => cloneMutation.mutate({ id: scenario.id })}
                    className="p-2 text-surface-600 hover:text-brand-400 hover:bg-surface-700 rounded-lg transition-colors"
                    title="Clone"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEditingScenario(scenario)}
                    className="p-2 text-surface-600 hover:text-brand-400 hover:bg-surface-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this scenario?')) {
                        deleteMutation.mutate(scenario.id);
                      }
                    }}
                    className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scenario Library Section */}
      {libraryCategories.length > 0 && !showTemplatesOnly && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Scenario Library</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browse pre-built risk scenarios organized by category. Clone any scenario to
                customize it for your organization.
              </p>
            </div>
            <span className="text-xs bg-brand-500/20 text-brand-400 px-2 py-1 rounded-full">
              {libraryCategories.reduce((sum, cat) => sum + cat.templates.length, 0)} scenarios
            </span>
          </div>

          <div className="space-y-6">
            {libraryCategories.map((categoryGroup) => (
              <div key={categoryGroup.category}>
                <h4 className="text-sm font-medium text-surface-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                  {categoryGroup.category}
                  <span className="text-xs text-surface-500">
                    ({categoryGroup.templates.length})
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryGroup.templates.map((template: RiskScenario) => (
                    <div
                      key={template.id}
                      className="bg-surface-700/50 hover:bg-surface-700 rounded-lg p-4 transition-colors group"
                    >
                      <h5 className="font-medium text-foreground text-sm line-clamp-1">
                        {template.title}
                      </h5>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags?.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs bg-surface-600 text-surface-700 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-600">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getThreatActorLabel(template.threatActor)}</span>
                          {(template.usageCount ?? 0) > 0 && (
                            <span>• Used {template.usageCount}x</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => cloneMutation.mutate({ id: template.id })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingScenario}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingScenario(null);
        }}
        title={editingScenario ? 'Edit Scenario' : 'Create Scenario'}
        size="lg"
      >
        <ScenarioForm
          scenario={editingScenario}
          onSubmit={(data) => {
            if (editingScenario) {
              updateMutation.mutate({ id: editingScenario.id, data });
            } else {
              createMutation.mutate(data as Parameters<typeof riskScenariosApi.create>[0]);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* Simulation Modal */}
      <Modal
        isOpen={!!simulatingScenario}
        onClose={() => {
          setSimulatingScenario(null);
          setSimulationResult(null);
        }}
        title="Risk Simulation"
        size="lg"
      >
        {simulatingScenario && (
          <div className="space-y-6">
            <div className="bg-surface-700/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground">{simulatingScenario.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{simulatingScenario.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">
                  Threat:{' '}
                  <span className="text-foreground">
                    {getThreatActorLabel(simulatingScenario.threatActor)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Vector:{' '}
                  <span className="text-foreground">
                    {getAttackVectorLabel(simulatingScenario.attackVector)}
                  </span>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Control Effectiveness: {simulationParams.controlEffectiveness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={simulationParams.controlEffectiveness}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      controlEffectiveness: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mitigations (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., MFA, Employee Training, Network Segmentation"
                  value={simulationParams.mitigations.join(', ')}
                  onChange={(e) =>
                    setSimulationParams({
                      ...simulationParams,
                      mitigations: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
                />
              </div>

              <Button onClick={handleRunSimulation} isLoading={simulateMutation.isPending}>
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Run Simulation
              </Button>
            </div>

            {simulationResult && (
              <div className="bg-surface-800 rounded-lg p-6 border border-surface-700">
                <h4 className="font-semibold text-foreground mb-4">Simulation Results</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Inherent Risk</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {simulationResult.inherentRisk.score}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${getRiskColor(simulationResult.inherentRisk.level)}`}
                      >
                        {simulationResult.inherentRisk.level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Residual Risk</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">
                        {simulationResult.residualRisk.score}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${getRiskColor(simulationResult.residualRisk.level)}`}
                      >
                        {simulationResult.residualRisk.level.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Risk Reduction</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${simulationResult.riskReduction}%` }}
                      />
                    </div>
                    <span className="text-green-600 font-semibold">
                      {simulationResult.riskReduction}%
                    </span>
                  </div>
                </div>
                {simulationResult.recommendations.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {simulationResult.recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-brand-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

interface ScenarioFormProps {
  scenario?: RiskScenario | null;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function ScenarioForm({ scenario, onSubmit, isLoading }: ScenarioFormProps) {
  const [formData, setFormData] = useState({
    title: scenario?.title || '',
    description: scenario?.description || '',
    category: scenario?.category || CATEGORIES[0],
    threatActor: scenario?.threatActor || 'external_attacker',
    attackVector: scenario?.attackVector || 'phishing',
    targetAssets: scenario?.targetAssets?.join(', ') || '',
    likelihood: scenario?.likelihood || 'possible',
    impact: scenario?.impact || 'moderate',
    tags: scenario?.tags?.join(', ') || '',
    isTemplate: scenario?.isTemplate || false,
    mitigationStrategy: scenario?.mitigationStrategy || '',
    businessContext: scenario?.businessContext || '',
    complianceImpact: scenario?.complianceImpact || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      targetAssets: formData.targetAssets
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
      tags: formData.tags
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          placeholder="e.g., Phishing Attack on Employees"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description *</label>
        <textarea
          required
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          placeholder="Describe the risk scenario in detail..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Threat Actor *</label>
          <select
            required
            value={formData.threatActor}
            onChange={(e) => setFormData({ ...formData, threatActor: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            {THREAT_ACTORS.map((actor) => (
              <option key={actor.value} value={actor.value}>
                {actor.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Attack Vector *</label>
          <select
            required
            value={formData.attackVector}
            onChange={(e) => setFormData({ ...formData, attackVector: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            {ATTACK_VECTORS.map((vector) => (
              <option key={vector.value} value={vector.value}>
                {vector.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Target Assets</label>
          <input
            type="text"
            value={formData.targetAssets}
            onChange={(e) => setFormData({ ...formData, targetAssets: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
            placeholder="e.g., Email System, Database (comma-separated)"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Likelihood *</label>
          <select
            required
            value={formData.likelihood}
            onChange={(e) => setFormData({ ...formData, likelihood: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            {LIKELIHOOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Impact *</label>
          <select
            required
            value={formData.impact}
            onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
            className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          >
            {IMPACT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          placeholder="e.g., critical, compliance, data (comma-separated)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Mitigation Strategy
        </label>
        <textarea
          rows={2}
          value={formData.mitigationStrategy}
          onChange={(e) => setFormData({ ...formData, mitigationStrategy: e.target.value })}
          className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground"
          placeholder="Describe how this risk can be mitigated..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isTemplate"
          checked={formData.isTemplate}
          onChange={(e) => setFormData({ ...formData, isTemplate: e.target.checked })}
          className="rounded border-surface-600"
        />
        <label htmlFor="isTemplate" className="text-sm text-foreground">
          Save as template (available for reuse)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
        <Button type="submit" isLoading={isLoading}>
          {scenario ? 'Update Scenario' : 'Create Scenario'}
        </Button>
      </div>
    </form>
  );
}
