import { useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlsApi, implementationsApi, usersApi, evidenceApi, policiesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import CommentsPanel from '@/components/CommentsPanel';
import TasksPanel from '@/components/TasksPanel';
import EvidenceCollectors from '@/components/controls/EvidenceCollectors';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  LinkIcon,
  PencilIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  Calendar,
  User,
  Clock,
  CheckCircle2,
  MinusCircle,
  XCircle as XCircleLucide,
  AlertTriangle,
} from 'lucide-react';
import clsx from 'clsx';
import { Badge, Button, Dialog, Input, Select, Textarea, type BadgeVariant } from '@/components/ui';

type ControlStatus = 'implemented' | 'in_progress' | 'not_started' | 'not_applicable';

const STATUS_VARIANT: Record<
  ControlStatus,
  { variant: BadgeVariant; icon: typeof CheckCircle2; label: string }
> = {
  implemented: { variant: 'success', icon: CheckCircle2, label: 'Implemented' },
  in_progress: { variant: 'warning', icon: AlertTriangle, label: 'In Progress' },
  not_started: { variant: 'neutral', icon: MinusCircle, label: 'Not Started' },
  not_applicable: { variant: 'info', icon: XCircleLucide, label: 'N/A' },
};

function ControlStatusBadge({ status }: { status?: string }) {
  const key = (status || 'not_started') as ControlStatus;
  const cfg = STATUS_VARIANT[key] || STATUS_VARIANT.not_started;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="inline-flex items-center gap-1" size="md">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

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
  const location = useLocation();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isLinkPolicyOpen, setIsLinkPolicyOpen] = useState(false);
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

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data.users ?? []),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      implementationsApi.update(control.implementation.id, { status }),
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
    mutationFn: (data: any) => implementationsApi.update(control.implementation.id, data),
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
      tags: editForm.tags
        ? editForm.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    });

    // Update implementation
    if (control.implementation) {
      await updateImplementationMutation.mutateAsync({
        ownerId: implForm.ownerId || null,
        testingFrequency: implForm.testingFrequency,
        effectivenessScore: implForm.effectivenessScore
          ? parseInt(implForm.effectivenessScore)
          : null,
        implementationNotes: implForm.implementationNotes || null,
      });
    }

    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-300 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (!control) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-600">Control not found</p>
      </div>
    );
  }

  const implementation = control.implementation;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Back link */}
      <Link
        to={backUrl}
        className="inline-flex items-center text-xs text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5 mr-1" />
        Back to Controls
      </Link>

      {/* Hero */}
      <div className="surface-elevated rounded-xl border border-surface-200/60 p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="font-mono text-brand-700 text-sm font-medium">
                {control.controlId}
              </span>
              <span className="text-surface-500">·</span>
              <Badge variant="neutral" className="capitalize">
                {control.category.replace(/_/g, ' ')}
              </Badge>
              {implementation && <ControlStatusBadge status={implementation.status} />}
            </div>
            <h1 className="text-h1 text-surface-900">{control.title}</h1>
            {control.description && (
              <p className="text-body text-surface-600 mt-2 max-w-3xl leading-relaxed">
                {control.description}
              </p>
            )}
            {/* Inline meta row */}
            {implementation && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-surface-500">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span className="text-surface-700">
                    {implementation.owner?.displayName || 'Unassigned'}
                  </span>
                </span>
                {implementation.testingFrequency && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="capitalize">
                      {implementation.testingFrequency.replace('_', ' ')}
                    </span>
                  </span>
                )}
                {implementation.lastTestedAt && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Tested {new Date(implementation.lastTestedAt).toLocaleDateString()}</span>
                  </span>
                )}
                {implementation.effectivenessScore !== null &&
                  implementation.effectivenessScore !== undefined && (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">
                        {implementation.effectivenessScore}% effective
                      </span>
                    </span>
                  )}
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 shrink-0">
            {implementation && hasPermission('controls:update') && (
              <Select
                size="sm"
                fullWidth={false}
                className="w-44"
                value={implementation.status}
                onChange={(v) => updateStatusMutation.mutate(v)}
                options={STATUS_OPTIONS}
              />
            )}
            {hasPermission('controls:update') && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<PencilIcon className="h-4 w-4" />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Control"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={updateControlMutation.isPending || updateImplementationMutation.isPending}
            >
              {updateControlMutation.isPending || updateImplementationMutation.isPending
                ? 'Saving...'
                : 'Save Changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Control Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wide">
              Control Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label mb-1">Title</label>
                <Input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label mb-1">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="label mb-1">Tags (comma-separated)</label>
                <Input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  placeholder="e.g., authentication, encryption, monitoring"
                />
              </div>
              <div>
                <label className="label mb-1">Implementation Guidance</label>
                <Textarea
                  value={editForm.guidance}
                  onChange={(e) => setEditForm({ ...editForm, guidance: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Implementation Details Section */}
          {control.implementation && (
            <div className="border-t border-surface-200 pt-6">
              <h3 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wide">
                Implementation Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1">Owner</label>
                  <Select
                    value={implForm.ownerId}
                    onChange={(v) => setImplForm({ ...implForm, ownerId: v })}
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...(users?.map((user: any) => ({
                        value: user.id,
                        label: `${user.displayName} (${user.role})`,
                      })) || []),
                    ]}
                  />
                </div>
                <div>
                  <label className="label mb-1">Testing Frequency</label>
                  <Select
                    value={implForm.testingFrequency}
                    onChange={(v) => setImplForm({ ...implForm, testingFrequency: v })}
                    options={FREQUENCY_OPTIONS}
                  />
                </div>
                <div>
                  <label className="label mb-1">Effectiveness Score (0-100)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={implForm.effectivenessScore}
                    onChange={(e) =>
                      setImplForm({ ...implForm, effectivenessScore: e.target.value })
                    }
                    placeholder="Not rated"
                  />
                  <p className="text-xs text-surface-500 mt-1">
                    How effective is this control at mitigating risk?
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="label mb-1">Implementation Notes</label>
                  <Textarea
                    value={implForm.implementationNotes}
                    onChange={(e) =>
                      setImplForm({ ...implForm, implementationNotes: e.target.value })
                    }
                    rows={3}
                    placeholder="Notes about how this control is implemented..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Implementation Status</h2>
            {implementation ? (
              <div className="space-y-4">
                <div>
                  <label className="label mb-2 block">Status</label>
                  <div className="max-w-xs">
                    <Select
                      value={implementation.status}
                      onChange={(v) => updateStatusMutation.mutate(v)}
                      disabled={!hasPermission('controls:update')}
                      options={STATUS_OPTIONS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-200">
                  <div>
                    <p className="text-sm text-surface-500">Owner</p>
                    <p className="text-surface-800">
                      {implementation.owner?.displayName || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Testing Frequency</p>
                    <p className="text-surface-800 capitalize">
                      {implementation.testingFrequency?.replace('_', ' ') || 'Quarterly'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Last Tested</p>
                    <p className="text-surface-800">
                      {implementation.lastTestedAt
                        ? new Date(implementation.lastTestedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500">Effectiveness Score</p>
                    <p className="text-surface-800">
                      {implementation.effectivenessScore !== null
                        ? `${implementation.effectivenessScore}%`
                        : 'Not rated'}
                    </p>
                  </div>
                </div>

                {implementation.implementationNotes && (
                  <div className="pt-4 border-t border-surface-200">
                    <p className="text-sm text-surface-500 mb-2">Implementation Notes</p>
                    <p className="text-surface-700 text-sm">{implementation.implementationNotes}</p>
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
              <h2 className="text-lg font-semibold text-surface-900">Evidence</h2>
              <Link to={`/evidence?controlId=${id}`}>
                <Button variant="outline" size="sm" leftIcon={<LinkIcon className="w-4 h-4" />}>
                  Link Evidence
                </Button>
              </Link>
            </div>
            {control.evidenceLinks?.length > 0 ? (
              <div className="space-y-2">
                {control.evidenceLinks.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-surface-100 rounded-lg group"
                  >
                    <Link
                      to={`/evidence/${link.evidence.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <DocumentTextIcon className="w-5 h-5 text-surface-600" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-800 hover:text-brand-700 truncate">
                          {link.evidence.title}
                        </p>
                        <p className="text-xs text-surface-500">
                          {link.evidence.type} • {link.evidence.status}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          link.evidence.status === 'approved'
                            ? 'success'
                            : link.evidence.status === 'expired'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {link.evidence.status}
                      </Badge>
                      {hasPermission('evidence:write') && (
                        <button
                          onClick={() => unlinkEvidenceMutation.mutate(link.evidence.id)}
                          disabled={unlinkEvidenceMutation.isPending}
                          className="p-1 text-surface-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <h2 className="text-lg font-semibold text-surface-900">Linked Policies</h2>
              {hasPermission('policies:write') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkPolicyOpen(true)}
                  leftIcon={<LinkIcon className="w-4 h-4" />}
                >
                  Link Policy
                </Button>
              )}
            </div>
            <p className="text-xs text-surface-500 mb-3">
              Policies that serve as evidence for this control
            </p>
            {control.policyLinks?.length > 0 ? (
              <div className="space-y-2">
                {control.policyLinks.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-surface-100 rounded-lg group"
                  >
                    <Link
                      to={`/policies/${link.policy?.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0 hover:text-brand-700"
                    >
                      <DocumentTextIcon className="w-5 h-5 text-brand-700" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">
                          {link.policy?.title}
                        </p>
                        <p className="text-xs text-surface-500 capitalize">
                          {link.policy?.category?.replace(/_/g, ' ')} • v{link.policy?.version}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          link.policy?.status === 'published' || link.policy?.status === 'approved'
                            ? 'success'
                            : link.policy?.status === 'retired'
                              ? 'danger'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {link.policy?.status}
                      </Badge>
                      {hasPermission('policies:write') && (
                        <button
                          onClick={() => unlinkPolicyMutation.mutate(link.policy?.id)}
                          disabled={unlinkPolicyMutation.isPending}
                          className="p-1 text-surface-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <p className="text-surface-500 text-sm">No policies linked to this control.</p>
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
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Test History</h2>
            {implementation?.tests?.length > 0 ? (
              <div className="space-y-3">
                {implementation.tests.map((test: any) => (
                  <div
                    key={test.id}
                    className="flex items-start justify-between p-3 bg-surface-100 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            test.result === 'pass'
                              ? 'success'
                              : test.result === 'fail'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {test.result}
                        </Badge>
                        <span className="text-xs text-surface-500">{test.testType} test</span>
                      </div>
                      {test.findings && (
                        <p className="text-sm text-surface-600 mt-2">{test.findings}</p>
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
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-surface-500">Category</dt>
                <dd className="text-sm text-surface-800 capitalize mt-1">
                  {control.category.replace('_', ' ')}
                </dd>
              </div>
              {control.subcategory && (
                <div>
                  <dt className="text-xs text-surface-500">Subcategory</dt>
                  <dd className="text-sm text-surface-800 mt-1">{control.subcategory}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-surface-500">Type</dt>
                <dd className="text-sm text-surface-800 mt-1">
                  {control.isCustom ? 'Custom' : 'System'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-surface-500">Tags</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {control.tags?.length > 0 ? (
                    control.tags.map((tag: string) => (
                      <Badge key={tag} variant="neutral" size="sm">
                        {tag}
                      </Badge>
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
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Framework Mappings</h3>
            {control.mappings?.length > 0 ? (
              <div className="space-y-2">
                {control.mappings.map((mapping: any) => (
                  <div key={mapping.id} className="p-2 bg-surface-100 rounded-lg">
                    <p className="text-sm text-brand-700">{mapping.framework.name}</p>
                    <p className="text-xs text-surface-600 mt-1">
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
              <h3 className="text-sm font-semibold text-surface-900 mb-4">
                Implementation Guidance
              </h3>
              <p className="text-sm text-surface-600">{control.guidance}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments & Tasks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <CommentsPanel entityType="control" entityId={id!} />
        </div>
        <div className="card p-6">
          <TasksPanel entityType="control" entityId={id!} />
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
    queryFn: () =>
      policiesApi.list({ search: search.trim() || undefined, limit: 100 }).then((res) => res.data),
    staleTime: 0, // Always fetch fresh data
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      // Link each selected policy to this control
      await Promise.all(
        selectedPolicyIds.map((policyId) => policiesApi.linkToControls(policyId, [controlId]))
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
    <Dialog
      open
      onClose={onClose}
      title="Link Policies to Control"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => linkMutation.mutate()}
            disabled={selectedPolicyIds.length === 0 || linkMutation.isPending}
          >
            {linkMutation.isPending ? 'Linking...' : 'Link Policies'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-surface-600 mb-4">
        Select policies to link as evidence for this control:
      </p>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<DocumentTextIcon className="w-4 h-4" />}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
        {isLoadingPolicies ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-surface-300 rounded-full border-t-brand-500"></div>
            <span className="ml-2 text-surface-600">Searching...</span>
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
                  : 'bg-surface-100 hover:bg-surface-200'
              )}
            >
              <input
                type="checkbox"
                checked={selectedPolicyIds.includes(policy.id)}
                onChange={() => togglePolicy(policy.id)}
                className="rounded border-surface-400"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{policy.title}</p>
                <p className="text-xs text-surface-500 capitalize">
                  {policy.category?.replace(/_/g, ' ')} • v{policy.version} • {policy.status}
                </p>
              </div>
            </label>
          ))
        )}
      </div>

      {selectedPolicyIds.length > 0 && (
        <p className="text-sm text-surface-600 mt-3">
          {selectedPolicyIds.length} policy(ies) selected
        </p>
      )}
    </Dialog>
  );
}
