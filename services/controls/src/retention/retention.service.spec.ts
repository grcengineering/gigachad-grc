import { RetentionService } from './retention.service';
import {
  RetentionAction,
  RetentionEntityType,
  RetentionPolicyStatus,
} from './dto/retention.dto';

describe('RetentionService truthful affected counts', () => {
  const policy = {
    id: 'policy-1',
    organizationId: 'org-a',
    name: 'Old audit logs',
    entityType: RetentionEntityType.AUDIT_LOGS,
    periodValue: 30,
    periodUnit: 'days',
    action: RetentionAction.DELETE,
    status: RetentionPolicyStatus.ACTIVE,
    isEnabled: true,
    filterConditions: null,
    description: null,
    requireConfirmation: true,
    notifyBeforeAction: true,
    notifyDaysBefore: null,
    lastRunAt: null,
    nextRunAt: new Date(),
    lastRunResult: null,
    recordsAffected: null,
    createdBy: 'user-a',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma: any = {
    retentionPolicy: {
      findFirst: jest.fn(async () => ({ ...policy })),
      update: jest.fn(async () => ({ ...policy })),
    },
    retentionRun: {
      create: jest.fn(async ({ data }) => ({ id: 'run-1', ...data })),
      update: jest.fn(async ({ data }) => ({ id: 'run-1', ...data })),
    },
    auditLog: {
      count: jest.fn(async () => 4),
      deleteMany: jest.fn(async () => ({ count: 3 })),
      create: jest.fn(async () => ({})),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it('reports zero processed rows for a dry run', async () => {
    const service = new RetentionService(prisma);
    const result = await service.runPolicy('org-a', 'user-a', 'policy-1', { dryRun: true });

    expect(result).toMatchObject({ recordsFound: 4, recordsProcessed: 0, dryRun: true });
    expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
  });

  it('uses the database affected-row count for destructive runs', async () => {
    const service = new RetentionService(prisma);
    const result = await service.runPolicy('org-a', 'user-a', 'policy-1', { dryRun: false });

    expect(result).toMatchObject({ recordsFound: 4, recordsProcessed: 3, dryRun: false });
    expect(prisma.retentionPolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recordsAffected: 3 }),
      }),
    );
  });
});
