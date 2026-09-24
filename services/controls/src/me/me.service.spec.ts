import { MeService } from './me.service';

describe('MeService', () => {
  const originalEnvironment = process.env;
  const organizationId = '8924f0c1-7bb1-4be8-84ee-ad8725c712bf';
  const userId = '8f88a42b-e799-455c-b68a-308d7d2e9aa4';

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    delete process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    delete process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    delete process.env.KEYCLOAK_PASSWORD_CLIENT_ID;
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  function createService() {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: userId,
          organizationId,
          keycloakId: 'keycloak-user',
          displayName: 'Alex Rivera',
          firstName: 'Alex',
          lastName: 'Rivera',
          email: 'alex@example.com',
          role: 'admin',
          preferences: { timezone: 'America/New_York' },
        }),
        update: jest.fn(),
      },
    };
    const apiKeys = {
      findForUser: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      revokeForUser: jest.fn(),
    };
    const notifications = {
      getPreferences: jest.fn().mockResolvedValue([]),
      updatePreferences: jest.fn(),
    };
    const storage = {
      upload: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
    };
    return {
      service: new MeService(
        prisma as never,
        apiKeys as never,
        notifications as never,
        storage as never
      ),
      prisma,
      storage,
    };
  }

  it('reports identity-provider capabilities without inventing TOTP status', async () => {
    process.env.KEYCLOAK_URL = 'https://identity.example.com';
    const { service } = createService();

    const me = await service.getMe(organizationId, userId);

    expect(me.twoFactorEnabled).toBeNull();
    expect(me.identity).toMatchObject({
      accountConsoleAvailable: true,
      passwordApiAvailable: false,
      totpApiAvailable: false,
      sessionsApiAvailable: false,
    });
  });

  it('returns an external provider action when direct password APIs are unavailable', async () => {
    process.env.KEYCLOAK_URL = 'https://identity.example.com';
    const { service } = createService();

    await expect(
      service.changePassword(organizationId, userId, {
        currentPassword: 'not-sent-to-provider',
        newPassword: 'also-not-sent-to-provider',
      })
    ).resolves.toMatchObject({
      status: 'external_action_required',
      setupUrl: expect.stringContaining('/account/'),
    });
  });

  it('stores avatars privately and records storage metadata', async () => {
    const { service, prisma, storage } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: userId,
      organizationId,
      keycloakId: 'keycloak-user',
      preferences: {},
    });
    prisma.user.update.mockResolvedValue({ id: userId });

    await service.uploadAvatar(organizationId, userId, {
      buffer: Buffer.from('image'),
      originalname: 'avatar.png',
      mimetype: 'image/png',
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringMatching(/^avatars\//),
      expect.objectContaining({ contentType: 'image/png', acl: 'private' })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          preferences: expect.objectContaining({
            avatarContentType: 'image/png',
            avatarStoragePath: expect.stringMatching(/^avatars\//),
          }),
        },
      })
    );
  });
});
