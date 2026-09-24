import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

/**
 * Configuration for brute force protection
 */
const BRUTE_FORCE_CONFIG = {
  // Maximum failed attempts before lockout
  maxAttempts: 5,
  
  // Lockout duration in minutes
  lockoutDurationMinutes: 15,
  
  // Window for counting attempts (in minutes)
  attemptWindowMinutes: 15,
  
  // Progressive delay multiplier (seconds)
  progressiveDelayBase: 1, // 1s, 2s, 4s, 8s, 16s...
  
  // Maximum delay (seconds)
  maxDelay: 30,
  
  // Alert threshold - notify admin after this many failures
  alertThreshold: 10,
};

/**
 * Service to track and manage login attempts for brute force protection
 */
@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a login attempt and check if it should be blocked
   * 
   * @param identifier - Email or username being attempted
   * @param ip - IP address of the request
   * @param success - Whether the attempt was successful
   * @returns Object indicating if request should proceed and any delay to apply
   */
  async recordAttempt(
    identifier: string,
    ip: string,
    success: boolean,
  ): Promise<{ allowed: boolean; delayMs: number; message?: string }> {
    const identifierHash = this.hashIdentifier(identifier);
    const now = new Date();
    
    let record = await this.prisma.loginAttempt.findUnique({
      where: { identifierHash_ipAddress: { identifierHash, ipAddress: ip } },
    });
    
    if (!record) {
      record = {
        id: '',
        identifierHash,
        identifier,
        ipAddress: ip,
        attemptCount: 0,
        lastAttemptAt: now,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
    }

    // Check if currently locked out
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingMs = record.lockedUntil.getTime() - now.getTime();
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      
      this.logger.warn(
        `Blocked login attempt - account locked: identifier=${identifier}, ip=${ip}, ` +
        `remaining=${remainingMinutes}min`
      );
      
      // Log to audit
      await this.logAttempt(identifier, ip, false, true);
      
      return {
        allowed: false,
        delayMs: 0,
        message: `Account temporarily locked. Try again in ${remainingMinutes} minutes.`,
      };
    }

    // Reset counter if outside the attempt window
    const windowMs = BRUTE_FORCE_CONFIG.attemptWindowMinutes * 60 * 1000;
    if (now.getTime() - record.lastAttemptAt.getTime() > windowMs) {
      record.attemptCount = 0;
      record.lockedUntil = null;
    }

    if (success) {
      // Successful login - reset counter
      record.attemptCount = 0;
      record.lockedUntil = null;
      record.lastAttemptAt = now;
      await this.prisma.loginAttempt.upsert({
        where: { identifierHash_ipAddress: { identifierHash, ipAddress: ip } },
        create: {
          identifierHash,
          identifier,
          ipAddress: ip,
          attemptCount: 0,
          lastAttemptAt: now,
        },
        update: {
          attemptCount: 0,
          lockedUntil: null,
          lastAttemptAt: now,
        },
      });
      
      await this.logAttempt(identifier, ip, true, false);
      
      return { allowed: true, delayMs: 0 };
    }

    // Failed attempt
    record.attemptCount++;
    record.lastAttemptAt = now;
    
    // Calculate progressive delay
    const delayMs = this.calculateDelay(record.attemptCount);

    // Check if should lock out
    if (record.attemptCount >= BRUTE_FORCE_CONFIG.maxAttempts) {
      record.lockedUntil = new Date(
        now.getTime() + BRUTE_FORCE_CONFIG.lockoutDurationMinutes * 60 * 1000
      );
      
      this.logger.warn(
        `Account locked due to too many failed attempts: identifier=${identifier}, ` +
        `ip=${ip}, attempts=${record.attemptCount}`
      );
      
      // Alert admin if threshold exceeded
      if (record.attemptCount >= BRUTE_FORCE_CONFIG.alertThreshold) {
        await this.alertAdmin(identifier, ip, record.attemptCount);
      }
    }

    await this.prisma.loginAttempt.upsert({
      where: { identifierHash_ipAddress: { identifierHash, ipAddress: ip } },
      create: {
        identifierHash,
        identifier,
        ipAddress: ip,
        attemptCount: record.attemptCount,
        lastAttemptAt: record.lastAttemptAt,
        lockedUntil: record.lockedUntil,
      },
      update: {
        attemptCount: record.attemptCount,
        lastAttemptAt: record.lastAttemptAt,
        lockedUntil: record.lockedUntil,
      },
    });
    
    // Log failed attempt
    await this.logAttempt(identifier, ip, false, record.lockedUntil !== null);

    if (record.lockedUntil) {
      return {
        allowed: false,
        delayMs: 0,
        message: `Too many failed attempts. Account locked for ${BRUTE_FORCE_CONFIG.lockoutDurationMinutes} minutes.`,
      };
    }

    return {
      allowed: true,
      delayMs,
      message: delayMs > 0 ? `Please wait ${delayMs / 1000} seconds before trying again.` : undefined,
    };
  }

  /**
   * Check if an identifier/IP combo is currently locked
   */
  async isLocked(identifier: string, ip: string): Promise<boolean> {
    const record = await this.prisma.loginAttempt.findUnique({
      where: {
        identifierHash_ipAddress: {
          identifierHash: this.hashIdentifier(identifier),
          ipAddress: ip,
        },
      },
    });
    
    if (!record?.lockedUntil) {
      return false;
    }
    
    return record.lockedUntil > new Date();
  }

  /**
   * Manually unlock an account (admin action)
   */
  async unlock(identifier: string, ip?: string): Promise<void> {
    const identifierHash = this.hashIdentifier(identifier);
    if (ip) {
      await this.prisma.loginAttempt.deleteMany({
        where: { identifierHash, ipAddress: ip },
      });
    } else {
      await this.prisma.loginAttempt.deleteMany({ where: { identifierHash } });
    }
    
    this.logger.log(`Account unlocked: identifier=${identifier}, ip=${ip || 'all'}`);
  }

  /**
   * Get current attempt status for an identifier
   */
  async getStatus(identifier: string, ip: string): Promise<{
    attemptCount: number;
    isLocked: boolean;
    lockedUntil: Date | null;
    remainingAttempts: number;
  }> {
    const record = await this.prisma.loginAttempt.findUnique({
      where: {
        identifierHash_ipAddress: {
          identifierHash: this.hashIdentifier(identifier),
          ipAddress: ip,
        },
      },
    });
    
    if (!record) {
      return {
        attemptCount: 0,
        isLocked: false,
        lockedUntil: null,
        remainingAttempts: BRUTE_FORCE_CONFIG.maxAttempts,
      };
    }
    
    const isLocked = record.lockedUntil !== null && record.lockedUntil > new Date();
    
    return {
      attemptCount: record.attemptCount,
      isLocked,
      lockedUntil: record.lockedUntil,
      remainingAttempts: Math.max(0, BRUTE_FORCE_CONFIG.maxAttempts - record.attemptCount),
    };
  }

  private hashIdentifier(identifier: string): string {
    return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
  }

  /**
   * Calculate progressive delay based on attempt count
   */
  private calculateDelay(attemptCount: number): number {
    if (attemptCount <= 1) {
      return 0;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s...
    const delay = Math.pow(2, attemptCount - 2) * BRUTE_FORCE_CONFIG.progressiveDelayBase * 1000;
    
    return Math.min(delay, BRUTE_FORCE_CONFIG.maxDelay * 1000);
  }

  /**
   * Log login attempt to audit log
   */
  private async logAttempt(
    identifier: string,
    ip: string,
    success: boolean,
    wasLocked: boolean,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: '00000000-0000-0000-0000-000000000000', // System org
          userId: null,
          userEmail: identifier,
          action: success ? 'auth.login.success' : 'auth.login.failed',
          entityType: 'authentication',
          entityId: identifier,
          description: success
            ? `Successful login from ${ip}`
            : wasLocked
              ? `Failed login attempt (account locked) from ${ip}`
              : `Failed login attempt from ${ip}`,
          metadata: {
            ip,
            identifier,
            success,
            wasLocked,
            eventTimestamp: new Date().toISOString(),
          },
          ipAddress: ip,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log login attempt: ${error}`);
    }
  }

  /**
   * Alert admin about suspicious activity
   */
  private async alertAdmin(
    identifier: string,
    ip: string,
    attemptCount: number,
  ): Promise<void> {
    this.logger.error(
      `SECURITY ALERT: Excessive failed login attempts detected! ` +
      `identifier=${identifier}, ip=${ip}, attempts=${attemptCount}`
    );
    
    // In a real implementation, this would:
    // 1. Send email to admin
    // 2. Create a security alert in the system
    // 3. Potentially trigger automated response (IP block, etc.)
    
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: '00000000-0000-0000-0000-000000000000',
          userId: null,
          userEmail: 'system',
          action: 'security.alert.brute_force',
          entityType: 'security',
          entityId: identifier,
          description: `Brute force attack detected: ${attemptCount} failed attempts from ${ip}`,
          metadata: {
            identifier,
            ip,
            attemptCount,
            alertType: 'brute_force',
            severity: 'high',
          },
          ipAddress: ip,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create security alert: ${error}`);
    }
  }

  /**
   * Clean up old records (call periodically)
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const windowMs = BRUTE_FORCE_CONFIG.attemptWindowMinutes * 60 * 1000;
    await this.prisma.loginAttempt.deleteMany({
      where: {
        lastAttemptAt: { lt: new Date(now.getTime() - windowMs) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
    });
  }
}

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to apply brute force protection
 */
export function bruteForceProtection(loginAttemptsService: LoginAttemptsService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body as { email?: string; username?: string } | undefined;
    const identifier = body?.email || body?.username || 'unknown';
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : undefined) || 'unknown';
    
    const status = await loginAttemptsService.getStatus(identifier, ip);
    
    if (status.isLocked) {
      return res.status(429).json({
        statusCode: 429,
        message: `Account temporarily locked. Try again later.`,
        lockedUntil: status.lockedUntil,
      });
    }
    
    next();
  };
}

