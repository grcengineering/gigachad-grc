import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { frameworksApi } from '@/lib/api';
import {
  CubeIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ServerStackIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Frameworks() {
  const queryClient = useQueryClient();
  const [seedError, setSeedError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => frameworksApi.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      setSeedError(null);
    },
    onError: (error: any) => {
      setSeedError(error?.response?.data?.message || error?.message || 'Failed to seed database');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
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
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Framework
        </button>
      </div>

      {/* Frameworks Grid */}
      {frameworks && frameworks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {frameworks.map((framework: any) => (
            <FrameworkCard key={framework.id} framework={framework} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16">
          <CubeIcon className="w-16 h-16 mb-4 text-surface-500" />
          <h3 className="text-lg font-medium text-surface-200 mb-2">No frameworks yet</h3>
          <p className="text-surface-400 text-center mb-6 max-w-md">
            Get started by creating your first compliance framework.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-base px-6 py-3"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Your First Framework
          </button>
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
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Framework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FrameworkCard({ framework }: { framework: any }) {
  const score = framework.readiness?.score || 0;
  const scoreColor =
    score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const progressColor =
    score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Link
      to={`/frameworks/${framework.id}`}
      className="card p-6 hover:border-surface-700 transition-colors group"
    >
      <div className="flex items-start justify-between mb-4">
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

