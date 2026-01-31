import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
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
 * In production, this expects an authentication proxy (e.g., Keycloak, Auth0)
 * to set the x-user-id and x-organization-id headers after validating JWT tokens.
 * 
 * In development mode with USE_DEV_AUTH=true, consider using DevAuthGuard instead.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    
    // Check for user context (set by DevAuthGuard in dev, or auth proxy in prod)
    if (request.user?.userId) {
      return true;
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
