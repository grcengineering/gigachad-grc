import { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlsApi, implementationsApi, usersApi, evidenceApi, policiesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import CommentsPanel from '@/components/CommentsPanel';
import TasksPanel from '@/components/TasksPanel';
import EvidenceCollectors from '@/components/controls/EvidenceCollectors';
import { RealTimePresence } from '@/components/RealTimePresence';
import EntityAuditHistory from '@/components/EntityAuditHistory';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  LinkIcon,
  PencilIcon,
  XMarkIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';

type TabType = 'details' | 'comments' | 'tasks' | 'history';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annually', label: 'Semi-Annually' },
  { value: 'annually', label: 'Annually' },
];

export default function ControlDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLinkPolicyOpen, setIsLinkPolicyOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    guidance: '',
    tags: '',
  });
  const [implForm, setImplForm] = useState({
    ownerId: '',
    testingFrequency: '',
    effectivenessScore: '',
    implementationNotes: '',
  });

  // Store the referrer URL to go back to with search params preserved
  const backUrl = location.state?.from || '/controls';

  const { data: control, isLoading } = useQuery({
    queryKey: ['control', id],
    queryFn: () => controlsApi.get(id!).then((res) => res.data),
    enabled: !!id,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data),
  });
  const users = usersData?.data || [];

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!control?.implementation?.id) throw new Error('No implementation');
      return implementationsApi.update(control.implementation.id, { status: status as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Status updated');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const updateControlMutation = useMutation({
    mutationFn: (data: any) => controlsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Control updated');
    },
    onError: () => {
      toast.error('Failed to update control');
    },
  });

  const updateImplementationMutation = useMutation({
    mutationFn: (data: any) => {
      if (!control?.implementation?.id) throw new Error('No implementation');
      return implementationsApi.update(control.implementation.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Implementation updated');
    },
    onError: () => {
      toast.error('Failed to update implementation');
    },
  });

  const unlinkEvidenceMutation = useMutation({
    mutationFn: (evidenceId: string) => evidenceApi.unlink(evidenceId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      toast.success('Evidence unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink evidence');
    },
  });

  const unlinkPolicyMutation = useMutation({
    mutationFn: (policyId: string) => policiesApi.unlinkFromControl(policyId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control', id] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink policy');
    },
  });

  const handleEdit = () => {
    if (!control) return;
    const impl = control.implementation;
    setEditForm({
      title: control.title,
      description: control.description,
      guidance: control.guidance || '',
      tags: (control.tags || []).join(', '),
    });
    setImplForm({
      ownerId: impl?.ownerId || '',
      testingFrequency: impl?.testingFrequency || 'quarterly',
      effectivenessScore: impl?.effectivenessScore?.toString() || '',
      implementationNotes: impl?.implementationNotes || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Update control
    await updateControlMutation.mutateAsync({
      title: editForm.title,
      description: editForm.description,
      guidance: editForm.guidance || undefined,
      tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });

    // Update implementation
    if (control?.implementation) {
      await updateImplementationMutation.mutateAsync({
        ownerId: implForm.ownerId || null,
        testingFrequency: implForm.testingFrequency,
        effectivenessScore: implForm.effectivenessScore ? parseInt(implForm.effectivenessScore) : null,
        implementationNotes: implForm.implementationNotes || null,
      });
    }

    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonDetailSection title />
            <SkeletonDetailSection title />
            <SkeletonDetailSection title />
          </div>
          <div className="space-y-6">
            <SkeletonDetailSection title />
            <SkeletonDetailSection title />
          </div>
        </div>
      </div>
    );
  }

  if (!control) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Control not found</p>
      </div>
    );
  }

  const implementation = control.implementation;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={backUrl}
            className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Controls
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-brand-400 text-lg">{control.controlId}</span>
            <h1 className="text-2xl font-bold text-surface-100">{control.title}</h1>
            <RealTimePresence entityType="control" entityId={control.id} />
          </div>
          <p className="text-surface-400 mt-2 max-w-2xl">{control.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('controls:update') && (
            <Button variant="outline" onClick={handleEdit} leftIcon={<PencilIcon className="w-4 h-4" />}>
              Edit
            </Button>
          )}
          {hasPermission('controls:delete') && (
            <Button 
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)} 
              leftIcon={<TrashIcon className="w-4 h-4" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-surface-800 flex items-center justify-between sticky top-0 bg-surface-900">
              <h2 className="text-lg font-semibold text-surface-100">Edit Control</h2>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-surface-700 rounded">
                <XMarkIcon className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Control Details Section */}
              <div>
                <h3 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Control Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label mb-1">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      placeholder="e.g., authentication, encryption, monitoring"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label mb-1">Implementation Guidance</label>
                    <textarea
                      value={editForm.guidance}
                      onChange={(e) => setEditForm({ ...editForm, guidance: e.target.value })}
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Implementation Details Section */}
              {control.implementation && (
                <div className="border-t border-surface-800 pt-6">
                  <h3 className="text-sm font-semibold text-surface-300 mb-3 uppercase tracking-wide">Implementation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1">Owner</label>
                      <select
                        value={implForm.ownerId}
                        onChange={(e) => setImplForm({ ...implForm, ownerId: e.target.value })}
                        className="input w-full"
                      >
                        <option value="">Unassigned</option>
                        {users?.map((user: any) => (
                          <option key={user.id} value={user.id}>
                            {user.displayName} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1">Testing Frequency</label>
                      <select
                        value={implForm.testingFrequency}
                        onChange={(e) => setImplForm({ ...implForm, testingFrequency: e.target.value })}
                        className="input w-full"
                      >
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1">Effectiveness Score (0-100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={implForm.effectivenessScore}
                        onChange={(e) => setImplForm({ ...implForm, effectivenessScore: e.target.value })}
                        placeholder="Not rated"
                        className="input w-full"
                      />
                      <p className="text-xs text-surface-500 mt-1">
                        How effective is this control at mitigating risk?
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="label mb-1">Implementation Notes</label>
                      <textarea
                        value={implForm.implementationNotes}
                        onChange={(e) => setImplForm({ ...implForm, implementationNotes: e.target.value })}
                        rows={3}
                        placeholder="Notes about how this control is implemented..."
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-surface-800 flex justify-end gap-3 sticky bottom-0 bg-surface-900">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                isLoading={updateControlMutation.isPending || updateImplementationMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Implementation Status</h2>
            {implementation ? (
              <div className="space-y-4">
                <div>
                  <label className="label mb-2 block">Status</label>
                  <select
                    value={implementation.status}
                    onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                    disabled={!hasPermission('controls:update')}
                    className="input w-full max-w-xs"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-800">
                  <div>
                    <p className="text-sm text-surface-500">Owner</p>
                    <p className="text-surface-200">
                      {implementation.owner?.displayName || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Testing Frequency</p>
                    <p className="text-surface-200 capitalize">
                      {implementation.testingFrequency?.replace('_', ' ') || 'Quarterly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Last Tested</p>
                    <p className="text-surface-200">
                      {implementation?.lastTestDate
                        ? new Date(implementation.lastTestDate).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Effectiveness Score</p>
                    <p className="text-surface-200">
                      {implementation.effectivenessScore !== null
                        ? `${implementation.effectivenessScore}%`
                        : 'Not rated'}
                    </p>
                  </div>
                </div>

                {implementation.implementationNotes && (
                  <div className="pt-4 border-t border-surface-800">
                    <p className="text-sm text-surface-500 mb-2">Implementation Notes</p>
                    <p className="text-surface-300 text-sm">{implementation.implementationNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-surface-500">No implementation data</p>
            )}
          </div>

          {/* Evidence Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">Evidence</h2>
              <Link to={`/evidence?controlId=${id}`} className="btn-outline text-sm">
                <LinkIcon className="w-4 h-4 mr-2" />
                Link Evidence
              </Link>
            </div>
            {(control?.evidenceLinks?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {control?.evidenceLinks?.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-surface-800 rounded-lg group"
                  >
                    <Link
                      to={`/evidence/${link.evidence.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <DocumentTextIcon className="w-5 h-5 text-surface-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-200 hover:text-brand-400 truncate">
                          {link.evidence.title}
                        </p>
                        <p className="text-xs text-surface-500">
                          {link.evidence.type} • {link.evidence.status}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'badge text-xs',
                          link.evidence.status === 'approved'
                            ? 'badge-success'
                            : link.evidence.status === 'expired'
                            ? 'badge-danger'
                            : 'badge-warning'
                        )}
                      >
                        {link.evidence.status}
                      </span>
                      {hasPermission('evidence:write') && (
                        <button
                          onClick={() => unlinkEvidenceMutation.mutate(link.evidence.id)}
                          disabled={unlinkEvidenceMutation.isPending}
                          className="p-1 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Unlink evidence"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm">No evidence linked to this control</p>
            )}
          </div>

          {/* Linked Policies Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-100">Linked Policies</h2>
              {hasPermission('policies:write') && (
                <button
                  onClick={() => setIsLinkPolicyOpen(true)}
                  className="btn-outline text-sm"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link Policy
                </button>
              )}
            </div>
            <p className="text-xs text-surface-500 mb-3">
              Policies that serve as evidence for this control
            </p>
            {(control?.policyLinks?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {control?.policyLinks?.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-surface-800 rounded-lg group"
                  >
                    <Link
                      to={`/policies/${link.policy?.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:text-brand-400"
                    >
                      <DocumentTextIcon className="w-5 h-5 text-brand-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-200 truncate">
                          {link.policy?.title}
                        </p>
                        <p className="text-xs text-surface-500 capitalize">
                          {link.policy?.category?.replace(/_/g, ' ')} • v{link.policy?.version}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'badge text-xs',
                          link.policy?.status === 'published' || link.policy?.status === 'approved'
                            ? 'badge-success'
                            : link.policy?.status === 'retired'
                            ? 'badge-danger'
                            : 'badge-warning'
                        )}
                      >
                        {link.policy?.status}
                      </span>
                      {hasPermission('policies:write') && (
                        <button
                          onClick={() => unlinkPolicyMutation.mutate(link.policy?.id)}
                          disabled={unlinkPolicyMutation.isPending}
                          className="p-1 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Unlink policy"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm">
                No policies linked to this control.
              </p>
            )}
          </div>

          {/* Evidence Collectors Card */}
          {control.implementation && (
            <div className="card p-6">
              <EvidenceCollectors
                controlId={control.id}
                implementationId={control.implementation.id}
              />
            </div>
          )}

          {/* Test History Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-100 mb-4">Test History</h2>
            {(implementation?.tests?.length ?? 0) > 0 ? (
              <div className="space-y-3">
                {implementation?.tests?.map((test: any) => (
                  <div
                    key={test.id}
                    className="flex items-start justify-between p-3 bg-surface-800 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            'badge',
                            test.result === 'pass'
                              ? 'badge-success'
                              : test.result === 'fail'
                              ? 'badge-danger'
                              : 'badge-warning'
                          )}
                        >
                          {test.result}
                        </span>
                        <span className="text-xs text-surface-500">
                          {test.testType} test
                        </span>
                      </div>
                      {test.findings && (
                        <p className="text-sm text-surface-400 mt-2">{test.findings}</p>
                      )}
                    </div>
                    <span className="text-xs text-surface-500">
                      {new Date(test.testedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm">No test history</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">Category</dt>
                <dd className="text-sm text-surface-200 capitalize mt-1">
                  {control.category.replace('_', ' ')}
                </dd>
              </div>
              {(control as any)?.subcategory && (
                <div>
                  <dt className="text-xs text-surface-500">Subcategory</dt>
                  <dd className="text-sm text-surface-200 mt-1">{(control as any).subcategory}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-surface-500">Type</dt>
                <dd className="text-sm text-surface-200 mt-1">
                  {control.isCustom ? 'Custom' : 'System'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Tags</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {(control?.tags?.length ?? 0) > 0 ? (
                    control?.tags?.map((tag: string) => (
                      <span key={tag} className="badge badge-neutral text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-surface-500">No tags</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Framework Mappings Card */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-100 mb-4">Framework Mappings</h3>
            {(control?.mappings?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {control?.mappings?.map((mapping: any) => (
                  <div
                    key={mapping.id}
                    className="p-2 bg-surface-800 rounded-lg"
                  >
                    <p className="text-sm text-brand-400">{mapping.framework.name}</p>
                    <p className="text-xs text-surface-400 mt-1">
                      {mapping.requirement.reference} - {mapping.requirement.title}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500 text-sm">Not mapped to any frameworks</p>
            )}
          </div>

          {/* Guidance Card */}
          {control.guidance && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-100 mb-4">Implementation Guidance</h3>
              <p className="text-sm text-surface-400">{control.guidance}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <div className="card overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-surface-700 px-4">
          <nav className="flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('comments')}
              className={clsx(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'comments'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
              )}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              Comments
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={clsx(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'tasks'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
              )}
            >
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={clsx(
                'py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === 'history'
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:border-surface-600'
              )}
            >
              <ClockIcon className="w-4 h-4" />
              History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'comments' && (
            <CommentsPanel entityType="control" entityId={id!} />
          )}
          {activeTab === 'tasks' && (
            <TasksPanel entityType="control" entityId={id!} />
          )}
          {activeTab === 'history' && (
            <EntityAuditHistory entityType="control" entityId={id!} />
          )}
        </div>
      </div>

      {/* Link Policy Modal */}
      {isLinkPolicyOpen && (
        <LinkPolicyModal
          controlId={id!}
          existingPolicyIds={control.policyLinks?.map((l: any) => l.policy?.id) || []}
          onClose={() => setIsLinkPolicyOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['control', id] });
            setIsLinkPolicyOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-surface-100 mb-2">Delete Control</h3>
            <p className="text-surface-400 mb-6">
              Are you sure you want to delete "{control?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  try {
                    await controlsApi.delete(id!);
                    toast.success('Control deleted successfully');
                    navigate('/controls');
                  } catch (error: any) {
                    console.error('Error deleting control:', {
                      message: error?.message,
                      status: error?.response?.status,
                      data: error?.response?.data,
                    });
                    const message = error?.response?.data?.message || error?.message || 'Failed to delete control';
                    toast.error(Array.isArray(message) ? message.join(', ') : message);
                  }
                }}
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

function LinkPolicyModal({
  controlId,
  existingPolicyIds,
  onClose,
  onSuccess,
}: {
  controlId: string;
  existingPolicyIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);

  const { data: policiesData, isLoading: isLoadingPolicies } = useQuery({
    queryKey: ['policies-for-linking', search],
    queryFn: () => policiesApi.list({ search: search.trim() || undefined, limit: 100 }).then((res) => res.data),
    staleTime: 0, // Always fetch fresh data
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      // Link each selected policy to this control
      await Promise.all(
        selectedPolicyIds.map((policyId) =>
          policiesApi.linkToControls(policyId, [controlId])
        )
      );
    },
    onSuccess: () => {
      toast.success('Policies linked to control!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link policies');
    },
  });

  const availablePolicies = (policiesData?.data || []).filter(
    (p: any) => !existingPolicyIds.includes(p.id)
  );

  const togglePolicy = (policyId: string) => {
    setSelectedPolicyIds((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-lg mx-4 p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-surface-100">Link Policies to Control</h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-surface-400 mb-4">
          Select policies to link as evidence for this control:
        </p>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
          <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
          {isLoadingPolicies ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
              <span className="ml-2 text-surface-400">Searching...</span>
            </div>
          ) : availablePolicies.length === 0 ? (
            <p className="text-surface-500 text-center py-8">
              {search ? `No policies found for "${search}"` : 'All policies are already linked'}
            </p>
          ) : (
            availablePolicies.map((policy: any) => (
              <label
                key={policy.id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  selectedPolicyIds.includes(policy.id)
                    ? 'bg-brand-500/20 border border-brand-500/50'
                    : 'bg-surface-800 hover:bg-surface-700'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedPolicyIds.includes(policy.id)}
                  onChange={() => togglePolicy(policy.id)}
                  className="rounded border-surface-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{policy.title}</p>
                  <p className="text-xs text-surface-500 capitalize">
                    {policy.category?.replace(/_/g, ' ')} • v{policy.version} • {policy.status}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>

        {selectedPolicyIds.length > 0 && (
          <p className="text-sm text-surface-400 mt-3">
            {selectedPolicyIds.length} policy(ies) selected
          </p>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-surface-800">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => linkMutation.mutate()}
            disabled={selectedPolicyIds.length === 0}
            isLoading={linkMutation.isPending}
          >
            Link Policies
          </Button>
        </div>
      </div>
    </div>
  );
}