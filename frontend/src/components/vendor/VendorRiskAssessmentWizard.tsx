import { useState } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { vendorsApi } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface RiskAssessmentWizardProps {
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onComplete: (result: RiskAssessmentResult) => void;
}

interface RiskAssessmentResult {
  id: string;
  totalScore: number;
  riskLevel: 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction: string;
}

interface WizardState {
  title: string;
  description: string;
  assessor: string;
  assetDataType: number;
  assetRole: number;
  threatActor: number;
  threatObjective: number;
  likelihoodFrequency: number;
  likelihoodCapability: number;
  likelihoodControl: number;
  impactProductivity: number;
  impactResponse: number;
  impactRecovery: number;
  impactCompetitive: number;
  impactLegal: number;
  impactReputation: number;
}

// ============================================
// Option Constants
// ============================================

const ASSET_DATA_TYPE_OPTIONS = [
  { value: 25, label: 'Sensitive end-user, customer, or employee data', description: 'PII, PHI, payment data' },
  { value: 20, label: 'Sensitive business information', description: 'Source code, contracts, financials' },
  { value: 10, label: 'Internal productivity data', description: 'Policies, documentation, internal tools' },
  { value: 5, label: 'Public data', description: 'Marketing materials, public documentation' },
];

const ASSET_ROLE_OPTIONS = [
  { value: 25, label: 'Mission critical', description: 'Supports GA product uptime' },
  { value: 20, label: 'Business critical', description: 'Major disruption if unavailable' },
  { value: 10, label: 'Productivity enabling', description: 'Teams impacted if unavailable' },
  { value: 5, label: 'Limited impact', description: 'Alternatives available' },
  { value: 0, label: 'Negligible impact', description: 'Minimal business relevance' },
];

const THREAT_ACTOR_OPTIONS = [
  { value: 25, label: 'Nation State', description: 'Geopolitical motivations' },
  { value: 20, label: 'Cybercriminal/Organized Crime', description: 'Profit motivated' },
  { value: 15, label: 'Hacktivist', description: 'Ideological motivations' },
  { value: 10, label: 'Malicious Insider', description: 'Discontent/financial gain' },
  { value: 5, label: 'Script Kiddie', description: 'Trivial motivations' },
];

const THREAT_OBJECTIVE_OPTIONS = [
  { value: 25, label: 'Sabotage/Extortion', description: 'Ransomware, DDoS' },
  { value: 20, label: 'Data Theft', description: 'IP, customer data' },
  { value: 15, label: 'Fraud and Abuse', description: 'Account takeover' },
  { value: 10, label: 'Watering Hole', description: 'Using vendor to attack others' },
  { value: 5, label: 'Resource Hijacking', description: 'Cryptomining, etc.' },
];

const LIKELIHOOD_FREQUENCY_OPTIONS = [
  { value: 25, label: '>100 times per year', description: 'Very frequent attacks' },
  { value: 20, label: '10-100 times per year', description: 'Frequent attacks' },
  { value: 15, label: '1-10 times per year', description: 'Occasional attacks' },
  { value: 10, label: '0.1-1 times per year', description: 'Rare attacks' },
  { value: 5, label: '<0.1 times per year', description: 'Very rare attacks' },
];

const LIKELIHOOD_CAPABILITY_OPTIONS = [
  { value: 25, label: 'Default passwords/unpatched CVEs', description: 'Basic exploitation' },
  { value: 20, label: 'Basic scripting/known exploits', description: 'Script-level attacks' },
  { value: 15, label: 'Custom exploits/insider knowledge', description: 'Sophisticated attacks' },
  { value: 10, label: 'Zero-day exploits/nation-state tools', description: 'Advanced attacks' },
  { value: 5, label: 'Multiple zero-days/unprecedented', description: 'Extremely advanced' },
];

const LIKELIHOOD_CONTROL_OPTIONS = [
  { value: 25, label: 'No controls/known vulnerabilities', description: 'Unprotected' },
  { value: 20, label: 'Basic controls only', description: 'Firewall, antivirus' },
  { value: 15, label: 'Standard controls', description: 'Patching, MFA, logging' },
  { value: 10, label: 'Advanced controls', description: 'SIEM, segmentation, threat detection' },
  { value: 5, label: 'Comprehensive controls', description: 'Zero-trust, threat hunting' },
];

const IMPACT_OPTIONS = {
  productivity: [
    { value: 5, label: 'Unrecoverable failure / SEV 0' },
    { value: 4, label: 'Critical teams unable to work' },
    { value: 3, label: 'SEV 1 incident' },
    { value: 2, label: 'Minor project delays' },
    { value: 1, label: 'SEV 2 incident' },
    { value: 0, label: 'No impact' },
  ],
  response: [
    { value: 5, label: 'Major negligent data breach' },
    { value: 4, label: 'Public communications required' },
    { value: 3, label: 'Insurance claim / legal counsel' },
    { value: 2, label: 'Confirmed security incident' },
    { value: 1, label: 'System alerts only' },
    { value: 0, label: 'No response needed' },
  ],
  recovery: [
    { value: 5, label: 'Unrecoverable loss' },
    { value: 4, label: 'Major infrastructure rebuild' },
    { value: 3, label: 'Disaster recovery activation' },
    { value: 2, label: 'Data restoration from backups' },
    { value: 1, label: 'Quick rollback/minor fixes' },
    { value: 0, label: 'No recovery needed' },
  ],
  competitive: [
    { value: 5, label: 'Product roadmaps/trade secrets exposed' },
    { value: 4, label: 'R&D plans/M&A plans leaked' },
    { value: 2, label: 'Internal procedures exposed' },
    { value: 0, label: 'No competitive impact' },
  ],
  legal: [
    { value: 5, label: 'Criminal prosecution/regulatory shutdown' },
    { value: 4, label: 'Major regulatory fines' },
    { value: 3, label: 'SLA/contract penalties' },
    { value: 1, label: 'Minor contract penalties' },
    { value: 0, label: 'No legal impact' },
  ],
  reputation: [
    { value: 5, label: 'Loss of multiple key customers' },
    { value: 4, label: 'Single key customer loss' },
    { value: 3, label: 'Decreased sales/market share' },
    { value: 2, label: 'Negative media coverage' },
    { value: 0, label: 'No reputation impact' },
  ],
};

// ============================================
// Helper Components
// ============================================

function RadioOption({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: number;
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full text-left p-3 rounded-lg border transition-colors',
        selected
          ? 'border-brand-500 bg-brand-500/10'
          : 'border-surface-700 hover:border-surface-600 bg-surface-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0',
            selected ? 'border-brand-500 bg-brand-500' : 'border-surface-500'
          )}
        />
        <div>
          <p className={clsx('font-medium', selected ? 'text-surface-100' : 'text-surface-300')}>
            {label}
            <span className="ml-2 text-xs text-surface-500">({value} pts)</span>
          </p>
          {description && <p className="text-sm text-surface-500 mt-0.5">{description}</p>}
        </div>
      </div>
    </button>
  );
}

function ScoreIndicator({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const percentage = (score / maxScore) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-surface-400 w-20">{label}</span>
      <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all',
            percentage >= 80 ? 'bg-red-500' : percentage >= 60 ? 'bg-orange-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-surface-300 w-12 text-right">{score}/{maxScore}</span>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function VendorRiskAssessmentWizard({
  vendorId,
  vendorName,
  onClose,
  onComplete,
}: RiskAssessmentWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<WizardState>({
    title: `Risk Assessment - ${vendorName}`,
    description: '',
    assessor: '',
    assetDataType: 0,
    assetRole: 0,
    threatActor: 0,
    threatObjective: 0,
    likelihoodFrequency: 0,
    likelihoodCapability: 0,
    likelihoodControl: 0,
    impactProductivity: 0,
    impactResponse: 0,
    impactRecovery: 0,
    impactCompetitive: 0,
    impactLegal: 0,
    impactReputation: 0,
  });

  const steps = [
    { title: 'Scenario', description: 'Define the risk scenario' },
    { title: 'Asset', description: 'Asset criticality assessment' },
    { title: 'Threat', description: 'Threat actor & event assessment' },
    { title: 'Likelihood', description: 'Likelihood assessment' },
    { title: 'Impact', description: 'Impact assessment' },
    { title: 'Review', description: 'Review and submit' },
  ];

  // Calculate scores
  const assetScore = Math.max(state.assetDataType, state.assetRole);
  const threatScore = Math.max(state.threatActor, state.threatObjective);
  const likelihoodTotal = state.likelihoodFrequency + state.likelihoodCapability + state.likelihoodControl;
  const likelihoodScore = likelihoodTotal >= 60 ? 25 : likelihoodTotal >= 45 ? 20 : likelihoodTotal >= 30 ? 15 : likelihoodTotal >= 15 ? 10 : 5;
  const impactTotal = state.impactProductivity + state.impactResponse + state.impactRecovery + state.impactCompetitive + state.impactLegal + state.impactReputation;
  const impactScore = impactTotal >= 25 ? 25 : impactTotal >= 20 ? 20 : impactTotal >= 15 ? 15 : impactTotal >= 10 ? 10 : 5;
  const totalScore = assetScore + threatScore + likelihoodScore + impactScore;

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
  };

  const riskLevel = getRiskLevel(totalScore);

  const canProceed = () => {
    switch (step) {
      case 0:
        return state.title && state.assessor;
      case 1:
        return state.assetDataType > 0 || state.assetRole > 0;
      case 2:
        return state.threatActor > 0 || state.threatObjective > 0;
      case 3:
        return state.likelihoodFrequency > 0 && state.likelihoodCapability > 0 && state.likelihoodControl > 0;
      case 4:
        return true; // All impact fields have default of 0
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Use the vendorsApi which has proper auth headers via axios interceptors
      const response = await vendorsApi.submitRiskAssessment(vendorId, {
        title: state.title,
        description: state.description,
        assessor: state.assessor,
        assetScore,
        threatScore,
        likelihood: {
          frequency: state.likelihoodFrequency,
          capability: state.likelihoodCapability,
          controlStrength: state.likelihoodControl,
        },
        impact: {
          productivity: state.impactProductivity,
          response: state.impactResponse,
          recovery: state.impactRecovery,
          competitive: state.impactCompetitive,
          legal: state.impactLegal,
          reputation: state.impactReputation,
        },
      });

      onComplete(response.data);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Risk Title *</label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => setState({ ...state, title: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
              <textarea
                value={state.description}
                onChange={(e) => setState({ ...state, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                placeholder="Describe the risk scenario in 1-2 sentences..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Assessor Name *</label>
              <input
                type="text"
                value={state.assessor}
                onChange={(e) => setState({ ...state, assessor: e.target.value })}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-surface-200 mb-3">What type of data does this vendor process?</h4>
              <div className="space-y-2">
                {ASSET_DATA_TYPE_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.assetDataType === opt.value}
                    onSelect={() => setState({ ...state, assetDataType: opt.value })}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-surface-200 mb-3">What is the vendor's role in your infrastructure?</h4>
              <div className="space-y-2">
                {ASSET_ROLE_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.assetRole === opt.value}
                    onSelect={() => setState({ ...state, assetRole: opt.value })}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-surface-200 mb-3">Who is the most likely threat actor?</h4>
              <div className="space-y-2">
                {THREAT_ACTOR_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.threatActor === opt.value}
                    onSelect={() => setState({ ...state, threatActor: opt.value })}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-surface-200 mb-3">What is the primary threat objective?</h4>
              <div className="space-y-2">
                {THREAT_OBJECTIVE_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.threatObjective === opt.value}
                    onSelect={() => setState({ ...state, threatObjective: opt.value })}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-surface-200 mb-3">Threat Event Frequency</h4>
              <div className="space-y-2">
                {LIKELIHOOD_FREQUENCY_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.likelihoodFrequency === opt.value}
                    onSelect={() => setState({ ...state, likelihoodFrequency: opt.value })}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-surface-200 mb-3">Threat Actor Capability</h4>
              <div className="space-y-2">
                {LIKELIHOOD_CAPABILITY_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.likelihoodCapability === opt.value}
                    onSelect={() => setState({ ...state, likelihoodCapability: opt.value })}
                  />
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-surface-200 mb-3">Control Strength</h4>
              <div className="space-y-2">
                {LIKELIHOOD_CONTROL_OPTIONS.map((opt) => (
                  <RadioOption
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={state.likelihoodControl === opt.value}
                    onSelect={() => setState({ ...state, likelihoodControl: opt.value })}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {Object.entries(IMPACT_OPTIONS).map(([key, options]) => (
              <div key={key}>
                <h4 className="font-medium text-surface-200 mb-2 capitalize">{key} Impact</h4>
                <select
                  value={state[`impact${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof WizardState]}
                  onChange={(e) => setState({ ...state, [`impact${key.charAt(0).toUpperCase() + key.slice(1)}`]: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-surface-100 focus:outline-none focus:border-brand-500"
                >
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.value} pts)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className={clsx(
              'p-6 rounded-lg border text-center',
              riskLevel === 'Critical' ? 'bg-red-500/10 border-red-500/30' :
              riskLevel === 'High' ? 'bg-orange-500/10 border-orange-500/30' :
              riskLevel === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-green-500/10 border-green-500/30'
            )}>
              <div className="text-5xl font-bold mb-2">{totalScore}</div>
              <div className={clsx(
                'text-xl font-semibold',
                riskLevel === 'Critical' ? 'text-red-400' :
                riskLevel === 'High' ? 'text-orange-400' :
                riskLevel === 'Medium' ? 'text-yellow-400' :
                'text-green-400'
              )}>
                {riskLevel} Risk
              </div>
            </div>

            <div className="space-y-2">
              <ScoreIndicator score={assetScore} maxScore={25} label="Asset" />
              <ScoreIndicator score={threatScore} maxScore={25} label="Threat" />
              <ScoreIndicator score={likelihoodScore} maxScore={25} label="Likelihood" />
              <ScoreIndicator score={impactScore} maxScore={25} label="Impact" />
            </div>

            <div className="p-4 bg-surface-800/50 rounded-lg">
              <h4 className="font-medium text-surface-200 mb-2">Recommended Action</h4>
              <p className="text-surface-400">
                {riskLevel === 'Critical' ? 'Immediate action required - escalate to leadership' :
                 riskLevel === 'High' ? 'Develop mitigation plan within 30 days' :
                 riskLevel === 'Medium' ? 'Address within quarterly planning' :
                 riskLevel === 'Low' ? 'Monitor and address as resources allow' :
                 'Accept or monitor only'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-900 border border-surface-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <ShieldExclamationIcon className="w-6 h-6 text-brand-400" />
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Vendor Risk Assessment</h2>
              <p className="text-sm text-surface-400">{vendorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 border-b border-surface-800 bg-surface-800/30">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    i < step ? 'bg-brand-500 text-white' :
                    i === step ? 'bg-brand-500/20 text-brand-400 border border-brand-500' :
                    'bg-surface-800 text-surface-500'
                  )}
                >
                  {i < step ? <CheckCircleIcon className="w-5 h-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={clsx(
                    'w-8 h-0.5 mx-1',
                    i < step ? 'bg-brand-500' : 'bg-surface-700'
                  )} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-surface-400 mt-2">{steps[step].description}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-surface-800">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
          >
            Previous
          </Button>

          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              rightIcon={<ChevronRightIcon className="w-4 h-4" />}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
              leftIcon={<CheckCircleIcon className="w-4 h-4" />}
            >
              Submit Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
