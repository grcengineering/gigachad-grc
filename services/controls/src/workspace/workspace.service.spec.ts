import { BadRequestException } from '@nestjs/common';
import { WorkspaceStatus } from '@prisma/client';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService multi-workspace toggle', () => {
  const prisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new WorkspaceService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organization.update.mockResolvedValue({
      id: 'org-1',
      multiWorkspaceEnabled: false,
    });
  });

  it('allows disabling when only one workspace is active and others are archived', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      workspaces: [
        { id: 'active-1', status: WorkspaceStatus.active },
        { id: 'archived-1', status: WorkspaceStatus.archived },
        { id: 'archived-2', status: WorkspaceStatus.archived },
      ],
    });

    await expect(service.toggleMultiWorkspace('org-1', false, 'user-1')).resolves.toEqual(
      expect.objectContaining({ multiWorkspaceEnabled: false })
    );
  });

  it('still rejects disabling when multiple active workspaces remain', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      workspaces: [
        { id: 'active-1', status: WorkspaceStatus.active },
        { id: 'active-2', status: WorkspaceStatus.active },
        { id: 'archived-1', status: WorkspaceStatus.archived },
      ],
    });

    await expect(
      service.toggleMultiWorkspace('org-1', false, 'user-1')
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
