import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CheckIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { usersApi, permissionsApi } from '../lib/api';
import { Dialog, Input, Select } from '@/components/ui';

interface User {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  groups: { id: string; name: string }[];
  createdAt: string;
}

interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  memberCount: number;
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', search, statusFilter, roleFilter],
    queryFn: () => usersApi.list({ search, status: statusFilter, role: roleFilter }).then(res => res.data),
  });

  // Fetch user stats
  const { data: statsData } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => usersApi.getStats().then(res => res.data),
  });

  // Fetch permission groups
  const { data: groupsData } = useQuery({
    queryKey: ['permission-groups'],
    queryFn: () => permissionsApi.listGroups().then(res => res.data),
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => usersApi.reactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Add to group mutation
  const addToGroupMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      usersApi.addToGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
    },
  });

  // Remove from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      usersApi.removeFromGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['permission-groups'] });
    },
  });

  const users = usersData?.users || [];
  const groups: PermissionGroup[] = groupsData || [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'inactive':
        return 'bg-red-50 text-red-800 border border-red-200';
      default:
        return 'bg-surface-100 text-surface-700 border border-surface-300';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-violet-50 text-violet-800 border border-violet-200';
      case 'compliance_manager':
        return 'bg-sky-50 text-sky-800 border border-sky-200';
      case 'auditor':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'viewer':
        return 'bg-surface-100 text-surface-700 border border-surface-300';
      default:
        return 'bg-surface-100 text-surface-700 border border-surface-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">User Management</h1>
          <p className="text-surface-600 mt-1">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-surface-200">
          <div className="text-surface-600 text-sm">Total Users</div>
          <div className="text-2xl font-bold text-surface-900 mt-1">{statsData?.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-surface-200">
          <div className="text-surface-600 text-sm">Active Users</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{statsData?.active || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-surface-200">
          <div className="text-surface-600 text-sm">Inactive Users</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{statsData?.inactive || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-surface-200">
          <div className="text-surface-600 text-sm">Permission Groups</div>
          <div className="text-2xl font-bold text-brand-700 mt-1">{groups.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-surface-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <div className="w-56">
            <Select
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'admin', label: 'Admin' },
                { value: 'compliance_manager', label: 'Compliance Manager' },
                { value: 'auditor', label: 'Auditor' },
                { value: 'viewer', label: 'Viewer' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white">
            <tr>
              <th className="text-left text-surface-600 font-medium px-4 py-3">User</th>
              <th className="text-left text-surface-600 font-medium px-4 py-3">Role</th>
              <th className="text-left text-surface-600 font-medium px-4 py-3">Groups</th>
              <th className="text-left text-surface-600 font-medium px-4 py-3">Status</th>
              <th className="text-left text-surface-600 font-medium px-4 py-3">Last Login</th>
              <th className="text-right text-surface-600 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-300">
            {usersLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-600">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-600">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: User) => (
                <tr key={user.id} className="hover:bg-surface-200/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-700 font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-surface-900 font-medium">{user.displayName}</div>
                        <div className="text-surface-600 text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${getRoleBadgeClass(user.role)}`}>
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.groups.length === 0 ? (
                        <span className="text-surface-500 text-sm">No groups</span>
                      ) : (
                        user.groups.slice(0, 2).map(group => (
                          <span
                            key={group.id}
                            className="px-2 py-0.5 bg-surface-300 rounded text-xs text-surface-800"
                          >
                            {group.name}
                          </span>
                        ))
                      )}
                      {user.groups.length > 2 && (
                        <span className="text-surface-600 text-xs">+{user.groups.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap ${getStatusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-600 text-sm">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowGroupsModal(true);
                        }}
                        className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-200 rounded-lg transition-colors"
                        title="Manage Groups"
                      >
                        <UserGroupIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        className="p-2 text-surface-600 hover:text-surface-900 hover:bg-surface-200 rounded-lg transition-colors"
                        title="View Permissions"
                      >
                        <ShieldCheckIcon className="w-5 h-5" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => deactivateMutation.mutate(user.id)}
                          className="p-2 text-surface-600 hover:text-red-600 hover:bg-surface-200 rounded-lg transition-colors"
                          title="Deactivate User"
                        >
                          <NoSymbolIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(user.id)}
                          className="p-2 text-surface-600 hover:text-emerald-600 hover:bg-surface-200 rounded-lg transition-colors"
                          title="Reactivate User"
                        >
                          <CheckIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Groups Modal */}
      {showGroupsModal && selectedUser && (
        <Dialog
          open={true}
          onClose={() => {
            setShowGroupsModal(false);
            setSelectedUser(null);
          }}
          size="md"
          title={`Manage Groups - ${selectedUser.displayName}`}
        >
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="text-surface-600 text-sm">
              Select permission groups for this user. Groups provide the initial set of permissions.
            </div>
            <div className="space-y-2">
              {groups.map((group) => {
                const isMember = selectedUser.groups.some(g => g.id === group.id);
                return (
                  <div
                    key={group.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isMember
                        ? 'bg-brand-50 border-brand-500'
                        : 'bg-white border-surface-200 hover:border-surface-300 hover:bg-surface-50'
                    }`}
                    onClick={() => {
                      if (isMember) {
                        removeFromGroupMutation.mutate({
                          userId: selectedUser.id,
                          groupId: group.id,
                        });
                        setSelectedUser({
                          ...selectedUser,
                          groups: selectedUser.groups.filter(g => g.id !== group.id),
                        });
                      } else {
                        addToGroupMutation.mutate({
                          userId: selectedUser.id,
                          groupId: group.id,
                        });
                        setSelectedUser({
                          ...selectedUser,
                          groups: [...selectedUser.groups, { id: group.id, name: group.name }],
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-surface-900 font-medium flex items-center gap-2">
                          {group.name}
                          {group.isSystem && (
                            <span className="text-xs bg-surface-300 text-surface-700 px-1.5 py-0.5 rounded">
                              System
                            </span>
                          )}
                        </div>
                        <div className="text-surface-600 text-sm">{group.description}</div>
                      </div>
                      {isMember && (
                        <CheckIcon className="w-5 h-5 text-brand-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

function PermissionsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['user-permissions', user.id],
    queryFn: () => permissionsApi.getUserPermissions(user.id).then(res => res.data),
  });

  return (
    <Dialog
      open={true}
      onClose={onClose}
      size="lg"
      title={`Permissions - ${user.displayName}`}
    >
      <div className="overflow-y-auto max-h-[60vh]">
        {isLoading ? (
          <div className="text-center text-surface-600 py-8">Loading permissions...</div>
        ) : (
          <div className="space-y-6">
            {/* Groups */}
            <div>
              <h3 className="text-sm font-medium text-surface-700 mb-2">Groups</h3>
              <div className="flex flex-wrap gap-2">
                {permissionsData?.groups?.length === 0 ? (
                  <span className="text-surface-500">No groups assigned</span>
                ) : (
                  permissionsData?.groups?.map((group: any) => (
                    <span
                      key={group.id}
                      className="px-3 py-1 bg-surface-200 rounded-md text-sm text-surface-900"
                    >
                      {group.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Effective Permissions */}
            <div>
              <h3 className="text-sm font-medium text-surface-700 mb-2">Effective Permissions</h3>
              <div className="space-y-2">
                {permissionsData?.effectivePermissions?.length === 0 ? (
                  <span className="text-surface-500">No permissions</span>
                ) : (
                  permissionsData?.effectivePermissions?.map((perm: any, idx: number) => (
                    <div key={idx} className="bg-surface-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-surface-900 font-medium capitalize">
                          {perm.resource.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                          perm.source === 'group'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {perm.source === 'group' ? `From: ${perm.groupName}` : 'Override'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perm.actions.map((action: string) => (
                          <span
                            key={action}
                            className="inline-flex items-center rounded-md border border-surface-300 bg-surface-100 px-2 py-0.5 text-xs font-medium capitalize text-surface-700 whitespace-nowrap"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                      {perm.scope && (
                        <div className="mt-2 text-xs text-surface-600">
                          Scope: {perm.scope.ownership || 'all'}
                          {perm.scope.tags?.length > 0 && ` | Tags: ${perm.scope.tags.join(', ')}`}
                          {perm.scope.categories?.length > 0 && ` | Categories: ${perm.scope.categories.join(', ')}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overrides */}
            {permissionsData?.overrides?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-surface-700 mb-2">Permission Overrides</h3>
                <div className="space-y-1">
                  {permissionsData.overrides.map((override: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-surface-200 rounded px-3 py-2">
                      <span className="text-surface-900">{override.permission}</span>
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                        override.granted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {override.granted ? 'Granted' : 'Denied'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}



