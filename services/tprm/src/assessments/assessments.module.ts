import { Module } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { AssessmentsController } from './assessments.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, PrismaService, AuditService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
