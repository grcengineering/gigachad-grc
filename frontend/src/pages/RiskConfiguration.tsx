import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { riskConfigApi } from '../lib/api';
import {
  ChartBarIcon,
  TagIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

type ConfigTab = 'scoring' | 'categories' | 'workflow' | 'slas' | 'appetite';

interface LikelihoodScaleItem {
  value: string;
  label: string;
  description: string;
  weight: number;
}

interface ImpactScaleItem {
  value: string;
  label: string;
  description: string;
  weight: number;
}

interface RiskCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

interface RiskAppetite {
  category: string;
  level: string;
  description?: string;
}

interface WorkflowSettings {
  requireAssessment?: boolean;
  requireGrcReview?: boolean;
  autoAssignOwner?: boolean;
  executiveApprovalThreshold?: string;
  defaultReviewFrequency?: string;
  autoCloseAccepted?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnDueDate?: boolean;
  dueDateReminderDays?: number;
}

interface SLASettings {
  // Time limits in hours
  intakeToAssessment: number;
  assessmentDuration: number;
  grcReviewDuration: number;
  treatmentDecisionDuration: number;
  executiveApprovalDuration: number;
  // Mitigation SLAs by risk level (in days)
  mitigationSLA: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  // Review cycle SLAs by risk level (in days)
  reviewCycleSLA: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  // Escalation settings
  escalationEnabled: boolean;
  escalationThresholdPercent: number;
  escalationNotifyRoles: string[];
  // Breach handling
  autoEscalateOnBreach: boolean;
  breachNotificationEnabled: boolean;
  breachGracePeriodHours: number;
}

interface RiskConfiguration {
  id: string;
  organizationId: string;
  methodology: string;
  likelihoodScale: LikelihoodScaleItem[];
  impactScale: ImpactScaleItem[];
  categories: RiskCategory[];
  riskLevelThresholds: { low: number; medium: number; high: number; critical: number };
  workflowSettings: WorkflowSettings;
  slaSettings?: SLASettings;
  riskAppetite: RiskAppetite[];
}

export default function RiskConfiguration() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('scoring');
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config, isLoading, error } = useQuery<RiskConfiguration>({
    queryKey: ['risk-config'],
    queryFn: async () => {
      const response = await riskConfigApi.get();
      return response.data;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<RiskConfiguration>) => {
      const response = await riskConfigApi.update(data as any);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-config'] });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await riskConfigApi.reset();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-config'] });
    },
  });

  const tabs = [
    { key: 'scoring' as ConfigTab, label: 'Scoring Methodology', icon: ChartBarIcon },
    { key: 'categories' as ConfigTab, label: 'Risk Categories', icon: TagIcon },
    { key: 'workflow' as ConfigTab, label: 'Workflow Settings', icon: ClockIcon },
    { key: 'slas' as ConfigTab, label: 'SLAs & Escalation', icon: BellAlertIcon },
    { key: 'appetite' as ConfigTab, label: 'Risk Appetite', icon: ExclamationTriangleIcon },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-500 dark:text-surface-400">Loading configuration...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 dark:text-red-400">Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-900 dark:text-white">Risk Configuration</h1>
          <p className="text-gray-500 dark:text-gray-500 dark:text-surface-400 mt-1">Configure risk management settings and methodology</p>
        </div>
        <div className="flex items-center gap-3">
          {updateMutation.isPending && (
            <span className="text-brand-500 dark:text-brand-400 text-sm flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          )}
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                resetMutation.mutate();
              }
            }}
            disabled={resetMutation.isPending}
            className="px-4 py-2 bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-surface-300 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-600 flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-surface-700 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-500 dark:text-brand-400'
                : 'border-transparent text-gray-500 dark:text-gray-500 dark:text-surface-400 hover:text-gray-700 dark:hover:text-surface-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-surface-800 rounded-xl border border-gray-200 dark:border-surface-700 p-6">
        {activeTab === 'scoring' && config && (
          <ScoringMethodology
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'categories' && config && (
          <RiskCategories
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'workflow' && config && (
          <WorkflowSettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'slas' && config && (
          <SLASettingsTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
        {activeTab === 'appetite' && config && (
          <RiskAppetiteTab
            config={config}
            onUpdate={(data) => updateMutation.mutate(data)}
          />
        )}
      </div>
    </div>
  );
}

function ScoringMethodology({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [methodology, setMethodology] = useState(config.methodology);
  const [showMethodologyDetails, setShowMethodologyDetails] = useState(false);

  useEffect(() => {
    setMethodology(config.methodology);
  }, [config.methodology]);

  const handleMethodologyChange = (value: string) => {
    setMethodology(value);
    onUpdate({ methodology: value });
  };

  const methodologyDetails = {
    qualitative: {
      title: 'Qualitative Risk Assessment',
      description: 'Uses subjective judgment and categorical scales to assess risk levels. Best for organizations starting their risk management journey or when precise data is unavailable.',
      formula: 'Risk Score = Likelihood Rating × Impact Rating',
      pros: [
        'Easy to understand and communicate',
        'Quick to implement and assess',
        'Works well without historical data',
        'Facilitates stakeholder discussions',
        'Suitable for strategic and reputational risks',
      ],
      cons: [
        'Subjective and prone to bias',
        'Difficult to compare across different risk types',
        'May not satisfy regulatory requirements for financial risks',
        'Less precise for cost-benefit analysis',
      ],
      bestFor: [
        'Early-stage risk programs',
        'Non-financial risks (reputational, strategic)',
        'Quick risk triage',
        'Board-level reporting',
      ],
      standards: ['ISO 31000', 'NIST RMF', 'COSO ERM', 'ISO 27005'],
    },
    quantitative: {
      title: 'Quantitative Risk Assessment',
      description: 'Uses numerical data and statistical methods to calculate risk in monetary terms. Enables precise cost-benefit analysis and ROI calculations for security investments.',
      formula: 'ALE = SLE × ARO\nwhere:\n• ALE = Annual Loss Expectancy\n• SLE = Single Loss Expectancy (Asset Value × Exposure Factor)\n• ARO = Annual Rate of Occurrence',
      pros: [
        'Objective and data-driven',
        'Enables precise ROI calculations',
        'Supports budget justification',
        'Facilitates comparison across risk types',
        'Meets regulatory requirements for financial risks',
      ],
      cons: [
        'Requires historical data and statistics',
        'Time-consuming to implement properly',
        'May give false sense of precision',
        'Difficult for non-financial risks',
        'Requires specialized expertise',
      ],
      bestFor: [
        'Mature risk programs',
        'Financial and operational risks',
        'Security investment decisions',
        'Insurance and actuarial analysis',
        'Regulatory compliance (Basel, Solvency II)',
      ],
      standards: ['FAIR (Factor Analysis of Information Risk)', 'Basel III', 'Solvency II', 'Monte Carlo Simulation'],
    },
    hybrid: {
      title: 'Hybrid Risk Assessment',
      description: 'Combines qualitative and quantitative methods, using qualitative assessments for initial screening and quantitative analysis for high-priority risks requiring detailed analysis.',
      formula: 'Initial: Likelihood × Impact Matrix\nDetailed: ALE = SLE × ARO (for high-priority risks)',
      pros: [
        'Flexibility for different risk types',
        'Efficient resource allocation',
        'Balances speed with precision',
        'Satisfies diverse stakeholder needs',
        'Scalable as program matures',
      ],
      cons: [
        'More complex to manage',
        'Requires clear criteria for escalation',
        'May cause confusion if not well-documented',
        'Needs training on both approaches',
      ],
      bestFor: [
        'Organizations with diverse risk portfolios',
        'Maturing risk programs',
        'Mixed regulatory requirements',
        'Enterprise-wide risk management',
      ],
      standards: ['ISO 31000', 'FAIR', 'NIST CSF', 'COBIT'],
    },
  };

  const currentMethodology = methodologyDetails[methodology as keyof typeof methodologyDetails];

  return (
    <div className="space-y-6">
      {/* Methodology Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scoring Methodology</h3>
          <button
            onClick={() => setShowMethodologyDetails(!showMethodologyDetails)}
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            {showMethodologyDetails ? 'Hide Details' : 'Learn More'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Qualitative */}
          <label className={`p-4 rounded-lg border cursor-pointer transition-all ${
            methodology === 'qualitative' 
              ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500' 
              : 'border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700/50 hover:border-brand-500/50'
          }`}>
            <input
              type="radio"
              name="methodology"
              value="qualitative"
              checked={methodology === 'qualitative'}
              onChange={e => handleMethodologyChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${methodology === 'qualitative' ? 'bg-brand-500/20' : 'bg-gray-200 dark:bg-surface-600'}`}>
                <ChartBarIcon className={`w-5 h-5 ${methodology === 'qualitative' ? 'text-brand-400' : 'text-gray-500 dark:text-surface-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-medium">Qualitative</p>
                <p className="text-gray-500 dark:text-surface-400 text-sm mt-1">
                  Likelihood × Impact matrix using categorical scales (1-5)
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">Easy</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Fast</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">ISO 31000</span>
                </div>
              </div>
            </div>
          </label>

          {/* Quantitative */}
          <label className={`p-4 rounded-lg border cursor-pointer transition-all ${
            methodology === 'quantitative' 
              ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500' 
              : 'border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700/50 hover:border-brand-500/50'
          }`}>
            <input
              type="radio"
              name="methodology"
              value="quantitative"
              checked={methodology === 'quantitative'}
              onChange={e => handleMethodologyChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${methodology === 'quantitative' ? 'bg-brand-500/20' : 'bg-gray-200 dark:bg-surface-600'}`}>
                <svg className={`w-5 h-5 ${methodology === 'quantitative' ? 'text-brand-400' : 'text-gray-500 dark:text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-medium">Quantitative</p>
                <p className="text-gray-500 dark:text-surface-400 text-sm mt-1">
                  Annual Loss Expectancy (ALE) using financial data
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">Advanced</span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">ROI</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">FAIR</span>
                </div>
              </div>
            </div>
          </label>

          {/* Hybrid */}
          <label className={`p-4 rounded-lg border cursor-pointer transition-all ${
            methodology === 'hybrid' 
              ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500' 
              : 'border-gray-200 dark:border-surface-700 bg-gray-50 dark:bg-surface-700/50 hover:border-brand-500/50'
          }`}>
            <input
              type="radio"
              name="methodology"
              value="hybrid"
              checked={methodology === 'hybrid'}
              onChange={e => handleMethodologyChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${methodology === 'hybrid' ? 'bg-brand-500/20' : 'bg-gray-200 dark:bg-surface-600'}`}>
                <svg className={`w-5 h-5 ${methodology === 'hybrid' ? 'text-brand-400' : 'text-gray-500 dark:text-surface-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-medium">Hybrid</p>
                <p className="text-gray-500 dark:text-surface-400 text-sm mt-1">
                  Qualitative screening + Quantitative deep-dive
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">Flexible</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">Scalable</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">Best Practice</span>
                </div>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Methodology Details Panel */}
      {showMethodologyDetails && currentMethodology && (
        <div className="p-6 bg-gray-50 dark:bg-surface-700/30 rounded-xl border border-gray-200 dark:border-surface-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{currentMethodology.title}</h4>
          <p className="text-gray-600 dark:text-surface-300 text-sm mb-4">{currentMethodology.description}</p>
          
          {/* Formula */}
          <div className="mb-6 p-4 bg-gray-900 dark:bg-surface-900 rounded-lg">
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Formula</p>
            <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{currentMethodology.formula}</pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Advantages */}
            <div>
              <h5 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Advantages
              </h5>
              <ul className="space-y-2">
                {currentMethodology.pros.map((pro, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-surface-300 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1">•</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div>
              <h5 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Limitations
              </h5>
              <ul className="space-y-2">
                {currentMethodology.cons.map((con, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-surface-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-1">•</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-surface-700">
            {/* Best For */}
            <div>
              <h5 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Best For
              </h5>
              <ul className="space-y-2">
                {currentMethodology.bestFor.map((item, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-surface-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Supporting Standards */}
            <div>
              <h5 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Supporting Standards & Frameworks
              </h5>
              <div className="flex flex-wrap gap-2">
                {currentMethodology.standards.map((std, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                    {std}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantitative-specific settings */}
      {(methodology === 'quantitative' || methodology === 'hybrid') && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quantitative Analysis Settings
          </h4>
          <p className="text-gray-600 dark:text-surface-300 text-sm mb-4">
            When using quantitative or hybrid methodology, risks can include financial data for ALE calculation.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-surface-800/50 rounded-lg">
              <p className="text-gray-500 dark:text-surface-400">Currency</p>
              <p className="text-gray-900 dark:text-white font-medium">USD ($)</p>
            </div>
            <div className="p-3 bg-surface-800/50 rounded-lg">
              <p className="text-gray-500 dark:text-surface-400">Analysis Period</p>
              <p className="text-gray-900 dark:text-white font-medium">Annual (12 months)</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-surface-500 mt-3">
            Configure additional quantitative settings including asset values, exposure factors, and historical loss data in individual risk assessments.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="text-gray-900 dark:text-gray-900 dark:text-white font-medium mb-3">Likelihood Scale</h4>
          <div className="space-y-2">
            {config.likelihoodScale.map((level) => (
              <div key={level.value} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-50 dark:bg-surface-700/50 rounded-lg">
                <span className="w-6 h-6 rounded bg-gray-200 dark:bg-surface-600 flex items-center justify-center text-gray-900 dark:text-gray-900 dark:text-white text-sm font-medium">
                  {level.weight}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-900 dark:text-white text-sm">{level.label}</p>
                  <p className="text-gray-500 dark:text-gray-500 dark:text-surface-400 text-xs">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-gray-900 dark:text-gray-900 dark:text-white font-medium mb-3">Impact Scale</h4>
          <div className="space-y-2">
            {config.impactScale.map((level) => (
              <div key={level.value} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-50 dark:bg-surface-700/50 rounded-lg">
                <span className="w-6 h-6 rounded bg-gray-200 dark:bg-surface-600 flex items-center justify-center text-gray-900 dark:text-gray-900 dark:text-white text-sm font-medium">
                  {level.weight}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-gray-900 dark:text-white text-sm">{level.label}</p>
                  <p className="text-gray-500 dark:text-gray-500 dark:text-surface-400 text-xs">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-gray-900 dark:text-gray-900 dark:text-white font-medium mb-3">Risk Level Matrix</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-gray-500 dark:text-gray-500 dark:text-surface-400 text-left"></th>
                {config.impactScale.map(i => (
                  <th key={i.value} className="p-2 text-center text-gray-500 dark:text-gray-500 dark:text-surface-400">{i.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...config.likelihoodScale].reverse().map((likelihood) => (
                <tr key={likelihood.value}>
                  <td className="p-2 text-gray-500 dark:text-gray-500 dark:text-surface-400">{likelihood.label}</td>
                  {config.impactScale.map(impact => {
                    const score = likelihood.weight * impact.weight;
                    let color = 'bg-emerald-500/50';
                    if (score >= config.riskLevelThresholds.critical) color = 'bg-red-500/50';
                    else if (score >= config.riskLevelThresholds.high) color = 'bg-orange-500/50';
                    else if (score >= config.riskLevelThresholds.medium) color = 'bg-amber-500/50';
                    else if (score >= config.riskLevelThresholds.low) color = 'bg-emerald-500/50';
                    return (
                      <td key={impact.value} className={`p-2 text-center ${color} text-gray-900 dark:text-white`}>
                        {score}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskCategories({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [categories, setCategories] = useState<RiskCategory[]>(config.categories);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6366f1' });

  useEffect(() => {
    setCategories(config.categories);
  }, [config.categories]);

  const handleAddCategory = () => {
    if (newCategory.name) {
      const updated = [...categories, { ...newCategory, id: `cat-${Date.now()}` }];
      setCategories(updated);
      onUpdate({ categories: updated });
      setNewCategory({ name: '', description: '', color: '#6366f1' });
    }
  };

  const handleRemoveCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    onUpdate({ categories: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-900 dark:text-white mb-4">Risk Categories</h3>
        <p className="text-gray-500 dark:text-gray-500 dark:text-surface-400 text-sm mb-4">Define the categories used to classify risks in your organization.</p>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: cat.color }}
            />
            <div className="flex-1">
              <p className="text-gray-900 dark:text-gray-900 dark:text-white font-medium">{cat.name}</p>
              <p className="text-gray-500 dark:text-gray-500 dark:text-surface-400 text-sm">{cat.description}</p>
            </div>
            <button
              onClick={() => handleRemoveCategory(cat.id)}
              className="text-gray-500 dark:text-gray-500 dark:text-surface-400 hover:text-red-500 dark:hover:text-red-400 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium mb-3">Add Category</h4>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Category name"
            value={newCategory.name ?? ''}
            onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Description"
            value={newCategory.description ?? ''}
            onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white"
          />
          <input
            type="color"
            value={newCategory.color ?? '#6366f1'}
            onChange={e => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
            className="w-12 h-10 rounded cursor-pointer"
          />
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-brand-500 text-gray-900 dark:text-white rounded-lg hover:bg-brand-600"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowSettingsTab({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [settings, setSettings] = useState<WorkflowSettings>(config.workflowSettings);

  useEffect(() => {
    setSettings(config.workflowSettings);
  }, [config.workflowSettings]);

  const handleChange = (key: keyof WorkflowSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ workflowSettings: updated });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Workflow Settings</h3>
        <p className="text-gray-500 dark:text-surface-400 text-sm mb-4">Configure how risks flow through the assessment and treatment process.</p>
      </div>

      <div className="space-y-4">
        <h4 className="text-gray-900 dark:text-white font-medium">Assessment Workflow</h4>
        
        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-gray-900 dark:text-white">Require Formal Assessment</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">All risks must go through assessment phase</p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireAssessment ?? true}
            onChange={e => handleChange('requireAssessment', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-gray-900 dark:text-white">Require GRC Review</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">Assessments must be reviewed by GRC team</p>
          </div>
          <input
            type="checkbox"
            checked={settings.requireGrcReview ?? true}
            onChange={e => handleChange('requireGrcReview', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-900 dark:text-white">Executive Approval Threshold</p>
          </div>
          <p className="text-gray-500 dark:text-surface-400 text-sm mb-3">Risk level that requires executive approval for accept/transfer/avoid</p>
          <select
            value={settings.executiveApprovalThreshold ?? 'high'}
            onChange={e => handleChange('executiveApprovalThreshold', e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="critical">Critical only</option>
            <option value="high">High and above</option>
            <option value="medium">Medium and above</option>
            <option value="none">No approval required</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium">Review Settings</h4>
        
        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <p className="text-gray-900 dark:text-white mb-2">Default Review Frequency</p>
          <select
            value={settings.defaultReviewFrequency ?? 'quarterly'}
            onChange={e => handleChange('defaultReviewFrequency', e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="semi_annually">Semi-Annually</option>
            <option value="annually">Annually</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium">Notifications</h4>
        
        <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <div>
            <p className="text-gray-900 dark:text-white">Notify on Status Change</p>
            <p className="text-gray-500 dark:text-surface-400 text-sm">Send notifications when risk status changes</p>
          </div>
          <input
            type="checkbox"
            checked={settings.notifyOnStatusChange ?? true}
            onChange={e => handleChange('notifyOnStatusChange', e.target.checked)}
            className="rounded border-surface-600"
          />
        </label>

        <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-900 dark:text-white">Due Date Reminder</p>
          </div>
          <p className="text-gray-500 dark:text-surface-400 text-sm mb-3">Days before due date to send reminder</p>
          <input
            type="number"
            value={settings.dueDateReminderDays ?? 7}
            onChange={e => handleChange('dueDateReminderDays', parseInt(e.target.value))}
            min="1"
            max="30"
            className="w-full px-4 py-2 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_SLA_SETTINGS: SLASettings = {
  intakeToAssessment: 48,
  assessmentDuration: 120,
  grcReviewDuration: 72,
  treatmentDecisionDuration: 48,
  executiveApprovalDuration: 72,
  mitigationSLA: {
    critical: 7,
    high: 30,
    medium: 90,
    low: 180,
  },
  reviewCycleSLA: {
    critical: 30,
    high: 90,
    medium: 180,
    low: 365,
  },
  escalationEnabled: true,
  escalationThresholdPercent: 80,
  escalationNotifyRoles: ['grc_manager', 'risk_owner'],
  autoEscalateOnBreach: true,
  breachNotificationEnabled: true,
  breachGracePeriodHours: 24,
};

function SLASettingsTab({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [settings, setSettings] = useState<SLASettings>(config.slaSettings || DEFAULT_SLA_SETTINGS);

  useEffect(() => {
    setSettings(config.slaSettings || DEFAULT_SLA_SETTINGS);
  }, [config.slaSettings]);

  const handleChange = <K extends keyof SLASettings>(key: K, value: SLASettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    onUpdate({ slaSettings: updated });
  };

  const handleMitigationSLAChange = (level: keyof SLASettings['mitigationSLA'], value: number) => {
    const updated = { ...settings, mitigationSLA: { ...settings.mitigationSLA, [level]: value } };
    setSettings(updated);
    onUpdate({ slaSettings: updated });
  };

  const handleReviewCycleSLAChange = (level: keyof SLASettings['reviewCycleSLA'], value: number) => {
    const updated = { ...settings, reviewCycleSLA: { ...settings.reviewCycleSLA, [level]: value } };
    setSettings(updated);
    onUpdate({ slaSettings: updated });
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">SLA Configuration</h3>
        <p className="text-gray-500 dark:text-surface-400 text-sm">
          Define service level agreements for each step in the risk management workflow. 
          SLA breaches can trigger escalations and notifications.
        </p>
      </div>

      {/* Workflow Stage SLAs */}
      <div className="space-y-4">
        <h4 className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-brand-400" />
          Workflow Stage SLAs
        </h4>
        <p className="text-gray-500 dark:text-surface-400 text-sm">
          Maximum time allowed for each stage of the risk workflow.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              Intake → Assessment Start
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Time from risk identification to beginning assessment
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.intakeToAssessment}
                onChange={e => handleChange('intakeToAssessment', parseInt(e.target.value) || 0)}
                min="1"
                className="w-24 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
              <span className="text-gray-400 dark:text-surface-500 text-xs ml-auto">
                ({formatHours(settings.intakeToAssessment)})
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              Assessment Duration
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Maximum time for risk assessor to complete analysis
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.assessmentDuration}
                onChange={e => handleChange('assessmentDuration', parseInt(e.target.value) || 0)}
                min="1"
                className="w-24 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
              <span className="text-gray-400 dark:text-surface-500 text-xs ml-auto">
                ({formatHours(settings.assessmentDuration)})
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              GRC Review Duration
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Maximum time for GRC team to review and approve assessment
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.grcReviewDuration}
                onChange={e => handleChange('grcReviewDuration', parseInt(e.target.value) || 0)}
                min="1"
                className="w-24 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
              <span className="text-gray-400 dark:text-surface-500 text-xs ml-auto">
                ({formatHours(settings.grcReviewDuration)})
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              Treatment Decision
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Maximum time to select treatment option (mitigate, accept, transfer, avoid)
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.treatmentDecisionDuration}
                onChange={e => handleChange('treatmentDecisionDuration', parseInt(e.target.value) || 0)}
                min="1"
                className="w-24 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
              <span className="text-gray-400 dark:text-surface-500 text-xs ml-auto">
                ({formatHours(settings.treatmentDecisionDuration)})
              </span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              Executive Approval
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Maximum time for executive to approve high-risk decisions
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.executiveApprovalDuration}
                onChange={e => handleChange('executiveApprovalDuration', parseInt(e.target.value) || 0)}
                min="1"
                className="w-24 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
              <span className="text-gray-400 dark:text-surface-500 text-xs ml-auto">
                ({formatHours(settings.executiveApprovalDuration)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mitigation SLAs by Risk Level */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
          Mitigation SLAs by Risk Level
        </h4>
        <p className="text-gray-500 dark:text-surface-400 text-sm">
          Maximum time to implement mitigation controls based on risk severity.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <label className="block text-red-400 text-sm font-medium mb-2">Critical</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.mitigationSLA.critical}
                onChange={e => handleMitigationSLAChange('critical', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <label className="block text-orange-400 text-sm font-medium mb-2">High</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.mitigationSLA.high}
                onChange={e => handleMitigationSLAChange('high', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <label className="block text-amber-400 text-sm font-medium mb-2">Medium</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.mitigationSLA.medium}
                onChange={e => handleMitigationSLAChange('medium', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <label className="block text-emerald-400 text-sm font-medium mb-2">Low</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.mitigationSLA.low}
                onChange={e => handleMitigationSLAChange('low', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Cycle SLAs by Risk Level */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
          <ArrowPathIcon className="w-5 h-5 text-blue-400" />
          Review Cycle SLAs by Risk Level
        </h4>
        <p className="text-gray-500 dark:text-surface-400 text-sm">
          Maximum interval between periodic risk reviews based on risk severity.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <label className="block text-red-400 text-sm font-medium mb-2">Critical</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.reviewCycleSLA.critical}
                onChange={e => handleReviewCycleSLAChange('critical', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <label className="block text-orange-400 text-sm font-medium mb-2">High</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.reviewCycleSLA.high}
                onChange={e => handleReviewCycleSLAChange('high', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <label className="block text-amber-400 text-sm font-medium mb-2">Medium</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.reviewCycleSLA.medium}
                onChange={e => handleReviewCycleSLAChange('medium', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <label className="block text-emerald-400 text-sm font-medium mb-2">Low</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.reviewCycleSLA.low}
                onChange={e => handleReviewCycleSLAChange('low', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Settings */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-surface-700">
        <h4 className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-purple-400" />
          Escalation & Breach Handling
        </h4>
        <p className="text-gray-500 dark:text-surface-400 text-sm">
          Configure how SLA breaches and near-breaches are handled.
        </p>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <div>
              <p className="text-gray-900 dark:text-white">Enable Escalation Warnings</p>
              <p className="text-gray-500 dark:text-surface-400 text-sm">
                Notify when SLA is approaching breach threshold
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.escalationEnabled}
              onChange={e => handleChange('escalationEnabled', e.target.checked)}
              className="rounded border-surface-600"
            />
          </label>

          {settings.escalationEnabled && (
            <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg ml-4 border-l-2 border-purple-500">
              <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
                Escalation Threshold
              </label>
              <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
                Percentage of SLA time elapsed before warning is triggered
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={settings.escalationThresholdPercent}
                  onChange={e => handleChange('escalationThresholdPercent', parseInt(e.target.value) || 0)}
                  min="50"
                  max="99"
                  className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
                />
                <span className="text-gray-500 dark:text-surface-400 text-sm">%</span>
                <span className="text-gray-400 dark:text-surface-500 text-xs">
                  (e.g., warn at {settings.escalationThresholdPercent}% of 48 hours = {Math.round(48 * settings.escalationThresholdPercent / 100)} hours)
                </span>
              </div>
            </div>
          )}

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <div>
              <p className="text-gray-900 dark:text-white">Auto-Escalate on Breach</p>
              <p className="text-gray-500 dark:text-surface-400 text-sm">
                Automatically escalate to management when SLA is breached
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoEscalateOnBreach}
              onChange={e => handleChange('autoEscalateOnBreach', e.target.checked)}
              className="rounded border-surface-600"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <div>
              <p className="text-gray-900 dark:text-white">Breach Notifications</p>
              <p className="text-gray-500 dark:text-surface-400 text-sm">
                Send notifications when an SLA is breached
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.breachNotificationEnabled}
              onChange={e => handleChange('breachNotificationEnabled', e.target.checked)}
              className="rounded border-surface-600"
            />
          </label>

          <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <label className="block text-gray-900 dark:text-white text-sm font-medium mb-2">
              Breach Grace Period
            </label>
            <p className="text-gray-500 dark:text-surface-400 text-xs mb-3">
              Additional time before a breach is marked as critical
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={settings.breachGracePeriodHours}
                onChange={e => handleChange('breachGracePeriodHours', parseInt(e.target.value) || 0)}
                min="0"
                className="w-20 px-3 py-2 bg-white dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              />
              <span className="text-gray-500 dark:text-surface-400 text-sm">hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg">
        <h4 className="text-brand-400 font-medium mb-3">SLA Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-surface-400">Total Workflow SLA</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {formatHours(
                settings.intakeToAssessment + 
                settings.assessmentDuration + 
                settings.grcReviewDuration + 
                settings.treatmentDecisionDuration
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-surface-400">Critical Risk Mitigation</p>
            <p className="text-gray-900 dark:text-white font-medium">{settings.mitigationSLA.critical} days</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-surface-400">Critical Risk Review Cycle</p>
            <p className="text-gray-900 dark:text-white font-medium">{settings.reviewCycleSLA.critical} days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskAppetiteTab({
  config,
  onUpdate,
}: {
  config: RiskConfiguration;
  onUpdate: (data: Partial<RiskConfiguration>) => void;
}) {
  const [appetite, setAppetite] = useState<RiskAppetite[]>(config.riskAppetite);

  useEffect(() => {
    setAppetite(config.riskAppetite);
  }, [config.riskAppetite]);

  const handleLevelChange = (category: string, level: string) => {
    const updated = appetite.map(a => 
      a.category === category ? { ...a, level } : a
    );
    setAppetite(updated);
    onUpdate({ riskAppetite: updated });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-emerald-500';
      case 'medium': return 'bg-amber-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-surface-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risk Appetite</h3>
        <p className="text-gray-500 dark:text-surface-400 text-sm mb-4">
          Define your organization's risk appetite for each category. This determines acceptable risk levels 
          and influences treatment decisions.
        </p>
      </div>

      <div className="space-y-4">
        {appetite.map(item => (
          <div key={item.category} className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getLevelColor(item.level)}`} />
                <p className="text-gray-900 dark:text-white font-medium">{item.category}</p>
              </div>
              <select
                value={item.level}
                onChange={e => handleLevelChange(item.category, e.target.value)}
                className="px-3 py-1 bg-gray-50 dark:bg-surface-700 border border-gray-300 dark:border-surface-600 rounded-lg text-gray-900 dark:text-white text-sm"
              >
                <option value="low">Low Appetite</option>
                <option value="medium">Medium Appetite</option>
                <option value="high">High Appetite</option>
              </select>
            </div>
            <p className="text-gray-500 dark:text-surface-400 text-sm">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
        <h4 className="text-gray-900 dark:text-white font-medium mb-3">Appetite Legend</h4>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-surface-300 text-sm">Low - Minimal risk tolerance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-surface-300 text-sm">Medium - Moderate risk tolerance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-surface-300 text-sm">High - Aggressive risk tolerance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
