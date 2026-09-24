import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ScimService } from './scim.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScimUserDto, CreateScimGroupDto, PatchScimDto } from './dto/scim.dto';

// Create mock functions
const mockUserFindMany = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserCount = jest.fn();
const mockGroupFindMany = jest.fn();
const mockGroupFindFirst = jest.fn();
const mockGroupFindUnique = jest.fn();
const mockGroupCreate = jest.fn();
const mockGroupUpdate = jest.fn();
const mockGroupDelete = jest.fn();
const mockGroupCount = jest.fn();
const mockMembershipFindMany = jest.fn();
const mockMembershipCreate = jest.fn();
const mockMembershipCreateMany = jest.fn();
const mockMembershipDeleteMany = jest.fn();
const mockScimConfigFindFirst = jest.fn();
const mockScimConfigFindUnique = jest.fn();
const mockScimConfigCount = jest.fn();
const mockScimConfigUpsert = jest.fn();
const mockScimConfigUpdate = jest.fn();

const mockPrisma = {
  user: {
    findMany: mockUserFindMany,
    findFirst: mockUserFindFirst,
    findUnique: mockUserFindUnique,
    create: mockUserCreate,
    update: mockUserUpdate,
    count: mockUserCount,
  },
  permissionGroup: {
    findMany: mockGroupFindMany,
    findFirst: mockGroupFindFirst,
    findUnique: mockGroupFindUnique,
    create: mockGroupCreate,
    update: mockGroupUpdate,
    delete: mockGroupDelete,
    count: mockGroupCount,
  },
  userGroupMembership: {
    findMany: mockMembershipFindMany,
    create: mockMembershipCreate,
    createMany: mockMembershipCreateMany,
    deleteMany: mockMembershipDeleteMany,
  },
  scimProviderConfig: {
    findFirst: mockScimConfigFindFirst,
    findUnique: mockScimConfigFindUnique,
    count: mockScimConfigCount,
    upsert: mockScimConfigUpsert,
    update: mockScimConfigUpdate,
  },
};

describe('ScimService', () => {
  let service: ScimService;

  const mockOrganizationId = 'org-123';

  // Mock user data
  const mockUser = {
    id: 'user-123',
    organizationId: mockOrganizationId,
    email: 'john@example.com',
    displayName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    keycloakId: 'kc-123',
    status: 'active',
    role: 'viewer',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  // Mock group data
  const mockGroup = {
    id: 'group-123',
    organizationId: mockOrganizationId,
    name: 'Administrators',
    description: 'Admin group',
    permissions: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    members: [],
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScimService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .setLogger(new Logger('ScimServiceTest'))
      .compile();

    service = module.get<ScimService>(ScimService);
  });

  // ==================== User Tests ====================

  describe('tenant token authentication', () => {
    it('hashes the bearer token and resolves the configured organization UUID', async () => {
      const organizationId = 'a17a0371-4e0a-4eac-a834-88b8af1bc9e5';
      mockScimConfigFindFirst.mockResolvedValue({ organizationId });

      await expect(service.authenticateToken('plain-secret-token')).resolves.toBe(
        organizationId,
      );
      expect(mockScimConfigFindFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: ScimService.hashToken('plain-secret-token'),
          enabled: true,
          organization: { status: 'active' },
        },
        select: { organizationId: true },
      });
      expect(
        JSON.stringify(mockScimConfigFindFirst.mock.calls[0][0]),
      ).not.toContain('plain-secret-token');
    });

    it('fails closed for an unknown token or when no provider is configured', async () => {
      mockScimConfigFindFirst.mockResolvedValue(null);
      mockScimConfigCount.mockResolvedValue(0);

      await expect(service.authenticateToken('unknown')).resolves.toBeNull();
      await expect(service.isConfigured()).resolves.toBe(false);
    });
  });

  describe('provider administration', () => {
    it('rotates a token without persisting its plaintext value', async () => {
      mockScimConfigUpsert.mockImplementation(async ({ create }) => ({
        id: 'config-1',
        provider: create.provider,
        enabled: create.enabled,
        defaultRole: create.defaultRole,
        updatedAt: new Date(),
      }));

      const result = await service.rotateProviderToken(mockOrganizationId, 'okta', 'viewer');
      expect(result.token).toMatch(/^grc_scim_/);
      const call = mockScimConfigUpsert.mock.calls[0][0];
      expect(call.create.tokenHash).toBe(ScimService.hashToken(result.token));
      expect(JSON.stringify(call)).not.toContain(result.token);
    });

    it('refuses to enable a provider that has not been configured', async () => {
      mockScimConfigFindUnique.mockResolvedValue(null);
      await expect(service.setProviderEnabled(mockOrganizationId, true)).rejects.toBeInstanceOf(
        NotFoundException
      );
      expect(mockScimConfigUpdate).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should return paginated list of users in SCIM format', async () => {
      mockUserFindMany.mockResolvedValue([mockUser]);
      mockUserCount.mockResolvedValue(1);

      const result = await service.listUsers(mockOrganizationId, {});

      expect(result.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
      expect(result.totalResults).toBe(1);
      expect(result.startIndex).toBe(1);
      expect(result.Resources).toHaveLength(1);
      expect(result.Resources[0].userName).toBe('john@example.com');
    });

    it('should filter users by userName', async () => {
      mockUserFindMany.mockResolvedValue([mockUser]);
      mockUserCount.mockResolvedValue(1);

      await service.listUsers(mockOrganizationId, {
        filter: 'userName eq "john@example.com"',
      });

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'john@example.com',
          }),
        }),
      );
    });

    it('should filter users by externalId', async () => {
      mockUserFindMany.mockResolvedValue([mockUser]);
      mockUserCount.mockResolvedValue(1);

      await service.listUsers(mockOrganizationId, {
        filter: 'externalId eq "kc-123"',
      });

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scimExternalId: { externalId: 'kc-123' },
          }),
        }),
      );
    });

    it('should respect pagination parameters', async () => {
      mockUserFindMany.mockResolvedValue([mockUser]);
      mockUserCount.mockResolvedValue(100);

      const result = await service.listUsers(mockOrganizationId, {
        startIndex: 11,
        count: 10,
      });

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.startIndex).toBe(11);
    });

    it('should limit count to 100', async () => {
      mockUserFindMany.mockResolvedValue([]);
      mockUserCount.mockResolvedValue(0);

      await service.listUsers(mockOrganizationId, {
        count: 500,
      });

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('getUser', () => {
    it('should return user in SCIM format', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockMembershipFindMany.mockResolvedValue([]);

      const result = await service.getUser(mockOrganizationId, 'user-123');

      expect(result.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:User');
      expect(result.id).toBe('user-123');
      expect(result.userName).toBe('john@example.com');
      expect(result.displayName).toBe('John Doe');
      expect(result.active).toBe(true);
    });

    it('should include group memberships', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockMembershipFindMany.mockResolvedValue([
        { userId: 'user-123', groupId: 'group-123', group: { id: 'group-123', name: 'Admins' } },
      ]);

      const result = await service.getUser(mockOrganizationId, 'user-123');

      expect(result.groups).toHaveLength(1);
      expect(result.groups![0].value).toBe('group-123');
      expect(result.groups![0].display).toBe('Admins');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(
        service.getUser(mockOrganizationId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createUser', () => {
    const createDto: CreateScimUserDto = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'jane@example.com',
      displayName: 'Jane Smith',
      name: { givenName: 'Jane', familyName: 'Smith' },
      emails: [{ value: 'jane@example.com', type: 'work', primary: true }],
      active: true,
    };

    it('should create user and return SCIM format', async () => {
      mockUserFindFirst.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        ...mockUser,
        id: 'new-user-123',
        email: 'jane@example.com',
        displayName: 'Jane Smith',
      });

      const result = await service.createUser(mockOrganizationId, createDto);

      expect(result.id).toBe('new-user-123');
      expect(result.userName).toBe('jane@example.com');
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrganizationId,
            email: 'jane@example.com',
            displayName: 'Jane Smith',
            status: 'active',
          }),
        }),
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);

      await expect(
        service.createUser(mockOrganizationId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should set user as inactive when active is false', async () => {
      mockUserFindFirst.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ ...mockUser, status: 'inactive' });

      await service.createUser(mockOrganizationId, {
        ...createDto,
        active: false,
      });

      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'inactive',
          }),
        }),
      );
    });

    it('applies configured default role and tenant-valid default groups', async () => {
      mockUserFindFirst.mockResolvedValue(null);
      mockScimConfigFindUnique.mockResolvedValue({
        defaultRole: 'auditor',
        defaultGroupIds: ['group-123', 'cross-tenant-group'],
      });
      mockUserCreate.mockResolvedValue({ ...mockUser, id: 'new-user-123', role: 'auditor' });
      mockGroupFindMany.mockResolvedValue([{ id: 'group-123' }]);

      await service.createUser(mockOrganizationId, createDto);

      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'auditor' }),
        })
      );
      expect(mockGroupFindMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['group-123', 'cross-tenant-group'] },
          organizationId: mockOrganizationId,
        },
        select: { id: true },
      });
      expect(mockMembershipCreateMany).toHaveBeenCalledWith({
        data: [{ userId: 'new-user-123', groupId: 'group-123' }],
        skipDuplicates: true,
      });
    });

    it('should use primary email from emails array', async () => {
      mockUserFindFirst.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ ...mockUser, email: 'primary@example.com' });

      await service.createUser(mockOrganizationId, {
        ...createDto,
        userName: 'fallback@example.com',
        emails: [
          { value: 'secondary@example.com', type: 'work', primary: false },
          { value: 'primary@example.com', type: 'work', primary: true },
        ],
      });

      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'primary@example.com',
          }),
        }),
      );
    });
  });

  describe('updateUser', () => {
    it('should update user and return SCIM format', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUserUpdate.mockResolvedValue({
        ...mockUser,
        displayName: 'John Updated',
      });

      const result = await service.updateUser(mockOrganizationId, 'user-123', {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: 'john@example.com',
        displayName: 'John Updated',
        active: true,
      });

      expect(result.displayName).toBe('John Updated');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(
        service.updateUser(mockOrganizationId, 'nonexistent', {
          schemas: [],
          userName: 'test',
          active: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('patchUser', () => {
    it('should update user active status via PATCH', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUserUpdate.mockResolvedValue({ ...mockUser, status: 'inactive' });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'active', value: false },
        ],
      };

      await service.patchUser(mockOrganizationId, 'user-123', patchDto);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'inactive',
          }),
        }),
      );
    });

    it('should update displayName via PATCH', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUserUpdate.mockResolvedValue({ ...mockUser, displayName: 'Updated Name' });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'displayName', value: 'Updated Name' },
        ],
      };

      await service.patchUser(mockOrganizationId, 'user-123', patchDto);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'Updated Name',
          }),
        }),
      );
    });

    it('should handle replace without path (full object)', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUserUpdate.mockResolvedValue({ ...mockUser, status: 'inactive' });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', value: { active: false } },
        ],
      };

      await service.patchUser(mockOrganizationId, 'user-123', patchDto);

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'inactive',
          }),
        }),
      );
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user by setting status to suspended', async () => {
      mockUserFindFirst.mockResolvedValue(mockUser);
      mockUserUpdate.mockResolvedValue({ ...mockUser, status: 'suspended' });

      await service.deleteUser(mockOrganizationId, 'user-123');

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { status: 'suspended' },
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUserFindFirst.mockResolvedValue(null);

      await expect(
        service.deleteUser(mockOrganizationId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== Group Tests ====================

  describe('listGroups', () => {
    it('should return paginated list of groups in SCIM format', async () => {
      mockGroupFindMany.mockResolvedValue([mockGroup]);
      mockGroupCount.mockResolvedValue(1);

      const result = await service.listGroups(mockOrganizationId, {});

      expect(result.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:ListResponse');
      expect(result.totalResults).toBe(1);
      expect(result.Resources).toHaveLength(1);
      expect(result.Resources[0].displayName).toBe('Administrators');
    });

    it('should filter groups by displayName', async () => {
      mockGroupFindMany.mockResolvedValue([mockGroup]);
      mockGroupCount.mockResolvedValue(1);

      await service.listGroups(mockOrganizationId, {
        filter: 'displayName eq "Administrators"',
      });

      expect(mockGroupFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: 'Administrators',
          }),
        }),
      );
    });
  });

  describe('getGroup', () => {
    it('should return group in SCIM format with members', async () => {
      const groupWithMembers = {
        ...mockGroup,
        members: [
          {
            userId: 'user-123',
            user: { id: 'user-123', displayName: 'John Doe' },
          },
        ],
      };
      mockGroupFindFirst.mockResolvedValue(groupWithMembers);

      const result = await service.getGroup(mockOrganizationId, 'group-123');

      expect(result.schemas).toContain('urn:ietf:params:scim:schemas:core:2.0:Group');
      expect(result.id).toBe('group-123');
      expect(result.displayName).toBe('Administrators');
      expect(result.members).toHaveLength(1);
      expect(result.members![0].value).toBe('user-123');
    });

    it('should throw NotFoundException for non-existent group', async () => {
      mockGroupFindFirst.mockResolvedValue(null);

      await expect(
        service.getGroup(mockOrganizationId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createGroup', () => {
    const createDto: CreateScimGroupDto = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: 'New Group',
    };

    it('should create group and return SCIM format', async () => {
      mockGroupFindFirst.mockResolvedValue(null);
      mockGroupCreate.mockResolvedValue({
        ...mockGroup,
        id: 'new-group-123',
        name: 'New Group',
        members: [],
      });

      const result = await service.createGroup(mockOrganizationId, createDto);

      expect(result.id).toBe('new-group-123');
      expect(result.displayName).toBe('New Group');
    });

    it('should throw ConflictException if group already exists', async () => {
      mockGroupFindFirst.mockResolvedValue(mockGroup);

      await expect(
        service.createGroup(mockOrganizationId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should add members when provided', async () => {
      mockGroupFindFirst.mockResolvedValue(null);
      mockGroupCreate.mockResolvedValue({
        ...mockGroup,
        id: 'new-group-123',
        name: 'New Group',
        members: [],
      });
      mockMembershipDeleteMany.mockResolvedValue({ count: 0 });
      mockMembershipCreateMany.mockResolvedValue({ count: 2 });
      mockUserFindMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

      await service.createGroup(mockOrganizationId, {
        ...createDto,
        members: [
          { value: 'user-1' },
          { value: 'user-2' },
        ],
      });

      expect(mockMembershipCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1' }),
            expect.objectContaining({ userId: 'user-2' }),
          ]),
        }),
      );
    });
  });

  describe('patchGroup', () => {
    it('should add members via PATCH', async () => {
      mockGroupFindFirst.mockResolvedValue({
        ...mockGroup,
        members: [],
      });
      mockMembershipCreate.mockResolvedValue({});
      mockUserFindMany.mockResolvedValue([{ id: 'user-1' }]);
      mockGroupFindUnique.mockResolvedValue({
        ...mockGroup,
        members: [{ userId: 'user-1', user: { id: 'user-1', displayName: 'User 1' } }],
      });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'add', path: 'members', value: [{ value: 'user-1' }] },
        ],
      };

      const result = await service.patchGroup(mockOrganizationId, 'group-123', patchDto);

      expect(mockMembershipCreate).toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
    });

    it('should remove members via PATCH using filter expression', async () => {
      mockGroupFindFirst.mockResolvedValue({
        ...mockGroup,
        members: [{ userId: 'user-1' }],
      });
      mockMembershipDeleteMany.mockResolvedValue({ count: 1 });
      mockGroupFindUnique.mockResolvedValue({
        ...mockGroup,
        members: [],
      });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'remove', path: 'members[value eq "user-1"]' },
        ],
      };

      await service.patchGroup(mockOrganizationId, 'group-123', patchDto);

      expect(mockMembershipDeleteMany).toHaveBeenCalledWith({
        where: { groupId: 'group-123', userId: 'user-1' },
      });
    });

    it('should replace displayName via PATCH', async () => {
      mockGroupFindFirst.mockResolvedValue({
        ...mockGroup,
        members: [],
      });
      mockGroupUpdate.mockResolvedValue({
        ...mockGroup,
        name: 'Updated Name',
      });
      mockGroupFindUnique.mockResolvedValue({
        ...mockGroup,
        name: 'Updated Name',
        members: [],
      });

      const patchDto: PatchScimDto = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
        Operations: [
          { op: 'replace', path: 'displayName', value: 'Updated Name' },
        ],
      };

      const result = await service.patchGroup(mockOrganizationId, 'group-123', patchDto);

      expect(mockGroupUpdate).toHaveBeenCalledWith({
        where: { id: 'group-123' },
        data: { name: 'Updated Name' },
      });
      expect(result.displayName).toBe('Updated Name');
    });
  });

  describe('deleteGroup', () => {
    it('should delete group and memberships', async () => {
      mockGroupFindFirst.mockResolvedValue(mockGroup);
      mockMembershipDeleteMany.mockResolvedValue({ count: 2 });
      mockGroupDelete.mockResolvedValue(mockGroup);

      await service.deleteGroup(mockOrganizationId, 'group-123');

      expect(mockMembershipDeleteMany).toHaveBeenCalledWith({
        where: { groupId: 'group-123' },
      });
      expect(mockGroupDelete).toHaveBeenCalledWith({
        where: { id: 'group-123' },
      });
    });

    it('should throw NotFoundException for non-existent group', async () => {
      mockGroupFindFirst.mockResolvedValue(null);

      await expect(
        service.deleteGroup(mockOrganizationId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
