import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customDashboardsApi } from '@/lib/api';
import { Dashboard } from '@/lib/dashboardWidgets';
import { XMarkIcon, DocumentDuplicateIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';

interface TemplateGalleryProps {
  onClose: () => void;
  onSelectTemplate: (dashboardId: string) => void;
}

export default function TemplateGallery({ onClose, onSelectTemplate }: TemplateGalleryProps) {
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['dashboard-templates'],
    queryFn: () => customDashboardsApi.getTemplates().then((res) => res.data),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => customDashboardsApi.duplicate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Template applied! You can now customize your new dashboard.');
      onClose();
      onSelectTemplate(res.data.id);
    },
    onError: () => toast.error('Failed to apply template'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Dashboard Templates</h2>
            <p className="text-sm text-surface-600">Choose a template to get started quickly</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-700 rounded text-surface-600 hover:text-surface-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500" />
            </div>
          ) : templates?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-surface-600">No templates available yet</p>
              <p className="text-sm text-surface-500 mt-2">
                Templates are created by admins and shared across the organization
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates?.map((template: Dashboard) => (
                <div
                  key={template.id}
                  className="bg-surface-800 border border-surface-700 rounded-lg p-4 hover:border-brand-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-surface-200">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-surface-600 mt-1">{template.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-surface-500 mb-4">
                    <span>{template.widgets?.length || 0} widgets</span>
                    <span>Created by {template.creator?.displayName || 'Unknown'}</span>
                  </div>

                  {/* Widget preview */}
                  <div className="bg-surface-900 rounded p-3 mb-4">
                    <div className="grid grid-cols-4 gap-1 h-20">
                      {template.widgets?.slice(0, 8).map((widget, i) => (
                        <div
                          key={widget.id || i}
                          className="bg-surface-700 rounded"
                          style={{
                            gridColumn: `span ${Math.min(widget.position.w, 2)}`,
                            gridRow: `span ${Math.min(widget.position.h, 1)}`,
                          }}
                          title={widget.title}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => onSelectTemplate(template.id)}
                      className="btn-sm flex-1"
                      variant="ghost"
                    >
                      <EyeIcon className="w-4 h-4 mr-1" /> Preview
                    </Button>
                    <Button
                      onClick={() => duplicateMutation.mutate(template.id)}
                      disabled={duplicateMutation.isPending}
                      className="btn-sm flex-1"
                      variant="primary"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                      {duplicateMutation.isPending ? 'Applying...' : 'Use Template'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700 bg-surface-800/50">
          <p className="text-sm text-surface-500">
            Using a template will create a copy that you can customize.
          </p>
        </div>
      </div>
    </div>
  );
}
