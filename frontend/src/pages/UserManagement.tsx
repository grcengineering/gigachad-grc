import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  XMarkIcon,
  CheckIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { usersApi, permissionsApi } from '../lib/api';

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
        return 'bg-emerald-500/20 text-emerald-400';
      case 'inactive':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-surface-600 text-surface-300';
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400';
      case 'compliance_manager':
        return 'bg-blue-500/20 text-blue-400';
      case 'auditor':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-surface-600 text-surface-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-surface-400 mt-1">Manage users, roles, and permissions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
          <div className="text-surface-400 text-sm">Total Users</div>
          <div className="text-2xl font-bold text-white mt-1">{statsData?.total || 0}</div>
        </div>
        <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
          <div className="text-surface-400 text-sm">Active Users</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{statsData?.active || 0}</div>
        </div>
        <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
          <div className="text-surface-400 text-sm">Inactive Users</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{statsData?.inactive || 0}</div>
        </div>
        <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
          <div className="text-surface-400 text-sm">Permission Groups</div>
          <div className="text-2xl font-bold text-brand-400 mt-1">{groups.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="compliance_manager">Compliance Manager</option>
            <option value="auditor">Auditor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-surface-800 rounded-lg border border-surface-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-900">
            <tr>
              <th className="text-left text-surface-400 font-medium px-4 py-3">User</th>
              <th className="text-left text-surface-400 font-medium px-4 py-3">Role</th>
              <th className="text-left text-surface-400 font-medium px-4 py-3">Groups</th>
              <th className="text-left text-surface-400 font-medium px-4 py-3">Status</th>
              <th className="text-left text-surface-400 font-medium px-4 py-3">Last Login</th>
              <th className="text-right text-surface-400 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700">
            {usersLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-400">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: User) => (
                <tr key={user.id} className="hover:bg-surface-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-medium">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.displayName}</div>
                        <div className="text-surface-400 text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                      {user.role.replace('_', ' ')}
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
                            className="px-2 py-0.5 bg-surface-600 rounded text-xs text-surface-200"
                          >
                            {group.name}
                          </span>
                        ))
                      )}
                      {user.groups.length > 2 && (
                        <span className="text-surface-400 text-xs">+{user.groups.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-sm">
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
                        className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                        title="Manage Groups"
                      >
                        <UserGroupIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPermissionsModal(true);
                        }}
                        className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                        title="View Permissions"
                      >
                        <ShieldCheckIcon className="w-5 h-5" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => deactivateMutation.mutate(user.id)}
                          className="p-2 text-surface-400 hover:text-red-400 hover:bg-surface-700 rounded-lg transition-colors"
                          title="Deactivate User"
                        >
                          <NoSymbolIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(user.id)}
                          className="p-2 text-surface-400 hover:text-emerald-400 hover:bg-surface-700 rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-lg w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Manage Groups - {selectedUser.displayName}
              </h2>
              <button
                onClick={() => {
                  setShowGroupsModal(false);
                  setSelectedUser(null);
                }}
                className="p-1 text-surface-400 hover:text-white"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              <div className="text-surface-400 text-sm">
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
                          ? 'bg-brand-500/20 border-brand-500'
                          : 'bg-surface-700 border-surface-600 hover:border-surface-500'
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
                          <div className="text-white font-medium flex items-center gap-2">
                            {group.name}
                            {group.isSystem && (
                              <span className="text-xs bg-surface-600 text-surface-300 px-1.5 py-0.5 rounded">
                                System
                              </span>
                            )}
                          </div>
                          <div className="text-surface-400 text-sm">{group.description}</div>
                        </div>
                        {isMember && (
                          <CheckIcon className="w-5 h-5 text-brand-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-800 rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-surface-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Permissions - {user.displayName}
          </h2>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center text-surface-400 py-8">Loading permissions...</div>
          ) : (
            <div className="space-y-6">
              {/* Groups */}
              <div>
                <h3 className="text-sm font-medium text-surface-300 mb-2">Groups</h3>
                <div className="flex flex-wrap gap-2">
                  {permissionsData?.groups?.length === 0 ? (
                    <span className="text-surface-500">No groups assigned</span>
                  ) : (
                    permissionsData?.groups?.map((group: any) => (
                      <span
                        key={group.id}
                        className="px-3 py-1 bg-surface-700 rounded-full text-sm text-white"
                      >
                        {group.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Effective Permissions */}
              <div>
                <h3 className="text-sm font-medium text-surface-300 mb-2">Effective Permissions</h3>
                <div className="space-y-2">
                  {permissionsData?.effectivePermissions?.length === 0 ? (
                    <span className="text-surface-500">No permissions</span>
                  ) : (
                    permissionsData?.effectivePermissions?.map((perm: any, idx: number) => (
                      <div key={idx} className="bg-surface-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium capitalize">
                            {perm.resource.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            perm.source === 'group' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {perm.source === 'group' ? `From: ${perm.groupName}` : 'Override'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {perm.actions.map((action: string) => (
                            <span
                              key={action}
                              className="px-2 py-0.5 bg-surface-600 rounded text-xs text-surface-200"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                        {perm.scope && (
                          <div className="mt-2 text-xs text-surface-400">
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
                  <h3 className="text-sm font-medium text-surface-300 mb-2">Permission Overrides</h3>
                  <div className="space-y-1">
                    {permissionsData.overrides.map((override: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-surface-700 rounded px-3 py-2">
                        <span className="text-white">{override.permission}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          override.granted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
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
      </div>
    </div>
  );
}



