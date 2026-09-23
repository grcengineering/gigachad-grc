import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * User session record stored in database
 */
interface UserSession {
  id: string;
  userId: string;
  organizationId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  // Session expiry time (30 minutes of inactivity)
  inactivityTimeoutMinutes: 30,
  
  // Absolute session expiry (24 hours)
  absoluteTimeoutHours: 24,
  
  // Maximum concurrent sessions per user
  maxConcurrentSessions: 5,
  
  // Extend session on activity
  extendOnActivity: true,
};

/**
 * Service for managing user sessions
 * 
 * Features:
 * - Track active sessions per user
 * - Session invalidation on password change
 * - "Logout all devices" functionality
 * - Session timeout and expiry
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new session for a user
   */
  async createSession(params: {
    userId: string;
    organizationId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<string> {
    const { userId, organizationId, ipAddress, userAgent } = params;
    
    // Generate session ID
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    // Create session record
    const session: UserSession = {
      id: sessionId,
      userId,
      organizationId,
      deviceInfo: this.parseDeviceInfo(userAgent),
      ipAddress,
      userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + SESSION_CONFIG.absoluteTimeoutHours * 60 * 60 * 1000),
      isActive: true,
    };

    // Check concurrent session limit
    await this.enforceSessionLimit(userId);

    await this.prisma.userSession.create({ data: session });

    // Log session creation
    this.logger.log(`Session created: user=${userId}, session=${sessionId.substring(0, 8)}...`);

    // Log to audit
    await this.logSessionEvent(userId, organizationId, 'session.created', {
      sessionId: sessionId.substring(0, 8),
      ipAddress,
      deviceInfo: session.deviceInfo,
    });

    return sessionId;
  }

  /**
   * Validate a session and update activity
   */
  async validateSession(sessionId: string): Promise<UserSession | null> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    
    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();

    // Check absolute expiry
    if (now > session.expiresAt) {
      await this.invalidateSession(sessionId, 'expired');
      return null;
    }

    // Check inactivity timeout
    const inactivityMs = now.getTime() - session.lastActivityAt.getTime();
    const timeoutMs = SESSION_CONFIG.inactivityTimeoutMinutes * 60 * 1000;
    
    if (inactivityMs > timeoutMs) {
      await this.invalidateSession(sessionId, 'inactive');
      return null;
    }

    // Extend session on activity
    if (SESSION_CONFIG.extendOnActivity) {
      session.lastActivityAt = now;
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: now },
      });
    }

    return session;
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string, reason: string = 'manual'): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    
    if (session) {
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: {
          isActive: false,
          invalidatedAt: new Date(),
          invalidReason: reason,
        },
      });

      this.logger.log(
        `Session invalidated: user=${session.userId}, ` +
        `session=${sessionId.substring(0, 8)}..., reason=${reason}`
      );

      await this.logSessionEvent(session.userId, session.organizationId, 'session.invalidated', {
        sessionId: sessionId.substring(0, 8),
        reason,
      });
    }

  }

  /**
   * Invalidate all sessions for a user (logout all devices)
   */
  async invalidateAllUserSessions(
    userId: string,
    reason: string = 'logout_all',
    excludeSessionId?: string,
  ): Promise<number> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        isActive: true,
      },
      select: { id: true, organizationId: true },
    });
    const result = await this.prisma.userSession.updateMany({
      where: {
        id: { in: sessions.map((session) => session.id) },
      },
      data: { isActive: false, invalidatedAt: new Date(), invalidReason: reason },
    });
    const organizationIds = [...new Set(sessions.map((session) => session.organizationId))];
    for (const organizationId of organizationIds) {
      await this.logSessionEvent(userId, organizationId, 'session.invalidated_all', {
        reason,
        count: sessions.filter((session) => session.organizationId === organizationId).length,
      });
    }

    this.logger.log(`Invalidated ${result.count} sessions for user ${userId}: reason=${reason}`);

    return result.count;
  }

  /**
   * Invalidate all sessions for a user on password change
   */
  async onPasswordChange(userId: string, currentSessionId?: string): Promise<void> {
    const count = await this.invalidateAllUserSessions(
      userId,
      'password_changed',
      currentSessionId,
    );

    this.logger.log(`Password changed for user ${userId}, invalidated ${count} sessions`);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    lastActivityAt: Date;
    createdAt: Date;
    isCurrent: boolean;
  }>> {
    const rows = await this.prisma.userSession.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      orderBy: { lastActivityAt: 'desc' },
    });
    const sessions = rows.map((session) => ({
      id: session.id.substring(0, 8) + '...',
      deviceInfo: session.deviceInfo,
      ipAddress: this.maskIpAddress(session.ipAddress),
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      isCurrent: false,
    }));

    return sessions;
  }

  /**
   * Enforce maximum concurrent sessions
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessions = await this.prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastActivityAt: 'asc' },
    });

    // If at or over limit, remove oldest sessions
    if (userSessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
      // Sort by last activity (oldest first)
      const toRemove = userSessions.length - SESSION_CONFIG.maxConcurrentSessions + 1;
      for (let i = 0; i < toRemove; i++) {
        await this.invalidateSession(userSessions[i].id, 'session_limit');
      }
    }
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse device info from user agent
   */
  private parseDeviceInfo(userAgent: string): string {
    if (!userAgent) {
      return 'Unknown Device';
    }

    // Simple parsing - in production, use a proper UA parser
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) return 'iPhone';
      if (userAgent.includes('Android')) return 'Android Phone';
      return 'Mobile Device';
    }

    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';

    return 'Desktop Browser';
  }

  /**
   * Mask IP address for privacy
   */
  private maskIpAddress(ip: string): string {
    if (!ip) return 'Unknown';
    
    // IPv4: show first two octets
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    
    // IPv6: show first segment
    if (ip.includes(':')) {
      return ip.split(':')[0] + ':****';
    }
    
    return 'Unknown';
  }

  /**
   * Log session event to audit log
   */
  private async logSessionEvent(
    userId: string,
    organizationId: string,
    action: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: 'session',
        entityId: (details.sessionId as string) || 'system',
        description: `Session event: ${action}`,
        metadata: details as Prisma.InputJsonValue,
        ipAddress: (details.ipAddress as string) || null,
      },
    });
  }

  /**
   * Clean up expired sessions (call periodically)
   * @returns Number of sessions cleaned up
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const inactivityCutoff = new Date(
      now.getTime() - SESSION_CONFIG.inactivityTimeoutMinutes * 60 * 1000,
    );
    const expired = await this.prisma.userSession.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: { lt: now } },
          { lastActivityAt: { lt: inactivityCutoff } },
        ],
      },
      select: { id: true, userId: true, organizationId: true },
    });
    const result = await this.prisma.userSession.updateMany({
      where: { id: { in: expired.map((session) => session.id) } },
      data: {
        isActive: false,
        invalidatedAt: now,
        invalidReason: 'expired',
      },
    });
    for (const organizationId of [...new Set(expired.map((session) => session.organizationId))]) {
      await this.logSessionEvent('system', organizationId, 'session.cleanup', {
        count: expired.filter((session) => session.organizationId === organizationId).length,
      });
    }

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * @deprecated Use cleanupExpiredSessions instead
   */
  cleanup(): void {
    this.cleanupExpiredSessions().catch(err => {
      this.logger.error('Failed to cleanup sessions', err);
    });
  }
}

