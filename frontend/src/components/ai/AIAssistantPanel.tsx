import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import {
  SparklesIcon,
  XMarkIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AIFeature =
  | 'risk-scoring'
  | 'categorization'
  | 'mapping'
  | 'policy'
  | 'gap-analysis'
  | 'settings';

const AI_FEATURES = [
  {
    id: 'risk-scoring' as AIFeature,
    name: 'Risk Scoring',
    description: 'Get AI suggestions for risk likelihood and impact',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
  },
  {
    id: 'categorization' as AIFeature,
    name: 'Auto-Categorization',
    description: 'Automatically categorize controls, risks, and policies',
    icon: ClipboardDocumentCheckIcon,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
  },
  {
    id: 'mapping' as AIFeature,
    name: 'Control Mapping',
    description: 'Suggest framework mappings for controls',
    icon: ShieldCheckIcon,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
  },
  {
    id: 'policy' as AIFeature,
    name: 'Policy Generation',
    description: 'Generate compliant policy drafts',
    icon: DocumentTextIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 'gap-analysis' as AIFeature,
    name: 'Gap Analysis',
    description: 'Analyze compliance gaps across frameworks',
    icon: ClipboardDocumentCheckIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
  },
];

export default function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);

  const { data: aiStatus, isLoading } = useQuery({
    queryKey: ['ai-status'],
    queryFn: () => aiApi.getStatus(),
    enabled: isOpen,
  });

  // Check if AI is available (either real provider or mock mode)
  const isConfigured = aiStatus?.data?.available ?? false;
  const config = aiStatus?.data?.config;
  const isMockMode = aiStatus?.data?.isMockMode ?? false;
  const mockModeReason = aiStatus?.data?.mockModeReason;

  // AI is usable if configured OR in mock mode
  const isUsable = isConfigured || isMockMode;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-surface-200 shadow-2xl z-50 flex flex-col dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-surface-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">AI Assistant</h2>
            <p className="text-xs text-surface-600">
              {isConfigured ? 'Ready to help' : 'Not configured'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-surface-600 hover:text-white rounded-lg hover:bg-white transition-colors dark:bg-surface-900 dark:hover:bg-surface-800"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Status Banner */}
      {!isLoading && (
        <div
          className={clsx(
            'mx-4 mt-4 p-3 rounded-lg flex items-center gap-3',
            isMockMode
              ? 'bg-amber-500/10 border border-amber-500/30'
              : isConfigured
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-yellow-500/10 border border-yellow-500/30'
          )}
        >
          {isMockMode ? (
            <>
              <BeakerIcon className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600">Demo Mode</p>
                <p className="text-xs text-surface-600">
                  Using template-based responses for testing
                </p>
              </div>
            </>
          ) : isConfigured ? (
            <>
              <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-600">AI Enabled</p>
                <p className="text-xs text-surface-600">
                  Using {config?.provider} ({config?.model})
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircleIcon className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-600">AI Not Configured</p>
                <p className="text-xs text-surface-600">Set OPENAI_API_KEY or ANTHROPIC_API_KEY</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mock Mode Info Banner */}
      {isMockMode && (
        <div className="mx-4 mt-2 p-2 rounded-lg bg-white/50 border border-surface-200 dark:bg-surface-900/50">
          <p className="text-xs text-surface-600">
            <span className="text-amber-600 font-medium">Demo Mode:</span> AI responses are
            generated from policy templates. Perfect for testing and demonstrations. Add an API key
            to enable full AI capabilities.
          </p>
        </div>
      )}

      {/* Feature List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {AI_FEATURES.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setSelectedFeature(feature.id)}
              disabled={!isUsable}
              className={clsx(
                'w-full p-4 rounded-xl border transition-all text-left group',
                isUsable
                  ? 'border-surface-200 hover:border-purple-500/50 hover:bg-white/50 dark:bg-surface-900/50 dark:hover:bg-surface-800/50'
                  : 'border-surface-200 opacity-50 cursor-not-allowed',
                selectedFeature === feature.id && 'border-purple-500 bg-purple-500/10'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', feature.bgColor)}>
                  <feature.icon className={clsx('w-5 h-5', feature.color)} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{feature.name}</h3>
                  <p className="text-xs text-surface-600">{feature.description}</p>
                </div>
                <ChevronRightIcon
                  className={clsx(
                    'w-5 h-5 text-surface-500 transition-transform',
                    selectedFeature === feature.id && 'rotate-90'
                  )}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Settings Link */}
        <button
          onClick={() => setSelectedFeature('settings')}
          className="w-full mt-4 p-3 flex items-center gap-3 text-surface-600 hover:text-white transition-colors"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          <span className="text-sm">AI Settings</span>
        </button>
      </div>

      {/* Feature Detail Panel */}
      {selectedFeature && isUsable && (
        <div className="border-t border-surface-200 p-4 max-h-[40%] overflow-y-auto">
          {selectedFeature === 'risk-scoring' && <RiskScoringPanel isMockMode={isMockMode} />}
          {selectedFeature === 'categorization' && <CategorizationPanel isMockMode={isMockMode} />}
          {selectedFeature === 'mapping' && <MappingPanel isMockMode={isMockMode} />}
          {selectedFeature === 'policy' && <PolicyPanel isMockMode={isMockMode} />}
          {selectedFeature === 'gap-analysis' && <GapAnalysisPanel isMockMode={isMockMode} />}
          {selectedFeature === 'settings' && (
            <SettingsPanel
              config={config}
              isMockMode={isMockMode}
              mockModeReason={mockModeReason}
            />
          )}
        </div>
      )}

      {/* Quick Tip */}
      <div className="p-4 border-t border-surface-200 bg-white/50 dark:bg-surface-900/50">
        <p className="text-xs text-surface-600">
          <span className="text-purple-600 font-medium">Tip:</span> AI features are also available
          directly in forms. Look for the{' '}
          <SparklesIcon className="w-3 h-3 inline text-purple-600" /> icon.
        </p>
      </div>
    </div>
  );
}

// Feature Panels
interface FeaturePanelProps {
  isMockMode?: boolean;
}

function MockModeBadge() {
  return (
    <Badge variant="warning" className="inline-flex items-center gap-1">
      <BeakerIcon className="w-3 h-3" />
      Demo Mode
    </Badge>
  );
}

function RiskScoringPanel({ isMockMode }: FeaturePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">AI Risk Scoring</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <p className="text-sm text-surface-600">
        Navigate to a risk and click "AI Score" to get intelligent suggestions for likelihood and
        impact based on the risk description.
      </p>
      <div className="text-xs text-surface-500">
        The AI considers:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Industry benchmarks</li>
          <li>Existing controls</li>
          <li>Asset criticality</li>
          <li>Historical patterns</li>
        </ul>
      </div>
      {isMockMode && (
        <p className="text-xs text-amber-600/70 italic">
          In demo mode, scores are generated based on keyword analysis.
        </p>
      )}
    </div>
  );
}

function CategorizationPanel({ isMockMode }: FeaturePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Auto-Categorization</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <p className="text-sm text-surface-600">
        When creating controls, risks, or policies, the AI can suggest appropriate categories based
        on the content.
      </p>
      <div className="text-xs text-surface-500">
        Works with:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Controls</li>
          <li>Risks</li>
          <li>Policies</li>
          <li>Evidence</li>
        </ul>
      </div>
    </div>
  );
}

function MappingPanel({ isMockMode }: FeaturePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Control Mapping Suggestions</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <p className="text-sm text-surface-600">
        Get intelligent suggestions for mapping controls to framework requirements across SOC 2, ISO
        27001, NIST, and more.
      </p>
    </div>
  );
}

function PolicyPanel({ isMockMode }: FeaturePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Policy Draft Generation</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <p className="text-sm text-surface-600">
        Generate professional policy drafts tailored to your industry and compliance requirements.
      </p>
      <div className="text-xs text-surface-500">
        Supported policies:
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Information Security Policy</li>
          <li>Acceptable Use Policy</li>
          <li>Data Protection Policy</li>
          <li>Incident Response Policy</li>
          <li>Business Continuity Policy</li>
          <li>Vendor Management Policy</li>
          <li>Risk Management Policy</li>
          <li>Change Management Policy</li>
          <li>Password/Authentication Policy</li>
          <li>Access Control Policy</li>
        </ul>
      </div>
      {isMockMode && (
        <p className="text-xs text-amber-600/70 italic">
          Demo mode uses comprehensive policy templates with framework mappings.
        </p>
      )}
    </div>
  );
}

function GapAnalysisPanel({ isMockMode }: FeaturePanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">Compliance Gap Analysis</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <p className="text-sm text-surface-600">
        Analyze your existing controls against framework requirements to identify compliance gaps.
      </p>
    </div>
  );
}

interface SettingsPanelProps {
  config?: { provider: string; model: string };
  isMockMode?: boolean;
  mockModeReason?: string;
}

function SettingsPanel({ config, isMockMode, mockModeReason }: SettingsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white">AI Configuration</h4>
        {isMockMode && <MockModeBadge />}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-surface-600">Provider</span>
          <span className="text-white">
            {isMockMode ? 'Mock (Demo)' : config?.provider || 'Not set'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-surface-600">Model</span>
          <span className="text-white">
            {isMockMode ? 'Template-based' : config?.model || 'Not set'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-surface-600">Status</span>
          <span className={isMockMode ? 'text-amber-600' : 'text-emerald-600'}>
            {isMockMode ? 'Demo Mode' : 'Production'}
          </span>
        </div>
      </div>

      {isMockMode && mockModeReason && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600/80">
          {mockModeReason}
        </div>
      )}

      <p className="text-xs text-surface-500 mt-2">
        To enable full AI capabilities, set environment variables:
        <code className="block mt-1 p-2 bg-white rounded text-surface-700 dark:bg-surface-900">
          OPENAI_API_KEY=sk-...
        </code>
        <code className="block mt-1 p-2 bg-white rounded text-surface-700 dark:bg-surface-900">
          ANTHROPIC_API_KEY=sk-ant-...
        </code>
      </p>
    </div>
  );
}
