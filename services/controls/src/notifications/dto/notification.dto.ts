import { IsString, IsOptional, IsBoolean, IsUUID, IsEnum, IsDateString, IsObject, IsInt, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ===========================
// Notification Types
// ===========================

export enum NotificationType {
  // Control notifications
  CONTROL_STATUS_CHANGED = 'control_status_changed',
  CONTROL_DUE_SOON = 'control_due_soon',
  CONTROL_OVERDUE = 'control_overdue',
  
  // Evidence notifications
  EVIDENCE_EXPIRING = 'evidence_expiring',
  EVIDENCE_EXPIRED = 'evidence_expired',
  EVIDENCE_REVIEWED = 'evidence_reviewed',
  
  // Task notifications
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_COMPLETED = 'task_completed',
  
  // Policy notifications
  POLICY_REVIEW_DUE = 'policy_review_due',
  POLICY_STATUS_CHANGED = 'policy_status_changed',
  POLICY_APPROVED = 'policy_approved',
  POLICY_REJECTED = 'policy_rejected',
  
  // Collector notifications
  COLLECTOR_SUCCESS = 'collector_success',
  COLLECTOR_FAILED = 'collector_failed',
  
  // Integration notifications
  INTEGRATION_SYNC_FAILED = 'integration_sync_failed',
  INTEGRATION_CONNECTED = 'integration_connected',
  INTEGRATION_DISCONNECTED = 'integration_disconnected',
  
  // Risk notifications
  RISK_STATUS_CHANGED = 'risk_status_changed',
  RISK_ASSESSMENT_ASSIGNED = 'risk_assessment_assigned',
  RISK_TREATMENT_ASSIGNED = 'risk_treatment_assigned',
  RISK_APPROVAL_REQUIRED = 'risk_approval_required',
  RISK_MITIGATION_UPDATE = 'risk_mitigation_update',
  
  // Comment notifications
  COMMENT_MENTION = 'comment_mention',
  COMMENT_REPLY = 'comment_reply',
  
  // BC/DR notifications
  BCDR_ATTESTATION_REQUESTED = 'bcdr_attestation_requested',
  BCDR_INCIDENT_DECLARED = 'bcdr_incident_declared',
  BCDR_PLAN_ACTIVATED = 'bcdr_plan_activated',
  BCDR_EXERCISE_SCHEDULED = 'bcdr_exercise_scheduled',
  BCDR_EXERCISE_COMPLETED = 'bcdr_exercise_completed',
  BCDR_RECOVERY_TEAM_ASSIGNED = 'bcdr_recovery_team_assigned',
  
  // General
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

// ===========================
// Create/Internal DTOs
// ===========================

export class CreateNotificationDto {
  @IsString()
  organizationId: string;

  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BulkCreateNotificationDto {
  @IsArray()
  userIds: string[];

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ===========================
// Query/Filter DTOs
// ===========================

export class NotificationFilterDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  severities?: string[];

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

// ===========================
// Preference DTOs
// ===========================

export class NotificationPreferenceDto {
  @IsEnum(NotificationType)
  notificationType: NotificationType;

  @IsBoolean()
  inApp: boolean;

  @IsBoolean()
  email: boolean;
}

export class UpdatePreferencesDto {
  @IsArray()
  preferences: NotificationPreferenceDto[];
}

// ===========================
// Response DTOs
// ===========================

export class NotificationResponseDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  severity: string;
  isRead: boolean;
  readAt?: Date | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export class NotificationListResponseDto {
  notifications: NotificationResponseDto[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export class NotificationPreferenceResponseDto {
  notificationType: string;
  typeName: string;
  category: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

export class PreferencesListResponseDto {
  preferences: NotificationPreferenceResponseDto[];
}

// ===========================
// Action DTOs
// ===========================

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds?: string[];

  @IsOptional()
  @IsBoolean()
  markAll?: boolean;
}

// ===========================
// Stats DTO
// ===========================

export class NotificationStatsDto {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentCount: number; // Last 24 hours
}

