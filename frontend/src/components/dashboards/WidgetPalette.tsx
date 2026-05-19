import { WIDGET_TYPES, WidgetType, WidgetTypeDefinition } from '@/lib/dashboardWidgets';
import {
  XMarkIcon,
  HashtagIcon,
  ChartPieIcon,
  ChartBarIcon,
  TableCellsIcon,
  ListBulletIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  Squares2X2Icon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface WidgetPaletteProps {
  onSelect: (type: WidgetType) => void;
  onClose: () => void;
}

// Icon mapping for widget types
const WIDGET_ICONS: Record<string, any> = {
  kpi_card: HashtagIcon,
  pie_chart: ChartPieIcon,
  donut_chart: ChartPieIcon,
  bar_chart: ChartBarIcon,
  line_chart: ArrowTrendingUpIcon,
  table: TableCellsIcon,
  heatmap: Squares2X2Icon,
  progress: ArrowTrendingUpIcon,
  list: ListBulletIcon,
  gauge: ChartPieIcon,
  markdown: DocumentTextIcon,
  iframe: GlobeAltIcon,
};

export default function WidgetPalette({ onSelect, onClose }: WidgetPaletteProps) {
  // Group widgets by category
  const widgetsByCategory: Record<string, WidgetTypeDefinition[]> = {};
  Object.values(WIDGET_TYPES).forEach((widget) => {
    if (!widgetsByCategory[widget.category]) {
      widgetsByCategory[widget.category] = [];
    }
    widgetsByCategory[widget.category].push(widget);
  });

  const categoryLabels: Record<string, string> = {
    metrics: 'Metrics',
    charts: 'Charts',
    tables: 'Tables & Lists',
    content: 'Content',
  };

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold text-surface-100">Add Widget</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-700 rounded text-surface-600 hover:text-surface-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-surface-600 uppercase tracking-wider mb-3">
                {categoryLabels[category] || category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {widgets.map((widget) => {
                  const Icon = WIDGET_ICONS[widget.type] || Squares2X2Icon;
                  return (
                    <button
                      key={widget.type}
                      onClick={() => onSelect(widget.type)}
                      className={clsx(
                        'flex flex-col items-center p-4 rounded-lg border border-surface-700',
                        'bg-surface-800 hover:bg-surface-700 hover:border-brand-500/50',
                        'transition-all duration-200 text-left'
                      )}
                    >
                      <div className="p-2 bg-surface-700 rounded-lg mb-2">
                        <Icon className="w-6 h-6 text-brand-400" />
                      </div>
                      <span className="text-sm font-medium text-surface-200">{widget.name}</span>
                      <span className="text-xs text-surface-500 text-center mt-1">
                        {widget.description}
                      </span>
                      <span className="text-xs text-surface-600 mt-2">
                        Default: {widget.defaultSize.w}x{widget.defaultSize.h}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700 bg-surface-800/50">
          <p className="text-sm text-surface-500">
            Click a widget to add it to your dashboard. You can configure it after adding.
          </p>
        </div>
      </div>
    </div>
  );
}
