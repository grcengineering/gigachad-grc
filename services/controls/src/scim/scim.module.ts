import { Module } from '@nestjs/common';
import { ScimService } from './scim.service';
import { ScimController } from './scim.controller';
import { ScimAdminController } from './scim-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScimService],
  controllers: [ScimController, ScimAdminController],
  exports: [ScimService],
})
export class ScimModule {}
