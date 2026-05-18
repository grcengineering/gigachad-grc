import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { STORAGE_PROVIDER } from '@gigachad-grc/shared';
import { MappingsService } from './mappings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MappingHistoryService } from './mapping-history.service';

const ORG_ID = 'org-123';
const USER_ID = 'user-123';
const FW_ID = 'fw-soc2';

const SOC2 = { id: FW_ID, type: 'soc2', version: '2017' };

function makeMapping(
  requirementRef: string,
  controlCode: string,
  type: 'primary' | 'supporting' = 'primary',
  notes: string | null = null,
  order = 0
) {
  return {
    id: `m-${requirementRef}-${controlCode}`,
    frameworkId: FW_ID,
    mappingType: type,
    notes,
    framework: { type: 'soc2', version: '2017' },
    requirement: { reference: requirementRef, order },
    control: { controlId: controlCode },
  };
}

describe('MappingsService.exportFile', () => {
  let service: MappingsService;

  const mockPrismaService = {
    framework: { findFirst: jest.fn() },
    controlMapping: { findMany: jest.fn() },
  };
  const mockHistoryService = { record: jest.fn() };
  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };
  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getSignedUrl: jest.fn(),
    getMetadata: jest.fn(),
    list: jest.fn(),
    copy: jest.fn(),
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

    mockPrismaService.framework.findFirst.mockResolvedValue(SOC2);
    mockPrismaService.controlMapping.findMany.mockResolvedValue([
      makeMapping('CC1.1', 'AC-001', 'primary', 'first', 1),
      makeMapping('CC2.1', 'AC-002', 'supporting', null, 2),
    ]);
  });

  describe('CSV format', () => {
    it('returns CSV buffer with header row and one row per mapping', async () => {
      const result = await service.exportFile(FW_ID, 'csv', ORG_ID, USER_ID);

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.fileName).toMatch(/^mappings-soc2-2017-\d{4}-\d{2}-\d{2}\.csv$/);

      const text = result.buffer.toString('utf-8');
      const lines = text.trim().split('\r\n');
      expect(lines[0]).toBe('framework_code,requirement_ref,control_code,mapping_type,notes');
      expect(lines).toHaveLength(3);
      expect(lines[1]).toBe('soc2:2017,CC1.1,AC-001,primary,first');
      expect(lines[2]).toBe('soc2:2017,CC2.1,AC-002,supporting,');
    });

    it('escapes CSV cells containing commas, quotes, and newlines (RFC-4180)', async () => {
      mockPrismaService.controlMapping.findMany.mockResolvedValueOnce([
        makeMapping('CC1.1', 'AC-001', 'primary', 'has, comma and "quote"', 1),
        makeMapping('CC1.2', 'AC-002', 'primary', 'line1\nline2', 2),
      ]);

      const result = await service.exportFile(FW_ID, 'csv', ORG_ID, USER_ID);
      const text = result.buffer.toString('utf-8');

      expect(text).toContain('"has, comma and ""quote"""');
      expect(text).toContain('"line1\nline2"');
    });
  });

  describe('XLSX format', () => {
    it('returns an XLSX workbook with one worksheet "Mappings" and matching header+rows', async () => {
      const result = await service.exportFile(FW_ID, 'xlsx', ORG_ID, USER_ID);

      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(result.fileName).toMatch(/^mappings-soc2-2017-\d{4}-\d{2}-\d{2}\.xlsx$/);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer as unknown as ArrayBuffer);
      const sheet = workbook.getWorksheet('Mappings');
      expect(sheet).toBeDefined();

      const header = sheet!.getRow(1).values as unknown[];
      // exceljs values arrays are 1-indexed (index 0 is null/empty)
      expect(header.slice(1)).toEqual([
        'framework_code',
        'requirement_ref',
        'control_code',
        'mapping_type',
        'notes',
      ]);

      const row2 = sheet!.getRow(2).values as unknown[];
      expect(row2.slice(1, 6)).toEqual(['soc2:2017', 'CC1.1', 'AC-001', 'primary', 'first']);

      const row3 = sheet!.getRow(3).values as unknown[];
      // notes is null in DB → exceljs serializes the cell as empty
      expect(row3.slice(1, 5)).toEqual(['soc2:2017', 'CC2.1', 'AC-002', 'supporting']);
    });
  });

  describe('framework filter', () => {
    it('queries findMany scoped to the requested frameworkId only', async () => {
      await service.exportFile(FW_ID, 'csv', ORG_ID, USER_ID);

      expect(mockPrismaService.controlMapping.findMany).toHaveBeenCalledTimes(1);
      const call = mockPrismaService.controlMapping.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ frameworkId: FW_ID });
    });

    it('scopes framework lookup to caller org + system (organizationId null)', async () => {
      await service.exportFile(FW_ID, 'csv', ORG_ID, USER_ID);

      const call = mockPrismaService.framework.findFirst.mock.calls[0][0];
      expect(call.where.id).toBe(FW_ID);
      expect(call.where.OR).toEqual([{ organizationId: ORG_ID }, { organizationId: null }]);
    });
  });

  describe('empty result', () => {
    it('returns CSV with only the header row when no mappings exist', async () => {
      mockPrismaService.controlMapping.findMany.mockResolvedValueOnce([]);

      const result = await service.exportFile(FW_ID, 'csv', ORG_ID, USER_ID);
      const text = result.buffer.toString('utf-8');

      expect(text.trim()).toBe('framework_code,requirement_ref,control_code,mapping_type,notes');
      // Still records an audit log noting zero rows
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'mapping.exported',
          metadata: expect.objectContaining({ rowCount: 0, format: 'csv' }),
        })
      );
    });

    it('returns XLSX with only header row when no mappings exist', async () => {
      mockPrismaService.controlMapping.findMany.mockResolvedValueOnce([]);

      const result = await service.exportFile(FW_ID, 'xlsx', ORG_ID, USER_ID);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer as unknown as ArrayBuffer);
      const sheet = workbook.getWorksheet('Mappings');
      expect(sheet).toBeDefined();
      // rowCount counts the header
      expect(sheet!.rowCount).toBe(1);
    });
  });

  describe('missing framework', () => {
    it('throws NotFoundException when framework does not exist in caller org or system', async () => {
      mockPrismaService.framework.findFirst.mockResolvedValueOnce(null);

      await expect(service.exportFile('fw-unknown', 'csv', ORG_ID, USER_ID)).rejects.toBeInstanceOf(
        NotFoundException
      );

      expect(mockPrismaService.controlMapping.findMany).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for cross-tenant framework (no disclosure)', async () => {
      // Caller is ORG_ID but framework belongs to a different org → findFirst returns null
      mockPrismaService.framework.findFirst.mockResolvedValueOnce(null);

      await expect(service.exportFile(FW_ID, 'xlsx', ORG_ID, USER_ID)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe('audit log', () => {
    it('writes a mapping.exported audit log on success', async () => {
      await service.exportFile(FW_ID, 'xlsx', ORG_ID, USER_ID);

      expect(mockAuditService.log).toHaveBeenCalledTimes(1);
      const params = mockAuditService.log.mock.calls[0][0];
      expect(params.action).toBe('mapping.exported');
      expect(params.entityType).toBe('control_mapping');
      expect(params.entityId).toBe(FW_ID);
      expect(params.organizationId).toBe(ORG_ID);
      expect(params.userId).toBe(USER_ID);
      expect(params.metadata).toMatchObject({
        frameworkId: FW_ID,
        format: 'xlsx',
        rowCount: 2,
      });
    });
  });
});
