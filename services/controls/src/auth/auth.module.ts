import { Global, Module } from '@nestjs/common';
import {
  ApiKeyAuthGuard,
  ApplicationAuthGuard,
  CombinedAuthGuard,
  DEVELOPMENT_AUTH_GUARD,
  DevAuthGuard,
  JwtAuthGuard,
  PermissionsGuard,
  PRISMA_SERVICE,
  RolesGuard,
} from '@gigachad-grc/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuthModule - Centralized authentication and authorization module
 *
 * This module provides all guards (DevAuthGuard, RolesGuard, PermissionsGuard)
 * as global providers so they can be used across all modules without
 * dependency resolution issues.
 *
 * @remarks
 * - DevAuthGuard is used for development authentication (bypasses Keycloak)
 * - RolesGuard enforces role-based access control (uses optional Reflector)
 * - PermissionsGuard enforces permission-based access control (uses optional Reflector)
 * - Guards use optional Reflector injection with fallback to shared instance
 */
@Global()
@Module({
  providers: [
    // Re-provide PrismaService for guard dependencies
    PrismaService,
    // Provide PrismaService under the token expected by DevAuthGuard
    {
      provide: PRISMA_SERVICE,
      useExisting: PrismaService,
    },
    // DevAuthGuard with explicit factory so Nest passes the prisma
    // dependency reliably. Using just `DevAuthGuard` here works in
    // most cases but the @Optional() @Inject(PRISMA_SERVICE) at the
    // constructor occasionally resolves to undefined depending on
    // the controller's module context — the explicit factory removes
    // that ambiguity. Required for the x-dev-user-id override.
    {
      provide: DEVELOPMENT_AUTH_GUARD,
      useFactory: (prisma: PrismaService) => new DevAuthGuard(prisma as any),
      inject: [PRISMA_SERVICE],
    },
    JwtAuthGuard,
    ApiKeyAuthGuard,
    CombinedAuthGuard,
    ApplicationAuthGuard,
    {
      provide: DevAuthGuard,
      useExisting: ApplicationAuthGuard,
    },
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    PrismaService,
    PRISMA_SERVICE,
    DevAuthGuard,
    ApplicationAuthGuard,
    JwtAuthGuard,
    ApiKeyAuthGuard,
    CombinedAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
