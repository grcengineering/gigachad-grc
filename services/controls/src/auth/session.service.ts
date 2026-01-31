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
 * In-memory session store (for development)
 * In production, this should be backed by Redis for distributed systems
 */
const sessionStore = new Map<string, UserSession>();

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

    // Store session
    sessionStore.set(sessionId, session);

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
    const session = sessionStore.get(sessionId);
    
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
      sessionStore.set(sessionId, session);
    }

    return session;
  }

  /**
   * Invalidate a specific session
   */
  async invalidateSession(sessionId: string, reason: string = 'manual'): Promise<void> {
    const session = sessionStore.get(sessionId);
    
    if (session) {
      session.isActive = false;
      sessionStore.set(sessionId, session);

      this.logger.log(
        `Session invalidated: user=${session.userId}, ` +
        `session=${sessionId.substring(0, 8)}..., reason=${reason}`
      );

      await this.logSessionEvent(session.userId, session.organizationId, 'session.invalidated', {
        sessionId: sessionId.substring(0, 8),
        reason,
      });
    }

    sessionStore.delete(sessionId);
  }

  /**
   * Invalidate all sessions for a user (logout all devices)
   */
  async invalidateAllUserSessions(
    userId: string,
    reason: string = 'logout_all',
    excludeSessionId?: string,
  ): Promise<number> {
    let count = 0;

    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId && sessionId !== excludeSessionId) {
        await this.invalidateSession(sessionId, reason);
        count++;
      }
    }

    this.logger.log(`Invalidated ${count} sessions for user ${userId}: reason=${reason}`);

    return count;
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
    const sessions: Array<{
      id: string;
      deviceInfo: string;
      ipAddress: string;
      lastActivityAt: Date;
      createdAt: Date;
      isCurrent: boolean;
    }> = [];

    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId && session.isActive) {
        sessions.push({
          id: sessionId.substring(0, 8) + '...',
          deviceInfo: session.deviceInfo,
          ipAddress: this.maskIpAddress(session.ipAddress),
          lastActivityAt: session.lastActivityAt,
          createdAt: session.createdAt,
          isCurrent: false, // Set by controller based on current request
        });
      }
    }

    return sessions.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());
  }

  /**
   * Enforce maximum concurrent sessions
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const userSessions: Array<[string, UserSession]> = [];

    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId && session.isActive) {
        userSessions.push([sessionId, session]);
      }
    }

    // If at or over limit, remove oldest sessions
    if (userSessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
      // Sort by last activity (oldest first)
      userSessions.sort((a, b) => 
        a[1].lastActivityAt.getTime() - b[1].lastActivityAt.getTime()
      );

      // Remove oldest sessions to make room
      const toRemove = userSessions.length - SESSION_CONFIG.maxConcurrentSessions + 1;
      for (let i = 0; i < toRemove; i++) {
        await this.invalidateSession(userSessions[i][0], 'session_limit');
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
    try {
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
    } catch (error) {
      this.logger.error(`Failed to log session event: ${error}`);
    }
  }

  /**
   * Clean up expired sessions (call periodically)
   * @returns Number of sessions cleaned up
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of sessionStore.entries()) {
      const inactivityMs = now.getTime() - session.lastActivityAt.getTime();
      const timeoutMs = SESSION_CONFIG.inactivityTimeoutMinutes * 60 * 1000;

      if (now > session.expiresAt || inactivityMs > timeoutMs) {
        sessionStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired sessions`);
    }

    return cleaned;
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

