import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { TrustCenterModule } from './trust-center/trust-center.module';
import { TrustConfigModule } from './config/trust-config.module';
import { TemplatesModule } from './templates/templates.module';
import { TrustAiModule } from './ai/trust-ai.module';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/audit.service';
import { CacheModule } from '@gigachad-grc/shared';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate limiting - multiple tiers for different use cases
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
    ]),
    CacheModule.forRoot({ defaultTtl: 300 }), // 5-minute cache for dashboard widgets
    AuthModule,
    QuestionnairesModule,
    KnowledgeBaseModule,
    TrustCenterModule,
    TrustConfigModule,
    TemplatesModule,
    TrustAiModule,
  ],
  providers: [
    PrismaService,
    AuditService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService, AuditService],
})
export class AppModule {}
