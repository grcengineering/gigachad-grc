import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MappingHistoryService } from './mapping-history.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MappingHistoryService', () => {
  let service: MappingHistoryService;

  const mockPrisma = {
    controlMapping: {
      findFirst: jest.fn(),
    },
    controlMappingHistory: {
      findMany: jest.fn(),
    },
  };

  const tx = {
    controlMappingHistory: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MappingHistoryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<MappingHistoryService>(MappingHistoryService);
    jest.clearAllMocks();
  });

  describe('record', () => {
    it('writes a history row using the provided transaction client', async () => {
      const snapshot = { frameworkId: 'fw-1', controlId: 'ctl-1', mappingType: 'primary' };

      await service.record(tx as any, 'm-1', 'create', snapshot, 'user-1');

      expect(tx.controlMappingHistory.create).toHaveBeenCalledWith({
        data: {
          mappingId: 'm-1',
          action: 'create',
          snapshot,
          changedBy: 'user-1',
          reason: undefined,
        },
      });
    });

    it('passes through an optional reason', async () => {
      await service.record(tx as any, 'm-1', 'delete', {}, 'user-1', 'cleanup');

      expect(tx.controlMappingHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reason: 'cleanup' }),
        })
      );
    });
  });

  describe('listByMapping', () => {
    it('throws NotFoundException when mapping is in a different org', async () => {
      mockPrisma.controlMapping.findFirst.mockResolvedValue(null);

      await expect(service.listByMapping('m-1', 'org-other')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.controlMappingHistory.findMany).not.toHaveBeenCalled();
    });

    it('checks both control.organizationId and framework.organizationId', async () => {
      mockPrisma.controlMapping.findFirst.mockResolvedValue({ id: 'm-1' });
      mockPrisma.controlMappingHistory.findMany.mockResolvedValue([]);

      await service.listByMapping('m-1', 'org-1');

      expect(mockPrisma.controlMapping.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'm-1',
          OR: [
            { control: { OR: [{ organizationId: 'org-1' }, { organizationId: null }] } },
            { framework: { OR: [{ organizationId: 'org-1' }, { organizationId: null }] } },
          ],
        },
      });
    });

    it('orders by changedAt desc and filters by mappingId', async () => {
      mockPrisma.controlMapping.findFirst.mockResolvedValue({ id: 'm-1' });
      const rows = [
        { id: 'h-2', mappingId: 'm-1', action: 'update', changedAt: new Date('2026-05-17') },
        { id: 'h-1', mappingId: 'm-1', action: 'create', changedAt: new Date('2026-05-16') },
      ];
      mockPrisma.controlMappingHistory.findMany.mockResolvedValue(rows);

      const result = await service.listByMapping('m-1', 'org-1');

      expect(mockPrisma.controlMappingHistory.findMany).toHaveBeenCalledWith({
        where: { mappingId: 'm-1' },
        orderBy: { changedAt: 'desc' },
      });
      expect(result).toEqual(rows);
    });
  });
});
