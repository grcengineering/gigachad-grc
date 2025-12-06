import { Module } from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { QuestionnairesController } from './questionnaires.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService, PrismaService, AuditService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
