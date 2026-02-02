import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Authenticated user context attached to requests
 */
interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email?: string;
  role?: string;
  permissions: string[];
}

/**
 * Request with authenticated user
 */
interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Authentication guard that validates requests.
 * 
 * SECURITY NOTICE:
 * This guard expects authentication headers to be set by a trusted proxy (e.g., Keycloak, Auth0).
 * 
 * In production, you MUST either:
 * 1. Set AUTH_PROXY_SECRET environment variable - the proxy must send this as x-proxy-secret header
 * 2. Ensure network isolation - only the auth proxy can reach this service
 * 
 * Without one of these protections, clients could forge x-user-id/x-organization-id headers.
 * 
 * In development mode with USE_DEV_AUTH=true, consider using DevAuthGuard instead.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly proxySecret: string | undefined;
  private readonly requireProxyAuth: boolean;

  constructor() {
    this.proxySecret = process.env.AUTH_PROXY_SECRET;
    this.requireProxyAuth = process.env.REQUIRE_PROXY_AUTH === 'true';
    
    // SECURITY: Warn if no proxy authentication is configured in production
    if (process.env.NODE_ENV === 'production' && !this.proxySecret) {
      this.logger.warn(
        'SECURITY WARNING: AUTH_PROXY_SECRET is not set. ' +
        'Ensure network isolation prevents direct client access to this service.'
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    
    // Check for user context (set by DevAuthGuard in dev, or auth proxy in prod)
    if (request.user?.userId) {
      return true;
    }
    
    // SECURITY: If proxy secret is configured, verify it
    if (this.proxySecret) {
      const providedSecret = request.headers['x-proxy-secret'] as string;
      
      if (!providedSecret) {
        if (this.requireProxyAuth) {
          this.logger.warn('Request missing x-proxy-secret header');
          throw new UnauthorizedException('Authentication required');
        }
      } else {
        // Use timing-safe comparison to prevent timing attacks
        const secretValid = providedSecret.length === this.proxySecret.length &&
          timingSafeEqual(
            Buffer.from(providedSecret),
            Buffer.from(this.proxySecret)
          );
        
        if (!secretValid) {
          this.logger.warn('Invalid x-proxy-secret header');
          throw new UnauthorizedException('Authentication required');
        }
      }
    }
    
    // Check for headers set by authentication proxy
    const userId = request.headers['x-user-id'];
    const organizationId = request.headers['x-organization-id'];
    
    if (!userId) {
      this.logger.warn('Request missing x-user-id header');
      throw new UnauthorizedException('Authentication required');
    }
    
    if (!organizationId) {
      this.logger.warn('Request missing x-organization-id header');
      throw new UnauthorizedException('Organization context required');
    }
    
    // SECURITY: Validate UUID format for user and organization IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId as string)) {
      this.logger.warn('Invalid x-user-id format');
      throw new UnauthorizedException('Invalid user context');
    }
    if (!uuidRegex.test(organizationId as string)) {
      this.logger.warn('Invalid x-organization-id format');
      throw new UnauthorizedException('Invalid organization context');
    }
    
    // Populate user context from headers for downstream handlers
    const authRequest = request as AuthenticatedRequest;
    authRequest.user = {
      userId: userId as string,
      organizationId: organizationId as string,
      email: request.headers['x-user-email'] as string || '',
      permissions: [],
    };
    
    return true;
  }
}
