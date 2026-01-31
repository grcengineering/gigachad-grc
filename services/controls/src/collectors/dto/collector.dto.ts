import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn, IsObject, IsUUID } from 'class-validator';

export class CreateCollectorDto {
  @ApiProperty({ description: 'Name of the evidence collector' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of what this collector does' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['standalone', 'integration'], description: 'Configuration mode' })
  @IsString()
  @IsIn(['standalone', 'integration'])
  mode: 'standalone' | 'integration';

  @ApiPropertyOptional({ description: 'Integration ID if using integration mode' })
  @IsOptional()
  @IsUUID()
  integrationId?: string;

  @ApiPropertyOptional({ description: 'Base URL for API calls (standalone mode)' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'API endpoint path' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'GET' })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  method?: string;

  @ApiPropertyOptional({ description: 'Custom headers for the request' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Request body (for POST/PUT/PATCH)' })
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['api_key', 'oauth2', 'bearer', 'basic'], description: 'Authentication type (standalone mode)' })
  @IsOptional()
  @IsString()
  @IsIn(['api_key', 'oauth2', 'bearer', 'basic'])
  authType?: string;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Response mapping configuration' })
  @IsOptional()
  @IsObject()
  responseMapping?: {
    titleField?: string; // JSONPath to extract title
    descriptionField?: string; // JSONPath to extract description
    dataField?: string; // JSONPath to extract main data
  };

  @ApiPropertyOptional({ description: 'Template for evidence title (use {{field}} for interpolation)' })
  @IsOptional()
  @IsString()
  evidenceTitle?: string;

  @ApiPropertyOptional({ description: 'Evidence type', default: 'automated' })
  @IsOptional()
  @IsString()
  evidenceType?: string;

  @ApiPropertyOptional({ description: 'Enable scheduled collection', default: false })
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'custom'], description: 'Schedule frequency' })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  scheduleFrequency?: string;

  @ApiPropertyOptional({ description: 'Cron expression for custom schedules' })
  @IsOptional()
  @IsString()
  scheduleCron?: string;
}

export class UpdateCollectorDto {
  @ApiPropertyOptional({ description: 'Name of the evidence collector' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of what this collector does' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['standalone', 'integration'], description: 'Configuration mode' })
  @IsOptional()
  @IsString()
  @IsIn(['standalone', 'integration'])
  mode?: 'standalone' | 'integration';

  @ApiPropertyOptional({ description: 'Integration ID if using integration mode' })
  @IsOptional()
  @IsUUID()
  integrationId?: string;

  @ApiPropertyOptional({ description: 'Base URL for API calls (standalone mode)' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'API endpoint path' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  method?: string;

  @ApiPropertyOptional({ description: 'Custom headers for the request' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Request body' })
  @IsOptional()
  @IsObject()
  body?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['api_key', 'oauth2', 'bearer', 'basic'] })
  @IsOptional()
  @IsString()
  @IsIn(['api_key', 'oauth2', 'bearer', 'basic'])
  authType?: string;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Response mapping configuration' })
  @IsOptional()
  @IsObject()
  responseMapping?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Template for evidence title' })
  @IsOptional()
  @IsString()
  evidenceTitle?: string;

  @ApiPropertyOptional({ description: 'Evidence type' })
  @IsOptional()
  @IsString()
  evidenceType?: string;

  @ApiPropertyOptional({ description: 'Enable scheduled collection' })
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly', 'custom'] })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'custom'])
  scheduleFrequency?: string;

  @ApiPropertyOptional({ description: 'Cron expression for custom schedules' })
  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @ApiPropertyOptional({ description: 'Whether the collector is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CollectorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  controlId: string;

  @ApiProperty()
  implementationId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  mode: string;

  @ApiPropertyOptional()
  integrationId?: string;

  @ApiPropertyOptional()
  integration?: {
    id: string;
    name: string;
    type: string;
  };

  @ApiPropertyOptional()
  baseUrl?: string;

  @ApiPropertyOptional()
  endpoint?: string;

  @ApiProperty()
  method: string;

  @ApiPropertyOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional()
  body?: Record<string, unknown>;

  @ApiPropertyOptional()
  authType?: string;

  @ApiPropertyOptional()
  authConfig?: Record<string, unknown>; // Masked

  @ApiPropertyOptional()
  responseMapping?: Record<string, unknown>;

  @ApiPropertyOptional()
  evidenceTitle?: string;

  @ApiProperty()
  evidenceType: string;

  @ApiProperty()
  scheduleEnabled: boolean;

  @ApiPropertyOptional()
  scheduleFrequency?: string;

  @ApiPropertyOptional()
  scheduleCron?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastRunAt?: Date;

  @ApiPropertyOptional()
  lastRunStatus?: string;

  @ApiPropertyOptional()
  lastRunError?: string;

  @ApiPropertyOptional()
  nextRunAt?: Date;

  @ApiProperty()
  totalRuns: number;

  @ApiProperty()
  successfulRuns: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CollectorRunResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  collectorId: string;

  @ApiProperty()
  triggeredBy: string;

  @ApiPropertyOptional()
  triggeredByUser?: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  evidenceCreated: number;

  @ApiPropertyOptional()
  evidenceId?: string;

  @ApiPropertyOptional()
  responseCode?: number;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiProperty()
  logs: Record<string, unknown>[];
}

export class TestCollectorDto {
  @ApiPropertyOptional({ description: 'Override base URL for testing' })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Override auth config for testing' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;
}

export class TestResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  statusCode?: number;

  @ApiPropertyOptional()
  responseTime?: number;

  @ApiPropertyOptional()
  data?: unknown;

  @ApiPropertyOptional()
  error?: string;
}
