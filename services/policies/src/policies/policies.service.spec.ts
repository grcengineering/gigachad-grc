import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from './policies.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException } from '@nestjs/common';
import { STORAGE_PROVIDER } from '@gigachad-grc/shared';
import { PolicyStatus } from '@prisma/client';
import { PolicyStatus as PolicyStatusDto } from './dto/policy.dto';

describe('PoliciesService', () => {
  let service: PoliciesService;

  const mockPrismaService = {
    policy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    policyVersion: {
      create: jest.fn(),
    },
    policyStatusHistory: {
      create: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockStorageProvider = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockPolicies = [
      {
        id: 'policy-1',
        title: 'Information Security Policy',
        status: 'published',
        _count: { controlLinks: 5, versions: 2 },
      },
      {
        id: 'policy-2',
        title: 'Data Protection Policy',
        status: 'draft',
        _count: { controlLinks: 3, versions: 1 },
      },
    ];

    it('should return paginated policies', async () => {
      mockPrismaService.policy.findMany.mockResolvedValue(mockPolicies);
      mockPrismaService.policy.count.mockResolvedValue(2);

      const result = await service.findAll('org-123', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.policy.findMany.mockResolvedValue([mockPolicies[1]]);
      mockPrismaService.policy.count.mockResolvedValue(1);

      await service.findAll('org-123', { status: [PolicyStatusDto.DRAFT] });

      expect(mockPrismaService.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-123',
            deletedAt: null,
          }),
        })
      );
    });

    it('should search across multiple fields', async () => {
      mockPrismaService.policy.findMany.mockResolvedValue([mockPolicies[0]]);
      mockPrismaService.policy.count.mockResolvedValue(1);

      await service.findAll('org-123', { search: 'security' });

      expect(mockPrismaService.policy.findMany).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockPrismaService.policy.findMany.mockResolvedValue([]);
      mockPrismaService.policy.count.mockResolvedValue(0);

      const result = await service.findAll('org-123', {});

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findOne', () => {
    const mockPolicy = {
      id: 'policy-123',
      title: 'Test Policy',
      status: 'published',
      owner: { id: 'user-1', displayName: 'John Doe', email: 'john@test.com' },
      controlLinks: [],
      versions: [],
      statusHistory: [],
    };

    it('should return a policy by id', async () => {
      mockPrismaService.policy.findFirst.mockResolvedValue(mockPolicy);

      const result = await service.findOne('policy-123', 'org-123');

      expect(mockPrismaService.policy.findFirst).toHaveBeenCalledWith({
        where: { id: 'policy-123', organizationId: 'org-123', deletedAt: null },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockPolicy);
    });

    it('should throw NotFoundException if policy not found', async () => {
      mockPrismaService.policy.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', 'org-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return policy statistics', async () => {
      mockPrismaService.policy.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // draft
        .mockResolvedValueOnce(1) // in_review
        .mockResolvedValueOnce(3) // approved
        .mockResolvedValueOnce(3) // published
        .mockResolvedValueOnce(1) // retired
        .mockResolvedValueOnce(2); // overdueReview

      const result = await service.getStats('org-123');

      expect(result).toEqual({
        total: 10,
        draft: 2,
        inReview: 1,
        approved: 3,
        published: 3,
        retired: 1,
        overdueReview: 2,
      });
    });

    it('should filter overdue reviews correctly', async () => {
      mockPrismaService.policy.count.mockResolvedValue(0);

      await service.getStats('org-123');

      // Verify the last count call checks for overdue reviews
      expect(mockPrismaService.policy.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          organizationId: 'org-123',
          nextReviewDue: { lt: expect.any(Date) },
          status: { notIn: [PolicyStatus.retired, PolicyStatus.draft] },
          deletedAt: null,
        }),
      });
    });
  });
});
