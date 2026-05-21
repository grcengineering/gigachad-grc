import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { aiApi, RiskScoringRequest, RiskScoringResponse } from '@/lib/api';
import {
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AIRiskScoringProps {
  riskTitle: string;
  riskDescription: string;
  category?: string;
  existingControls?: string[];
  onApplySuggestion?: (likelihood: number, impact: number) => void;
  className?: string;
}

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

export default function AIRiskScoring({
  riskTitle,
  riskDescription,
  category,
  existingControls,
  onApplySuggestion,
  className,
}: AIRiskScoringProps) {
  const [result, setResult] = useState<RiskScoringResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const scoringMutation = useMutation({
    mutationFn: (data: RiskScoringRequest) => aiApi.scoreRisk(data),
    onSuccess: (response) => {
      setResult(response.data.data);
      setIsExpanded(true);
      toast.success('AI risk scoring complete');
    },
    onError: (error: Error) => {
      toast.error(`AI scoring failed: ${error.message}`);
    },
  });

  const handleScore = () => {
    if (!riskTitle || !riskDescription) {
      toast.error('Please provide risk title and description');
      return;
    }

    scoringMutation.mutate({
      riskTitle,
      riskDescription,
      category,
      existingControls,
    });
  };

  const handleApply = () => {
    if (result && onApplySuggestion) {
      onApplySuggestion(result.suggestedLikelihood, result.suggestedImpact);
      toast.success('AI suggestions applied');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getSeverityColor = (value: number) => {
    if (value <= 2) return 'bg-emerald-500';
    if (value <= 3) return 'bg-yellow-500';
    if (value <= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div
      className={clsx(
        'bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl border border-purple-500/30 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-white">AI Risk Scoring</h3>
        </div>

        <button
          onClick={handleScore}
          disabled={scoringMutation.isPending || !riskTitle || !riskDescription}
          className={clsx(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            scoringMutation.isPending
              ? 'bg-purple-500/30 text-purple-700 cursor-wait'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          )}
        >
          {scoringMutation.isPending ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              {result ? 'Re-analyze' : 'Analyze Risk'}
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {result && isExpanded && (
        <div className="p-4 space-y-4">
          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-surface-600 mb-1">Suggested Likelihood</div>
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold',
                    getSeverityColor(result.suggestedLikelihood)
                  )}
                >
                  {result.suggestedLikelihood}
                </div>
                <span className="text-white font-medium">
                  {LIKELIHOOD_LABELS[result.suggestedLikelihood - 1]}
                </span>
              </div>
              <p className="text-xs text-surface-600 mt-2">{result.likelihoodRationale}</p>
            </div>

            <div className="bg-white/50 rounded-lg p-3">
              <div className="text-xs text-surface-600 mb-1">Suggested Impact</div>
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold',
                    getSeverityColor(result.suggestedImpact)
                  )}
                >
                  {result.suggestedImpact}
                </div>
                <span className="text-white font-medium">
                  {IMPACT_LABELS[result.suggestedImpact - 1]}
                </span>
              </div>
              <p className="text-xs text-surface-600 mt-2">{result.impactRationale}</p>
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-600">AI Confidence:</span>
            <span className={clsx('font-medium', getConfidenceColor(result.confidenceScore))}>
              {Math.round(result.confidenceScore * 100)}%
            </span>
          </div>

          {/* Mitigations */}
          {result.suggestedMitigations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-surface-600">
                <LightBulbIcon className="w-4 h-4" />
                Suggested Mitigations
              </div>
              <ul className="space-y-1">
                {result.suggestedMitigations.map((mitigation, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-surface-700">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    {mitigation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Risks */}
          {result.relatedRisks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-surface-600">
                <ExclamationTriangleIcon className="w-4 h-4" />
                Related Risks to Consider
              </div>
              <div className="flex flex-wrap gap-2">
                {result.relatedRisks.map((risk, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-surface-200/50 rounded text-xs text-surface-700"
                  >
                    {risk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          {onApplySuggestion && (
            <button
              onClick={handleApply}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
            >
              Apply AI Suggestions
            </button>
          )}
        </div>
      )}

      {/* Collapsed State */}
      {result && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 text-sm text-surface-600 hover:text-white transition-colors"
        >
          Show AI analysis results
        </button>
      )}
    </div>
  );
}
