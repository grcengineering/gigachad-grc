import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PoliciesModule } from './policies/policies.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from '@gigachad-grc/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    StorageModule.forRoot(),
    AuditModule,
    PoliciesModule,
  ],
})
export class AppModule {}

