import { IsString, IsOptional, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { WorkspaceStatus, WorkspaceRole } from '@prisma/client';

export class CreateWorkspaceDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkspaceStatus)
  @IsOptional()
  status?: WorkspaceStatus;

  @IsOptional()
  settings?: Record<string, unknown>;
}

export class AddWorkspaceMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(WorkspaceRole)
  @IsOptional()
  role?: WorkspaceRole;
}

export class UpdateWorkspaceMemberDto {
  @IsEnum(WorkspaceRole)
  role: WorkspaceRole;
}

export class WorkspaceFilterDto {
  @IsEnum(WorkspaceStatus)
  @IsOptional()
  status?: WorkspaceStatus;
}

export class EnableMultiWorkspaceDto {
  @IsBoolean()
  enabled: boolean;
}

export class WorkspaceResponseDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: WorkspaceStatus;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
}

export class WorkspaceMemberResponseDto {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export class WorkspaceDashboardDto {
  workspace: WorkspaceResponseDto;
  stats: {
    totalControls: number;
    implementedControls: number;
    totalRisks: number;
    openRisks: number;
    totalEvidence: number;
    pendingEvidence: number;
    vendorCount: number;
    assetCount: number;
  };
  complianceScore: number;
}




