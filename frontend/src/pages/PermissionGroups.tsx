import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { permissionsApi } from '../lib/api';
import { Button, CategoryChip, Dialog, Input } from '@/components/ui';
import { toTitleCase } from '@/lib/categoryStyle';

const RESOURCES = [
  { id: 'controls', label: 'Controls', description: 'Security and compliance controls' },
  { id: 'evidence', label: 'Evidence', description: 'Evidence artifacts and documents' },
  { id: 'policies', label: 'Policies', description: 'Policy documents and lifecycle' },
  { id: 'frameworks', label: 'Frameworks', description: 'Compliance frameworks' },
  { id: 'integrations', label: 'Integrations', description: 'Third-party integrations' },
  { id: 'audit_logs', label: 'Audit Logs', description: 'System audit logs' },
  { id: 'users', label: 'Users', description: 'User management' },
  { id: 'permissions', label: 'Permissions', description: 'Roles and permissions' },
  { id: 'settings', label: 'Settings', description: 'System settings' },
  { id: 'dashboard', label: 'Dashboard', description: 'Dashboard and analytics' },
];

const ACTIONS = ['read', 'create', 'update', 'delete', 'assign', 'approve', 'export'];

interface Permission {
  resource: string;
  actions: string[];
  scope?: { ownership?: string; tags?: string[]; categories?: string[] };
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PermissionGroups() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [showMembersModal, setShowMembersModal] = useState<PermissionGroup | null>(null);

  const { data: groups, isLoading } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => permissionsApi.listGroups().then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionsApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => permissionsApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Permission Groups</h1>
          <p className="text-surface-600 mt-1">Define roles and their access levels</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => seedMutation.mutate()}
            className="px-4 py-2 bg-surface-200 text-surface-900 rounded-lg hover:bg-surface-300 transition-colors"
          >
            Seed Defaults
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="text-center text-surface-600 py-12">Loading permission groups...</div>
      ) : groups?.length === 0 ? (
        <div className="bg-white rounded-lg border border-surface-200 p-8 text-center">
          <UserGroupIcon className="w-12 h-12 mx-auto text-surface-500 mb-3" />
          <h3 className="text-lg font-medium text-surface-900 mb-1">No Permission Groups</h3>
          <p className="text-surface-600 mb-4">
            Create your first permission group or seed the defaults to get started.
          </p>
          <button
            onClick={() => seedMutation.mutate()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Seed Default Groups
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups?.map((group: PermissionGroup) => (
            <div key={group.id} className="bg-white rounded-lg border border-surface-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-surface-900">{group.name}</h3>
                    <span
                      className={
                        group.isSystem
                          ? 'inline-flex items-center rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800 uppercase tracking-wider'
                          : 'inline-flex items-center rounded-md border border-surface-300 bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-700 uppercase tracking-wider'
                      }
                    >
                      {group.isSystem ? 'System' : 'Custom'}
                    </span>
                  </div>
                  <p className="text-surface-600 text-sm mt-1">{group.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowMembersModal(group)}
                    className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-200 rounded-lg"
                    title="View Members"
                  >
                    <UserGroupIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setEditingGroup(group)}
                    className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-200 rounded-lg"
                    title="Edit Group"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>
                  {!group.isSystem && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete permission group "${group.name}"?`)) {
                          deleteMutation.mutate(group.id);
                        }
                      }}
                      className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-200 rounded-lg"
                      title="Delete Group"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Permission Summary */}
              <div className="space-y-2">
                <div className="text-xs text-surface-500 uppercase tracking-wider">Permissions</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.permissions.slice(0, 8).map((perm, idx) => (
                    <CategoryChip
                      key={idx}
                      value={perm.resource}
                      label={`${toTitleCase(perm.resource)} · ${perm.actions.length}`}
                    />
                  ))}
                  {group.permissions.length > 8 && (
                    <span className="px-2 py-0.5 text-xs text-surface-600">
                      +{group.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-300 flex items-center justify-between text-sm text-surface-600">
                <span>
                  {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                </span>
                <span>Updated {new Date(group.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingGroup) && (
        <PermissionGroupModal
          group={editingGroup}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGroup(null);
          }}
        />
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <GroupMembersModal group={showMembersModal} onClose={() => setShowMembersModal(null)} />
      )}
    </div>
  );
}

function PermissionGroupModal({
  group,
  onClose,
}: {
  group: PermissionGroup | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [permissions, setPermissions] = useState<Record<string, string[]>>(
    group?.permissions.reduce((acc, p) => ({ ...acc, [p.resource]: p.actions }), {}) || {}
  );

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: Permission[] }) =>
      permissionsApi.createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string; permissions?: Permission[] }) =>
      permissionsApi.updateGroup(group!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
      onClose();
    },
  });

  const toggleAction = (resource: string, action: string) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      if (current.includes(action)) {
        const updated = current.filter((a) => a !== action);
        if (updated.length === 0) {
          const { [resource]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [resource]: updated };
      }
      return { ...prev, [resource]: [...current, action] };
    });
  };

  const toggleAllActions = (resource: string) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      if (current.length === ACTIONS.length) {
        const { [resource]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [resource]: [...ACTIONS] };
    });
  };

  const handleSubmit = () => {
    const permissionsList: Permission[] = Object.entries(permissions)
      .filter(([_, actions]) => actions.length > 0)
      .map(([resource, actions]) => ({
        resource,
        actions,
        scope: { ownership: 'all' },
      }));

    if (group) {
      updateMutation.mutate({ name, description, permissions: permissionsList });
    } else {
      createMutation.mutate({ name, description, permissions: permissionsList });
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      size="xl"
      title={group ? 'Edit Permission Group' : 'Create Permission Group'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
          >
            {group ? 'Save Changes' : 'Create Group'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Name and Description */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-1">Group Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Compliance Manager"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-1">Description</label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role"
            />
          </div>
        </div>

        {/* Permission Matrix */}
        <div>
          <label className="block text-sm text-surface-600 mb-3">Permission Matrix</label>
          <div className="bg-white rounded-lg border border-surface-300 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-100">
                  <th className="text-left text-surface-600 font-medium px-4 py-3 w-48">
                    Resource
                  </th>
                  {ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="text-center text-surface-600 font-medium px-2 py-3 text-xs uppercase"
                    >
                      {action}
                    </th>
                  ))}
                  <th className="text-center text-surface-600 font-medium px-2 py-3 text-xs uppercase">
                    All
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-300">
                {RESOURCES.map((resource) => {
                  const currentActions = permissions[resource.id] || [];
                  const allSelected = currentActions.length === ACTIONS.length;
                  return (
                    <tr key={resource.id} className="hover:bg-surface-100/50">
                      <td className="px-4 py-3">
                        <div className="text-surface-900 text-sm font-medium">{resource.label}</div>
                        <div className="text-surface-500 text-xs">{resource.description}</div>
                      </td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="text-center px-2 py-3">
                          <button
                            onClick={() => toggleAction(resource.id, action)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                              currentActions.includes(action)
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-surface-400 hover:border-surface-500'
                            }`}
                          >
                            {currentActions.includes(action) && (
                              <CheckIcon className="w-4 h-4 text-surface-900" />
                            )}
                          </button>
                        </td>
                      ))}
                      <td className="text-center px-2 py-3">
                        <button
                          onClick={() => toggleAllActions(resource.id)}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                            allSelected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-surface-400 hover:border-surface-500'
                          }`}
                        >
                          {allSelected && <CheckIcon className="w-4 h-4 text-surface-900" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function GroupMembersModal({ group, onClose }: { group: PermissionGroup; onClose: () => void }) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => permissionsApi.getGroupMembers(group.id).then((res) => res.data),
  });

  return (
    <Dialog open={true} onClose={onClose} size="md" title={`Members of ${group.name}`}>
      <div className="overflow-y-auto max-h-[60vh]">
        {isLoading ? (
          <div className="text-center text-surface-600 py-8">Loading members...</div>
        ) : members?.length === 0 ? (
          <div className="text-center text-surface-600 py-8">No members in this group</div>
        ) : (
          <div className="space-y-2">
            {members?.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-surface-200 rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-700 font-medium">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-surface-900 font-medium">{member.displayName}</div>
                  <div className="text-surface-600 text-sm">{member.email}</div>
                </div>
                <div className="text-surface-500 text-xs">
                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
