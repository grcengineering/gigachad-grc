import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { FrameworksModule } from './frameworks/frameworks.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { MappingsModule } from './mappings/mappings.module';
import { AuditModule } from './audit/audit.module';
import {
  EventsModule,
  StorageModule,
  HealthModule,
  createPrismaHealthProvider,
} from '@gigachad-grc/shared';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    EventsModule,
    StorageModule.forRoot(),
    HealthModule,
    AuditModule,
    FrameworksModule,
    AssessmentsModule,
    MappingsModule,
  ],
  providers: [
    createPrismaHealthProvider(PrismaService),
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
