import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi, controlsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  TagIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Badge, Button, Dialog, Input, Select, Textarea, type BadgeVariant } from '@/components/ui';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; next?: string[] }> = {
  draft: { label: 'Draft', variant: 'neutral', next: ['in_review'] },
  in_review: { label: 'In Review', variant: 'warning', next: ['approved', 'draft'] },
  approved: { label: 'Approved', variant: 'success', next: ['published', 'in_review'] },
  published: { label: 'Published', variant: 'info', next: ['retired'] },
  retired: { label: 'Retired', variant: 'danger', next: [] },
};

const CATEGORY_OPTIONS = [
  { value: 'information_security', label: 'Information Security' },
  { value: 'acceptable_use', label: 'Acceptable Use' },
  { value: 'data_privacy', label: 'Data Privacy' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'access_control', label: 'Access Control' },
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'change_management', label: 'Change Management' },
  { value: 'risk_management', label: 'Risk Management' },
  { value: 'vendor_management', label: 'Vendor Management' },
  { value: 'other', label: 'Other' },
];

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLinkControlOpen, setIsLinkControlOpen] = useState(false);
  const [statusChangeModal, setStatusChangeModal] = useState<{ isOpen: boolean; targetStatus: string | null }>({
    isOpen: false,
    targetStatus: null,
  });
  const [statusChangeNotes, setStatusChangeNotes] = useState('');

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => policiesApi.get(id!).then((res) => res.data),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) => 
      policiesApi.updateStatus(id!, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Status updated');
      setStatusChangeModal({ isOpen: false, targetStatus: null });
      setStatusChangeNotes('');
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => policiesApi.delete(id!),
    onSuccess: () => {
      toast.success('Policy deleted');
      window.location.href = '/policies';
    },
    onError: () => {
      toast.error('Failed to delete policy');
    },
  });

  const unlinkControlMutation = useMutation({
    mutationFn: (controlId: string) => policiesApi.unlinkFromControl(id!, controlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', id] });
      toast.success('Control unlinked');
    },
    onError: () => {
      toast.error('Failed to unlink control');
    },
  });

  const handleDownload = async () => {
    try {
      const { data } = await policiesApi.getDownloadUrl(id!);
      window.open(data.url, '_blank');
    } catch {
      toast.error('Failed to get download URL');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-300 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-600">Policy not found</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[policy.status] || STATUS_CONFIG.draft;
  const canEdit = hasPermission('policies:write');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/policies"
          className="inline-flex items-center text-sm text-surface-600 hover:text-surface-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Policies
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-surface-100 rounded-xl">
              <DocumentTextIcon className="w-8 h-8 text-brand-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-surface-900">{policy.title}</h1>
              <p className="text-surface-600 mt-1">{policy.description || 'No description'}</p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                <span className="text-surface-500">•</span>
                <span className="font-mono text-surface-600">v{policy.version}</span>
                <span className="text-surface-500">•</span>
                <span className="text-surface-600 capitalize">
                  {policy.category?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}>
              Download
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditOpen(true)}
                  leftIcon={<PencilIcon className="w-4 h-4" />}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsNewVersionOpen(true)}
                  leftIcon={<ArrowUpTrayIcon className="w-4 h-4" />}
                >
                  New Version
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Preview</h2>
            <div className="border border-surface-200 rounded-lg overflow-hidden bg-surface-50">
              {policy.mimeType === 'application/pdf' ? (
                <iframe
                  src={policiesApi.getPreviewUrl(id!)}
                  className="w-full h-[800px]"
                  title={policy.title}
                />
              ) : policy.mimeType?.startsWith('image/') ? (
                <img
                  src={policiesApi.getPreviewUrl(id!)}
                  alt={policy.title}
                  className="max-w-full h-auto mx-auto"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-surface-500">
                  <DocumentTextIcon className="w-16 h-16 mb-4" />
                  <p>Preview not available for this file type</p>
                  <Button variant="outline" onClick={handleDownload} leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />} className="mt-4">
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Version History</h2>
            {policy.versions?.length > 0 ? (
              <div className="space-y-3">
                {policy.versions.map((version: any, index: number) => (
                  <div
                    key={version.id}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-lg',
                      index === 0 ? 'bg-brand-500/10 border border-brand-500/30' : 'bg-surface-100'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-surface-800">v{version.version}</span>
                        {index === 0 && (
                          <Badge variant="info" size="sm">Current</Badge>
                        )}
                      </div>
                      {version.changeNotes && (
                        <p className="text-sm text-surface-600 mt-1">{version.changeNotes}</p>
                      )}
                      <p className="text-xs text-surface-500 mt-1">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500">No version history</p>
            )}
          </div>

          {/* Status Audit Trail */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Status History</h2>
            <p className="text-xs text-surface-500 mb-3">
              Audit trail showing who moved this policy through workflow stages
            </p>
            {policy.statusHistory?.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-surface-200" />
                
                <div className="space-y-4">
                  {policy.statusHistory.map((entry: any, index: number) => (
                    <div key={entry.id} className="relative flex gap-4 pl-10">
                      {/* Timeline dot */}
                      <div
                        className={clsx(
                          'absolute left-2.5 w-3 h-3 rounded-full border-2 border-surface-900',
                          index === 0 ? 'bg-brand-500' : 'bg-surface-300'
                        )}
                      />
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.fromStatus ? (
                            <>
                              <Badge variant={STATUS_CONFIG[entry.fromStatus]?.variant || 'neutral'} size="sm">
                                {STATUS_CONFIG[entry.fromStatus]?.label || entry.fromStatus}
                              </Badge>
                              <span className="text-surface-500">→</span>
                            </>
                          ) : null}
                          <Badge variant={STATUS_CONFIG[entry.toStatus]?.variant || 'neutral'} size="sm">
                            {STATUS_CONFIG[entry.toStatus]?.label || entry.toStatus}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 text-sm">
                          <span className="text-surface-800 font-medium">
                            {entry.changedByName || entry.changedBy?.displayName || 'Unknown'}
                          </span>
                          <span className="text-surface-500 ml-2">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        
                        {entry.notes && (
                          <p className="mt-1 text-sm text-surface-600 italic">
                            "{entry.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-surface-500">No status history available</p>
            )}
          </div>

          {/* Linked Controls (Policy as Evidence) */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">Linked Controls</h2>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkControlOpen(true)}
                  leftIcon={<LinkIcon className="w-4 h-4" />}
                >
                  Link to Control
                </Button>
              )}
            </div>
            <p className="text-xs text-surface-500 mb-3">
              This policy serves as evidence for the following controls:
            </p>
            {policy.controlLinks?.length > 0 ? (
              <div className="space-y-2">
                {policy.controlLinks.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-surface-100 rounded-lg group"
                  >
                    <Link
                      to={`/controls/${link.control?.id}`}
                      className="flex items-center gap-3 flex-1 hover:text-brand-700"
                    >
                      <LinkIcon className="w-4 h-4 text-brand-700" />
                      <div>
                        <p className="font-mono text-sm text-brand-700">
                          {link.control?.controlId}
                        </p>
                        <p className="text-sm text-surface-800">{link.control?.title}</p>
                      </div>
                    </Link>
                    {canEdit && (
                      <button
                        onClick={() => unlinkControlMutation.mutate(link.control?.id)}
                        className="p-1 text-surface-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Unlink"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-surface-500">No controls linked to this policy</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canEdit && statusConfig.next && statusConfig.next.length > 0 && (
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-4">Workflow Actions</h3>
              <div className="space-y-2">
                {statusConfig.next.map((nextStatus) => {
                  const nextConfig = STATUS_CONFIG[nextStatus];
                  return (
                    <Button
                      key={nextStatus}
                      variant="outline"
                      fullWidth
                      onClick={() => setStatusChangeModal({ isOpen: true, targetStatus: nextStatus })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Move to {nextConfig.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">Details</h3>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-surface-500">Owner</dt>
                  <dd className="text-sm text-surface-800">
                    {policy.owner?.displayName || 'Unassigned'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-surface-500">Effective Date</dt>
                  <dd className="text-sm text-surface-800">
                    {policy.effectiveDate
                      ? new Date(policy.effectiveDate).toLocaleDateString()
                      : 'Not set'}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ClockIcon className="w-5 h-5 text-surface-500 mt-0.5" />
                <div>
                  <dt className="text-xs text-surface-500">Next Review Due</dt>
                  <dd
                    className={clsx(
                      'text-sm',
                      policy.nextReviewDue && new Date(policy.nextReviewDue) < new Date()
                        ? 'text-red-600'
                        : 'text-surface-800'
                    )}
                  >
                    {policy.nextReviewDue
                      ? new Date(policy.nextReviewDue).toLocaleDateString()
                      : 'Not set'}
                  </dd>
                </div>
              </div>
              {policy.tags?.length > 0 && (
                <div className="flex items-start gap-3">
                  <TagIcon className="w-5 h-5 text-surface-500 mt-0.5" />
                  <div>
                    <dt className="text-xs text-surface-500">Tags</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {policy.tags.map((tag: string) => (
                        <Badge key={tag} variant="neutral" size="sm">
                          {tag}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          {/* File Info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-surface-900 mb-4">File Information</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-surface-500">Filename</dt>
                <dd className="text-surface-800 truncate ml-2">{policy.filename}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">Type</dt>
                <dd className="text-surface-800">{policy.mimeType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">Size</dt>
                <dd className="text-surface-800">{formatFileSize(policy.size)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">Uploaded</dt>
                <dd className="text-surface-800">
                  {new Date(policy.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Danger Zone */}
          {canEdit && (
            <div className="card p-6 border-red-500/30">
              <h3 className="text-sm font-semibold text-red-600 mb-4">Danger Zone</h3>
              <Button
                variant="danger"
                fullWidth
                onClick={() => {
                  if (confirm('Are you sure you want to delete this policy?')) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
                leftIcon={<TrashIcon className="w-4 h-4" />}
              >
                Delete Policy
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Version Modal */}
      {isNewVersionOpen && (
        <NewVersionModal
          policyId={id!}
          currentVersion={policy.version}
          onClose={() => setIsNewVersionOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['policy', id] });
            setIsNewVersionOpen(false);
          }}
        />
      )}

      {isEditOpen && (
        <EditPolicyModal
          policy={policy}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['policy', id] });
            queryClient.invalidateQueries({ queryKey: ['policies'] });
            setIsEditOpen(false);
          }}
        />
      )}

      {isLinkControlOpen && (
        <LinkControlModal
          policyId={id!}
          existingControlIds={policy.controlLinks?.map((l: any) => l.control?.id) || []}
          onClose={() => setIsLinkControlOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['policy', id] });
            setIsLinkControlOpen(false);
          }}
        />
      )}

      {/* Status Change Modal */}
      <Dialog
        open={statusChangeModal.isOpen && !!statusChangeModal.targetStatus}
        onClose={() => {
          setStatusChangeModal({ isOpen: false, targetStatus: null });
          setStatusChangeNotes('');
        }}
        title="Change Status"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStatusChangeModal({ isOpen: false, targetStatus: null });
                setStatusChangeNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                statusChangeModal.targetStatus &&
                updateStatusMutation.mutate({
                  status: statusChangeModal.targetStatus,
                  notes: statusChangeNotes || undefined,
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </>
        }
      >
        {statusChangeModal.targetStatus && (
          <>
            <div className="mb-4">
              <p className="text-surface-700">
                Move this policy from{' '}
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                {' '}to{' '}
                <Badge variant={STATUS_CONFIG[statusChangeModal.targetStatus]?.variant || 'neutral'}>
                  {STATUS_CONFIG[statusChangeModal.targetStatus]?.label}
                </Badge>
              </p>
            </div>

            <div className="mb-4">
              <label className="label">Notes (optional)</label>
              <Textarea
                value={statusChangeNotes}
                onChange={(e) => setStatusChangeNotes(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Add notes about this status change..."
              />
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}

function NewVersionModal({
  policyId,
  currentVersion,
  onClose,
  onSuccess,
}: {
  policyId: string;
  currentVersion: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [versionNumber, setVersionNumber] = useState(() => {
    const parts = currentVersion.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    return `${parts[0]}.${minor}`;
  });
  const [changeNotes, setChangeNotes] = useState('');

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected');
      return policiesApi.uploadNewVersion(policyId, file, versionNumber, changeNotes);
    },
    onSuccess: () => {
      toast.success('New version uploaded!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload new version');
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Upload New Version"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !versionNumber || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Version'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">File *</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="input mt-1"
            accept=".pdf,.doc,.docx,.txt"
          />
        </div>

        <div>
          <label className="label">Version Number *</label>
          <Input
            type="text"
            value={versionNumber}
            onChange={(e) => setVersionNumber(e.target.value)}
            className="mt-1"
            placeholder="e.g., 2.0"
          />
          <p className="text-xs text-surface-500 mt-1">Current: v{currentVersion}</p>
        </div>

        <div>
          <label className="label">Change Notes</label>
          <Textarea
            value={changeNotes}
            onChange={(e) => setChangeNotes(e.target.value)}
            className="mt-1"
            rows={3}
            placeholder="What changed in this version?"
          />
        </div>
      </div>
    </Dialog>
  );
}

function LinkControlModal({
  policyId,
  existingControlIds,
  onClose,
  onSuccess,
}: {
  policyId: string;
  existingControlIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedControlIds, setSelectedControlIds] = useState<string[]>([]);

  const { data: controlsData } = useQuery({
    queryKey: ['controls-for-linking', search],
    queryFn: () => controlsApi.list({ search: search || undefined, limit: 50 }).then((res) => res.data),
  });

  const linkMutation = useMutation({
    mutationFn: () => policiesApi.linkToControls(policyId, selectedControlIds),
    onSuccess: () => {
      toast.success('Policy linked to controls!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link controls');
    },
  });

  const availableControls = (controlsData?.data || []).filter(
    (c: any) => !existingControlIds.includes(c.id)
  );

  const toggleControl = (controlId: string) => {
    setSelectedControlIds((prev) =>
      prev.includes(controlId) ? prev.filter((id) => id !== controlId) : [...prev, controlId]
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Link Policy to Controls"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => linkMutation.mutate()}
            disabled={selectedControlIds.length === 0 || linkMutation.isPending}
          >
            {linkMutation.isPending ? 'Linking...' : 'Link to Controls'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-surface-600 mb-4">
        Select controls to link this policy as evidence:
      </p>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search controls..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<LinkIcon className="w-4 h-4" />}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px]">
        {availableControls.length === 0 ? (
          <p className="text-surface-500 text-center py-8">
            {search ? 'No controls found' : 'All controls are already linked'}
          </p>
        ) : (
          availableControls.map((control: any) => (
            <label
              key={control.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                selectedControlIds.includes(control.id)
                  ? 'bg-brand-500/20 border border-brand-500/50'
                  : 'bg-surface-100 hover:bg-surface-200'
              )}
            >
              <input
                type="checkbox"
                checked={selectedControlIds.includes(control.id)}
                onChange={() => toggleControl(control.id)}
                className="rounded border-surface-400"
              />
              <div>
                <p className="font-mono text-sm text-brand-700">{control.controlId}</p>
                <p className="text-sm text-surface-800">{control.title}</p>
              </div>
            </label>
          ))
        )}
      </div>

      {selectedControlIds.length > 0 && (
        <p className="text-sm text-surface-600 mt-3">
          {selectedControlIds.length} control(s) selected
        </p>
      )}
    </Dialog>
  );
}

function EditPolicyModal({
  policy,
  onClose,
  onSuccess,
}: {
  policy: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(policy.title);
  const [description, setDescription] = useState(policy.description || '');
  const [category, setCategory] = useState(policy.category);
  const [effectiveDate, setEffectiveDate] = useState(
    policy.effectiveDate ? new Date(policy.effectiveDate).toISOString().split('T')[0] : ''
  );
  const [nextReviewDue, setNextReviewDue] = useState(
    policy.nextReviewDue ? new Date(policy.nextReviewDue).toISOString().split('T')[0] : ''
  );
  const [tags, setTags] = useState((policy.tags || []).join(', '));

  const updateMutation = useMutation({
    mutationFn: () =>
      policiesApi.update(policy.id, {
        title,
        description: description || undefined,
        category,
        effectiveDate: effectiveDate || undefined,
        nextReviewDate: nextReviewDue || undefined,
        tags: tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      }),
    onSuccess: () => {
      toast.success('Policy updated!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update policy');
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit Policy"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => updateMutation.mutate()}
            disabled={!title || !category || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>

        <div>
          <label className="label">Category *</label>
          <div className="mt-1">
            <Select
              value={category}
              onChange={setCategory}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Effective Date</label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="label">Next Review Due</label>
            <Input
              type="date"
              value={nextReviewDue}
              onChange={(e) => setNextReviewDue(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <label className="label">Tags (comma-separated)</label>
          <Input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1"
            placeholder="e.g., security, compliance, annual"
          />
        </div>
      </div>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

