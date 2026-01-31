import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ===========================================
// Enums
// ===========================================

export enum JiraSyncDirection {
  GRC_TO_JIRA = 'grc_to_jira',
  JIRA_TO_GRC = 'jira_to_grc',
  BIDIRECTIONAL = 'bidirectional',
}

export enum JiraIssueType {
  BUG = 'Bug',
  TASK = 'Task',
  STORY = 'Story',
  EPIC = 'Epic',
  SUBTASK = 'Sub-task',
}

export enum GrcEntityType {
  RISK = 'risk',
  FINDING = 'finding',
  TASK = 'task',
  REMEDIATION = 'remediation',
  CONTROL_GAP = 'control_gap',
}

// ===========================================
// Connection DTOs
// ===========================================

export class JiraOAuthConfigDto {
  @ApiProperty({ description: 'Jira Cloud instance URL' })
  @IsUrl()
  instanceUrl: string;

  @ApiPropertyOptional({ description: 'OAuth client ID (for Cloud)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OAuth client secret (for Cloud)' })
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'API token (for basic auth fallback)' })
  @IsOptional()
  @IsString()
  apiToken?: string;

  @ApiPropertyOptional({ description: 'User email (for basic auth)' })
  @IsOptional()
  @IsString()
  userEmail?: string;
}

export class JiraConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  instanceUrl: string;

  @ApiProperty()
  isConnected: boolean;

  @ApiPropertyOptional()
  connectedAt?: Date;

  @ApiPropertyOptional()
  lastSyncAt?: Date;

  @ApiPropertyOptional()
  connectionError?: string;

  @ApiProperty()
  createdAt: Date;
}

// ===========================================
// Project Mapping DTOs
// ===========================================

export class FieldMappingDto {
  @ApiProperty({ description: 'GRC field name' })
  @IsString()
  grcField: string;

  @ApiProperty({ description: 'Jira field ID or name' })
  @IsString()
  jiraField: string;

  @ApiPropertyOptional({ description: 'Transform function name' })
  @IsOptional()
  @IsString()
  transform?: string;
}

export class StatusMappingDto {
  @ApiProperty({ description: 'GRC status value' })
  @IsString()
  grcStatus: string;

  @ApiProperty({ description: 'Jira status name' })
  @IsString()
  jiraStatus: string;
}

export class CreateJiraProjectMappingDto {
  @ApiProperty({ description: 'Jira project key' })
  @IsString()
  jiraProjectKey: string;

  @ApiProperty({ description: 'GRC entity type to sync', enum: GrcEntityType })
  @IsEnum(GrcEntityType)
  grcEntityType: GrcEntityType;

  @ApiProperty({ description: 'Jira issue type', enum: JiraIssueType })
  @IsEnum(JiraIssueType)
  jiraIssueType: JiraIssueType;

  @ApiProperty({ description: 'Sync direction', enum: JiraSyncDirection })
  @IsEnum(JiraSyncDirection)
  syncDirection: JiraSyncDirection;

  @ApiPropertyOptional({ description: 'Field mappings', type: [FieldMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  fieldMappings?: FieldMappingDto[];

  @ApiPropertyOptional({ description: 'Status mappings', type: [StatusMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusMappingDto)
  statusMappings?: StatusMappingDto[];

  @ApiPropertyOptional({ description: 'Auto-create issues for new GRC entities' })
  @IsOptional()
  @IsBoolean()
  autoCreate?: boolean;

  @ApiPropertyOptional({ description: 'Auto-sync status changes' })
  @IsOptional()
  @IsBoolean()
  autoSyncStatus?: boolean;

  @ApiPropertyOptional({ description: 'Sync comments' })
  @IsOptional()
  @IsBoolean()
  syncComments?: boolean;

  @ApiPropertyOptional({ description: 'Sync attachments' })
  @IsOptional()
  @IsBoolean()
  syncAttachments?: boolean;

  @ApiPropertyOptional({ description: 'JQL filter for incoming sync' })
  @IsOptional()
  @IsString()
  jqlFilter?: string;
}

export class JiraProjectMappingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  jiraProjectKey: string;

  @ApiProperty()
  jiraProjectName: string;

  @ApiProperty({ enum: GrcEntityType })
  grcEntityType: GrcEntityType;

  @ApiProperty({ enum: JiraIssueType })
  jiraIssueType: JiraIssueType;

  @ApiProperty({ enum: JiraSyncDirection })
  syncDirection: JiraSyncDirection;

  @ApiPropertyOptional({ type: [FieldMappingDto] })
  fieldMappings?: FieldMappingDto[];

  @ApiPropertyOptional({ type: [StatusMappingDto] })
  statusMappings?: StatusMappingDto[];

  @ApiProperty()
  autoCreate: boolean;

  @ApiProperty()
  autoSyncStatus: boolean;

  @ApiProperty()
  syncComments: boolean;

  @ApiProperty()
  syncAttachments: boolean;

  @ApiPropertyOptional()
  jqlFilter?: string;

  @ApiProperty()
  isEnabled: boolean;

  @ApiPropertyOptional()
  lastSyncAt?: Date;

  @ApiPropertyOptional()
  syncedIssueCount?: number;

  @ApiProperty()
  createdAt: Date;
}

// ===========================================
// Sync DTOs
// ===========================================

export class JiraSyncResultDto {
  @ApiProperty()
  mappingId: string;

  @ApiProperty()
  direction: JiraSyncDirection;

  @ApiProperty()
  issuesCreated: number;

  @ApiProperty()
  issuesUpdated: number;

  @ApiProperty()
  issuesFailed: number;

  @ApiPropertyOptional()
  errors?: string[];

  @ApiProperty()
  duration: number;

  @ApiProperty()
  syncedAt: Date;
}

export class CreateJiraIssueDto {
  @ApiProperty({ description: 'GRC entity type', enum: GrcEntityType })
  @IsEnum(GrcEntityType)
  entityType: GrcEntityType;

  @ApiProperty({ description: 'GRC entity ID' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ description: 'Project mapping ID (uses default if not specified)' })
  @IsOptional()
  @IsString()
  mappingId?: string;

  @ApiPropertyOptional({ description: 'Additional Jira fields' })
  @IsOptional()
  additionalFields?: Record<string, unknown>;
}

export class JiraIssueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  jiraKey: string;

  @ApiProperty()
  jiraUrl: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiProperty({ enum: GrcEntityType })
  grcEntityType: GrcEntityType;

  @ApiProperty()
  grcEntityId: string;

  @ApiProperty()
  lastSyncedAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class JiraProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class JiraIssueTypeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  iconUrl?: string;
}
