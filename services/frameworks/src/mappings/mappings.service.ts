import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MappingHistoryService } from './mapping-history.service';
import {
  CreateMappingDto,
  ImportResult,
  MappingImportError,
  MappingImportRowOutcome,
  UpdateMappingDto,
} from './dto/mapping.dto';
import { parseMappingCsv, parseMappingXlsx, RawMappingRow } from './import-parser';

export type MappingExportFormat = 'csv' | 'xlsx';

export interface MappingExportResult {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

const MAPPING_INCLUDE = {
  framework: { select: { id: true, name: true, type: true } },
  requirement: { select: { id: true, reference: true, title: true } },
  control: { select: { id: true, controlId: true, title: true, category: true } },
} as const;

@Injectable()
export class MappingsService {
  private readonly logger = new Logger(MappingsService.name);

  constructor(
    private prisma: PrismaService,
    private history: MappingHistoryService,
    private auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider
  ) {}

  async findAll(frameworkId?: string, controlId?: string) {
    const where: { frameworkId?: string; controlId?: string } = {};
    if (frameworkId) where.frameworkId = frameworkId;
    if (controlId) where.controlId = controlId;

    return this.prisma.controlMapping.findMany({
      where,
      include: MAPPING_INCLUDE,
      orderBy: [{ framework: { name: 'asc' } }, { requirement: { order: 'asc' } }],
    });
  }

  async findByControl(controlId: string) {
    return this.prisma.controlMapping.findMany({
      where: { controlId },
      include: {
        framework: { select: { id: true, name: true, type: true } },
        requirement: { select: { id: true, reference: true, title: true } },
      },
    });
  }

  async findByRequirement(requirementId: string) {
    return this.prisma.controlMapping.findMany({
      where: { requirementId },
      include: {
        control: { select: { id: true, controlId: true, title: true, category: true } },
      },
    });
  }

  async create(userId: string, organizationId: string, dto: CreateMappingDto) {
    // Check for existing mapping
    const existing = await this.prisma.controlMapping.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        requirementId: dto.requirementId,
        controlId: dto.controlId,
      },
    });

    if (existing) {
      throw new ConflictException('This mapping already exists');
    }

    const mapping = await this.prisma.$transaction(async (tx) => {
      const created = await tx.controlMapping.create({
        data: {
          frameworkId: dto.frameworkId,
          requirementId: dto.requirementId,
          controlId: dto.controlId,
          mappingType: dto.mappingType || 'primary',
          notes: dto.notes,
          createdBy: userId,
        },
        include: MAPPING_INCLUDE,
      });

      await this.history.record(tx, created.id, 'create', this.serializeSnapshot(created), userId);

      return created;
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'mapping.created',
      entityType: 'control_mapping',
      entityId: mapping.id,
      entityName: `${mapping.control.controlId} -> ${mapping.requirement.reference}`,
      description: `Mapped control ${mapping.control.controlId} to requirement ${mapping.requirement.reference}`,
    });

    return mapping;
  }

  async update(id: string, dto: UpdateMappingDto, userId: string, organizationId: string) {
    const existing = await this.prisma.controlMapping.findFirst({
      where: {
        id,
        OR: [
          { control: { OR: [{ organizationId }, { organizationId: null }] } },
          { framework: { OR: [{ organizationId }, { organizationId: null }] } },
        ],
      },
      include: MAPPING_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.controlMapping.update({
        where: { id },
        data: {
          mappingType: dto.mappingType,
          notes: dto.notes,
        },
        include: MAPPING_INCLUDE,
      });

      await this.history.record(tx, result.id, 'update', this.serializeSnapshot(result), userId);

      return result;
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'mapping.updated',
      entityType: 'control_mapping',
      entityId: updated.id,
      entityName: `${updated.control.controlId} -> ${updated.requirement.reference}`,
      description: `Updated mapping ${updated.control.controlId} -> ${updated.requirement.reference}`,
      changes: {
        before: { mappingType: existing.mappingType, notes: existing.notes },
        after: { mappingType: updated.mappingType, notes: updated.notes },
      },
    });

    return updated;
  }

  async delete(id: string, userId: string, organizationId: string) {
    const mapping = await this.prisma.controlMapping.findFirst({
      where: {
        id,
        OR: [
          { control: { OR: [{ organizationId }, { organizationId: null }] } },
          { framework: { OR: [{ organizationId }, { organizationId: null }] } },
        ],
      },
      include: MAPPING_INCLUDE,
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.history.record(tx, mapping.id, 'delete', this.serializeSnapshot(mapping), userId);
      await tx.controlMapping.delete({ where: { id: mapping.id } });
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'mapping.deleted',
      entityType: 'control_mapping',
      entityId: mapping.id,
      entityName: `${mapping.control.controlId} -> ${mapping.requirement.reference}`,
      description: `Deleted mapping ${mapping.control.controlId} -> ${mapping.requirement.reference}`,
    });

    return { success: true };
  }

  async bulkCreate(userId: string, organizationId: string, mappings: CreateMappingDto[]) {
    const results = [];

    for (const dto of mappings) {
      try {
        const mapping = await this.createForBulk(userId, organizationId, dto);
        results.push({ success: true, mapping });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          success: false,
          error: errorMessage,
          dto,
        });
      }
    }

    return results;
  }

  async importMappings(
    fileBuffer: Buffer,
    mimeType: string,
    originalName: string,
    dryRun: boolean,
    userId: string,
    organizationId: string
  ): Promise<ImportResult> {
    // Parse phase
    let rawRows: RawMappingRow[];
    try {
      if (mimeType === 'text/csv') {
        rawRows = parseMappingCsv(fileBuffer);
      } else {
        rawRows = await parseMappingXlsx(fileBuffer);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to parse import file';
      return {
        totalRows: 0,
        successful: 0,
        duplicates: 0,
        errors: [{ row: 0, message, originalValues: {} }],
        rows: [],
        dryRun,
        sourceStorageKey: null,
      };
    }

    const totalRows = rawRows.length;

    // Bulk-fetch unique frameworks, requirements per framework, and controls
    const frameworkCodes = unique(
      rawRows.map((r) => (r.framework_code ?? '').trim()).filter(Boolean)
    );
    const controlCodes = unique(rawRows.map((r) => (r.control_code ?? '').trim()).filter(Boolean));

    const frameworkPairs = frameworkCodes
      .map((code) => splitFrameworkCode(code))
      .filter((p): p is { type: string; version: string; raw: string } => p !== null);

    const frameworks = await this.prisma.framework.findMany({
      where: {
        AND: [
          { OR: frameworkPairs.map((p) => ({ type: p.type, version: p.version })) },
          { OR: [{ organizationId: null }, { organizationId }] },
        ],
      },
      select: { id: true, type: true, version: true },
    });
    const frameworkByCode = new Map<string, { id: string; type: string; version: string }>();
    for (const fw of frameworks) {
      frameworkByCode.set(`${fw.type}:${fw.version}`, fw);
    }

    const frameworkIds = frameworks.map((f) => f.id);
    const requirements = frameworkIds.length
      ? await this.prisma.frameworkRequirement.findMany({
          where: { frameworkId: { in: frameworkIds } },
          select: { id: true, frameworkId: true, reference: true },
        })
      : [];
    // key: `${frameworkId}::${reference}`
    const requirementByKey = new Map<
      string,
      { id: string; frameworkId: string; reference: string }
    >();
    for (const req of requirements) {
      requirementByKey.set(`${req.frameworkId}::${req.reference}`, req);
    }

    const controls = controlCodes.length
      ? await this.prisma.control.findMany({
          where: {
            controlId: { in: controlCodes },
            OR: [{ organizationId: null }, { organizationId }],
            deletedAt: null,
          },
          select: { id: true, controlId: true },
        })
      : [];
    const controlByCode = new Map<string, { id: string; controlId: string }>();
    for (const ctl of controls) {
      controlByCode.set(ctl.controlId, ctl);
    }

    // Track in-file duplicates: same (frameworkId, requirementId, controlId) appearing twice
    const seenComposite = new Set<string>();

    // Lookup existing DB mappings up-front for the candidate composites
    const candidateComposites: Array<{
      frameworkId: string;
      requirementId: string;
      controlId: string;
    }> = [];
    const perRowResolved: Array<
      | {
          ok: true;
          frameworkId: string;
          requirementId: string;
          controlId: string;
          mappingType: string;
          notes: string | null;
        }
      | { ok: false; message: string }
    > = [];

    const outcomes: MappingImportRowOutcome[] = [];
    const errors: MappingImportError[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2; // header is row 1
      const raw = rawRows[i];
      const originalValues = sanitizeOriginalValues(raw);

      const resolution = this.resolveRow(raw, frameworkByCode, requirementByKey, controlByCode);

      if (!resolution.ok) {
        const outcome: MappingImportRowOutcome = {
          row: rowNumber,
          status: 'error',
          originalValues,
          errorMessage: resolution.message,
        };
        outcomes.push(outcome);
        errors.push({ row: rowNumber, message: resolution.message, originalValues });
        perRowResolved.push({ ok: false, message: resolution.message });
        continue;
      }

      perRowResolved.push({
        ok: true,
        frameworkId: resolution.frameworkId,
        requirementId: resolution.requirementId,
        controlId: resolution.controlId,
        mappingType: resolution.mappingType,
        notes: resolution.notes,
      });
      candidateComposites.push({
        frameworkId: resolution.frameworkId,
        requirementId: resolution.requirementId,
        controlId: resolution.controlId,
      });
    }

    // Bulk-check existing DB mappings for the resolved candidates
    const existing = candidateComposites.length
      ? await this.prisma.controlMapping.findMany({
          where: {
            OR: candidateComposites.map((c) => ({
              frameworkId: c.frameworkId,
              requirementId: c.requirementId,
              controlId: c.controlId,
            })),
          },
          select: { frameworkId: true, requirementId: true, controlId: true },
        })
      : [];
    const existingSet = new Set(
      existing.map((e) => `${e.frameworkId}::${e.requirementId}::${e.controlId}`)
    );

    // Second pass: assign duplicate / will_create
    for (let i = 0; i < rawRows.length; i++) {
      const rowNumber = i + 2;
      const r = perRowResolved[i];
      if (!r.ok) continue; // already pushed as error above
      const composite = `${r.frameworkId}::${r.requirementId}::${r.controlId}`;
      const originalValues = sanitizeOriginalValues(rawRows[i]);

      if (existingSet.has(composite) || seenComposite.has(composite)) {
        outcomes.push({
          row: rowNumber,
          status: 'duplicate',
          originalValues,
          resolvedIds: {
            frameworkId: r.frameworkId,
            requirementId: r.requirementId,
            controlId: r.controlId,
          },
        });
      } else {
        outcomes.push({
          row: rowNumber,
          status: 'will_create',
          originalValues,
          resolvedIds: {
            frameworkId: r.frameworkId,
            requirementId: r.requirementId,
            controlId: r.controlId,
          },
        });
        seenComposite.add(composite);
      }
    }

    // Sort outcomes by row to maintain file order
    outcomes.sort((a, b) => a.row - b.row);

    let successful = outcomes.filter((o) => o.status === 'will_create').length;
    const duplicates = outcomes.filter((o) => o.status === 'duplicate').length;

    if (dryRun) {
      return {
        totalRows,
        successful,
        duplicates,
        errors,
        rows: outcomes,
        dryRun: true,
        sourceStorageKey: null,
      };
    }

    // Commit phase: persist will_create rows via createForBulk (per-row tx + history + audit)
    let actuallyCreated = 0;
    for (const outcome of outcomes) {
      if (outcome.status !== 'will_create' || !outcome.resolvedIds) continue;
      const idx = outcome.row - 2;
      const r = perRowResolved[idx];
      if (!r.ok) continue;
      try {
        await this.createForBulk(userId, organizationId, {
          frameworkId: r.frameworkId,
          requirementId: r.requirementId,
          controlId: r.controlId,
          mappingType: r.mappingType as 'primary' | 'supporting',
          notes: r.notes ?? undefined,
        });
        actuallyCreated++;
      } catch (error: unknown) {
        if (error instanceof ConflictException) {
          outcome.status = 'duplicate';
        } else {
          const message = error instanceof Error ? error.message : 'Unknown error during commit';
          outcome.status = 'error';
          outcome.errorMessage = message;
          errors.push({ row: outcome.row, message, originalValues: outcome.originalValues });
        }
      }
    }
    successful = actuallyCreated;
    const finalDuplicates = outcomes.filter((o) => o.status === 'duplicate').length;

    // Source-file persistence (best-effort)
    const sourceStorageKey = await this.uploadSourceFile(
      fileBuffer,
      originalName,
      mimeType,
      organizationId
    );

    // Single audit log per import
    await this.auditService.log({
      organizationId,
      userId,
      action: 'mapping.imported',
      entityType: 'control_mapping',
      entityId: organizationId,
      description: `Imported mappings: ${successful} created, ${finalDuplicates} duplicates, ${errors.length} errors out of ${totalRows} rows`,
      metadata: {
        totalRows,
        successful,
        duplicates: finalDuplicates,
        errorCount: errors.length,
        sourceStorageKey,
      },
    });

    return {
      totalRows,
      successful,
      duplicates: finalDuplicates,
      errors,
      rows: outcomes,
      dryRun: false,
      sourceStorageKey,
    };
  }

  private resolveRow(
    raw: RawMappingRow,
    frameworkByCode: Map<string, { id: string; type: string; version: string }>,
    requirementByKey: Map<string, { id: string; frameworkId: string; reference: string }>,
    controlByCode: Map<string, { id: string; controlId: string }>
  ):
    | {
        ok: true;
        frameworkId: string;
        requirementId: string;
        controlId: string;
        mappingType: string;
        notes: string | null;
      }
    | { ok: false; message: string } {
    const frameworkCode = (raw.framework_code ?? '').trim();
    const requirementRef = (raw.requirement_ref ?? '').trim();
    const controlCode = (raw.control_code ?? '').trim();
    const mappingTypeRaw = (raw.mapping_type ?? '').trim();
    const notesRaw = (raw.notes ?? '').trim();

    if (!frameworkCode) return { ok: false, message: 'Missing required column: framework_code' };
    if (!requirementRef) return { ok: false, message: 'Missing required column: requirement_ref' };
    if (!controlCode) return { ok: false, message: 'Missing required column: control_code' };
    if (!mappingTypeRaw) return { ok: false, message: 'Missing required column: mapping_type' };

    const fw = frameworkByCode.get(frameworkCode);
    if (!fw) return { ok: false, message: `unknown framework code: ${frameworkCode}` };

    const req = requirementByKey.get(`${fw.id}::${requirementRef}`);
    if (!req) {
      return {
        ok: false,
        message: `unknown requirement_ref '${requirementRef}' in framework ${frameworkCode}`,
      };
    }

    const ctl = controlByCode.get(controlCode);
    if (!ctl) return { ok: false, message: `unknown control code: ${controlCode}` };

    const mappingTypeNormalized = mappingTypeRaw.toLowerCase();
    if (mappingTypeNormalized !== 'primary' && mappingTypeNormalized !== 'supporting') {
      return {
        ok: false,
        message: `invalid mapping_type '${mappingTypeRaw}' (expected 'primary' or 'supporting')`,
      };
    }

    if (notesRaw.length > 4096) {
      return { ok: false, message: 'notes exceeds 4096 character limit' };
    }

    return {
      ok: true,
      frameworkId: fw.id,
      requirementId: req.id,
      controlId: ctl.id,
      mappingType: mappingTypeNormalized,
      notes: notesRaw === '' ? null : notesRaw,
    };
  }

  private async uploadSourceFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const now = new Date();
      const yyyy = now.getUTCFullYear().toString();
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(now.getUTCDate()).padStart(2, '0');
      const importId = randomUUID();
      const safeName = originalName.replace(/[^\w.-]/g, '_');
      const path = `imports/mappings/${organizationId}/${yyyy}/${mm}/${dd}/${importId}-${safeName}`;
      const key = await this.storage.upload(fileBuffer, path, { contentType: mimeType });
      return key;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to persist mapping import source file: ${message}`);
      return null;
    }
  }

  private async createForBulk(userId: string, organizationId: string, dto: CreateMappingDto) {
    const existing = await this.prisma.controlMapping.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        requirementId: dto.requirementId,
        controlId: dto.controlId,
      },
    });

    if (existing) {
      throw new ConflictException('This mapping already exists');
    }

    const mapping = await this.prisma.$transaction(async (tx) => {
      const created = await tx.controlMapping.create({
        data: {
          frameworkId: dto.frameworkId,
          requirementId: dto.requirementId,
          controlId: dto.controlId,
          mappingType: dto.mappingType || 'primary',
          notes: dto.notes,
          createdBy: userId,
        },
        include: MAPPING_INCLUDE,
      });

      await this.history.record(tx, created.id, 'create', this.serializeSnapshot(created), userId);

      return created;
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'mapping.bulk_created',
      entityType: 'control_mapping',
      entityId: mapping.id,
      entityName: `${mapping.control.controlId} -> ${mapping.requirement.reference}`,
      description: `Bulk-created mapping ${mapping.control.controlId} -> ${mapping.requirement.reference}`,
    });

    return mapping;
  }

  private serializeSnapshot(mapping: {
    frameworkId: string;
    requirementId: string;
    controlId: string;
    mappingType: string;
    notes: string | null;
    createdBy: string;
    createdAt: Date;
  }): Prisma.InputJsonValue {
    return {
      frameworkId: mapping.frameworkId,
      requirementId: mapping.requirementId,
      controlId: mapping.controlId,
      mappingType: mapping.mappingType,
      notes: mapping.notes,
      createdBy: mapping.createdBy,
      createdAt: mapping.createdAt.toISOString(),
    };
  }

  async getControlCoverage(organizationId: string) {
    // Get all controls with their framework mappings
    const controls = await this.prisma.control.findMany({
      where: {
        OR: [{ organizationId: null }, { organizationId }],
      },
      include: {
        mappings: {
          include: {
            framework: { select: { id: true, name: true } },
          },
        },
      },
    });

    const mapped = controls.filter((c) => c.mappings.length > 0);
    const unmapped = controls.filter((c) => c.mappings.length === 0);

    // Group by framework
    const byFramework: Record<string, number> = {};
    controls.forEach((c) => {
      c.mappings.forEach((m) => {
        byFramework[m.framework.name] = (byFramework[m.framework.name] || 0) + 1;
      });
    });

    return {
      totalControls: controls.length,
      mappedControls: mapped.length,
      unmappedControls: unmapped.length,
      coveragePercent: Math.round((mapped.length / controls.length) * 100),
      byFramework,
      unmappedControlIds: unmapped.map((c) => ({
        id: c.id,
        controlId: c.controlId,
        title: c.title,
      })),
    };
  }

  async getRequirementCoverage(frameworkId: string) {
    const requirements = await this.prisma.frameworkRequirement.findMany({
      where: { frameworkId, isCategory: false },
      include: {
        mappings: true,
      },
    });

    const mapped = requirements.filter((r) => r.mappings.length > 0);
    const unmapped = requirements.filter((r) => r.mappings.length === 0);

    return {
      totalRequirements: requirements.length,
      mappedRequirements: mapped.length,
      unmappedRequirements: unmapped.length,
      coveragePercent: Math.round((mapped.length / requirements.length) * 100),
      unmappedRequirementIds: unmapped.map((r) => ({
        id: r.id,
        reference: r.reference,
        title: r.title,
      })),
    };
  }

  async exportFile(
    frameworkId: string,
    format: MappingExportFormat,
    organizationId: string,
    userId?: string
  ): Promise<MappingExportResult> {
    // Tenant check FIRST. NotFound on miss (no disclosure across tenants).
    const framework = await this.prisma.framework.findFirst({
      where: {
        id: frameworkId,
        OR: [{ organizationId }, { organizationId: null }],
      },
      select: { id: true, type: true, version: true },
    });
    if (!framework) {
      throw new NotFoundException(`Framework not found: ${frameworkId}`);
    }

    const mappings = await this.prisma.controlMapping.findMany({
      where: { frameworkId: framework.id },
      include: {
        framework: { select: { type: true, version: true } },
        requirement: { select: { reference: true, order: true } },
        control: { select: { controlId: true } },
      },
      orderBy: [{ requirement: { order: 'asc' } }, { control: { controlId: 'asc' } }],
    });

    const rows = mappings.map((m) => ({
      framework_code: `${m.framework.type}:${m.framework.version}`,
      requirement_ref: m.requirement.reference,
      control_code: m.control.controlId,
      mapping_type: m.mappingType,
      notes: m.notes ?? '',
    }));

    const date = new Date();
    const yyyy = date.getUTCFullYear().toString();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const datePart = `${yyyy}-${mm}-${dd}`;
    const slug = sanitizeFilenamePart(`${framework.type}-${framework.version}`);

    let buffer: Buffer;
    let contentType: string;
    let extension: string;
    if (format === 'csv') {
      buffer = Buffer.from(buildMappingsCsv(rows), 'utf-8');
      contentType = 'text/csv; charset=utf-8';
      extension = 'csv';
    } else {
      buffer = await buildMappingsXlsx(rows);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      extension = 'xlsx';
    }

    const fileName = `mappings-${slug}-${datePart}.${extension}`;

    // Best-effort audit log. userId is optional so the method stays unit-testable
    // outside the controller context.
    if (userId) {
      await this.auditService.log({
        organizationId,
        userId,
        action: 'mapping.exported',
        entityType: 'control_mapping',
        entityId: framework.id,
        entityName: `${framework.type}:${framework.version}`,
        description: `Exported ${rows.length} mappings for ${framework.type}:${framework.version} as ${format}`,
        metadata: {
          frameworkId: framework.id,
          format,
          rowCount: rows.length,
        },
      });
    }

    return { buffer, fileName, contentType };
  }
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function splitFrameworkCode(code: string): { type: string; version: string; raw: string } | null {
  const idx = code.indexOf(':');
  if (idx <= 0 || idx === code.length - 1) return null;
  return {
    type: code.slice(0, idx).trim(),
    version: code.slice(idx + 1).trim(),
    raw: code,
  };
}

function sanitizeOriginalValues(raw: RawMappingRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of [
    'framework_code',
    'requirement_ref',
    'control_code',
    'mapping_type',
    'notes',
  ]) {
    out[key] = (raw[key] ?? '').toString();
  }
  return out;
}

const EXPORT_COLUMNS = [
  'framework_code',
  'requirement_ref',
  'control_code',
  'mapping_type',
  'notes',
] as const;

interface ExportRow {
  framework_code: string;
  requirement_ref: string;
  control_code: string;
  mapping_type: string;
  notes: string;
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildMappingsCsv(rows: ExportRow[]): string {
  const lines: string[] = [];
  lines.push(EXPORT_COLUMNS.join(','));
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((col) => escapeCsvCell(row[col] ?? '')).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

export async function buildMappingsXlsx(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Mappings');
  sheet.columns = EXPORT_COLUMNS.map((col) => ({ header: col, key: col, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: EXPORT_COLUMNS.length },
  };
  for (const row of rows) {
    sheet.addRow({
      framework_code: row.framework_code,
      requirement_ref: row.requirement_ref,
      control_code: row.control_code,
      mapping_type: row.mapping_type,
      notes: row.notes,
    });
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer as ArrayBuffer);
}

function sanitizeFilenamePart(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
}
