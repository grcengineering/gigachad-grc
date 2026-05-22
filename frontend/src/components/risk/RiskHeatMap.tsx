import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

// ===========================================
// Types
// ===========================================

interface Risk {
  id: string;
  riskId?: string;
  title: string;
  likelihood: string;
  impact: string;
  status?: string;
  category?: string;
  inherentRisk?: string;
}

interface RiskHeatMapProps {
  risks: Risk[];
  onRiskClick?: (risk: Risk) => void;
  showLegend?: boolean;
  className?: string;
}

// ===========================================
// Heat Map Configuration
// ===========================================

const LIKELIHOOD_LEVELS = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'] as const;
const IMPACT_LEVELS = ['negligible', 'minor', 'moderate', 'significant', 'severe'] as const;

const LIKELIHOOD_LABELS: Record<string, string> = {
  rare: 'Rare',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  almost_certain: 'Almost Certain',
};

const IMPACT_LABELS: Record<string, string> = {
  negligible: 'Negligible',
  minor: 'Minor',
  moderate: 'Moderate',
  significant: 'Significant',
  severe: 'Severe',
};

// Risk level colors based on likelihood + impact combination
const getCellRiskLevel = (
  likelihoodIdx: number,
  impactIdx: number
): 'low' | 'medium' | 'high' | 'critical' => {
  const score = (likelihoodIdx + 1) * (impactIdx + 1);
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
};

const RISK_COLORS = {
  low: 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/50',
  medium: 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500/50',
  high: 'bg-orange-500/30 hover:bg-orange-500/40 border-orange-500/50',
  critical: 'bg-red-500/30 hover:bg-red-500/40 border-red-500/50',
};

const RISK_DOT_COLORS = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-400',
  critical: 'bg-red-400',
};

// ===========================================
// Risk Heat Map Component
// ===========================================

export function RiskHeatMap({
  risks,
  onRiskClick,
  showLegend = true,
  className,
}: RiskHeatMapProps) {
  const navigate = useNavigate();
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  // Group risks by cell
  const risksByCell = useMemo(() => {
    const grouped: Record<string, Risk[]> = {};

    risks.forEach((risk) => {
      const likelihood = risk.likelihood?.toLowerCase() || 'possible';
      const impact = risk.impact?.toLowerCase() || 'moderate';
      const key = `${likelihood}-${impact}`;

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(risk);
    });

    return grouped;
  }, [risks]);

  const handleCellClick = (likelihood: string, impact: string) => {
    const key = `${likelihood}-${impact}`;
    setSelectedCell(selectedCell === key ? null : key);
  };

  const handleRiskClick = (risk: Risk, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRiskClick) {
      onRiskClick(risk);
    } else {
      navigate(`/risks/${risk.id}`);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    let low = 0,
      medium = 0,
      high = 0,
      critical = 0;

    LIKELIHOOD_LEVELS.forEach((likelihood, lIdx) => {
      IMPACT_LEVELS.forEach((impact, iIdx) => {
        const key = `${likelihood}-${impact}`;
        const count = risksByCell[key]?.length || 0;
        const level = getCellRiskLevel(lIdx, iIdx);

        if (level === 'low') low += count;
        else if (level === 'medium') medium += count;
        else if (level === 'high') high += count;
        else critical += count;
      });
    });

    return { low, medium, high, critical, total: risks.length };
  }, [risksByCell, risks.length]);

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Heat Map Grid */}
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center items-center w-8 mr-2">
          <span className="text-xs text-surface-600 transform -rotate-90 whitespace-nowrap">
            LIKELIHOOD →
          </span>
        </div>

        <div className="flex-1">
          {/* Heat Map */}
          <div className="grid grid-cols-5 gap-1">
            {/* Render from bottom-left to top-right */}
            {[...LIKELIHOOD_LEVELS].reverse().map((likelihood, reversedLIdx) => {
              const lIdx = LIKELIHOOD_LEVELS.length - 1 - reversedLIdx;

              return IMPACT_LEVELS.map((impact, iIdx) => {
                const key = `${likelihood}-${impact}`;
                const cellRisks = risksByCell[key] || [];
                const riskLevel = getCellRiskLevel(lIdx, iIdx);
                const isHovered = hoveredCell === key;
                const isSelected = selectedCell === key;

                return (
                  <div
                    key={key}
                    className={clsx(
                      'aspect-square rounded-lg border transition-all cursor-pointer relative',
                      RISK_COLORS[riskLevel],
                      isSelected && 'ring-2 ring-brand-500',
                      'flex items-center justify-center'
                    )}
                    onMouseEnter={() => setHoveredCell(key)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(likelihood, impact)}
                  >
                    {/* Risk count badge */}
                    {cellRisks.length > 0 && (
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                          RISK_DOT_COLORS[riskLevel],
                          'text-surface-900'
                        )}
                      >
                        {cellRisks.length}
                      </div>
                    )}

                    {/* Hover tooltip */}
                    {isHovered && cellRisks.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                        <div className="bg-white border border-surface-200 rounded-lg shadow-xl p-3 min-w-[200px]">
                          <p className="text-xs text-surface-600 mb-1">
                            {LIKELIHOOD_LABELS[likelihood]} × {IMPACT_LABELS[impact]}
                          </p>
                          <p className="text-sm font-medium text-surface-900">
                            {cellRisks.length} risk{cellRisks.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-surface-700" />
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>

          {/* X-axis labels */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            {IMPACT_LEVELS.map((impact) => (
              <div key={impact} className="text-center">
                <span className="text-xs text-surface-600">{IMPACT_LABELS[impact]}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            <span className="text-xs text-surface-500">IMPACT →</span>
          </div>
        </div>

        {/* Y-axis labels */}
        <div className="flex flex-col justify-between ml-2 py-1">
          {[...LIKELIHOOD_LEVELS].reverse().map((likelihood) => (
            <span key={likelihood} className="text-xs text-surface-600 whitespace-nowrap">
              {LIKELIHOOD_LABELS[likelihood]}
            </span>
          ))}
        </div>
      </div>

      {/* Selected Cell Details */}
      {selectedCell && risksByCell[selectedCell]?.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-surface-900">
              {LIKELIHOOD_LABELS[selectedCell.split('-')[0]]} ×{' '}
              {IMPACT_LABELS[selectedCell.split('-')[1]]}
            </h4>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-xs text-surface-600 hover:text-surface-800"
            >
              Close
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {risksByCell[selectedCell].map((risk) => (
              <div
                key={risk.id}
                onClick={(e) => handleRiskClick(risk, e)}
                className="p-2 bg-surface-200/50 hover:bg-surface-200 rounded-lg cursor-pointer transition-colors"
              >
                <p className="text-sm font-medium text-surface-900">{risk.title}</p>
                <p className="text-xs text-surface-600">
                  {risk.riskId} • {risk.category || 'Uncategorized'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center justify-between bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              <span className="text-xs text-surface-600">Low ({stats.low})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span className="text-xs text-surface-600">Medium ({stats.medium})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-400" />
              <span className="text-xs text-surface-600">High ({stats.high})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span className="text-xs text-surface-600">Critical ({stats.critical})</span>
            </div>
          </div>
          <span className="text-xs text-surface-500">
            Total: {stats.total} risk{stats.total !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Compact Heat Map (for Dashboard)
// ===========================================

interface CompactRiskHeatMapProps {
  risks: Risk[];
  className?: string;
}

export function CompactRiskHeatMap({
  risks,
  className,
  showCounts = true,
}: CompactRiskHeatMapProps & { showCounts?: boolean }) {
  const navigate = useNavigate();

  const risksByCell = useMemo(() => {
    const grouped: Record<string, number> = {};

    risks.forEach((risk) => {
      const likelihood = risk.likelihood?.toLowerCase() || 'possible';
      const impact = risk.impact?.toLowerCase() || 'moderate';
      const key = `${likelihood}-${impact}`;
      grouped[key] = (grouped[key] || 0) + 1;
    });

    return grouped;
  }, [risks]);

  return (
    <div
      className={clsx('cursor-pointer', className)}
      onClick={() => navigate('/risks?view=heatmap')}
    >
      <div className="grid grid-cols-5 gap-1">
        {[...LIKELIHOOD_LEVELS].reverse().map((likelihood, reversedLIdx) => {
          const lIdx = LIKELIHOOD_LEVELS.length - 1 - reversedLIdx;

          return IMPACT_LEVELS.map((impact, iIdx) => {
            const key = `${likelihood}-${impact}`;
            const count = risksByCell[key] || 0;
            const riskLevel = getCellRiskLevel(lIdx, iIdx);

            return (
              <div
                key={key}
                className={clsx(
                  'aspect-square rounded flex items-center justify-center text-xs font-medium transition-transform hover:scale-105',
                  count > 0 ? RISK_DOT_COLORS[riskLevel] : 'bg-surface-200/50',
                  count > 0 ? 'text-white/90' : 'text-surface-500'
                )}
                title={`${LIKELIHOOD_LABELS[likelihood]} × ${IMPACT_LABELS[impact]}: ${count} risks`}
              >
                {showCounts && count > 0 ? count : ''}
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}

export default RiskHeatMap;
