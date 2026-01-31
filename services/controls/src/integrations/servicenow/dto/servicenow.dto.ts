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

export enum ServiceNowSyncDirection {
  GRC_TO_SNOW = 'grc_to_snow',
  SNOW_TO_GRC = 'snow_to_grc',
  BIDIRECTIONAL = 'bidirectional',
}

export enum ServiceNowTableType {
  INCIDENT = 'incident',
  CHANGE_REQUEST = 'change_request',
  PROBLEM = 'problem',
  SECURITY_INCIDENT = 'sn_si_incident',
  GRC_RISK = 'sn_risk_risk',
  GRC_CONTROL = 'sn_compliance_policy_statement',
}

export enum GrcEntityType {
  RISK = 'risk',
  FINDING = 'finding',
  TASK = 'task',
  REMEDIATION = 'remediation',
  CONTROL_GAP = 'control_gap',
  INCIDENT = 'incident',
}

export enum ServiceNowAuthType {
  BASIC = 'basic',
  OAUTH = 'oauth',
}

// ===========================================
// Connection DTOs
// ===========================================

export class ServiceNowConnectionConfigDto {
  @ApiProperty({ description: 'ServiceNow instance URL (e.g., https://company.service-now.com)' })
  @IsUrl()
  instanceUrl: string;

  @ApiProperty({ description: 'Authentication type', enum: ServiceNowAuthType })
  @IsEnum(ServiceNowAuthType)
  authType: ServiceNowAuthType;

  @ApiPropertyOptional({ description: 'Username (for basic auth)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Password (for basic auth)' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'OAuth client ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'OAuth client secret' })
  @IsOptional()
  @IsString()
  clientSecret?: string;
}

export class ServiceNowConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  instanceUrl: string;

  @ApiProperty({ enum: ServiceNowAuthType })
  authType: ServiceNowAuthType;

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
// Table Mapping DTOs
// ===========================================

export class FieldMappingDto {
  @ApiProperty({ description: 'GRC field name' })
  @IsString()
  grcField: string;

  @ApiProperty({ description: 'ServiceNow field name' })
  @IsString()
  snowField: string;

  @ApiPropertyOptional({ description: 'Transform function' })
  @IsOptional()
  @IsString()
  transform?: string;
}

export class StatusMappingDto {
  @ApiProperty({ description: 'GRC status value' })
  @IsString()
  grcStatus: string;

  @ApiProperty({ description: 'ServiceNow state value' })
  @IsString()
  snowState: string;
}

export class PriorityMappingDto {
  @ApiProperty({ description: 'GRC priority/severity value' })
  @IsString()
  grcPriority: string;

  @ApiProperty({ description: 'ServiceNow priority value (1-5)' })
  @IsString()
  snowPriority: string;
}

export class CreateTableMappingDto {
  @ApiProperty({ description: 'ServiceNow table name', enum: ServiceNowTableType })
  @IsEnum(ServiceNowTableType)
  snowTableName: ServiceNowTableType;

  @ApiProperty({ description: 'GRC entity type', enum: GrcEntityType })
  @IsEnum(GrcEntityType)
  grcEntityType: GrcEntityType;

  @ApiProperty({ description: 'Sync direction', enum: ServiceNowSyncDirection })
  @IsEnum(ServiceNowSyncDirection)
  syncDirection: ServiceNowSyncDirection;

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

  @ApiPropertyOptional({ description: 'Priority mappings', type: [PriorityMappingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriorityMappingDto)
  priorityMappings?: PriorityMappingDto[];

  @ApiPropertyOptional({ description: 'Auto-create records for new GRC entities' })
  @IsOptional()
  @IsBoolean()
  autoCreate?: boolean;

  @ApiPropertyOptional({ description: 'Auto-sync status changes' })
  @IsOptional()
  @IsBoolean()
  autoSyncStatus?: boolean;

  @ApiPropertyOptional({ description: 'Sync attachments' })
  @IsOptional()
  @IsBoolean()
  syncAttachments?: boolean;

  @ApiPropertyOptional({ description: 'Sync work notes' })
  @IsOptional()
  @IsBoolean()
  syncWorkNotes?: boolean;

  @ApiPropertyOptional({ description: 'ServiceNow encoded query filter' })
  @IsOptional()
  @IsString()
  queryFilter?: string;

  @ApiPropertyOptional({ description: 'Default assignment group sys_id' })
  @IsOptional()
  @IsString()
  assignmentGroupId?: string;

  @ApiPropertyOptional({ description: 'Default category' })
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class TableMappingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ServiceNowTableType })
  snowTableName: ServiceNowTableType;

  @ApiProperty()
  snowTableLabel: string;

  @ApiProperty({ enum: GrcEntityType })
  grcEntityType: GrcEntityType;

  @ApiProperty({ enum: ServiceNowSyncDirection })
  syncDirection: ServiceNowSyncDirection;

  @ApiPropertyOptional({ type: [FieldMappingDto] })
  fieldMappings?: FieldMappingDto[];

  @ApiPropertyOptional({ type: [StatusMappingDto] })
  statusMappings?: StatusMappingDto[];

  @ApiPropertyOptional({ type: [PriorityMappingDto] })
  priorityMappings?: PriorityMappingDto[];

  @ApiProperty()
  autoCreate: boolean;

  @ApiProperty()
  autoSyncStatus: boolean;

  @ApiProperty()
  syncAttachments: boolean;

  @ApiProperty()
  syncWorkNotes: boolean;

  @ApiPropertyOptional()
  queryFilter?: string;

  @ApiPropertyOptional()
  assignmentGroupId?: string;

  @ApiProperty()
  isEnabled: boolean;

  @ApiPropertyOptional()
  lastSyncAt?: Date;

  @ApiPropertyOptional()
  syncedRecordCount?: number;

  @ApiProperty()
  createdAt: Date;
}

// ===========================================
// Sync DTOs
// ===========================================

export class SyncResultDto {
  @ApiProperty()
  mappingId: string;

  @ApiProperty()
  direction: ServiceNowSyncDirection;

  @ApiProperty()
  recordsCreated: number;

  @ApiProperty()
  recordsUpdated: number;

  @ApiProperty()
  recordsFailed: number;

  @ApiPropertyOptional()
  errors?: string[];

  @ApiProperty()
  duration: number;

  @ApiProperty()
  syncedAt: Date;
}

export class CreateRecordDto {
  @ApiProperty({ description: 'GRC entity type', enum: GrcEntityType })
  @IsEnum(GrcEntityType)
  entityType: GrcEntityType;

  @ApiProperty({ description: 'GRC entity ID' })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ description: 'Table mapping ID' })
  @IsOptional()
  @IsString()
  mappingId?: string;

  @ApiPropertyOptional({ description: 'Additional ServiceNow fields' })
  @IsOptional()
  additionalFields?: Record<string, unknown>;
}

export class RecordLinkResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  snowSysId: string;

  @ApiProperty()
  snowNumber: string;

  @ApiProperty()
  snowUrl: string;

  @ApiProperty({ enum: GrcEntityType })
  grcEntityType: GrcEntityType;

  @ApiProperty()
  grcEntityId: string;

  @ApiProperty()
  lastSyncedAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class ServiceNowTableDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  label: string;
}

export class AssignmentGroupDto {
  @ApiProperty()
  sysId: string;

  @ApiProperty()
  name: string;
}
