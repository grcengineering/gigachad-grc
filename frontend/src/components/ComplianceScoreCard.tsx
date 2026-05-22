import { useMemo } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface ComplianceScoreCardProps {
  score: number;
  previousScore?: number;
  frameworkName?: string;
  implementedControls: number;
  totalControls: number;
  onClick?: () => void;
}

export function ComplianceScoreCard({
  score,
  previousScore,
  frameworkName,
  implementedControls,
  totalControls,
  onClick,
}: ComplianceScoreCardProps) {
  const scoreColor = useMemo(() => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  }, [score]);

  const progressColor = useMemo(() => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  }, [score]);

  const trend = previousScore !== undefined ? score - previousScore : null;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-6
        ${onClick ? 'cursor-pointer hover:border-surface-300 dark:hover:border-surface-700 transition-colors' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-surface-600">
            {frameworkName || 'Overall Compliance'}
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-bold ${scoreColor}`}>{score}%</span>
            {trend !== null && (
              <span
                className={`flex items-center text-sm ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {trend >= 0 ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
        <div className="p-3 bg-surface-200 rounded-lg">
          <ChartBarIcon className={`h-6 w-6 ${scoreColor}`} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-surface-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${progressColor} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex justify-between text-sm">
        <span className="text-surface-600">
          {implementedControls} of {totalControls} controls implemented
        </span>
        <span className={scoreColor}>{totalControls - implementedControls} remaining</span>
      </div>
    </div>
  );
}

export default ComplianceScoreCard;
