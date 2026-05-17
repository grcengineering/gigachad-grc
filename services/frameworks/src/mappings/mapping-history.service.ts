import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ControlMappingHistory, Prisma } from '@prisma/client';

export type MappingHistoryAction = 'create' | 'update' | 'delete' | 'restore';

@Injectable()
export class MappingHistoryService {
  constructor(private prisma: PrismaService) {}

  async record(
    tx: Prisma.TransactionClient,
    mappingId: string,
    action: MappingHistoryAction,
    snapshot: Prisma.InputJsonValue,
    userId: string,
    reason?: string
  ): Promise<void> {
    await tx.controlMappingHistory.create({
      data: {
        mappingId,
        action,
        snapshot,
        changedBy: userId,
        reason,
      },
    });
  }

  async listByMapping(mappingId: string, organizationId: string): Promise<ControlMappingHistory[]> {
    const mapping = await this.prisma.controlMapping.findFirst({
      where: {
        id: mappingId,
        OR: [
          { control: { OR: [{ organizationId }, { organizationId: null }] } },
          { framework: { OR: [{ organizationId }, { organizationId: null }] } },
        ],
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${mappingId} not found`);
    }

    return this.prisma.controlMappingHistory.findMany({
      where: { mappingId },
      orderBy: { changedAt: 'desc' },
    });
  }

  async listByMappingWithUser(mappingId: string, organizationId: string) {
    const mapping = await this.prisma.controlMapping.findFirst({
      where: {
        id: mappingId,
        OR: [
          { control: { OR: [{ organizationId }, { organizationId: null }] } },
          { framework: { OR: [{ organizationId }, { organizationId: null }] } },
        ],
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${mappingId} not found`);
    }

    return this.prisma.controlMappingHistory.findMany({
      where: { mappingId },
      orderBy: { changedAt: 'desc' },
      include: {
        changedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });
  }
}
