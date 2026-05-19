import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customDashboardsApi } from '@/lib/api';
import { Dashboard } from '@/lib/dashboardWidgets';
import DashboardEditor from '@/components/dashboards/DashboardEditor';
import TemplateGallery from '@/components/dashboards/TemplateGallery';
import {
  PlusIcon,
  Squares2X2Icon,
  StarIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { Button } from '@/components/ui/Button';

export default function CustomDashboards() {
  const queryClient = useQueryClient();
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');

  // Fetch all dashboards
  const { data: dashboards, isLoading } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => customDashboardsApi.list().then((res) => res.data),
  });

  // Create dashboard mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => customDashboardsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard created');
      setShowCreateModal(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
      setSelectedDashboardId(res.data.id);
    },
    onError: () => toast.error('Failed to create dashboard'),
  });

  // Delete dashboard mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => customDashboardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deleted');
    },
    onError: () => toast.error('Failed to delete dashboard'),
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => customDashboardsApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Default dashboard updated');
    },
    onError: () => toast.error('Failed to set default'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDashboardName.trim()) return;
    createMutation.mutate({
      name: newDashboardName.trim(),
      description: newDashboardDescription.trim() || undefined,
    });
  };

  // If a dashboard is selected, show the editor
  if (selectedDashboardId) {
    return (
      <DashboardEditor
        dashboardId={selectedDashboardId}
        onBack={() => setSelectedDashboardId(null)}
      />
    );
  }

  // Separate user dashboards and templates
  const userDashboards = dashboards?.filter((d: Dashboard) => !d.isTemplate) || [];
  const templates = dashboards?.filter((d: Dashboard) => d.isTemplate) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Custom Dashboards</h1>
          <p className="text-surface-600 mt-1">Create and customize your own dashboard views</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowTemplateGallery(true)} variant="ghost">
            <Squares2X2Icon className="w-4 h-4 mr-1" /> Browse Templates
          </Button>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            <PlusIcon className="w-4 h-4 mr-1" /> New Dashboard
          </Button>
        </div>
      </div>
      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500" />
        </div>
      ) : userDashboards.length === 0 ? (
        /* Empty state */
        <div className="card p-12 text-center">
          <Squares2X2Icon className="w-12 h-12 mx-auto text-surface-500 mb-4" />
          <h3 className="text-lg font-medium text-surface-200 mb-2">No dashboards yet</h3>
          <p className="text-surface-600 mb-6">
            Create a custom dashboard or start from a template
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              <PlusIcon className="w-4 h-4 mr-1" /> Create Dashboard
            </Button>
            <Button onClick={() => setShowTemplateGallery(true)} variant="ghost">
              <Squares2X2Icon className="w-4 h-4 mr-1" /> Browse Templates
            </Button>
          </div>
        </div>
      ) : (
        /* Dashboard list */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userDashboards.map((dashboard: Dashboard) => (
            <div
              key={dashboard.id}
              className={clsx(
                'card p-4 cursor-pointer transition-all hover:border-brand-500/50',
                dashboard.isDefault && 'ring-2 ring-brand-500/30'
              )}
              onClick={() => setSelectedDashboardId(dashboard.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-surface-200">{dashboard.name}</h3>
                  {dashboard.isDefault && (
                    <StarIconSolid className="w-4 h-4 text-yellow-600" title="Default" />
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {!dashboard.isDefault && (
                    <button
                      onClick={() => setDefaultMutation.mutate(dashboard.id)}
                      className="p-1 hover:bg-surface-700 rounded text-surface-600 hover:text-yellow-600"
                      title="Set as default"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Delete this dashboard?')) {
                        deleteMutation.mutate(dashboard.id);
                      }
                    }}
                    className="p-1 hover:bg-red-500/20 rounded text-surface-600 hover:text-red-600"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {dashboard.description && (
                <p className="text-sm text-surface-600 mb-3 line-clamp-2">
                  {dashboard.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-surface-500">
                <span>{dashboard.widgets?.length || 0} widgets</span>
                <span>Updated {new Date(dashboard.updatedAt).toLocaleDateString()}</span>
              </div>

              {/* Mini preview */}
              <div className="mt-3 bg-surface-800 rounded p-2">
                <div className="grid grid-cols-6 gap-1 h-12">
                  {dashboard.widgets?.slice(0, 6).map((widget, i) => (
                    <div
                      key={widget.id || i}
                      className="bg-surface-700 rounded"
                      style={{
                        gridColumn: `span ${Math.min(widget.position.w, 2)}`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Templates section */}
      {templates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-surface-200 mb-4">Organization Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.slice(0, 3).map((template: Dashboard) => (
              <div
                key={template.id}
                className="card p-4 cursor-pointer transition-all hover:border-brand-500/50 opacity-75"
                onClick={() => setSelectedDashboardId(template.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-sm badge-info">Template</span>
                  <h3 className="font-medium text-surface-200">{template.name}</h3>
                </div>
                <p className="text-sm text-surface-600 mb-2">
                  {template.widgets?.length || 0} widgets
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    customDashboardsApi.duplicate(template.id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
                      toast.success('Template copied to your dashboards');
                    });
                  }}
                  className="btn-sm w-full"
                  variant="ghost"
                >
                  <DocumentDuplicateIcon className="w-4 h-4 mr-1" /> Use Template
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Create New Dashboard</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Dashboard Name
                  </label>
                  <Input
                    type="text"
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    className="input w-full"
                    placeholder="My Custom Dashboard"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Description (optional)
                  </label>
                  <Textarea
                    value={newDashboardDescription}
                    onChange={(e) => setNewDashboardDescription(e.target.value)}
                    className="input w-full h-20"
                    placeholder="Dashboard for tracking..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <Button type="button" onClick={() => setShowCreateModal(false)} variant="ghost">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newDashboardName.trim() || createMutation.isPending}
                  variant="primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <TemplateGallery
          onClose={() => setShowTemplateGallery(false)}
          onSelectTemplate={(id) => {
            setShowTemplateGallery(false);
            setSelectedDashboardId(id);
          }}
        />
      )}
    </div>
  );
}
