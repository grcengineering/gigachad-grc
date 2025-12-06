import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VendorsModule } from './vendors/vendors.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { ContractsModule } from './contracts/contracts.module';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './common/audit.service';
import { StorageModule } from '@gigachad-grc/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    StorageModule.forRoot(),
    VendorsModule,
    AssessmentsModule,
    ContractsModule,
  ],
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService],
})
export class AppModule {}
