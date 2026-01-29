import { Injectable, NotFoundException, ConflictException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { CreateRunbookDto, UpdateRunbookDto, CreateRunbookStepDto, RunbookStatus } from './dto/bcdr.dto';

@Injectable()
export class RunbooksService {
  private readonly logger = new Logger(RunbooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async findAll(organizationId: string, filters?: { search?: string; category?: string; status?: RunbookStatus; processId?: string }) {
    const { search, category, status, processId } = filters || {};

    // Build WHERE clauses dynamically
    const whereClauses = [
      `r.organization_id = '${organizationId}'::uuid`,
      `r.deleted_at IS NULL`,
    ];

    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      whereClauses.push(`(r.title ILIKE '%${escapedSearch}%' OR r.runbook_id ILIKE '%${escapedSearch}%')`);
    }
    if (category) {
      const escapedCategory = category.replace(/'/g, "''");
      whereClauses.push(`r.category = '${escapedCategory}'`);
    }
    if (status) {
      const escapedStatus = status.replace(/'/g, "''");
      whereClauses.push(`r.status = '${escapedStatus}'::bcdr.runbook_status`);
    }
    if (processId) {
      whereClauses.push(`r.process_id = '${processId}'::uuid`);
    }

    const whereClause = whereClauses.join(' AND ');

    const runbooks = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT r.*, 
             u.display_name as owner_name,
             bp.name as process_name,
             (SELECT COUNT(*)::integer FROM bcdr.runbook_steps WHERE runbook_id = r.id) as step_count
      FROM bcdr.runbooks r
      LEFT JOIN public.users u ON r.owner_id::text = u.id
      LEFT JOIN bcdr.business_processes bp ON r.process_id = bp.id
      WHERE ${whereClause}
      ORDER BY r.title ASC
    `);

    // Convert any BigInt values to numbers for JSON serialization
    return runbooks.map(r => ({
      ...r,
      step_count: Number(r.step_count || 0),
    }));
  }

  async findOne(id: string, organizationId: string) {
    const runbooks = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, 
             u.display_name as owner_name,
             bp.name as process_name,
             rs.name as strategy_name
      FROM bcdr.runbooks r
      LEFT JOIN shared.users u ON r.owner_id = u.id
      LEFT JOIN bcdr.business_processes bp ON r.process_id = bp.id
      LEFT JOIN bcdr.recovery_strategies rs ON r.recovery_strategy_id = rs.id
      WHERE r.id = ${id}::uuid
        AND r.organization_id = ${organizationId}::uuid
        AND r.deleted_at IS NULL
    `;

    if (!runbooks || runbooks.length === 0) {
      throw new NotFoundException(`Runbook ${id} not found`);
    }

    // Get steps
    const steps = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM bcdr.runbook_steps
      WHERE runbook_id = ${id}::uuid
      ORDER BY step_number ASC
    `;

    return {
      ...runbooks[0],
      steps,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateRunbookDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate runbookId
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM bcdr.runbooks 
      WHERE organization_id = ${organizationId}::uuid 
        AND runbook_id = ${dto.runbookId}
        AND deleted_at IS NULL
    `;

    if (existing.length > 0) {
      throw new ConflictException(`Runbook ID ${dto.runbookId} already exists`);
    }

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.runbooks (
        organization_id, runbook_id, title, description, status, category, system_name,
        process_id, recovery_strategy_id, content, version, owner_id,
        estimated_duration_minutes, required_access_level, prerequisites, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}::uuid, ${dto.runbookId}, ${dto.title}, ${dto.description || null},
        'draft'::bcdr.runbook_status, ${dto.category || null}, ${dto.systemName || null},
        ${dto.processId || null}::uuid, ${dto.recoveryStrategyId || null}::uuid,
        ${dto.content || null}, ${dto.version || '1.0'}, ${dto.ownerId || null}::uuid,
        ${dto.estimatedDurationMinutes || null}, ${dto.requiredAccessLevel || null},
        ${dto.prerequisites || null}, ${dto.tags || []}::text[],
        ${userId}::uuid, ${userId}::uuid
      )
      RETURNING *
    `;

    const runbook = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'runbook',
      entityId: runbook.id,
      entityName: runbook.title,
      description: `Created runbook "${runbook.title}" (${runbook.runbook_id})`,
    });

    return runbook;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateRunbookDto,
    userEmail?: string,
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

    const updates: string[] = ['updated_by = $2::uuid', 'updated_at = NOW()'];
    const values: any[] = [id, userId];
    let paramIndex = 3;

    if (dto.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(dto.title);
      paramIndex++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(dto.description);
      paramIndex++;
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex}::bcdr.runbook_status`);
      values.push(dto.status);
      paramIndex++;
    }
    if (dto.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(dto.category);
      paramIndex++;
    }
    if (dto.systemName !== undefined) {
      updates.push(`system_name = $${paramIndex}`);
      values.push(dto.systemName);
      paramIndex++;
    }
    if (dto.processId !== undefined) {
      updates.push(`process_id = $${paramIndex}::uuid`);
      values.push(dto.processId);
      paramIndex++;
    }
    if (dto.content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      values.push(dto.content);
      paramIndex++;
    }
    if (dto.version !== undefined) {
      updates.push(`version = $${paramIndex}`);
      values.push(dto.version);
      paramIndex++;
    }
    if (dto.ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex}::uuid`);
      values.push(dto.ownerId);
      paramIndex++;
    }
    if (dto.estimatedDurationMinutes !== undefined) {
      updates.push(`estimated_duration_minutes = $${paramIndex}`);
      values.push(dto.estimatedDurationMinutes);
      paramIndex++;
    }
    if (dto.requiredAccessLevel !== undefined) {
      updates.push(`required_access_level = $${paramIndex}`);
      values.push(dto.requiredAccessLevel);
      paramIndex++;
    }
    if (dto.prerequisites !== undefined) {
      updates.push(`prerequisites = $${paramIndex}`);
      values.push(dto.prerequisites);
      paramIndex++;
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex}::text[]`);
      values.push(dto.tags);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.runbooks SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values,
    );

    const runbook = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'runbook',
      entityId: id,
      entityName: runbook.title,
      description: `Updated runbook "${runbook.title}"`,
      changes: dto,
    });

    return runbook;
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const runbook = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.runbooks 
      SET deleted_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'runbook',
      entityId: id,
      entityName: runbook.title,
      description: `Deleted runbook "${runbook.title}"`,
    });

    return { success: true };
  }

  // Steps management
  async addStep(runbookId: string, userId: string, dto: CreateRunbookStepDto) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.runbook_steps (
        runbook_id, step_number, title, description, instructions,
        estimated_duration_minutes, requires_approval, approval_role,
        verification_steps, rollback_steps, warnings, notes
      ) VALUES (
        ${runbookId}::uuid, ${dto.stepNumber}, ${dto.title}, ${dto.description || null},
        ${dto.instructions}, ${dto.estimatedDurationMinutes || null},
        ${dto.requiresApproval || false}, ${dto.approvalRole || null},
        ${dto.verificationSteps || null}, ${dto.rollbackSteps || null},
        ${dto.warnings || null}, ${dto.notes || null}
      )
      ON CONFLICT (runbook_id, step_number) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          instructions = EXCLUDED.instructions,
          estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
          requires_approval = EXCLUDED.requires_approval,
          approval_role = EXCLUDED.approval_role,
          verification_steps = EXCLUDED.verification_steps,
          rollback_steps = EXCLUDED.rollback_steps,
          warnings = EXCLUDED.warnings,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      RETURNING *
    `;

    return result[0];
  }

  async updateStep(runbookId: string, stepNumber: number, updates: Partial<CreateRunbookStepDto>) {
    const updateFields: string[] = ['updated_at = NOW()'];
    const values: any[] = [runbookId, stepNumber];
    let paramIndex = 3;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }
    if (updates.instructions !== undefined) {
      updateFields.push(`instructions = $${paramIndex}`);
      values.push(updates.instructions);
      paramIndex++;
    }
    if (updates.estimatedDurationMinutes !== undefined) {
      updateFields.push(`estimated_duration_minutes = $${paramIndex}`);
      values.push(updates.estimatedDurationMinutes);
      paramIndex++;
    }
    if (updates.requiresApproval !== undefined) {
      updateFields.push(`requires_approval = $${paramIndex}`);
      values.push(updates.requiresApproval);
      paramIndex++;
    }
    if (updates.verificationSteps !== undefined) {
      updateFields.push(`verification_steps = $${paramIndex}`);
      values.push(updates.verificationSteps);
      paramIndex++;
    }
    if (updates.rollbackSteps !== undefined) {
      updateFields.push(`rollback_steps = $${paramIndex}`);
      values.push(updates.rollbackSteps);
      paramIndex++;
    }
    if (updates.warnings !== undefined) {
      updateFields.push(`warnings = $${paramIndex}`);
      values.push(updates.warnings);
      paramIndex++;
    }
    if (updates.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      values.push(updates.notes);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.runbook_steps SET ${updateFields.join(', ')} 
       WHERE runbook_id = $1::uuid AND step_number = $2 RETURNING *`,
      ...values,
    );

    return result[0];
  }

  async deleteStep(runbookId: string, stepNumber: number) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.runbook_steps
      WHERE runbook_id = ${runbookId}::uuid AND step_number = ${stepNumber}
    `;

    // Renumber remaining steps
    await this.prisma.$executeRaw`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY step_number) as new_number
        FROM bcdr.runbook_steps
        WHERE runbook_id = ${runbookId}::uuid
      )
      UPDATE bcdr.runbook_steps s
      SET step_number = n.new_number
      FROM numbered n
      WHERE s.id = n.id
    `;

    return { success: true };
  }

  async reorderSteps(runbookId: string, stepIds: string[]) {
    for (let i = 0; i < stepIds.length; i++) {
      await this.prisma.$executeRaw`
        UPDATE bcdr.runbook_steps
        SET step_number = ${i + 1}
        WHERE id = ${stepIds[i]}::uuid AND runbook_id = ${runbookId}::uuid
      `;
    }

    return { success: true };
  }

  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_count,
        COUNT(DISTINCT category) as category_count
      FROM bcdr.runbooks
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    return stats[0];
  }
}

