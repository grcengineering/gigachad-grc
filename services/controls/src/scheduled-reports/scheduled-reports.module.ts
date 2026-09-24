import { Module } from '@nestjs/common';
import { ScheduledReportsController } from './scheduled-reports.controller';
import { ScheduledReportsService } from './scheduled-reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExportsModule } from '../exports/exports.module';
import { NotificationsConfigModule } from '../notifications-config/notifications-config.module';

@Module({
  imports: [PrismaModule, AuditModule, ExportsModule, NotificationsConfigModule],
  controllers: [ScheduledReportsController],
  providers: [ScheduledReportsService],
  exports: [ScheduledReportsService],
})
export class ScheduledReportsModule {}
