import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

/**
 * Custom throttler guard that extracts client identifier for rate limiting
 *
 * Rate limiting is applied based on:
 * 1. IP address for unauthenticated requests
 * 2. User ID + IP for authenticated requests
 * 3. API Key for API requests
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Get a unique identifier for the requesting client
   */
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Extract IP address
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const connection = req.connection as { remoteAddress?: string } | undefined;
    const forwardedFor = headers['x-forwarded-for'];
    const ip =
      (req.ip as string) ||
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
      (headers['x-real-ip'] as string) ||
      connection?.remoteAddress ||
      'unknown';

    // If authenticated, include user ID for per-user limiting
    const user = req.user as { userId?: string } | undefined;
    const userId = user?.userId || (headers['x-user-id'] as string);

    // If API key, use API key hash
    const apiKey = headers['x-api-key'] as string | undefined;

    if (apiKey) {
      // SECURITY: Hash the API key for the tracker (don't store raw key)
      // Using full SHA-256 hash (64 hex chars) for better collision resistance
      // Truncating to 32 chars is sufficient for rate limiting while keeping reasonable length
      const crypto = await import('crypto');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 32);
      return `api:${keyHash}`;
    }

    if (userId) {
      return `user:${userId}:${ip}`;
    }

    return `ip:${ip}`;
  }

  /**
   * Override to customize the throttle key per request
   */
  protected generateKey(context: ExecutionContext, tracker: string, throttlerName: string): string {
    const req = context.switchToHttp().getRequest();
    const path = req.route?.path || req.url;

    // Create a key that includes the path for endpoint-specific limiting
    return `${throttlerName}:${tracker}:${path}`;
  }

  /**
   * Sanitize user input for safe logging (prevent log injection)
   */
  private sanitizeForLog(value: string): string {
    // Remove newlines, carriage returns, and other control characters
    // that could be used for log injection attacks
    // eslint-disable-next-line no-control-regex
    const controlCharsRegex = /[\x00-\x1F\x7F]/g;
    return value
      .replace(/[\r\n]/g, '') // Remove line breaks
      .replace(controlCharsRegex, '') // Remove control characters
      .substring(0, 200); // Limit length to prevent log flooding
  }

  /**
   * Handle throttle exceptions with detailed logging
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: {
      limit: number;
      ttl: number;
      key: string;
      tracker: string;
      totalHits: number;
      timeToExpire: number;
    }
  ): Promise<void> {
    const req = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(req);

    // SECURITY: Sanitize user-controlled values before logging to prevent log injection
    const safeTracker = this.sanitizeForLog(tracker);
    const safeUrl = this.sanitizeForLog(req.url || '');

    // Log rate limit hit for monitoring
    console.warn(`[RateLimit] Limit exceeded for ${safeTracker} on ${safeUrl}`);

    throw new ThrottlerException(`Too many requests. Please try again later.`);
  }

  /**
   * Skip rate limiting for certain paths (health checks, etc.)
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const path = req.url;

    // Skip rate limiting for health checks and metrics
    const skipPaths = ['/health', '/api/health', '/metrics', '/api/docs'];

    return skipPaths.some((skip) => path.startsWith(skip));
  }
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Standard API endpoints
  standard: {
    ttl: 60000, // 1 minute window
    limit: 100, // 100 requests per minute
  },

  // Strict limit for auth endpoints
  auth: {
    ttl: 60000, // 1 minute window
    limit: 5, // 5 requests per minute
  },

  // Very strict for sensitive operations
  sensitive: {
    ttl: 60000, // 1 minute window
    limit: 3, // 3 requests per minute
  },

  // Relaxed for read-heavy endpoints
  relaxed: {
    ttl: 60000, // 1 minute window
    limit: 200, // 200 requests per minute
  },

  // Export operations (resource intensive)
  export: {
    ttl: 60000, // 1 minute window
    limit: 10, // 10 requests per minute
  },

  // Seed/demo data operations
  seed: {
    ttl: 60000, // 1 minute window
    limit: 1, // 1 request per minute
  },
};

/**
 * Decorator for applying custom rate limits to specific endpoints
 */
export function RateLimit(preset: keyof typeof RateLimitPresets | { ttl: number; limit: number }) {
  const config = typeof preset === 'string' ? RateLimitPresets[preset] : preset;

  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store rate limit config as metadata
    Reflect.defineMetadata('rateLimit', config, target, propertyKey);
    return descriptor;
  };
}
