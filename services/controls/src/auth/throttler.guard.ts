import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException, ThrottlerLimitDetail } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Request structure for rate limiting
 */
interface ThrottlerRequest {
  headers?: Record<string, string | string[] | undefined>;
  user?: {
    userId?: string;
  };
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
  url?: string;
  path?: string;
}

/**
 * Custom throttler guard that extracts client identifier for rate limiting
 *
 * Rate limiting is applied based on:
 * 1. IP address for unauthenticated requests
 * 2. User ID + IP for authenticated requests
 * 3. API Key hash for API requests
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  /**
   * Get a unique identifier for the requesting client
   */
  protected async getTracker(req: ThrottlerRequest): Promise<string> {
    // Extract IP address from various possible headers
    const ip = this.getClientIp(req);

    // If API key provided, use API key hash as tracker
    // SECURITY: Hash with SHA-256 for strong collision resistance
    const apiKeyHeader = req.headers?.['x-api-key'];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (apiKey) {
      // Using 32 hex chars (128 bits) for sufficient collision resistance in rate limiting
      // codeql[js/insufficient-password-hash] suppressed: SHA-256 used for rate limit cache key generation, not password storage
      const keyHash = createHash('sha256').update(apiKey).digest('hex').substring(0, 32);
      return `api:${keyHash}`;
    }

    // If authenticated, include user ID for per-user limiting
    const userIdHeader = req.headers?.['x-user-id'];
    const userId =
      req.user?.userId || (Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader);
    if (userId) {
      return `user:${userId}:${ip}`;
    }

    return `ip:${ip}`;
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(req: ThrottlerRequest): string {
    // Check X-Forwarded-For header (from proxies/load balancers)
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    // Check X-Real-IP header (Nginx)
    const realIp = req.headers?.['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to connection remote address
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Handle throttle exceptions with logging
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(req);
    const path = req.url || req.path;

    // Log rate limit hit for monitoring and alerting
    this.logger.warn(
      `Rate limit exceeded: tracker=${tracker}, path=${path}, ` +
        `limit=${throttlerLimitDetail.limit}, ttl=${throttlerLimitDetail.ttl}ms`
    );

    throw new ThrottlerException('Too many requests. Please slow down and try again later.');
  }

  /**
   * Skip rate limiting for certain paths
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.url || req.path || '';

    // Skip rate limiting for health checks, metrics, and docs
    const skipPaths = ['/health', '/api/health', '/metrics', '/api/docs', '/api/docs/'];

    return skipPaths.some((skip) => path === skip || path.startsWith(skip + '/'));
  }
}

/**
 * Stricter throttler guard for sensitive endpoints
 * Use with @UseGuards(StrictThrottlerGuard)
 */
@Injectable()
export class StrictThrottlerGuard extends CustomThrottlerGuard {
  // Override limits for auth endpoints
  protected async getLimit(): Promise<number> {
    return 5; // 5 requests per minute for auth
  }

  protected async getTtl(): Promise<number> {
    return 60000; // 1 minute
  }
}

/**
 * Very strict throttler for seed/export operations
 */
@Injectable()
export class SensitiveOperationThrottlerGuard extends CustomThrottlerGuard {
  protected async getLimit(): Promise<number> {
    return 1; // 1 request per minute
  }

  protected async getTtl(): Promise<number> {
    return 60000; // 1 minute
  }
}
