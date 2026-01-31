import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

// Conflict resolution strategy
export enum ConflictResolution {
  ABORT = 'abort',       // Stop if any conflicts found
  FORCE = 'force',       // Overwrite all conflicts
  SKIP = 'skip',         // Skip conflicting resources
}

export enum ConfigFileFormat {
  TERRAFORM = 'terraform',
  YAML = 'yaml',
  JSON = 'json',
}

export class CreateConfigFileDto {
  @ApiProperty({
    description: 'File path (e.g., "controls/main.tf", "frameworks/soc2.yaml")',
    example: 'controls/main.tf',
  })
  @IsString()
  path: string;

  @ApiProperty({
    enum: ConfigFileFormat,
    description: 'File format',
  })
  @IsEnum(ConfigFileFormat)
  format: ConfigFileFormat;

  @ApiProperty({
    description: 'File content',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Workspace ID (optional, for workspace-scoped files)',
  })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Commit message for this version',
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;
}

export class UpdateConfigFileDto {
  @ApiProperty({
    description: 'File content',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Commit message for this version',
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;
}

export class ConfigFileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'File path' })
  path: string;

  @ApiProperty({ enum: ConfigFileFormat, description: 'File format' })
  format: ConfigFileFormat;

  @ApiProperty({ description: 'File content' })
  content: string;

  @ApiProperty({ description: 'Current version number' })
  version: number;

  @ApiPropertyOptional({ description: 'Last commit message' })
  commitMessage?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Workspace ID' })
  workspaceId?: string;
}

export class ConfigFileListResponseDto {
  @ApiProperty({ type: [ConfigFileResponseDto], description: 'List of config files' })
  files: ConfigFileResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;
}

export class PreviewChangesDto {
  @ApiProperty({
    description: 'File path',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'Updated content',
  })
  @IsString()
  content: string;

  @ApiProperty({
    enum: ConfigFileFormat,
    description: 'File format',
  })
  @IsEnum(ConfigFileFormat)
  format: ConfigFileFormat;
}

export class ConflictItemDto {
  @ApiProperty({ description: 'Resource type' })
  resourceType: string;

  @ApiProperty({ description: 'Resource identifier' })
  resourceId: string;

  @ApiProperty({ description: 'Field with conflict' })
  field: string;

  @ApiProperty({ description: 'Value in Terraform file' })
  terraformValue: unknown;

  @ApiProperty({ description: 'Current value in database' })
  databaseValue: unknown;

  @ApiProperty({ description: 'Value when last applied via Config as Code' })
  lastAppliedValue: unknown;

  @ApiProperty({ enum: ['warning', 'error'], description: 'Conflict severity' })
  severity: 'warning' | 'error';

  @ApiProperty({ description: 'Recommended action' })
  recommendation: string;
}

export class PreviewChangesResponseDto {
  @ApiProperty({ description: 'Number of resources to create' })
  toCreate: number;

  @ApiProperty({ description: 'Number of resources to update' })
  toUpdate: number;

  @ApiProperty({ description: 'Number of resources to delete' })
  toDelete: number;

  @ApiProperty({ description: 'Number of resources to skip (no changes)' })
  noChange: number;

  @ApiProperty({ description: 'Whether conflicts were detected' })
  hasConflicts: boolean;

  @ApiProperty({ description: 'Number of conflicts detected' })
  conflictCount: number;

  @ApiProperty({ type: [ConflictItemDto], description: 'Detailed conflict information' })
  conflicts: ConflictItemDto[];

  @ApiProperty({ type: [String], description: 'List of warnings' })
  warnings: string[];

  @ApiProperty({ type: [String], description: 'List of errors' })
  errors: string[];

  @ApiProperty({ description: 'Preview of changes (diff)' })
  diff: Record<string, unknown>;

  @ApiProperty({ description: 'Resources safe to apply' })
  safeToApply: Array<{ resourceType: string; resourceId: string; action: string }>;

  @ApiProperty({ description: 'New resources to be created' })
  newResources: Array<{ resourceType: string; resourceId: string }>;
}

export class ApplyChangesDto {
  @ApiProperty({
    description: 'File path',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: 'File content to apply',
  })
  @IsString()
  content: string;

  @ApiProperty({
    enum: ConfigFileFormat,
    description: 'File format',
  })
  @IsEnum(ConfigFileFormat)
  format: ConfigFileFormat;

  @ApiPropertyOptional({
    description: 'Commit message',
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;

  @ApiPropertyOptional({
    enum: ConflictResolution,
    description: 'How to handle conflicts with UI changes. Default: abort',
    default: ConflictResolution.ABORT,
  })
  @IsOptional()
  @IsEnum(ConflictResolution)
  conflictResolution?: ConflictResolution;

  @ApiPropertyOptional({
    description: 'Dry run - check for conflicts without applying changes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description: 'Refresh state from database before applying (sync current state)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  refreshFirst?: boolean;
}

export class ApplyChangesResponseDto {
  @ApiProperty({ description: 'Number of resources created' })
  created: number;

  @ApiProperty({ description: 'Number of resources updated' })
  updated: number;

  @ApiProperty({ description: 'Number of resources deleted' })
  deleted: number;

  @ApiProperty({ description: 'Number of resources skipped (conflicts or no change)' })
  skipped: number;

  @ApiProperty({ description: 'Number of errors' })
  errors: number;

  @ApiProperty({ type: [String], description: 'Error details' })
  errorDetails: string[];

  @ApiProperty({ description: 'Number of conflicts detected' })
  conflictsDetected: number;

  @ApiProperty({ description: 'How conflicts were resolved' })
  conflictsResolved?: string;

  @ApiProperty({ type: [ConflictItemDto], description: 'Conflicts that caused skips (when using skip mode)' })
  skippedConflicts?: ConflictItemDto[];

  @ApiProperty({ description: 'Whether this was a dry run' })
  dryRun: boolean;

  @ApiProperty({ description: 'Apply history ID for this operation' })
  historyId?: string;

  @ApiProperty({ description: 'Duration in milliseconds' })
  durationMs?: number;
}

export class ConfigFileVersionDto {
  @ApiProperty({ description: 'Version ID' })
  id: string;

  @ApiProperty({ description: 'Version number' })
  version: number;

  @ApiProperty({ description: 'File content at this version' })
  content: string;

  @ApiPropertyOptional({ description: 'Commit message' })
  commitMessage?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Created by user ID' })
  createdBy: string;
}

