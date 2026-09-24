import { IntegrationsService } from './integrations.service';

describe('IntegrationsService sync failure propagation', () => {
  const integrationId = '1196ebf7-8df1-4ca7-99f1-becdb7635256';
  const organizationId = 'a17a0371-4e0a-4eac-a834-88b8af1bc9e5';
  const userId = 'b17a0371-4e0a-4eac-a834-88b8af1bc9e5';

  it('marks the job failed and does not create evidence when a connector returns failure', async () => {
    process.env.ENCRYPTION_KEY = 'integration-test-key-that-is-long-enough';

    const prisma = {
      integration: {
        findFirst: jest.fn().mockResolvedValue({
          id: integrationId,
          organizationId,
          type: 'github',
          name: 'GitHub',
          status: 'active',
          config: {},
          createdBy: userId,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      syncJob: {
        create: jest.fn().mockResolvedValue({ id: 'sync-job-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      evidence: {
        create: jest.fn(),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const notifications = { create: jest.fn().mockResolvedValue(undefined) };
    const storage = { upload: jest.fn() };
    const secrets = {
      isEnabled: jest.fn().mockReturnValue(false),
      getSecret: jest.fn(),
      setSecret: jest.fn(),
      deleteSecret: jest.fn(),
    };

    const service = new IntegrationsService(
      prisma as any,
      audit as any,
      notifications as any,
      storage as any,
      secrets as any
    );
    (service as any).connectorFactory = {
      sync: jest.fn().mockResolvedValue({
        success: false,
        message: 'Remote API rejected the sync',
        errors: ['HTTP 403'],
      }),
    };

    const result = await service.triggerSync(integrationId, organizationId, userId);

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('Remote API rejected the sync'),
      })
    );
    expect(prisma.syncJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          error: 'Remote API rejected the sync',
        }),
      })
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(prisma.evidence.create).not.toHaveBeenCalled();
  });
});
