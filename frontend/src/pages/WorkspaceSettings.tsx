import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOfficeIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { useWorkspace, Workspace, WorkspaceMember } from '@/contexts/WorkspaceContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

import { Textarea } from '@/components/ui/Textarea';

const WORKSPACE_ROLES = [
  { value: 'owner', label: 'Owner', description: 'Full control of workspace' },
  { value: 'manager', label: 'Manager', description: 'Can manage controls, evidence, risks' },
  {
    value: 'contributor',
    label: 'Contributor',
    description: 'Can add evidence, update implementations',
  },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access' },
];

function AddMemberModal({
  isOpen,
  onClose,
  workspaceId,
  existingMemberIds,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  existingMemberIds: string[];
  onSuccess: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch organization users
  const { data: orgUsers = [] } = useQuery({
    queryKey: ['org-users'],
    queryFn: () => api.get('/api/users').then((r) => r.data?.data || r.data || []),
    enabled: isOpen,
  });

  const availableUsers = orgUsers.filter((user: any) => !existingMemberIds.includes(user.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setIsAdding(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/members`, {
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success('Member added to workspace');
      onSuccess();
      onClose();
      setSelectedUserId('');
      setSelectedRole('viewer');
    } catch {
      toast.error('Failed to add member');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add Member</h3>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Select User *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email} ({user.email})
                  </option>
                ))}
              </select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  All organization members are already in this workspace.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {WORKSPACE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUserId || isAdding}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkspaceSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { updateWorkspace, deleteWorkspace } = useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch workspace details
  const {
    data: workspace,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => api.get(`/api/workspaces/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  // Initialize form when workspace loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
    }
  }, [workspace]);

  // Update workspace mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Workspace>) => updateWorkspace(id!, data),
    onSuccess: () => {
      toast.success('Workspace updated');
      refetch();
    },
    onError: () => {
      toast.error('Failed to update workspace');
    },
  });

  // Update member role mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.put(`/api/workspaces/${id}/members/${userId}`, { role }),
    onSuccess: () => {
      toast.success('Member role updated');
      refetch();
    },
    onError: () => {
      toast.error('Failed to update member role');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/api/workspaces/${id}/members/${userId}`),
    onSuccess: () => {
      toast.success('Member removed');
      refetch();
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });

  // Delete workspace mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkspace(id!),
    onSuccess: () => {
      toast.success('Workspace archived');
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/settings/workspaces');
    },
    onError: () => {
      toast.error('Failed to archive workspace');
    },
  });

  const handleSaveBasicInfo = () => {
    if (!name.trim()) return;
    updateMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Workspace not found.</p>
      </div>
    );
  }

  const existingMemberIds = workspace.members?.map((m: WorkspaceMember) => m.userId) || [];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/settings/workspaces')}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-800 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="text-muted-foreground mt-1">{workspace.name}</p>
        </div>
      </div>
      {/* Basic Information */}
      <section className="bg-surface-800 rounded-lg p-6 border border-surface-700 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BuildingOfficeIcon className="w-5 h-5" />
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
            <input
              type="text"
              value={workspace.slug}
              disabled
              className="w-full px-3 py-2 bg-surface-700/50 border border-surface-600 rounded-lg text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The slug cannot be changed after creation.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={handleSaveBasicInfo}
              disabled={updateMutation.isPending || !name.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>
      {/* Members */}
      <section className="bg-surface-800 rounded-lg p-6 border border-surface-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Members</h2>
          <button
            onClick={() => setShowAddMember(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            <UserPlusIcon className="w-4 h-4" />
            Add Member
          </button>
        </div>

        <div className="space-y-2">
          {workspace.members?.map((member: WorkspaceMember) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-medium">
                  {member.user?.firstName?.[0] || member.user?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {member.user?.displayName || member.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateMemberMutation.mutate({ userId: member.userId, role: e.target.value })
                  }
                  className="px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded text-foreground focus:outline-none"
                >
                  {WORKSPACE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeMemberMutation.mutate(member.userId)}
                  className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded"
                  title="Remove member"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {(!workspace.members || workspace.members.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members in this workspace.
            </p>
          )}
        </div>
      </section>
      {/* Danger Zone */}
      <section className="bg-red-500/10 rounded-lg p-6 border border-red-500/30">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-foreground font-medium">Archive this workspace</p>
            <p className="text-sm text-muted-foreground">
              Once archived, the workspace will be hidden but data will be preserved.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Archive Workspace
          </button>
        </div>
      </section>
      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        workspaceId={id!}
        existingMemberIds={existingMemberIds}
        onSuccess={() => refetch()}
      />
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Archive Workspace?</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to archive <strong>{workspace.name}</strong>? This workspace
              will be hidden but data will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteConfirm(false);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Archiving...' : 'Archive Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
