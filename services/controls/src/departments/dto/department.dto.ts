import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
} from 'class-validator';

// ===========================================
// Enums
// ===========================================

export enum DepartmentScopeType {
  FULL = 'full',
  READ_ONLY = 'read_only',
  LIMITED = 'limited',
}

// ===========================================
// Department DTOs
// ===========================================

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Department name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Short code (e.g., IT, HR, FIN)' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent department ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Department head user ID' })
  @IsOptional()
  @IsUUID()
  headUserId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ description: 'Department name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent department ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Department head user ID' })
  @IsOptional()
  @IsUUID()
  headUserId?: string;

  @ApiPropertyOptional({ description: 'Whether department is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class DepartmentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional()
  headUserId?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Computed fields
  @ApiPropertyOptional({ description: 'Number of direct members' })
  memberCount?: number;

  @ApiPropertyOptional({ description: 'Number of child departments' })
  childCount?: number;

  @ApiPropertyOptional({ description: 'Parent department name' })
  parentName?: string;

  @ApiPropertyOptional({ description: 'Head user display name' })
  headUserName?: string;
}

export class DepartmentTreeDto extends DepartmentDto {
  @ApiPropertyOptional({ type: [DepartmentTreeDto] })
  children?: DepartmentTreeDto[];
}

// ===========================================
// User Department Membership DTOs
// ===========================================

export class AddDepartmentMemberDto {
  @ApiProperty({ description: 'User ID to add' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Set as primary department' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Role within department' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class DepartmentMemberDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  departmentId: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  endDate?: Date;

  @ApiProperty()
  createdAt: Date;

  // Computed
  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  userEmail?: string;
}

// ===========================================
// Permission Group Hierarchy DTOs
// ===========================================

export class CreateGroupHierarchyDto {
  @ApiProperty({ description: 'Parent group ID' })
  @IsUUID()
  parentGroupId: string;

  @ApiProperty({ description: 'Child group ID' })
  @IsUUID()
  childGroupId: string;

  @ApiPropertyOptional({ description: 'Whether child inherits parent permissions' })
  @IsOptional()
  @IsBoolean()
  inheritPermissions?: boolean;
}

export class GroupHierarchyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  parentGroupId: string;

  @ApiProperty()
  childGroupId: string;

  @ApiProperty()
  inheritPermissions: boolean;

  @ApiProperty()
  createdAt: Date;

  // Computed
  @ApiPropertyOptional()
  parentGroupName?: string;

  @ApiPropertyOptional()
  childGroupName?: string;
}

// ===========================================
// Permission Group Department Scope DTOs
// ===========================================

export class CreateGroupDepartmentScopeDto {
  @ApiProperty({ description: 'Permission group ID' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: 'Department ID' })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'Scope type', enum: DepartmentScopeType })
  @IsEnum(DepartmentScopeType)
  scopeType: DepartmentScopeType;

  @ApiPropertyOptional({ description: 'Include child departments' })
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;
}

export class GroupDepartmentScopeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  departmentId: string;

  @ApiProperty({ enum: DepartmentScopeType })
  scopeType: DepartmentScopeType;

  @ApiProperty()
  includeChildren: boolean;

  @ApiProperty()
  createdAt: Date;

  // Computed
  @ApiPropertyOptional()
  groupName?: string;

  @ApiPropertyOptional()
  departmentName?: string;
}

// ===========================================
// Enhanced Permission Group DTO
// ===========================================

export class EnhancedPermissionGroupDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  permissions: Record<string, unknown>[];

  @ApiProperty()
  isSystem: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Enhanced fields
  @ApiPropertyOptional({ description: 'Parent groups this group belongs to', type: [GroupHierarchyDto] })
  parentGroups?: GroupHierarchyDto[];

  @ApiPropertyOptional({ description: 'Child groups under this group', type: [GroupHierarchyDto] })
  childGroups?: GroupHierarchyDto[];

  @ApiPropertyOptional({ description: 'Department scopes', type: [GroupDepartmentScopeDto] })
  departmentScopes?: GroupDepartmentScopeDto[];

  @ApiPropertyOptional({ description: 'Effective permissions after inheritance' })
  effectivePermissions?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Number of members' })
  memberCount?: number;
}
