import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

@Injectable()
export class FrameworksService {
  private readonly logger = new Logger(FrameworksService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const frameworks = await this.prisma.framework.findMany({
      where: {
        OR: [
          { organizationId: null, isActive: true }, // System frameworks
          { organizationId }, // Org-specific frameworks
        ],
      },
      include: {
        _count: {
          select: { requirements: true, mappings: true },
        },
        assessments: {
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    // Calculate readiness for each framework
    const frameworksWithReadiness = await Promise.all(
      frameworks.map(async (f) => {
        const readiness = await this.calculateReadiness(f.id, organizationId);
        return {
          ...f,
          requirementCount: f._count.requirements,
          mappedControlCount: f._count.mappings,
          lastAssessment: f.assessments[0] || null,
          readiness: {
            score: readiness.score,
            requirementsByStatus: readiness.requirementsByStatus,
          },
        };
      }),
    );

    return frameworksWithReadiness;
  }

  async create(
    organizationId: string,
    dto: {
      name: string;
      type: string;
      version?: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    const framework = await this.prisma.framework.create({
      data: {
        name: dto.name,
        type: dto.type,
        version: dto.version || '1.0',
        description: dto.description || '',
        organizationId, // Org-specific framework
        isActive: dto.isActive !== false,
      },
      include: {
        _count: {
          select: { requirements: true, mappings: true },
        },
      },
    });

    this.logger.log(`Created framework ${framework.name} (${framework.id}) for org ${organizationId}`);
    return framework;
  }

  async findOne(id: string) {
    const framework = await this.prisma.framework.findUnique({
      where: { id },
      include: {
        _count: {
          select: { requirements: true, mappings: true },
        },
      },
    });

    if (!framework) {
      throw new NotFoundException(`Framework with ID ${id} not found`);
    }

    return framework;
  }

  async createRequirement(
    frameworkId: string,
    dto: {
      reference: string;
      title: string;
      description: string;
      guidance?: string;
      parentId?: string;
      isCategory?: boolean;
      order?: number;
    },
  ) {
    // Verify framework exists
    await this.findOne(frameworkId);

    // If parentId is provided, verify it exists and belongs to this framework
    if (dto.parentId) {
      const parent = await this.prisma.frameworkRequirement.findFirst({
        where: { id: dto.parentId, frameworkId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent requirement not found`);
      }
    }

    // Determine hierarchy level
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.frameworkRequirement.findUnique({
        where: { id: dto.parentId },
      });
      level = (parent?.level || 0) + 1;
    }

    const requirement = await this.prisma.frameworkRequirement.create({
      data: {
        frameworkId,
        reference: dto.reference,
        title: dto.title,
        description: dto.description,
        guidance: dto.guidance || null,
        parentId: dto.parentId || null,
        isCategory: dto.isCategory || false,
        order: dto.order || 0,
        level,
      },
      include: {
        parent: { select: { id: true, reference: true, title: true } },
        mappings: {
          include: {
            control: {
              select: { id: true, controlId: true, title: true, category: true },
            },
          },
        },
      },
    });

    this.logger.log(`Created requirement ${requirement.reference} (${requirement.id}) for framework ${frameworkId}`);
    return requirement;
  }

  async bulkUploadRequirements(frameworkId: string, file: Express.Multer.File) {
    // Verify framework exists
    await this.findOne(frameworkId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let requirements: any[] = [];
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();

    try {
      // Parse based on file type
      if (fileExt === 'csv') {
        requirements = this.parseCSV(file.buffer);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        requirements = this.parseExcel(file.buffer);
      } else if (fileExt === 'json') {
        requirements = JSON.parse(file.buffer.toString());
      } else {
        throw new BadRequestException('Unsupported file type. Please upload CSV, Excel (.xlsx, .xls), or JSON file');
      }

      // Validate and create requirements
      const created = [];
      for (const req of requirements) {
        if (!req.reference || !req.title || !req.description) {
          this.logger.warn(`Skipping invalid requirement: ${JSON.stringify(req)}`);
          continue;
        }

        const requirement = await this.prisma.frameworkRequirement.create({
          data: {
            frameworkId,
            reference: req.reference,
            title: req.title,
            description: req.description,
            guidance: req.guidance || null,
            parentId: req.parentId || null,
            isCategory: req.isCategory === true || req.isCategory === 'true',
            order: parseInt(req.order) || 0,
            level: parseInt(req.level) || 0,
          },
        });
        created.push(requirement);
      }

      this.logger.log(`Bulk uploaded ${created.length} requirements for framework ${frameworkId}`);
      return {
        success: true,
        count: created.length,
        requirements: created,
      };
    } catch (error) {
      this.logger.error(`Failed to parse file: ${error.message}`);
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }
  }

  private parseCSV(buffer: Buffer): any[] {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  }

  private parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(worksheet);
    return records;
  }

  async getRequirements(frameworkId: string, parentId?: string) {
    await this.findOne(frameworkId);

    const requirements = await this.prisma.frameworkRequirement.findMany({
      where: {
        frameworkId,
        parentId: parentId || null,
      },
      include: {
        children: {
          orderBy: { order: 'asc' },
        },
        mappings: {
          include: {
            control: {
              select: { id: true, controlId: true, title: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return requirements;
  }

  async getRequirementTree(frameworkId: string) {
    await this.findOne(frameworkId);

    // Get all requirements
    const allRequirements = await this.prisma.frameworkRequirement.findMany({
      where: { frameworkId },
      include: {
        mappings: {
          include: {
            control: {
              select: { id: true, controlId: true, title: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Build tree structure
    const requirementMap = new Map(allRequirements.map(r => [r.id, { ...r, children: [] as any[] }]));
    const roots: any[] = [];

    allRequirements.forEach(req => {
      const node = requirementMap.get(req.id)!;
      if (req.parentId && requirementMap.has(req.parentId)) {
        requirementMap.get(req.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  async getRequirement(frameworkId: string, requirementId: string) {
    const requirement = await this.prisma.frameworkRequirement.findFirst({
      where: { id: requirementId, frameworkId },
      include: {
        parent: { select: { id: true, reference: true, title: true } },
        children: { orderBy: { order: 'asc' } },
        mappings: {
          include: {
            control: {
              select: { id: true, controlId: true, title: true, category: true },
            },
          },
        },
        owner: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!requirement) {
      throw new NotFoundException(`Requirement with ID ${requirementId} not found`);
    }

    return requirement;
  }

  async updateRequirement(
    frameworkId: string,
    requirementId: string,
    dto: {
      ownerId?: string | null;
      ownerNotes?: string;
      dueDate?: string;
      priority?: string;
    },
  ) {
    // Verify requirement exists
    const existing = await this.prisma.frameworkRequirement.findFirst({
      where: { id: requirementId, frameworkId },
    });

    if (!existing) {
      throw new NotFoundException(`Requirement with ID ${requirementId} not found`);
    }

    // Update the requirement
    const updated = await this.prisma.frameworkRequirement.update({
      where: { id: requirementId },
      data: {
        ownerId: dto.ownerId === null ? null : dto.ownerId,
        ownerNotes: dto.ownerNotes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
      },
      include: {
        owner: { select: { id: true, displayName: true, email: true } },
        mappings: {
          include: {
            control: {
              select: { id: true, controlId: true, title: true, category: true },
            },
          },
        },
      },
    });

    return updated;
  }

  async calculateReadiness(frameworkId: string, organizationId: string) {
    await this.findOne(frameworkId);

    // Get all requirements with their mapped controls and implementation status
    const requirements = await this.prisma.frameworkRequirement.findMany({
      where: { frameworkId, isCategory: false },
      include: {
        mappings: {
          include: {
            control: {
              include: {
                implementations: {
                  where: { organizationId },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    let compliant = 0;
    let partial = 0;
    let nonCompliant = 0;
    let notApplicable = 0;
    let notAssessed = 0;

    requirements.forEach(req => {
      if (req.mappings.length === 0) {
        notAssessed++;
        return;
      }

      const implementedCount = req.mappings.filter(
        m => m.control.implementations[0]?.status === 'implemented',
      ).length;

      const naCount = req.mappings.filter(
        m => m.control.implementations[0]?.status === 'not_applicable',
      ).length;

      const totalMappings = req.mappings.length;

      if (naCount === totalMappings) {
        notApplicable++;
      } else if (implementedCount === totalMappings - naCount) {
        compliant++;
      } else if (implementedCount > 0) {
        partial++;
      } else {
        nonCompliant++;
      }
    });

    const total = requirements.length;
    const applicable = total - notApplicable;
    const score = applicable > 0
      ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
      : 0;

    return {
      frameworkId,
      score,
      requirementsByStatus: {
        compliant,
        partial,
        non_compliant: nonCompliant,
        not_applicable: notApplicable,
        not_assessed: notAssessed,
      },
      total,
    };
  }

  async getFrameworkTypes() {
    const types = await this.prisma.framework.groupBy({
      by: ['type'],
      _count: true,
    });

    return types.map(t => ({
      type: t.type,
      count: t._count,
    }));
  }

  async listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId, status: 'active' },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
      },
      orderBy: { displayName: 'asc' },
    });
  }
}
