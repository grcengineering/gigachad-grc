import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Security event types for comprehensive audit logging
 */
export enum SecurityEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_SESSION_CREATED = 'auth.session.created',
  AUTH_SESSION_EXPIRED = 'auth.session.expired',
  AUTH_SESSION_REVOKED = 'auth.session.revoked',
  AUTH_PASSWORD_CHANGED = 'auth.password.changed',
  AUTH_PASSWORD_RESET_REQUESTED = 'auth.password_reset.requested',
  AUTH_PASSWORD_RESET_COMPLETED = 'auth.password_reset.completed',
  AUTH_MFA_ENABLED = 'auth.mfa.enabled',
  AUTH_MFA_DISABLED = 'auth.mfa.disabled',
  
  // API Key events
  API_KEY_CREATED = 'api_key.created',
  API_KEY_USED = 'api_key.used',
  API_KEY_REVOKED = 'api_key.revoked',
  API_KEY_EXPIRED = 'api_key.expired',
  
  // Permission events
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  PERMISSION_CHECK_FAILED = 'permission.check_failed',
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REMOVED = 'role.removed',
  
  // Data access events
  DATA_EXPORT = 'data.export',
  DATA_BULK_DELETE = 'data.bulk_delete',
  DATA_BULK_UPDATE = 'data.bulk_update',
  DATA_IMPORT = 'data.import',
  SENSITIVE_DATA_ACCESS = 'data.sensitive_access',
  
  // Admin events
  ADMIN_USER_CREATED = 'admin.user.created',
  ADMIN_USER_DELETED = 'admin.user.deleted',
  ADMIN_USER_MODIFIED = 'admin.user.modified',
  ADMIN_SETTINGS_CHANGED = 'admin.settings.changed',
  ADMIN_MODULE_ENABLED = 'admin.module.enabled',
  ADMIN_MODULE_DISABLED = 'admin.module.disabled',
  ADMIN_INTEGRATION_CONFIGURED = 'admin.integration.configured',
  
  // Security alerts
  SECURITY_BRUTE_FORCE_DETECTED = 'security.brute_force.detected',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SECURITY_INVALID_TOKEN = 'security.invalid_token',
  
  // Compliance events
  COMPLIANCE_EVIDENCE_UPLOADED = 'compliance.evidence.uploaded',
  COMPLIANCE_CONTROL_STATUS_CHANGED = 'compliance.control.status_changed',
  COMPLIANCE_AUDIT_STARTED = 'compliance.audit.started',
  COMPLIANCE_AUDIT_COMPLETED = 'compliance.audit.completed',
}

/**
 * Severity levels for security events
 */
export enum SecurityEventSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Parameters for logging a security event
 */
export interface SecurityEventParams {
  eventType: SecurityEventType | string;
  severity?: SecurityEventSeverity;
  userId?: string | null;
  userEmail?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  success?: boolean;
}

/**
 * Service for comprehensive security audit logging
 * 
 * This service provides structured logging for all security-relevant events
 * including authentication, authorization, data access, and admin actions.
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a security event
   */
  async logSecurityEvent(params: SecurityEventParams): Promise<void> {
    const {
      eventType,
      severity = SecurityEventSeverity.INFO,
      userId,
      userEmail,
      organizationId,
      ipAddress,
      userAgent,
      resourceType,
      resourceId,
      description,
      details = {},
      success = true,
    } = params;

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          userEmail,
          action: eventType,
          entityType: resourceType || 'security',
          entityId: resourceId || 'system',
          description,
          metadata: {
            ...details,
            severity,
            success,
            userAgent,
            eventTimestamp: new Date().toISOString(),
          },
          ipAddress,
        },
      });

      // Log to console for high severity events
      if (severity === SecurityEventSeverity.HIGH || severity === SecurityEventSeverity.CRITICAL) {
        this.logger.warn(
          `[SECURITY ${severity.toUpperCase()}] ${eventType}: ${description} ` +
          `(user=${userId || 'anonymous'}, ip=${ipAddress || 'unknown'})`
        );
      }
    } catch (error) {
      this.logger.error(`Failed to log security event: ${error}`);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  // ===========================
  // Authentication Events
  // ===========================

  async logLoginSuccess(params: {
    userId: string;
    userEmail: string;
    organizationId: string;
    ipAddress: string;
    userAgent?: string;
    method?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.AUTH_LOGIN_SUCCESS,
      severity: SecurityEventSeverity.INFO,
      ...params,
      description: `Successful login from ${params.ipAddress}`,
      details: { method: params.method || 'password' },
    });
  }

  async logLoginFailed(params: {
    userEmail: string;
    organizationId: string;
    ipAddress: string;
    userAgent?: string;
    reason: string;
    attemptCount?: number;
  }): Promise<void> {
    const severity = (params.attemptCount || 0) >= 5 
      ? SecurityEventSeverity.HIGH 
      : SecurityEventSeverity.MEDIUM;

    await this.logSecurityEvent({
      eventType: SecurityEventType.AUTH_LOGIN_FAILED,
      severity,
      ...params,
      userId: null,
      description: `Failed login attempt: ${params.reason}`,
      details: { 
        attemptCount: params.attemptCount,
        reason: params.reason,
      },
      success: false,
    });
  }

  async logLogout(params: {
    userId: string;
    organizationId: string;
    ipAddress?: string;
    allDevices?: boolean;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.AUTH_LOGOUT,
      severity: SecurityEventSeverity.INFO,
      ...params,
      description: params.allDevices 
        ? 'User logged out from all devices' 
        : 'User logged out',
      details: { allDevices: params.allDevices },
    });
  }

  async logPasswordChange(params: {
    userId: string;
    organizationId: string;
    ipAddress?: string;
    initiatedBy?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.AUTH_PASSWORD_CHANGED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      description: 'Password changed',
      details: { initiatedBy: params.initiatedBy || 'user' },
    });
  }

  // ===========================
  // API Key Events
  // ===========================

  async logApiKeyCreated(params: {
    userId: string;
    organizationId: string;
    apiKeyId: string;
    apiKeyName: string;
    scopes: string[];
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.API_KEY_CREATED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: 'api_key',
      resourceId: params.apiKeyId,
      description: `API key created: ${params.apiKeyName}`,
      details: { scopes: params.scopes },
    });
  }

  async logApiKeyUsed(params: {
    organizationId: string;
    apiKeyId: string;
    apiKeyName: string;
    ipAddress: string;
    endpoint: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.API_KEY_USED,
      severity: SecurityEventSeverity.INFO,
      ...params,
      resourceType: 'api_key',
      resourceId: params.apiKeyId,
      description: `API key used: ${params.apiKeyName}`,
      details: { endpoint: params.endpoint },
    });
  }

  async logApiKeyRevoked(params: {
    userId: string;
    organizationId: string;
    apiKeyId: string;
    apiKeyName: string;
    reason?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.API_KEY_REVOKED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: 'api_key',
      resourceId: params.apiKeyId,
      description: `API key revoked: ${params.apiKeyName}`,
      details: { reason: params.reason },
    });
  }

  // ===========================
  // Permission Events
  // ===========================

  async logPermissionCheckFailed(params: {
    userId: string;
    organizationId: string;
    resource: string;
    action: string;
    resourceId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.PERMISSION_CHECK_FAILED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: params.resource,
      resourceId: params.resourceId,
      description: `Permission denied: ${params.action} on ${params.resource}`,
      success: false,
    });
  }

  async logRoleAssigned(params: {
    userId: string;
    organizationId: string;
    targetUserId: string;
    role: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.ROLE_ASSIGNED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: 'user',
      resourceId: params.targetUserId,
      description: `Role '${params.role}' assigned to user`,
      details: { targetUserId: params.targetUserId, role: params.role },
    });
  }

  // ===========================
  // Data Events
  // ===========================

  async logDataExport(params: {
    userId: string;
    organizationId: string;
    exportType: string;
    recordCount: number;
    ipAddress?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.DATA_EXPORT,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: 'export',
      description: `Data exported: ${params.exportType} (${params.recordCount} records)`,
      details: { exportType: params.exportType, recordCount: params.recordCount },
    });
  }

  async logBulkOperation(params: {
    userId: string;
    organizationId: string;
    operation: 'delete' | 'update';
    entityType: string;
    recordCount: number;
    ipAddress?: string;
  }): Promise<void> {
    const eventType = params.operation === 'delete' 
      ? SecurityEventType.DATA_BULK_DELETE 
      : SecurityEventType.DATA_BULK_UPDATE;

    await this.logSecurityEvent({
      eventType,
      severity: SecurityEventSeverity.HIGH,
      ...params,
      resourceType: params.entityType,
      description: `Bulk ${params.operation}: ${params.recordCount} ${params.entityType} records`,
      details: { operation: params.operation, recordCount: params.recordCount },
    });
  }

  // ===========================
  // Security Alerts
  // ===========================

  async logBruteForceDetected(params: {
    identifier: string;
    ipAddress: string;
    attemptCount: number;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_BRUTE_FORCE_DETECTED,
      severity: SecurityEventSeverity.CRITICAL,
      organizationId: '00000000-0000-0000-0000-000000000000', // System
      userId: null,
      userEmail: params.identifier,
      ipAddress: params.ipAddress,
      description: `Brute force attack detected: ${params.attemptCount} failed attempts`,
      details: {
        identifier: params.identifier,
        attemptCount: params.attemptCount,
        alertType: 'brute_force',
      },
      success: false,
    });
  }

  async logRateLimitExceeded(params: {
    userId?: string;
    organizationId: string;
    ipAddress: string;
    endpoint: string;
    limit: number;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_RATE_LIMIT_EXCEEDED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      description: `Rate limit exceeded on ${params.endpoint}`,
      details: { endpoint: params.endpoint, limit: params.limit },
      success: false,
    });
  }

  async logUnauthorizedAccess(params: {
    userId?: string;
    organizationId: string;
    ipAddress: string;
    resource: string;
    resourceId?: string;
    reason: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.SECURITY_UNAUTHORIZED_ACCESS,
      severity: SecurityEventSeverity.HIGH,
      ...params,
      resourceType: params.resource,
      resourceId: params.resourceId,
      description: `Unauthorized access attempt: ${params.reason}`,
      details: { reason: params.reason },
      success: false,
    });
  }

  // ===========================
  // Admin Events
  // ===========================

  async logAdminAction(params: {
    userId: string;
    organizationId: string;
    action: string;
    targetType: string;
    targetId: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: `admin.${params.action}`,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: params.targetType,
      resourceId: params.targetId,
      description: `Admin action: ${params.action} on ${params.targetType}`,
      details: { changes: params.changes },
    });
  }

  async logSettingsChanged(params: {
    userId: string;
    organizationId: string;
    settingName: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
  }): Promise<void> {
    await this.logSecurityEvent({
      eventType: SecurityEventType.ADMIN_SETTINGS_CHANGED,
      severity: SecurityEventSeverity.MEDIUM,
      ...params,
      resourceType: 'settings',
      resourceId: params.settingName,
      description: `Setting changed: ${params.settingName}`,
      details: {
        settingName: params.settingName,
        oldValue: params.oldValue,
        newValue: params.newValue,
      },
    });
  }

  // ===========================
  // Query Methods
  // ===========================

  /**
   * Get security events for an organization
   */
  async getSecurityEvents(
    organizationId: string,
    filters: {
      eventTypes?: string[];
      severity?: SecurityEventSeverity[];
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (filters.eventTypes?.length) {
      where.action = { in: filters.eventTypes };
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    // Filter by severity if provided (stored in details.severity)
    // Note: This requires JSONB query support

    const [events, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { events, total };
  }
}

