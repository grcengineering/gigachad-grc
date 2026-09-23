import { ControlImplementationStatus } from '@prisma/client';
import { DashboardService } from './dashboard.service';

describe('DashboardService compliance trend', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-10T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reconstructs historical scores from persisted status-change audit events', async () => {
    const prisma = {
      controlImplementation: {
        findMany: jest.fn().mockResolvedValue([
          {
            controlId: 'control-a',
            status: ControlImplementationStatus.implemented,
            createdAt: new Date('2025-12-01T00:00:00.000Z'),
          },
          {
            controlId: 'control-b',
            status: ControlImplementationStatus.in_progress,
            createdAt: new Date('2025-12-01T00:00:00.000Z'),
          },
        ]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            entityId: 'control-b',
            timestamp: new Date('2026-01-10T00:00:00.000Z'),
            changes: {
              before: { status: ControlImplementationStatus.implemented },
              after: { status: ControlImplementationStatus.in_progress },
            },
          },
        ]),
      },
    };
    const service = new DashboardService(prisma as never, {} as never);

    const trend = await service.getComplianceTrend('organization-a', 2);

    expect(trend.map((point) => point.score)).toEqual([100, 50]);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'organization-a' }),
        orderBy: { timestamp: 'desc' },
      })
    );
  });
});
