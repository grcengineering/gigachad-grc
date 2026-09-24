import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import {
  ApprovalRequestStatus,
  WorkflowEntityType,
} from './dto/workflow.dto';

describe('WorkflowsService durable persistence', () => {
  const workflows: any[] = [];
  const requests: any[] = [];
  let sequence = 0;

  const prisma: any = {
    approvalWorkflow: {
      create: jest.fn(async ({ data }) => {
        const row = {
          id: `workflow-${++sequence}`,
          description: null,
          triggerConditions: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        workflows.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }) =>
        workflows.find(
          (row) =>
            row.id === where.id &&
            (where.organizationId === undefined || row.organizationId === where.organizationId),
        ) ?? null,
      ),
      findMany: jest.fn(async ({ where }) =>
        workflows.filter(
          (row) =>
            row.organizationId === where.organizationId &&
            (where.entityType === undefined || row.entityType === where.entityType) &&
            (where.isActive === undefined || row.isActive === where.isActive),
        ),
      ),
      count: jest.fn(async ({ where }) =>
        workflows.filter((row) => row.organizationId === where.organizationId).length,
      ),
      update: jest.fn(),
      delete: jest.fn(),
    },
    approvalRequest: {
      findFirst: jest.fn(async ({ where, include }) => {
        const row = requests.find(
          (candidate) =>
            (where.id === undefined || candidate.id === where.id) &&
            candidate.organizationId === where.organizationId &&
            (where.workflowId === undefined || candidate.workflowId === where.workflowId) &&
            (where.entityId === undefined || candidate.entityId === where.entityId) &&
            (where.status?.in === undefined || where.status.in.includes(candidate.status)),
        );
        if (!row) return null;
        return include?.workflow
          ? { ...row, workflow: workflows.find((item) => item.id === row.workflowId) }
          : row;
      }),
      create: jest.fn(async ({ data }) => {
        const row = {
          id: `request-${++sequence}`,
          entityName: null,
          priority: 'medium',
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
          context: data.context ?? null,
          justification: data.justification ?? null,
          expiresAt: data.expiresAt ?? null,
        };
        requests.push(row);
        return row;
      }),
      count: jest.fn(async () => 0),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: { create: jest.fn(async () => ({})) },
    user: { findFirst: jest.fn() },
    userGroupMembership: { findMany: jest.fn() },
  };

  beforeEach(() => {
    workflows.length = 0;
    requests.length = 0;
    sequence = 0;
    jest.clearAllMocks();
  });

  it('survives service reconstruction and enforces organization scope', async () => {
    const firstInstance = new WorkflowsService(prisma);
    const created = await firstInstance.createWorkflow('org-a', 'user-a', {
      name: 'Policy approval',
      entityType: WorkflowEntityType.Policy,
      steps: [{ name: 'Review', order: 1, approverUserIds: ['user-a'] }],
    });

    const restartedInstance = new WorkflowsService(prisma);
    await expect(restartedInstance.getWorkflow('org-a', created.id)).resolves.toMatchObject({
      id: created.id,
      name: 'Policy approval',
    });
    await expect(restartedInstance.getWorkflow('org-b', created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('persists approval requests and their step state', async () => {
    const service = new WorkflowsService(prisma);
    const workflow = await service.createWorkflow('org-a', 'user-a', {
      name: 'Risk approval',
      entityType: WorkflowEntityType.Risk,
      steps: [{ name: 'Review', order: 1, approverUserIds: ['user-a'], timeoutHours: 2 }],
    });
    const request = await service.createApprovalRequest('org-a', 'user-a', {
      workflowId: workflow.id,
      entityId: 'risk-1',
    });

    const restartedInstance = new WorkflowsService(prisma);
    await expect(restartedInstance.getApprovalRequest('org-a', request.id)).resolves.toMatchObject({
      status: ApprovalRequestStatus.Pending,
      stepApprovals: [{ stepName: 'Review', status: 'pending' }],
    });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
  });
});
