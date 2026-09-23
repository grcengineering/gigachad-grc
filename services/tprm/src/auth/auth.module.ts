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
import { PrismaService } from '../common/prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: PRISMA_SERVICE, useExisting: PrismaService },
    {
      provide: DEVELOPMENT_AUTH_GUARD,
      useFactory: (prisma) => new DevAuthGuard(prisma),
      inject: [PRISMA_SERVICE],
    },
    JwtAuthGuard,
    ApiKeyAuthGuard,
    CombinedAuthGuard,
    ApplicationAuthGuard,
    { provide: DevAuthGuard, useExisting: ApplicationAuthGuard },
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
