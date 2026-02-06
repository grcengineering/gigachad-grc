import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ControlImplementationStatus, Prisma } from '@prisma/client';
import {
  CreateControlDto,
  UpdateControlDto,
  ControlFilterDto,
  BulkUploadControlsDto,
  BulkUploadResultDto,
  BulkControlItemDto,
  ControlCategory,
} from './dto/control.dto';
import {
  parsePaginationParams,
  createPaginatedResponse,
  getPrismaSkipTake,
  safeOrderBy,
  safePropertySet,
  isSafePropertyName,
} from '@gigachad-grc/shared';

@Injectable()
export class ControlsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  /**
   * Lightweight list endpoint - returns minimal data for fast rendering
   * Use this for table/list views where you don't need full control details
   */
  async findAllLight(organizationId: string, filters: ControlFilterDto) {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'controlId',
      sortOrder: filters.sortOrder || 'asc',
    });

    const whereConditions: Prisma.ControlWhereInput[] = [
      {
        OR: [{ organizationId: null }, { organizationId }],
      },
      { deletedAt: null },
    ];

    if (filters.category?.length) {
      whereConditions.push({ category: { in: filters.category } });
    }

    if (filters.search) {
      whereConditions.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { controlId: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.status) {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (statusArray.length > 0) {
        whereConditions.push({
          implementations: {
            some: {
              organizationId,
              status: { in: statusArray as ControlImplementationStatus[] },
            },
          },
        });
      }
    }

    const where: Prisma.ControlWhereInput = { AND: whereConditions };

    // SECURITY: Use safeOrderBy to prevent prototype pollution from user-controlled sortBy
    const orderByClause = safeOrderBy(pagination.sortBy, pagination.sortOrder);

    const [controls, total] = await Promise.all([
      this.prisma.control.findMany({
        where,
        select: {
          id: true,
          controlId: true,
          title: true,
          category: true,
          isCustom: true,
          implementations: {
            where: { organizationId },
            select: { status: true },
            take: 1,
          },
          _count: {
            select: { evidenceLinks: true },
          },
        },
        ...getPrismaSkipTake(pagination),
        orderBy: orderByClause,
      }),
      this.prisma.control.count({ where }),
    ]);

    // Transform to minimal response
    // Type assertion needed because Prisma's select inference doesn't always work correctly
    type ControlWithRelations = (typeof controls)[number] & {
      implementations: { status: string }[];
      _count: { evidenceLinks: number };
    };
    const lightControls = controls.map((control) => {
      const c = control as ControlWithRelations;
      return {
        id: c.id,
        controlId: c.controlId,
        title: c.title,
        category: c.category,
        isCustom: c.isCustom,
        status: c.implementations[0]?.status || 'not_started',
        evidenceCount: c._count.evidenceLinks,
      };
    });

    return createPaginatedResponse(lightControls, total, pagination);
  }

  async findAll(organizationId: string, filters: ControlFilterDto) {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'controlId',
      sortOrder: filters.sortOrder || 'asc',
    });

    const fullWhereConditions: Prisma.ControlWhereInput[] = [
      {
        OR: [
          { organizationId: null }, // System controls
          { organizationId }, // Org-specific controls
        ],
      },
      { deletedAt: null }, // Filter out soft-deleted records
    ];

    if (filters.category?.length) {
      fullWhereConditions.push({ category: { in: filters.category } });
    }

    if (filters.tags?.length) {
      fullWhereConditions.push({ tags: { hasSome: filters.tags } });
    }

    if (filters.customOnly) {
      fullWhereConditions.push({ isCustom: true });
      fullWhereConditions.push({ organizationId });
    }

    if (filters.search) {
      fullWhereConditions.push({
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { controlId: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    // Filter by framework - only show controls mapped to this framework
    if (filters.frameworkId) {
      fullWhereConditions.push({
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
        fullWhereConditions.push({
          implementations: {
            some: {
              organizationId,
              status: { in: statusArray as ControlImplementationStatus[] },
            },
          },
        });
      }
    }

    const fullWhere: Prisma.ControlWhereInput = { AND: fullWhereConditions };

    // SECURITY: Use safeOrderBy to prevent prototype pollution from user-controlled sortBy
    const fullOrderByClause = safeOrderBy(pagination.sortBy, pagination.sortOrder);

    const [controls, total] = await Promise.all([
      this.prisma.control.findMany({
        where: fullWhere,
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
        orderBy: fullOrderByClause,
      }),
      this.prisma.control.count({ where: fullWhere }),
    ]);

    // Transform to include implementation status
    // Type assertion needed because Prisma's include inference doesn't always work correctly
    type ControlWithFullRelations = (typeof controls)[number] & {
      implementations: Array<Record<string, unknown>>;
      mappings: Array<{
        framework: { id: string; name: string; type: string };
        requirement: { id: string; reference: string; title: string };
      }>;
      _count: { evidenceLinks: number; policyLinks: number };
    };
    const controlsWithStatus = controls.map((control) => {
      const c = control as ControlWithFullRelations;
      return {
        ...c,
        implementation: c.implementations[0] || null,
        evidenceCount: c._count.evidenceLinks + c._count.policyLinks,
        evidenceLinkCount: c._count.evidenceLinks,
        policyLinkCount: c._count.policyLinks,
        frameworkMappings: c.mappings.map((m) => ({
          frameworkId: m.framework.id,
          frameworkName: m.framework.name,
          requirementId: m.requirement.id,
          requirementRef: m.requirement.reference,
        })),
      };
    });

    return createPaginatedResponse(controlsWithStatus, total, pagination);
  }

  async findOne(id: string, organizationId: string) {
    const control = await this.prisma.control.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ organizationId: null }, { organizationId }],
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
    userName?: string
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

    // SECURITY: Explicit field mapping to prevent mass assignment vulnerabilities
    const control = await this.prisma.control.create({
      data: {
        controlId: dto.controlId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        guidance: dto.guidance,
        automationSupported: dto.automationSupported,
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
    userName?: string
  ) {
    const control = await this.findOne(id, organizationId);

    // Only allow updating controls that belong to the organization
    if (control.organizationId !== organizationId) {
      throw new ConflictException('Cannot modify controls from another organization');
    }

    // SECURITY: Explicit field mapping to prevent mass assignment vulnerabilities
    const updatedControl = await this.prisma.control.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        subcategory: dto.subcategory,
        guidance: dto.guidance,
        automationSupported: dto.automationSupported,
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
    userName?: string
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
        deletedBy: userId || null, // Use null instead of 'system' to satisfy FK constraint
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

    return categories.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));
  }

  async getTags(organizationId: string) {
    const controls = await this.prisma.control.findMany({
      where: {
        deletedAt: null,
        OR: [{ organizationId: null }, { organizationId }],
      },
      select: { tags: true },
    });

    const tagCounts: Record<string, number> = {};
    controls.forEach((c) => {
      c.tags.forEach((tag) => {
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
    userName?: string
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
    const controlIds = dto.controls.map((c) => c.controlId);
    const duplicateIds = controlIds.filter((id, index) => controlIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new BadRequestException(
        `Duplicate control IDs in upload: ${[...new Set(duplicateIds)].join(', ')}`
      );
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
    const existingMap = new Map(existingControls.map((c) => [c.controlId, c.id]));

    // Separate controls into create, update, skip, and error batches
    const toCreate: typeof dto.controls = [];
    const toUpdate: { id: string; data: (typeof dto.controls)[0] }[] = [];

    for (let i = 0; i < dto.controls.length; i++) {
      const controlData = dto.controls[i];
      const rowNum = i + 1;
      const existingId = existingMap.get(controlData.controlId);

      if (existingId) {
        if (dto.updateExisting) {
          toUpdate.push({ id: existingId, data: controlData });
        } else if (dto.skipExisting) {
          result.skipped++;
        } else {
          result.errors.push({
            controlId: controlData.controlId,
            error: 'Control ID already exists',
            row: rowNum,
          });
        }
      } else {
        toCreate.push(controlData);
      }
    }

    // Batch create new controls using transaction
    if (toCreate.length > 0) {
      try {
        // Use transaction to batch create controls and implementations
        const createdControls = await this.prisma.$transaction(async (tx) => {
          // Create all controls in one operation
          const controls = await Promise.all(
            toCreate.map((controlData) =>
              tx.control.create({
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
              })
            )
          );

          // Batch create implementations
          await tx.controlImplementation.createMany({
            data: controls.map((control) => ({
              controlId: control.id,
              organizationId,
              status: ControlImplementationStatus.not_started,
              testingFrequency: 'quarterly',
              createdBy: userId,
              updatedBy: userId,
            })),
          });

          return controls;
        });

        result.created = createdControls.length;
      } catch (error) {
        // If batch fails, log error for all items
        toCreate.forEach((controlData, i) => {
          result.errors.push({
            controlId: controlData.controlId,
            error: error.message || 'Batch create failed',
            row: i + 1,
          });
        });
      }
    }

    // Batch update existing controls
    if (toUpdate.length > 0) {
      try {
        await this.prisma.$transaction(
          toUpdate.map(({ id, data }) =>
            this.prisma.control.update({
              where: { id },
              data: {
                title: data.title,
                description: data.description,
                category: data.category,
                subcategory: data.subcategory || null,
                tags: data.tags || [],
                guidance: data.guidance || null,
                automationSupported: data.automationSupported || false,
              },
            })
          )
        );
        result.updated = toUpdate.length;
      } catch {
        // If batch update fails, try individual updates
        for (const { id, data } of toUpdate) {
          try {
            await this.prisma.control.update({
              where: { id },
              data: {
                title: data.title,
                description: data.description,
                category: data.category,
                subcategory: data.subcategory || null,
                tags: data.tags || [],
                guidance: data.guidance || null,
                automationSupported: data.automationSupported || false,
              },
            });
            result.updated++;
          } catch (e) {
            result.errors.push({
              controlId: data.controlId,
              error: e.message || 'Update failed',
              row: dto.controls.findIndex((c) => c.controlId === data.controlId) + 1,
            });
          }
        }
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
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
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
        throw new BadRequestException(
          `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`
        );
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        // SECURITY: Validate header names to prevent prototype pollution from malicious CSV
        if (isSafePropertyName(header)) {
          safePropertySet(row, header, values[index]);
        }
      });

      // Map CSV columns to DTO
      const control: BulkControlItemDto = {
        controlId: row['controlid'] || row['control_id'] || row['id'],
        title: row['title'] || row['name'],
        description: row['description'],

        category: row['category'] as ControlCategory,
        subcategory: row['subcategory'] || row['sub_category'] || undefined,
        tags: row['tags']
          ? row['tags']
              .split(';')
              .map((t) => t.trim())
              .filter(Boolean)
          : undefined,
        guidance: row['guidance'] || row['implementation_guidance'] || undefined,
        automationSupported:
          row['automationsupported'] === 'true' || row['automation_supported'] === 'true',
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

    return [headers.join(','), exampleRow.map((v) => `"${v}"`).join(',')].join('\n');
  }

  // ============================================
  // Control Effectiveness Scoring
  // ============================================

  /**
   * Calculate and update the effectiveness score for a control implementation.
   * Score is based on:
   * - Implementation status (40%)
   * - Test results (30%)
   * - Evidence freshness (20%)
   * - Evidence coverage (10%)
   */
  async calculateEffectivenessScore(
    organizationId: string,
    controlId: string
  ): Promise<{ score: number; breakdown: EffectivenessBreakdown }> {
    const implementation = await this.prisma.controlImplementation.findFirst({
      where: {
        controlId,
        organizationId,
      },
      include: {
        tests: {
          orderBy: { testedAt: 'desc' },
          take: 5,
        },
        evidenceLinks: {
          include: {
            evidence: true,
          },
        },
      },
    });

    if (!implementation) {
      throw new NotFoundException('Control implementation not found');
    }

    const breakdown: EffectivenessBreakdown = {
      implementationScore: 0,
      testResultScore: 0,
      evidenceFreshnessScore: 0,
      evidenceCoverageScore: 0,
    };

    // 1. Implementation Status Score (40% weight)
    const statusScores: Record<string, number> = {
      implemented: 100,
      partially_implemented: 60,
      in_progress: 40,
      planned: 20,
      not_applicable: 100, // N/A controls are considered effective
      not_started: 0,
    };
    breakdown.implementationScore = statusScores[implementation.status] || 0;

    // 2. Test Results Score (30% weight)
    const tests = implementation.tests || [];
    if (tests.length > 0) {
      // Count passed tests (result === 'pass')
      const passedTests = tests.filter((t) => t.result === 'pass').length;
      const recentTest = tests[0];

      // Base score on pass rate
      breakdown.testResultScore = (passedTests / tests.length) * 100;

      // Penalty for stale tests (reduce by 2% per month old)
      if (recentTest) {
        const monthsOld = Math.floor(
          (Date.now() - recentTest.testedAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        const stalePenalty = Math.min(monthsOld * 2, 30); // Max 30% penalty
        breakdown.testResultScore = Math.max(0, breakdown.testResultScore - stalePenalty);
      }
    } else {
      // No tests = 50% score (not failing, but not validated)
      breakdown.testResultScore = 50;
    }

    // 3. Evidence Freshness Score (20% weight)
    const evidenceLinks = implementation.evidenceLinks || [];
    if (evidenceLinks.length > 0) {
      const now = Date.now();
      const freshnessScores = evidenceLinks.map((link) => {
        if (!link.evidence) return 0;
        const ageMonths = Math.floor(
          (now - link.evidence.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        // Fresh evidence (< 3 months) = 100, degrades by 10% per month after
        return Math.max(0, 100 - Math.max(0, (ageMonths - 3) * 10));
      });
      breakdown.evidenceFreshnessScore =
        freshnessScores.length > 0
          ? freshnessScores.reduce((a, b) => a + b, 0) / freshnessScores.length
          : 0;
    } else {
      breakdown.evidenceFreshnessScore = 0;
    }

    // 4. Evidence Coverage Score (10% weight)
    // Based on having at least 1 piece of evidence
    breakdown.evidenceCoverageScore =
      evidenceLinks.length > 0
        ? Math.min(100, evidenceLinks.length * 33) // 33% per evidence, max 100
        : 0;

    // Calculate weighted total
    const score = Math.round(
      breakdown.implementationScore * 0.4 +
        breakdown.testResultScore * 0.3 +
        breakdown.evidenceFreshnessScore * 0.2 +
        breakdown.evidenceCoverageScore * 0.1
    );

    // Update the implementation with the new score
    await this.prisma.controlImplementation.update({
      where: { id: implementation.id },
      data: { effectivenessScore: score },
    });

    // Log the calculation
    await this.auditService.log({
      action: 'control_effectiveness_calculated',
      entityType: 'control_implementation',
      entityId: implementation.id,
      organizationId,
      description: `Calculated effectiveness score: ${score}`,
      metadata: {
        score,
        breakdown,
        controlId: implementation.controlId,
      },
    });

    return { score, breakdown };
  }

  /**
   * Calculate effectiveness scores for all controls in an organization
   */
  async calculateAllEffectivenessScores(
    organizationId: string
  ): Promise<{ updated: number; averageScore: number }> {
    const implementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      select: { controlId: true },
    });

    let totalScore = 0;
    let updated = 0;

    for (const impl of implementations) {
      try {
        const result = await this.calculateEffectivenessScore(organizationId, impl.controlId);
        totalScore += result.score;
        updated++;
      } catch {
        // Skip errors for individual controls
      }
    }

    return {
      updated,
      averageScore: updated > 0 ? Math.round(totalScore / updated) : 0,
    };
  }

  /**
   * Get effectiveness score summary for an organization
   */
  async getEffectivenessSummary(organizationId: string): Promise<{
    averageScore: number;
    distribution: { range: string; count: number }[];
    byCategory: { category: string; averageScore: number; count: number }[];
    lowScoringControls: { controlId: string; title: string; score: number }[];
  }> {
    const implementations = await this.prisma.controlImplementation.findMany({
      where: { organizationId },
      include: {
        control: {
          select: {
            controlId: true,
            title: true,
            category: true,
          },
        },
      },
    });

    // Calculate average
    const scores = implementations
      .filter((i) => i.effectivenessScore !== null)
      .map((i) => i.effectivenessScore!);
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Distribution by range
    const distribution = [
      { range: '0-20 (Critical)', count: scores.filter((s) => s <= 20).length },
      { range: '21-40 (Poor)', count: scores.filter((s) => s > 20 && s <= 40).length },
      { range: '41-60 (Fair)', count: scores.filter((s) => s > 40 && s <= 60).length },
      { range: '61-80 (Good)', count: scores.filter((s) => s > 60 && s <= 80).length },
      { range: '81-100 (Excellent)', count: scores.filter((s) => s > 80).length },
    ];

    // By category
    const categoryMap = new Map<string, { total: number; count: number }>();
    for (const impl of implementations) {
      if (impl.effectivenessScore !== null && impl.control) {
        const cat = impl.control.category;
        const existing = categoryMap.get(cat) || { total: 0, count: 0 };
        existing.total += impl.effectivenessScore;
        existing.count++;
        categoryMap.set(cat, existing);
      }
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      averageScore: Math.round(data.total / data.count),
      count: data.count,
    }));

    // Low scoring controls (below 50)
    const lowScoringControls = implementations
      .filter((i) => i.effectivenessScore !== null && i.effectivenessScore < 50 && i.control)
      .sort((a, b) => (a.effectivenessScore || 0) - (b.effectivenessScore || 0))
      .slice(0, 10)
      .map((i) => ({
        controlId: i.control!.controlId,
        title: i.control!.title,
        score: i.effectivenessScore!,
      }));

    return {
      averageScore,
      distribution,
      byCategory,
      lowScoringControls,
    };
  }
}

// Types for effectiveness scoring
interface EffectivenessBreakdown {
  implementationScore: number;
  testResultScore: number;
  evidenceFreshnessScore: number;
  evidenceCoverageScore: number;
}
