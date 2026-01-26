import { Module } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
