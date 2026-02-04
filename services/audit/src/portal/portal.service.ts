import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditPortalUser } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;
import { maskEmail } from '@gigachad-grc/shared';
import {
  PortalLoginDto,
  PortalSessionDto,
  CreatePortalUserDto,
  UpdatePortalUserDto,
  PortalUserResponseDto,
  PortalAccessLogDto,
} from './dto/portal.dto';

/**
 * Validates CIDR notation (e.g., "192.168.1.0/24" or single IPs like "10.0.0.1")
 * @param cidr - The CIDR string to validate
 * @returns true if valid CIDR notation or single IP, false otherwise
 */
export function isValidCidr(cidr: string): boolean {
  // Handle single IP addresses (no CIDR prefix)
  if (!cidr.includes('/')) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(cidr)) return false;
    const octets = cidr.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  // Validate CIDR format
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/(\d{1,2})$/;
  if (!cidrRegex.test(cidr)) return false;

  const [ip, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  // Validate prefix length (0-32 for IPv4)
  if (prefix < 0 || prefix > 32) return false;

  // Validate each octet
  const octets = ip.split('.');
  return octets.every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate an array of CIDR strings and throw BadRequestException with details on invalid entries
 * @param cidrs - Array of CIDR strings to validate
 * @throws BadRequestException if any CIDR is invalid
 */
export function validateCidrArray(cidrs: string[]): void {
  const invalidCidrs: string[] = [];
  for (const cidr of cidrs) {
    if (!isValidCidr(cidr)) {
      invalidCidrs.push(cidr);
    }
  }
  if (invalidCidrs.length > 0) {
    throw new BadRequestException(
      `Invalid CIDR notation: ${invalidCidrs.join(', ')}. ` +
        `Expected format: single IP (e.g., "192.168.1.1") or CIDR range (e.g., "192.168.1.0/24")`
    );
  }
}

/**
 * Convert IP address to 32-bit integer
 */
function ipToInt(ip: string): number {
  const octets = ip.split('.').map((o) => parseInt(o, 10));
  return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
}

/**
 * Check if an IP address is within a CIDR range
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  // Handle single IP match
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);

  // Special case: /0 matches all IPs
  if (prefix === 0) {
    return true;
  }

  // Create subnet mask
  const mask = (~0 << (32 - prefix)) >>> 0;

  const ipInt = ipToInt(ip) >>> 0;
  const networkInt = ipToInt(network) >>> 0;

  // Check if IP is in the network range
  return (ipInt & mask) === (networkInt & mask);
}

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Authenticate a portal user with access code
   * Returns a session token for subsequent requests
   */
  async authenticate(
    dto: PortalLoginDto,
    ipAddress: string,
    userAgent?: string
  ): Promise<PortalSessionDto & { sessionToken: string; sessionExpiresAt: Date }> {
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
        await this.logAccess(
          auditWithCode.id,
          null,
          '[REDACTED]',
          'login',
          ipAddress,
          userAgent,
          false,
          'Portal not enabled'
        );
        throw new UnauthorizedException('Portal access is not enabled for this audit');
      }

      if (auditWithCode.portalExpiresAt && new Date() > auditWithCode.portalExpiresAt) {
        await this.logAccess(
          auditWithCode.id,
          null,
          '[REDACTED]',
          'login',
          ipAddress,
          userAgent,
          false,
          'Access code expired'
        );
        throw new UnauthorizedException('Portal access has expired');
      }

      await this.logAccess(
        auditWithCode.id,
        null,
        '[REDACTED]',
        'login',
        ipAddress,
        userAgent,
        true
      );

      // Generate session token for legacy users (no persistent session for legacy)
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

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
        sessionToken,
        sessionExpiresAt,
      };
    }

    // Find portal user by comparing hashed access codes
    // We need to fetch all active users and compare since we can't query by hashed value
    const allActiveUsers = await this.prisma.auditPortalUser.findMany({
      where: { isActive: true },
      include: {
        audit: {
          include: {
            organization: { select: { name: true } },
          },
        },
      },
    });

    let portalUser = null;
    for (const user of allActiveUsers) {
      const isValid = await bcrypt.compare(dto.accessCode, user.accessCode);
      if (isValid) {
        portalUser = user;
        break;
      }
    }

    if (!portalUser) {
      throw new UnauthorizedException('Invalid access code');
    }

    if (!portalUser.isActive) {
      await this.logAccess(
        portalUser.auditId,
        portalUser.id,
        '[REDACTED]',
        'login',
        ipAddress,
        userAgent,
        false,
        'Account deactivated'
      );
      throw new UnauthorizedException('This access has been revoked');
    }

    if (new Date() > portalUser.expiresAt) {
      await this.logAccess(
        portalUser.auditId,
        portalUser.id,
        '[REDACTED]',
        'login',
        ipAddress,
        userAgent,
        false,
        'Access code expired'
      );
      throw new UnauthorizedException('Portal access has expired');
    }

    // Check IP restrictions
    if (portalUser.enforceIpRestriction && portalUser.allowedIpRanges.length > 0) {
      if (!this.isIpAllowed(ipAddress, portalUser.allowedIpRanges)) {
        await this.logAccess(
          portalUser.auditId,
          portalUser.id,
          '[REDACTED]',
          'login',
          ipAddress,
          userAgent,
          false,
          'IP not allowed'
        );
        throw new ForbiddenException('Access from this IP address is not allowed');
      }
    }

    // Generate session token for subsequent requests
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const hashedSessionToken = await bcrypt.hash(sessionToken, SALT_ROUNDS);

    // Update last login and store session token
    await this.prisma.auditPortalUser.update({
      where: { id: portalUser.id },
      data: {
        lastLoginAt: new Date(),
        sessionToken: hashedSessionToken,
        sessionExpiresAt,
      },
    });

    await this.logAccess(
      portalUser.auditId,
      portalUser.id,
      '[REDACTED]',
      'login',
      ipAddress,
      userAgent,
      true
    );

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
      sessionToken, // Return plain session token to client
      sessionExpiresAt,
    };
  }

  /**
   * Check if an IP is in the allowed ranges using proper CIDR matching
   */
  private isIpAllowed(ip: string, allowedRanges: string[]): boolean {
    // Validate the IP address format first
    if (!isValidCidr(ip)) {
      this.logger.warn(`Invalid IP address format: ${ip}`);
      return false;
    }

    for (const range of allowedRanges) {
      // Skip invalid CIDR entries (shouldn't happen if validation is enforced on input)
      if (!isValidCidr(range)) {
        this.logger.warn(`Skipping invalid CIDR range: ${range}`);
        continue;
      }

      if (isIpInCidr(ip, range)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate a session token for subsequent requests
   * Returns the portal user if session is valid, null otherwise
   */
  async validateSession(userId: string, token: string): Promise<AuditPortalUser | null> {
    const user = await this.prisma.auditPortalUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Session validation failed: user ${userId} not found`);
      return null;
    }

    if (!user.sessionToken || !user.sessionExpiresAt) {
      this.logger.warn(`Session validation failed: no session for user ${userId}`);
      return null;
    }

    if (user.sessionExpiresAt < new Date()) {
      this.logger.warn(`Session validation failed: session expired for user ${userId}`);
      return null;
    }

    if (!user.isActive) {
      this.logger.warn(`Session validation failed: user ${userId} is deactivated`);
      return null;
    }

    const isValid = await bcrypt.compare(token, user.sessionToken);
    if (!isValid) {
      this.logger.warn(`Session validation failed: invalid token for user ${userId}`);
      return null;
    }

    return user;
  }

  /**
   * Invalidate a user's session (logout)
   */
  async invalidateSession(userId: string): Promise<void> {
    await this.prisma.auditPortalUser.update({
      where: { id: userId },
      data: {
        sessionToken: null,
        sessionExpiresAt: null,
      },
    });
    this.logger.log(`Session invalidated for portal user ${userId}`);
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
    metadata?: Record<string, unknown>
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
    invitedBy: string
  ): Promise<PortalUserResponseDto & { plainAccessCode: string }> {
    // Validate CIDR ranges if provided
    if (dto.allowedIpRanges && dto.allowedIpRanges.length > 0) {
      validateCidrArray(dto.allowedIpRanges);
    }

    // Verify audit exists and belongs to organization
    const audit = await this.prisma.audit.findFirst({
      where: { id: auditId, organizationId, deletedAt: null },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Generate unique access code and hash it for storage
    const plainAccessCode = this.generateAccessCode();
    const hashedAccessCode = await bcrypt.hash(plainAccessCode, SALT_ROUNDS);

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
        accessCode: hashedAccessCode, // Store the hash, not the plain code
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

    this.logger.log(`Created portal user: ${maskEmail(portalUser.email)} for audit ${auditId}`);

    // Enable portal on audit if not already enabled
    if (!audit.auditPortalEnabled) {
      await this.prisma.audit.update({
        where: { id: auditId },
        data: { auditPortalEnabled: true },
      });
    }

    // Return the plain access code so user can save it (they won't be able to retrieve it later)
    return {
      ...this.toPortalUserResponseDto(portalUser, false),
      plainAccessCode, // This is the only time the plain code is available
    };
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
    dto: UpdatePortalUserDto
  ): Promise<PortalUserResponseDto> {
    // Validate CIDR ranges if provided
    if (dto.allowedIpRanges && dto.allowedIpRanges.length > 0) {
      validateCidrArray(dto.allowedIpRanges);
    }

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

    this.logger.log(`Updated portal user: ${maskEmail(updated.email)}`);

    return this.toPortalUserResponseDto(updated, false);
  }

  /**
   * Delete a portal user
   */
  async deletePortalUser(auditId: string, userId: string, organizationId: string): Promise<void> {
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

    this.logger.log(`Deleted portal user: ${maskEmail(existing.email)}`);
  }

  /**
   * Get access logs for an audit
   */
  async getAccessLogs(
    auditId: string,
    organizationId: string,
    limit: number = 100
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
  private toPortalUserResponseDto(
    user: AuditPortalUser,
    includeAccessCode: boolean = true
  ): PortalUserResponseDto {
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
