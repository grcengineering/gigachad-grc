import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    organizationId: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    description: string;
    changes?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...params,
        timestamp: new Date(),
      },
    });
  }
}
