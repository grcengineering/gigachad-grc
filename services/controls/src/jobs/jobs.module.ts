import { Module, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobSchedulerService } from './job-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExportsModule } from '../exports/exports.module';
import { ReportsModule } from '../reports/reports.module';
import { RetentionModule } from '../retention/retention.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SessionsModule } from '../sessions/sessions.module';
import { JiraModule } from '../integrations/jira/jira.module';
import { ServiceNowModule } from '../integrations/servicenow/servicenow.module';
import { CollectorsModule } from '../collectors/collectors.module';
import { ScheduledReportsModule } from '../scheduled-reports/scheduled-reports.module';

@Module({
  imports: [
    PrismaModule,
    // Use forwardRef to handle potential circular dependencies
    forwardRef(() => EmailModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => ExportsModule),
    forwardRef(() => ReportsModule),
    forwardRef(() => RetentionModule),
    forwardRef(() => WebhooksModule),
    forwardRef(() => SessionsModule),
    forwardRef(() => JiraModule),
    forwardRef(() => ServiceNowModule),
    forwardRef(() => CollectorsModule),
    forwardRef(() => ScheduledReportsModule),
  ],
  providers: [JobsService, JobSchedulerService],
  controllers: [JobsController],
  exports: [JobsService, JobSchedulerService],
})
export class JobsModule {}
