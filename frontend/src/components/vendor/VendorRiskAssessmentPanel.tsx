import { useState, useEffect } from 'react';
import {
  ShieldExclamationIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { vendorsApi } from '@/lib/api';
import clsx from 'clsx';

// ============================================
// Types
// ============================================

interface RiskAssessmentResult {
  id: string;
  vendorId: string;
  title: string;
  description?: string;
  assessor: string;
  date: string;
  assetScore: number;
  threatScore: number;
  likelihood: {
    frequency: number;
    capability: number;
    controlStrength: number;
    total: number;
    level: string;
    score: number;
  };
  impact: {
    productivity: number;
    response: number;
    recovery: number;
    competitive: number;
    legal: number;
    reputation: number;
    total: number;
    level: string;
    score: number;
  };
  totalScore: number;
  riskLevel: 'Minimal' | 'Low' | 'Medium' | 'High' | 'Critical';
  recommendedAction: string;
  nextReviewDate: string;
}

interface VendorRiskAssessmentPanelProps {
  vendorId: string;
  vendorName: string;
  onStartAssessment: () => void;
}

// ============================================
// Helper Components
// ============================================

function ScoreBar({ label, score, maxScore, color }: { label: string; score: number; maxScore: number; color: string }) {
  const percentage = (score / maxScore) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-surface-400 w-24">{label}</span>
      <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-surface-300 w-12 text-right">{score}/{maxScore}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    Critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
    High: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    Medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    Low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    Minimal: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  };
  const style = config[level] || config.Medium;

  return (
    <span className={clsx('px-3 py-1 rounded-full text-sm font-medium border', style.bg, style.text, style.border)}>
      {level} Risk
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function VendorRiskAssessmentPanel({
  vendorId,
  vendorName: _vendorName,
  onStartAssessment,
}: VendorRiskAssessmentPanelProps) {
  const [loading, setLoading] = useState(true);
  const [latestAssessment, setLatestAssessment] = useState<RiskAssessmentResult | null>(null);
  const [history, setHistory] = useState<RiskAssessmentResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch latest assessment using the vendorsApi (has proper auth headers)
      const latestRes = await vendorsApi.getLatestRiskAssessment(vendorId);
      if (latestRes.data) {
        setLatestAssessment(latestRes.data);
      }

      // Fetch history
      const historyRes = await vendorsApi.getRiskAssessmentHistory(vendorId);
      if (historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err: any) {
      // 404 means no assessments yet - that's okay
      if (err?.response?.status !== 404) {
        console.error('Failed to fetch risk assessments:', err);
        setError('Failed to load risk assessments');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [vendorId]);

  const getScoreColor = (score: number, max: number) => {
    const pct = (score / max) * 100;
    if (pct >= 80) return 'bg-red-500';
    if (pct >= 60) return 'bg-orange-500';
    if (pct >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldExclamationIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Risk Assessment</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="w-6 h-6 text-surface-400 animate-spin" />
          <span className="ml-2 text-surface-400">Loading assessments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldExclamationIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Risk Assessment</h3>
        </div>
        <div className="text-center py-6">
          <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-2 text-red-400" />
          <p className="text-surface-400">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={fetchAssessments}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!latestAssessment) {
    return (
      <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldExclamationIcon className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-medium text-surface-100">Risk Assessment</h3>
          </div>
        </div>
        <div className="text-center py-8">
          <ShieldExclamationIcon className="w-12 h-12 mx-auto mb-3 text-surface-600" />
          <h4 className="text-lg font-medium text-surface-300 mb-2">No Risk Assessment</h4>
          <p className="text-surface-400 mb-4">
            Conduct a risk assessment to evaluate this vendor's security posture
          </p>
          <Button onClick={onStartAssessment} leftIcon={<ShieldExclamationIcon className="w-4 h-4" />}>
            Start Risk Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldExclamationIcon className="w-5 h-5 text-brand-400" />
          <h3 className="text-lg font-medium text-surface-100">Risk Assessment</h3>
        </div>
        <Button variant="outline" size="sm" onClick={onStartAssessment}>
          New Assessment
        </Button>
      </div>

      {/* Latest Assessment Summary */}
      <div className={clsx(
        'p-4 rounded-lg border mb-6',
        latestAssessment.riskLevel === 'Critical' ? 'bg-red-500/5 border-red-500/20' :
        latestAssessment.riskLevel === 'High' ? 'bg-orange-500/5 border-orange-500/20' :
        latestAssessment.riskLevel === 'Medium' ? 'bg-yellow-500/5 border-yellow-500/20' :
        'bg-green-500/5 border-green-500/20'
      )}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold text-surface-100">{latestAssessment.totalScore}</span>
              <RiskBadge level={latestAssessment.riskLevel} />
            </div>
            <h4 className="font-medium text-surface-200 mb-1">{latestAssessment.title}</h4>
            {latestAssessment.description && (
              <p className="text-sm text-surface-400 mb-2">{latestAssessment.description}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                {latestAssessment.assessor}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {formatDate(latestAssessment.date)}
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Review by {formatDate(latestAssessment.nextReviewDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-surface-300 mb-3">Score Breakdown</h4>
        <div className="space-y-2">
          <ScoreBar 
            label="Asset" 
            score={latestAssessment.assetScore} 
            maxScore={25} 
            color={getScoreColor(latestAssessment.assetScore, 25)} 
          />
          <ScoreBar 
            label="Threat" 
            score={latestAssessment.threatScore} 
            maxScore={25} 
            color={getScoreColor(latestAssessment.threatScore, 25)} 
          />
          <ScoreBar 
            label="Likelihood" 
            score={latestAssessment.likelihood.score} 
            maxScore={25} 
            color={getScoreColor(latestAssessment.likelihood.score, 25)} 
          />
          <ScoreBar 
            label="Impact" 
            score={latestAssessment.impact.score} 
            maxScore={25} 
            color={getScoreColor(latestAssessment.impact.score, 25)} 
          />
        </div>
      </div>

      {/* Recommended Action */}
      <div className="p-3 bg-surface-800/50 rounded-lg mb-6">
        <div className="flex items-start gap-2">
          <CheckCircleIcon className="w-5 h-5 text-brand-400 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="text-sm font-medium text-surface-200">Recommended Action</h5>
            <p className="text-sm text-surface-400">{latestAssessment.recommendedAction}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-surface-800/30 rounded-lg">
          <h5 className="text-xs text-surface-500 uppercase tracking-wide mb-1">Likelihood</h5>
          <p className="text-lg font-semibold text-surface-200">{latestAssessment.likelihood.level}</p>
          <p className="text-xs text-surface-400">
            Freq: {latestAssessment.likelihood.frequency} | 
            Cap: {latestAssessment.likelihood.capability} | 
            Ctrl: {latestAssessment.likelihood.controlStrength}
          </p>
        </div>
        <div className="p-3 bg-surface-800/30 rounded-lg">
          <h5 className="text-xs text-surface-500 uppercase tracking-wide mb-1">Impact</h5>
          <p className="text-lg font-semibold text-surface-200">{latestAssessment.impact.level}</p>
          <p className="text-xs text-surface-400">Total: {latestAssessment.impact.total} points</p>
        </div>
      </div>

      {/* Assessment History */}
      {history.length > 1 && (
        <div className="border-t border-surface-800 pt-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-surface-300">
              Assessment History ({history.length} total)
            </span>
            {showHistory ? (
              <ChevronUpIcon className="w-4 h-4 text-surface-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-surface-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {history.slice(1).map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-3 bg-surface-800/30 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-300">{assessment.title}</p>
                    <p className="text-xs text-surface-500">
                      {formatDate(assessment.date)} by {assessment.assessor}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-surface-300">{assessment.totalScore}</span>
                    <RiskBadge level={assessment.riskLevel} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
