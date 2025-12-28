import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateBusinessProcessDto,
  UpdateBusinessProcessDto,
  BusinessProcessFilterDto,
  AddProcessDependencyDto,
  LinkProcessAssetDto,
} from './dto/bcdr.dto';
import { addMonths } from 'date-fns';

@Injectable()
export class BusinessProcessesService {
  private readonly logger = new Logger(BusinessProcessesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters: BusinessProcessFilterDto) {
    const { search, criticalityTier, department, ownerId, isActive, page = 1, limit = 25 } = filters;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 25;
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE conditions
    const conditions: string[] = [
      'bp.organization_id = $1',
      'bp.deleted_at IS NULL',
    ];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(bp.name ILIKE $${paramIndex} OR bp.process_id ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (criticalityTier) {
      conditions.push(`bp.criticality_tier = $${paramIndex}::bcdr.criticality_tier`);
      params.push(criticalityTier);
      paramIndex++;
    }

    if (department) {
      conditions.push(`bp.department = $${paramIndex}`);
      params.push(department);
      paramIndex++;
    }

    if (ownerId) {
      conditions.push(`bp.owner_id = $${paramIndex}`);
      params.push(ownerId);
      paramIndex++;
    }

    if (isActive !== undefined) {
      conditions.push(`bp.is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limitParamIdx = paramIndex;
    const offsetParamIdx = paramIndex + 1;

    // Add pagination params as integers
    params.push(limitNum);
    params.push(offset);

    try {
      const processes = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT bp.*, 
               u.display_name as owner_name, 
               u.email as owner_email,
               (SELECT COUNT(*) FROM bcdr.process_dependencies WHERE dependent_process_id = bp.id) as dependency_count,
               (SELECT COUNT(*) FROM bcdr.process_assets WHERE process_id = bp.id) as asset_count
        FROM bcdr.business_processes bp
        LEFT JOIN public.users u ON bp.owner_id = u.id
        WHERE ${whereClause}
        ORDER BY 
          CASE bp.criticality_tier 
            WHEN 'tier_1_critical' THEN 1 
            WHEN 'tier_2_essential' THEN 2 
            WHEN 'tier_3_important' THEN 3 
            ELSE 4 
          END,
          bp.name ASC
        LIMIT $${limitParamIdx}::integer OFFSET $${offsetParamIdx}::integer
      `, ...params);

      const totalResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM bcdr.business_processes bp
        WHERE ${whereClause}
      `, ...params.slice(0, -2)); // Exclude limit/offset params

      const total = Number(totalResult[0]?.count || 0);

      return {
        data: processes,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      this.logger.error(`Error fetching business processes: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: string, organizationId: string) {
    const process = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT bp.*, 
             u.display_name as owner_name, 
             u.email as owner_email
      FROM bcdr.business_processes bp
      LEFT JOIN public.users u ON bp.owner_id = u.id
      WHERE bp.id = $1
        AND bp.organization_id = $2
        AND bp.deleted_at IS NULL
    `, id, organizationId);

    if (!process || process.length === 0) {
      throw new NotFoundException(`Business process ${id} not found`);
    }

    // Get dependencies
    const dependencies = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT pd.*, 
             bp.process_id, bp.name, bp.criticality_tier
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependency_process_id = bp.id
      WHERE pd.dependent_process_id = $1
    `, id);

    // Get dependents (processes that depend on this one)
    const dependents = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT pd.*, 
             bp.process_id, bp.name, bp.criticality_tier
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependent_process_id = bp.id
      WHERE pd.dependency_process_id = $1
    `, id);

    // Get linked assets
    const assets = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT pa.*, 
             a.name, a.type, a.status
      FROM bcdr.process_assets pa
      JOIN public.assets a ON pa.asset_id = a.id
      WHERE pa.process_id = $1
    `, id);

    // Get linked risks (handle case where bia_risks table may not exist)
    let risks: any[] = [];
    try {
      risks = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT br.*
        FROM bcdr.bia_risks br
        WHERE br.process_id = $1
      `, id);
    } catch (error: any) {
      // PostgreSQL undefined_table error code is 42P01
      if (error?.code === '42P01') {
        const logger = new Logger(BusinessProcessesService.name);
        logger.warn('bia_risks table not found; returning empty risks array for process ' + id);
        risks = [];
      } else {
        throw error;
      }
    }

    return {
      ...process[0],
      dependencies,
      dependents,
      assets,
      risks,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateBusinessProcessDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate processId
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM bcdr.business_processes 
      WHERE organization_id = ${organizationId} 
        AND process_id = ${dto.processId}
        AND deleted_at IS NULL
    `;

    if (existing.length > 0) {
      throw new ConflictException(`Process ID ${dto.processId} already exists`);
    }

    const nextReviewDue = dto.reviewFrequencyMonths
      ? addMonths(new Date(), dto.reviewFrequencyMonths)
      : addMonths(new Date(), 12);

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.business_processes (
        organization_id, workspace_id, process_id, name, description, department,
        owner_id, criticality_tier, business_criticality_score,
        rto_hours, rpo_hours, mtpd_hours,
        financial_impact, operational_impact, reputational_impact, regulatory_impact,
        hourly_revenue_impact, daily_revenue_impact, recovery_cost_estimate,
        review_frequency_months, next_review_due, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.workspaceId || null}, ${dto.processId}, ${dto.name}, 
        ${dto.description || null}, ${dto.department || null},
        ${dto.ownerId || null}, ${dto.criticalityTier}::bcdr.criticality_tier, 
        ${dto.businessCriticalityScore || null},
        ${dto.rtoHours || null}, ${dto.rpoHours || null}, ${dto.mtpdHours || null},
        ${dto.financialImpact || null}::bcdr.impact_level, 
        ${dto.operationalImpact || null}::bcdr.impact_level,
        ${dto.reputationalImpact || null}::bcdr.impact_level, 
        ${dto.regulatoryImpact || null}::bcdr.impact_level,
        ${dto.hourlyRevenueImpact || null}, ${dto.dailyRevenueImpact || null}, 
        ${dto.recoveryCostEstimate || null},
        ${dto.reviewFrequencyMonths || 12}, ${nextReviewDue}, 
        ${dto.tags || []}::text[],
        ${userId}, ${userId}
      )
      RETURNING *
    `;

    const process = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'business_process',
      entityId: process.id,
      entityName: process.name,
      description: `Created business process "${process.name}" (${process.process_id})`,
      metadata: {
        criticalityTier: dto.criticalityTier,
        rtoHours: dto.rtoHours,
        rpoHours: dto.rpoHours,
      },
    });

    return process;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateBusinessProcessDto,
    userEmail?: string,
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

    // Build dynamic update query
    const updates: string[] = ['updated_by = $2', 'updated_at = NOW()'];
    const values: any[] = [id, userId];
    let paramIndex = 3;

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(dto.name);
      paramIndex++;
    }
    if (dto.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(dto.description);
      paramIndex++;
    }
    if (dto.department !== undefined) {
      updates.push(`department = $${paramIndex}`);
      values.push(dto.department);
      paramIndex++;
    }
    if (dto.ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex}`);
      values.push(dto.ownerId);
      paramIndex++;
    }
    if (dto.criticalityTier !== undefined) {
      updates.push(`criticality_tier = $${paramIndex}::bcdr.criticality_tier`);
      values.push(dto.criticalityTier);
      paramIndex++;
    }
    if (dto.businessCriticalityScore !== undefined) {
      updates.push(`business_criticality_score = $${paramIndex}`);
      values.push(dto.businessCriticalityScore);
      paramIndex++;
    }
    if (dto.rtoHours !== undefined) {
      updates.push(`rto_hours = $${paramIndex}`);
      values.push(dto.rtoHours);
      paramIndex++;
    }
    if (dto.rpoHours !== undefined) {
      updates.push(`rpo_hours = $${paramIndex}`);
      values.push(dto.rpoHours);
      paramIndex++;
    }
    if (dto.mtpdHours !== undefined) {
      updates.push(`mtpd_hours = $${paramIndex}`);
      values.push(dto.mtpdHours);
      paramIndex++;
    }
    if (dto.financialImpact !== undefined) {
      updates.push(`financial_impact = $${paramIndex}::bcdr.impact_level`);
      values.push(dto.financialImpact);
      paramIndex++;
    }
    if (dto.operationalImpact !== undefined) {
      updates.push(`operational_impact = $${paramIndex}::bcdr.impact_level`);
      values.push(dto.operationalImpact);
      paramIndex++;
    }
    if (dto.reputationalImpact !== undefined) {
      updates.push(`reputational_impact = $${paramIndex}::bcdr.impact_level`);
      values.push(dto.reputationalImpact);
      paramIndex++;
    }
    if (dto.regulatoryImpact !== undefined) {
      updates.push(`regulatory_impact = $${paramIndex}::bcdr.impact_level`);
      values.push(dto.regulatoryImpact);
      paramIndex++;
    }
    if (dto.hourlyRevenueImpact !== undefined) {
      updates.push(`hourly_revenue_impact = $${paramIndex}`);
      values.push(dto.hourlyRevenueImpact);
      paramIndex++;
    }
    if (dto.dailyRevenueImpact !== undefined) {
      updates.push(`daily_revenue_impact = $${paramIndex}`);
      values.push(dto.dailyRevenueImpact);
      paramIndex++;
    }
    if (dto.recoveryCostEstimate !== undefined) {
      updates.push(`recovery_cost_estimate = $${paramIndex}`);
      values.push(dto.recoveryCostEstimate);
      paramIndex++;
    }
    if (dto.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(dto.isActive);
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
      `UPDATE bcdr.business_processes SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      ...values,
    );

    const process = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'business_process',
      entityId: id,
      entityName: process.name,
      description: `Updated business process "${process.name}"`,
      changes: dto,
    });

    return process;
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const process = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.business_processes 
      SET deleted_at = NOW(), deleted_by = ${userId}
      WHERE id = ${id}
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'business_process',
      entityId: id,
      entityName: process.name,
      description: `Deleted business process "${process.name}"`,
    });

    return { success: true };
  }

  async markReviewed(id: string, organizationId: string, userId: string) {
    await this.findOne(id, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr.business_processes 
      SET last_reviewed_at = NOW(),
          next_review_due = NOW() + (review_frequency_months || ' months')::interval,
          updated_by = ${userId},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return result[0];
  }

  // Dependencies
  async addDependency(
    processId: string,
    organizationId: string,
    userId: string,
    dto: AddProcessDependencyDto,
  ) {
    await this.findOne(processId, organizationId);
    await this.findOne(dto.dependencyProcessId, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.process_dependencies (
        organization_id, dependent_process_id, dependency_process_id, 
        dependency_type, description
      ) VALUES (
        ${organizationId}, ${processId}, ${dto.dependencyProcessId},
        ${dto.dependencyType || 'required'}, ${dto.description || null}
      )
      ON CONFLICT (dependent_process_id, dependency_process_id) DO UPDATE
      SET dependency_type = EXCLUDED.dependency_type, description = EXCLUDED.description
      RETURNING *
    `;

    return result[0];
  }

  async removeDependency(processId: string, dependencyId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.process_dependencies 
      WHERE dependent_process_id = ${processId} 
        AND dependency_process_id = ${dependencyId}
    `;

    return { success: true };
  }

  async getDependencyGraph(organizationId: string) {
    // Get all processes and their dependencies for visualization
    const processes = await this.prisma.$queryRaw<any[]>`
      SELECT id, process_id, name, criticality_tier
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
        AND is_active = true
    `;

    const dependencies = await this.prisma.$queryRaw<any[]>`
      SELECT pd.dependent_process_id as source, pd.dependency_process_id as target, pd.dependency_type
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependent_process_id = bp.id
      WHERE bp.organization_id = ${organizationId}
    `;

    return {
      nodes: processes.map((p) => ({
        id: p.id,
        label: p.name,
        processId: p.process_id,
        tier: p.criticality_tier,
      })),
      edges: dependencies.map((d) => ({
        source: d.source,
        target: d.target,
        type: d.dependency_type,
      })),
    };
  }

  // Asset Links
  async linkAsset(processId: string, organizationId: string, userId: string, dto: LinkProcessAssetDto) {
    await this.findOne(processId, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.process_assets (
        process_id, asset_id, relationship_type, notes, created_by
      ) VALUES (
        ${processId}, ${dto.assetId}, 
        ${dto.relationshipType || 'supports'}, ${dto.notes || null}, ${userId}
      )
      ON CONFLICT (process_id, asset_id) DO UPDATE
      SET relationship_type = EXCLUDED.relationship_type, notes = EXCLUDED.notes
      RETURNING *
    `;

    return result[0];
  }

  async unlinkAsset(processId: string, assetId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.process_assets 
      WHERE process_id = ${processId} AND asset_id = ${assetId}
    `;

    return { success: true };
  }

  // Risk Links
  async linkRisk(processId: string, riskId: string, userId: string, notes?: string) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.bia_risks (process_id, risk_id, relationship_notes, created_by)
      VALUES (${processId}, ${riskId}, ${notes || null}, ${userId})
      ON CONFLICT (process_id, risk_id) DO UPDATE
      SET relationship_notes = EXCLUDED.relationship_notes
      RETURNING *
    `;

    return result[0];
  }

  async unlinkRisk(processId: string, riskId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.bia_risks 
      WHERE process_id = ${processId} AND risk_id = ${riskId}
    `;

    return { success: true };
  }

  // Summary stats
  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_1_critical') as tier_1_count,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_2_essential') as tier_2_count,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_3_important') as tier_3_count,
        COUNT(*) FILTER (WHERE criticality_tier = 'tier_4_standard') as tier_4_count,
        COUNT(*) FILTER (WHERE next_review_due < NOW()) as overdue_review_count,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_count,
        AVG(rto_hours) as avg_rto,
        AVG(rpo_hours) as avg_rpo
      FROM bcdr.business_processes
      WHERE organization_id = $1
        AND deleted_at IS NULL
    `, organizationId);

    return stats[0];
  }
}

