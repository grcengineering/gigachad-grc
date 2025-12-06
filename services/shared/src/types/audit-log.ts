import { BaseEntity } from './common';

export type AuditAction =
  // Controls
  | 'control.created'
  | 'control.updated'
  | 'control.deleted'
  | 'control.status_changed'
  | 'control.owner_assigned'
  | 'control.tested'
  
  // Evidence
  | 'evidence.uploaded'
  | 'evidence.updated'
  | 'evidence.deleted'
  | 'evidence.approved'
  | 'evidence.rejected'
  | 'evidence.linked'
  | 'evidence.unlinked'
  | 'evidence.expired'
  
  // Frameworks
  | 'framework.enabled'
  | 'framework.disabled'
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.completed'
  | 'gap.created'
  | 'gap.resolved'
  | 'remediation.created'
  | 'remediation.completed'
  
  // Policies
  | 'policy.created'
  | 'policy.updated'
  | 'policy.deleted'
  | 'policy.version_uploaded'
  | 'policy.submitted_for_approval'
  | 'policy.approved'
  | 'policy.rejected'
  | 'policy.published'
  | 'policy.retired'
  | 'policy.review_scheduled'
  | 'policy.review_completed'
  
  // Integrations
  | 'integration.created'
  | 'integration.updated'
  | 'integration.deleted'
  | 'integration.synced'
  | 'integration.error'
  | 'api_key.created'
  | 'api_key.revoked'
  | 'webhook.received'
  
  // Users & Organization
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.login'
  | 'user.logout'
  | 'organization.updated'
  | 'organization.settings_changed'
  
  // Alerts
  | 'alert.created'
  | 'alert.acknowledged'
  | 'alert.resolved';

export type AuditEntityType =
  | 'control'
  | 'evidence'
  | 'framework'
  | 'assessment'
  | 'gap'
  | 'remediation'
  | 'policy'
  | 'integration'
  | 'api_key'
  | 'webhook'
  | 'user'
  | 'organization'
  | 'alert';

export interface AuditLog extends BaseEntity {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  
  description: string;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
  
  ipAddress?: string;
  userAgent?: string;
  
  timestamp: Date;
}

export interface AuditChanges {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  fields?: string[];
}

export interface AuditLogFilterParams {
  userId?: string;
  action?: AuditAction[];
  entityType?: AuditEntityType[];
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface AuditLogSummary {
  totalActions: number;
  byAction: Record<string, number>;
  byEntityType: Record<AuditEntityType, number>;
  byUser: { userId: string; userName: string; count: number }[];
  recentActivity: AuditLog[];
}

// DTO for creating audit logs
export interface CreateAuditLogDto {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  description: string;
  changes?: AuditChanges;
  metadata?: Record<string, unknown>;
}

// Helper function types for audit logging
export interface AuditContext {
  organizationId: string;
  userId: string;
  userEmail: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}



