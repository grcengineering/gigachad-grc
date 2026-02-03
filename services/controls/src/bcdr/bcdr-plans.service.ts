import { Injectable, NotFoundException, ConflictException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import {
  CreateBCDRPlanDto,
  UpdateBCDRPlanDto,
  BCDRPlanFilterDto,
  PlanStatus,
} from './dto/bcdr.dto';
import { addMonths } from 'date-fns';
import {
  BCDRPlanRecord,
  PlanVersionRecord,
  PlanControlRecord,
  BusinessProcessRecord,
  PlanStatsRecord,
  CountRecord,
  IdRecord,
} from './types/bcdr-query.types';

@Injectable()
export class BCDRPlansService {
  private readonly logger = new Logger(BCDRPlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async findAll(organizationId: string, filters: BCDRPlanFilterDto) {
    const { search, planType, status, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const [plans, total] = await Promise.all([
      this.prisma.$queryRaw<BCDRPlanRecord[]>`
        SELECT bp.*, 
               u.display_name as owner_name,
               (SELECT COUNT(*) FROM bcdr.plan_controls WHERE plan_id = bp.id) as control_count
        FROM bcdr.bcdr_plans bp
        LEFT JOIN public.users u ON bp.owner_id::text = u.id
        WHERE bp.organization_id = ${organizationId}::uuid
          AND bp.deleted_at IS NULL
          AND (${searchPattern}::text IS NULL OR (bp.title ILIKE ${searchPattern} OR bp.plan_id ILIKE ${searchPattern}))
          AND (${planType}::text IS NULL OR bp.plan_type = ${planType})
          AND (${status}::text IS NULL OR bp.status = ${status})
        ORDER BY bp.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<[CountRecord]>`
        SELECT COUNT(*) as count
        FROM bcdr.bcdr_plans
        WHERE organization_id = ${organizationId}::uuid
          AND deleted_at IS NULL
      `,
    ]);

    // Convert BigInt fields to numbers for JSON serialization
    const serializedPlans = plans.map(plan => ({
      ...plan,
      control_count: plan.control_count ? Number(plan.control_count) : 0,
    }));

    return {
      data: serializedPlans,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  async findOne(id: string, organizationId: string) {
    const plans = await this.prisma.$queryRaw<BCDRPlanRecord[]>`
      SELECT bp.*, 
             u.display_name as owner_name,
             a.display_name as approver_name
      FROM bcdr.bcdr_plans bp
      LEFT JOIN public.users u ON bp.owner_id::text = u.id
      LEFT JOIN public.users a ON bp.approver_id::text = a.id
      WHERE bp.id = ${id}::uuid
        AND bp.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
    `;

    if (!plans || plans.length === 0) {
      throw new NotFoundException(`BC/DR Plan ${id} not found`);
    }

    // Get versions
    const versions = await this.prisma.$queryRaw<PlanVersionRecord[]>`
      SELECT pv.*, u.display_name as created_by_name
      FROM bcdr.plan_versions pv
      LEFT JOIN public.users u ON pv.created_by::text = u.id
      WHERE pv.plan_id = ${id}::uuid
      ORDER BY pv.created_at DESC
    `;

    // Get linked controls
    const controls = await this.prisma.$queryRaw<PlanControlRecord[]>`
      SELECT pc.*, c.control_id as ctrl_id, c.title, c.category
      FROM bcdr.plan_controls pc
      JOIN public.controls c ON pc.control_id::text = c.id
      WHERE pc.plan_id = ${id}::uuid
    `;

    // Get in-scope processes
    const processes = await this.prisma.$queryRaw<BusinessProcessRecord[]>`
      SELECT id, process_id, name, criticality_tier
      FROM bcdr.business_processes
      WHERE id = ANY(${plans[0].in_scope_processes || []}::uuid[])
        AND deleted_at IS NULL
    `;

    return {
      ...plans[0],
      versions,
      controls,
      processes,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateBCDRPlanDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate planId
    const existing = await this.prisma.$queryRaw<IdRecord[]>`
      SELECT id FROM bcdr.bcdr_plans 
      WHERE organization_id = ${organizationId}::uuid 
        AND plan_id = ${dto.planId}
        AND deleted_at IS NULL
    `;

    if (existing.length > 0) {
      throw new ConflictException(`Plan ID ${dto.planId} already exists`);
    }

    const nextReviewDue = dto.reviewFrequencyMonths
      ? addMonths(new Date(), dto.reviewFrequencyMonths)
      : addMonths(new Date(), 12);

    const result = await this.prisma.$queryRaw<BCDRPlanRecord[]>`
      INSERT INTO bcdr.bcdr_plans (
        organization_id, workspace_id, plan_id, title, description, plan_type, status,
        version, owner_id, effective_date, expiry_date, 
        scope_description, in_scope_processes, out_of_scope,
        activation_criteria, activation_authority,
        review_frequency_months, next_review_due, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}::uuid, ${dto.workspaceId || null}::uuid, 
        ${dto.planId}, ${dto.title}, ${dto.description || null}, 
        ${dto.planType}::bcdr.plan_type, 'draft'::bcdr.plan_status,
        ${dto.version || '1.0'}, ${dto.ownerId || null}::uuid,
        ${dto.effectiveDate ? new Date(dto.effectiveDate) : null}::date,
        ${dto.expiryDate ? new Date(dto.expiryDate) : null}::date,
        ${dto.scopeDescription || null}, ${dto.inScopeProcesses || []}::uuid[], 
        ${dto.outOfScope || null},
        ${dto.activationCriteria || null}, ${dto.activationAuthority || null},
        ${dto.reviewFrequencyMonths || 12}, ${nextReviewDue}, ${dto.tags || []}::text[],
        ${userId}::uuid, ${userId}::uuid
      )
      RETURNING *
    `;

    const plan = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'bcdr_plan',
      entityId: plan.id,
      entityName: plan.title,
      description: `Created BC/DR plan "${plan.title}" (${plan.plan_id})`,
      metadata: { planType: dto.planType },
    });

    return plan;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateBCDRPlanDto,
    userEmail?: string,
    userName?: string,
  ) {
    const _existing = await this.findOne(id, organizationId);

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'title', 'description', 'status', 'approved_at', 'published_at', 'version',
      'version_notes', 'owner_id', 'approver_id', 'effective_date', 'expiry_date',
      'scope_description', 'in_scope_processes', 'out_of_scope', 'activation_criteria',
      'deactivation_criteria', 'objectives', 'assumptions', 'plan_type',
      'activation_authority', 'review_frequency_months', 'tags', 'updated_by', 'updated_at',
    ]);

    const updates: string[] = ['updated_by = $2::uuid', 'updated_at = NOW()'];
    const values: (string | number | boolean | Date | string[] | null)[] = [id, userId];
    let paramIndex = 3;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: string | number | boolean | Date | string[] | null, typeCast?: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updates.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    // Helper for non-parameterized updates (like NOW())
    const addRawUpdate = (column: string, expression: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updates.push(`${column} = ${expression}`);
    };

    if (dto.title !== undefined) {
      addUpdate('title', dto.title);
    }
    if (dto.description !== undefined) {
      addUpdate('description', dto.description);
    }
    if (dto.status !== undefined) {
      addUpdate('status', dto.status, '::bcdr.plan_status');

      // Handle status changes
      if (dto.status === PlanStatus.APPROVED) {
        addRawUpdate('approved_at', 'NOW()');
      }
      if (dto.status === PlanStatus.PUBLISHED) {
        addRawUpdate('published_at', 'NOW()');
      }
    }
    if (dto.version !== undefined) {
      addUpdate('version', dto.version);
    }
    if (dto.versionNotes !== undefined) {
      addUpdate('version_notes', dto.versionNotes);
    }
    if (dto.ownerId !== undefined) {
      addUpdate('owner_id', dto.ownerId, '::uuid');
    }
    if (dto.approverId !== undefined) {
      addUpdate('approver_id', dto.approverId, '::uuid');
    }
    if (dto.effectiveDate !== undefined) {
      addUpdate('effective_date', dto.effectiveDate ? new Date(dto.effectiveDate) : null, '::date');
    }
    if (dto.expiryDate !== undefined) {
      addUpdate('expiry_date', dto.expiryDate ? new Date(dto.expiryDate) : null, '::date');
    }
    if (dto.scopeDescription !== undefined) {
      addUpdate('scope_description', dto.scopeDescription);
    }
    if (dto.inScopeProcesses !== undefined) {
      addUpdate('in_scope_processes', dto.inScopeProcesses, '::uuid[]');
    }
    if (dto.outOfScope !== undefined) {
      addUpdate('out_of_scope', dto.outOfScope);
    }
    if (dto.activationCriteria !== undefined) {
      addUpdate('activation_criteria', dto.activationCriteria);
    }
    if (dto.deactivationCriteria !== undefined) {
      addUpdate('deactivation_criteria', dto.deactivationCriteria);
    }
    if (dto.objectives !== undefined) {
      addUpdate('objectives', dto.objectives);
    }
    if (dto.assumptions !== undefined) {
      addUpdate('assumptions', dto.assumptions);
    }
    if (dto.planType !== undefined) {
      addUpdate('plan_type', dto.planType, '::bcdr.plan_type');
    }
    if (dto.activationAuthority !== undefined) {
      addUpdate('activation_authority', dto.activationAuthority);
    }
    if (dto.reviewFrequencyMonths !== undefined) {
      addUpdate('review_frequency_months', dto.reviewFrequencyMonths);
    }
    if (dto.tags !== undefined) {
      addUpdate('tags', dto.tags, '::text[]');
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
    const result = await this.prisma.$queryRawUnsafe<BCDRPlanRecord[]>(
      `UPDATE bcdr.bcdr_plans SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values,
    );

    const plan = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'bcdr_plan',
      entityId: id,
      entityName: plan.title,
      description: `Updated BC/DR plan "${plan.title}"`,
      changes: dto,
    });

    return plan;
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const plan = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.bcdr_plans 
      SET deleted_at = NOW(), deleted_by = ${userId}::uuid
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'bcdr_plan',
      entityId: id,
      entityName: plan.title,
      description: `Deleted BC/DR plan "${plan.title}"`,
    });

    return { success: true };
  }

  async uploadDocument(
    id: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    versionNumber?: string,
  ) {
    const plan = await this.findOne(id, organizationId);
    const storagePath = `bcdr/plans/${organizationId}/${id}/${file.originalname}`;

    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Create version record
    await this.prisma.$executeRaw`
      INSERT INTO bcdr.plan_versions (plan_id, version, filename, storage_path, file_size, created_by)
      VALUES (${id}::uuid, ${versionNumber || plan.version}, ${file.originalname}, ${storagePath}, ${file.size}, ${userId}::uuid)
    `;

    // Update plan
    const result = await this.prisma.$queryRaw<BCDRPlanRecord[]>`
      UPDATE bcdr.bcdr_plans
      SET filename = ${file.originalname},
          storage_path = ${storagePath},
          mime_type = ${file.mimetype},
          file_size = ${file.size},
          updated_by = ${userId}::uuid,
          updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    return result[0];
  }

  async linkControl(planId: string, controlId: string, userId: string, notes?: string) {
    const result = await this.prisma.$queryRaw<PlanControlRecord[]>`
      INSERT INTO bcdr.plan_controls (plan_id, control_id, mapping_notes, created_by)
      VALUES (${planId}::uuid, ${controlId}::uuid, ${notes || null}, ${userId}::uuid)
      ON CONFLICT (plan_id, control_id) DO UPDATE
      SET mapping_notes = EXCLUDED.mapping_notes
      RETURNING *
    `;

    return result[0];
  }

  async unlinkControl(planId: string, controlId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.plan_controls 
      WHERE plan_id = ${planId}::uuid AND control_id = ${controlId}::uuid
    `;

    return { success: true };
  }

  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<PlanStatsRecord[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(*) FILTER (WHERE status = 'in_review') as in_review_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'published') as published_count,
        COUNT(*) FILTER (WHERE next_review_due < NOW()) as overdue_review_count,
        COUNT(*) FILTER (WHERE expiry_date < NOW() AND status = 'published') as expired_count
      FROM bcdr.bcdr_plans
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    return stats[0];
  }
}

