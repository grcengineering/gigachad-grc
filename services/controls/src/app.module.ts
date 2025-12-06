import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ControlsModule } from './controls/controls.module';
import { EvidenceModule } from './evidence/evidence.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommentsModule } from './comments/comments.module';
import { TasksModule } from './tasks/tasks.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CollectorsModule } from './collectors/collectors.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UsersModule } from './users/users.module';
import { RiskModule } from './risk/risk.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from '@gigachad-grc/shared';
import { EventsModule } from '@gigachad-grc/shared';
// import { SearchModule } from '@gigachad-grc/shared'; // TODO: Fix SearchModule - needs PrismaService injection and deletedAt fields

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule.forRoot(),
    EventsModule,
    // SearchModule, // TODO: Re-enable after fixing dependency injection and schema compatibility
    EmailModule,
    AuditModule,
    NotificationsModule,
    PermissionsModule,
    UsersModule,
    ControlsModule,
    EvidenceModule,
    DashboardModule,
    CommentsModule,
    TasksModule,
    IntegrationsModule,
    CollectorsModule,
    RiskModule,
  ],
})
export class AppModule {}

