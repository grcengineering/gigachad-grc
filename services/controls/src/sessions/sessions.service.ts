import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
// Simple user agent parsing (no external dependency)
import {
  SessionDto,
  SessionListQueryDto,
  SessionStatsDto,
  SessionSettingsDto,
  UpdateSessionSettingsDto,
} from './dto/session.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface SessionRecord {
  id: string;
  userId: string;
  organizationId: string;
  deviceInfo: string;
  browser: string;
  os: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

interface SessionSettings {
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  enforceSingleSession: boolean;
  requireReauthForSensitiveActions: boolean;
}

const DEFAULT_SETTINGS: SessionSettings = {
  sessionTimeoutMinutes: 480, // 8 hours
  maxConcurrentSessions: 5,
  enforceSingleSession: false,
  requireReauthForSensitiveActions: true,
};

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    userId: string,
    organizationId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<SessionDto> {
    const settings = await this.getSettings(organizationId);
    const { browser, os, device } = this.parseUserAgent(userAgent);

    const userSessions = await this.prisma.userSession.findMany({
      where: { organizationId, userId, isActive: true },
      orderBy: { lastActivityAt: 'asc' },
    });

    if (settings.enforceSingleSession && userSessions.length > 0) {
      await this.prisma.userSession.updateMany({
        where: { organizationId, userId, isActive: true },
        data: { isActive: false, invalidatedAt: new Date(), invalidReason: 'single_session' },
      });
      this.logger.log(`Enforced single session for user ${userId}, invalidated ${userSessions.length} sessions`);
    } else if (userSessions.length >= settings.maxConcurrentSessions) {
      const oldest = userSessions[0];
      await this.prisma.userSession.update({
        where: { id: oldest.id },
        data: { isActive: false, invalidatedAt: new Date(), invalidReason: 'session_limit' },
      });
      this.logger.log(`Session limit reached for user ${userId}, removed oldest session`);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + settings.sessionTimeoutMinutes * 60 * 1000);
    const created = await this.prisma.userSession.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        organizationId,
        deviceInfo: device,
        browser,
        os,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });
    const session = this.toRecord(created);
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'UserSession',
      entityId: session.id,
      description: `Created user session for ${userId}`,
      metadata: { ipAddress, deviceInfo: device },
    });
    this.logger.log(`Created session ${session.id} for user ${userId}`);

    return this.toDto(session, session.id);
  }

  async getUserSessions(
    organizationId: string,
    userId: string,
    currentSessionId: string,
    query: SessionListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.UserSessionWhereInput = {
      organizationId,
      userId,
      isActive: query.activeOnly ? true : undefined,
      expiresAt: query.activeOnly ? { gt: new Date() } : undefined,
    };
    const [sessions, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.userSession.count({ where }),
    ]);
    const dtos = sessions.map(s => this.toDto(this.toRecord(s), currentSessionId));

    return createPaginatedResponse(dtos, total, pagination);
  }

  async getAllSessions(
    organizationId: string,
    query: SessionListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.UserSessionWhereInput = {
      organizationId,
      userId: query.userId,
      isActive: query.activeOnly ? true : undefined,
      expiresAt: query.activeOnly ? { gt: new Date() } : undefined,
    };
    const [sessions, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where,
        orderBy: { lastActivityAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.userSession.count({ where }),
    ]);
    const dtos = sessions.map(s => this.toDto(this.toRecord(s), ''));

    return createPaginatedResponse(dtos, total, pagination);
  }

  async invalidateSession(
    organizationId: string,
    sessionId: string,
    currentSessionId: string,
    reason?: string,
  ): Promise<void> {
    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    if (sessionId === currentSessionId) {
      throw new ForbiddenException('Cannot invalidate your current session');
    }

    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false, invalidatedAt: new Date(), invalidReason: reason || 'manual' },
    });
    await auditMutation(this.prisma, {
      organizationId,
      action: 'INVALIDATE',
      entityType: 'UserSession',
      entityId: sessionId,
      description: `Invalidated session ${sessionId}`,
      metadata: { reason },
    });

    this.logger.log(`Invalidated session ${sessionId}${reason ? `: ${reason}` : ''}`);
  }

  async invalidateAllUserSessions(
    organizationId: string,
    userId: string,
    currentSessionId: string,
    reason?: string,
  ): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        organizationId,
        userId,
        id: { not: currentSessionId },
        isActive: true,
      },
      data: { isActive: false, invalidatedAt: new Date(), invalidReason: reason || 'manual' },
    });
    if (result.count > 0) {
      await auditMutation(this.prisma, {
        organizationId,
        userId,
        action: 'INVALIDATE_MANY',
        entityType: 'UserSession',
        entityId: userId,
        description: `Invalidated ${result.count} sessions for user ${userId}`,
        metadata: { reason, count: result.count },
      });
    }
    this.logger.log(`Invalidated ${result.count} sessions for user ${userId}${reason ? `: ${reason}` : ''}`);
    return result.count;
  }

  async invalidateAllSessions(
    organizationId: string,
    currentSessionId: string,
    reason?: string,
  ): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: { organizationId, id: { not: currentSessionId }, isActive: true },
      data: { isActive: false, invalidatedAt: new Date(), invalidReason: reason || 'manual' },
    });
    if (result.count > 0) {
      await auditMutation(this.prisma, {
        organizationId,
        action: 'INVALIDATE_ALL',
        entityType: 'UserSession',
        entityId: organizationId,
        description: `Invalidated ${result.count} sessions for organization`,
        metadata: { reason, count: result.count },
      });
    }
    this.logger.log(`Invalidated all ${result.count} sessions for org ${organizationId}${reason ? `: ${reason}` : ''}`);
    return result.count;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.prisma.userSession.findUnique({ where: { id: sessionId } });
    if (session && session.isActive) {
      const settings = await this.getSettings(session.organizationId);
      await this.prisma.userSession.update({
        where: { id: sessionId },
        data: {
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + settings.sessionTimeoutMinutes * 60 * 1000),
        },
      });
    }
  }

  async getSessionStats(organizationId: string): Promise<SessionStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const sessions = (await this.prisma.userSession.findMany({
      where: { organizationId },
    })).map((session) => this.toRecord(session));

    const activeSessions = sessions.filter(s => s.isActive && s.expiresAt > now);

    const browserCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();

    for (const session of activeSessions) {
      browserCounts.set(session.browser, (browserCounts.get(session.browser) || 0) + 1);
      osCounts.set(session.os, (osCounts.get(session.os) || 0) + 1);
    }

    return {
      totalActiveSessions: activeSessions.length,
      uniqueUsers: new Set(activeSessions.map(s => s.userId)).size,
      sessionsToday: sessions.filter(s => s.createdAt >= todayStart).length,
      sessionsThisWeek: sessions.filter(s => s.createdAt >= weekStart).length,
      browserDistribution: Array.from(browserCounts.entries())
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count),
      osDistribution: Array.from(osCounts.entries())
        .map(([os, count]) => ({ os, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getSessionSettings(organizationId: string): Promise<SessionSettingsDto> {
    return this.getSettings(organizationId);
  }

  async updateSessionSettings(
    organizationId: string,
    dto: UpdateSessionSettingsDto,
  ): Promise<SessionSettingsDto> {
    const current = await this.getSettings(organizationId);
    const updated: SessionSettings = {
      sessionTimeoutMinutes: dto.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
      maxConcurrentSessions: dto.maxConcurrentSessions ?? current.maxConcurrentSessions,
      enforceSingleSession: dto.enforceSingleSession ?? current.enforceSingleSession,
      requireReauthForSensitiveActions: dto.requireReauthForSensitiveActions ?? current.requireReauthForSensitiveActions,
    };
    await this.prisma.sessionSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...updated },
      update: updated,
    });
    await auditMutation(this.prisma, {
      organizationId,
      action: 'UPDATE',
      entityType: 'SessionSettings',
      entityId: organizationId,
      description: 'Updated organization session settings',
    });
    this.logger.log(`Updated session settings for org ${organizationId}`);
    return updated;
  }

  private async getSettings(organizationId: string): Promise<SessionSettings> {
    const settings = await this.prisma.sessionSettings.findUnique({
      where: { organizationId },
    });
    return settings
      ? {
          sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
          maxConcurrentSessions: settings.maxConcurrentSessions,
          enforceSingleSession: settings.enforceSingleSession,
          requireReauthForSensitiveActions: settings.requireReauthForSensitiveActions,
        }
      : { ...DEFAULT_SETTINGS };
  }

  private parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
    // Simple regex-based parsing
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'desktop';

    // Browser detection
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const match = userAgent.match(/Chrome\/(\d+)/);
      browser = match ? `Chrome ${match[1]}` : 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/);
      browser = match ? `Firefox ${match[1]}` : 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const match = userAgent.match(/Version\/(\d+)/);
      browser = match ? `Safari ${match[1]}` : 'Safari';
    } else if (userAgent.includes('Edg')) {
      const match = userAgent.match(/Edg\/(\d+)/);
      browser = match ? `Edge ${match[1]}` : 'Edge';
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      device = 'mobile';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
      device = userAgent.includes('iPad') ? 'tablet' : 'mobile';
    }

    return { browser, os, device };
  }

  private toRecord(session: {
    id: string;
    userId: string;
    organizationId: string;
    deviceInfo: string;
    browser: string;
    os: string;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    createdAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
  }): SessionRecord {
    return session;
  }

  private toDto(session: SessionRecord, currentSessionId: string): SessionDto {
    return {
      id: session.id,
      userId: session.userId,
      deviceInfo: session.deviceInfo,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      isActive: session.isActive && session.expiresAt > new Date(),
      isCurrent: session.id === currentSessionId,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt,
    };
  }
}
