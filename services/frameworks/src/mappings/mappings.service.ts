import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMappingDto } from './dto/mapping.dto';

@Injectable()
export class MappingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(frameworkId?: string, controlId?: string) {
    const where: { frameworkId?: string; controlId?: string } = {};
    if (frameworkId) where.frameworkId = frameworkId;
    if (controlId) where.controlId = controlId;

    return this.prisma.controlMapping.findMany({
      where,
      include: {
        framework: { select: { id: true, name: true, type: true } },
        requirement: { select: { id: true, reference: true, title: true } },
        control: { select: { id: true, controlId: true, title: true, category: true } },
      },
      orderBy: [
        { framework: { name: 'asc' } },
        { requirement: { order: 'asc' } },
      ],
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

  async create(userId: string, dto: CreateMappingDto) {
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

    return this.prisma.controlMapping.create({
      data: {
        frameworkId: dto.frameworkId,
        requirementId: dto.requirementId,
        controlId: dto.controlId,
        mappingType: dto.mappingType || 'primary',
        notes: dto.notes,
        createdBy: userId,
      },
      include: {
        framework: { select: { id: true, name: true } },
        requirement: { select: { id: true, reference: true, title: true } },
        control: { select: { id: true, controlId: true, title: true } },
      },
    });
  }

  async delete(id: string, organizationId: string) {
    // SECURITY: Verify the mapping's control belongs to user's organization
    // This prevents users from deleting mappings for controls in other organizations
    const mapping = await this.prisma.controlMapping.findFirst({
      where: { 
        id,
        control: {
          OR: [
            { organizationId }, // Control belongs to user's org
            { organizationId: null }, // Or is a global control
          ],
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    await this.prisma.controlMapping.delete({ where: { id: mapping.id } });
    return { success: true };
  }

  async bulkCreate(userId: string, mappings: CreateMappingDto[]) {
    const results = [];

    for (const dto of mappings) {
      try {
        const mapping = await this.create(userId, dto);
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

  async getControlCoverage(organizationId: string) {
    // Get all controls with their framework mappings
    const controls = await this.prisma.control.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId },
        ],
      },
      include: {
        mappings: {
          include: {
            framework: { select: { id: true, name: true } },
          },
        },
      },
    });

    const mapped = controls.filter(c => c.mappings.length > 0);
    const unmapped = controls.filter(c => c.mappings.length === 0);

    // Group by framework
    const byFramework: Record<string, number> = {};
    controls.forEach(c => {
      c.mappings.forEach(m => {
        byFramework[m.framework.name] = (byFramework[m.framework.name] || 0) + 1;
      });
    });

    return {
      totalControls: controls.length,
      mappedControls: mapped.length,
      unmappedControls: unmapped.length,
      coveragePercent: Math.round((mapped.length / controls.length) * 100),
      byFramework,
      unmappedControlIds: unmapped.map(c => ({ id: c.id, controlId: c.controlId, title: c.title })),
    };
  }

  async getRequirementCoverage(frameworkId: string) {
    const requirements = await this.prisma.frameworkRequirement.findMany({
      where: { frameworkId, isCategory: false },
      include: {
        mappings: true,
      },
    });

    const mapped = requirements.filter(r => r.mappings.length > 0);
    const unmapped = requirements.filter(r => r.mappings.length === 0);

    return {
      totalRequirements: requirements.length,
      mappedRequirements: mapped.length,
      unmappedRequirements: unmapped.length,
      coveragePercent: Math.round((mapped.length / requirements.length) * 100),
      unmappedRequirementIds: unmapped.map(r => ({
        id: r.id,
        reference: r.reference,
        title: r.title,
      })),
    };
  }
}



