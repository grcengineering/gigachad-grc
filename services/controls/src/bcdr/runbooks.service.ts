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

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const runbooks = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, 
             u.display_name as owner_name,
             bp.name as process_name,
             (SELECT COUNT(*)::integer FROM bcdr.runbook_steps WHERE runbook_id = r.id) as step_count
      FROM bcdr.runbooks r
      LEFT JOIN public.users u ON r.owner_id::text = u.id
      LEFT JOIN bcdr.business_processes bp ON r.process_id = bp.id
      WHERE r.organization_id = ${organizationId}::uuid
        AND r.deleted_at IS NULL
        AND (${searchPattern}::text IS NULL OR (r.title ILIKE ${searchPattern} OR r.runbook_id ILIKE ${searchPattern}))
        AND (${category}::text IS NULL OR r.category = ${category})
        AND (${status}::text IS NULL OR r.status = ${status}::bcdr.runbook_status)
        AND (${processId}::text IS NULL OR r.process_id = ${processId}::uuid)
      ORDER BY r.title ASC
    `;

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

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'title', 'description', 'status', 'category', 'system_name', 'process_id',
      'content', 'version', 'owner_id', 'estimated_duration_minutes',
      'required_access_level', 'prerequisites', 'tags', 'updated_by', 'updated_at',
    ]);

    const updates: string[] = ['updated_by = $2::uuid', 'updated_at = NOW()'];
    const values: any[] = [id, userId];
    let paramIndex = 3;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: any, typeCast?: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updates.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    if (dto.title !== undefined) {
      addUpdate('title', dto.title);
    }
    if (dto.description !== undefined) {
      addUpdate('description', dto.description);
    }
    if (dto.status !== undefined) {
      addUpdate('status', dto.status, '::bcdr.runbook_status');
    }
    if (dto.category !== undefined) {
      addUpdate('category', dto.category);
    }
    if (dto.systemName !== undefined) {
      addUpdate('system_name', dto.systemName);
    }
    if (dto.processId !== undefined) {
      addUpdate('process_id', dto.processId, '::uuid');
    }
    if (dto.content !== undefined) {
      addUpdate('content', dto.content);
    }
    if (dto.version !== undefined) {
      addUpdate('version', dto.version);
    }
    if (dto.ownerId !== undefined) {
      addUpdate('owner_id', dto.ownerId, '::uuid');
    }
    if (dto.estimatedDurationMinutes !== undefined) {
      addUpdate('estimated_duration_minutes', dto.estimatedDurationMinutes);
    }
    if (dto.requiredAccessLevel !== undefined) {
      addUpdate('required_access_level', dto.requiredAccessLevel);
    }
    if (dto.prerequisites !== undefined) {
      addUpdate('prerequisites', dto.prerequisites);
    }
    if (dto.tags !== undefined) {
      addUpdate('tags', dto.tags, '::text[]');
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
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
    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    const ALLOWED_COLUMNS = new Set([
      'title', 'description', 'instructions', 'estimated_duration_minutes',
      'requires_approval', 'verification_steps', 'rollback_steps', 'warnings',
      'notes', 'updated_at',
    ]);

    const updateFields: string[] = ['updated_at = NOW()'];
    const values: any[] = [runbookId, stepNumber];
    let paramIndex = 3;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: any) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updateFields.push(`${column} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    };

    if (updates.title !== undefined) {
      addUpdate('title', updates.title);
    }
    if (updates.description !== undefined) {
      addUpdate('description', updates.description);
    }
    if (updates.instructions !== undefined) {
      addUpdate('instructions', updates.instructions);
    }
    if (updates.estimatedDurationMinutes !== undefined) {
      addUpdate('estimated_duration_minutes', updates.estimatedDurationMinutes);
    }
    if (updates.requiresApproval !== undefined) {
      addUpdate('requires_approval', updates.requiresApproval);
    }
    if (updates.verificationSteps !== undefined) {
      addUpdate('verification_steps', updates.verificationSteps);
    }
    if (updates.rollbackSteps !== undefined) {
      addUpdate('rollback_steps', updates.rollbackSteps);
    }
    if (updates.warnings !== undefined) {
      addUpdate('warnings', updates.warnings);
    }
    if (updates.notes !== undefined) {
      addUpdate('notes', updates.notes);
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
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

