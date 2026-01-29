import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  BookOpenIcon,
  ClockIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

interface RunbookStep {
  id: string;
  step_number: number;
  title: string;
  description: string;
  expected_duration_minutes: number;
  role_responsible: string;
  verification_criteria: string;
}

interface Runbook {
  id: string;
  runbook_id: string;
  title: string;
  description: string;
  category: string;
  system_name: string;
  status: string;
  version: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  process_id: string;
  process_name: string;
  estimated_duration_minutes: number;
  prerequisites: string;
  post_conditions: string;
  rollback_procedure: string;
  last_reviewed_at: string;
  next_review_due: string;
  created_at: string;
  updated_at: string;
  steps: RunbookStep[];
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-surface-600 text-surface-300' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'published', label: 'Published', color: 'bg-green-500/20 text-green-400' },
  { value: 'needs_review', label: 'Needs Review', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'archived', label: 'Archived', color: 'bg-surface-700 text-surface-400' },
];

const CATEGORY_OPTIONS = [
  { value: 'system_recovery', label: 'System Recovery', icon: '💻' },
  { value: 'data_restore', label: 'Data Restore', icon: '💾' },
  { value: 'failover', label: 'Failover', icon: '🔄' },
  { value: 'communication', label: 'Communication', icon: '📢' },
  { value: 'network', label: 'Network', icon: '🌐' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'general', label: 'General', icon: '📋' },
];

export default function RunbookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNewRunbook = id === 'new';
  const [showEditModal, setShowEditModal] = useState(isNewRunbook);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'system_recovery',
    system_name: '',
    status: 'draft',
    estimated_duration_minutes: 30,
    prerequisites: '',
    post_conditions: '',
    rollback_procedure: '',
  });

  const { data: runbook, isLoading, error } = useQuery<Runbook>({
    queryKey: ['runbook', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/runbooks/${id}`);
      return res.data;
    },
    enabled: !!id && !isNewRunbook,
  });

  useEffect(() => {
    if (runbook) {
      setEditForm({
        title: runbook.title || '',
        description: runbook.description || '',
        category: runbook.category || 'system_recovery',
        system_name: runbook.system_name || '',
        status: runbook.status || 'draft',
        estimated_duration_minutes: runbook.estimated_duration_minutes || 30,
        prerequisites: runbook.prerequisites || '',
        post_conditions: runbook.post_conditions || '',
        rollback_procedure: runbook.rollback_procedure || '',
      });
    }
  }, [runbook]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.post('/api/bcdr/runbooks', {
        ...data,
        runbookId: `RB-${Date.now()}`,
        estimatedDurationMinutes: data.estimated_duration_minutes,
        systemName: data.system_name,
        postConditions: data.post_conditions,
        rollbackProcedure: data.rollback_procedure,
      });
      return res.data;
    },
    onSuccess: (newRunbook) => {
      queryClient.invalidateQueries({ queryKey: ['runbooks'] });
      setShowEditModal(false);
      toast.success('Runbook created successfully');
      navigate(`/bcdr/runbooks/${newRunbook.id}`);
    },
    onError: () => {
      toast.error('Failed to create runbook');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const payload = {
        title: data.title,
        description: data.description,
        category: data.category,
        systemName: data.system_name,
        status: data.status,
        estimatedDurationMinutes: data.estimated_duration_minutes,
        prerequisites: data.prerequisites,
        postConditions: data.post_conditions,
        rollbackProcedure: data.rollback_procedure,
      };
      const res = await api.patch(`/api/bcdr/runbooks/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runbook', id] });
      queryClient.invalidateQueries({ queryKey: ['runbooks'] });
      setShowEditModal(false);
      toast.success('Runbook updated successfully');
    },
    onError: () => {
      toast.error('Failed to update runbook');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/bcdr/runbooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runbooks'] });
      toast.success('Runbook deleted');
      navigate('/bcdr/runbooks');
    },
    onError: () => {
      toast.error('Failed to delete runbook');
    },
  });

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[6];
  };

  if (isLoading && !isNewRunbook) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonDetailSection /></div>
          <div><SkeletonDetailSection /></div>
        </div>
      </div>
    );
  }

  if (!isNewRunbook && (error || !runbook)) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">Runbook Not Found</h2>
          <p className="text-surface-400 mb-4">The requested runbook could not be loaded.</p>
          <Button onClick={() => navigate('/bcdr/runbooks')}>Back to Runbooks</Button>
        </div>
      </div>
    );
  }

  // Create form for new runbooks
  if (isNewRunbook) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/runbooks')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Create New Runbook</h1>
            <p className="text-surface-400">Define step-by-step recovery procedures</p>
          </div>
        </div>

        <div className="card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(editForm);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="e.g., Database Failover Procedure"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  System Name
                </label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={editForm.system_name}
                  onChange={(e) => setEditForm({ ...editForm, system_name: e.target.value })}
                  placeholder="e.g., PostgreSQL Primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Description
              </label>
              <textarea
                className="form-input w-full"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Describe the purpose and scope of this runbook..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Category
                </label>
                <select
                  className="form-select w-full"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Status
                </label>
                <select
                  className="form-select w-full"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  className="form-input w-full"
                  value={editForm.estimated_duration_minutes}
                  onChange={(e) => setEditForm({ ...editForm, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Prerequisites
              </label>
              <textarea
                className="form-input w-full"
                rows={3}
                value={editForm.prerequisites}
                onChange={(e) => setEditForm({ ...editForm, prerequisites: e.target.value })}
                placeholder="List prerequisites that must be met before executing this runbook..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Post-Conditions
              </label>
              <textarea
                className="form-input w-full"
                rows={3}
                value={editForm.post_conditions}
                onChange={(e) => setEditForm({ ...editForm, post_conditions: e.target.value })}
                placeholder="Describe the expected state after successful execution..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Rollback Procedure
              </label>
              <textarea
                className="form-input w-full"
                rows={3}
                value={editForm.rollback_procedure}
                onChange={(e) => setEditForm({ ...editForm, rollback_procedure: e.target.value })}
                placeholder="Describe how to rollback if something goes wrong..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/bcdr/runbooks')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={createMutation.isPending}
              >
                Create Runbook
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Detail view for existing runbook
  const statusConfig = getStatusConfig(runbook!.status);
  const categoryConfig = getCategoryConfig(runbook!.category);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/bcdr/runbooks')}
          className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{categoryConfig.icon}</span>
            <h1 className="text-2xl font-bold text-surface-100">{runbook!.title}</h1>
            <span className={clsx('px-3 py-1 rounded-full text-sm font-medium', statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-surface-400">{runbook!.runbook_id} | v{runbook!.version}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditModal(true)}>
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
            <TrashIcon className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Description</h2>
            <p className="text-surface-300 whitespace-pre-wrap">
              {runbook!.description || 'No description provided'}
            </p>
          </div>

          {/* Prerequisites */}
          {runbook!.prerequisites && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Prerequisites</h2>
              <p className="text-surface-300 whitespace-pre-wrap">{runbook!.prerequisites}</p>
            </div>
          )}

          {/* Steps */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">Steps</h2>
              <span className="text-surface-400 text-sm">
                {runbook!.steps?.length || 0} steps
              </span>
            </div>
            {runbook!.steps && runbook!.steps.length > 0 ? (
              <div className="space-y-4">
                {runbook!.steps.map((step, index) => (
                  <div key={step.id} className="flex gap-4 p-4 bg-surface-800 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-surface-100">{step.title}</h4>
                      <p className="text-surface-400 text-sm mt-1">{step.description}</p>
                      {step.role_responsible && (
                        <p className="text-surface-500 text-xs mt-2">
                          Responsible: {step.role_responsible}
                        </p>
                      )}
                    </div>
                    {step.expected_duration_minutes && (
                      <div className="flex items-center gap-1 text-surface-400 text-sm">
                        <ClockIcon className="w-4 h-4" />
                        {step.expected_duration_minutes}m
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-400 text-center py-8">
                No steps defined yet. Edit the runbook to add steps.
              </p>
            )}
          </div>

          {/* Rollback Procedure */}
          {runbook!.rollback_procedure && (
            <div className="card p-6 border-l-4 border-yellow-500">
              <h2 className="text-lg font-semibold text-surface-100 mb-4">Rollback Procedure</h2>
              <p className="text-surface-300 whitespace-pre-wrap">{runbook!.rollback_procedure}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-surface-400 text-sm">Category</dt>
                <dd className="text-surface-100 mt-1">
                  {categoryConfig.icon} {categoryConfig.label}
                </dd>
              </div>
              {runbook!.system_name && (
                <div>
                  <dt className="text-surface-400 text-sm">System</dt>
                  <dd className="text-surface-100 mt-1">{runbook!.system_name}</dd>
                </div>
              )}
              <div>
                <dt className="text-surface-400 text-sm">Estimated Duration</dt>
                <dd className="text-surface-100 mt-1 flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  {runbook!.estimated_duration_minutes || 0} minutes
                </dd>
              </div>
              {runbook!.owner_name && (
                <div>
                  <dt className="text-surface-400 text-sm">Owner</dt>
                  <dd className="text-surface-100 mt-1">{runbook!.owner_name}</dd>
                </div>
              )}
              {runbook!.process_name && (
                <div>
                  <dt className="text-surface-400 text-sm">Business Process</dt>
                  <dd className="text-surface-100 mt-1">{runbook!.process_name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Post-Conditions */}
          {runbook!.post_conditions && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Post-Conditions</h3>
              <p className="text-surface-300 text-sm whitespace-pre-wrap">
                {runbook!.post_conditions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-surface-100">Edit Runbook</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Title</label>
                <input
                  type="text"
                  className="form-input w-full"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
                <textarea
                  className="form-input w-full"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Category</label>
                  <select
                    className="form-select w-full"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Status</label>
                  <select
                    className="form-select w-full"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-surface-100 mb-4">Delete Runbook</h2>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{runbook!.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
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
