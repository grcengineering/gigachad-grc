import { Test, TestingModule } from '@nestjs/testing';
import { MappingsService } from './mappings.service';
import { PrismaService } from '../prisma/prisma.service';
import { MappingHistoryService } from './mapping-history.service';
import { AuditService } from '../audit/audit.service';

describe('MappingsService — findGaps', () => {
  let service: MappingsService;

  const mockPrismaService = {
    controlMapping: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    frameworkRequirement: {
      findMany: jest.fn(),
    },
    control: {
      findMany: jest.fn(),
    },
  };

  const mockHistoryService = { record: jest.fn(), listByMapping: jest.fn() };
  const mockAuditService = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MappingHistoryService, useValue: mockHistoryService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MappingsService>(MappingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findGaps', () => {
    const ORG_A = 'org-a';

    describe('no-controls', () => {
      it('queries frameworkRequirement.findMany with tenant OR clause and mappings.none', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([
          {
            id: 'req-1',
            reference: 'CC1.1',
            title: 'Control Environment',
            framework: { id: 'fw-1', name: 'SOC 2' },
          },
        ]);

        const result = await service.findGaps(ORG_A, undefined, 'no-controls');

        expect(mockPrismaService.frameworkRequirement.findMany).toHaveBeenCalledWith({
          where: {
            isCategory: false,
            framework: { OR: [{ organizationId: ORG_A }, { organizationId: null }] },
            mappings: { none: {} },
          },
          include: { framework: { select: { id: true, name: true } } },
          orderBy: [{ framework: { name: 'asc' } }, { reference: 'asc' }],
        });

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          id: 'req:req-1:no-controls',
          type: 'no-controls',
          framework: { id: 'fw-1', name: 'SOC 2' },
          requirement: { id: 'req-1', reference: 'CC1.1', title: 'Control Environment' },
        });
        expect(result[0].summary).toBeTruthy();
      });

      it('excludes private frameworks from another org via OR tenant clause', async () => {
        // The where clause itself enforces this; verify the OR shape limits to org A + global.
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);

        await service.findGaps(ORG_A, undefined, 'no-controls');

        const callArgs = mockPrismaService.frameworkRequirement.findMany.mock.calls[0][0];
        expect(callArgs.where.framework.OR).toEqual([
          { organizationId: ORG_A },
          { organizationId: null },
        ]);
      });

      it('applies frameworkId filter when provided', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);

        await service.findGaps(ORG_A, 'fw-1', 'no-controls');

        const callArgs = mockPrismaService.frameworkRequirement.findMany.mock.calls[0][0];
        expect(callArgs.where.frameworkId).toBe('fw-1');
      });

      it('returns [] (not 404) when no rows match', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);

        const result = await service.findGaps(ORG_A, undefined, 'no-controls');

        expect(result).toEqual([]);
      });
    });

    describe('supporting-only', () => {
      it('queries with AND mappings.some + mappings.none primary', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([
          {
            id: 'req-2',
            reference: 'CC2.1',
            title: 'Communication',
            framework: { id: 'fw-1', name: 'SOC 2' },
          },
        ]);

        const result = await service.findGaps(ORG_A, undefined, 'supporting-only');

        const callArgs = mockPrismaService.frameworkRequirement.findMany.mock.calls[0][0];
        expect(callArgs.where.AND).toEqual([
          { mappings: { some: {} } },
          { mappings: { none: { mappingType: 'primary' } } },
        ]);
        expect(result[0]).toMatchObject({
          id: 'req:req-2:supporting-only',
          type: 'supporting-only',
        });
      });

      it('excludes requirements with a primary mapping (mixed) and includes only-supporting', async () => {
        // The query itself enforces this via mappings.none primary; simulate the engine return.
        // Requirement with primary mapping would be filtered out by Prisma; only-supporting ones come back.
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([
          {
            id: 'req-only-supporting',
            reference: 'CC3.1',
            title: 'Risk Assessment',
            framework: { id: 'fw-1', name: 'SOC 2' },
          },
        ]);

        const result = await service.findGaps(ORG_A, undefined, 'supporting-only');

        expect(result).toHaveLength(1);
        expect(result[0].requirement?.id).toBe('req-only-supporting');
      });

      it('honors frameworkId filter', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);

        await service.findGaps(ORG_A, 'fw-1', 'supporting-only');

        const callArgs = mockPrismaService.frameworkRequirement.findMany.mock.calls[0][0];
        expect(callArgs.where.frameworkId).toBe('fw-1');
      });
    });

    describe('unused-controls', () => {
      it('queries control.findMany with org OR clause and mappings.none', async () => {
        mockPrismaService.control.findMany.mockResolvedValue([
          { id: 'ctrl-1', controlId: 'AC-001', title: 'Access Control Policy' },
        ]);

        const result = await service.findGaps(ORG_A, undefined, 'unused-controls');

        expect(mockPrismaService.control.findMany).toHaveBeenCalledWith({
          where: {
            OR: [{ organizationId: ORG_A }, { organizationId: null }],
            mappings: { none: {} },
          },
          orderBy: { controlId: 'asc' },
        });

        expect(result).toEqual([
          {
            id: 'ctrl:ctrl-1:unused-controls',
            type: 'unused-controls',
            control: { id: 'ctrl-1', controlId: 'AC-001', title: 'Access Control Policy' },
            summary: 'Control is not mapped to any requirement',
          },
        ]);
      });

      it('excludes other orgs via OR tenant filter (does not return another org private control)', async () => {
        mockPrismaService.control.findMany.mockResolvedValue([]);

        await service.findGaps(ORG_A, undefined, 'unused-controls');

        const callArgs = mockPrismaService.control.findMany.mock.calls[0][0];
        expect(callArgs.where.OR).toEqual([{ organizationId: ORG_A }, { organizationId: null }]);
      });

      it('IGNORES frameworkId for unused-controls', async () => {
        mockPrismaService.control.findMany.mockResolvedValue([]);

        await service.findGaps(ORG_A, 'fw-1', 'unused-controls');

        const callArgs = mockPrismaService.control.findMany.mock.calls[0][0];
        expect(callArgs.where).not.toHaveProperty('frameworkId');
      });
    });

    describe('all (type undefined)', () => {
      it('concatenates results in order: no-controls, supporting-only, unused-controls', async () => {
        mockPrismaService.frameworkRequirement.findMany
          .mockResolvedValueOnce([
            {
              id: 'req-nc',
              reference: 'CC1.1',
              title: 'No Controls',
              framework: { id: 'fw-1', name: 'SOC 2' },
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 'req-so',
              reference: 'CC2.1',
              title: 'Supporting Only',
              framework: { id: 'fw-1', name: 'SOC 2' },
            },
          ]);
        mockPrismaService.control.findMany.mockResolvedValue([
          { id: 'ctrl-u', controlId: 'AC-001', title: 'Unused Control' },
        ]);

        const result = await service.findGaps(ORG_A);

        expect(result).toHaveLength(3);
        expect(result[0].type).toBe('no-controls');
        expect(result[1].type).toBe('supporting-only');
        expect(result[2].type).toBe('unused-controls');
      });

      it('returns [] when all three queries are empty', async () => {
        mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([]);
        mockPrismaService.control.findMany.mockResolvedValue([]);

        const result = await service.findGaps(ORG_A);

        expect(result).toEqual([]);
      });
    });
  });
});
