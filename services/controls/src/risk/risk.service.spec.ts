import { Test, TestingModule } from '@nestjs/testing';
import { RiskService } from './risk.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RiskWorkflowTasksService } from './risk-workflow-tasks.service';
import { 
  RiskFilterDto, 
  CreateRiskDto, 
  UpdateRiskDto,
  LinkControlDto,
  RiskCategory,
  RiskSource,
  InitialSeverity,
} from './dto/risk.dto';
import { CacheService } from '@gigachad-grc/shared';

describe('RiskService', () => {
  let service: RiskService;

  const mockPrismaService = {
    risk: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    riskControl: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    riskAssessment: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    riskTreatment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    riskHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    control: {
      findFirst: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
    logCreate: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRiskWorkflowTasksService = {
    createTasks: jest.fn(),
    getTasksForRisk: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: RiskWorkflowTasksService,
          useValue: mockRiskWorkflowTasksService,
        },
      ],
    }).compile();

    service = module.get<RiskService>(RiskService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const defaultFilters: RiskFilterDto = {};

    it('should return risks for an organization', async () => {
      const mockRisks = [
        { id: '1', title: 'Risk 1', inherentRiskLevel: 'high', organizationId: 'org-1', assessment: null, treatment: null, _count: { assets: 0, controls: 0, scenarios: 0 } },
        { id: '2', title: 'Risk 2', inherentRiskLevel: 'medium', organizationId: 'org-1', assessment: null, treatment: null, _count: { assets: 0, controls: 0, scenarios: 0 } },
      ];

      mockPrismaService.risk.findMany.mockResolvedValue(mockRisks);
      mockPrismaService.risk.count.mockResolvedValue(2);

      const result = await service.findAll('org-1', defaultFilters);

      expect(result).toBeDefined();
      expect(mockPrismaService.risk.findMany).toHaveBeenCalled();
    });

    it('should filter risks by status', async () => {
      const filters: RiskFilterDto = { status: 'risk_identified' };
      mockPrismaService.risk.findMany.mockResolvedValue([]);
      mockPrismaService.risk.count.mockResolvedValue(0);

      await service.findAll('org-1', filters);

      expect(mockPrismaService.risk.findMany).toHaveBeenCalled();
    });

    it('should filter risks by category', async () => {
      const filters: RiskFilterDto = { category: RiskCategory.OPERATIONAL };
      mockPrismaService.risk.findMany.mockResolvedValue([]);
      mockPrismaService.risk.count.mockResolvedValue(0);

      await service.findAll('org-1', filters);

      expect(mockPrismaService.risk.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a risk with full details', async () => {
      const mockRisk = {
        id: '1',
        title: 'Risk 1',
        inherentRiskLevel: 'high',
        organizationId: 'org-1',
        controls: [],
        treatment: null,
        assessment: null,
        assets: [],
        scenarios: [],
        history: [],
        reporter: null,
        owner: null,
        grcSme: null,
        riskAssessor: null,
        executiveApprover: null,
      };

      mockPrismaService.risk.findFirst.mockResolvedValue(mockRisk);

      const result = await service.findOne('1', 'org-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.risk.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException when risk not found', async () => {
      mockPrismaService.risk.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-1')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a new risk', async () => {
      const createDto: CreateRiskDto = {
        title: 'New Risk',
        description: 'Test risk description',
        source: RiskSource.EMPLOYEE_REPORTING,
        initialSeverity: InitialSeverity.MEDIUM,
      };

      const mockCreatedRisk = {
        id: 'new-id',
        riskId: 'RISK-0001',
        title: createDto.title,
        description: createDto.description,
        organizationId: 'org-1',
        createdAt: new Date(),
        assessment: null,
        treatment: null,
        _count: { assets: 0, controls: 0, scenarios: 0 },
      };

      mockPrismaService.risk.count.mockResolvedValue(0);
      mockPrismaService.risk.create.mockResolvedValue(mockCreatedRisk);
      mockPrismaService.riskHistory.create.mockResolvedValue({});

      const result = await service.create('org-1', createDto, 'user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.risk.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing risk', async () => {
      const existingRisk = {
        id: '1',
        title: 'Risk 1',
        organizationId: 'org-1',
      };

      const updateDto: UpdateRiskDto = { title: 'Updated Risk' };

      mockPrismaService.risk.findFirst.mockResolvedValue(existingRisk);
      mockPrismaService.risk.update.mockResolvedValue({
        ...existingRisk,
        ...updateDto,
        assessment: null,
        treatment: null,
        _count: { assets: 0, controls: 0, scenarios: 0 },
      });
      mockPrismaService.riskHistory.create.mockResolvedValue({});

      const result = await service.update('1', 'org-1', updateDto, 'user-1');

      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should soft delete a risk', async () => {
      const existingRisk = {
        id: '1',
        title: 'Risk 1',
        organizationId: 'org-1',
      };

      mockPrismaService.risk.findFirst.mockResolvedValue(existingRisk);
      mockPrismaService.risk.update.mockResolvedValue({
        ...existingRisk,
        deletedAt: new Date(),
      });
      mockPrismaService.riskHistory.create.mockResolvedValue({});

      await service.delete('1', 'org-1', 'user-1');

      expect(mockPrismaService.risk.update).toHaveBeenCalled();
    });
  });

  describe('linkControl', () => {
    it('should link a control to a risk', async () => {
      const existingRisk = { id: 'risk-1', organizationId: 'org-1' };
      const existingControl = { id: 'control-1' };
      const dto: LinkControlDto = { controlId: 'control-1' };

      mockPrismaService.risk.findFirst.mockResolvedValue(existingRisk);
      mockPrismaService.control.findFirst.mockResolvedValue(existingControl);
      mockPrismaService.riskControl.findUnique.mockResolvedValue(null);
      mockPrismaService.riskControl.create.mockResolvedValue({
        riskId: 'risk-1',
        controlId: 'control-1',
      });
      mockPrismaService.riskHistory.create.mockResolvedValue({});

      await service.linkControl('risk-1', 'org-1', dto, 'user-1');

      expect(mockPrismaService.riskControl.create).toHaveBeenCalled();
    });
  });
});
