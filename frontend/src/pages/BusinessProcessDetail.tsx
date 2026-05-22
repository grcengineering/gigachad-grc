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
  ExclamationCircleIcon,
  ShieldExclamationIcon,
  CubeIcon,
  LinkIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';
import { Dialog } from '@/components/ui/Dialog';

interface BusinessProcess {
  id: string;
  process_id: string;
  name: string;
  description: string;
  department: string;
  criticality_tier: string;
  rto_hours: number;
  rpo_hours: number;
  mtpd_hours: number;
  is_active: boolean;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  impact_description: string;
  recovery_priority: number;
  minimum_staff_required: number;
  alternate_site_required: boolean;
  manual_workaround_available: boolean;
  workaround_description: string;
  next_review_due: string;
  last_reviewed_at: string;
  created_at: string;
  updated_at: string;
  dependencies: Array<{
    id: string;
    dependent_process_id: string;
    dependent_process_name: string;
    dependency_type: string;
  }>;
  assets: Array<{
    id: string;
    asset_id: string;
    asset_name: string;
    asset_type: string;
  }>;
  recovery_strategies: Array<{
    id: string;
    strategy_id: string;
    name: string;
    status: string;
  }>;
  bcdr_plans: Array<{
    id: string;
    plan_id: string;
    title: string;
    status: string;
  }>;
}

const CRITICALITY_TIERS = [
  {
    value: 'tier_1_critical',
    label: 'Tier 1 - Critical',
    color: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
  {
    value: 'tier_2_essential',
    label: 'Tier 2 - Essential',
    color: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  },
  {
    value: 'tier_3_important',
    label: 'Tier 3 - Important',
    color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  },
  {
    value: 'tier_4_standard',
    label: 'Tier 4 - Standard',
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  },
];

export default function BusinessProcessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'dependencies' | 'assets' | 'plans'>(
    'overview'
  );
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    department: '',
    criticality_tier: 'tier_3_important',
    rto_hours: 24,
    rpo_hours: 4,
    mtpd_hours: 72,
    impact_description: '',
    recovery_priority: 1,
    minimum_staff_required: 1,
    alternate_site_required: false,
    manual_workaround_available: false,
    workaround_description: '',
  });

  const {
    data: process,
    isLoading,
    error,
  } = useQuery<BusinessProcess>({
    queryKey: ['business-process', id],
    queryFn: async () => {
      const res = await api.get(`/api/bcdr/processes/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (process) {
      setEditForm({
        name: process.name || '',
        description: process.description || '',
        department: process.department || '',
        criticality_tier: process.criticality_tier || 'tier_3_important',
        rto_hours: process.rto_hours || 24,
        rpo_hours: process.rpo_hours || 4,
        mtpd_hours: process.mtpd_hours || 72,
        impact_description: process.impact_description || '',
        recovery_priority: process.recovery_priority || 1,
        minimum_staff_required: process.minimum_staff_required || 1,
        alternate_site_required: process.alternate_site_required || false,
        manual_workaround_available: process.manual_workaround_available || false,
        workaround_description: process.workaround_description || '',
      });
    }
  }, [process]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const res = await api.patch(`/api/bcdr/processes/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-process', id] });
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      setShowEditModal(false);
      toast.success('Business process updated successfully');
    },
    onError: () => {
      toast.error('Failed to update business process');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/bcdr/processes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-processes'] });
      toast.success('Business process deleted');
      navigate('/bcdr/processes');
    },
    onError: () => {
      toast.error('Failed to delete business process');
    },
  });

  const getCriticalityConfig = (tier: string) => {
    return CRITICALITY_TIERS.find((t) => t.value === tier) || CRITICALITY_TIERS[2];
  };

  const isOverdue = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonDetailSection />
          </div>
          <div>
            <SkeletonDetailSection />
          </div>
        </div>
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h2 className="text-lg font-semibold text-surface-900 mb-2">
            Business Process Not Found
          </h2>
          <p className="text-surface-600 mb-4">
            The requested business process could not be loaded.
          </p>
          <Button onClick={() => navigate('/bcdr/processes')}>Back to Processes</Button>
        </div>
      </div>
    );
  }

  const criticalityConfig = getCriticalityConfig(process.criticality_tier);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/bcdr/processes')}
            className="p-2 hover:bg-surface-200 rounded-lg text-surface-600 mt-1"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldExclamationIcon className="w-8 h-8 text-brand-400" />
              <div>
                <h1 className="text-2xl font-bold text-surface-900">{process.name}</h1>
                <p className="text-surface-600 text-sm">{process.process_id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  'px-3 py-1 rounded-full text-sm font-medium border',
                  criticalityConfig.color
                )}
              >
                {criticalityConfig.label}
              </span>
              <span
                className={clsx(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  process.is_active
                    ? 'bg-green-500/20 text-green-600'
                    : 'bg-surface-600 text-surface-600'
                )}
              >
                {process.is_active ? 'Active' : 'Inactive'}
              </span>
              {process.next_review_due && isOverdue(process.next_review_due) && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-600">
                  Review Overdue
                </span>
              )}
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
      <div className="border-b border-surface-200">
        <nav className="flex gap-6">
          {(['overview', 'dependencies', 'assets', 'plans'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize',
                activeTab === tab
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-600 hover:text-surface-800'
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
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Description</h3>
              <p className="text-surface-700">
                {process.description || 'No description provided.'}
              </p>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Recovery Objectives</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/50 dark:bg-surface-900/50">
                  <p className="text-surface-600 text-sm">RTO</p>
                  <p className="text-2xl font-bold text-surface-900">
                    {process.rto_hours || 'N/A'}h
                  </p>
                  <p className="text-surface-500 text-xs">Recovery Time Objective</p>
                </div>
                <div className="p-4 rounded-lg bg-white/50 dark:bg-surface-900/50">
                  <p className="text-surface-600 text-sm">RPO</p>
                  <p className="text-2xl font-bold text-surface-900">
                    {process.rpo_hours || 'N/A'}h
                  </p>
                  <p className="text-surface-500 text-xs">Recovery Point Objective</p>
                </div>
                <div className="p-4 rounded-lg bg-white/50 dark:bg-surface-900/50">
                  <p className="text-surface-600 text-sm">MTPD</p>
                  <p className="text-2xl font-bold text-surface-900">
                    {process.mtpd_hours || 'N/A'}h
                  </p>
                  <p className="text-surface-500 text-xs">Max Tolerable Downtime</p>
                </div>
              </div>
            </div>

            {process.impact_description && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-surface-900 mb-4">Business Impact</h3>
                <p className="text-surface-700">{process.impact_description}</p>
              </div>
            )}

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Continuity Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-surface-600 text-sm">Recovery Priority</p>
                  <p className="text-surface-900">{process.recovery_priority || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Minimum Staff Required</p>
                  <p className="text-surface-900">{process.minimum_staff_required || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Alternate Site Required</p>
                  <p className="text-surface-900">
                    {process.alternate_site_required ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Manual Workaround Available</p>
                  <p className="text-surface-900">
                    {process.manual_workaround_available ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              {process.workaround_description && (
                <div className="mt-4 pt-4 border-t border-surface-200">
                  <p className="text-surface-600 text-sm mb-2">Workaround Description</p>
                  <p className="text-surface-700">{process.workaround_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-surface-600 text-sm">Department</p>
                  <p className="text-surface-900">{process.department || '-'}</p>
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Owner</p>
                  <p className="text-surface-900">{process.owner_name || '-'}</p>
                  {process.owner_email && (
                    <p className="text-surface-500 text-sm">{process.owner_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Next Review Due</p>
                  <p
                    className={clsx(
                      'text-surface-900',
                      process.next_review_due &&
                        isOverdue(process.next_review_due) &&
                        'text-red-600'
                    )}
                  >
                    {process.next_review_due
                      ? new Date(process.next_review_due).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-surface-600 text-sm">Last Reviewed</p>
                  <p className="text-surface-900">
                    {process.last_reviewed_at
                      ? new Date(process.last_reviewed_at).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-surface-900 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-surface-600">Dependencies</span>
                  <span className="text-surface-900">{process.dependencies?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Assets</span>
                  <span className="text-surface-900">{process.assets?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">BC/DR Plans</span>
                  <span className="text-surface-900">{process.bcdr_plans?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-600">Recovery Strategies</span>
                  <span className="text-surface-900">
                    {process.recovery_strategies?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'dependencies' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Process Dependencies</h3>
          {process.dependencies && process.dependencies.length > 0 ? (
            <div className="space-y-2">
              {process.dependencies.map((dep) => (
                <Link
                  key={dep.id}
                  to={`/bcdr/processes/${dep.dependent_process_id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-surface-200/50 transition-colors dark:bg-surface-900/50"
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-surface-600" />
                    <div>
                      <p className="text-surface-900 font-medium">{dep.dependent_process_name}</p>
                      <p className="text-surface-600 text-sm capitalize">{dep.dependency_type}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-600 text-center py-8">No dependencies configured</p>
          )}
        </div>
      )}
      {activeTab === 'assets' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Supporting Assets</h3>
          {process.assets && process.assets.length > 0 ? (
            <div className="space-y-2">
              {process.assets.map((asset) => (
                <Link
                  key={asset.id}
                  to={`/assets/${asset.asset_id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-surface-200/50 transition-colors dark:bg-surface-900/50"
                >
                  <div className="flex items-center gap-3">
                    <CubeIcon className="w-5 h-5 text-surface-600" />
                    <div>
                      <p className="text-surface-900 font-medium">{asset.asset_name}</p>
                      <p className="text-surface-600 text-sm capitalize">{asset.asset_type}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-600 text-center py-8">No assets linked</p>
          )}
        </div>
      )}
      {activeTab === 'plans' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">BC/DR Plans</h3>
          {process.bcdr_plans && process.bcdr_plans.length > 0 ? (
            <div className="space-y-2">
              {process.bcdr_plans.map((plan) => (
                <Link
                  key={plan.id}
                  to={`/bcdr/plans/${plan.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-surface-200/50 transition-colors dark:bg-surface-900/50"
                >
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="w-5 h-5 text-surface-600" />
                    <div>
                      <p className="text-surface-900 font-medium">{plan.title}</p>
                      <p className="text-surface-600 text-sm">{plan.plan_id}</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-surface-200 text-surface-700 capitalize">
                    {plan.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-surface-600 text-center py-8">No BC/DR plans linked</p>
          )}
        </div>
      )}
      {/* Edit Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit Business Process</h2>
          <button
            onClick={() => setShowEditModal(false)}
            className="p-2 hover:bg-surface-200 rounded-lg text-surface-600"
          >
            <XMarkIcon className="w-5 h-5" />
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
            <label className="block text-sm font-medium text-surface-700 mb-2">Name *</label>
            <Input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              required
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Description</label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Department</label>
              <Input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Criticality Tier
              </label>
              <SelectNative
                value={editForm.criticality_tier}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, criticality_tier: e.target.value }))
                }
                className="input w-full"
              >
                {CRITICALITY_TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">RTO (hours)</label>
              <Input
                type="number"
                value={editForm.rto_hours}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, rto_hours: parseInt(e.target.value) || 0 }))
                }
                min="0"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">RPO (hours)</label>
              <Input
                type="number"
                value={editForm.rpo_hours}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, rpo_hours: parseInt(e.target.value) || 0 }))
                }
                min="0"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                MTPD (hours)
              </label>
              <Input
                type="number"
                value={editForm.mtpd_hours}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    mtpd_hours: parseInt(e.target.value) || 0,
                  }))
                }
                min="0"
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Business Impact Description
            </label>
            <Textarea
              value={editForm.impact_description}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, impact_description: e.target.value }))
              }
              rows={2}
              className="input w-full"
              placeholder="Describe the impact if this process is unavailable..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Recovery Priority
              </label>
              <Input
                type="number"
                value={editForm.recovery_priority}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    recovery_priority: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Minimum Staff Required
              </label>
              <Input
                type="number"
                value={editForm.minimum_staff_required}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    minimum_staff_required: parseInt(e.target.value) || 0,
                  }))
                }
                min="0"
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.alternate_site_required}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    alternate_site_required: e.target.checked,
                  }))
                }
                className="rounded border-surface-300 bg-surface-200 text-brand-600"
              />
              <span className="text-surface-700 text-sm">Alternate Site Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.manual_workaround_available}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    manual_workaround_available: e.target.checked,
                  }))
                }
                className="rounded border-surface-300 bg-surface-200 text-brand-600"
              />
              <span className="text-surface-700 text-sm">Manual Workaround Available</span>
            </label>
          </div>

          {editForm.manual_workaround_available && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Workaround Description
              </label>
              <Textarea
                value={editForm.workaround_description}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, workaround_description: e.target.value }))
                }
                rows={2}
                className="input w-full"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
            <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Dialog>
      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <h3 className="text-lg font-semibold text-white mb-2">Delete Business Process</h3>
        <p className="text-surface-600 mb-6">
          Are you sure you want to delete "{process.name}"? This action cannot be undone and will
          remove all associated data.
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
      </Dialog>
    </div>
  );
}
