import { BadRequestException } from '@nestjs/common';
import { ServiceNowService } from './servicenow.service';
import { ServiceNowAuthType } from './dto/servicenow.dto';

describe('ServiceNowService OAuth connection lifecycle', () => {
  const organizationId = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'servicenow-test-encryption-key';
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEncryptionKey;
  });

  it('rejects incomplete OAuth configuration', async () => {
    const prisma = { serviceNowConnection: { upsert: jest.fn() } };
    const service = new ServiceNowService(prisma as never);

    await expect(
      service.connect(organizationId, {
        instanceUrl: 'https://example.service-now.com',
        authType: ServiceNowAuthType.OAUTH,
        clientId: 'client-id',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.serviceNowConnection.upsert).not.toHaveBeenCalled();
  });

  it('persists OAuth configuration as disconnected until the callback succeeds', async () => {
    const prisma = {
      serviceNowConnection: {
        upsert: jest.fn().mockImplementation(({ create }) => ({
          id: 'connection-id',
          ...create,
          createdAt: new Date(),
          lastSyncAt: null,
          connectionError: null,
        })),
      },
    };
    const service = new ServiceNowService(prisma as never);

    const result = await service.connect(organizationId, {
      instanceUrl: 'https://example.service-now.com',
      authType: ServiceNowAuthType.OAUTH,
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });

    expect(result.isConnected).toBe(false);
    expect(result.connectedAt).toBeNull();
    expect(prisma.serviceNowConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isConnected: false,
          connectedAt: null,
        }),
      })
    );
    const credentials = JSON.parse(
      prisma.serviceNowConnection.upsert.mock.calls[0][0].create.credentials
    );
    expect(credentials.clientSecret).not.toBe('client-secret');
  });
});
