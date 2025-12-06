import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService, PrismaService, AuditService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
