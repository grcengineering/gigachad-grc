import { ForbiddenException } from '@nestjs/common';
import type { UserContext } from '@gigachad-grc/shared';
import { SeedController } from './seed.controller';

describe('SeedController', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const seedService = {
    loadDemoData: jest.fn(),
    isDemoDataLoaded: jest.fn(),
    hasExistingData: jest.fn(),
  };
  const resetService = {
    resetOrganizationData: jest.fn(),
    getDataSummary: jest.fn(),
  };
  const adminUser = {
    userId: 'admin-user',
    keycloakId: 'admin-user',
    email: 'admin@example.com',
    organizationId: 'organization-1',
    role: 'admin',
    permissions: ['*:*'],
  } as UserContext;

  let controller: SeedController;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    controller = new SeedController(seedService as never, resetService as never);
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('blocks demo loading in production even for an administrator', async () => {
    process.env.NODE_ENV = 'production';

    await expect(controller.loadDemoData(adminUser)).rejects.toThrow(
      new ForbiddenException('Demo data mutations are disabled in production')
    );
    expect(seedService.loadDemoData).not.toHaveBeenCalled();
  });

  it('blocks destructive resets in production even for an administrator', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      controller.resetData(adminUser, { confirmationPhrase: 'DELETE ALL DATA' })
    ).rejects.toThrow(new ForbiddenException('Demo data mutations are disabled in production'));
    expect(resetService.resetOrganizationData).not.toHaveBeenCalled();
  });

  it('allows an administrator to load demo data outside production', async () => {
    seedService.loadDemoData.mockResolvedValue({ success: true });

    await expect(controller.loadDemoData(adminUser)).resolves.toEqual({ success: true });
    expect(seedService.loadDemoData).toHaveBeenCalledWith(
      adminUser.organizationId,
      adminUser.userId
    );
  });
});
