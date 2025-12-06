import { Module } from '@nestjs/common';
import { TrustCenterService } from './trust-center.service';
import { TrustCenterController } from './trust-center.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [TrustCenterController],
  providers: [TrustCenterService, PrismaService, AuditService],
  exports: [TrustCenterService],
})
export class TrustCenterModule {}
