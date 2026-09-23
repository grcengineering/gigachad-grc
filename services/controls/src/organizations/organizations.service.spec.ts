import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DEV_USER } from '@gigachad-grc/shared';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  const organization = {
    id: 'org-1',
    name: 'Original Org',
    slug: 'original-org',
    description: 'Original description',
    status: 'active',
    settings: {
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      enabledModules: ['compliance'],
    },
  };

  const prisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  let service: OrganizationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrganizationsService(prisma as never);
  });

  it('returns defaults while preserving stored organization settings', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      ...organization,
      settings: { enabledModules: ['compliance'] },
    });

    await expect(service.getCurrent('org-1')).resolves.toMatchObject({
      id: 'org-1',
      name: 'Original Org',
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        enabledModules: ['compliance'],
      },
    });
  });

  it('creates the development organization on first access', async () => {
    prisma.organization.upsert.mockResolvedValue({});
    prisma.user.upsert.mockResolvedValue({});
    prisma.organization.findUnique.mockResolvedValue({
      ...organization,
      id: DEV_USER.organizationId,
    });

    await service.getCurrent(DEV_USER.organizationId);

    expect(prisma.organization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DEV_USER.organizationId } })
    );
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: DEV_USER.userId } })
    );
  });

  it('merges editable settings without dropping unrelated keys and writes an audit log', async () => {
    prisma.organization.findUnique.mockResolvedValue(organization);
    prisma.organization.update.mockImplementation(async ({ data }) => ({
      ...organization,
      ...data,
    }));
    prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

    const result = await service.updateCurrent('org-1', 'user-1', {
      name: ' Updated Org ',
      description: ' Updated description ',
      settings: { timezone: 'America/New_York', dateFormat: 'MM/DD/YYYY' },
    });

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-1' },
        data: {
          name: 'Updated Org',
          description: 'Updated description',
          settings: {
            timezone: 'America/New_York',
            dateFormat: 'MM/DD/YYYY',
            enabledModules: ['compliance'],
          },
        },
      })
    );
    expect(result.settings.enabledModules).toEqual(['compliance']);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        userId: 'user-1',
        action: 'organization.settings_changed',
      }),
    });
  });

  it('rejects a whitespace-only organization name', async () => {
    prisma.organization.findUnique.mockResolvedValue(organization);

    await expect(service.updateCurrent('org-1', 'user-1', { name: '   ' })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('rejects timezone-shaped strings that are not real IANA zones', async () => {
    await expect(
      service.updateCurrent('org-1', 'user-1', {
        settings: { timezone: 'America/Definitely_Not_Real' },
      })
    ).rejects.toThrow('timezone must be UTC or a valid IANA timezone');
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown tenant', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.getCurrent('other-org')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'other-org' } })
    );
  });
});
