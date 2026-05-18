import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { STORAGE_PROVIDER } from '@gigachad-grc/shared';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MappingHistoryService } from './mapping-history.service';
import { UpdateMappingDto } from './dto/mapping.dto';

describe('MappingsService', () => {
  let service: MappingsService;

  const mockTx = {
    controlMapping: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPrismaService = {
    controlMapping: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    controlMappingHistory: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockHistoryService = {
    record: jest.fn(),
    listByMapping: jest.fn(),
    listByMappingWithUser: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockStorage = {
    upload: jest.fn().mockResolvedValue('imports/mappings/org/path/file'),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
    getMetadata: jest.fn(),
    list: jest.fn(),
    copy: jest.fn(),
  };

  const orgId = 'org-123';
  const userId = 'user-123';

  const baseMapping = {
    id: 'm-1',
    frameworkId: 'fw-1',
    requirementId: 'req-1',
    controlId: 'ctl-1',
    mappingType: 'primary',
    notes: 'initial note',
    createdBy: userId,
    createdAt: new Date('2026-05-17T00:00:00Z'),
    framework: { id: 'fw-1', name: 'SOC 2', type: 'compliance' },
    requirement: { id: 'req-1', reference: 'CC1.1', title: 'Req' },
    control: { id: 'ctl-1', controlId: 'AC-001', title: 'Ctl', category: 'access_control' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MappingHistoryService, useValue: mockHistoryService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<MappingsService>(MappingsService);
    jest.clearAllMocks();

    // Default $transaction wires the callback through with mockTx
    mockPrismaService.$transaction.mockImplementation(
      async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a mapping, writes history inside transaction, and fires audit log', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);
      mockTx.controlMapping.create.mockResolvedValue(baseMapping);

      const result = await service.create(userId, orgId, {
        frameworkId: 'fw-1',
        requirementId: 'req-1',
        controlId: 'ctl-1',
        mappingType: 'primary',
      });

      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.controlMapping.create).toHaveBeenCalled();
      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        baseMapping.id,
        'create',
        expect.objectContaining({ frameworkId: 'fw-1', controlId: 'ctl-1' }),
        userId
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          userId,
          action: 'mapping.created',
          entityType: 'control_mapping',
          entityId: baseMapping.id,
        })
      );
      expect(result).toEqual(baseMapping);
    });

    it('throws ConflictException when mapping already exists', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(userId, orgId, {
          frameworkId: 'fw-1',
          requirementId: 'req-1',
          controlId: 'ctl-1',
        })
      ).rejects.toThrow(ConflictException);

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('rolls back if history.record fails inside the transaction (audit not fired)', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);
      mockTx.controlMapping.create.mockResolvedValue(baseMapping);
      mockHistoryService.record.mockRejectedValueOnce(new Error('history write failed'));

      // Real Prisma surfaces the inner rejection from $transaction; our mock above does the same.
      await expect(
        service.create(userId, orgId, {
          frameworkId: 'fw-1',
          requirementId: 'req-1',
          controlId: 'ctl-1',
        })
      ).rejects.toThrow('history write failed');

      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only mappingType and notes, writes history, and emits audit with before/after', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      const updated = { ...baseMapping, mappingType: 'supporting', notes: 'updated note' };
      mockTx.controlMapping.update.mockResolvedValue(updated);

      const result = await service.update(
        baseMapping.id,
        { mappingType: 'supporting', notes: 'updated note' },
        userId,
        orgId
      );

      expect(mockTx.controlMapping.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseMapping.id },
          data: { mappingType: 'supporting', notes: 'updated note' },
        })
      );
      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        updated.id,
        'update',
        expect.objectContaining({ mappingType: 'supporting', notes: 'updated note' }),
        userId
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mapping.updated',
          changes: {
            before: { mappingType: 'primary', notes: 'initial note' },
            after: { mappingType: 'supporting', notes: 'updated note' },
          },
        })
      );
      expect(result).toEqual(updated);
    });

    it('throws NotFoundException on cross-org access (tenant isolation)', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);

      await expect(service.update('m-1', { notes: 'x' }, userId, orgId)).rejects.toThrow(
        NotFoundException
      );

      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('uses OR-on-both control and framework org checks', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockTx.controlMapping.update.mockResolvedValue(baseMapping);

      await service.update('m-1', { notes: 'y' }, userId, orgId);

      expect(mockPrismaService.controlMapping.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'm-1',
            OR: [
              { control: { OR: [{ organizationId: orgId }, { organizationId: null }] } },
              { framework: { OR: [{ organizationId: orgId }, { organizationId: null }] } },
            ],
          }),
        })
      );
    });
  });

  describe('delete', () => {
    it('records history before delete and fires audit log', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockTx.controlMapping.delete.mockResolvedValue(baseMapping);

      const result = await service.delete(baseMapping.id, userId, orgId);

      // history.record called before delete within the transaction
      const recordOrder = mockHistoryService.record.mock.invocationCallOrder[0];
      const deleteOrder = mockTx.controlMapping.delete.mock.invocationCallOrder[0];
      expect(recordOrder).toBeLessThan(deleteOrder);

      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        baseMapping.id,
        'delete',
        expect.objectContaining({ controlId: 'ctl-1' }),
        userId
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'mapping.deleted' })
      );
      expect(result).toEqual({ success: true });
    });

    it('throws NotFoundException on tenant mismatch', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);

      await expect(service.delete('m-1', userId, orgId)).rejects.toThrow(NotFoundException);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('delegates to history.listByMappingWithUser and returns its result', async () => {
      const rows = [{ id: 'h-1', mappingId: 'm-1', action: 'create' }];
      mockHistoryService.listByMappingWithUser.mockResolvedValue(rows);

      const result = await service.getHistory('m-1', orgId);

      expect(mockHistoryService.listByMappingWithUser).toHaveBeenCalledWith('m-1', orgId);
      expect(result).toBe(rows);
    });

    it('propagates NotFoundException from history service (tenant mismatch surfaces as 404)', async () => {
      mockHistoryService.listByMappingWithUser.mockRejectedValue(
        new NotFoundException('Mapping with ID m-1 not found')
      );

      await expect(service.getHistory('m-1', 'org-other')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    const historyId = 'h-9';
    const historyRow = {
      id: historyId,
      mappingId: baseMapping.id,
      action: 'update',
      snapshot: {
        frameworkId: 'fw-1',
        requirementId: 'req-1',
        controlId: 'ctl-1',
        mappingType: 'supporting',
        notes: 'snapshot note',
        createdBy: userId,
        createdAt: '2026-05-15T00:00:00Z',
      },
      changedBy: userId,
      changedAt: new Date('2026-05-15T00:00:00Z'),
      reason: null,
    };

    it('restores mappingType + notes from snapshot, writes history row with action=restore and reason, and fires audit log', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockPrismaService.controlMappingHistory.findFirst.mockResolvedValue(historyRow);
      const restored = {
        ...baseMapping,
        mappingType: 'supporting',
        notes: 'snapshot note',
      };
      mockTx.controlMapping.update.mockResolvedValue(restored);

      const result = await service.restore(
        baseMapping.id,
        historyId,
        { reason: 'reverting bad edit' },
        userId,
        orgId
      );

      // Live row is updated to the snapshot values
      expect(mockTx.controlMapping.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseMapping.id },
          data: { mappingType: 'supporting', notes: 'snapshot note' },
        })
      );

      // A new history row is written with action='restore' and the reason
      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        restored.id,
        'restore',
        expect.objectContaining({ mappingType: 'supporting', notes: 'snapshot note' }),
        userId,
        'reverting bad edit'
      );

      // Audit log fires AFTER the transaction with mapping.restored verb + metadata
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          userId,
          action: 'mapping.restored',
          entityType: 'control_mapping',
          entityId: restored.id,
          changes: {
            before: { mappingType: 'primary', notes: 'initial note' },
            after: { mappingType: 'supporting', notes: 'snapshot note' },
          },
          metadata: { historyId, reason: 'reverting bad edit' },
        })
      );

      expect(result).toEqual(restored);
    });

    it('throws NotFoundException on tenant mismatch on mapping (404)', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);

      await expect(
        service.restore(baseMapping.id, historyId, {}, userId, 'org-other')
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.controlMappingHistory.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when historyId does not belong to mapping (404)', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockPrismaService.controlMappingHistory.findFirst.mockResolvedValue(null);

      await expect(
        service.restore(baseMapping.id, 'h-other-mapping', {}, userId, orgId)
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.controlMappingHistory.findFirst).toHaveBeenCalledWith({
        where: { id: 'h-other-mapping', mappingId: baseMapping.id },
      });
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('still records a history row when restore is a no-op (snapshot equals current state)', async () => {
      const noopHistory = {
        ...historyRow,
        snapshot: {
          ...historyRow.snapshot,
          mappingType: baseMapping.mappingType,
          notes: baseMapping.notes,
        },
      };
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockPrismaService.controlMappingHistory.findFirst.mockResolvedValue(noopHistory);
      mockTx.controlMapping.update.mockResolvedValue(baseMapping);

      await service.restore(baseMapping.id, historyId, { reason: 'audit drill' }, userId, orgId);

      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        baseMapping.id,
        'restore',
        expect.any(Object),
        userId,
        'audit drill'
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'mapping.restored' })
      );
    });

    it('passes reason=null in metadata when omitted from the DTO', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockPrismaService.controlMappingHistory.findFirst.mockResolvedValue(historyRow);
      mockTx.controlMapping.update.mockResolvedValue(baseMapping);

      await service.restore(baseMapping.id, historyId, {}, userId, orgId);

      expect(mockHistoryService.record).toHaveBeenCalledWith(
        mockTx,
        baseMapping.id,
        'restore',
        expect.any(Object),
        userId,
        undefined
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { historyId, reason: null },
        })
      );
    });

    it('uses OR-on-both control and framework org checks for tenant isolation', async () => {
      mockPrismaService.controlMapping.findFirst.mockResolvedValue(baseMapping);
      mockPrismaService.controlMappingHistory.findFirst.mockResolvedValue(historyRow);
      mockTx.controlMapping.update.mockResolvedValue(baseMapping);

      await service.restore(baseMapping.id, historyId, {}, userId, orgId);

      expect(mockPrismaService.controlMapping.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: baseMapping.id,
            OR: [
              { control: { OR: [{ organizationId: orgId }, { organizationId: null }] } },
              { framework: { OR: [{ organizationId: orgId }, { organizationId: null }] } },
            ],
          }),
        })
      );
    });
  });

  describe('bulkCreate', () => {
    it('writes history + audit per successful row and reports failures', async () => {
      mockPrismaService.controlMapping.findFirst
        .mockResolvedValueOnce(null) // first row: no conflict
        .mockResolvedValueOnce({ id: 'dup' }); // second row: conflict
      mockTx.controlMapping.create.mockResolvedValue(baseMapping);

      const results = await service.bulkCreate(userId, orgId, [
        { frameworkId: 'fw-1', requirementId: 'req-1', controlId: 'ctl-1' },
        { frameworkId: 'fw-1', requirementId: 'req-1', controlId: 'ctl-1' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(mockHistoryService.record).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'mapping.bulk_created' })
      );
    });
  });
});

describe('MappingsController (role + validation metadata)', () => {
  let controller: MappingsController;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MappingsController],
      providers: [Reflector, { provide: MappingsService, useValue: {} }],
    }).compile();

    controller = module.get<MappingsController>(MappingsController);
    reflector = module.get<Reflector>(Reflector);
  });

  it('restricts PATCH /:id to admin and compliance_manager (would 403 others via RolesGuard)', () => {
    const roles = reflector.get<string[]>('roles', controller.update);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager']));
  });

  it('restricts POST / to admin and compliance_manager', () => {
    const roles = reflector.get<string[]>('roles', controller.create);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager']));
  });

  it('restricts DELETE /:id to admin and compliance_manager', () => {
    const roles = reflector.get<string[]>('roles', controller.delete);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager']));
  });

  it('allows GET /:id/history for admin, compliance_manager, and auditor', () => {
    const roles = reflector.get<string[]>('roles', controller.history);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager', 'auditor']));
    expect(roles).not.toContain('viewer');
  });

  it('restricts POST /:id/restore/:historyId to admin and compliance_manager', () => {
    const roles = reflector.get<string[]>('roles', controller.restore);
    expect(roles).toEqual(expect.arrayContaining(['admin', 'compliance_manager']));
    expect(roles).not.toContain('auditor');
    expect(roles).not.toContain('viewer');
  });
});

describe('UpdateMappingDto validation', () => {
  // Mirrors the global ValidationPipe in main.ts: whitelist + transform + forbidNonWhitelisted.
  // Uses class-validator/class-transformer directly to avoid pulling in the Nest validation
  // pipe at unit-test time.
  it('accepts a valid payload', async () => {
    const dto = plainToInstance(UpdateMappingDto, { mappingType: 'primary', notes: 'ok' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors).toHaveLength(0);
  });

  it('rejects unknown fields (would 400 via forbidNonWhitelisted)', async () => {
    const dto = plainToInstance(UpdateMappingDto, {
      mappingType: 'primary',
      frameworkId: 'fw-1',
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('frameworkId');
  });

  it('rejects invalid mappingType enum (would 400)', async () => {
    const dto = plainToInstance(UpdateMappingDto, { mappingType: 'tangential' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('mappingType');
  });
});
