import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XLSX = 'xlsx',
  PPTX = 'pptx',
}

export enum ExportEntityType {
  Controls = 'controls',
  Policies = 'policies',
  Risks = 'risks',
  Evidence = 'evidence',
  Tasks = 'tasks',
  AuditLogs = 'audit_logs',
  Users = 'users',
  Frameworks = 'frameworks',
  FullOrg = 'full_org',
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export class CreateExportJobDto {
  @ApiProperty({ enum: ExportEntityType })
  @IsEnum(ExportEntityType)
  entityType: ExportEntityType;

  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.JSON })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @ApiPropertyOptional({ description: 'Filter criteria for the export' })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Specific fields to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @ApiPropertyOptional({ description: 'Include related entities', default: false })
  @IsOptional()
  @IsBoolean()
  includeRelations?: boolean = false;
}

export class ExportJobDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExportEntityType })
  entityType: ExportEntityType;

  @ApiProperty({ enum: ExportFormat })
  format: ExportFormat;

  @ApiProperty({ enum: ExportStatus })
  status: ExportStatus;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional()
  fileSize?: number;

  @ApiPropertyOptional()
  downloadUrl?: string;

  @ApiPropertyOptional()
  expiresAt?: Date;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  recordCount?: number;

  @ApiProperty()
  requestedBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export class ExportJobListQueryDto {
  @ApiPropertyOptional({ enum: ExportStatus })
  @IsOptional()
  @IsEnum(ExportStatus)
  status?: ExportStatus;

  @ApiPropertyOptional({ enum: ExportEntityType })
  @IsOptional()
  @IsEnum(ExportEntityType)
  entityType?: ExportEntityType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
