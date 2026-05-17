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
import {
  SEED_ORG_A_ID,
  SEED_ORG_B_ID,
  SEED_USER_A_ADMIN_ID,
  SEED_USER_A_COMPLIANCE_ID,
  SEED_USER_A_AUDITOR_ID,
  SEED_USER_A_VIEWER_ID,
  SEED_USER_B_ADMIN_ID,
} from '../seed/seed-constants';

interface DevAuthOverrideFixture {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'compliance_manager' | 'auditor' | 'viewer';
  organizationId: string;
}

/**
 * Test-only fixture table mapping seeded user IDs to their roles.
 * Used by DevAuthGuard to honor the x-dev-user-id override header.
 *
 * Keep in sync with the seed in
 * services/controls/src/seed/seed.service.ts (the same five users that
 * get inserted into the users table on POST /api/seed/load-demo).
 *
 * This table exists purely to support the e2e test suite — it lets
 * Playwright switch identities by setting a header, without needing to
 * obtain real Keycloak JWTs. Hardcoding the table avoids a fragile
 * DI-dependent prisma lookup at request time.
 */
const DEV_AUTH_OVERRIDE_FIXTURES: Record<string, DevAuthOverrideFixture> = {
  [SEED_USER_A_ADMIN_ID]: {
    userId: SEED_USER_A_ADMIN_ID,
    email: 'admin@demo.local',
    name: 'Admin A',
    role: 'admin',
    organizationId: SEED_ORG_A_ID,
  },
  [SEED_USER_A_COMPLIANCE_ID]: {
    userId: SEED_USER_A_COMPLIANCE_ID,
    email: 'compliance@demo.local',
    name: 'Compliance Manager A',
    role: 'compliance_manager',
    organizationId: SEED_ORG_A_ID,
  },
  [SEED_USER_A_AUDITOR_ID]: {
    userId: SEED_USER_A_AUDITOR_ID,
    email: 'auditor@demo.local',
    name: 'Auditor A',
    role: 'auditor',
    organizationId: SEED_ORG_A_ID,
  },
  [SEED_USER_A_VIEWER_ID]: {
    userId: SEED_USER_A_VIEWER_ID,
    email: 'viewer@demo.local',
    name: 'Viewer A',
    role: 'viewer',
    organizationId: SEED_ORG_A_ID,
  },
  [SEED_USER_B_ADMIN_ID]: {
    userId: SEED_USER_B_ADMIN_ID,
    email: 'admin@acme.local',
    name: 'Admin B',
    role: 'admin',
    organizationId: SEED_ORG_B_ID,
  },
};

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

    // Default mock user (existing dev behavior — admin in the seeded org).
    let mockUser: UserContext = {
      userId: DEV_USER.userId,
      keycloakId: DEV_USER.keycloakId,
      email: DEV_USER.email,
      organizationId: DEV_USER.organizationId,
      role: 'admin',
      permissions: DEV_PERMISSIONS,
      name: DEV_USER.displayName,
    };

    // Test-only override: if the request carries `x-dev-user-id`, look up
    // that user in the hardcoded test-fixture table below and authenticate
    // as them. This is what enables Playwright multi-tenant + RBAC tests
    // to assume seeded non-admin / cross-org identities without standing
    // up a real Keycloak flow.
    //
    // The override is honored ONLY in dev/test environments (the
    // environment check above gates this whole guard). The header is
    // never set by the React frontend; it only originates from test
    // fixtures.
    //
    // The fixture table is hardcoded rather than queried from Prisma so
    // it works without depending on NestJS DI resolving the optional
    // prisma provider — which was unreliable across services and
    // wasted hours of test-infrastructure setup. The actual DB user
    // rows are still seeded (in services/controls/src/seed/seed.service.ts)
    // and these IDs match those rows; the override only needs the
    // role/org/permissions for guard decisions, not the rest of the user
    // record.
    const overrideUserId = request.headers?.['x-dev-user-id'];
    if (overrideUserId) {
      const fixture = DEV_AUTH_OVERRIDE_FIXTURES[overrideUserId as string];
      if (fixture) {
        mockUser = {
          userId: fixture.userId,
          keycloakId: `demo-${fixture.userId}`,
          email: fixture.email,
          organizationId: fixture.organizationId,
          role: fixture.role,
          // Admins get the full dev permissions set; non-admin roles
          // get an empty list so PermissionGuard enforces the role
          // matrix. RBAC tests rely on this.
          permissions: fixture.role === 'admin' ? DEV_PERMISSIONS : [],
          name: fixture.name,
        };
      } else {
        this.logger.warn(
          `x-dev-user-id=${overrideUserId} did not match a known test fixture; falling back to DEV_USER`
        );
      }
    }

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
