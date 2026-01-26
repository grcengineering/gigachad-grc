import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  PortalLoginDto,
  PortalSessionDto,
  CreatePortalUserDto,
  UpdatePortalUserDto,
  PortalUserResponseDto,
  PortalAccessLogDto,
} from './dto/portal.dto';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Authenticate a portal user with access code
   */
  async authenticate(
    dto: PortalLoginDto,
    ipAddress: string,
    userAgent?: string,
  ): Promise<PortalSessionDto> {
    // First check if it's a legacy single access code on the audit
    const auditWithCode = await this.prisma.audit.findUnique({
      where: { portalAccessCode: dto.accessCode },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (auditWithCode) {
      // Legacy single access code - check if portal is enabled and not expired
      if (!auditWithCode.auditPortalEnabled) {
        await this.logAccess(auditWithCode.id, null, dto.accessCode, 'login', ipAddress, userAgent, false, 'Portal not enabled');
        throw new UnauthorizedException('Portal access is not enabled for this audit');
      }

      if (auditWithCode.portalExpiresAt && new Date() > auditWithCode.portalExpiresAt) {
        await this.logAccess(auditWithCode.id, null, dto.accessCode, 'login', ipAddress, userAgent, false, 'Access code expired');
        throw new UnauthorizedException('Portal access has expired');
      }

      await this.logAccess(auditWithCode.id, null, dto.accessCode, 'login', ipAddress, userAgent, true);

      return {
        auditId: auditWithCode.id,
        auditName: auditWithCode.name,
        auditorName: auditWithCode.externalLeadName || 'External Auditor',
        auditorEmail: auditWithCode.externalLeadEmail || '',
        role: 'external_auditor',
        organizationName: auditWithCode.organization.name,
        expiresAt: auditWithCode.portalExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        permissions: {
          canViewAll: true,
          canUpload: false,
          canComment: true,
        },
        portalUserId: 'legacy',
      };
    }

    // Check individual portal user
    const portalUser = await this.prisma.auditPortalUser.findFirst({
      where: { accessCode: dto.accessCode },
      include: {
        audit: {
          include: {
            organization: { select: { name: true } },
          },
        },
      },
    });

    if (!portalUser) {
      throw new UnauthorizedException('Invalid access code');
    }

    if (!portalUser.isActive) {
      await this.logAccess(portalUser.auditId, portalUser.id, dto.accessCode, 'login', ipAddress, userAgent, false, 'Account deactivated');
      throw new UnauthorizedException('This access has been revoked');
    }

    if (new Date() > portalUser.expiresAt) {
      await this.logAccess(portalUser.auditId, portalUser.id, dto.accessCode, 'login', ipAddress, userAgent, false, 'Access code expired');
      throw new UnauthorizedException('Portal access has expired');
    }

    // Check IP restrictions
    if (portalUser.enforceIpRestriction && portalUser.allowedIpRanges.length > 0) {
      if (!this.isIpAllowed(ipAddress, portalUser.allowedIpRanges)) {
        await this.logAccess(portalUser.auditId, portalUser.id, dto.accessCode, 'login', ipAddress, userAgent, false, 'IP not allowed');
        throw new ForbiddenException('Access from this IP address is not allowed');
      }
    }

    // Update last login
    await this.prisma.auditPortalUser.update({
      where: { id: portalUser.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAccess(portalUser.auditId, portalUser.id, dto.accessCode, 'login', ipAddress, userAgent, true);

    return {
      auditId: portalUser.auditId,
      auditName: portalUser.audit.name,
      auditorName: portalUser.name,
      auditorEmail: portalUser.email,
      role: portalUser.role,
      organizationName: portalUser.audit.organization.name,
      expiresAt: portalUser.expiresAt,
      permissions: {
        canViewAll: portalUser.canViewAll,
        canUpload: portalUser.canUpload,
        canComment: portalUser.canComment,
      },
      portalUserId: portalUser.id,
    };
  }

  /**
   * Check if an IP is in the allowed ranges
   */
  private isIpAllowed(ip: string, allowedRanges: string[]): boolean {
    // Simple implementation - in production, use a proper CIDR library
    for (const range of allowedRanges) {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [networkIp, bits] = range.split('/');
        if (ip.startsWith(networkIp.split('.').slice(0, parseInt(bits) / 8).join('.'))) {
          return true;
        }
      } else if (ip === range) {
        return true;
      }
    }
    return false;
  }

  /**
   * Log portal access
   */
  async logAccess(
    auditId: string,
    portalUserId: string | null,
    accessCode: string,
    action: string,
    ipAddress: string,
    userAgent?: string,
    success: boolean = true,
    failureReason?: string,
    entityType?: string,
    entityId?: string,
    entityName?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditPortalAccessLog.create({
      data: {
        auditId,
        portalUserId,
        accessCode,
        action,
        entityType,
        entityId,
        entityName,
        ipAddress,
        userAgent,
        success,
        failureReason,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });
  }

  /**
   * Create a new portal user for an audit
   */
  async createPortalUser(
    auditId: string,
    organizationId: string,
    dto: CreatePortalUserDto,
    invitedBy: string,
  ): Promise<PortalUserResponseDto> {
    // Verify audit exists and belongs to organization
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Generate unique access code
    const accessCode = this.generateAccessCode();

    // Default expiration to 30 days if not provided
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const portalUser = await this.prisma.auditPortalUser.create({
      data: {
        auditId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        accessCode,
        canViewAll: dto.canViewAll ?? true,
        canUpload: dto.canUpload ?? false,
        canComment: dto.canComment ?? true,
        allowedIpRanges: dto.allowedIpRanges || [],
        enforceIpRestriction: dto.enforceIpRestriction ?? false,
        downloadLimit: dto.downloadLimit,
        enableWatermark: dto.enableWatermark ?? true,
        watermarkText: dto.watermarkText,
        invitedBy,
        expiresAt,
      },
    });

    this.logger.log(`Created portal user: ${portalUser.email} for audit ${auditId}`);

    // Enable portal on audit if not already enabled
    if (!audit.auditPortalEnabled) {
      await this.prisma.audit.update({
        where: { id: auditId },
        data: { auditPortalEnabled: true },
      });
    }

    return this.toPortalUserResponseDto(portalUser);
  }

  /**
   * List all portal users for an audit
   */
  async listPortalUsers(auditId: string, organizationId: string): Promise<PortalUserResponseDto[]> {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const users = await this.prisma.auditPortalUser.findMany({
      where: { auditId },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.toPortalUserResponseDto(u, false));
  }

  /**
   * Update a portal user
   */
  async updatePortalUser(
    auditId: string,
    userId: string,
    organizationId: string,
    dto: UpdatePortalUserDto,
  ): Promise<PortalUserResponseDto> {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const existing = await this.prisma.auditPortalUser.findFirst({
      where: { id: userId, auditId },
    });

    if (!existing) {
      throw new NotFoundException('Portal user not found');
    }

    const updated = await this.prisma.auditPortalUser.update({
      where: { id: userId },
      data: {
        name: dto.name,
        role: dto.role,
        isActive: dto.isActive,
        canViewAll: dto.canViewAll,
        canUpload: dto.canUpload,
        canComment: dto.canComment,
        allowedIpRanges: dto.allowedIpRanges,
        enforceIpRestriction: dto.enforceIpRestriction,
        downloadLimit: dto.downloadLimit,
        enableWatermark: dto.enableWatermark,
        watermarkText: dto.watermarkText,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    this.logger.log(`Updated portal user: ${updated.email}`);

    return this.toPortalUserResponseDto(updated, false);
  }

  /**
   * Delete a portal user
   */
  async deletePortalUser(
    auditId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const existing = await this.prisma.auditPortalUser.findFirst({
      where: { id: userId, auditId },
    });

    if (!existing) {
      throw new NotFoundException('Portal user not found');
    }

    await this.prisma.auditPortalUser.delete({
      where: { id: userId },
    });

    this.logger.log(`Deleted portal user: ${existing.email}`);
  }

  /**
   * Get access logs for an audit
   */
  async getAccessLogs(
    auditId: string,
    organizationId: string,
    limit: number = 100,
  ): Promise<PortalAccessLogDto[]> {
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    const logs = await this.prisma.auditPortalAccessLog.findMany({
      where: { auditId },
      include: {
        portalUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType || undefined,
      entityId: log.entityId || undefined,
      entityName: log.entityName || undefined,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent || undefined,
      success: log.success,
      failureReason: log.failureReason || undefined,
      timestamp: log.timestamp,
      portalUser: log.portalUser || undefined,
    }));
  }

  /**
   * Check and increment download count
   */
  async checkAndIncrementDownload(portalUserId: string): Promise<boolean> {
    const user = await this.prisma.auditPortalUser.findUnique({
      where: { id: portalUserId },
    });

    if (!user) {
      return false;
    }

    // Check if download limit is set and exceeded
    if (user.downloadLimit !== null && user.downloadsUsed >= user.downloadLimit) {
      // Check if we need to reset the counter
      if (user.downloadLimitResetAt && new Date() > user.downloadLimitResetAt) {
        // Reset counter
        await this.prisma.auditPortalUser.update({
          where: { id: portalUserId },
          data: {
            downloadsUsed: 1,
            downloadLimitResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Reset in 24 hours
          },
        });
        return true;
      }
      return false; // Limit exceeded
    }

    // Increment download count
    await this.prisma.auditPortalUser.update({
      where: { id: portalUserId },
      data: {
        downloadsUsed: { increment: 1 },
      },
    });

    return true;
  }

  /**
   * Get portal user watermark info
   */
  async getWatermarkInfo(portalUserId: string): Promise<{ enabled: boolean; text: string } | null> {
    const user = await this.prisma.auditPortalUser.findUnique({
      where: { id: portalUserId },
    });

    if (!user || !user.enableWatermark) {
      return null;
    }

    return {
      enabled: true,
      text: user.watermarkText || `${user.name} - ${user.email} - ${new Date().toISOString()}`,
    };
  }

  /**
   * Generate a unique access code
   */
  private generateAccessCode(): string {
    return `AUD-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Convert to response DTO
   */
  private toPortalUserResponseDto(user: any, includeAccessCode: boolean = true): PortalUserResponseDto {
    return {
      id: user.id,
      auditId: user.auditId,
      name: user.name,
      email: user.email,
      role: user.role,
      accessCode: includeAccessCode ? user.accessCode : '********',
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt || undefined,
      canViewAll: user.canViewAll,
      canUpload: user.canUpload,
      canComment: user.canComment,
      allowedIpRanges: user.allowedIpRanges || [],
      enforceIpRestriction: user.enforceIpRestriction,
      downloadLimit: user.downloadLimit || undefined,
      downloadsUsed: user.downloadsUsed,
      enableWatermark: user.enableWatermark,
      watermarkText: user.watermarkText || undefined,
      expiresAt: user.expiresAt,
      createdAt: user.createdAt,
    };
  }
}
