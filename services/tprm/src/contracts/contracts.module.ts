import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, PrismaService, AuditService],
  exports: [ContractsService],
})
export class ContractsModule {}
