import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { auditsApi, auditFindingsApi, auditRequestsApi } from '../lib/api';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import { ConfirmModal } from '@/components/Modal';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  planning: { label: 'Planning', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  fieldwork: { label: 'Fieldwork', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  testing: { label: 'Testing', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  reporting: { label: 'Reporting', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  completed: { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-surface-400', bgColor: 'bg-surface-500/20' },
};

const TYPE_LABELS: Record<string, string> = {
  internal: 'Internal',
  external: 'External',
  surveillance: 'Surveillance',
  certification: 'Certification',
};

interface Audit {
  id: string;
  auditId: string;
  name: string;
  description?: string;
  auditType: string;
  status: string;
  isExternal: boolean;
  auditFirm?: string;
  framework?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  _count?: {
    requests: number;
    findings: number;
    evidence: number;
    testResults: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Finding {
  id: string;
  findingNumber: string;
  title: string;
  severity: string;
  status: string;
}

interface AuditRequest {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  dueDate?: string;
}

export default function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Audit>>({});

  // Fetch audit details
  const { data: audit, isLoading, error } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => auditsApi.get(id!).then(res => res.data as unknown as Audit),
    enabled: !!id,
  });

  // Fetch related findings
  const { data: findings } = useQuery({
    queryKey: ['audit-findings', id],
    queryFn: () => auditFindingsApi.list({ auditId: id }).then(res => (res.data || []) as unknown as Finding[]),
    enabled: !!id,
  });

  // Fetch related requests
  const { data: requests } = useQuery({
    queryKey: ['audit-requests', id],
    queryFn: () => auditRequestsApi.list({ auditId: id }).then(res => (res.data || []) as unknown as AuditRequest[]),
    enabled: !!id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Audit>) => auditsApi.update(id!, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      setIsEditing(false);
      toast.success('Audit updated successfully');
    },
    onError: () => {
      toast.error('Failed to update audit');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => auditsApi.delete(id!),
    onSuccess: () => {
      toast.success('Audit deleted successfully');
      navigate('/audits');
    },
    onError: () => {
      toast.error('Failed to delete audit');
    },
  });

  useEffect(() => {
    if (audit) {
      setEditForm({
        name: audit.name,
        auditType: audit.auditType,
        status: audit.status,
        description: audit.description,
        auditFirm: audit.auditFirm,
        framework: audit.framework,
      });
    }
  }, [audit]);

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <SkeletonDetailSection />
        <SkeletonDetailSection />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Audit Not Found</h2>
        <p className="text-surface-400 mb-4">The audit you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/audits')}>Back to Audits</Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[audit.status] || STATUS_CONFIG.planning;
  const findingsArray = Array.isArray(findings) ? findings : [];
  const requestsArray = Array.isArray(requests) ? requests : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/audits')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">{audit.name}</h1>
              <span className="text-surface-500 font-mono">#{audit.auditId}</span>
              {audit.isExternal && (
                <span className="px-2 py-1 bg-purple-600/20 text-purple-400 rounded text-xs font-medium">
                  External
                </span>
              )}
            </div>
            <p className="text-surface-400 mt-1">
              {TYPE_LABELS[audit.auditType] || audit.auditType}
              {audit.framework && <span> • {audit.framework}</span>}
              {audit.auditFirm && <span> • {audit.auditFirm}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                leftIcon={<PencilIcon className="w-4 h-4" />}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                leftIcon={<TrashIcon className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status and Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4">
          <p className="text-surface-400 text-sm mb-1">Status</p>
          {isEditing ? (
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          ) : (
            <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium', statusConfig.bgColor, statusConfig.color)}>
              {statusConfig.label}
            </span>
          )}
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4">
          <p className="text-surface-400 text-sm mb-1">Start Date</p>
          <p className="text-white font-medium">
            {audit.plannedStartDate ? new Date(audit.plannedStartDate).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4">
          <p className="text-surface-400 text-sm mb-1">End Date</p>
          <p className="text-white font-medium">
            {audit.plannedEndDate ? new Date(audit.plannedEndDate).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4">
          <p className="text-surface-400 text-sm mb-1">Findings</p>
          <p className="text-white font-medium">{audit._count?.findings || findingsArray.length}</p>
        </div>
      </div>

      {/* Description */}
      {(audit.description || isEditing) && (
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Description</h2>
          {isEditing ? (
            <textarea
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={4}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
              placeholder="Audit description..."
            />
          ) : (
            <p className="text-surface-300">{audit.description || 'No description provided.'}</p>
          )}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Findings */}
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Findings</h2>
            <Link to={`/audit-findings?auditId=${id}`} className="text-brand-400 text-sm hover:text-brand-300">
              View all →
            </Link>
          </div>
          {findingsArray.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <ExclamationTriangleIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No findings recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {findingsArray.slice(0, 5).map((finding) => (
                <div key={finding.id} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{finding.title}</p>
                    <p className="text-surface-400 text-sm">{finding.findingNumber}</p>
                  </div>
                  <span className={clsx(
                    'px-2 py-1 rounded text-xs font-medium',
                    finding.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    finding.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    finding.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-surface-600 text-surface-300'
                  )}>
                    {finding.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requests */}
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Evidence Requests</h2>
            <Link to={`/audit-requests?auditId=${id}`} className="text-brand-400 text-sm hover:text-brand-300">
              View all →
            </Link>
          </div>
          {requestsArray.length === 0 ? (
            <div className="text-center py-8 text-surface-400">
              <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No evidence requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requestsArray.slice(0, 5).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{request.title}</p>
                    <p className="text-surface-400 text-sm">{request.requestNumber}</p>
                  </div>
                  <span className={clsx(
                    'px-2 py-1 rounded text-xs font-medium',
                    request.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    request.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-surface-600 text-surface-300'
                  )}>
                    {request.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
          <ClipboardDocumentListIcon className="w-8 h-8 mx-auto mb-2 text-blue-400" />
          <p className="text-2xl font-bold text-white">{audit._count?.requests || requestsArray.length}</p>
          <p className="text-surface-400 text-sm">Requests</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
          <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-purple-400" />
          <p className="text-2xl font-bold text-white">{audit._count?.evidence || 0}</p>
          <p className="text-surface-400 text-sm">Evidence</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
          <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
          <p className="text-2xl font-bold text-white">{audit._count?.testResults || 0}</p>
          <p className="text-surface-400 text-sm">Tests</p>
        </div>
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-orange-400" />
          <p className="text-2xl font-bold text-white">{audit._count?.findings || findingsArray.length}</p>
          <p className="text-surface-400 text-sm">Findings</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Audit"
        message={`Are you sure you want to delete "${audit.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
