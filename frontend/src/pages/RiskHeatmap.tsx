import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { risksApi } from '../lib/api';
import { ArrowLeft, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { RiskDrawer, type RiskItem } from '@/components/RiskDrawer';

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

function getRiskLevel(
  likelihoodIdx: number,
  impactIdx: number
): 'low' | 'medium' | 'high' | 'critical' {
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
    default:
      return 'bg-emerald-500/40 hover:bg-emerald-500/60';
  }
}

// Rows are rendered top-to-bottom in order of highest likelihood first.
const ROWS = [...LIKELIHOODS].reverse();
const ROW_COUNT = ROWS.length;
const COL_COUNT = IMPACTS.length;

export default function RiskHeatmap() {
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [drawerRiskId, setDrawerRiskId] = useState<string | null>(null);

  // Fetch full risk shape when a heatmap cell risk is selected, so we can
  // render the drawer with real status/category/level rather than just id+title.
  const { data: drawerRisk } = useQuery<RiskItem>({
    queryKey: ['risk', drawerRiskId],
    queryFn: () => risksApi.get(drawerRiskId!).then((r) => r.data),
    enabled: !!drawerRiskId,
  });
  const [focused, setFocused] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const cellRefs = useRef<(HTMLButtonElement | null)[][]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [listOverflowing, setListOverflowing] = useState(false);
  const [atListBottom, setAtListBottom] = useState(false);

  const { data: heatmapData, isLoading } = useQuery<HeatmapData>({
    queryKey: ['risks', 'heatmap'],
    queryFn: () => risksApi.getHeatmap().then((r) => r.data),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['risks', 'dashboard'],
    queryFn: () => risksApi.getDashboard().then((r) => r.data),
  });

  const matrixMap = new Map<string, HeatmapCell>();
  heatmapData?.matrix.forEach((cell) => {
    matrixMap.set(`${cell.likelihood}-${cell.impact}`, cell);
  });

  const getCell = (likelihood: string, impact: string) => matrixMap.get(`${likelihood}-${impact}`);

  // Watch list overflow for the "more below" hint
  useEffect(() => {
    const el = listRef.current;
    if (!el) {
      setListOverflowing(false);
      return;
    }
    const update = () => {
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      setListOverflowing(overflowing);
      setAtListBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4);
    };
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [selectedCell]);

  const handleCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    let next: { row: number; col: number } | null = null;
    switch (e.key) {
      case 'ArrowRight':
        next = { row, col: Math.min(COL_COUNT - 1, col + 1) };
        break;
      case 'ArrowLeft':
        next = { row, col: Math.max(0, col - 1) };
        break;
      case 'ArrowDown':
        next = { row: Math.min(ROW_COUNT - 1, row + 1), col };
        break;
      case 'ArrowUp':
        next = { row: Math.max(0, row - 1), col };
        break;
      case 'Home':
        next = { row, col: 0 };
        break;
      case 'End':
        next = { row, col: COL_COUNT - 1 };
        break;
      default:
        return;
    }
    if (next) {
      e.preventDefault();
      setFocused(next);
      cellRefs.current[next.row]?.[next.col]?.focus();
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Risk Heatmap"
        description="Visual distribution of risks by likelihood and impact."
        actions={
          <Link to="/risks">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to register
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Heatmap Grid */}
        <Card className="lg:col-span-2">
          <CardBody density="comfy">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
                  {[
                    { c: 'bg-emerald-500/40', l: 'Low' },
                    { c: 'bg-amber-500/40', l: 'Medium' },
                    { c: 'bg-orange-500/40', l: 'High' },
                    { c: 'bg-red-500/40', l: 'Critical' },
                  ].map((it) => (
                    <span key={it.l} className="flex items-center gap-1.5 text-surface-600">
                      <span className={`h-3 w-3 rounded ${it.c}`} />
                      {it.l}
                    </span>
                  ))}
                </div>

                {/* Axis label above */}
                <div className="text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Likelihood ↓ &nbsp;·&nbsp; Impact →
                </div>

                {/* Matrix */}
                <div
                  role="grid"
                  aria-label="Risk heatmap by likelihood and impact"
                  className="w-full"
                >
                  {/* Impact column headers */}
                  <div className="flex" role="row">
                    <div className="w-28 shrink-0" role="columnheader" aria-label="empty" />
                    {IMPACTS.map((impact) => (
                      <div
                        key={impact}
                        role="columnheader"
                        className="flex-1 text-center text-xs text-surface-600 font-medium pb-1"
                      >
                        {IMPACT_LABELS[impact]}
                      </div>
                    ))}
                  </div>

                  {ROWS.map((likelihood, rowIdx) => {
                    if (!cellRefs.current[rowIdx]) cellRefs.current[rowIdx] = [];
                    return (
                      <div key={likelihood} className="flex" role="row">
                        <div
                          role="rowheader"
                          className="w-28 shrink-0 flex items-center text-xs text-surface-600 font-medium pr-2"
                        >
                          {LIKELIHOOD_LABELS[likelihood]}
                        </div>
                        {IMPACTS.map((impact, colIdx) => {
                          const cell = getCell(likelihood, impact);
                          // matrix-space likelihood index (0 = rare ... 4 = almost_certain)
                          const likelihoodIdx = ROW_COUNT - 1 - rowIdx;
                          const count = cell?.count ?? 0;
                          const hasRisks = count > 0;
                          const tabIndex =
                            focused.row === rowIdx && focused.col === colIdx ? 0 : -1;

                          return (
                            <button
                              key={`${likelihood}-${impact}`}
                              ref={(el) => {
                                cellRefs.current[rowIdx][colIdx] = el;
                              }}
                              tabIndex={tabIndex}
                              role="gridcell"
                              aria-label={`${LIKELIHOOD_LABELS[likelihood]} likelihood, ${IMPACT_LABELS[impact]} impact, ${count} ${count === 1 ? 'risk' : 'risks'}`}
                              aria-disabled={!hasRisks}
                              onFocus={() => setFocused({ row: rowIdx, col: colIdx })}
                              onClick={() => hasRisks && cell && setSelectedCell(cell)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                              className={cn(
                                'flex-1 aspect-square m-0.5 rounded-md transition-all flex items-center justify-center',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
                                getCellColor(likelihoodIdx, colIdx),
                                hasRisks ? 'cursor-pointer' : 'cursor-default opacity-70',
                                selectedCell?.likelihood === likelihood &&
                                  selectedCell?.impact === impact &&
                                  'ring-2 ring-brand-400 ring-offset-1 ring-offset-white'
                              )}
                            >
                              {hasRisks && (
                                <span className="text-surface-900 font-bold text-lg">{count}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-surface-500">
                  Tip: focus a cell and use <kbd className="font-mono">←↑→↓</kbd> to navigate,{' '}
                  <kbd className="font-mono">Enter</kbd> to open.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{selectedCell ? 'Selected risks' : 'Cell details'}</CardTitle>
            </CardHeader>
            <CardBody density="cozy">
              {selectedCell ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-small">
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wider">
                        Likelihood
                      </p>
                      <p className="text-surface-800 capitalize">
                        {LIKELIHOOD_LABELS[selectedCell.likelihood]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wider">Impact</p>
                      <p className="text-surface-800 capitalize">
                        {IMPACT_LABELS[selectedCell.impact]}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div ref={listRef} className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {selectedCell.risks.map((risk) => (
                        <button
                          key={risk.id}
                          onClick={() => setDrawerRiskId(risk.id)}
                          className="w-full p-2.5 bg-surface-50 border border-surface-200 hover:bg-surface-100 hover:border-surface-300 rounded-md text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <span className="text-brand-700 font-mono text-xs">{risk.riskId}</span>
                          <p className="text-surface-900 text-small mt-0.5">{risk.title}</p>
                        </button>
                      ))}
                    </div>
                    {listOverflowing && !atListBottom && (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-1"
                        aria-hidden
                      >
                        <ChevronDown className="h-3.5 w-3.5 text-surface-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Info className="h-7 w-7 text-surface-500 mx-auto mb-2" />
                  <p className="text-small text-surface-600">
                    Click on any cell with risks to see the details.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {dashboard?.byRiskLevel?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
              </CardHeader>
              <CardBody density="cozy">
                <div className="space-y-3">
                  {dashboard.byRiskLevel.map((level: { level: string; count: number }) => {
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
                        <div className="flex justify-between text-small">
                          <span className="text-surface-700 capitalize">{level.level}</span>
                          <span className="text-surface-500">
                            {level.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${levelColors[level.level] || 'bg-surface-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ) : null}

          {dashboard?.byCategory?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardBody density="cozy">
                <div className="space-y-1.5">
                  {dashboard.byCategory.map((cat: { category: string; count: number }) => (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() =>
                        navigate(`/risks?category=${encodeURIComponent(cat.category || '')}`)
                      }
                      className="w-full flex justify-between items-center px-2.5 py-1.5 bg-surface-50 border border-surface-200 hover:bg-surface-100 hover:border-surface-300 rounded transition-colors text-left"
                    >
                      <span className="text-small text-surface-700 capitalize">{cat.category}</span>
                      <span className="text-small text-surface-900 font-medium">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <RiskDrawer
        risk={drawerRisk ?? null}
        open={!!drawerRiskId && !!drawerRisk}
        onClose={() => setDrawerRiskId(null)}
      />
    </div>
  );
}
