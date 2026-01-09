import { Module } from '@nestjs/common';
import { ScimService } from './scim.service';
import { ScimController } from './scim.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScimService],
  controllers: [ScimController],
  exports: [ScimService],
})
export class ScimModule {}
