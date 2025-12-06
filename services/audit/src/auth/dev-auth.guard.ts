import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

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

    // Mock authentication from headers (for development and testing)
    request.user = {
      userId: request.headers['x-user-id'] || 'dev-user',
      organizationId: request.headers['x-organization-id'] || 'default-org',
      email: request.headers['x-user-email'] || 'dev@example.com',
      role: request.headers['x-user-role'] || 'admin',
    };

    return true;
  }
}
