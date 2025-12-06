import { Module } from '@nestjs/common';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}
