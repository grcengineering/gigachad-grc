import { Test, TestingModule } from '@nestjs/testing';
import { AuditsService } from './audits.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditsService', () => {
  let service: AuditsService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    audit: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditFinding: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditsService>(AuditsService);
    _prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const mockCreateDto = {
      name: 'Q1 SOC 2 Audit',
      title: 'Q1 SOC 2 Audit',
      auditType: 'soc2',
      description: 'Annual SOC 2 Type II audit',
      isExternal: true,
      organizationId: 'org-123',
    };

    const mockCreatedAudit = {
      id: 'audit-123',
      auditId: 'AUD-001',
      ...mockCreateDto,
      status: 'planning',
      portalAccessCode: 'ABC123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create an audit with auto-generated auditId', async () => {
      mockPrismaService.audit.count.mockResolvedValue(0);
      mockPrismaService.audit.create.mockResolvedValue(mockCreatedAudit);

      const result = await service.create(mockCreateDto, 'user-123');

      expect(mockPrismaService.audit.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
      });
      expect(mockPrismaService.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Q1 SOC 2 Audit',
            auditId: 'AUD-001',
            organizationId: 'org-123',
          }),
        })
      );
      expect(result).toEqual(mockCreatedAudit);
    });

    it('should use provided auditId if specified', async () => {
      const dtoWithAuditId = { ...mockCreateDto, auditId: 'CUSTOM-001' };
      mockPrismaService.audit.count.mockResolvedValue(5);
      mockPrismaService.audit.create.mockResolvedValue({
        ...mockCreatedAudit,
        auditId: 'CUSTOM-001',
      });

      await service.create(dtoWithAuditId, 'user-123');

      expect(mockPrismaService.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            auditId: 'CUSTOM-001',
          }),
        })
      );
    });

    it('should generate portal access code for external audits', async () => {
      mockPrismaService.audit.count.mockResolvedValue(0);
      mockPrismaService.audit.create.mockResolvedValue(mockCreatedAudit);

      await service.create({ ...mockCreateDto, isExternal: true }, 'user-123');

      expect(mockPrismaService.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            portalAccessCode: expect.any(String),
          }),
        })
      );
    });

    it('should not generate portal access code for internal audits', async () => {
      mockPrismaService.audit.count.mockResolvedValue(0);
      mockPrismaService.audit.create.mockResolvedValue({
        ...mockCreatedAudit,
        portalAccessCode: null,
      });

      await service.create({ ...mockCreateDto, isExternal: false }, 'user-123');

      expect(mockPrismaService.audit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            portalAccessCode: null,
          }),
        })
      );
    });
  });

  describe('findAll', () => {
    const mockAudits = [
      {
        id: 'audit-1',
        auditId: 'AUD-001',
        title: 'Audit 1',
        status: 'planning',
        _count: { requests: 5, findings: 2, evidence: 10, testResults: 8 },
      },
      {
        id: 'audit-2',
        auditId: 'AUD-002',
        title: 'Audit 2',
        status: 'in_progress',
        _count: { requests: 10, findings: 5, evidence: 20, testResults: 15 },
      },
    ];

    it('should return all audits for an organization', async () => {
      mockPrismaService.audit.findMany.mockResolvedValue(mockAudits);

      const result = await service.findAll('org-123');

      expect(mockPrismaService.audit.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockAudits);
    });

    it('should filter by status', async () => {
      mockPrismaService.audit.findMany.mockResolvedValue([mockAudits[0]]);

      await service.findAll('org-123', { status: 'planning' });

      expect(mockPrismaService.audit.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, status: 'planning' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by audit type', async () => {
      mockPrismaService.audit.findMany.mockResolvedValue([]);

      await service.findAll('org-123', { auditType: 'soc2' });

      expect(mockPrismaService.audit.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, auditType: 'soc2' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by isExternal', async () => {
      mockPrismaService.audit.findMany.mockResolvedValue([]);

      await service.findAll('org-123', { isExternal: true });

      expect(mockPrismaService.audit.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123', deletedAt: null, isExternal: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    const mockAudit = {
      id: 'audit-123',
      auditId: 'AUD-001',
      title: 'Test Audit',
      requests: [],
      findings: [],
      evidence: [],
      testResults: [],
      meetings: [],
      activities: [],
    };

    it('should return a single audit with related data', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue(mockAudit);

      const result = await service.findOne('audit-123', 'org-123');

      expect(mockPrismaService.audit.findFirst).toHaveBeenCalledWith({
        where: { id: 'audit-123', organizationId: 'org-123', deletedAt: null },
        include: expect.objectContaining({
          requests: expect.any(Object),
          findings: true,
          evidence: true,
          testResults: true,
          meetings: true,
          activities: expect.any(Object),
        }),
      });
      expect(result).toEqual(mockAudit);
    });

    it('should return null if audit not found', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue(null);

      const result = await service.findOne('nonexistent', 'org-123');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const mockUpdateDto = {
      title: 'Updated Audit Title',
      status: 'in_progress',
    };

    const mockUpdatedAudit = {
      id: 'audit-123',
      ...mockUpdateDto,
    };

    it('should update an audit', async () => {
      mockPrismaService.audit.findFirst.mockResolvedValue({ id: 'audit-123', organizationId: 'org-123' });
      mockPrismaService.audit.update.mockResolvedValue(mockUpdatedAudit);

      const result = await service.update('audit-123', 'org-123', mockUpdateDto);

      expect(mockPrismaService.audit.update).toHaveBeenCalledWith({
        where: { id: 'audit-123' },
        data: expect.objectContaining({
          title: 'Updated Audit Title',
          status: 'in_progress',
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockUpdatedAudit);
    });

    it('should calculate finding counts when status changes to completed', async () => {
      const completedDto = { status: 'completed' };
      mockPrismaService.audit.findFirst.mockResolvedValue({ id: 'audit-123', organizationId: 'org-123' });
      mockPrismaService.auditFinding.groupBy.mockResolvedValue([
        { severity: 'critical', _count: { severity: 1 } },
        { severity: 'high', _count: { severity: 2 } },
        { severity: 'medium', _count: { severity: 3 } },
        { severity: 'low', _count: { severity: 4 } },
      ]);
      mockPrismaService.audit.update.mockResolvedValue({
        id: 'audit-123',
        status: 'completed',
        findingsCount: 10,
        criticalFindings: 1,
        highFindings: 2,
        mediumFindings: 3,
        lowFindings: 4,
      });

      await service.update('audit-123', 'org-123', completedDto);

      expect(mockPrismaService.auditFinding.groupBy).toHaveBeenCalledWith({
        by: ['severity'],
        where: { auditId: 'audit-123' },
        _count: { severity: true },
      });
      expect(mockPrismaService.audit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            findingsCount: 10,
            criticalFindings: 1,
            highFindings: 2,
            mediumFindings: 3,
            lowFindings: 4,
            actualEndDate: expect.any(Date),
          }),
        })
      );
    });

    it('should convert date strings to Date objects', async () => {
      const dtoWithDates = {
        plannedStartDate: '2024-01-01',
        plannedEndDate: '2024-03-31',
      };
      mockPrismaService.audit.findFirst.mockResolvedValue({ id: 'audit-123', organizationId: 'org-123' });
      mockPrismaService.audit.update.mockResolvedValue(mockUpdatedAudit);

      await service.update('audit-123', 'org-123', dtoWithDates);

      expect(mockPrismaService.audit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plannedStartDate: expect.any(Date),
            plannedEndDate: expect.any(Date),
          }),
        })
      );
    });
  });
});
