import { Injectable, NotFoundException, ConflictException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { STORAGE_PROVIDER, StorageProvider, generateId } from '@gigachad-grc/shared';
import {
  CreateBCDRPlanDto,
  UpdateBCDRPlanDto,
  BCDRPlanFilterDto,
  PlanStatus,
} from './dto/bcdr.dto';
import { addMonths } from 'date-fns';
import { Prisma } from '@prisma/client';

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

    // Build WHERE conditions dynamically
    const whereClauses = [
      `bp.organization_id = '${organizationId}'::uuid`,
      `bp.deleted_at IS NULL`,
    ];

    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      whereClauses.push(`(bp.title ILIKE '%${escapedSearch}%' OR bp.plan_id ILIKE '%${escapedSearch}%')`);
    }

    if (planType) {
      const escapedType = planType.replace(/'/g, "''");
      whereClauses.push(`bp.plan_type = '${escapedType}'`);
    }

    if (status) {
      const escapedStatus = status.replace(/'/g, "''");
      whereClauses.push(`bp.status = '${escapedStatus}'`);
    }

    const whereClause = whereClauses.join(' AND ');

    const [plans, total] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT bp.*, 
               u.display_name as owner_name,
               (SELECT COUNT(*) FROM bcdr.plan_controls WHERE plan_id = bp.id) as control_count
        FROM bcdr.bcdr_plans bp
        LEFT JOIN public.users u ON bp.owner_id::text = u.id
        WHERE ${whereClause}
        ORDER BY bp.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM bcdr.bcdr_plans
        WHERE organization_id = '${organizationId}'::uuid
          AND deleted_at IS NULL
      `),
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
    const plans = await this.prisma.$queryRaw<any[]>`
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
    const versions = await this.prisma.$queryRaw<any[]>`
      SELECT pv.*, u.display_name as created_by_name
      FROM bcdr.plan_versions pv
      LEFT JOIN public.users u ON pv.created_by::text = u.id
      WHERE pv.plan_id = ${id}::uuid
      ORDER BY pv.created_at DESC
    `;

    // Get linked controls
    const controls = await this.prisma.$queryRaw<any[]>`
      SELECT pc.*, c.control_id as ctrl_id, c.title, c.category
      FROM bcdr.plan_controls pc
      JOIN public.controls c ON pc.control_id::text = c.id
      WHERE pc.plan_id = ${id}::uuid
    `;

    // Get in-scope processes
    const processes = await this.prisma.$queryRaw<any[]>`
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
    const existing = await this.prisma.$queryRaw<any[]>`
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

    const result = await this.prisma.$queryRaw<any[]>`
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
    const existing = await this.findOne(id, organizationId);

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
      updates.push(`status = $${paramIndex}::bcdr.plan_status`);
      values.push(dto.status);
      paramIndex++;

      // Handle status changes
      if (dto.status === PlanStatus.APPROVED) {
        updates.push('approved_at = NOW()');
      }
      if (dto.status === PlanStatus.PUBLISHED) {
        updates.push('published_at = NOW()');
      }
    }
    if (dto.version !== undefined) {
      updates.push(`version = $${paramIndex}`);
      values.push(dto.version);
      paramIndex++;
    }
    if (dto.versionNotes !== undefined) {
      updates.push(`version_notes = $${paramIndex}`);
      values.push(dto.versionNotes);
      paramIndex++;
    }
    if (dto.ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex}::uuid`);
      values.push(dto.ownerId);
      paramIndex++;
    }
    if (dto.approverId !== undefined) {
      updates.push(`approver_id = $${paramIndex}::uuid`);
      values.push(dto.approverId);
      paramIndex++;
    }
    if (dto.effectiveDate !== undefined) {
      updates.push(`effective_date = $${paramIndex}::date`);
      values.push(dto.effectiveDate ? new Date(dto.effectiveDate) : null);
      paramIndex++;
    }
    if (dto.expiryDate !== undefined) {
      updates.push(`expiry_date = $${paramIndex}::date`);
      values.push(dto.expiryDate ? new Date(dto.expiryDate) : null);
      paramIndex++;
    }
    if (dto.scopeDescription !== undefined) {
      updates.push(`scope_description = $${paramIndex}`);
      values.push(dto.scopeDescription);
      paramIndex++;
    }
    if (dto.inScopeProcesses !== undefined) {
      updates.push(`in_scope_processes = $${paramIndex}::uuid[]`);
      values.push(dto.inScopeProcesses);
      paramIndex++;
    }
    if (dto.outOfScope !== undefined) {
      updates.push(`out_of_scope = $${paramIndex}`);
      values.push(dto.outOfScope);
      paramIndex++;
    }
    if (dto.activationCriteria !== undefined) {
      updates.push(`activation_criteria = $${paramIndex}`);
      values.push(dto.activationCriteria);
      paramIndex++;
    }
    if (dto.deactivationCriteria !== undefined) {
      updates.push(`deactivation_criteria = $${paramIndex}`);
      values.push(dto.deactivationCriteria);
      paramIndex++;
    }
    if (dto.objectives !== undefined) {
      updates.push(`objectives = $${paramIndex}`);
      values.push(dto.objectives);
      paramIndex++;
    }
    if (dto.assumptions !== undefined) {
      updates.push(`assumptions = $${paramIndex}`);
      values.push(dto.assumptions);
      paramIndex++;
    }
    if (dto.planType !== undefined) {
      updates.push(`plan_type = $${paramIndex}::bcdr.plan_type`);
      values.push(dto.planType);
      paramIndex++;
    }
    if (dto.activationAuthority !== undefined) {
      updates.push(`activation_authority = $${paramIndex}`);
      values.push(dto.activationAuthority);
      paramIndex++;
    }
    if (dto.reviewFrequencyMonths !== undefined) {
      updates.push(`review_frequency_months = $${paramIndex}`);
      values.push(dto.reviewFrequencyMonths);
      paramIndex++;
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex}::text[]`);
      values.push(dto.tags);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
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
    const result = await this.prisma.$queryRaw<any[]>`
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
    const result = await this.prisma.$queryRaw<any[]>`
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
    const stats = await this.prisma.$queryRaw<any[]>`
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

