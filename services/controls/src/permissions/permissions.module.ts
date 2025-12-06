import { Module, Global } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { GroupsService } from './groups.service';
import { PermissionsController } from './groups.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PermissionGuard, AuthenticatedGuard } from '../auth/permission.guard';

@Global()
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    GroupsService,
    PermissionGuard,
    AuthenticatedGuard,
  ],
  exports: [PermissionsService, GroupsService, PermissionGuard, AuthenticatedGuard],
})
export class PermissionsModule {}



