import { useState } from 'react';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LinkIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface BIAWizardProps {
  onClose: () => void;
  onComplete: (processId: string) => void;
  existingAssets?: { id: string; name: string }[];
  existingProcesses?: { id: string; name: string }[];
  users?: { id: string; name: string }[];
}

interface WizardState {
  // Step 1: Process Identification
  name: string;
  description: string;
  department: string;
  ownerId: string;
  
  // Step 2: Impact Assessment
  financialImpact: string;
  operationalImpact: string;
  reputationalImpact: string;
  legalImpact: string;
  
  // Step 3: Recovery Requirements
  maxDowntimeHours: number | null;
  maxDataLossHours: number | null;
  
  // Step 4: Dependencies
  upstreamProcessIds: string[];
  assetIds: string[];
  
  // Step 5: Additional Info
  peakPeriods: string[];
  keyStakeholders: string;
}

// ============================================
// Option Constants
// ============================================

const IMPACT_OPTIONS = [
  { value: 'none', label: 'None', description: 'No measurable impact', color: 'bg-gray-500' },
  { value: 'minor', label: 'Minor', description: 'Minimal disruption, easily absorbed', color: 'bg-green-500' },
  { value: 'moderate', label: 'Moderate', description: 'Noticeable impact, manageable', color: 'bg-yellow-500' },
  { value: 'major', label: 'Major', description: 'Significant impact, requires attention', color: 'bg-orange-500' },
  { value: 'severe', label: 'Severe', description: 'Critical impact, immediate action needed', color: 'bg-red-500' },
];

const FINANCIAL_IMPACT_DESCRIPTIONS: Record<string, string> = {
  'none': 'No financial impact expected',
  'minor': 'Less than $10,000 impact',
  'moderate': '$10,000 - $100,000 impact',
  'major': '$100,000 - $1,000,000 impact',
  'severe': 'Over $1,000,000 impact',
};

const RTO_OPTIONS = [
  { value: 1, label: '1 hour', description: 'Mission critical - must be restored immediately' },
  { value: 4, label: '4 hours', description: 'Critical - same business day' },
  { value: 24, label: '24 hours', description: 'Essential - next business day' },
  { value: 72, label: '72 hours', description: 'Important - within 3 days' },
  { value: 168, label: '1 week', description: 'Standard - within a week' },
];

const RPO_OPTIONS = [
  { value: 0, label: 'Zero data loss', description: 'Real-time replication required' },
  { value: 1, label: '1 hour', description: 'Minimal data loss acceptable' },
  { value: 4, label: '4 hours', description: 'Some data loss acceptable' },
  { value: 24, label: '24 hours', description: 'Daily backup acceptable' },
  { value: 168, label: '1 week', description: 'Weekly backup acceptable' },
];

const PEAK_PERIOD_OPTIONS = [
  'End of Quarter',
  'End of Year',
  'Month End',
  'Payroll Days',
  'Holiday Season',
  'Product Launch',
  'Audit Periods',
];

const STEPS = [
  { id: 1, name: 'Process Identification', icon: ClipboardDocumentListIcon },
  { id: 2, name: 'Impact Assessment', icon: ExclamationTriangleIcon },
  { id: 3, name: 'Recovery Requirements', icon: ClockIcon },
  { id: 4, name: 'Dependencies', icon: LinkIcon },
  { id: 5, name: 'Review & Submit', icon: DocumentCheckIcon },
];

// ============================================
// BIA Wizard Component
// ============================================

export function BIAWizard({
  onClose,
  onComplete,
  existingAssets = [],
  existingProcesses = [],
  users = [],
}: BIAWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [state, setState] = useState<WizardState>({
    name: '',
    description: '',
    department: '',
    ownerId: '',
    financialImpact: '',
    operationalImpact: '',
    reputationalImpact: '',
    legalImpact: '',
    maxDowntimeHours: null,
    maxDataLossHours: null,
    upstreamProcessIds: [],
    assetIds: [],
    peakPeriods: [],
    keyStakeholders: '',
  });

  const updateState = (field: keyof WizardState, value: any) => {
    setState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!state.name.trim()) newErrors.name = 'Process name is required';
        if (!state.department.trim()) newErrors.department = 'Department is required';
        break;
      case 2:
        if (!state.financialImpact) newErrors.financialImpact = 'Financial impact is required';
        if (!state.operationalImpact) newErrors.operationalImpact = 'Operational impact is required';
        if (!state.reputationalImpact) newErrors.reputationalImpact = 'Reputational impact is required';
        if (!state.legalImpact) newErrors.legalImpact = 'Legal/regulatory impact is required';
        break;
      case 3:
        if (!state.maxDowntimeHours) newErrors.maxDowntimeHours = 'Recovery time objective is required';
        if (state.maxDataLossHours === null) newErrors.maxDataLossHours = 'Recovery point objective is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/bcdr/processes/wizard', {
        name: state.name,
        description: state.description,
        department: state.department,
        ownerId: state.ownerId || undefined,
        financialImpact: state.financialImpact,
        operationalImpact: state.operationalImpact,
        reputationalImpact: state.reputationalImpact,
        legalImpact: state.legalImpact,
        maxDowntimeHours: state.maxDowntimeHours,
        maxDataLossHours: state.maxDataLossHours,
        upstreamProcessIds: state.upstreamProcessIds,
        assetIds: state.assetIds,
        peakPeriods: state.peakPeriods,
        keyStakeholders: state.keyStakeholders,
      });
      onComplete(response.data.id);
    } catch (error) {
      console.error('Failed to create process:', error);
      setErrors({ submit: 'Failed to create process. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCriticalityPreview = (): { tier: string; color: string } => {
    const impacts = [state.financialImpact, state.operationalImpact, state.reputationalImpact, state.legalImpact];
    const hasSevere = impacts.includes('severe');
    const hasMajor = impacts.includes('major');

    if (hasSevere || (state.maxDowntimeHours && state.maxDowntimeHours <= 4)) {
      return { tier: 'Tier 1 - Critical', color: 'text-red-400' };
    } else if (hasMajor || (state.maxDowntimeHours && state.maxDowntimeHours <= 24)) {
      return { tier: 'Tier 2 - Essential', color: 'text-orange-400' };
    } else if (state.maxDowntimeHours && state.maxDowntimeHours <= 72) {
      return { tier: 'Tier 3 - Important', color: 'text-yellow-400' };
    }
    return { tier: 'Tier 4 - Standard', color: 'text-green-400' };
  };

  // ============================================
  // Render Functions
  // ============================================

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Process Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => updateState('name', e.target.value)}
          className={clsx(
            'w-full px-3 py-2 bg-slate-700 border rounded-lg text-white',
            errors.name ? 'border-red-500' : 'border-slate-600'
          )}
          placeholder="e.g., Customer Order Processing"
        />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
        <textarea
          value={state.description}
          onChange={(e) => updateState('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="Brief description of the business process..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Department <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={state.department}
          onChange={(e) => updateState('department', e.target.value)}
          className={clsx(
            'w-full px-3 py-2 bg-slate-700 border rounded-lg text-white',
            errors.department ? 'border-red-500' : 'border-slate-600'
          )}
          placeholder="e.g., Sales, IT, Finance"
        />
        {errors.department && <p className="mt-1 text-sm text-red-400">{errors.department}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Process Owner</label>
        <select
          value={state.ownerId}
          onChange={(e) => updateState('ownerId', e.target.value)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
        >
          <option value="">Select owner...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderImpactSelector = (
    label: string,
    field: keyof WizardState,
    descriptions?: Record<string, string>
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-5 gap-2">
        {IMPACT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => updateState(field, option.value)}
            className={clsx(
              'p-3 rounded-lg border-2 text-center transition-all',
              state[field] === option.value
                ? 'border-cyan-500 bg-cyan-500/20'
                : 'border-slate-600 bg-slate-700 hover:border-slate-500'
            )}
          >
            <div className={clsx('w-3 h-3 rounded-full mx-auto mb-2', option.color)} />
            <span className="text-sm font-medium text-white">{option.label}</span>
          </button>
        ))}
      </div>
      {state[field] && descriptions && (
        <p className="mt-2 text-sm text-slate-400">{descriptions[state[field] as string]}</p>
      )}
      {errors[field] && <p className="mt-1 text-sm text-red-400">{errors[field]}</p>}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Assess the impact if this process was unavailable. Select the highest expected impact for each category.
      </p>

      {renderImpactSelector('Financial Impact', 'financialImpact', FINANCIAL_IMPACT_DESCRIPTIONS)}
      {renderImpactSelector('Operational Impact', 'operationalImpact')}
      {renderImpactSelector('Reputational Impact', 'reputationalImpact')}
      {renderImpactSelector('Legal/Regulatory Impact', 'legalImpact')}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Recovery Time Objective (RTO) <span className="text-red-400">*</span>
        </label>
        <p className="text-sm text-slate-400 mb-4">
          How long can this process be unavailable before it causes unacceptable impact?
        </p>
        <div className="space-y-2">
          {RTO_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateState('maxDowntimeHours', option.value)}
              className={clsx(
                'w-full p-4 rounded-lg border-2 text-left transition-all flex justify-between items-center',
                state.maxDowntimeHours === option.value
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              )}
            >
              <div>
                <span className="text-white font-medium">{option.label}</span>
                <p className="text-sm text-slate-400">{option.description}</p>
              </div>
              {state.maxDowntimeHours === option.value && (
                <CheckCircleIcon className="h-5 w-5 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
        {errors.maxDowntimeHours && (
          <p className="mt-1 text-sm text-red-400">{errors.maxDowntimeHours}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Recovery Point Objective (RPO) <span className="text-red-400">*</span>
        </label>
        <p className="text-sm text-slate-400 mb-4">
          How much data loss is acceptable? This determines backup frequency.
        </p>
        <div className="space-y-2">
          {RPO_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateState('maxDataLossHours', option.value)}
              className={clsx(
                'w-full p-4 rounded-lg border-2 text-left transition-all flex justify-between items-center',
                state.maxDataLossHours === option.value
                  ? 'border-cyan-500 bg-cyan-500/20'
                  : 'border-slate-600 bg-slate-700 hover:border-slate-500'
              )}
            >
              <div>
                <span className="text-white font-medium">{option.label}</span>
                <p className="text-sm text-slate-400">{option.description}</p>
              </div>
              {state.maxDataLossHours === option.value && (
                <CheckCircleIcon className="h-5 w-5 text-cyan-400" />
              )}
            </button>
          ))}
        </div>
        {errors.maxDataLossHours && (
          <p className="mt-1 text-sm text-red-400">{errors.maxDataLossHours}</p>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Upstream Process Dependencies
        </label>
        <p className="text-sm text-slate-400 mb-4">
          Which other processes must be operational for this process to function?
        </p>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {existingProcesses.map((process) => (
            <label
              key={process.id}
              className="flex items-center p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600"
            >
              <input
                type="checkbox"
                checked={state.upstreamProcessIds.includes(process.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateState('upstreamProcessIds', [...state.upstreamProcessIds, process.id]);
                  } else {
                    updateState(
                      'upstreamProcessIds',
                      state.upstreamProcessIds.filter((id) => id !== process.id)
                    );
                  }
                }}
                className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-cyan-500"
              />
              <span className="ml-3 text-white">{process.name}</span>
            </label>
          ))}
          {existingProcesses.length === 0 && (
            <p className="text-slate-400 text-sm">No other processes available</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Critical Assets
        </label>
        <p className="text-sm text-slate-400 mb-4">
          Which IT assets/systems are required for this process?
        </p>
        <div className="max-h-48 overflow-y-auto space-y-2">
          {existingAssets.map((asset) => (
            <label
              key={asset.id}
              className="flex items-center p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600"
            >
              <input
                type="checkbox"
                checked={state.assetIds.includes(asset.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateState('assetIds', [...state.assetIds, asset.id]);
                  } else {
                    updateState(
                      'assetIds',
                      state.assetIds.filter((id) => id !== asset.id)
                    );
                  }
                }}
                className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-cyan-500"
              />
              <span className="ml-3 text-white">{asset.name}</span>
            </label>
          ))}
          {existingAssets.length === 0 && (
            <p className="text-slate-400 text-sm">No assets available</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Peak Periods</label>
        <p className="text-sm text-slate-400 mb-4">
          When is this process most critical?
        </p>
        <div className="flex flex-wrap gap-2">
          {PEAK_PERIOD_OPTIONS.map((period) => (
            <button
              key={period}
              onClick={() => {
                if (state.peakPeriods.includes(period)) {
                  updateState(
                    'peakPeriods',
                    state.peakPeriods.filter((p) => p !== period)
                  );
                } else {
                  updateState('peakPeriods', [...state.peakPeriods, period]);
                }
              }}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm transition-all',
                state.peakPeriods.includes(period)
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Key Stakeholders
        </label>
        <textarea
          value={state.keyStakeholders}
          onChange={(e) => updateState('keyStakeholders', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          placeholder="List key stakeholders who should be notified during incidents..."
        />
      </div>
    </div>
  );

  const renderStep5 = () => {
    const criticality = getCriticalityPreview();

    return (
      <div className="space-y-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-4">Process Summary</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Name:</span>
              <p className="text-white font-medium">{state.name}</p>
            </div>
            <div>
              <span className="text-slate-400">Department:</span>
              <p className="text-white font-medium">{state.department}</p>
            </div>
            <div>
              <span className="text-slate-400">RTO:</span>
              <p className="text-white font-medium">{state.maxDowntimeHours} hours</p>
            </div>
            <div>
              <span className="text-slate-400">RPO:</span>
              <p className="text-white font-medium">{state.maxDataLossHours} hours</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-600">
            <span className="text-slate-400">Calculated Criticality:</span>
            <p className={clsx('text-lg font-bold', criticality.color)}>{criticality.tier}</p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <h4 className="text-lg font-medium text-white mb-4">Impact Assessment</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Financial', value: state.financialImpact },
              { label: 'Operational', value: state.operationalImpact },
              { label: 'Reputational', value: state.reputationalImpact },
              { label: 'Legal/Regulatory', value: state.legalImpact },
            ].map((item) => {
              const option = IMPACT_OPTIONS.find((o) => o.value === item.value);
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={clsx('w-3 h-3 rounded-full', option?.color || 'bg-gray-500')} />
                  <span className="text-slate-400">{item.label}:</span>
                  <span className="text-white capitalize">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {(state.upstreamProcessIds.length > 0 || state.assetIds.length > 0) && (
          <div className="bg-slate-700 rounded-lg p-4">
            <h4 className="text-lg font-medium text-white mb-4">Dependencies</h4>
            <div className="text-sm">
              {state.upstreamProcessIds.length > 0 && (
                <div className="mb-2">
                  <span className="text-slate-400">Processes:</span>
                  <span className="text-white ml-2">
                    {state.upstreamProcessIds.length} linked
                  </span>
                </div>
              )}
              {state.assetIds.length > 0 && (
                <div>
                  <span className="text-slate-400">Assets:</span>
                  <span className="text-white ml-2">{state.assetIds.length} linked</span>
                </div>
              )}
            </div>
          </div>
        )}

        {errors.submit && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">{errors.submit}</p>
          </div>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Business Impact Analysis Wizard</h2>
              <p className="text-sm text-slate-400">Step {currentStep} of 5</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={clsx(
                      'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                      isCompleted
                        ? 'bg-cyan-500 border-cyan-500'
                        : isCurrent
                        ? 'border-cyan-500 bg-cyan-500/20'
                        : 'border-slate-600 bg-slate-700'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="h-5 w-5 text-white" />
                    ) : (
                      <StepIcon
                        className={clsx(
                          'h-5 w-5',
                          isCurrent ? 'text-cyan-400' : 'text-slate-400'
                        )}
                      />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={clsx(
                        'w-16 h-0.5 mx-2',
                        isCompleted ? 'bg-cyan-500' : 'bg-slate-600'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <span className="text-sm font-medium text-white">
              {STEPS[currentStep - 1].name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">{renderCurrentStep()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <Button
            variant="secondary"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isSubmitting}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep < 5 ? (
            <Button variant="primary" onClick={handleNext}>
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Process'}
              <CheckCircleIcon className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
