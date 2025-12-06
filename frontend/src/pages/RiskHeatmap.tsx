import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../lib/api';
import { ArrowLeft, AlertTriangle, Info } from 'lucide-react';

interface HeatmapCell {
  likelihood: string;
  impact: string;
  count: number;
  risks: { id: string; riskId: string; title: string }[];
}

interface HeatmapData {
  matrix: HeatmapCell[];
}

const LIKELIHOODS = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
const IMPACTS = ['negligible', 'minor', 'moderate', 'major', 'severe'];

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
  major: 'Major',
  severe: 'Severe',
};

// Calculate risk level from likelihood and impact indices
function getRiskLevel(likelihoodIdx: number, impactIdx: number): 'low' | 'medium' | 'high' | 'critical' {
  const score = (likelihoodIdx + 1) * (impactIdx + 1);
  if (score >= 16) return 'critical';
  if (score >= 9) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function getCellColor(likelihoodIdx: number, impactIdx: number): string {
  const level = getRiskLevel(likelihoodIdx, impactIdx);
  switch (level) {
    case 'critical':
      return 'bg-red-500/40 hover:bg-red-500/60';
    case 'high':
      return 'bg-orange-500/40 hover:bg-orange-500/60';
    case 'medium':
      return 'bg-amber-500/40 hover:bg-amber-500/60';
    case 'low':
      return 'bg-emerald-500/40 hover:bg-emerald-500/60';
    default:
      return 'bg-surface-700 hover:bg-surface-600';
  }
}

export default function RiskHeatmap() {
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  const { data: heatmapData, isLoading } = useQuery<HeatmapData>({
    queryKey: ['risks', 'heatmap'],
    queryFn: async () => {
      const response = await risksApi.getHeatmap();
      return response.data;
    },
  });

  const { data: dashboard } = useQuery({
    queryKey: ['risks', 'dashboard'],
    queryFn: async () => {
      const response = await risksApi.getDashboard();
      return response.data;
    },
  });

  // Build a lookup map for the matrix
  const matrixMap = new Map<string, HeatmapCell>();
  heatmapData?.matrix.forEach(cell => {
    matrixMap.set(`${cell.likelihood}-${cell.impact}`, cell);
  });

  const getCell = (likelihood: string, impact: string): HeatmapCell | undefined => {
    return matrixMap.get(`${likelihood}-${impact}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/risks')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Risk Heatmap</h1>
            <p className="text-surface-400 mt-1">
              Visual distribution of risks by likelihood and impact
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Grid */}
        <div className="lg:col-span-2 bg-surface-800 rounded-xl border border-surface-700 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-surface-400">Loading heatmap...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex items-center justify-end gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500/40 rounded" />
                  <span className="text-surface-400">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500/40 rounded" />
                  <span className="text-surface-400">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500/40 rounded" />
                  <span className="text-surface-400">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500/40 rounded" />
                  <span className="text-surface-400">Critical</span>
                </div>
              </div>

              {/* Matrix */}
              <div className="relative">
                {/* Y-axis label */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-surface-400 text-sm font-medium whitespace-nowrap">
                  LIKELIHOOD →
                </div>

                <div className="ml-8">
                  {/* Impact labels (top) */}
                  <div className="flex mb-2">
                    <div className="w-24 shrink-0" /> {/* Spacer for likelihood labels */}
                    {IMPACTS.map(impact => (
                      <div
                        key={impact}
                        className="flex-1 text-center text-xs text-surface-400 font-medium"
                      >
                        {IMPACT_LABELS[impact]}
                      </div>
                    ))}
                  </div>

                  {/* Grid rows (from highest likelihood to lowest) */}
                  {[...LIKELIHOODS].reverse().map((likelihood, rowIdx) => (
                    <div key={likelihood} className="flex">
                      {/* Likelihood label */}
                      <div className="w-24 shrink-0 flex items-center text-xs text-surface-400 font-medium pr-2">
                        {LIKELIHOOD_LABELS[likelihood]}
                      </div>
                      {/* Cells */}
                      {IMPACTS.map((impact, colIdx) => {
                        const cell = getCell(likelihood, impact);
                        const likelihoodIdx = LIKELIHOODS.length - 1 - rowIdx;
                        const impactIdx = colIdx;

                        return (
                          <button
                            key={`${likelihood}-${impact}`}
                            onClick={() => cell && cell.count > 0 && setSelectedCell(cell)}
                            className={`flex-1 aspect-square m-0.5 rounded-lg transition-all flex items-center justify-center ${getCellColor(
                              likelihoodIdx,
                              impactIdx
                            )} ${cell && cell.count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {cell && cell.count > 0 && (
                              <span className="text-white font-bold text-lg">{cell.count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* X-axis label */}
                  <div className="text-center text-surface-400 text-sm font-medium mt-4">
                    IMPACT →
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Cell Details */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">
              {selectedCell ? 'Selected Risks' : 'Click a Cell'}
            </h3>
            {selectedCell ? (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <div className="flex-1">
                    <span className="text-surface-400">Likelihood:</span>
                    <span className="text-white ml-2 capitalize">
                      {LIKELIHOOD_LABELS[selectedCell.likelihood]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-surface-400">Impact:</span>
                    <span className="text-white ml-2 capitalize">
                      {IMPACT_LABELS[selectedCell.impact]}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCell.risks.map(risk => (
                    <button
                      key={risk.id}
                      onClick={() => navigate(`/risks/${risk.id}`)}
                      className="w-full p-3 bg-surface-700 rounded-lg text-left hover:bg-surface-600 transition-colors"
                    >
                      <span className="text-brand-400 font-mono text-sm">{risk.riskId}</span>
                      <p className="text-white mt-1">{risk.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Info className="w-8 h-8 text-surface-500 mx-auto mb-2" />
                <p className="text-surface-400">
                  Click on any cell with risks to see the details
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          {dashboard && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
              <h3 className="text-lg font-medium text-white mb-4">Risk Distribution</h3>
              <div className="space-y-3">
                {dashboard.byRiskLevel?.map((level: any) => {
                  const levelColors: Record<string, string> = {
                    low: 'bg-emerald-500',
                    medium: 'bg-amber-500',
                    high: 'bg-orange-500',
                    critical: 'bg-red-500',
                  };
                  const percentage = dashboard.totalRisks
                    ? Math.round((level.count / dashboard.totalRisks) * 100)
                    : 0;

                  return (
                    <div key={level.level} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-300 capitalize">{level.level}</span>
                        <span className="text-surface-400">
                          {level.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${levelColors[level.level] || 'bg-surface-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Distribution */}
          {dashboard && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
              <h3 className="text-lg font-medium text-white mb-4">By Category</h3>
              <div className="space-y-2">
                {dashboard.byCategory?.map((cat: any) => (
                  <div
                    key={cat.category}
                    className="flex justify-between items-center p-2 bg-surface-700 rounded"
                  >
                    <span className="text-surface-300 capitalize">{cat.category}</span>
                    <span className="text-white font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



