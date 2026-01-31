import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsUrl, 
  IsOptional, 
  IsBoolean, 
  IsArray, 
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WebhookEventType {
  // Control events
  CONTROL_CREATED = 'control.created',
  CONTROL_UPDATED = 'control.updated',
  CONTROL_DELETED = 'control.deleted',
  CONTROL_STATUS_CHANGED = 'control.status_changed',

  // Policy events
  POLICY_CREATED = 'policy.created',
  POLICY_UPDATED = 'policy.updated',
  POLICY_PUBLISHED = 'policy.published',
  POLICY_APPROVED = 'policy.approved',

  // Risk events
  RISK_CREATED = 'risk.created',
  RISK_UPDATED = 'risk.updated',
  RISK_SCORE_CHANGED = 'risk.score_changed',

  // Evidence events
  EVIDENCE_UPLOADED = 'evidence.uploaded',
  EVIDENCE_APPROVED = 'evidence.approved',
  EVIDENCE_EXPIRED = 'evidence.expired',

  // Task events
  TASK_CREATED = 'task.created',
  TASK_COMPLETED = 'task.completed',
  TASK_OVERDUE = 'task.overdue',

  // Compliance events
  COMPLIANCE_CHECK_PASSED = 'compliance.check_passed',
  COMPLIANCE_CHECK_FAILED = 'compliance.check_failed',
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
}

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Webhook URL to receive events' })
  @IsUrl({ require_tld: true, require_protocol: true })
  url: string;

  @ApiPropertyOptional({ description: 'Secret for HMAC signature verification' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ 
    description: 'Event types to subscribe to',
    enum: WebhookEventType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events: WebhookEventType[];

  @ApiPropertyOptional({ description: 'Whether webhook is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Custom headers to send with requests' })
  @IsOptional()
  headers?: Record<string, string>;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: true, require_protocol: true })
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ enum: WebhookEventType, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  headers?: Record<string, string>;
}

export class WebhookDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: WebhookEventType, isArray: true })
  events: WebhookEventType[];

  @ApiProperty({ enum: WebhookStatus })
  status: WebhookStatus;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastTriggeredAt?: Date;

  @ApiPropertyOptional()
  lastError?: string;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class WebhookDeliveryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  webhookId: string;

  @ApiProperty({ enum: WebhookEventType })
  eventType: WebhookEventType;

  @ApiProperty()
  payload: Record<string, unknown>;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  createdAt: Date;
}

export class WebhookDeliveryQueryDto {
  @ApiPropertyOptional({ enum: WebhookEventType })
  @IsOptional()
  @IsEnum(WebhookEventType)
  eventType?: WebhookEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  successOnly?: boolean;

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

export class TestWebhookDto {
  @ApiPropertyOptional({ 
    description: 'Event type to simulate',
    enum: WebhookEventType,
    default: WebhookEventType.CONTROL_UPDATED,
  })
  @IsOptional()
  @IsEnum(WebhookEventType)
  eventType?: WebhookEventType = WebhookEventType.CONTROL_UPDATED;
}

export class TestWebhookResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiPropertyOptional()
  response?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  duration: number;
}
