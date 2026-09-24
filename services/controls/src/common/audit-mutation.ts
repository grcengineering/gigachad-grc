import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditMutationInput {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persist an operational mutation audit record.
 *
 * Unlike the best-effort UI audit helper, durable-operation audits are allowed
 * to fail the request so callers never report an unaudited mutation as success.
 */
export async function auditMutation(
  prisma: PrismaService,
  input: AuditMutationInput,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityName: input.entityName,
      description: input.description,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
