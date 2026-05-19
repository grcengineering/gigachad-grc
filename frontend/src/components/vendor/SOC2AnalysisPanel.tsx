import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { vendorsApi, SOC2AnalysisResult, SOC2Exception, CUEC, ControlGap } from '@/lib/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface SOC2AnalysisPanelProps {
  vendorId: string;
  documentId: string;
  documentTitle: string;
  previousAnalysis?: SOC2AnalysisResult | null;
  onAnalysisComplete?: (analysis: SOC2AnalysisResult) => void;
  onCreateAssessment?: (analysis: SOC2AnalysisResult) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-500/20 text-green-600 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-600 border-red-500/30',
};

const RISK_SCORE_COLORS: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
};

export function SOC2AnalysisPanel({
  vendorId,
  documentId,
  documentTitle: _documentTitle,
  previousAnalysis,
  onAnalysisComplete,
  onCreateAssessment,
}: SOC2AnalysisPanelProps) {
  const queryClient = useQueryClient();
  const [analysis, setAnalysis] = useState<SOC2AnalysisResult | null>(previousAnalysis || null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    exceptions: true,
    cuecs: false,
    gaps: false,
    subservices: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => vendorsApi.analyzeDocument(vendorId, documentId),
    onSuccess: (response) => {
      setAnalysis(response.data);
      toast.success('SOC 2 analysis completed');
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      onAnalysisComplete?.(response.data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to analyze document');
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!analysis) {
    return (
      <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="font-semibold text-surface-100">AI-Powered SOC 2 Analysis</h3>
            <p className="text-sm text-surface-600">
              Analyze this SOC 2 report to extract exceptions, CUECs, and findings
            </p>
          </div>
        </div>

        <div className="bg-surface-900/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-surface-700 mb-3">AI analysis will extract:</p>
          <ul className="text-sm text-surface-600 space-y-2">
            <li className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
              Exceptions and control deviations
            </li>
            <li className="flex items-center gap-2">
              <ShieldExclamationIcon className="w-4 h-4 text-yellow-600" />
              Complementary User Entity Controls (CUECs)
            </li>
            <li className="flex items-center gap-2">
              <BuildingOffice2Icon className="w-4 h-4 text-blue-600" />
              Subservice organizations
            </li>
            <li className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-purple-600" />
              Control gaps and recommendations
            </li>
          </ul>
        </div>

        <button
          onClick={() => analyzeMutation.mutate()}
          disabled={analyzeMutation.isPending}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {analyzeMutation.isPending ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              Analyze with AI
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Analysis Header */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-100">AI Analysis Results</h3>
              <p className="text-xs text-surface-600">
                Analyzed: {new Date(analysis.analyzedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-600">Confidence: {analysis.confidence}%</span>
            <button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="btn btn-ghost btn-sm"
              title="Re-analyze"
            >
              <ArrowPathIcon
                className={clsx('w-4 h-4', analyzeMutation.isPending && 'animate-spin')}
              />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-surface-900/50 rounded-lg">
          <p className="text-sm text-surface-700">{analysis.summary}</p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="text-center p-2 bg-surface-900/50 rounded-lg">
            <p
              className={clsx('text-xl font-bold', RISK_SCORE_COLORS[analysis.suggestedRiskScore])}
            >
              {analysis.suggestedRiskScore.charAt(0).toUpperCase() +
                analysis.suggestedRiskScore.slice(1)}
            </p>
            <p className="text-xs text-surface-600">Risk Score</p>
          </div>
          <div className="text-center p-2 bg-surface-900/50 rounded-lg">
            <p
              className={clsx(
                'text-xl font-bold',
                analysis.exceptions.length === 0 ? 'text-green-600' : 'text-orange-600'
              )}
            >
              {analysis.exceptions.length}
            </p>
            <p className="text-xs text-surface-600">Exceptions</p>
          </div>
          <div className="text-center p-2 bg-surface-900/50 rounded-lg">
            <p className="text-xl font-bold text-yellow-600">{analysis.cuecs.length}</p>
            <p className="text-xs text-surface-600">CUECs</p>
          </div>
          <div className="text-center p-2 bg-surface-900/50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">{analysis.controlGaps.length}</p>
            <p className="text-xs text-surface-600">Gaps</p>
          </div>
        </div>

        {/* Report Info */}
        {(analysis.reportPeriod || analysis.auditor || analysis.opinionType) && (
          <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
            {analysis.reportPeriod && (
              <div>
                <p className="text-surface-600 text-xs">Report Period</p>
                <p className="text-surface-200">
                  {analysis.reportPeriod.startDate} to {analysis.reportPeriod.endDate}
                </p>
              </div>
            )}
            {analysis.auditor && (
              <div>
                <p className="text-surface-600 text-xs">Auditor</p>
                <p className="text-surface-200">{analysis.auditor}</p>
              </div>
            )}
            {analysis.opinionType && (
              <div>
                <p className="text-surface-600 text-xs">Opinion</p>
                <p
                  className={clsx(
                    'font-medium',
                    analysis.opinionType.toLowerCase() === 'unqualified'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  )}
                >
                  {analysis.opinionType}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exceptions Section */}
      <CollapsibleSection
        title="Exceptions"
        count={analysis.exceptions.length}
        icon={ExclamationTriangleIcon}
        iconColor="text-orange-600"
        expanded={expandedSections.exceptions}
        onToggle={() => toggleSection('exceptions')}
      >
        {analysis.exceptions.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 py-2">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm">No exceptions found</span>
          </div>
        ) : (
          <div className="space-y-3">
            {analysis.exceptions.map((exception, idx) => (
              <ExceptionCard key={idx} exception={exception} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* CUECs Section */}
      <CollapsibleSection
        title="Complementary User Entity Controls"
        count={analysis.cuecs.length}
        icon={ShieldExclamationIcon}
        iconColor="text-yellow-600"
        expanded={expandedSections.cuecs}
        onToggle={() => toggleSection('cuecs')}
      >
        {analysis.cuecs.length === 0 ? (
          <p className="text-sm text-surface-600 py-2">No CUECs identified</p>
        ) : (
          <div className="space-y-2">
            {analysis.cuecs.map((cuec, idx) => (
              <CUECCard key={idx} cuec={cuec} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Control Gaps Section */}
      <CollapsibleSection
        title="Control Gaps"
        count={analysis.controlGaps.length}
        icon={DocumentTextIcon}
        iconColor="text-purple-600"
        expanded={expandedSections.gaps}
        onToggle={() => toggleSection('gaps')}
      >
        {analysis.controlGaps.length === 0 ? (
          <p className="text-sm text-surface-600 py-2">No significant control gaps identified</p>
        ) : (
          <div className="space-y-2">
            {analysis.controlGaps.map((gap, idx) => (
              <GapCard key={idx} gap={gap} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Subservice Organizations Section */}
      {analysis.subserviceOrganizations.length > 0 && (
        <CollapsibleSection
          title="Subservice Organizations"
          count={analysis.subserviceOrganizations.length}
          icon={BuildingOffice2Icon}
          iconColor="text-blue-600"
          expanded={expandedSections.subservices}
          onToggle={() => toggleSection('subservices')}
        >
          <div className="space-y-2">
            {analysis.subserviceOrganizations.map((org, idx) => (
              <div key={idx} className="p-3 bg-surface-900/50 rounded-lg">
                <p className="font-medium text-surface-100">{org.name}</p>
                <p className="text-sm text-surface-600 mt-1">{org.services}</p>
                <p className="text-xs text-surface-500 mt-1">
                  Method: {org.carveOutOrInclusiveMethod.replace('_', ' ')}
                </p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onCreateAssessment?.(analysis)}
          className="btn btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create Assessment from Analysis
        </button>
      </div>
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  icon: Icon,
  iconColor,
  expanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-surface-800/50 border border-surface-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={clsx('w-5 h-5', iconColor)} />
          <span className="font-medium text-surface-100">{title}</span>
          <span className="text-sm text-surface-600">({count})</span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-5 h-5 text-surface-600" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-surface-600" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Exception Card Component
function ExceptionCard({ exception }: { exception: SOC2Exception }) {
  return (
    <div className={clsx('p-3 rounded-lg border', SEVERITY_COLORS[exception.severity])}>
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-surface-600">{exception.controlId}</span>
          <span className="mx-2 text-surface-600">•</span>
          <span className="text-xs text-surface-600">{exception.category}</span>
        </div>
        <span
          className={clsx(
            'text-xs px-2 py-0.5 rounded capitalize',
            SEVERITY_COLORS[exception.severity]
          )}
        >
          {exception.severity}
        </span>
      </div>
      <p className="text-sm text-surface-200 mt-2">{exception.description}</p>
      {exception.managementResponse && (
        <div className="mt-2 pt-2 border-t border-surface-600/50">
          <p className="text-xs text-surface-600">Management Response:</p>
          <p className="text-xs text-surface-700 mt-1">{exception.managementResponse}</p>
        </div>
      )}
    </div>
  );
}

// CUEC Card Component
function CUECCard({ cuec }: { cuec: CUEC }) {
  const statusColors = {
    implemented: 'bg-green-500/20 text-green-600',
    not_implemented: 'bg-red-500/20 text-red-600',
    unknown: 'bg-surface-600 text-surface-600',
  };

  return (
    <div className="p-3 bg-surface-900/50 rounded-lg">
      <div className="flex items-start justify-between">
        <p className="text-sm text-surface-200 flex-1">{cuec.description}</p>
        <span
          className={clsx(
            'text-xs px-2 py-0.5 rounded ml-2 whitespace-nowrap',
            statusColors[cuec.status]
          )}
        >
          {cuec.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-xs text-surface-600 mt-2">Responsibility: {cuec.responsibility}</p>
    </div>
  );
}

// Gap Card Component
function GapCard({ gap }: { gap: ControlGap }) {
  const priorityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
  };

  return (
    <div className="p-3 bg-surface-900/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-surface-100">{gap.area}</span>
        <span className={clsx('text-xs capitalize', priorityColors[gap.priority])}>
          {gap.priority} priority
        </span>
      </div>
      <p className="text-sm text-surface-700">{gap.description}</p>
      <div className="mt-2 pt-2 border-t border-surface-700">
        <p className="text-xs text-surface-600">Recommendation:</p>
        <p className="text-xs text-surface-700 mt-1">{gap.recommendation}</p>
      </div>
    </div>
  );
}

export default SOC2AnalysisPanel;
