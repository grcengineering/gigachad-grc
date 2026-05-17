import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MappingHistoryService } from './mapping-history.service';
import { CreateMappingDto, UpdateMappingDto } from './dto/mapping.dto';

export type GapType = 'no-controls' | 'supporting-only' | 'unused-controls';

export interface MappingGapRow {
  id: string;
  type: GapType;
  framework?: { id: string; name: string };
  requirement?: { id: string; reference: string; title: string };
  control?: { id: string; controlId: string; title: string };
  summary: string;
}

const MAPPING_INCLUDE = {
  framework: { select: { id: true, name: true, type: true } },
  requirement: { select: { id: true, reference: true, title: true } },
  control: { select: { id: true, controlId: true, title: true, category: true } },
} as const;

@Injectable()
export class MappingsService {
  constructor(
    private prisma: PrismaService,
    private history: MappingHistoryService,
    private auditService: AuditService
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

  async findGaps(
    organizationId: string,
    frameworkId?: string,
    type?: GapType
  ): Promise<MappingGapRow[]> {
    const tenantClause = { OR: [{ organizationId }, { organizationId: null }] };

    const fetchNoControls = async (): Promise<MappingGapRow[]> => {
      const reqs = await this.prisma.frameworkRequirement.findMany({
        where: {
          isCategory: false,
          framework: tenantClause,
          ...(frameworkId ? { frameworkId } : {}),
          mappings: { none: {} },
        },
        include: { framework: { select: { id: true, name: true } } },
        orderBy: [{ framework: { name: 'asc' } }, { reference: 'asc' }],
      });
      return reqs.map((r) => ({
        id: `req:${r.id}:no-controls`,
        type: 'no-controls' as const,
        framework: r.framework ? { id: r.framework.id, name: r.framework.name } : undefined,
        requirement: { id: r.id, reference: r.reference, title: r.title },
        summary: 'Requirement has no mapped controls',
      }));
    };

    const fetchSupportingOnly = async (): Promise<MappingGapRow[]> => {
      const reqs = await this.prisma.frameworkRequirement.findMany({
        where: {
          isCategory: false,
          framework: tenantClause,
          ...(frameworkId ? { frameworkId } : {}),
          AND: [{ mappings: { some: {} } }, { mappings: { none: { mappingType: 'primary' } } }],
        },
        include: { framework: { select: { id: true, name: true } } },
        orderBy: [{ framework: { name: 'asc' } }, { reference: 'asc' }],
      });
      return reqs.map((r) => ({
        id: `req:${r.id}:supporting-only`,
        type: 'supporting-only' as const,
        framework: r.framework ? { id: r.framework.id, name: r.framework.name } : undefined,
        requirement: { id: r.id, reference: r.reference, title: r.title },
        summary: 'Requirement is covered only by supporting controls',
      }));
    };

    const fetchUnusedControls = async (): Promise<MappingGapRow[]> => {
      const controls = await this.prisma.control.findMany({
        where: {
          OR: [{ organizationId }, { organizationId: null }],
          mappings: { none: {} },
        },
        orderBy: { controlId: 'asc' },
      });
      return controls.map((c) => ({
        id: `ctrl:${c.id}:unused-controls`,
        type: 'unused-controls' as const,
        control: { id: c.id, controlId: c.controlId, title: c.title },
        summary: 'Control is not mapped to any requirement',
      }));
    };

    if (type === 'no-controls') return fetchNoControls();
    if (type === 'supporting-only') return fetchSupportingOnly();
    if (type === 'unused-controls') return fetchUnusedControls();

    const [a, b, c] = await Promise.all([
      fetchNoControls(),
      fetchSupportingOnly(),
      fetchUnusedControls(),
    ]);
    return [...a, ...b, ...c];
  }
}
