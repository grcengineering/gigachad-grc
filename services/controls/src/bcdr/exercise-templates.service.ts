import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateExerciseTemplateDto,
  ExerciseTemplateFilterDto,
} from './dto/bcdr.dto';
import { EXERCISE_TEMPLATE_LIBRARY, ExerciseTemplateData } from './exercise-template-library';

/**
 * Service for managing BC/DR exercise templates.
 *
 * Provides access to pre-built tabletop exercise scenarios and
 * allows organizations to create custom templates.
 */
@Injectable()
export class ExerciseTemplatesService {
  private readonly logger = new Logger(ExerciseTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all available templates (global + organization-specific).
   */
  async findAll(organizationId: string, filters: ExerciseTemplateFilterDto) {
    const { search, category, scenarioType, includeGlobal = true, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    const whereClauses = ['is_active = true'];
    
    // Include org-specific and optionally global templates
    if (includeGlobal) {
      whereClauses.push(`(organization_id = '${organizationId}'::uuid OR is_global = true)`);
    } else {
      whereClauses.push(`organization_id = '${organizationId}'::uuid`);
    }

    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      whereClauses.push(`(title ILIKE '%${escapedSearch}%' OR description ILIKE '%${escapedSearch}%')`);
    }

    if (category) {
      whereClauses.push(`category = '${category}'`);
    }

    if (scenarioType) {
      whereClauses.push(`scenario_type = '${scenarioType}'`);
    }

    const whereClause = whereClauses.join(' AND ');

    const [templates, total] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT *
        FROM bcdr_exercise_templates
        WHERE ${whereClause}
        ORDER BY is_global DESC, usage_count DESC, title ASC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM bcdr_exercise_templates
        WHERE ${whereClause}
      `),
    ]);

    return {
      data: templates,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  /**
   * Get a single template by ID.
   */
  async findOne(id: string) {
    const templates = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM bcdr_exercise_templates
      WHERE id = ${id}::uuid
    `;

    if (!templates || templates.length === 0) {
      throw new NotFoundException(`Exercise template ${id} not found`);
    }

    return templates[0];
  }

  /**
   * Get a template by its templateId (for seeding and cloning).
   */
  async findByTemplateId(templateId: string) {
    const templates = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM bcdr_exercise_templates
      WHERE template_id = ${templateId}
    `;

    return templates[0] || null;
  }

  /**
   * Clone a template to an organization (creates a copy they can edit).
   */
  async cloneToOrganization(
    templateId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const template = await this.findOne(templateId);

    // Generate new template ID
    const newTemplateId = `${template.template_id}-CLONE-${Date.now()}`;

    // Create clone
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_exercise_templates (
        organization_id, template_id, title, description,
        category, scenario_type, scenario_narrative,
        discussion_questions, injects, expected_decisions,
        facilitator_notes, estimated_duration_minutes, participant_roles,
        is_global, tags, created_by
      ) VALUES (
        ${organizationId}::uuid, ${newTemplateId}, ${template.title + ' (Copy)'},
        ${template.description}, ${template.category}, ${template.scenario_type},
        ${template.scenario_narrative}, ${template.discussion_questions}::jsonb,
        ${template.injects}::jsonb, ${template.expected_decisions}::jsonb,
        ${template.facilitator_notes}, ${template.estimated_duration_minutes},
        ${template.participant_roles}::jsonb, false, ${template.tags}::text[],
        ${userId}::uuid
      )
      RETURNING *
    `;

    // Increment usage count on original
    await this.prisma.$executeRaw`
      UPDATE bcdr_exercise_templates
      SET usage_count = usage_count + 1
      WHERE id = ${templateId}::uuid
    `;

    // Log audit
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'cloned',
      entityType: 'exercise_template',
      entityId: result[0].id,
      entityName: result[0].title,
      description: `Cloned exercise template from "${template.title}"`,
    });

    return result[0];
  }

  /**
   * Create a custom template.
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateExerciseTemplateDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate templateId
    const existing = await this.findByTemplateId(dto.templateId);
    if (existing) {
      throw new ConflictException(`Template ID ${dto.templateId} already exists`);
    }

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_exercise_templates (
        organization_id, template_id, title, description,
        category, scenario_type, scenario_narrative,
        discussion_questions, injects, expected_decisions,
        facilitator_notes, estimated_duration_minutes, participant_roles,
        is_global, tags, created_by
      ) VALUES (
        ${organizationId}::uuid, ${dto.templateId}, ${dto.title},
        ${dto.description || null}, ${dto.category}, ${dto.scenarioType},
        ${dto.scenarioNarrative}, ${JSON.stringify(dto.discussionQuestions)}::jsonb,
        ${dto.injects ? JSON.stringify(dto.injects) : null}::jsonb,
        ${dto.expectedDecisions ? JSON.stringify(dto.expectedDecisions) : null}::jsonb,
        ${dto.facilitatorNotes || null}, ${dto.estimatedDuration || null},
        ${dto.participantRoles ? JSON.stringify(dto.participantRoles) : null}::jsonb,
        false, ${dto.tags || []}::text[], ${userId}::uuid
      )
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'exercise_template',
      entityId: result[0].id,
      entityName: dto.title,
      description: `Created exercise template "${dto.title}"`,
    });

    return result[0];
  }

  /**
   * Create a template from a completed DR test.
   */
  async createFromTest(
    testId: string,
    organizationId: string,
    userId: string,
    title: string,
    userEmail?: string,
    userName?: string,
  ) {
    // Get the test
    const tests = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM bcdr.dr_tests
      WHERE id = ${testId}::uuid
        AND organization_id = ${organizationId}::uuid
    `;

    if (!tests || tests.length === 0) {
      throw new NotFoundException(`DR Test ${testId} not found`);
    }

    const test = tests[0];
    const templateId = `FROM-TEST-${test.test_id}`;

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_exercise_templates (
        organization_id, template_id, title, description,
        category, scenario_type, scenario_narrative,
        discussion_questions, facilitator_notes,
        estimated_duration_minutes,
        is_global, tags, created_by
      ) VALUES (
        ${organizationId}::uuid, ${templateId}, ${title},
        ${'Template created from DR test: ' + test.name},
        'infrastructure', ${test.test_type},
        ${test.scope_description || 'Scenario based on previous test'},
        '[]'::jsonb, ${test.lessons_learned || null},
        ${test.scheduled_duration_hours ? test.scheduled_duration_hours * 60 : null},
        false, ARRAY['from-test']::text[], ${userId}::uuid
      )
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'exercise_template',
      entityId: result[0].id,
      entityName: title,
      description: `Created exercise template from DR test "${test.name}"`,
    });

    return result[0];
  }

  /**
   * Update a template (only org-specific templates can be updated).
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: Partial<CreateExerciseTemplateDto>,
    userEmail?: string,
    userName?: string,
  ) {
    const template = await this.findOne(id);

    if (template.is_global) {
      throw new ConflictException('Global templates cannot be modified. Clone it first.');
    }

    if (template.organization_id !== organizationId) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    // Build update
    const updates: string[] = ['updated_at = NOW()'];
    
    if (dto.title) updates.push(`title = '${dto.title.replace(/'/g, "''")}'`);
    if (dto.description !== undefined) updates.push(`description = '${(dto.description || '').replace(/'/g, "''")}'`);
    if (dto.scenarioNarrative) updates.push(`scenario_narrative = '${dto.scenarioNarrative.replace(/'/g, "''")}'`);
    if (dto.discussionQuestions) updates.push(`discussion_questions = '${JSON.stringify(dto.discussionQuestions)}'::jsonb`);
    if (dto.facilitatorNotes !== undefined) updates.push(`facilitator_notes = '${(dto.facilitatorNotes || '').replace(/'/g, "''")}'`);
    if (dto.estimatedDuration) updates.push(`estimated_duration_minutes = ${dto.estimatedDuration}`);
    if (dto.tags) updates.push(`tags = ARRAY[${dto.tags.map(t => `'${t}'`).join(',')}]::text[]`);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE bcdr_exercise_templates
      SET ${updates.join(', ')}
      WHERE id = '${id}'::uuid
      RETURNING *
    `);

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'exercise_template',
      entityId: id,
      entityName: result[0].title,
      description: `Updated exercise template "${result[0].title}"`,
    });

    return result[0];
  }

  /**
   * Delete a template (only org-specific templates can be deleted).
   */
  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const template = await this.findOne(id);

    if (template.is_global) {
      throw new ConflictException('Global templates cannot be deleted');
    }

    if (template.organization_id !== organizationId) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    await this.prisma.$executeRaw`
      UPDATE bcdr_exercise_templates
      SET is_active = false
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'exercise_template',
      entityId: id,
      entityName: template.title,
      description: `Deleted exercise template "${template.title}"`,
    });

    return { success: true };
  }

  /**
   * Seed global templates from the library.
   * Idempotent - only creates templates that don't exist.
   */
  async seedGlobalTemplates() {
    let created = 0;
    let skipped = 0;

    for (const template of EXERCISE_TEMPLATE_LIBRARY) {
      const existing = await this.findByTemplateId(template.templateId);
      
      if (existing) {
        skipped++;
        continue;
      }

      try {
        await this.prisma.$queryRaw`
          INSERT INTO bcdr_exercise_templates (
            id, template_id, title, description,
            category, scenario_type, scenario_narrative,
            discussion_questions, injects, expected_decisions,
            facilitator_notes, estimated_duration_minutes, participant_roles,
            is_global, is_active, tags
          ) VALUES (
            ${template.id}::uuid, ${template.templateId}, ${template.title},
            ${template.description}, ${template.category}, ${template.scenarioType},
            ${template.scenarioNarrative},
            ${JSON.stringify(template.discussionQuestions)}::jsonb,
            ${JSON.stringify(template.injects)}::jsonb,
            ${JSON.stringify(template.expectedDecisions)}::jsonb,
            ${template.facilitatorNotes}, ${template.estimatedDuration},
            ${JSON.stringify(template.participantRoles)}::jsonb,
            true, true, ${template.tags}::text[]
          )
        `;
        created++;
      } catch (error) {
        this.logger.warn(`Failed to seed template ${template.templateId}: ${error}`);
      }
    }

    this.logger.log(`Seeded ${created} global exercise templates (${skipped} already existed)`);
    return { created, skipped };
  }

  /**
   * Get template categories with counts.
   */
  async getCategories(organizationId: string) {
    const categories = await this.prisma.$queryRaw<any[]>`
      SELECT category, COUNT(*) as count
      FROM bcdr_exercise_templates
      WHERE (organization_id = ${organizationId}::uuid OR is_global = true)
        AND is_active = true
      GROUP BY category
      ORDER BY count DESC
    `;

    return categories;
  }
}
