import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [VendorsController],
  providers: [VendorsService, PrismaService, AuditService],
  exports: [VendorsService],
})
export class VendorsModule {}
