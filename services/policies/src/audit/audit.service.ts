import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface LogAuditParams {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description: string;
  changes?: { before?: any; after?: any } | Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogAuditParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          userEmail: params.userEmail,
          userName: params.userName,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          description: params.description,
          changes: params.changes as Prisma.InputJsonValue,
          metadata: params.metadata as Prisma.InputJsonValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}



