import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Resource,
  Action,
  OwnershipScope,
  PermissionDto,
  EffectivePermissionDto,
  PermissionCheckResultDto,
  PermissionScopeDto,
} from './dto/permission.dto';

interface ResourceContext {
  id?: string;
  ownerId?: string;
  assignedTo?: string;
  tags?: string[];
  category?: string;
}

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a user has permission to perform an action on a resource
   */
  async hasPermission(
    userId: string,
    resource: Resource,
    action: Action,
    resourceContext?: ResourceContext,
  ): Promise<PermissionCheckResultDto> {
    const effectivePermissions = await this.getEffectivePermissions(userId);
    
    // Find matching permission
    for (const perm of effectivePermissions) {
      if (perm.resource !== resource) continue;
      if (!perm.actions.includes(action)) continue;

      // Check scope restrictions
      if (resourceContext) {
        const scopeMatch = this.checkScope(perm.scope, resourceContext, userId);
        if (!scopeMatch.allowed) continue;
      }

      return {
        allowed: true,
        reason: `Permission granted via ${perm.source}${perm.groupName ? ` (${perm.groupName})` : ''}`,
        matchedPermission: perm,
      };
    }

    return {
      allowed: false,
      reason: `No permission found for ${resource}:${action}`,
    };
  }

  /**
   * Check if scope restrictions allow access
   */
  private checkScope(
    scope: PermissionScopeDto,
    context: ResourceContext,
    userId: string,
  ): { allowed: boolean; reason?: string } {
    // Check ownership scope
    if (scope.ownership) {
      switch (scope.ownership) {
        case OwnershipScope.OWNED:
          if (context.ownerId && context.ownerId !== userId) {
            return { allowed: false, reason: 'User does not own this resource' };
          }
          break;
        case OwnershipScope.ASSIGNED:
          if (context.assignedTo && context.assignedTo !== userId && context.ownerId !== userId) {
            return { allowed: false, reason: 'User is not assigned to this resource' };
          }
          break;
        // ALL = no ownership restriction
      }
    }

    // Check tag scope
    if (scope.tags && scope.tags.length > 0 && context.tags) {
      const hasMatchingTag = context.tags.some(tag => scope.tags!.includes(tag));
      if (!hasMatchingTag) {
        return { allowed: false, reason: 'Resource tags do not match permission scope' };
      }
    }

    // Check category scope
    if (scope.categories && scope.categories.length > 0 && context.category) {
      if (!scope.categories.includes(context.category)) {
        return { allowed: false, reason: 'Resource category does not match permission scope' };
      }
    }

    return { allowed: true };
  }

  /**
   * Get all effective permissions for a user (merged from groups + overrides)
   */
  async getEffectivePermissions(userId: string): Promise<EffectivePermissionDto[]> {
    // Get user's group memberships with permissions
    const memberships = await this.prisma.userGroupMembership.findMany({
      where: { userId },
      include: {
        group: true,
      },
    });

    // Get user's permission overrides
    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
    });

    // Build effective permissions map
    const permissionMap = new Map<string, EffectivePermissionDto>();

    // First, add all group permissions
    for (const membership of memberships) {
      const groupPermissions = (membership.group.permissions as unknown) as PermissionDto[];
      
      for (const perm of groupPermissions) {
        const key = perm.resource;
        const existing = permissionMap.get(key);
        
        if (existing) {
          // Merge actions (union)
          const mergedActions = [...new Set([...existing.actions, ...perm.actions])];
          existing.actions = mergedActions as Action[];
          // Merge scope (most permissive)
          existing.scope = this.mergeScopes(existing.scope, perm.scope || {});
        } else {
          permissionMap.set(key, {
            resource: perm.resource,
            actions: [...perm.actions],
            scope: perm.scope || { ownership: OwnershipScope.ALL },
            source: 'group',
            groupName: membership.group.name,
          });
        }
      }
    }

    // Then, apply overrides
    for (const override of overrides) {
      const [resource, action] = override.permission.split(':') as [Resource, Action];
      
      if (!resource || !action) continue;

      const existing = permissionMap.get(resource);
      
      if (override.granted) {
        // Grant permission
        if (existing) {
          if (!existing.actions.includes(action)) {
            existing.actions.push(action);
          }
          // Override scope if specified
          if (override.resourceScope) {
            existing.scope = override.resourceScope as PermissionScopeDto;
          }
          existing.source = 'override';
        } else {
          permissionMap.set(resource, {
            resource,
            actions: [action],
            scope: (override.resourceScope as PermissionScopeDto) || { ownership: OwnershipScope.ALL },
            source: 'override',
          });
        }
      } else {
        // Deny permission (remove action)
        if (existing) {
          existing.actions = existing.actions.filter(a => a !== action);
          if (existing.actions.length === 0) {
            permissionMap.delete(resource);
          }
        }
      }
    }

    return Array.from(permissionMap.values());
  }

  /**
   * Merge two scopes (most permissive wins)
   */
  private mergeScopes(scope1: PermissionScopeDto, scope2: PermissionScopeDto): PermissionScopeDto {
    // For ownership, ALL is most permissive
    let ownership = scope1.ownership || OwnershipScope.ALL;
    if (scope2.ownership === OwnershipScope.ALL || ownership === OwnershipScope.ALL) {
      ownership = OwnershipScope.ALL;
    }

    // For tags/categories, union them (null = all)
    let tags: string[] | undefined = undefined;
    if (scope1.tags && scope2.tags) {
      tags = [...new Set([...scope1.tags, ...scope2.tags])];
    } // If either is undefined/null, no tag restriction

    let categories: string[] | undefined = undefined;
    if (scope1.categories && scope2.categories) {
      categories = [...new Set([...scope1.categories, ...scope2.categories])];
    }

    return { ownership, tags, categories };
  }

  /**
   * Get user's permission summary (for API response)
   */
  async getUserPermissions(userId: string, organizationId: string) {
    const memberships = await this.prisma.userGroupMembership.findMany({
      where: { userId },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });

    const overrides = await this.prisma.userPermissionOverride.findMany({
      where: { userId },
    });

    const effectivePermissions = await this.getEffectivePermissions(userId);

    return {
      userId,
      groups: memberships.map(m => ({
        id: m.group.id,
        name: m.group.name,
      })),
      effectivePermissions,
      overrides: overrides.map(o => ({
        permission: o.permission,
        granted: o.granted,
        resourceScope: o.resourceScope,
      })),
    };
  }

  /**
   * Check if user can access a specific control
   */
  async canAccessControl(userId: string, controlId: string, action: Action): Promise<PermissionCheckResultDto> {
    // Get control with implementation to check ownership
    const control = await this.prisma.control.findUnique({
      where: { id: controlId },
      include: {
        implementations: {
          take: 1,
          select: { ownerId: true },
        },
      },
    });

    if (!control) {
      return { allowed: false, reason: 'Control not found' };
    }

    return this.hasPermission(userId, Resource.CONTROLS, action, {
      id: controlId,
      ownerId: control.implementations[0]?.ownerId || undefined,
      tags: control.tags,
      category: control.category,
    });
  }

  /**
   * Check if user can access a specific evidence
   */
  async canAccessEvidence(userId: string, evidenceId: string, action: Action): Promise<PermissionCheckResultDto> {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });

    if (!evidence) {
      return { allowed: false, reason: 'Evidence not found' };
    }

    return this.hasPermission(userId, Resource.EVIDENCE, action, {
      id: evidenceId,
      ownerId: evidence.createdBy,
      tags: evidence.tags,
      category: evidence.category || undefined,
    });
  }

  /**
   * Check if user can access a specific policy
   */
  async canAccessPolicy(userId: string, policyId: string, action: Action): Promise<PermissionCheckResultDto> {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return { allowed: false, reason: 'Policy not found' };
    }

    return this.hasPermission(userId, Resource.POLICIES, action, {
      id: policyId,
      ownerId: policy.ownerId,
      tags: policy.tags,
      category: policy.category,
    });
  }

  /**
   * Filter a list of controls based on user permissions
   */
  async filterControls(userId: string, controlIds: string[]): Promise<string[]> {
    const effectivePermissions = await this.getEffectivePermissions(userId);
    const controlPerm = effectivePermissions.find(p => p.resource === Resource.CONTROLS);
    
    if (!controlPerm || !controlPerm.actions.includes(Action.READ)) {
      return [];
    }

    // If ALL ownership and no tag/category restrictions, return all
    if (
      controlPerm.scope.ownership === OwnershipScope.ALL &&
      !controlPerm.scope.tags?.length &&
      !controlPerm.scope.categories?.length
    ) {
      return controlIds;
    }

    // Otherwise, filter based on scope
    const controls = await this.prisma.control.findMany({
      where: { id: { in: controlIds } },
      include: {
        implementations: {
          take: 1,
          select: { ownerId: true },
        },
      },
    });

    return controls
      .filter(control => {
        const context: ResourceContext = {
          id: control.id,
          ownerId: control.implementations[0]?.ownerId || undefined,
          tags: control.tags,
          category: control.category,
        };
        return this.checkScope(controlPerm.scope, context, userId).allowed;
      })
      .map(c => c.id);
  }

  /**
   * Get all available permissions for display in UI
   */
  getAvailablePermissions() {
    return Object.values(Resource).map(resource => ({
      resource,
      actions: Object.values(Action),
      description: this.getResourceDescription(resource),
    }));
  }

  private getResourceDescription(resource: Resource): string {
    const descriptions: Record<Resource, string> = {
      [Resource.CONTROLS]: 'Security and compliance controls',
      [Resource.EVIDENCE]: 'Evidence artifacts and documents',
      [Resource.POLICIES]: 'Policy documents and lifecycle',
      [Resource.FRAMEWORKS]: 'Compliance frameworks and requirements',
      [Resource.INTEGRATIONS]: 'Third-party integrations',
      [Resource.AUDIT_LOGS]: 'System audit logs',
      [Resource.USERS]: 'User management',
      [Resource.PERMISSIONS]: 'Roles and permissions',
      [Resource.SETTINGS]: 'System settings',
      [Resource.DASHBOARD]: 'Dashboard and analytics',
    };
    return descriptions[resource];
  }
}

