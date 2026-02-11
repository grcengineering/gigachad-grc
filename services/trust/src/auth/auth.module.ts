import { Global, Module } from '@nestjs/common';
import { DevAuthGuard, RolesGuard, PermissionsGuard, PRISMA_SERVICE } from '@gigachad-grc/shared';
import { PrismaService } from '../common/prisma.service';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PRISMA_SERVICE,
      useExisting: PrismaService,
    },
    DevAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [PrismaService, PRISMA_SERVICE, DevAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
