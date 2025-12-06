import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

interface AuditLogData {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  metadata?: Record<string, any>;
  changes?: Record<string, any>;
}

@Injectable()
export class AuditService {
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
      console.error('Failed to create audit log:', error);
    }
  }
}
