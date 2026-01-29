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
  DocumentTextIcon,
  ShieldExclamationIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

interface BCDRPlan {
  id: string;
  plan_id: string;
  title: string;
  description: string;
  plan_type: string;
  status: string;
  version: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  effective_date: string;
  next_review_due: string;
  last_reviewed_at: string;
  objectives: string;
  scope: string;
  assumptions: string;
  activation_criteria: string;
  deactivation_criteria: string;
  created_at: string;
  updated_at: string;
  in_scope_processes: Array<{
    id: string;
    process_id: string;
    name: string;
    criticality_tier: string;
  }>;
  linked_controls: Array<{
    id: string;
    control_id: string;
    title: string;
  }>;
  communication_plans: Array<{
    id: string;
    name: string;
    plan_type: string;
  }>;
  dr_tests: Array<{
    id: string;
    test_id: string;
    name: string;
    status: string;
    result: string;
    scheduled_date: string;
  }>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-surface-600 text-surface-300' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'published', label: 'Published', color: 'bg-green-500/20 text-green-400' },
  { value: 'archived', label: 'Archived', color: 'bg-surface-700 text-surface-400' },
];

const PLAN_TYPES = [
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'disaster_recovery', label: 'Disaster Recovery' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'crisis_communication', label: 'Crisis Communication' },
  { value: 'pandemic_response', label: 'Pandemic Response' },
  { value: 'it_recovery', label: 'IT Recovery' },
  { value: 'data_backup', label: 'Data Backup' },
  { value: 'other', label: 'Other' },
];

export default function BCDRPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNewPlan = id === 'new';
  const [showEditModal, setShowEditModal] = useState(isNewPlan);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'tests' | 'controls'>('overview');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    plan_type: 'business_continuity',
    status: 'draft',
    objectives: '',
    scope: '',
    assumptions: '',
    activation_criteria: '',
    deactivation_criteria: '',
  });

  const { data: plan, isLoading, error } = useQuery<BCDRPlan>({
    queryKey: ['bcdr-plan', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/plans/${id}`);
      return res.data;
    },
    enabled: !!id && !isNewPlan,
  });

  useEffect(() => {
    if (plan) {
      setEditForm({
        title: plan.title || '',
        description: plan.description || '',
        plan_type: plan.plan_type || 'business_continuity',
        status: plan.status || 'draft',
        objectives: plan.objectives || '',
        scope: plan.scope || '',
        assumptions: plan.assumptions || '',
        activation_criteria: plan.activation_criteria || '',
        deactivation_criteria: plan.deactivation_criteria || '',
      });
    }
  }, [plan]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.post('/api/bcdr/plans', {
        ...data,
        planId: `BCDR-${Date.now()}`,
        planType: data.plan_type,
      });
      return res.data;
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['bcdr-plans'] });
      setShowEditModal(false);
      toast.success('BC/DR plan created successfully');
      navigate(`/bcdr/plans/${newPlan.id}`);
    },
    onError: () => {
      toast.error('Failed to create BC/DR plan');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      // Transform snake_case to camelCase for backend DTO
      const payload = {
        title: data.title,
        description: data.description,
        status: data.status,
        planType: data.plan_type,
        scopeDescription: data.scope,
        activationCriteria: data.activation_criteria,
        deactivationCriteria: data.deactivation_criteria,
        objectives: data.objectives,
        assumptions: data.assumptions,
      };
      const res = await api.patch(`/api/bcdr/plans/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcdr-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['bcdr-plans'] });
      setShowEditModal(false);
      toast.success('BC/DR plan updated successfully');
    },
    onError: () => {
      toast.error('Failed to update BC/DR plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/bcdr/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bcdr-plans'] });
      toast.success('BC/DR plan deleted');
      navigate('/bcdr/plans');
    },
    onError: () => {
      toast.error('Failed to delete BC/DR plan');
    },
  });

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const getPlanTypeLabel = (type: string) => {
    return PLAN_TYPES.find(t => t.value === type)?.label || type;
  };

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
          <h2 className="text-lg font-semibold text-surface-100 mb-2">BC/DR Plan Not Found</h2>
          <p className="text-surface-400 mb-4">The requested plan could not be loaded.</p>
          <Button onClick={() => navigate('/bcdr/plans')}>Back to Plans</Button>
        </div>
      </div>
    );
  }

  // For new plans, show the create form modal immediately
  if (isNewPlan) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/plans')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100">Create New BC/DR Plan</h1>
            <p className="text-surface-400">Fill out the form below to create a new plan</p>
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
              <label className="label">Title *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label className="label">Plan Type</label>
              <select
                value={editForm.plan_type}
                onChange={(e) => setEditForm(prev => ({ ...prev, plan_type: e.target.value }))}
                className="input mt-1"
              >
                {PLAN_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="input mt-1"
              />
            </div>

            <div>
              <label className="label">Objectives</label>
              <textarea
                value={editForm.objectives}
                onChange={(e) => setEditForm(prev => ({ ...prev, objectives: e.target.value }))}
                rows={3}
                className="input mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/bcdr/plans')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(plan.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/plans')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <DocumentTextIcon className="w-8 h-8 text-brand-400" />
              <div>
                <h1 className="text-2xl font-bold text-surface-100">{plan.title}</h1>
                <p className="text-surface-400 text-sm">{plan.plan_id} • v{plan.version}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={clsx(
                "px-3 py-1 rounded-full text-sm font-medium",
                statusConfig.color
              )}>
                {statusConfig.label}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-surface-700 text-surface-300">
                {getPlanTypeLabel(plan.plan_type)}
              </span>
            </div>
          </div>
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

      {/* Tabs */}
      <div className="border-b border-surface-700">
        <nav className="flex gap-6">
          {(['overview', 'processes', 'tests', 'controls'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize",
                activeTab === tab
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-surface-400 hover:text-surface-200"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Description</h3>
              <p className="text-surface-300">{plan.description || 'No description provided.'}</p>
            </div>

            {plan.objectives && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Objectives</h3>
                <p className="text-surface-300 whitespace-pre-wrap">{plan.objectives}</p>
              </div>
            )}

            {plan.scope && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Scope</h3>
                <p className="text-surface-300 whitespace-pre-wrap">{plan.scope}</p>
              </div>
            )}

            {(plan.activation_criteria || plan.deactivation_criteria) && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Activation Criteria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plan.activation_criteria && (
                    <div>
                      <p className="text-surface-400 text-sm mb-2">Activation Criteria</p>
                      <p className="text-surface-300 whitespace-pre-wrap">{plan.activation_criteria}</p>
                    </div>
                  )}
                  {plan.deactivation_criteria && (
                    <div>
                      <p className="text-surface-400 text-sm mb-2">Deactivation Criteria</p>
                      <p className="text-surface-300 whitespace-pre-wrap">{plan.deactivation_criteria}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {plan.assumptions && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Assumptions</h3>
                <p className="text-surface-300 whitespace-pre-wrap">{plan.assumptions}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-surface-400 text-sm">Owner</p>
                  <p className="text-surface-100">{plan.owner_name || '-'}</p>
                </div>
                <div>
                  <p className="text-surface-400 text-sm">Effective Date</p>
                  <p className="text-surface-100">
                    {plan.effective_date 
                      ? new Date(plan.effective_date).toLocaleDateString() 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-surface-400 text-sm">Next Review</p>
                  <p className="text-surface-100">
                    {plan.next_review_due 
                      ? new Date(plan.next_review_due).toLocaleDateString() 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-surface-400 text-sm">Last Reviewed</p>
                  <p className="text-surface-100">
                    {plan.last_reviewed_at 
                      ? new Date(plan.last_reviewed_at).toLocaleDateString() 
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-100 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-400">In-Scope Processes</span>
                  <span className="text-surface-100">{plan.in_scope_processes?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">DR Tests</span>
                  <span className="text-surface-100">{plan.dr_tests?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Linked Controls</span>
                  <span className="text-surface-100">{plan.linked_controls?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Communication Plans</span>
                  <span className="text-surface-100">{plan.communication_plans?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'processes' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">In-Scope Business Processes</h3>
          {plan.in_scope_processes && plan.in_scope_processes.length > 0 ? (
            <div className="space-y-2">
              {plan.in_scope_processes.map((process) => (
                <Link
                  key={process.id}
                  to={`/bcdr/processes/${process.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ShieldExclamationIcon className="w-5 h-5 text-surface-400" />
                    <div>
                      <p className="text-surface-100 font-medium">{process.name}</p>
                      <p className="text-surface-400 text-sm">{process.process_id}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-surface-700 text-surface-300 capitalize">
                    {process.criticality_tier?.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-400 text-center py-8">No processes in scope</p>
          )}
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-surface-100">DR Tests</h3>
            <Link to="/bcdr/tests/new" className="btn btn-secondary btn-sm">
              Schedule Test
            </Link>
          </div>
          {plan.dr_tests && plan.dr_tests.length > 0 ? (
            <div className="space-y-2">
              {plan.dr_tests.map((test) => (
                <Link
                  key={test.id}
                  to={`/bcdr/tests/${test.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {test.result === 'passed' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : test.result === 'failed' ? (
                      <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                    ) : (
                      <CalendarIcon className="w-5 h-5 text-surface-400" />
                    )}
                    <div>
                      <p className="text-surface-100 font-medium">{test.name}</p>
                      <p className="text-surface-400 text-sm">
                        {test.scheduled_date 
                          ? new Date(test.scheduled_date).toLocaleDateString() 
                          : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                  <span className={clsx(
                    "px-2 py-1 rounded text-xs font-medium capitalize",
                    test.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    test.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-surface-700 text-surface-300'
                  )}>
                    {test.status?.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-400 text-center py-8">No DR tests scheduled</p>
          )}
        </div>
      )}

      {activeTab === 'controls' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-100 mb-4">Linked Controls</h3>
          {plan.linked_controls && plan.linked_controls.length > 0 ? (
            <div className="space-y-2">
              {plan.linked_controls.map((control) => (
                <Link
                  key={control.id}
                  to={`/controls/${control.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-colors"
                >
                  <div>
                    <p className="text-surface-100 font-medium">{control.title}</p>
                    <p className="text-surface-400 text-sm">{control.control_id}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-400 text-center py-8">No controls linked</p>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit BC/DR Plan</h2>
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
                if (isNewPlan) {
                  createMutation.mutate(editForm);
                } else {
                  updateMutation.mutate(editForm);
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Plan Type</label>
                  <select
                    value={editForm.plan_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, plan_type: e.target.value }))}
                    className="input w-full"
                  >
                    {PLAN_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="input w-full"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Objectives</label>
                <textarea
                  value={editForm.objectives}
                  onChange={(e) => setEditForm(prev => ({ ...prev, objectives: e.target.value }))}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Scope</label>
                <textarea
                  value={editForm.scope}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scope: e.target.value }))}
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Activation Criteria</label>
                  <textarea
                    value={editForm.activation_criteria}
                    onChange={(e) => setEditForm(prev => ({ ...prev, activation_criteria: e.target.value }))}
                    rows={2}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Deactivation Criteria</label>
                  <textarea
                    value={editForm.deactivation_criteria}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deactivation_criteria: e.target.value }))}
                    rows={2}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Assumptions</label>
                <textarea
                  value={editForm.assumptions}
                  onChange={(e) => setEditForm(prev => ({ ...prev, assumptions: e.target.value }))}
                  rows={2}
                  className="input w-full"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete BC/DR Plan</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{plan.title}"? This action cannot be undone.
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

