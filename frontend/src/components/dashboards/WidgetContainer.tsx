import { useQuery } from '@tanstack/react-query';
import { customDashboardsApi } from '@/lib/api';
import { DashboardWidget, WIDGET_TYPES } from '@/lib/dashboardWidgets';
import WidgetRenderer from './WidgetRenderer';
import { PencilIcon, TrashIcon, ArrowPathIcon, Bars3Icon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface WidgetContainerProps {
  widget: DashboardWidget;
  dashboardId: string;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export default function WidgetContainer({
  widget,
  dashboardId,
  isEditing,
  onEdit,
  onDelete,
  onRefresh,
}: WidgetContainerProps) {
  const widgetDef = WIDGET_TYPES[widget.widgetType];

  // Fetch widget data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['widget-data', dashboardId, widget.id],
    queryFn: () =>
      widgetDef?.requiresDataSource
        ? customDashboardsApi.getWidgetData(dashboardId, widget.id).then((res) => res.data)
        : Promise.resolve({ data: [] }),
    enabled: !!widget.dataSource?.source || !widgetDef?.requiresDataSource,
    refetchInterval: widget.refreshRate ? widget.refreshRate * 1000 : false,
    staleTime: 30000, // 30 seconds
  });

  const handleRefresh = () => {
    refetch();
    onRefresh();
  };

  return (
    <div
      className={clsx(
        'h-full w-full bg-white border border-surface-200 rounded-lg overflow-hidden flex flex-col dark:bg-surface-900',
        isEditing && 'ring-2 ring-brand-500/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-200 bg-white/50 dark:bg-surface-900/50">
        <div className="flex items-center gap-2">
          {isEditing && (
            <div className="widget-drag-handle cursor-move p-1 hover:bg-surface-200 rounded">
              <Bars3Icon className="w-4 h-4 text-surface-600" />
            </div>
          )}
          <h3 className="text-sm font-medium text-surface-800 truncate">{widget.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {widgetDef?.requiresDataSource && (
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-surface-200 rounded text-surface-600 hover:text-surface-800 transition-colors"
              title="Refresh data"
            >
              <ArrowPathIcon className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={onEdit}
                className="p-1 hover:bg-surface-200 rounded text-surface-600 hover:text-surface-800 transition-colors"
                title="Edit widget"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-500/20 rounded text-surface-600 hover:text-red-600 transition-colors"
                title="Delete widget"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-full text-red-600 text-sm">
            Failed to load data
          </div>
        ) : isLoading && widgetDef?.requiresDataSource ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-surface-300 rounded-full border-t-brand-500" />
          </div>
        ) : (
          <WidgetRenderer widget={widget} data={data?.data || []} />
        )}
      </div>
    </div>
  );
}
