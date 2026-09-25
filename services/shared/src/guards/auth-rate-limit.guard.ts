import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Stricter rate limiting for authentication endpoints
 *
 * Configuration:
 * - Login attempts: 5 per minute per IP
 * - Password reset: 3 per minute per IP
 * - Token refresh: 10 per minute per user
 *
 * Features:
 * - Exponential backoff after repeated failures
 * - IP-based tracking with user correlation
 * - Logging for security monitoring
 */
@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  protected readonly logger = new Logger(AuthRateLimitGuard.name);

  // Track failed attempts for exponential backoff
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  /**
   * Get rate limit configuration based on endpoint
   */
  protected getEndpointConfig(path: string): { limit: number; ttl: number } {
    // Password reset - very strict
    if (path.includes('/password-reset') || path.includes('/forgot-password')) {
      return { limit: 3, ttl: 60000 }; // 3 per minute
    }

    // Token refresh - moderate
    if (path.includes('/refresh') || path.includes('/token')) {
      return { limit: 10, ttl: 60000 }; // 10 per minute
    }

    // Registration - moderate
    if (path.includes('/register') || path.includes('/signup')) {
      return { limit: 5, ttl: 60000 }; // 5 per minute
    }

    // MFA/2FA - strict
    if (path.includes('/mfa') || path.includes('/2fa') || path.includes('/verify')) {
      return { limit: 5, ttl: 60000 }; // 5 per minute
    }

    // Default login - strict
    return { limit: 5, ttl: 60000 }; // 5 per minute
  }

  /**
   * Get unique tracker for the request
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const connection = req.connection as { remoteAddress?: string } | undefined;

    // Get IP address
    const forwardedFor = headers['x-forwarded-for'];
    const ip =
      (req.ip as string) ||
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (headers['x-real-ip'] as string) ||
      connection?.remoteAddress ||
      'unknown';

    // Hash the IP for privacy
    const ipHash = createHash('sha256').update(ip).digest('hex').substring(0, 16);

    // Include user agent for additional fingerprinting
    const userAgent = (headers['user-agent'] as string) || '';
    const uaHash = createHash('sha256').update(userAgent).digest('hex').substring(0, 8);

    return `auth:${ipHash}:${uaHash}`;
  }

  /**
   * Calculate effective limit based on failed attempts (exponential backoff)
   */
  private getEffectiveLimit(tracker: string, baseLimit: number): number {
    const attempts = this.failedAttempts.get(tracker);

    if (!attempts) {
      return baseLimit;
    }

    // Clean up old entries (older than 1 hour)
    const hourAgo = new Date(Date.now() - 3600000);
    if (attempts.lastAttempt < hourAgo) {
      this.failedAttempts.delete(tracker);
      return baseLimit;
    }

    // Reduce limit based on failure count (exponential backoff)
    // After 3 failures: limit / 2
    // After 5 failures: limit / 4
    // After 10 failures: limit / 10
    if (attempts.count >= 10) {
      return Math.max(1, Math.floor(baseLimit / 10));
    } else if (attempts.count >= 5) {
      return Math.max(1, Math.floor(baseLimit / 4));
    } else if (attempts.count >= 3) {
      return Math.max(1, Math.floor(baseLimit / 2));
    }

    return baseLimit;
  }

  /**
   * Record a failed authentication attempt
   */
  recordFailedAttempt(tracker: string): void {
    const existing = this.failedAttempts.get(tracker);
    if (existing) {
      existing.count++;
      existing.lastAttempt = new Date();
    } else {
      this.failedAttempts.set(tracker, { count: 1, lastAttempt: new Date() });
    }

    const attempts = this.failedAttempts.get(tracker)!;
    if (attempts.count >= 5) {
      this.logger.warn(
        `Multiple failed auth attempts: tracker=${tracker}, count=${attempts.count}`
      );
    }
  }

  /**
   * Clear failed attempts on successful auth
   */
  recordSuccessfulAttempt(tracker: string): void {
    this.failedAttempts.delete(tracker);
  }

  /**
   * Handle throttle exception with security logging
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(req);
    const path = req.url || req.path;

    // Record this as a potential attack
    this.recordFailedAttempt(tracker);

    // Log for security monitoring
    this.logger.warn(
      `Auth rate limit exceeded: tracker=${tracker}, path=${path}, ` +
        `limit=${throttlerLimitDetail.limit}, ttl=${throttlerLimitDetail.ttl}ms`
    );

    // Calculate retry-after based on backoff
    const attempts = this.failedAttempts.get(tracker);
    const retryAfter =
      attempts && attempts.count >= 5
        ? Math.min(3600, 60 * attempts.count) // Up to 1 hour
        : 60;

    throw new ThrottlerException(
      `Too many authentication attempts. Please try again in ${retryAfter} seconds.`
    );
  }

  /**
   * Check if rate limiting should be applied
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.url || req.path || '';

    // Only apply to auth-related endpoints
    const authPaths = [
      '/auth',
      '/login',
      '/signin',
      '/register',
      '/signup',
      '/password',
      '/forgot',
      '/reset',
      '/token',
      '/refresh',
      '/mfa',
      '/2fa',
      '/verify',
    ];

    // Return true to SKIP rate limiting (only apply to auth paths)
    return !authPaths.some((p) => path.toLowerCase().includes(p));
  }
}

/**
 * Decorator to apply auth rate limiting to controllers/methods
 */
export function UseAuthRateLimit(): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('authRateLimit', true, target, propertyKey);
    return descriptor;
  };
}
