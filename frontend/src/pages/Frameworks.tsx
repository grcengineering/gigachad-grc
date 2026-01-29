import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { frameworksApi } from '@/lib/api';
import {
  CubeIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { SkeletonGrid } from '@/components/Skeleton';

export default function Frameworks() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    version: '',
    description: '',
  });

  const { data: frameworks, isLoading } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => frameworksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      setIsCreateModalOpen(false);
      setFormData({ name: '', type: '', version: '', description: '' });
      toast.success('Framework created successfully');
    },
    onError: () => {
      toast.error('Failed to create framework');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frameworksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      setDeleteConfirm(null);
      toast.success('Framework deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete framework');
    },
  });

  // Seed mutation available if needed
  void useMutation; // Used by delete mutation above

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Frameworks</h1>
            <p className="text-surface-400 mt-1">
              Track your compliance readiness across regulatory frameworks
            </p>
          </div>
        </div>
        <SkeletonGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Frameworks</h1>
          <p className="text-surface-400 mt-1">
            Track your compliance readiness across regulatory frameworks
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Create Framework
        </Button>
      </div>

      {/* Frameworks Grid */}
      {frameworks && frameworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworks.map((framework: any) => (
            <FrameworkCard 
              key={framework.id} 
              framework={framework} 
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
            />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16">
          <CubeIcon className="w-16 h-16 mb-4 text-surface-500" />
          <h3 className="text-lg font-medium text-surface-200 mb-2">No frameworks yet</h3>
          <p className="text-surface-400 text-center mb-6 max-w-md">
            Get started by creating your first compliance framework.
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />} className="text-base px-6 py-3">
            Create Your First Framework
          </Button>
        </div>
      )}

      {/* Create Framework Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-surface-100">Create Framework</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-surface-400 hover:text-surface-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Framework Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SOC 2, ISO 27001, GDPR"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Type *
                </label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g., Security & Privacy, Data Protection"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="e.g., 2017, 2022, 1.0"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the framework..."
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createMutation.isPending}
                  className="flex-1"
                >
                  Create Framework
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Framework</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{deleteConfirm.name}"? This will also delete all requirements and mappings associated with this framework. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                isLoading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FrameworkCard({ 
  framework, 
  onDelete 
}: { 
  framework: any; 
  onDelete: (id: string, name: string) => void;
}) {
  const score = framework.readiness?.score || 0;
  const scoreColor =
    score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const progressColor =
    score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(framework.id, framework.name);
  };

  return (
    <Link
      to={`/frameworks/${framework.id}`}
      className="card p-6 hover:border-surface-700 transition-colors group relative"
    >
      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute top-4 right-4 z-10 p-2 bg-red-600/10 text-surface-500 rounded-lg hover:bg-red-600/20 hover:text-red-400 transition-colors"
        title="Delete framework"
        aria-label="Delete framework"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      <div className="flex items-start justify-between mb-4 pr-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-600/20 rounded-lg">
            <CubeIcon className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-100 group-hover:text-brand-400 transition-colors">
              {framework.name}
            </h3>
            <p className="text-xs text-surface-500">Version {framework.version}</p>
          </div>
        </div>
        <span className="badge badge-info text-xs uppercase">{framework.type}</span>
      </div>

      <p className="text-sm text-surface-400 line-clamp-2 mb-4">
        {framework.description}
      </p>

      {/* Readiness Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-surface-400">Readiness Score</span>
          <span className={clsx('text-lg font-bold', scoreColor)}>{score}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={clsx('progress-fill', progressColor)}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-800">
        <div>
          <p className="text-xs text-surface-500">Requirements</p>
          <p className="text-sm font-medium text-surface-200">
            {framework.requirementCount || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-surface-500">Mapped Controls</p>
          <p className="text-sm font-medium text-surface-200">
            {framework.mappedControlCount || 0}
          </p>
        </div>
      </div>

      {/* Last Assessment */}
      {framework.lastAssessment && (
        <div className="mt-4 pt-4 border-t border-surface-800">
          <p className="text-xs text-surface-500">
            Last assessed:{' '}
            {new Date(framework.lastAssessment.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </Link>
  );
}

