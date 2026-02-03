import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateBusinessProcessDto,
  UpdateBusinessProcessDto,
  BusinessProcessFilterDto,
  AddProcessDependencyDto,
  LinkProcessAssetDto,
  CreateVendorDependencyDto,
  UpdateVendorDependencyDto,
} from './dto/bcdr.dto';
import { addMonths } from 'date-fns';
import {
  BusinessProcessRecord,
  ProcessDependencyRecord,
  ProcessStatsRecord,
  CountRecord,
  IdRecord,
} from './types/bcdr-query.types';

/**
 * Asset link record from raw query
 */
export interface ProcessAssetRecord {
  id: string;
  process_id: string;
  asset_id: string;
  relationship_type: string;
  notes: string | null;
  name?: string;
  type?: string;
  status?: string;
}

/**
 * BIA risk record from raw query
 */
export interface BIARiskRecord {
  id: string;
  process_id: string;
  risk_id: string;
  relationship_notes: string | null;
  risk_id_code?: string;
  title?: string;
  inherent_risk_level?: string;
}

/**
 * Vendor dependency record
 */
interface VendorDependencyRecord {
  id: string;
  process_id: string;
  vendor_id: string;
  organization_id: string;
  dependency_type: string;
  vendor_rto_hours: number | null;
  vendor_rpo_hours: number | null;
  vendor_has_bcp: boolean | null;
  vendor_bcp_reviewed: Date | null;
  gap_analysis: string | null;
  mitigation_plan: string | null;
  notes: string | null;
  vendor_name?: string;
  vendor_code?: string;
  process_name?: string;
  process_rto_hours?: number | null;
  process_rpo_hours?: number | null;
  has_rto_gap?: boolean;
  has_rpo_gap?: boolean;
  criticality_tier?: string;
  rto_gap_hours?: number | null;
  rpo_gap_hours?: number | null;
}

/**
 * Dependency graph types
 */
interface DependencyGraphNode {
  id: string;
  process_id: string;
  name: string;
  criticality_tier: string;
}

interface DependencyGraphEdge {
  source: string;
  target: string;
  dependency_type: string;
}

@Injectable()
export class BusinessProcessesService {
  private readonly logger = new Logger(BusinessProcessesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters: BusinessProcessFilterDto) {
    const { search, criticalityTier, department, ownerId, isActive, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const [processes, total] = await Promise.all([
      this.prisma.$queryRaw<BusinessProcessRecord[]>`
        SELECT bp.*, 
               u.display_name as owner_name, 
               u.email as owner_email,
               (SELECT COUNT(*) FROM bcdr.process_dependencies WHERE dependent_process_id = bp.id) as dependency_count,
               (SELECT COUNT(*) FROM bcdr.process_assets WHERE process_id = bp.id) as asset_count
        FROM bcdr.business_processes bp
        LEFT JOIN public.users u ON bp.owner_id::text = u.id
        WHERE bp.organization_id = ${organizationId}::uuid
          AND bp.deleted_at IS NULL
          AND (${searchPattern}::text IS NULL OR (bp.name ILIKE ${searchPattern} OR bp.process_id ILIKE ${searchPattern}))
          AND (${criticalityTier}::text IS NULL OR bp.criticality_tier = ${criticalityTier})
          AND (${department}::text IS NULL OR bp.department = ${department})
          AND (${ownerId}::text IS NULL OR bp.owner_id = ${ownerId}::uuid)
          AND (${isActive}::boolean IS NULL OR bp.is_active = ${isActive})
        ORDER BY 
          CASE bp.criticality_tier 
            WHEN 'tier_1_critical' THEN 1 
            WHEN 'tier_2_essential' THEN 2 
            WHEN 'tier_3_important' THEN 3 
            ELSE 4 
          END,
          bp.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<[CountRecord]>`
        SELECT COUNT(*) as count
        FROM bcdr.business_processes
        WHERE organization_id = ${organizationId}::uuid
          AND deleted_at IS NULL
      `,
    ]);

    return {
      data: processes,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  async findOne(id: string, organizationId: string) {
    const process = await this.prisma.$queryRaw<BusinessProcessRecord[]>`
      SELECT bp.*, 
             u.display_name as owner_name, 
             u.email as owner_email
      FROM bcdr.business_processes bp
      LEFT JOIN shared.users u ON bp.owner_id = u.id
      WHERE bp.id = ${id}::uuid
        AND bp.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
    `;

    if (!process || process.length === 0) {
      throw new NotFoundException(`Business process ${id} not found`);
    }

    // Get dependencies
    const dependencies = await this.prisma.$queryRaw<ProcessDependencyRecord[]>`
      SELECT pd.*, 
             bp.process_id, bp.name, bp.criticality_tier
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependency_process_id = bp.id
      WHERE pd.dependent_process_id = ${id}::uuid
    `;

    // Get dependents (processes that depend on this one)
    const dependents = await this.prisma.$queryRaw<ProcessDependencyRecord[]>`
      SELECT pd.*, 
             bp.process_id, bp.name, bp.criticality_tier
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependent_process_id = bp.id
      WHERE pd.dependency_process_id = ${id}::uuid
    `;

    // Get linked assets
    const assets = await this.prisma.$queryRaw<ProcessAssetRecord[]>`
      SELECT pa.*, 
             a.name, a.type, a.status
      FROM bcdr.process_assets pa
      JOIN controls.assets a ON pa.asset_id = a.id
      WHERE pa.process_id = ${id}::uuid
    `;

    // Get linked risks
    const risks = await this.prisma.$queryRaw<BIARiskRecord[]>`
      SELECT br.*, 
             r.risk_id, r.title, r.inherent_risk_level
      FROM bcdr.bia_risks br
      JOIN controls.risks r ON br.risk_id = r.id
      WHERE br.process_id = ${id}::uuid
    `;

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
    const existing = await this.prisma.$queryRaw<IdRecord[]>`
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

    const result = await this.prisma.$queryRaw<BusinessProcessRecord[]>`
      INSERT INTO bcdr.business_processes (
        organization_id, workspace_id, process_id, name, description, department,
        owner_id, criticality_tier, business_criticality_score,
        rto_hours, rpo_hours, mtpd_hours,
        financial_impact, operational_impact, reputational_impact, regulatory_impact,
        hourly_revenue_impact, daily_revenue_impact, recovery_cost_estimate,
        review_frequency_months, next_review_due, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.workspaceId || null}::uuid, ${dto.processId}, ${dto.name}, 
        ${dto.description || null}, ${dto.department || null},
        ${dto.ownerId || null}::uuid, ${dto.criticalityTier}::bcdr.criticality_tier, 
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
        ${userId}::uuid, ${userId}::uuid
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

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'name', 'description', 'department', 'owner_id', 'criticality_tier',
      'business_criticality_score', 'rto_hours', 'rpo_hours', 'mtpd_hours',
      'financial_impact', 'operational_impact', 'reputational_impact', 'regulatory_impact',
      'hourly_revenue_impact', 'daily_revenue_impact', 'recovery_cost_estimate',
      'is_active', 'review_frequency_months', 'tags', 'updated_by', 'updated_at',
    ]);

    // Build dynamic update query
    const updates: string[] = ['updated_by = $2::uuid', 'updated_at = NOW()'];
    const values: (string | number | boolean | string[] | null)[] = [id, userId];
    let paramIndex = 3;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: string | number | boolean | string[] | null, typeCast?: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updates.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    if (dto.name !== undefined) {
      addUpdate('name', dto.name);
    }
    if (dto.description !== undefined) {
      addUpdate('description', dto.description);
    }
    if (dto.department !== undefined) {
      addUpdate('department', dto.department);
    }
    if (dto.ownerId !== undefined) {
      addUpdate('owner_id', dto.ownerId, '::uuid');
    }
    if (dto.criticalityTier !== undefined) {
      addUpdate('criticality_tier', dto.criticalityTier, '::bcdr.criticality_tier');
    }
    if (dto.businessCriticalityScore !== undefined) {
      addUpdate('business_criticality_score', dto.businessCriticalityScore);
    }
    if (dto.rtoHours !== undefined) {
      addUpdate('rto_hours', dto.rtoHours);
    }
    if (dto.rpoHours !== undefined) {
      addUpdate('rpo_hours', dto.rpoHours);
    }
    if (dto.mtpdHours !== undefined) {
      addUpdate('mtpd_hours', dto.mtpdHours);
    }
    if (dto.financialImpact !== undefined) {
      addUpdate('financial_impact', dto.financialImpact, '::bcdr.impact_level');
    }
    if (dto.operationalImpact !== undefined) {
      addUpdate('operational_impact', dto.operationalImpact, '::bcdr.impact_level');
    }
    if (dto.reputationalImpact !== undefined) {
      addUpdate('reputational_impact', dto.reputationalImpact, '::bcdr.impact_level');
    }
    if (dto.regulatoryImpact !== undefined) {
      addUpdate('regulatory_impact', dto.regulatoryImpact, '::bcdr.impact_level');
    }
    if (dto.hourlyRevenueImpact !== undefined) {
      addUpdate('hourly_revenue_impact', dto.hourlyRevenueImpact);
    }
    if (dto.dailyRevenueImpact !== undefined) {
      addUpdate('daily_revenue_impact', dto.dailyRevenueImpact);
    }
    if (dto.recoveryCostEstimate !== undefined) {
      addUpdate('recovery_cost_estimate', dto.recoveryCostEstimate);
    }
    if (dto.isActive !== undefined) {
      addUpdate('is_active', dto.isActive);
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
    const result = await this.prisma.$queryRawUnsafe<BusinessProcessRecord[]>(
      `UPDATE bcdr.business_processes SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values,
    );

    const processRecord = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'business_process',
      entityId: id,
      entityName: processRecord.name,
      description: `Updated business process "${processRecord.name}"`,
      changes: dto,
    });

    return processRecord;
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
      SET deleted_at = NOW(), deleted_by = ${userId}::uuid
      WHERE id = ${id}::uuid
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

    const result = await this.prisma.$queryRaw<BusinessProcessRecord[]>`
      UPDATE bcdr.business_processes 
      SET last_reviewed_at = NOW(),
          next_review_due = NOW() + (review_frequency_months || ' months')::interval,
          updated_by = ${userId}::uuid,
          updated_at = NOW()
      WHERE id = ${id}::uuid
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

    const result = await this.prisma.$queryRaw<ProcessDependencyRecord[]>`
      INSERT INTO bcdr.process_dependencies (
        organization_id, dependent_process_id, dependency_process_id, 
        dependency_type, description
      ) VALUES (
        ${organizationId}, ${processId}::uuid, ${dto.dependencyProcessId}::uuid,
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
      WHERE dependent_process_id = ${processId}::uuid 
        AND dependency_process_id = ${dependencyId}::uuid
    `;

    return { success: true };
  }

  async getDependencyGraph(organizationId: string) {
    // Get all processes and their dependencies for visualization
    const processes = await this.prisma.$queryRaw<DependencyGraphNode[]>`
      SELECT id, process_id, name, criticality_tier
      FROM bcdr.business_processes
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
        AND is_active = true
    `;

    const dependencies = await this.prisma.$queryRaw<DependencyGraphEdge[]>`
      SELECT pd.dependent_process_id as source, pd.dependency_process_id as target, pd.dependency_type
      FROM bcdr.process_dependencies pd
      JOIN bcdr.business_processes bp ON pd.dependent_process_id = bp.id
      WHERE bp.organization_id = ${organizationId}::uuid
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

    const result = await this.prisma.$queryRaw<ProcessAssetRecord[]>`
      INSERT INTO bcdr.process_assets (
        process_id, asset_id, relationship_type, notes, created_by
      ) VALUES (
        ${processId}::uuid, ${dto.assetId}::uuid, 
        ${dto.relationshipType || 'supports'}, ${dto.notes || null}, ${userId}::uuid
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
      WHERE process_id = ${processId}::uuid AND asset_id = ${assetId}::uuid
    `;

    return { success: true };
  }

  // Risk Links
  async linkRisk(processId: string, riskId: string, userId: string, notes?: string) {
    const result = await this.prisma.$queryRaw<BIARiskRecord[]>`
      INSERT INTO bcdr.bia_risks (process_id, risk_id, relationship_notes, created_by)
      VALUES (${processId}::uuid, ${riskId}::uuid, ${notes || null}, ${userId}::uuid)
      ON CONFLICT (process_id, risk_id) DO UPDATE
      SET relationship_notes = EXCLUDED.relationship_notes
      RETURNING *
    `;

    return result[0];
  }

  async unlinkRisk(processId: string, riskId: string) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr.bia_risks 
      WHERE process_id = ${processId}::uuid AND risk_id = ${riskId}::uuid
    `;

    return { success: true };
  }

  // Summary stats
  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<ProcessStatsRecord[]>`
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
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    return stats[0];
  }

  // ===========================================
  // VENDOR DEPENDENCY METHODS
  // ===========================================

  /**
   * Link a vendor to a business process as a BC/DR dependency.
   */
  async linkVendor(
    processId: string,
    organizationId: string,
    userId: string,
    dto: CreateVendorDependencyDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Verify process exists
    const process = await this.findOne(processId, organizationId);

    const result = await this.prisma.$queryRaw<VendorDependencyRecord[]>`
      INSERT INTO bcdr_process_vendor_dependencies (
        process_id, vendor_id, organization_id,
        dependency_type, vendor_rto_hours, vendor_rpo_hours,
        vendor_has_bcp, vendor_bcp_reviewed,
        gap_analysis, mitigation_plan, notes, created_by
      ) VALUES (
        ${processId}::uuid, ${dto.vendorId}::uuid, ${organizationId}::uuid,
        ${dto.dependencyType}, ${dto.vendorRtoHours || null}, ${dto.vendorRpoHours || null},
        ${dto.vendorHasBCP ?? null}, ${dto.vendorBCPReviewed ? new Date(dto.vendorBCPReviewed) : null},
        ${dto.gapAnalysis || null}, ${dto.mitigationPlan || null},
        ${dto.notes || null}, ${userId}::uuid
      )
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'vendor_linked',
      entityType: 'business_process',
      entityId: processId,
      entityName: process.name,
      description: `Linked vendor to business process "${process.name}"`,
      metadata: { vendorId: dto.vendorId, dependencyType: dto.dependencyType },
    });

    return result[0];
  }

  /**
   * Update a vendor dependency.
   */
  async updateVendorDependency(
    processId: string,
    dependencyId: string,
    organizationId: string,
    dto: UpdateVendorDependencyDto,
  ) {
    // Use parameterized query to prevent SQL injection
    const result = await this.prisma.$queryRaw<VendorDependencyRecord[]>`
      UPDATE bcdr_process_vendor_dependencies
      SET 
        updated_at = NOW(),
        dependency_type = COALESCE(${dto.dependencyType ?? null}, dependency_type),
        vendor_rto_hours = COALESCE(${dto.vendorRtoHours ?? null}, vendor_rto_hours),
        vendor_rpo_hours = COALESCE(${dto.vendorRpoHours ?? null}, vendor_rpo_hours),
        vendor_has_bcp = COALESCE(${dto.vendorHasBCP ?? null}, vendor_has_bcp),
        gap_analysis = CASE WHEN ${dto.gapAnalysis !== undefined} THEN ${dto.gapAnalysis ?? null} ELSE gap_analysis END,
        mitigation_plan = CASE WHEN ${dto.mitigationPlan !== undefined} THEN ${dto.mitigationPlan ?? null} ELSE mitigation_plan END,
        notes = CASE WHEN ${dto.notes !== undefined} THEN ${dto.notes ?? null} ELSE notes END
      WHERE id = ${dependencyId}::uuid
        AND process_id = ${processId}::uuid
        AND organization_id = ${organizationId}::uuid
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Unlink a vendor from a process.
   */
  async unlinkVendor(
    processId: string,
    vendorId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    await this.prisma.$executeRaw`
      DELETE FROM bcdr_process_vendor_dependencies
      WHERE process_id = ${processId}::uuid
        AND vendor_id = ${vendorId}::uuid
        AND organization_id = ${organizationId}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'vendor_unlinked',
      entityType: 'business_process',
      entityId: processId,
      description: `Unlinked vendor from business process`,
      metadata: { vendorId },
    });

    return { success: true };
  }

  /**
   * Get all vendor dependencies for a process.
   */
  async getVendorDependencies(processId: string, organizationId: string) {
    const dependencies = await this.prisma.$queryRaw<VendorDependencyRecord[]>`
      SELECT d.*,
             v.name as vendor_name,
             v.vendor_id as vendor_code,
             bp.rto_hours as process_rto_hours,
             bp.rpo_hours as process_rpo_hours,
             CASE 
               WHEN d.vendor_rto_hours IS NOT NULL AND bp.rto_hours IS NOT NULL 
                 AND d.vendor_rto_hours > bp.rto_hours 
               THEN true 
               ELSE false 
             END as has_rto_gap,
             CASE 
               WHEN d.vendor_rpo_hours IS NOT NULL AND bp.rpo_hours IS NOT NULL 
                 AND d.vendor_rpo_hours > bp.rpo_hours 
               THEN true 
               ELSE false 
             END as has_rpo_gap
      FROM bcdr_process_vendor_dependencies d
      JOIN tprm.vendors v ON d.vendor_id::text = v.id::text
      JOIN bcdr.business_processes bp ON d.process_id = bp.id
      WHERE d.process_id = ${processId}::uuid
        AND d.organization_id = ${organizationId}::uuid
      ORDER BY 
        CASE d.dependency_type 
          WHEN 'critical' THEN 1 
          WHEN 'important' THEN 2 
          ELSE 3 
        END,
        v.name ASC
    `;

    return dependencies;
  }

  /**
   * Get all vendor BC/DR gaps across the organization.
   * Returns vendors where vendor RTO/RPO exceeds process requirements.
   */
  async getVendorGaps(organizationId: string) {
    const gaps = await this.prisma.$queryRaw<VendorDependencyRecord[]>`
      SELECT 
        d.*,
        v.name as vendor_name,
        bp.name as process_name,
        bp.criticality_tier,
        bp.rto_hours as process_rto_hours,
        bp.rpo_hours as process_rpo_hours,
        (d.vendor_rto_hours - bp.rto_hours) as rto_gap_hours,
        (d.vendor_rpo_hours - bp.rpo_hours) as rpo_gap_hours
      FROM bcdr_process_vendor_dependencies d
      JOIN tprm.vendors v ON d.vendor_id::text = v.id::text
      JOIN bcdr.business_processes bp ON d.process_id = bp.id
      WHERE d.organization_id = ${organizationId}::uuid
        AND bp.deleted_at IS NULL
        AND (
          (d.vendor_rto_hours IS NOT NULL AND bp.rto_hours IS NOT NULL AND d.vendor_rto_hours > bp.rto_hours)
          OR (d.vendor_rpo_hours IS NOT NULL AND bp.rpo_hours IS NOT NULL AND d.vendor_rpo_hours > bp.rpo_hours)
          OR (d.vendor_has_bcp = false AND d.dependency_type = 'critical')
        )
      ORDER BY 
        bp.criticality_tier ASC,
        d.dependency_type ASC
    `;

    return gaps;
  }

  // ===========================================
  // BIA WIZARD METHOD
  // ===========================================

  /**
   * Create a business process from BIA wizard responses.
   * Maps user-friendly question responses to technical BIA fields.
   */
  async createFromBIAWizard(
    organizationId: string,
    userId: string,
    wizardData: {
      // Step 1: Process Identification
      name: string;
      description?: string;
      department: string;
      ownerId?: string;
      
      // Step 2: Impact Assessment (plain language mapped to levels)
      financialImpact: string; // 'none', 'minor', 'moderate', 'major', 'severe'
      operationalImpact: string;
      reputationalImpact: string;
      legalImpact: string;
      
      // Step 3: Recovery Requirements
      maxDowntimeHours: number; // maps to RTO
      maxDataLossHours: number; // maps to RPO
      
      // Step 4: Dependencies
      upstreamProcessIds?: string[];
      assetIds?: string[];
      
      // Step 5: Additional info
      peakPeriods?: string[];
      keyStakeholders?: string;
    },
    userEmail?: string,
    userName?: string,
  ) {
    // Map impact levels
    const impactMap: Record<string, string> = {
      'none': 'negligible',
      'minor': 'minor',
      'moderate': 'moderate',
      'major': 'major',
      'severe': 'catastrophic',
    };

    // Calculate criticality tier based on impacts and recovery requirements
    const impacts = [
      wizardData.financialImpact,
      wizardData.operationalImpact,
      wizardData.reputationalImpact,
      wizardData.legalImpact,
    ];
    
    const hasSevere = impacts.includes('severe');
    const hasMajor = impacts.includes('major');
    const hasModerate = impacts.includes('moderate');
    
    let criticalityTier = 'tier_4_standard';
    if (hasSevere || wizardData.maxDowntimeHours <= 4) {
      criticalityTier = 'tier_1_critical';
    } else if (hasMajor || wizardData.maxDowntimeHours <= 24) {
      criticalityTier = 'tier_2_essential';
    } else if (hasModerate || wizardData.maxDowntimeHours <= 72) {
      criticalityTier = 'tier_3_important';
    }

    // Generate process ID
    const processId = `BIA-${Date.now().toString(36).toUpperCase()}`;

    // Create the process
    const result = await this.prisma.$queryRaw<BusinessProcessRecord[]>`
      INSERT INTO bcdr.business_processes (
        organization_id, process_id, name, description, department, owner_id,
        criticality_tier, financial_impact_level, operational_impact_level,
        reputational_impact_level, legal_impact_level,
        rto_hours, rpo_hours, mtpd_hours,
        peak_periods, key_stakeholders,
        is_active, created_by, next_review_due
      ) VALUES (
        ${organizationId}::uuid, ${processId}, ${wizardData.name},
        ${wizardData.description || null}, ${wizardData.department},
        ${wizardData.ownerId || userId}::uuid,
        ${criticalityTier},
        ${impactMap[wizardData.financialImpact] || 'moderate'},
        ${impactMap[wizardData.operationalImpact] || 'moderate'},
        ${impactMap[wizardData.reputationalImpact] || 'moderate'},
        ${impactMap[wizardData.legalImpact] || 'moderate'},
        ${wizardData.maxDowntimeHours}, ${wizardData.maxDataLossHours},
        ${Math.ceil(wizardData.maxDowntimeHours * 1.5)},
        ${wizardData.peakPeriods || []}::text[],
        ${wizardData.keyStakeholders || null},
        true, ${userId}::uuid, NOW() + INTERVAL '1 year'
      )
      RETURNING *
    `;

    const process = result[0];

    // Add dependencies if provided
    if (wizardData.upstreamProcessIds && wizardData.upstreamProcessIds.length > 0) {
      for (const depId of wizardData.upstreamProcessIds) {
        try {
          await this.addDependency(process.id, organizationId, userId, {
            dependencyProcessId: depId,
            dependencyType: 'upstream',
          });
        } catch (e) {
          this.logger.warn(`Failed to add dependency ${depId}: ${e}`);
        }
      }
    }

    // Link assets if provided
    if (wizardData.assetIds && wizardData.assetIds.length > 0) {
      for (const assetId of wizardData.assetIds) {
        try {
          await this.linkAsset(process.id, organizationId, userId, {
            assetId,
            relationshipType: 'critical',
          });
        } catch (e) {
          this.logger.warn(`Failed to link asset ${assetId}: ${e}`);
        }
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'business_process',
      entityId: process.id,
      entityName: process.name,
      description: `Created business process "${process.name}" via BIA Wizard`,
      metadata: { criticalityTier, source: 'bia_wizard' },
    });

    return process;
  }
}

