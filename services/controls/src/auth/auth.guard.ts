import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

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
    const request = context.switchToHttp().getRequest<Request>();
    
    // Check for user context (set by DevAuthGuard in dev, or auth proxy in prod)
    if ((request as any).user?.userId) {
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
    (request as any).user = {
      userId: userId as string,
      organizationId: organizationId as string,
      email: request.headers['x-user-email'] as string || '',
      role: request.headers['x-user-role'] as string || 'user',
      permissions: [],
    };
    
    return true;
  }
}
