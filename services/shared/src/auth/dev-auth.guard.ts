import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { DEV_USER, ensureDevUserExists } from './index';

/**
 * Prisma Service injection token for DevAuthGuard.
 * Services should provide their PrismaService under this token.
 */
export const PRISMA_SERVICE = 'PrismaService';

/**
 * User context shape for request decoration.
 */
export interface UserContext {
  userId: string;
  keycloakId: string;
  email: string;
  organizationId: string;
  role: string;
  permissions: string[];
  name?: string;
}

/**
 * Custom decorator to extract user from request.
 */
export const User = createParamDecorator((data: unknown, ctx: ExecutionContext): UserContext => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

/**
 * Default permissions for development user.
 */
const DEV_PERMISSIONS = [
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
  'settings:create',
  'settings:update',
  'settings:delete',
  'settings:write',
  'audit:read',
  'audit:write',
  'workspaces:read',
  'workspaces:create',
  'workspaces:update',
  'workspaces:delete',
  'workspaces:assign',
  'risk:read',
  'risk:write',
  'risk:delete',
  'risk:create',
  'risk:update',
  'dashboard:read',
  'bcdr:read',
  'bcdr:create',
  'bcdr:write',
  'bcdr:update',
  'bcdr:delete',
  'permissions:read',
  'permissions:write',
  'reports:read',
  'reports:create',
  'reports:update',
  'reports:delete',
  'reports:export',
  'vendors:read',
  'vendors:write',
  'vendors:create',
  'vendors:update',
  'vendors:delete',
  'trust:read',
  'trust:write',
];

/**
 * Development auth guard that bypasses JWT validation
 * and injects a mock user context.
 *
 * WARNING: Only use in development mode
 * CRITICAL: This guard will throw an error in production
 *
 * AUTO-SYNC: Automatically ensures the mock user and organization
 * exist in the database to prevent foreign key constraint errors.
 *
 * @remarks
 * This is a SHARED implementation used across all services.
 * Do not duplicate this guard in individual services.
 *
 * To use this guard, provide it in your module:
 * ```
 * providers: [
 *   {
 *     provide: DevAuthGuard,
 *     useFactory: (prisma: PrismaService) => new DevAuthGuard(prisma),
 *     inject: [PrismaService],
 *   },
 * ]
 * ```
 * Or provide PrismaService under the PRISMA_SERVICE token.
 */
@Injectable()
export class DevAuthGuard implements CanActivate {
  private readonly logger = new Logger(DevAuthGuard.name);
  private devUserSynced = false;

  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE)
    private readonly prisma?: { organization: any; user: any }
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // SECURITY: Only allow in explicit development/test environments unless
    // USE_DEV_AUTH is explicitly enabled for sandbox/demo environments.
    const nodeEnv = process.env.NODE_ENV;
    const allowedEnvs = ['development', 'test'];
    const devAuthExplicitlyEnabled = process.env.USE_DEV_AUTH === 'true';

    if ((!nodeEnv || !allowedEnvs.includes(nodeEnv)) && !devAuthExplicitlyEnabled) {
      throw new Error(
        `SECURITY ERROR: DevAuthGuard cannot be used in ${nodeEnv || 'undefined'} environment. ` +
          'This guard is only permitted in development/test or when USE_DEV_AUTH=true. ' +
          'Please use proper JWT authentication in production.'
      );
    }

    const request = context.switchToHttp().getRequest();

    // Auto-sync: Ensure mock user and organization exist in database
    // Only runs once per guard instance to avoid repeated DB calls
    // Skip if prisma is not provided (dev user must be seeded separately)
    if (!this.devUserSynced && this.prisma) {
      try {
        await ensureDevUserExists(this.prisma, this.logger);
      } catch {
        this.logger.warn('Failed to auto-sync dev user, continuing without sync');
      }
      this.devUserSynced = true;
    }

    // Mock user context for development
    const mockUser: UserContext = {
      userId: DEV_USER.userId,
      keycloakId: DEV_USER.keycloakId,
      email: DEV_USER.email,
      organizationId: DEV_USER.organizationId,
      role: 'admin',
      permissions: DEV_PERMISSIONS,
      name: DEV_USER.displayName,
    };

    request.user = mockUser;

    // Also populate headers so PermissionGuard and downstream services that
    // rely on x-user-id / x-organization-id continue to work in dev without
    // a real auth proxy in front of the service.
    request.headers = {
      ...(request.headers || {}),
      'x-user-id': mockUser.userId,
      'x-organization-id': mockUser.organizationId,
      'x-user-email': mockUser.email,
    };

    return true;
  }
}
