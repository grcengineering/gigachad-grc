import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  MegaphoneIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

interface CommunicationPlan {
  id: string;
  name: string;
  description: string;
  plan_type: string;
  is_active: boolean;
  bcdr_plan_id: string | null;
  bcdr_plan_title: string | null;
  contacts: Array<{
    id: string;
    name: string;
    title: string;
    contact_type: string;
    primary_phone: string;
    email: string;
    role_in_plan: string;
    escalation_level: number;
  }>;
  created_at: string;
  updated_at: string;
}

const PLAN_TYPES = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'crisis', label: 'Crisis' },
  { value: 'incident', label: 'Incident' },
  { value: 'stakeholder', label: 'Stakeholder' },
];

const planTypeColors: Record<string, string> = {
  emergency: 'bg-red-500/20 text-red-400',
  crisis: 'bg-orange-500/20 text-orange-400',
  incident: 'bg-yellow-500/20 text-yellow-400',
  stakeholder: 'bg-blue-500/20 text-blue-400',
};

export default function CommunicationPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNewPlan = id === 'new';
  const [showEditModal, setShowEditModal] = useState(isNewPlan);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    plan_type: 'emergency',
    is_active: true,
  });

  const { data: plan, isLoading, error } = useQuery<CommunicationPlan>({
    queryKey: ['communication-plan', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/communication/${id}`);
      return res.data;
    },
    enabled: !!id && !isNewPlan,
  });

  useEffect(() => {
    if (plan) {
      setEditForm({
        name: plan.name || '',
        description: plan.description || '',
        plan_type: plan.plan_type || 'emergency',
        is_active: plan.is_active ?? true,
      });
    }
  }, [plan]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.post('/api/bcdr/communication', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communication-plans'] });
      toast.success('Communication plan created successfully');
      navigate(`/bcdr/communication/${data.id}`);
    },
    onError: (err: Error) => {
      console.error('Failed to create communication plan:', err);
      toast.error('Failed to create communication plan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.patch(`/api/bcdr/communication/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['communication-plans'] });
      setShowEditModal(false);
      toast.success('Communication plan updated successfully');
    },
    onError: () => {
      toast.error('Failed to update communication plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/bcdr/communication/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-plans'] });
      toast.success('Communication plan deleted');
      navigate('/bcdr/communication');
    },
    onError: () => {
      toast.error('Failed to delete communication plan');
    },
  });

  if (isLoading && !isNewPlan) {
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

  if (!isNewPlan && (error || !plan)) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="text-lg font-semibold text-surface-100 mb-2">Communication Plan Not Found</h2>
          <p className="text-surface-400 mb-4">The requested plan could not be loaded.</p>
          <Button onClick={() => navigate('/bcdr/communication')}>Back to Plans</Button>
        </div>
      </div>
    );
  }

  // For new plans, show the create form
  if (isNewPlan) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/communication')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Create Communication Plan</h1>
            <p className="text-surface-400 mt-1">Set up emergency contact lists and communication protocols</p>
          </div>
        </div>

        <div className="card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(editForm);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Plan Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Emergency Response Communication Plan"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Plan Type</label>
              <select
                value={editForm.plan_type}
                onChange={(e) => setEditForm({ ...editForm, plan_type: e.target.value })}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PLAN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the purpose and scope of this communication plan..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm text-surface-300">
                Active (plan is ready for use)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/bcdr/communication')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !editForm.name}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Detail view for existing plans - TypeScript guard (plan is guaranteed to exist at this point)
  if (!plan) return null;
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/communication')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MegaphoneIcon className="w-8 h-8 text-orange-400" />
              <h1 className="text-2xl font-bold text-surface-100">{plan.name}</h1>
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded-full',
                planTypeColors[plan.plan_type] || 'bg-surface-600 text-surface-300'
              )}>
                {PLAN_TYPES.find(t => t.value === plan.plan_type)?.label || plan.plan_type}
              </span>
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded-full',
                plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-surface-600 text-surface-400'
              )}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-surface-400">{plan.description || 'No description provided'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100">
                <UserGroupIcon className="w-5 h-5 inline mr-2 text-surface-400" />
                Contacts ({plan.contacts?.length || 0})
              </h2>
              <Button size="sm">
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Contact
              </Button>
            </div>
            <div className="divide-y divide-surface-700">
              {plan.contacts && plan.contacts.length > 0 ? (
                plan.contacts.map((contact) => (
                  <div key={contact.id} className="p-4 hover:bg-surface-700/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-surface-100">{contact.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            Level {contact.escalation_level}
                          </span>
                        </div>
                        <p className="text-sm text-surface-400">{contact.title}</p>
                        <p className="text-sm text-surface-400">{contact.role_in_plan}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 text-surface-300">
                          <PhoneIcon className="w-4 h-4" />
                          {contact.primary_phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 text-surface-300 mt-1">
                          <EnvelopeIcon className="w-4 h-4" />
                          {contact.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-surface-400">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No contacts added yet</p>
                  <p className="text-sm">Add contacts to this communication plan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card p-4">
            <h3 className="text-sm font-medium text-surface-400 mb-3">Details</h3>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-surface-500">Linked BC/DR Plan</span>
                <p className="text-surface-100">{plan.bcdr_plan_title || 'None'}</p>
              </div>
              <div>
                <span className="text-xs text-surface-500">Created</span>
                <p className="text-surface-100">
                  {new Date(plan.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-surface-500">Last Updated</span>
                <p className="text-surface-100">
                  {new Date(plan.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-100">Edit Communication Plan</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-surface-700 rounded">
                <XMarkIcon className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Plan Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Plan Type</label>
                <select
                  value={editForm.plan_type}
                  onChange={(e) => setEditForm({ ...editForm, plan_type: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100"
                >
                  {PLAN_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-surface-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-primary-500"
                />
                <label htmlFor="edit_is_active" className="text-sm text-surface-300">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-2">Delete Communication Plan?</h2>
            <p className="text-surface-400 mb-4">
              This will permanently delete "{plan.name}" and all associated contacts.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
