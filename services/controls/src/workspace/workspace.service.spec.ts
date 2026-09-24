import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, WorkspaceStatus } from '@prisma/client';
import { WorkspaceService } from './workspace.service';

describe('WorkspaceService tenant integrity', () => {
  const prisma = {
    workspace: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    workspaceMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
  };
  const service = new WorkspaceService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies a non-member workspace detail read', async () => {
    prisma.workspace.findFirst.mockResolvedValue({
      id: 'workspace-a',
      organizationId: 'org-a',
      members: [{ userId: 'another-user' }],
      _count: {},
    });

    await expect(
      service.findOne('workspace-a', 'org-a', 'non-member', UserRole.compliance_manager)
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies a non-member workspace write', async () => {
    prisma.workspace.findFirst.mockResolvedValue({
      id: 'workspace-a',
      organizationId: 'org-a',
      members: [],
    });

    await expect(
      service.update('workspace-a', 'org-a', 'non-member', UserRole.compliance_manager, {
        name: 'Tampered',
      })
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.workspace.update).not.toHaveBeenCalled();
  });

  it('does not grant an Org A admin implicit access to an Org B workspace ID', async () => {
    prisma.workspace.findFirst.mockResolvedValue(null);

    await expect(
      service.checkAccess('workspace-b', 'org-a', 'admin-a', UserRole.admin)
    ).resolves.toBeNull();
  });

  it('rejects adding an Org B user to an Org A workspace', async () => {
    prisma.workspace.findFirst.mockResolvedValue({
      id: 'workspace-a',
      organizationId: 'org-a',
      members: [],
    });
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.addMember('workspace-a', 'org-a', 'admin-a', UserRole.admin, { userId: 'user-b' })
    ).rejects.toThrow(NotFoundException);
    expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
  });
});

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

    await expect(service.toggleMultiWorkspace('org-1', false, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
