import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonTable } from '@/components/Skeleton';
import { auditFindingsApi, auditsApi, usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useSelection, BulkActionsBar, SelectCheckbox } from '@/components/BulkActions';

interface Finding {
  id: string;
  findingNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  auditId: string;
  controlId?: string;
  requirementRef?: string;
  remediationPlan?: string;
  remediationOwner?: string;
  targetDate?: string;
  actualDate?: string;
  rootCause?: string;
  impact?: string;
  recommendation?: string;
  managementResponse?: string;
  tags: string[];
  identifiedAt: string;
  audit?: {
    id: string;
    name: string;
    auditId: string;
  };
  identifiedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface FindingStats {
  total: number;
  overdue: number;
  bySeverity: { severity: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { label: 'Low', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  observation: { label: 'Observation', color: 'text-surface-400', bgColor: 'bg-surface-500/20' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'text-red-400', icon: ExclamationTriangleIcon },
  acknowledged: { label: 'Acknowledged', color: 'text-yellow-400', icon: ClockIcon },
  remediation_planned: { label: 'Planned', color: 'text-blue-400', icon: ClockIcon },
  remediation_in_progress: { label: 'In Progress', color: 'text-cyan-400', icon: ArrowPathIcon },
  resolved: { label: 'Resolved', color: 'text-green-400', icon: CheckCircleIcon },
  accepted_risk: { label: 'Risk Accepted', color: 'text-purple-400', icon: XCircleIcon },
};

const CATEGORY_OPTIONS = [
  { value: 'control_deficiency', label: 'Control Deficiency' },
  { value: 'documentation_gap', label: 'Documentation Gap' },
  { value: 'process_issue', label: 'Process Issue' },
  { value: 'compliance_gap', label: 'Compliance Gap' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'remediation_planned', label: 'Remediation Planned' },
  { value: 'remediation_in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'accepted_risk', label: 'Risk Accepted' },
];

export default function AuditFindings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filters from URL
  const filters = {
    auditId: searchParams.get('auditId') || '',
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    category: searchParams.get('category') || '',
  };

  const setFilter = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  // Queries
  const { data: findings, isLoading } = useQuery({
    queryKey: ['audit-findings', filters],
    queryFn: () => auditFindingsApi.list(filters.auditId || filters.status || filters.severity || filters.category ? filters : undefined).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-findings-stats'],
    queryFn: () => auditFindingsApi.getStats().then(r => r.data),
  });

  const { data: audits } = useQuery({
    queryKey: ['audits'],
    queryFn: () => auditsApi.list().then(r => r.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data?.data || []),
  });

  const findingsData = (findings || []) as unknown as Finding[];
  const statsData = stats as FindingStats | undefined;

  // Bulk selection
  const selection = useSelection(findingsData);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => auditFindingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-findings-stats'] });
      setIsCreateModalOpen(false);
      toast.success('Finding created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create finding');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => auditFindingsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-findings-stats'] });
      setEditingFinding(null);
      toast.success('Finding updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update finding');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => auditFindingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-findings-stats'] });
      toast.success('Finding deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete finding');
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      auditFindingsApi.bulkUpdateStatus(ids, status),
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ['audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['audit-findings-stats'] });
      toast.success(`Updated ${ids.length} findings`);
      selection.clearSelection();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update findings');
    },
  });

  const handleBulkDelete = async () => {
    const count = selection.selectedItems.length;
    try {
      await Promise.all(selection.selectedItems.map((f: Finding) => deleteMutation.mutateAsync(f.id)));
      toast.success(`Deleted ${count} findings`);
      selection.clearSelection();
    } catch {
      toast.error('Failed to delete some findings');
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    const ids = selection.selectedItems.map((f: Finding) => f.id);
    bulkStatusMutation.mutate({ ids, status });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Audit Findings</h1>
          <p className="text-surface-400 mt-1">Track and remediate audit findings and observations</p>
        </div>
        <Button leftIcon={<PlusIcon className="w-5 h-5" />} onClick={() => setIsCreateModalOpen(true)}>
          New Finding
        </Button>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Total Findings</p>
            <p className="text-2xl font-bold text-white mt-1">{statsData.total}</p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Overdue</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{statsData.overdue}</p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Critical/High</p>
            <p className="text-2xl font-bold text-orange-400 mt-1">
              {(statsData.bySeverity.find(s => s.severity === 'critical')?.count || 0) +
               (statsData.bySeverity.find(s => s.severity === 'high')?.count || 0)}
            </p>
          </div>
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <p className="text-surface-400 text-sm">Open</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">
              {statsData.byStatus.find(s => s.status === 'open')?.count || 0}
            </p>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selection.selectedItems.length > 0 && (
        <BulkActionsBar
          selectedCount={selection.selectedItems.length}
          totalCount={findingsData.length}
          onClear={selection.clearSelection}
          actions={[
            { id: 'delete', label: 'Delete', variant: 'danger', requiresConfirmation: true, confirmMessage: 'Are you sure you want to delete these findings?' },
            ...STATUS_OPTIONS.map(s => ({
              id: `status-${s.value}`,
              label: `Set ${s.label}`,
              variant: 'secondary' as const,
            })),
          ]}
          onAction={(actionId) => {
            if (actionId === 'delete') {
              handleBulkDelete();
            } else if (actionId.startsWith('status-')) {
              const status = actionId.replace('status-', '');
              handleBulkStatusUpdate(status);
            }
          }}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<FunnelIcon className="w-4 h-4" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-surface-800 rounded-lg p-4 border border-surface-700 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Audit</label>
            <select
              value={filters.auditId}
              onChange={(e) => setFilter('auditId', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              <option value="">All Audits</option>
              {(audits as { id: string; name: string }[])?.map((audit) => (
                <option key={audit.id} value={audit.id}>{audit.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilter('severity', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              <option value="">All Severities</option>
              {Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Findings Table */}
      {isLoading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : !findingsData?.length ? (
        <EmptyState
          variant="warning"
          title="No findings yet"
          description="Audit findings will appear here as audits are conducted. Track open findings, assign remediation tasks, and monitor progress."
          action={{
            label: "Create Finding",
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      ) : (
        <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-700">
              <tr>
                <th className="w-10 px-4 py-3">
                  <SelectCheckbox
                    checked={selection.isAllSelected}
                    indeterminate={selection.isPartialSelected}
                    onChange={selection.toggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Finding</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Audit</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Severity</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Target Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-300">Owner</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {findingsData.map((finding) => {
                const severity = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
                const status = STATUS_CONFIG[finding.status] || STATUS_CONFIG.open;
                const StatusIcon = status.icon;
                const isOverdue = finding.targetDate && new Date(finding.targetDate) < new Date() && !['resolved', 'accepted_risk'].includes(finding.status);

                return (
                  <tr
                    key={finding.id}
                    className="hover:bg-surface-700/50 cursor-pointer"
                    onClick={() => setEditingFinding(finding)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <SelectCheckbox
                        checked={selection.isSelected(finding.id)}
                        onChange={() => selection.toggle(finding.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-surface-400 font-mono text-sm">{finding.findingNumber}</span>
                        <div>
                          <p className="text-white font-medium">{finding.title}</p>
                          <p className="text-surface-400 text-sm truncate max-w-md">{finding.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {finding.audit ? (
                        <Link
                          to={`/audits/${finding.audit.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-brand-400 hover:text-brand-300 text-sm"
                        >
                          {finding.audit.name}
                        </Link>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severity.bgColor} ${severity.color}`}>
                        {severity.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-1.5 ${status.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm">{status.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {finding.targetDate ? (
                        <span className={isOverdue ? 'text-red-400' : 'text-surface-300'}>
                          {new Date(finding.targetDate).toLocaleDateString()}
                          {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
                        </span>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-300 text-sm">
                      {finding.remediationOwner || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRightIcon className="w-5 h-5 text-surface-500" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || !!editingFinding}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingFinding(null);
        }}
        title={editingFinding ? 'Edit Finding' : 'Create Finding'}
        size="lg"
      >
        <FindingForm
          finding={editingFinding}
          audits={audits as { id: string; name: string }[]}
          users={users as { id: string; firstName: string; lastName: string; email: string }[]}
          onSubmit={(data) => {
            if (editingFinding) {
              updateMutation.mutate({ id: editingFinding.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onDelete={editingFinding ? () => {
            if (confirm('Are you sure you want to delete this finding?')) {
              deleteMutation.mutate(editingFinding.id);
              setEditingFinding(null);
            }
          } : undefined}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}

interface FindingFormProps {
  finding?: Finding | null;
  audits?: { id: string; name: string }[];
  users?: { id: string; firstName: string; lastName: string; email: string }[];
  onSubmit: (data: Record<string, unknown>) => void;
  onDelete?: () => void;
  isLoading: boolean;
}

function FindingForm({ finding, audits, users, onSubmit, onDelete, isLoading }: FindingFormProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [formData, setFormData] = useState({
    auditId: finding?.auditId || '',
    title: finding?.title || '',
    description: finding?.description || '',
    category: finding?.category || 'control_deficiency',
    severity: finding?.severity || 'medium',
    status: finding?.status || 'open',
    controlId: finding?.controlId || '',
    requirementRef: finding?.requirementRef || '',
    remediationPlan: finding?.remediationPlan || '',
    remediationOwner: finding?.remediationOwner || '',
    targetDate: finding?.targetDate ? finding.targetDate.split('T')[0] : '',
    rootCause: finding?.rootCause || '',
    impact: finding?.impact || '',
    recommendation: finding?.recommendation || '',
    managementResponse: finding?.managementResponse || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // organizationId must come from the authenticated user. Previously this
    // pulled from localStorage with an empty-string default, letting saves
    // slip through without tenant scoping.
    if (!user?.organizationId) {
      toast.error('Cannot save finding: not signed in');
      return;
    }
    onSubmit({
      ...formData,
      organizationId: user.organizationId,
      targetDate: formData.targetDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">
            Audit <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.auditId}
            onChange={(e) => setFormData({ ...formData, auditId: e.target.value })}
            required
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
          >
            <option value="">Select Audit</option>
            {audits?.map((audit) => (
              <option key={audit.id} value={audit.id}>{audit.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Finding title"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={3}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Detailed description of the finding"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
          >
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Severity</label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
          >
            {Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {finding && (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-surface-300 mb-1">Target Date</label>
          <input
            type="date"
            value={formData.targetDate}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
          />
        </div>

        <div className={finding ? '' : 'col-span-2'}>
          <label className="block text-sm font-medium text-surface-300 mb-1">Remediation Owner</label>
          <select
            value={formData.remediationOwner}
            onChange={(e) => setFormData({ ...formData, remediationOwner: e.target.value })}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
          >
            <option value="">Select Owner</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">Root Cause</label>
          <textarea
            value={formData.rootCause}
            onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Root cause analysis"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">Impact</label>
          <textarea
            value={formData.impact}
            onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Business impact of this finding"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">Recommendation</label>
          <textarea
            value={formData.recommendation}
            onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Recommended remediation steps"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-surface-300 mb-1">Remediation Plan</label>
          <textarea
            value={formData.remediationPlan}
            onChange={(e) => setFormData({ ...formData, remediationPlan: e.target.value })}
            rows={2}
            className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
            placeholder="Detailed remediation plan"
          />
        </div>

        {finding && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-surface-300 mb-1">Management Response</label>
            <textarea
              value={formData.managementResponse}
              onChange={(e) => setFormData({ ...formData, managementResponse: e.target.value })}
              rows={2}
              className="w-full bg-surface-700 border border-surface-600 rounded-md px-3 py-2 text-white"
              placeholder="Management's response to this finding"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-surface-700">
        {onDelete && (
          <Button type="button" variant="danger" onClick={onDelete}>
            Delete Finding
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button type="submit" isLoading={isLoading}>
            {finding ? 'Update Finding' : 'Create Finding'}
          </Button>
        </div>
      </div>
    </form>
  );
}
