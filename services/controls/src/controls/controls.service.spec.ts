import { Test, TestingModule } from '@nestjs/testing';
import { ControlsService } from './controls.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ControlCategory, ControlFilterDto, CreateControlDto } from './dto/control.dto';

describe('ControlsService', () => {
  let service: ControlsService;

  const mockPrismaService = {
    control: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    controlImplementation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    controlEvidence: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    controlRequirement: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<ControlsService>(ControlsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const defaultFilters: ControlFilterDto = {};

    it('should return controls for an organization', async () => {
      const mockControls = [
        { 
          id: '1', 
          controlId: 'AC-001', 
          title: 'Control 1', 
          implementations: [],
          mappings: [],
          _count: { evidenceLinks: 0, policyLinks: 0 },
        },
        { 
          id: '2', 
          controlId: 'AC-002', 
          title: 'Control 2', 
          implementations: [],
          mappings: [],
          _count: { evidenceLinks: 0, policyLinks: 0 },
        },
      ];

      mockPrismaService.control.findMany.mockResolvedValue(mockControls);
      mockPrismaService.control.count.mockResolvedValue(2);

      const result = await service.findAll('org-1', defaultFilters);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(mockPrismaService.control.findMany).toHaveBeenCalled();
    });

    it('should filter controls by status', async () => {
      const filters: ControlFilterDto = { status: 'implemented' };
      mockPrismaService.control.findMany.mockResolvedValue([]);
      mockPrismaService.control.count.mockResolvedValue(0);

      await service.findAll('org-1', filters);

      expect(mockPrismaService.control.findMany).toHaveBeenCalled();
    });

    it('should filter controls by category', async () => {
      const filters: ControlFilterDto = { category: [ControlCategory.ACCESS_CONTROL] };
      mockPrismaService.control.findMany.mockResolvedValue([]);
      mockPrismaService.control.count.mockResolvedValue(0);

      await service.findAll('org-1', filters);

      expect(mockPrismaService.control.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                category: { in: [ControlCategory.ACCESS_CONTROL] },
              }),
            ]),
          }),
        }),
      );
    });

    it('should search controls by title', async () => {
      const filters: ControlFilterDto = { search: 'password' };
      mockPrismaService.control.findMany.mockResolvedValue([]);
      mockPrismaService.control.count.mockResolvedValue(0);

      await service.findAll('org-1', filters);

      expect(mockPrismaService.control.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a control by ID', async () => {
      const mockControl = {
        id: '1',
        controlId: 'AC-001',
        title: 'Control 1',
        organizationId: null,
        implementations: [{ status: 'not_started' }],
      };

      mockPrismaService.control.findFirst.mockResolvedValue(mockControl);

      const result = await service.findOne('1', 'org-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.control.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException when control not found', async () => {
      mockPrismaService.control.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-1')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new control', async () => {
      const createDto: CreateControlDto = {
        controlId: 'AC-NEW',
        title: 'New Control',
        description: 'Test control description',
        category: ControlCategory.ACCESS_CONTROL,
      };

      const mockCreatedControl = {
        id: 'new-id',
        ...createDto,
        organizationId: 'org-1',
        isCustom: true,
        createdAt: new Date(),
      };

      mockPrismaService.control.findFirst.mockResolvedValue(null); // No duplicate
      mockPrismaService.control.create.mockResolvedValue(mockCreatedControl);

      const result = await service.create('org-1', 'user-1', createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.control.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing control', async () => {
      const existingControl = {
        id: '1',
        controlId: 'AC-001',
        title: 'Control 1',
        organizationId: 'org-1',
        isCustom: true,
        implementations: [{ status: 'not_started' }],
      };

      const updateDto: import('./dto/control.dto').UpdateControlDto = { title: 'Updated Control' };

      const updatedControl = { ...existingControl, title: 'Updated Control' };

      mockPrismaService.control.findFirst.mockResolvedValue(existingControl);
      mockPrismaService.control.update.mockResolvedValue(updatedControl);

      const result = await service.update('1', 'org-1', updateDto, 'user-1');

      expect(result.title).toBe('Updated Control');
    });
  });

  describe('delete', () => {
    it('should soft delete a control', async () => {
      const existingControl = {
        id: '1',
        controlId: 'AC-001',
        title: 'Control 1',
        organizationId: 'org-1',
        isCustom: true,
        implementations: [{ status: 'not_started' }],
      };

      mockPrismaService.control.findFirst.mockResolvedValue(existingControl);
      mockPrismaService.control.update.mockResolvedValue({
        ...existingControl,
        deletedAt: new Date(),
      });

      await service.delete('1', 'org-1', 'user-1');

      expect(mockPrismaService.control.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw when trying to delete non-existent control', async () => {
      mockPrismaService.control.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'org-1', 'user-1')).rejects.toThrow();
    });
  });
});
