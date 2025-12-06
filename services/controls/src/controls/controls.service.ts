import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ControlImplementationStatus } from '@prisma/client';
import { 
  CreateControlDto, 
  UpdateControlDto, 
  ControlFilterDto,
  BulkUploadControlsDto,
  BulkUploadResultDto,
  BulkControlItemDto,
} from './dto/control.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
  getPrismaSkipTake,
} from '@gigachad-grc/shared';

@Injectable()
export class ControlsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters: ControlFilterDto) {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'controlId',
      sortOrder: filters.sortOrder || 'asc',
    });

    const where: any = {
      AND: [
        {
          OR: [
            { organizationId: null }, // System controls
            { organizationId }, // Org-specific controls
          ],
        },
        { deletedAt: null }, // Filter out soft-deleted records
      ],
    };

    if (filters.category?.length) {
      where.AND.push({ category: { in: filters.category } });
    }

    if (filters.tags?.length) {
      where.AND.push({ tags: { hasSome: filters.tags } });
    }

    if (filters.customOnly) {
      where.AND.push({ isCustom: true });
      where.AND.push({ organizationId });
    }

    if (filters.search) {
      where.AND.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { controlId: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    // Filter by framework - only show controls mapped to this framework
    if (filters.frameworkId) {
      where.AND.push({
        mappings: {
          some: {
            frameworkId: filters.frameworkId,
          },
        },
      });
    }

    // Filter by implementation status
    if (filters.status) {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (statusArray.length > 0) {
        where.AND.push({
          implementations: {
            some: {
              organizationId,
              status: { in: statusArray },
            },
          },
        });
      }
    }

    const [controls, total] = await Promise.all([
      this.prisma.control.findMany({
        where,
        include: {
          implementations: {
            where: { organizationId },
            take: 1,
          },
          mappings: {
            include: {
              framework: { select: { id: true, name: true, type: true } },
              requirement: { select: { id: true, reference: true, title: true } },
            },
          },
          _count: {
            select: {
              evidenceLinks: {
                where: {
                  implementation: { organizationId },
                },
              },
              policyLinks: true,
            },
          },
        },
        ...getPrismaSkipTake(pagination),
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.control.count({ where }),
    ]);

    // Transform to include implementation status
    const controlsWithStatus = controls.map(control => ({
      ...control,
      implementation: control.implementations[0] || null,
      evidenceCount: control._count.evidenceLinks + control._count.policyLinks,
      evidenceLinkCount: control._count.evidenceLinks,
      policyLinkCount: control._count.policyLinks,
      frameworkMappings: control.mappings.map(m => ({
        frameworkId: m.framework.id,
        frameworkName: m.framework.name,
        requirementId: m.requirement.id,
        requirementRef: m.requirement.reference,
      })),
    }));

    return createPaginatedResponse(controlsWithStatus, total, pagination);
  }

  async findOne(id: string, organizationId: string) {
    const control = await this.prisma.control.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { organizationId: null },
          { organizationId },
        ],
      },
      include: {
        implementations: {
          where: { organizationId },
          include: {
            owner: { select: { id: true, displayName: true, email: true } },
            tests: {
              orderBy: { testedAt: 'desc' },
              take: 5,
            },
          },
        },
        mappings: {
          include: {
            framework: { select: { id: true, name: true, type: true } },
            requirement: { select: { id: true, reference: true, title: true } },
          },
        },
        evidenceLinks: {
          where: {
            implementation: { organizationId },
          },
          include: {
            evidence: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                validUntil: true,
              },
            },
          },
        },
        policyLinks: {
          include: {
            policy: {
              select: {
                id: true,
                title: true,
                category: true,
                status: true,
                version: true,
              },
            },
          },
        },
      },
    });

    if (!control) {
      throw new NotFoundException(`Control with ID ${id} not found`);
    }

    return {
      ...control,
      implementation: control.implementations[0] || null,
    };
  }

  async create(
    organizationId: string, 
    userId: string, 
    dto: CreateControlDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate controlId in org
    const existing = await this.prisma.control.findFirst({
      where: {
        controlId: dto.controlId,
        organizationId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Control with ID ${dto.controlId} already exists`);
    }

    const control = await this.prisma.control.create({
      data: {
        ...dto,
        organizationId,
        isCustom: true,
        tags: dto.tags || [],
      },
    });

    // Create default implementation for org
    await this.prisma.controlImplementation.create({
      data: {
        controlId: control.id,
        organizationId,
        status: ControlImplementationStatus.not_started,
        testingFrequency: 'quarterly',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'control',
      entityId: control.id,
      entityName: control.title,
      description: `Created control "${control.controlId}: ${control.title}"`,
      changes: { after: control },
    });

    return control;
  }

  async update(
    id: string, 
    organizationId: string, 
    dto: UpdateControlDto,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const control = await this.findOne(id, organizationId);

    // Only allow updating custom controls
    if (!control.isCustom || control.organizationId !== organizationId) {
      throw new ConflictException('Cannot modify system controls');
    }

    const updatedControl = await this.prisma.control.update({
      where: { id },
      data: {
        ...dto,
        tags: dto.tags || undefined,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'control',
      entityId: control.id,
      entityName: updatedControl.title,
      description: `Updated control "${control.controlId}: ${updatedControl.title}"`,
      changes: { before: control, after: updatedControl },
    });

    return updatedControl;
  }

  async delete(
    id: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const control = await this.findOne(id, organizationId);

    // Only allow deleting custom controls
    if (!control.isCustom || control.organizationId !== organizationId) {
      throw new ConflictException('Cannot delete system controls');
    }

    // Soft delete - update deletedAt and deletedBy instead of hard delete
    await this.prisma.control.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'control',
      entityId: control.id,
      entityName: control.title,
      description: `Deleted control "${control.controlId}: ${control.title}"`,
      changes: { before: control },
    });

    return { success: true };
  }

  async getCategories() {
    const categories = await this.prisma.control.groupBy({
      by: ['category'],
      where: { deletedAt: null },
      _count: { category: true },
      orderBy: { category: 'asc' },
    });

    return categories.map(c => ({
      category: c.category,
      count: c._count.category,
    }));
  }

  async getTags(organizationId: string) {
    const controls = await this.prisma.control.findMany({
      where: {
        deletedAt: null,
        OR: [
          { organizationId: null },
          { organizationId },
        ],
      },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    controls.forEach(c => {
      c.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  async bulkUpload(
    organizationId: string, 
    userId: string, 
    dto: BulkUploadControlsDto,
    userEmail?: string,
    userName?: string,
  ): Promise<BulkUploadResultDto> {
    const result: BulkUploadResultDto = {
      total: dto.controls.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (!dto.controls || dto.controls.length === 0) {
      throw new BadRequestException('No controls provided for import');
    }

    // Validate all control IDs are unique within the upload
    const controlIds = dto.controls.map(c => c.controlId);
    const duplicateIds = controlIds.filter((id, index) => controlIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new BadRequestException(`Duplicate control IDs in upload: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Get existing controls for this org
    const existingControls = await this.prisma.control.findMany({
      where: {
        controlId: { in: controlIds },
        organizationId,
        deletedAt: null,
      },
      select: { id: true, controlId: true },
    });
    const existingMap = new Map(existingControls.map(c => [c.controlId, c.id]));

    // Process each control
    for (let i = 0; i < dto.controls.length; i++) {
      const controlData = dto.controls[i];
      const rowNum = i + 1;

      try {
        const existingId = existingMap.get(controlData.controlId);

        if (existingId) {
          // Control already exists
          if (dto.updateExisting) {
            // Update the existing control
            await this.prisma.control.update({
              where: { id: existingId },
              data: {
                title: controlData.title,
                description: controlData.description,
                category: controlData.category,
                subcategory: controlData.subcategory || null,
                tags: controlData.tags || [],
                guidance: controlData.guidance || null,
                automationSupported: controlData.automationSupported || false,
              },
            });
            result.updated++;
          } else if (dto.skipExisting) {
            // Skip this control
            result.skipped++;
          } else {
            // Fail on duplicate
            result.errors.push({
              controlId: controlData.controlId,
              error: 'Control ID already exists',
              row: rowNum,
            });
          }
        } else {
          // Create new control
          const control = await this.prisma.control.create({
            data: {
              controlId: controlData.controlId,
              title: controlData.title,
              description: controlData.description,
              category: controlData.category,
              subcategory: controlData.subcategory || null,
              tags: controlData.tags || [],
              guidance: controlData.guidance || null,
              automationSupported: controlData.automationSupported || false,
              organizationId,
              isCustom: true,
            },
          });

          // Create default implementation for org
          await this.prisma.controlImplementation.create({
            data: {
              controlId: control.id,
              organizationId,
              status: ControlImplementationStatus.not_started,
              testingFrequency: 'quarterly',
              createdBy: userId,
              updatedBy: userId,
            },
          });

          result.created++;
        }
      } catch (error) {
        result.errors.push({
          controlId: controlData.controlId,
          error: error.message || 'Unknown error',
          row: rowNum,
        });
      }
    }

    // Audit log bulk upload
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'bulk_uploaded',
      entityType: 'control',
      entityId: 'bulk',
      entityName: 'Bulk Upload',
      description: `Bulk uploaded controls: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
      metadata: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
      },
    });

    return result;
  }

  // Parse CSV content into control objects
  parseCSV(csvContent: string): BulkControlItemDto[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const requiredHeaders = ['controlid', 'title', 'description', 'category'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new BadRequestException(`Missing required CSV column: ${required}`);
      }
    }

    const controls: BulkControlItemDto[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        throw new BadRequestException(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Map CSV columns to DTO
      const control: BulkControlItemDto = {
        controlId: row['controlid'] || row['control_id'] || row['id'],
        title: row['title'] || row['name'],
        description: row['description'],
        category: row['category'] as any,
        subcategory: row['subcategory'] || row['sub_category'] || undefined,
        tags: row['tags'] ? row['tags'].split(';').map(t => t.trim()).filter(Boolean) : undefined,
        guidance: row['guidance'] || row['implementation_guidance'] || undefined,
        automationSupported: row['automationsupported'] === 'true' || row['automation_supported'] === 'true',
      };

      controls.push(control);
    }

    return controls;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Generate CSV template
  getCSVTemplate(): string {
    const headers = [
      'controlId',
      'title', 
      'description',
      'category',
      'subcategory',
      'tags',
      'guidance',
      'automationSupported',
    ];

    const exampleRow = [
      'CUSTOM-001',
      'Example Control',
      'This is an example control description',
      'access_control',
      'authentication',
      'mfa;sso;identity',
      'Implement MFA for all user accounts',
      'true',
    ];

    return [
      headers.join(','),
      exampleRow.map(v => `"${v}"`).join(','),
    ].join('\n');
  }
}

