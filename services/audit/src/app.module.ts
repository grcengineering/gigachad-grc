import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditsModule } from './audits/audits.module';
import { RequestsModule } from './requests/requests.module';
import { FindingsModule } from './findings/findings.module';
import { FieldGuideModule } from './fieldguide/fieldguide.module';
import { AuditAIModule } from './ai/audit-ai.module';
import { TemplatesModule } from './templates/templates.module';
import { WorkpapersModule } from './workpapers/workpapers.module';
import { TestProceduresModule } from './test-procedures/test-procedures.module';
import { RemediationModule } from './remediation/remediation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PlanningModule } from './planning/planning.module';
import { ReportsModule } from './reports/reports.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditsModule,
    RequestsModule,
    FindingsModule,
    FieldGuideModule,
    AuditAIModule,
    TemplatesModule,
    WorkpapersModule,
    TestProceduresModule,
    RemediationModule,
    AnalyticsModule,
    PlanningModule,
    ReportsModule,
    PortalModule,
  ],
})
export class AppModule {}
