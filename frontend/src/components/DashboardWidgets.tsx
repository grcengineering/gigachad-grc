import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Cog6ToothIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import clsx from 'clsx';

// ===========================================
// Types
// ===========================================

export interface DashboardWidget {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
  defaultVisible?: boolean;
  minWidth?: 'full' | 'half' | 'third';
}

interface WidgetLayout {
  id: string;
  visible: boolean;
  order: number;
}

interface DashboardLayoutState {
  widgets: WidgetLayout[];
  lastUpdated: string;
}

interface DashboardWidgetsProps {
  widgets: DashboardWidget[];
  storageKey: string;
  className?: string;
}

// ===========================================
// Main Dashboard Widgets Component
// ===========================================

export function DashboardWidgets({ widgets, storageKey, className }: DashboardWidgetsProps) {
  const [layout, setLayout] = useState<WidgetLayout[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

  // Initialize layout from localStorage or defaults
  useEffect(() => {
    const saved = localStorage.getItem(`dashboard_${storageKey}`);
    if (saved) {
      try {
        const parsed: DashboardLayoutState = JSON.parse(saved);
        // Merge with current widgets (in case new widgets were added)
        const mergedLayout = widgets.map((widget, index) => {
          const existing = parsed.widgets.find((w) => w.id === widget.id);
          return (
            existing || {
              id: widget.id,
              visible: widget.defaultVisible !== false,
              order: index,
            }
          );
        });
        setLayout(mergedLayout.sort((a, b) => a.order - b.order));
      } catch (e) {
        console.error('Failed to load dashboard layout:', e);
        initializeDefaultLayout();
      }
    } else {
      initializeDefaultLayout();
    }
  }, [widgets, storageKey]);

  const initializeDefaultLayout = () => {
    setLayout(
      widgets.map((widget, index) => ({
        id: widget.id,
        visible: widget.defaultVisible !== false,
        order: index,
      }))
    );
  };

  const saveLayout = useCallback(
    (newLayout: WidgetLayout[]) => {
      const state: DashboardLayoutState = {
        widgets: newLayout,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`dashboard_${storageKey}`, JSON.stringify(state));
      setLayout(newLayout);
    },
    [storageKey]
  );

  const toggleWidgetVisibility = (widgetId: string) => {
    const newLayout = layout.map((w) => (w.id === widgetId ? { ...w, visible: !w.visible } : w));
    saveLayout(newLayout);
  };

  const resetLayout = () => {
    localStorage.removeItem(`dashboard_${storageKey}`);
    initializeDefaultLayout();
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
    // Add dragging class after a brief delay to avoid visual glitch
    setTimeout(() => {
      const el = document.getElementById(`widget-${widgetId}`);
      if (el) el.classList.add('opacity-50');
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
    // Remove dragging class from all widgets
    layout.forEach((w) => {
      const el = document.getElementById(`widget-${w.id}`);
      if (el) el.classList.remove('opacity-50');
    });
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== widgetId) {
      setDragOverWidget(widgetId);
    }
  };

  const handleDragLeave = () => {
    setDragOverWidget(null);
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidgetId) return;

    const newLayout = [...layout];
    const draggedIndex = newLayout.findIndex((w) => w.id === draggedWidget);
    const targetIndex = newLayout.findIndex((w) => w.id === targetWidgetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder
    const [removed] = newLayout.splice(draggedIndex, 1);
    newLayout.splice(targetIndex, 0, removed);

    // Update order values
    const reorderedLayout = newLayout.map((w, index) => ({ ...w, order: index }));
    saveLayout(reorderedLayout);

    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  // Get visible widgets in order
  const visibleWidgets = layout
    .filter((w) => w.visible)
    .map((w) => ({
      ...w,
      widget: widgets.find((widget) => widget.id === w.id)!,
    }))
    .filter((w) => w.widget);

  const hiddenWidgetsCount = layout.filter((w) => !w.visible).length;

  return (
    <div className={className}>
      {/* Customize Header */}
      <div className="flex items-center justify-end mb-4 gap-2">
        {isCustomizing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetLayout}
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
          >
            Reset Layout
          </Button>
        )}
        <Button
          variant={isCustomizing ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setIsCustomizing(!isCustomizing)}
          leftIcon={
            isCustomizing ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <Cog6ToothIcon className="w-4 h-4" />
            )
          }
        >
          {isCustomizing ? 'Done' : 'Customize'}
        </Button>
      </div>

      {/* Widget Visibility Panel (when customizing) */}
      {isCustomizing && (
        <div className="mb-6 p-4 bg-surface-800 border border-surface-700 rounded-xl">
          <h3 className="text-sm font-medium text-surface-700 mb-3">
            Widget Visibility ({layout.filter((w) => w.visible).length} of {layout.length} visible)
          </h3>
          <div className="flex flex-wrap gap-2">
            {layout.map((w) => {
              const widget = widgets.find((widget) => widget.id === w.id);
              if (!widget) return null;
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWidgetVisibility(w.id)}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                    w.visible
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-700 text-surface-500 border border-surface-600'
                  )}
                >
                  {w.visible ? (
                    <EyeIcon className="w-4 h-4" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4" />
                  )}
                  {widget.title}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-surface-500">
            Drag widgets below to reorder them. Click widgets above to show/hide.
          </p>
        </div>
      )}

      {/* Widgets Grid */}
      <div className="space-y-6">
        {visibleWidgets.map(({ id, widget }) => (
          <div
            key={id}
            id={`widget-${id}`}
            draggable={isCustomizing}
            onDragStart={(e) => handleDragStart(e, id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, id)}
            className={clsx(
              'transition-all duration-200',
              isCustomizing && 'cursor-move',
              dragOverWidget === id &&
                'ring-2 ring-brand-500 ring-offset-2 ring-offset-surface-900',
              draggedWidget === id && 'opacity-50'
            )}
          >
            {isCustomizing && (
              <div className="flex items-center gap-2 mb-2 px-2">
                <Bars3Icon className="w-4 h-4 text-surface-500" />
                <span className="text-sm text-surface-600">{widget.title}</span>
              </div>
            )}
            {widget.component}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-12 bg-surface-800 border border-surface-700 rounded-xl">
          <EyeSlashIcon className="w-12 h-12 mx-auto text-surface-600 mb-4" />
          <h3 className="text-lg font-medium text-surface-700 mb-2">No widgets visible</h3>
          <p className="text-surface-500 mb-4">Click "Customize" to enable some widgets</p>
          <Button onClick={() => setIsCustomizing(true)}>Customize Dashboard</Button>
        </div>
      )}

      {/* Hidden widgets indicator */}
      {!isCustomizing && hiddenWidgetsCount > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsCustomizing(true)}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            {hiddenWidgetsCount} hidden widget{hiddenWidgetsCount > 1 ? 's' : ''} — click to
            customize
          </button>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Widget Card Wrapper
// ===========================================

interface WidgetCardProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function WidgetCard({ title, children, action, className }: WidgetCardProps) {
  return (
    <div
      className={clsx(
        'bg-surface-800 rounded-xl border border-surface-700 overflow-hidden',
        className
      )}
    >
      <div className="p-4 border-b border-surface-700 flex items-center justify-between">
        <h3 className="font-medium text-surface-100">{title}</h3>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default DashboardWidgets;
