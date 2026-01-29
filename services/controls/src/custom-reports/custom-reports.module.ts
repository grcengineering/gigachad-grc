import { Module } from '@nestjs/common';
import { CustomReportsController } from './custom-reports.controller';
import { CustomReportsService } from './custom-reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CustomReportsController],
  providers: [CustomReportsService],
  exports: [CustomReportsService],
})
export class CustomReportsModule {}
