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
    
    // Mock user context for development - uses actual user from database
    request.user = {
      userId: '8f88a42b-e799-455c-b68a-308d7d2e9aa4', // John Doe from seeded users
      keycloakId: 'john-doe-keycloak-id',
      email: 'john.doe@example.com',
      organizationId: '8924f0c1-7bb1-4be8-84ee-ad8725c712bf', // Default org UUID
      role: 'admin',
      permissions: [
        'controls:read',
        'controls:write',
        'controls:delete',
        'evidence:read',
        'evidence:write',
        'evidence:delete',
        'frameworks:read',
        'frameworks:write',
        'policies:read',
        'policies:write',
        'integrations:read',
        'integrations:write',
        'users:read',
        'users:write',
        'settings:read',
        'settings:write',
        'audit:read',
      ],
    };

    return true;
  }
}

