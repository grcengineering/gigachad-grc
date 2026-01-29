import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';

interface Workpaper {
  id: string;
  workpaperNumber: string;
  title: string;
  workpaperType: string;
  status: string;
  version: number;
  preparedBy: string;
  preparedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  preparedByUser?: { displayName: string };
  reviewedByUser?: { displayName: string };
  approvedByUser?: { displayName: string };
}

const statusConfig: Record<string, { icon: typeof CheckCircleIcon; color: string; label: string }> = {
  draft: { icon: DocumentTextIcon, color: 'text-surface-400', label: 'Draft' },
  pending_review: { icon: ClockIcon, color: 'text-yellow-400', label: 'Pending Review' },
  reviewed: { icon: CheckCircleIcon, color: 'text-blue-400', label: 'Reviewed' },
  approved: { icon: CheckCircleIcon, color: 'text-green-400', label: 'Approved' },
  rejected: { icon: XCircleIcon, color: 'text-red-400', label: 'Rejected' },
};

export default function AuditWorkpapers() {
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get('auditId') || '';
  const queryClient = useQueryClient();
  const toast = useToast();
  const [_selectedWorkpaper, _setSelectedWorkpaper] = useState<Workpaper | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    workpaperType: 'procedure',
    content: '',
  });

  const { data: workpapers = [], isLoading } = useQuery<Workpaper[]>({
    queryKey: ['workpapers', auditId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditId) params.set('auditId', auditId);
      const res = await fetch(`/api/audit/workpapers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch workpapers');
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/audit/workpapers/${id}/submit`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to submit workpaper');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workpapers'] });
      toast.success('Workpaper submitted for review');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, approved, notes }: { id: string; approved: boolean; notes: string }) => {
      const res = await fetch(`/api/audit/workpapers/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, notes }),
      });
      if (!res.ok) throw new Error('Failed to review workpaper');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workpapers'] });
      toast.success('Review completed');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`/api/audit/workpapers/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('Failed to approve workpaper');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workpapers'] });
      toast.success('Workpaper approved');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const res = await fetch('/api/audit/workpapers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, auditId: auditId || undefined }),
      });
      if (!res.ok) throw new Error('Failed to create workpaper');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workpapers'] });
      toast.success('Workpaper created');
      setShowCreateModal(false);
      setCreateForm({ title: '', workpaperType: 'procedure', content: '' });
    },
    onError: () => {
      toast.error('Failed to create workpaper');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    createMutation.mutate(createForm);
  };

  const handleReview = (id: string, approved: boolean) => {
    const notes = prompt(approved ? 'Review notes (optional):' : 'Rejection reason:');
    if (notes !== null) {
      reviewMutation.mutate({ id, approved, notes });
    }
  };

  const handleApprove = (id: string) => {
    const notes = prompt('Approval notes (optional):');
    if (notes !== null) {
      approveMutation.mutate({ id, notes });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Workpapers</h1>
          <p className="text-surface-400 mt-1">
            Formal documentation with version control and review workflow
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Workpaper
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = workpapers.filter(w => w.status === status).length;
          return (
            <div
              key={status}
              className="bg-surface-800 rounded-lg p-4 border border-surface-700"
            >
              <div className="flex items-center gap-2">
                <config.icon className={clsx('h-5 w-5', config.color)} />
                <span className="text-surface-400 text-sm">{config.label}</span>
              </div>
              <p className="text-2xl font-bold text-white mt-2">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Workpapers List */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-800 rounded-lg h-20" />
          ))}
        </div>
      ) : (
        <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-900">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Number</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Prepared By</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-400">Version</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-surface-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {workpapers.map((wp) => {
                const config = statusConfig[wp.status];
                return (
                  <tr key={wp.id} className="hover:bg-surface-700/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-brand-400">{wp.workpaperNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{wp.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-surface-400 capitalize">{wp.workpaperType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('flex items-center gap-2', config.color)}>
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-400">
                      {wp.preparedByUser?.displayName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-surface-400">v{wp.version}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {wp.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => submitMutation.mutate(wp.id)}
                          >
                            <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                            Submit
                          </Button>
                        )}
                        {wp.status === 'pending_review' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReview(wp.id, true)}
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-400" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReview(wp.id, false)}
                            >
                              <XCircleIcon className="h-4 w-4 mr-1 text-red-400" />
                              Reject
                            </Button>
                          </>
                        )}
                        {wp.status === 'reviewed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(wp.id)}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1 text-green-400" />
                            Final Approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {workpapers.length === 0 && (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-surface-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white">No workpapers yet</h3>
              <p className="text-surface-400 mt-2">
                Create your first workpaper to document audit procedures.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Workpaper Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-lg p-6 w-full max-w-lg border border-surface-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Create Workpaper</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-surface-700 rounded"
              >
                <XMarkIcon className="h-5 w-5 text-surface-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Workpaper title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Type
                </label>
                <select
                  value={createForm.workpaperType}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, workpaperType: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                >
                  <option value="procedure">Procedure</option>
                  <option value="walkthrough">Walkthrough</option>
                  <option value="testing">Testing</option>
                  <option value="analysis">Analysis</option>
                  <option value="summary">Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Content
                </label>
                <textarea
                  value={createForm.content}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white h-32"
                  placeholder="Workpaper content..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || !createForm.title.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Workpaper'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

