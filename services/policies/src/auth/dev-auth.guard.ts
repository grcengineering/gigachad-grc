import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

/**
 * Development auth guard that bypasses JWT validation
 * and injects a mock user context
 *
 * WARNING: Only use in development mode
 * CRITICAL: This guard will throw an error in production
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // SECURITY: Prevent usage in production
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      throw new Error(
        'SECURITY ERROR: DevAuthGuard is configured but NODE_ENV is set to production. ' +
        'This is a critical security vulnerability. Please use proper JWT authentication in production.',
      );
    }

    const request = context.switchToHttp().getRequest();
    
    request.user = {
      userId: '8f88a42b-e799-455c-b68a-308d7d2e9aa4',
      keycloakId: 'dev-user',
      email: 'dev@gigachad-grc.local',
      organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf',
      role: 'admin',
      permissions: [
        'policies:read',
        'policies:write',
        'policies:delete',
        'policies:approve',
      ],
    };

    return true;
  }
}



