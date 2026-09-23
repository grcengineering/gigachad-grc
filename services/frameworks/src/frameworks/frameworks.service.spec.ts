import { Test, TestingModule } from '@nestjs/testing';
import { FrameworksService } from './frameworks.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('FrameworksService', () => {
  let service: FrameworksService;

  const mockPrismaService = {
    framework: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    frameworkRequirement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FrameworksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FrameworksService>(FrameworksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockFrameworks = [
      {
        id: 'fw-1',
        name: 'SOC 2',
        type: 'compliance',
        version: '2017',
        isActive: true,
        _count: { requirements: 116, mappings: 50 },
        assessments: [],
      },
      {
        id: 'fw-2',
        name: 'ISO 27001',
        type: 'security',
        version: '2022',
        isActive: true,
        _count: { requirements: 93, mappings: 40 },
        assessments: [],
      },
    ];

    it('should return all frameworks for an organization with readiness', async () => {
      mockPrismaService.framework.findMany.mockResolvedValue(mockFrameworks);
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);
      mockPrismaService.framework.findFirst.mockResolvedValue(mockFrameworks[0]);

      const result = await service.findAll('org-123');

      expect(mockPrismaService.framework.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [{ organizationId: null, isActive: true }, { organizationId: 'org-123' }],
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('readiness');
      expect(result[0]).toHaveProperty('requirementCount');
    });
  });

  describe('create', () => {
    const mockCreateDto = {
      name: 'Custom Framework',
      type: 'internal',
      version: '1.0',
      description: 'Internal compliance framework',
    };

    const mockCreatedFramework = {
      id: 'fw-123',
      ...mockCreateDto,
      organizationId: 'org-123',
      isActive: true,
      _count: { requirements: 0, mappings: 0 },
    };

    it('should create a framework', async () => {
      mockPrismaService.framework.create.mockResolvedValue(mockCreatedFramework);

      const result = await service.create('org-123', mockCreateDto);

      expect(mockPrismaService.framework.create).toHaveBeenCalledWith({
        data: {
          name: 'Custom Framework',
          type: 'internal',
          version: '1.0',
          description: 'Internal compliance framework',
          organizationId: 'org-123',
          isActive: true,
        },
        include: {
          _count: {
            select: {
              requirements: true,
              mappings: {
                where: {
                  control: {
                    OR: [{ organizationId: null }, { organizationId: 'org-123' }],
                  },
                },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockCreatedFramework);
    });

    it('should use default version if not provided', async () => {
      const dtoWithoutVersion = { name: 'Test', type: 'test' };
      mockPrismaService.framework.create.mockResolvedValue({
        ...mockCreatedFramework,
        version: '1.0',
      });

      await service.create('org-123', dtoWithoutVersion);

      expect(mockPrismaService.framework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: '1.0',
          }),
        })
      );
    });
  });

  describe('findOne', () => {
    const mockFramework = {
      id: 'fw-123',
      name: 'SOC 2',
      type: 'compliance',
      _count: { requirements: 116, mappings: 50 },
    };

    it('should return a framework by id', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(mockFramework);

      const result = await service.findOne('fw-123', 'org-123');

      expect(mockPrismaService.framework.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'fw-123',
          deletedAt: null,
          OR: [{ organizationId: null }, { organizationId: 'org-123' }],
        },
        include: { _count: { select: { requirements: true, mappings: true } } },
      });
      expect(result).toEqual(mockFramework);
    });

    it('should throw NotFoundException if framework not found', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockUpdateDto = {
      name: 'Updated Framework',
      description: 'Updated description',
    };

    it('should update a framework', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.framework.update.mockResolvedValue({
        id: 'fw-123',
        ...mockUpdateDto,
      });

      const result = await service.update('fw-123', mockUpdateDto, 'org-123');

      expect(mockPrismaService.framework.update).toHaveBeenCalledWith({
        where: { id: 'fw-123' },
        data: mockUpdateDto,
        include: { _count: { select: { requirements: true, mappings: true } } },
      });
      expect(result.name).toBe('Updated Framework');
    });

    it('should throw NotFoundException if framework not found', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(null);

      await expect(service.update('nonexistent', mockUpdateDto, 'org-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('delete', () => {
    it('should soft delete a framework', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({
        id: 'fw-123',
        name: 'Test',
      });
      mockPrismaService.framework.update.mockResolvedValue({});

      const result = await service.delete('fw-123', 'user-123', 'org-123');

      expect(mockPrismaService.framework.update).toHaveBeenCalledWith({
        where: { id: 'fw-123' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('createRequirement', () => {
    const mockCreateDto = {
      reference: 'CC1.1',
      title: 'Control Environment',
      description: 'The entity demonstrates commitment to integrity',
    };

    it('should create a requirement', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.create.mockResolvedValue({
        id: 'req-123',
        ...mockCreateDto,
        frameworkId: 'fw-123',
        level: 0,
      });

      const result = await service.createRequirement('fw-123', mockCreateDto, 'org-123');

      expect(mockPrismaService.frameworkRequirement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            frameworkId: 'fw-123',
            reference: 'CC1.1',
            title: 'Control Environment',
          }),
        })
      );
      expect(result.id).toBe('req-123');
    });

    it('should calculate level based on parent', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.findFirst.mockResolvedValue({
        id: 'parent-123',
        level: 1,
      });
      mockPrismaService.frameworkRequirement.findUnique.mockResolvedValue({
        id: 'parent-123',
        level: 1,
      });
      mockPrismaService.frameworkRequirement.create.mockResolvedValue({
        id: 'req-123',
        ...mockCreateDto,
        parentId: 'parent-123',
        level: 2,
      });

      await service.createRequirement(
        'fw-123',
        {
          ...mockCreateDto,
          parentId: 'parent-123',
        },
        'org-123'
      );

      expect(mockPrismaService.frameworkRequirement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            level: 2,
            parentId: 'parent-123',
          }),
        })
      );
    });
  });

  describe('getRequirements', () => {
    const mockRequirements = [
      { id: 'req-1', reference: 'CC1', title: 'Category 1', isCategory: true },
      { id: 'req-2', reference: 'CC2', title: 'Category 2', isCategory: true },
    ];

    it('should return requirements for a framework', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValue(mockRequirements);

      const result = await service.getRequirements('fw-123', undefined, 'org-123');

      expect(mockPrismaService.frameworkRequirement.findMany).toHaveBeenCalledWith({
        where: { frameworkId: 'fw-123', parentId: null },
        include: expect.any(Object),
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(mockRequirements);
    });

    it('should filter by parentId', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);

      await service.getRequirements('fw-123', 'parent-123', 'org-123');

      expect(mockPrismaService.frameworkRequirement.findMany).toHaveBeenCalledWith({
        where: { frameworkId: 'fw-123', parentId: 'parent-123' },
        include: expect.any(Object),
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('calculateReadiness', () => {
    it('should calculate readiness score', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([
        {
          id: 'req-1',
          isCategory: false,
          mappings: [{ control: { implementations: [{ status: 'implemented' }] } }],
        },
        {
          id: 'req-2',
          isCategory: false,
          mappings: [
            { control: { implementations: [{ status: 'implemented' }] } },
            { control: { implementations: [{ status: 'not_applicable' }] } },
          ],
        },
        {
          id: 'req-3',
          isCategory: false,
          mappings: [{ control: { implementations: [{ status: 'in_progress' }] } }],
        },
      ]);

      const result = await service.calculateReadiness('fw-123', 'org-123');

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('requirementsByStatus');
      expect(result.total).toBe(3);
    });

    it('should return 0 score when no applicable requirements', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({ id: 'fw-123' });
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([
        {
          id: 'req-1',
          isCategory: false,
          mappings: [{ control: { implementations: [{ status: 'not_applicable' }] } }],
        },
      ]);

      const result = await service.calculateReadiness('fw-123', 'org-123');

      expect(result.score).toBe(0);
      expect(result.requirementsByStatus.not_applicable).toBe(1);
    });

    it('rejects readiness reads for a framework owned by another organization', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(null);

      await expect(service.calculateReadiness('org-b-framework', 'org-a')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrismaService.frameworkRequirement.findMany).not.toHaveBeenCalled();
    });
  });

  describe('tenant integrity', () => {
    it('keeps global frameworks readable to a tenant', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue({
        id: 'global-framework',
        organizationId: null,
      });

      await expect(service.findOne('global-framework', 'org-a')).resolves.toEqual(
        expect.objectContaining({ id: 'global-framework' })
      );
      expect(mockPrismaService.framework.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ organizationId: null }, { organizationId: 'org-a' }],
          }),
        })
      );
    });

    it('forbids requirement mutations on global or foreign frameworks', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRequirement(
          'global-or-org-b-framework',
          'requirement-1',
          { ownerNotes: 'tamper' },
          'org-a'
        )
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.frameworkRequirement.update).not.toHaveBeenCalled();
    });

    it('rejects foreign framework trees before loading children', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValue(null);

      await expect(service.getRequirementTree('org-b-framework', 'org-a')).rejects.toThrow(
        NotFoundException
      );
      expect(mockPrismaService.frameworkRequirement.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    const mockUsers = [
      { id: 'user-1', displayName: 'Alice', email: 'alice@test.com', role: 'admin' },
      { id: 'user-2', displayName: 'Bob', email: 'bob@test.com', role: 'user' },
    ];

    it('should list active users for an organization', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers('org-123');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', status: 'active' },
        select: { id: true, displayName: true, email: true, role: true },
        orderBy: { displayName: 'asc' },
      });
      expect(result).toEqual(mockUsers);
    });
  });
});
