import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../lib/api';

export type Resource =
  | 'controls'
  | 'evidence'
  | 'policies'
  | 'frameworks'
  | 'integrations'
  | 'audit_logs'
  | 'users'
  | 'permissions'
  | 'settings'
  | 'dashboard';

export type Action = 'read' | 'create' | 'update' | 'delete' | 'assign' | 'approve' | 'export';

interface EffectivePermission {
  resource: Resource;
  actions: Action[];
  scope: {
    ownership?: 'all' | 'owned' | 'assigned';
    tags?: string[];
    categories?: string[];
  };
  source: 'group' | 'override';
  groupName?: string;
}

interface UserPermissions {
  userId: string;
  groups: { id: string; name: string }[];
  effectivePermissions: EffectivePermission[];
  overrides: { permission: string; granted: boolean; resourceScope?: any }[];
}

/**
 * Hook to fetch and check user permissions
 */
export function usePermissions() {
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => usersApi.getMe().then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const permissions: UserPermissions | null = currentUser?.permissions || null;

  /**
   * Check if user has permission to perform action on resource
   */
  const hasPermission = (resource: Resource, action: Action): boolean => {
    if (!permissions) return false;

    const perm = permissions.effectivePermissions.find(p => p.resource === resource);
    if (!perm) return false;

    return perm.actions.includes(action);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (checks: { resource: Resource; action: Action }[]): boolean => {
    return checks.some(({ resource, action }) => hasPermission(resource, action));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (checks: { resource: Resource; action: Action }[]): boolean => {
    return checks.every(({ resource, action }) => hasPermission(resource, action));
  };

  /**
   * Get all actions user can perform on a resource
   */
  const getResourceActions = (resource: Resource): Action[] => {
    if (!permissions) return [];

    const perm = permissions.effectivePermissions.find(p => p.resource === resource);
    return perm?.actions || [];
  };

  /**
   * Check if user can perform action considering ownership
   */
  const canAccess = (
    resource: Resource,
    action: Action,
    ownerId?: string,
    userId?: string,
  ): boolean => {
    if (!permissions || !userId) return false;

    const perm = permissions.effectivePermissions.find(p => p.resource === resource);
    if (!perm || !perm.actions.includes(action)) return false;

    // Check ownership scope
    if (perm.scope.ownership === 'owned' && ownerId && ownerId !== userId) {
      return false;
    }

    if (perm.scope.ownership === 'assigned' && ownerId && ownerId !== userId) {
      return false;
    }

    return true;
  };

  /**
   * Get user's permission groups
   */
  const getGroups = (): { id: string; name: string }[] => {
    return permissions?.groups || [];
  };

  /**
   * Check if user is an admin (has full permissions)
   */
  const isAdmin = (): boolean => {
    if (!permissions) return false;
    return permissions.groups.some(g => g.name === 'Administrator');
  };

  return {
    permissions,
    isLoading: userLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getResourceActions,
    canAccess,
    getGroups,
    isAdmin,
    currentUser,
  };
}

/**
 * Component wrapper for permission-based rendering
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
}: {
  resource: Resource;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = usePermissions();

  if (isLoading) return null;
  if (!hasPermission(resource, action)) return <>{fallback}</>;

  return <>{children}</>;
}

