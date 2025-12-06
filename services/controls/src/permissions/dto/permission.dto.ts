import { IsString, IsOptional, IsBoolean, IsArray, IsObject, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// ===========================
// Resource and Action Enums
// ===========================

export enum Resource {
  CONTROLS = 'controls',
  EVIDENCE = 'evidence',
  POLICIES = 'policies',
  FRAMEWORKS = 'frameworks',
  INTEGRATIONS = 'integrations',
  AUDIT_LOGS = 'audit_logs',
  USERS = 'users',
  PERMISSIONS = 'permissions',
  SETTINGS = 'settings',
  DASHBOARD = 'dashboard',
}

export enum Action {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  APPROVE = 'approve',
  EXPORT = 'export',
}

export enum OwnershipScope {
  ALL = 'all',        // Can access all items
  OWNED = 'owned',    // Can only access items they own
  ASSIGNED = 'assigned', // Can only access items assigned to them
}

// ===========================
// Permission Structure
// ===========================

export class PermissionScopeDto {
  @IsOptional()
  @IsEnum(OwnershipScope)
  ownership?: OwnershipScope;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}

export class PermissionDto {
  @IsEnum(Resource)
  resource: Resource;

  @IsArray()
  @IsEnum(Action, { each: true })
  actions: Action[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionScopeDto)
  scope?: PermissionScopeDto;
}

// ===========================
// Permission Group DTOs
// ===========================

export class CreatePermissionGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}

export class UpdatePermissionGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}

export class AddGroupMemberDto {
  @IsString()
  userId: string;
}

// ===========================
// User Permission Override DTOs
// ===========================

export class UserPermissionOverrideDto {
  @IsString()
  permission: string; // Format: "resource:action" e.g., "controls:update"

  @IsBoolean()
  granted: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionScopeDto)
  resourceScope?: PermissionScopeDto;
}

export class SetUserOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionOverrideDto)
  overrides: UserPermissionOverrideDto[];
}

// ===========================
// Permission Check DTOs
// ===========================

export class CheckPermissionDto {
  @IsEnum(Resource)
  resource: Resource;

  @IsEnum(Action)
  action: Action;

  @IsOptional()
  @IsString()
  resourceId?: string;
}

// ===========================
// Response DTOs
// ===========================

export class PermissionGroupResponseDto {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionDto[];
  isSystem: boolean;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class GroupMemberResponseDto {
  id: string;
  keycloakId: string;
  email: string;
  displayName: string;
  joinedAt: Date;
}

export class EffectivePermissionDto {
  resource: Resource;
  actions: Action[];
  scope: PermissionScopeDto;
  source: 'group' | 'override';
  groupName?: string;
}

export class UserPermissionsResponseDto {
  userId: string;
  groups: {
    id: string;
    name: string;
  }[];
  effectivePermissions: EffectivePermissionDto[];
  overrides: UserPermissionOverrideDto[];
}

export class PermissionCheckResultDto {
  allowed: boolean;
  reason?: string;
  matchedPermission?: EffectivePermissionDto;
}

// ===========================
// Default Permission Templates
// ===========================

export const DEFAULT_PERMISSION_GROUPS = {
  administrator: {
    name: 'Administrator',
    description: 'Full access to all resources and actions',
    permissions: [
      { resource: Resource.CONTROLS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.EVIDENCE, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.POLICIES, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.FRAMEWORKS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.INTEGRATIONS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.AUDIT_LOGS, actions: [Action.READ, Action.EXPORT], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.USERS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.PERMISSIONS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.SETTINGS, actions: Object.values(Action), scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.DASHBOARD, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
    ],
  },
  compliance_manager: {
    name: 'Compliance Manager',
    description: 'Manage controls, evidence, and policies',
    permissions: [
      { resource: Resource.CONTROLS, actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.ASSIGN], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.EVIDENCE, actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.POLICIES, actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.FRAMEWORKS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.INTEGRATIONS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.AUDIT_LOGS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.DASHBOARD, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
    ],
  },
  auditor: {
    name: 'Auditor',
    description: 'Read-only access with ability to approve/reject evidence',
    permissions: [
      { resource: Resource.CONTROLS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.EVIDENCE, actions: [Action.READ, Action.APPROVE], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.POLICIES, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.FRAMEWORKS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.AUDIT_LOGS, actions: [Action.READ, Action.EXPORT], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.DASHBOARD, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
    ],
  },
  control_owner: {
    name: 'Control Owner',
    description: 'Edit assigned controls and link evidence',
    permissions: [
      { resource: Resource.CONTROLS, actions: [Action.READ, Action.UPDATE], scope: { ownership: OwnershipScope.ASSIGNED } },
      { resource: Resource.EVIDENCE, actions: [Action.READ, Action.CREATE, Action.UPDATE], scope: { ownership: OwnershipScope.OWNED } },
      { resource: Resource.POLICIES, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.FRAMEWORKS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.DASHBOARD, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to non-sensitive data',
    permissions: [
      { resource: Resource.CONTROLS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.EVIDENCE, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.POLICIES, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.FRAMEWORKS, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
      { resource: Resource.DASHBOARD, actions: [Action.READ], scope: { ownership: OwnershipScope.ALL } },
    ],
  },
};



