import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

interface AuditLogData {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  changes?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          description: data.description,
          metadata: data.metadata || {},
          changes: data.changes,
          ipAddress: null,
          userAgent: null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log:', error);
    }
  }
}
