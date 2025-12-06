import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { TrustCenterModule } from './trust-center/trust-center.module';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    QuestionnairesModule,
    KnowledgeBaseModule,
    TrustCenterModule,
  ],
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class AppModule {}
