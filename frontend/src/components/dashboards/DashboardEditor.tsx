import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from 'react-grid-layout';
import toast from 'react-hot-toast';
import { customDashboardsApi } from '@/lib/api';
import { DashboardWidget, WIDGET_TYPES, WidgetType } from '@/lib/dashboardWidgets';
import DashboardGrid from './DashboardGrid';
import WidgetConfigModal from './WidgetConfigModal';
import WidgetPalette from './WidgetPalette';
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

import { Button } from '@/components/ui/Button';

import { Badge } from '@/components/ui/Badge';

interface DashboardEditorProps {
  dashboardId: string;
  onBack: () => void;
}

export default function DashboardEditor({ dashboardId, onBack }: DashboardEditorProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showWidgetConfig, setShowWidgetConfig] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [pendingLayoutChanges, setPendingLayoutChanges] = useState<Layout[] | null>(null);

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => customDashboardsApi.get(dashboardId).then((res) => res.data),
  });

  // Update dashboard mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => customDashboardsApi.update(dashboardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard saved');
    },
    onError: () => toast.error('Failed to save dashboard'),
  });

  // Add widget mutation
  const addWidgetMutation = useMutation({
    mutationFn: (widget: any) => customDashboardsApi.addWidget(dashboardId, widget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast.success('Widget added');
    },
    onError: (error: any) => {
      console.error('Add widget error:', error?.response?.data || error);
      const message = error?.response?.data?.message || 'Failed to add widget';
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });

  // Update widget mutation
  const updateWidgetMutation = useMutation({
    mutationFn: ({ widgetId, data }: { widgetId: string; data: any }) =>
      customDashboardsApi.updateWidget(dashboardId, widgetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast.success('Widget updated');
    },
    onError: () => toast.error('Failed to update widget'),
  });

  // Delete widget mutation
  const deleteWidgetMutation = useMutation({
    mutationFn: (widgetId: string) => customDashboardsApi.deleteWidget(dashboardId, widgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast.success('Widget deleted');
    },
    onError: () => toast.error('Failed to delete widget'),
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: () => customDashboardsApi.setDefault(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', dashboardId] });
      toast.success('Set as default dashboard');
    },
    onError: () => toast.error('Failed to set as default'),
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => customDashboardsApi.duplicate(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard duplicated');
    },
    onError: () => toast.error('Failed to duplicate dashboard'),
  });

  // Delete dashboard mutation
  const deleteMutation = useMutation({
    mutationFn: () => customDashboardsApi.delete(dashboardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deleted');
      onBack();
    },
    onError: () => toast.error('Failed to delete dashboard'),
  });

  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setPendingLayoutChanges(layout);
  }, []);

  const handleSave = async () => {
    if (pendingLayoutChanges && dashboard) {
      // Convert layout changes to widget position updates
      const widgets = dashboard.widgets.map((widget: DashboardWidget) => {
        const layoutItem = pendingLayoutChanges.find((l) => l.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: {
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            },
          };
        }
        return widget;
      });

      await updateMutation.mutateAsync({ widgets });
      setPendingLayoutChanges(null);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setPendingLayoutChanges(null);
    setIsEditing(false);
  };

  const handleWidgetEdit = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setShowWidgetConfig(true);
  };

  const handleWidgetDelete = async (widgetId: string) => {
    if (confirm('Delete this widget?')) {
      await deleteWidgetMutation.mutateAsync(widgetId);
    }
  };

  const handleWidgetRefresh = (widgetId: string) => {
    queryClient.invalidateQueries({ queryKey: ['widget-data', dashboardId, widgetId] });
  };

  const handleAddWidget = async (widgetType: WidgetType) => {
    const widgetDef = WIDGET_TYPES[widgetType];

    // Calculate y position based on existing widgets (place at bottom)
    const maxY =
      dashboard?.widgets?.reduce((max: number, w: any) => {
        const widgetBottom = (w.position?.y || 0) + (w.position?.h || 2);
        return Math.max(max, widgetBottom);
      }, 0) || 0;

    const newWidget: any = {
      widgetType,
      title: widgetDef.name,
      position: {
        x: 0,
        y: maxY,
        w: widgetDef.defaultSize.w,
        h: widgetDef.defaultSize.h,
      },
    };

    await addWidgetMutation.mutateAsync(newWidget);
    setShowPalette(false);
  };

  const handleWidgetConfigSave = async (widgetData: any) => {
    if (editingWidget) {
      await updateWidgetMutation.mutateAsync({
        widgetId: editingWidget.id,
        data: widgetData,
      });
    }
    setShowWidgetConfig(false);
    setEditingWidget(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-surface-200 rounded-full border-t-brand-500" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-600">Dashboard not found</p>
        <Button onClick={onBack} className="mt-4" variant="primary">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-surface-600 hover:text-surface-800 transition-colors"
          >
            ← Back to dashboards
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-surface-900">{dashboard.name}</h1>
              {dashboard.isDefault && (
                <StarIconSolid className="w-5 h-5 text-yellow-600" title="Default dashboard" />
              )}
              {dashboard.isTemplate && <Badge variant="info">Template</Badge>}
            </div>
            {dashboard.description && (
              <p className="text-surface-600 mt-1">{dashboard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button onClick={() => setShowPalette(true)} className="" variant="ghost">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Widget
              </Button>
              <Button onClick={handleCancel} className="" variant="ghost">
                <XMarkIcon className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                className=""
                disabled={updateMutation.isPending}
                variant="primary"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} className="" variant="ghost">
                <PencilIcon className="w-4 h-4 mr-1" /> Edit
              </Button>
              {!dashboard.isDefault && (
                <Button
                  onClick={() => setDefaultMutation.mutate()}
                  className=""
                  disabled={setDefaultMutation.isPending}
                  variant="ghost"
                >
                  <StarIcon className="w-4 h-4 mr-1" /> Set Default
                </Button>
              )}
              <Button
                onClick={() => duplicateMutation.mutate()}
                className=""
                disabled={duplicateMutation.isPending}
                variant="ghost"
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" /> Duplicate
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Delete this dashboard?')) {
                    deleteMutation.mutate();
                  }
                }}
                className="text-red-600 hover:text-red-700"
                disabled={deleteMutation.isPending}
                variant="ghost"
              >
                <TrashIcon className="w-4 h-4 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Info banner when editing */}
      {isEditing && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-brand-400">
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="font-medium">Edit Mode</span>
          </div>
          <p className="text-surface-600 text-sm mt-1">
            Drag widgets to reposition, resize by dragging edges, or click the edit button to
            configure.
          </p>
        </div>
      )}
      {/* Dashboard Grid */}
      {dashboard.widgets.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-surface-500 mb-4">
            <Cog6ToothIcon className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-surface-800 mb-2">No widgets yet</h3>
          <p className="text-surface-600 mb-4">Add widgets to customize your dashboard</p>
          <Button onClick={() => setShowPalette(true)} variant="primary">
            <PlusIcon className="w-4 h-4 mr-1" /> Add Widget
          </Button>
        </div>
      ) : (
        <DashboardGrid
          widgets={dashboard.widgets}
          isEditing={isEditing}
          onLayoutChange={handleLayoutChange}
          onWidgetEdit={handleWidgetEdit}
          onWidgetDelete={handleWidgetDelete}
          onWidgetRefresh={handleWidgetRefresh}
          dashboardId={dashboardId}
        />
      )}
      {/* Widget Palette Modal */}
      {showPalette && (
        <WidgetPalette onSelect={handleAddWidget} onClose={() => setShowPalette(false)} />
      )}
      {/* Widget Config Modal */}
      {showWidgetConfig && editingWidget && (
        <WidgetConfigModal
          widget={editingWidget}
          onSave={handleWidgetConfigSave}
          onClose={() => {
            setShowWidgetConfig(false);
            setEditingWidget(null);
          }}
        />
      )}
    </div>
  );
}
