import * as fs from 'fs';
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { STORAGE_PROVIDER } from '@gigachad-grc/shared';
import { MappingsService } from './mappings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MappingHistoryService } from './mapping-history.service';
import {
  MAPPING_IMPORT_MIME_ALLOWLIST,
  mappingImportFileFilter,
  MAPPING_IMPORT_MAX_BYTES,
} from './mappings.controller';
import { parseMappingCsv, parseMappingXlsx } from './import-parser';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__', 'imports');

const ORG_ID = 'org-123';
const USER_ID = 'user-123';

// Catalog the fixture-aware lookup data so each test can reuse it.
const SYSTEM_FRAMEWORK = {
  id: 'fw-soc2',
  type: 'soc2',
  version: '2017',
};
const REQ_CC11 = { id: 'req-cc11', frameworkId: SYSTEM_FRAMEWORK.id, reference: 'CC1.1' };
const REQ_CC21 = { id: 'req-cc21', frameworkId: SYSTEM_FRAMEWORK.id, reference: 'CC2.1' };
const CTL_AC001 = { id: 'ctl-ac001', controlId: 'AC-001' };
const CTL_AC002 = { id: 'ctl-ac002', controlId: 'AC-002' };

function loadFixture(name: string): Buffer {
  return fs.readFileSync(path.join(FIXTURE_DIR, name));
}

function mimeFor(name: string): string {
  if (name.endsWith('.csv')) return 'text/csv';
  if (name.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

describe('MappingsService.importMappings', () => {
  let service: MappingsService;

  const mockPrismaService = {
    framework: { findMany: jest.fn() },
    frameworkRequirement: { findMany: jest.fn() },
    control: { findMany: jest.fn() },
    controlMapping: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockHistoryService = { record: jest.fn() };
  const mockAuditService = { log: jest.fn() };
  const mockStorage = {
    upload: jest.fn().mockResolvedValue('imports/mappings/org-123/2026/05/17/uuid-file.csv'),
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

    // Default catalog so most tests don't have to set this up.
    mockPrismaService.framework.findMany.mockResolvedValue([SYSTEM_FRAMEWORK]);
    mockPrismaService.frameworkRequirement.findMany.mockResolvedValue([REQ_CC11, REQ_CC21]);
    mockPrismaService.control.findMany.mockResolvedValue([CTL_AC001, CTL_AC002]);
    mockPrismaService.controlMapping.findMany.mockResolvedValue([]);
    mockPrismaService.controlMapping.findFirst.mockResolvedValue(null);

    mockStorage.upload.mockResolvedValue('imports/mappings/org-123/2026/05/17/uuid-file.csv');

    // $transaction default passes through with a minimal tx mock.
    mockPrismaService.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          controlMapping: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `m-${Math.random().toString(36).slice(2, 8)}`,
              ...data,
              createdAt: new Date('2026-05-17T00:00:00Z'),
              framework: { id: data.frameworkId, name: 'SOC 2', type: 'soc2' },
              requirement: { id: data.requirementId, reference: 'CC1.1', title: 'Req' },
              control: {
                id: data.controlId,
                controlId: 'AC-001',
                title: 'Ctl',
                category: 'access_control',
              },
            })),
          },
        };
        return cb(tx);
      }
    );
  });

  describe('happy path (CSV, commit)', () => {
    it('parses 3 good rows, creates them, writes one audit log, uploads source file', async () => {
      const buf = loadFixture('all-good.csv');
      const result = await service.importMappings(
        buf,
        'text/csv',
        'all-good.csv',
        false,
        USER_ID,
        ORG_ID
      );

      expect(result.totalRows).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.dryRun).toBe(false);
      expect(result.sourceStorageKey).toMatch(/imports\/mappings\/org-123\//);
      // Per-row outcomes — all will_create
      expect(result.rows).toHaveLength(3);
      expect(result.rows.every((r) => r.status === 'will_create')).toBe(true);
      // Each row.row is the file row number (header=1, so first data is 2)
      expect(result.rows.map((r) => r.row)).toEqual([2, 3, 4]);
      // 3 per-row mapping.bulk_created + 1 mapping.imported audit
      const importedCalls = mockAuditService.log.mock.calls.filter(
        ([c]) => c.action === 'mapping.imported'
      );
      const bulkCalls = mockAuditService.log.mock.calls.filter(
        ([c]) => c.action === 'mapping.bulk_created'
      );
      expect(importedCalls).toHaveLength(1);
      expect(bulkCalls).toHaveLength(3);
      expect(mockStorage.upload).toHaveBeenCalledTimes(1);
    });
  });

  describe('happy path dry-run', () => {
    it('returns preview without DB writes or storage uploads', async () => {
      const buf = loadFixture('all-good.csv');
      const result = await service.importMappings(
        buf,
        'text/csv',
        'all-good.csv',
        true,
        USER_ID,
        ORG_ID
      );

      expect(result.dryRun).toBe(true);
      expect(result.successful).toBe(3);
      expect(result.sourceStorageKey).toBeNull();
      expect(mockStorage.upload).not.toHaveBeenCalled();
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      expect(mockAuditService.log).not.toHaveBeenCalled();
      expect(mockHistoryService.record).not.toHaveBeenCalled();
    });
  });

  describe('error rows', () => {
    it('unknown framework_code becomes a row error', async () => {
      mockPrismaService.framework.findMany.mockResolvedValueOnce([]); // catalog empty
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValueOnce([]);
      mockPrismaService.control.findMany.mockResolvedValueOnce([CTL_AC001]);

      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nbogus:0,CC1.1,AC-001,primary,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.totalRows).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toMatch(/unknown framework code: bogus:0/);
      expect(result.rows[0].status).toBe('error');
    });

    it('unknown requirement_ref in known framework becomes a row error', async () => {
      mockPrismaService.frameworkRequirement.findMany.mockResolvedValueOnce([REQ_CC11]); // CC2.1 missing
      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,XX9.9,AC-001,primary,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.errors[0].message).toMatch(/unknown requirement_ref 'XX9.9'/);
      expect(result.rows[0].status).toBe('error');
    });

    it('unknown control_code becomes a row error', async () => {
      mockPrismaService.control.findMany.mockResolvedValueOnce([]); // none
      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,CC1.1,NOPE-0,primary,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.errors[0].message).toMatch(/unknown control code: NOPE-0/);
    });

    it('invalid mapping_type becomes a row error', async () => {
      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,CC1.1,AC-001,tangential,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.errors[0].message).toMatch(/invalid mapping_type 'tangential'/);
    });
  });

  describe('duplicates', () => {
    it('marks already-in-DB composites as duplicate (no creation)', async () => {
      // Existing DB mapping for (soc2:2017, CC1.1, AC-001)
      mockPrismaService.controlMapping.findMany.mockResolvedValueOnce([
        { frameworkId: SYSTEM_FRAMEWORK.id, requirementId: REQ_CC11.id, controlId: CTL_AC001.id },
      ]);

      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,CC1.1,AC-001,primary,\nsoc2:2017,CC2.1,AC-002,supporting,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', false, USER_ID, ORG_ID);

      expect(result.duplicates).toBe(1);
      expect(result.successful).toBe(1);
      const dupRow = result.rows.find((r) => r.status === 'duplicate');
      expect(dupRow).toBeDefined();
      expect(dupRow!.originalValues.control_code).toBe('AC-001');
    });

    it('detects duplicates within the same file (second occurrence marked duplicate)', async () => {
      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,CC1.1,AC-001,primary,first\nsoc2:2017,CC1.1,AC-001,primary,second\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.duplicates).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.rows[0].status).toBe('will_create');
      expect(result.rows[1].status).toBe('duplicate');
    });
  });

  describe('MIME filter', () => {
    it('accepts text/csv', () => {
      const cb = jest.fn();
      mappingImportFileFilter({}, { mimetype: 'text/csv' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('accepts xlsx mimetype', () => {
      const cb = jest.fn();
      mappingImportFileFilter(
        {},
        { mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        cb
      );
      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('rejects pdf with BadRequestException at filter (before service is invoked)', () => {
      const cb = jest.fn();
      mappingImportFileFilter({}, { mimetype: 'application/pdf' }, cb);
      expect(cb).toHaveBeenCalledTimes(1);
      const [err, accept] = cb.mock.calls[0];
      expect(err).toBeInstanceOf(BadRequestException);
      expect(accept).toBe(false);
      expect(MAPPING_IMPORT_MIME_ALLOWLIST).not.toContain('application/pdf');
    });
  });

  describe('size cap', () => {
    it('constant is configured at 25MB (Multer enforces; service never sees oversized buffers)', () => {
      expect(MAPPING_IMPORT_MAX_BYTES).toBe(25 * 1024 * 1024);
    });
  });

  describe('cross-tenant isolation', () => {
    it('control code visible only in another tenant resolves to "unknown control code"', async () => {
      // Catalog returns no control because the tenant-scoped where filter excludes it.
      mockPrismaService.control.findMany.mockResolvedValueOnce([]); // simulate cross-tenant — not in result

      const csv = Buffer.from(
        'framework_code,requirement_ref,control_code,mapping_type,notes\nsoc2:2017,CC1.1,OTHER-001,primary,\n'
      );
      const result = await service.importMappings(csv, 'text/csv', 'b.csv', true, USER_ID, ORG_ID);

      expect(result.errors[0].message).toMatch(/unknown control code: OTHER-001/);
      // ensure the where clause scoped to caller's org + null (system)
      const lastCall = mockPrismaService.control.findMany.mock.calls.at(-1)![0];
      expect(lastCall.where.OR).toEqual([{ organizationId: null }, { organizationId: ORG_ID }]);
    });
  });

  describe('storage upload failure', () => {
    it('logs warning but returns successful result with sourceStorageKey: null', async () => {
      mockStorage.upload.mockRejectedValueOnce(new Error('S3 unavailable'));
      const csv = loadFixture('all-good.csv');

      const result = await service.importMappings(
        csv,
        'text/csv',
        'all-good.csv',
        false,
        USER_ID,
        ORG_ID
      );

      expect(result.successful).toBe(3);
      expect(result.sourceStorageKey).toBeNull();
      // import is NOT marked as failed
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('XLSX support', () => {
    it('parses an XLSX file and produces will_create outcomes for known catalog rows', async () => {
      const buf = loadFixture('all-good.xlsx');
      const result = await service.importMappings(
        buf,
        mimeFor('all-good.xlsx'),
        'all-good.xlsx',
        true,
        USER_ID,
        ORG_ID
      );
      expect(result.totalRows).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('import-parser', () => {
  it('parseMappingCsv lowercases headers and trims values', () => {
    const csv = Buffer.from(
      'Framework_Code, Requirement_Ref ,control_code,mapping_type,notes\n  soc2:2017 ,CC1.1 ,AC-001,Primary,hello\n'
    );
    const rows = parseMappingCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].framework_code).toBe('soc2:2017');
    expect(rows[0].requirement_ref).toBe('CC1.1');
    expect(rows[0].mapping_type).toBe('Primary');
  });

  it('parseMappingXlsx reads the first sheet and skips empty rows', async () => {
    const buf = fs.readFileSync(path.join(FIXTURE_DIR, 'all-good.xlsx'));
    const rows = await parseMappingXlsx(buf);
    expect(rows.length).toBe(3);
    expect(rows[0].framework_code).toBe('soc2:2017');
    expect(rows[0].control_code).toBe('AC-001');
  });
});
