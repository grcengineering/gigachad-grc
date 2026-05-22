import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { risksApi } from '../lib/api';
import { ArrowLeft, Info, Download, FileImage, FileText, Loader2 } from 'lucide-react';

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
      return 'bg-emerald-500/40 hover:bg-emerald-500/60';
    default:
      return 'bg-surface-200 hover:bg-surface-600';
  }
}

export default function RiskHeatmap() {
  const navigate = useNavigate();
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);

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
  heatmapData?.matrix.forEach((cell) => {
    matrixMap.set(`${cell.likelihood}-${cell.impact}`, cell);
  });

  const getCell = (likelihood: string, impact: string): HeatmapCell | undefined => {
    return matrixMap.get(`${likelihood}-${impact}`);
  };

  // Export to PNG using html2canvas
  const exportToPNG = useCallback(async () => {
    if (!heatmapRef.current) return;

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#1f2937', // dark background
        scale: 2, // Higher resolution
        logging: false,
      });

      // Download the image
      const link = document.createElement('a');
      link.download = `risk-heatmap-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
      alert('Failed to export heatmap as PNG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Export to PDF using jspdf + html2canvas
  const exportToPDF = useCallback(async () => {
    if (!heatmapRef.current) return;

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Dynamically import dependencies
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then((m) => m.default),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#1f2937',
        scale: 2,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate PDF dimensions (A4 landscape)
      const pdfWidth = 297; // mm
      const pdfHeight = 210; // mm

      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 40) / imgHeight);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Add title
      pdf.setFontSize(18);
      pdf.setTextColor(255, 255, 255);
      pdf.setFillColor(31, 41, 55);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.text('Risk Heatmap', 10, 15);

      // Add date
      pdf.setFontSize(10);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);

      // Add the heatmap image
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;
      const x = (pdfWidth - scaledWidth) / 2;

      pdf.addImage(imgData, 'PNG', x, 28, scaledWidth, scaledHeight);

      // Add legend at bottom
      const legendY = 28 + scaledHeight + 5;
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);

      const legendItems = [
        { color: '#10b981', label: 'Low Risk' },
        { color: '#f59e0b', label: 'Medium Risk' },
        { color: '#f97316', label: 'High Risk' },
        { color: '#ef4444', label: 'Critical Risk' },
      ];

      let legendX = 10;
      legendItems.forEach((item) => {
        pdf.setFillColor(item.color);
        pdf.rect(legendX, legendY, 4, 4, 'F');
        pdf.text(item.label, legendX + 6, legendY + 3);
        legendX += 35;
      });

      // Add summary stats if available
      if (dashboard) {
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        const statsY = legendY + 10;
        pdf.text(`Total Risks: ${dashboard.totalRisks || 0}`, 10, statsY);

        let statsX = 60;
        dashboard.byRiskLevel?.forEach((level: any) => {
          pdf.text(`${level.level}: ${level.count}`, statsX, statsY);
          statsX += 30;
        });
      }

      // Save the PDF
      pdf.save(`risk-heatmap-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export heatmap as PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [dashboard]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/risks')}
            className="p-2 hover:bg-surface-200 rounded-lg text-surface-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white">Risk Heatmap</h1>
            <p className="text-surface-600 mt-1">
              Visual distribution of risks by likelihood and impact
            </p>
          </div>
        </div>

        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export</span>
          </button>

          {showExportMenu && !isExporting && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-lg shadow-xl z-10 dark:bg-surface-900">
              <button
                onClick={exportToPNG}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-surface-700 hover:bg-surface-200 transition-colors"
              >
                <FileImage className="w-4 h-4" />
                <div>
                  <div className="font-medium">Export as PNG</div>
                  <div className="text-xs text-surface-500">High-resolution image</div>
                </div>
              </button>
              <button
                onClick={exportToPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-surface-700 hover:bg-surface-200 transition-colors border-t border-surface-200"
              >
                <FileText className="w-4 h-4" />
                <div>
                  <div className="font-medium">Export as PDF</div>
                  <div className="text-xs text-surface-500">With metadata & legend</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-6 dark:bg-surface-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-surface-600">Loading heatmap...</div>
            </div>
          ) : (
            <div ref={heatmapRef} className="space-y-4 p-4" data-export="true">
              {/* Legend */}
              <div className="flex items-center justify-end gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-emerald-500/40 rounded" />
                  <span className="text-surface-600">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500/40 rounded" />
                  <span className="text-surface-600">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500/40 rounded" />
                  <span className="text-surface-600">High</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500/40 rounded" />
                  <span className="text-surface-600">Critical</span>
                </div>
              </div>

              {/* Matrix */}
              <div className="relative">
                {/* Y-axis label */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-surface-600 text-sm font-medium whitespace-nowrap">
                  LIKELIHOOD →
                </div>

                <div className="ml-8">
                  {/* Impact labels (top) */}
                  <div className="flex mb-2">
                    <div className="w-24 shrink-0" /> {/* Spacer for likelihood labels */}
                    {IMPACTS.map((impact) => (
                      <div
                        key={impact}
                        className="flex-1 text-center text-xs text-surface-600 font-medium"
                      >
                        {IMPACT_LABELS[impact]}
                      </div>
                    ))}
                  </div>

                  {/* Grid rows (from highest likelihood to lowest) */}
                  {[...LIKELIHOODS].reverse().map((likelihood, rowIdx) => (
                    <div key={likelihood} className="flex">
                      {/* Likelihood label */}
                      <div className="w-24 shrink-0 flex items-center text-xs text-surface-600 font-medium pr-2">
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
                  <div className="text-center text-surface-600 text-sm font-medium mt-4">
                    IMPACT →
                  </div>
                </div>
              </div>

              {/* Timestamp for exports */}
              <div className="text-xs text-surface-500 text-right mt-4">
                Generated: {new Date().toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Cell Details */}
          <div className="bg-white rounded-xl border border-surface-200 p-6 dark:bg-surface-900">
            <h3 className="text-lg font-medium text-white mb-4">
              {selectedCell ? 'Selected Risks' : 'Click a Cell'}
            </h3>
            {selectedCell ? (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <div className="flex-1">
                    <span className="text-surface-600">Likelihood:</span>
                    <span className="text-white ml-2 capitalize">
                      {LIKELIHOOD_LABELS[selectedCell.likelihood]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-surface-600">Impact:</span>
                    <span className="text-white ml-2 capitalize">
                      {IMPACT_LABELS[selectedCell.impact]}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCell.risks.map((risk) => (
                    <button
                      key={risk.id}
                      onClick={() => navigate(`/risks/${risk.id}`)}
                      className="w-full p-3 bg-surface-200 rounded-lg text-left hover:bg-surface-600 transition-colors"
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
                <p className="text-surface-600">Click on any cell with risks to see the details</p>
              </div>
            )}
          </div>

          {/* Stats */}
          {dashboard && (
            <div className="bg-white rounded-xl border border-surface-200 p-6 dark:bg-surface-900">
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
                        <span className="text-surface-700 capitalize">{level.level}</span>
                        <span className="text-surface-600">
                          {level.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
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
            <div className="bg-white rounded-xl border border-surface-200 p-6 dark:bg-surface-900">
              <h3 className="text-lg font-medium text-white mb-4">By Category</h3>
              <div className="space-y-2">
                {dashboard.byCategory?.map((cat: any) => (
                  <div
                    key={cat.category}
                    className="flex justify-between items-center p-2 bg-surface-200 rounded"
                  >
                    <span className="text-surface-700 capitalize">{cat.category}</span>
                    <span className="text-white font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handler for export menu */}
      {showExportMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowExportMenu(false)} />
      )}
    </div>
  );
}
