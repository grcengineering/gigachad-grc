import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRecoveryStrategyDto } from './dto/bcdr.dto';

@Injectable()
export class RecoveryStrategiesService {
  private readonly logger = new Logger(RecoveryStrategiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async findAll(
    organizationId: string,
    filters?: { search?: string; strategyType?: string; processId?: string }
  ) {
    const { search, strategyType, processId } = filters || {};

    // Use parameterized queries with NULL checks for conditional filtering
    const searchPattern = search ? `%${search}%` : null;

    const strategies = await this.prisma.$queryRaw<any[]>`
      SELECT rs.*, 
             bp.process_id, bp.name as process_name
      FROM bcdr.recovery_strategies rs
      LEFT JOIN bcdr.business_processes bp ON rs.process_id = bp.id
      WHERE rs.organization_id = ${organizationId}::uuid
        AND rs.deleted_at IS NULL
        AND (${searchPattern}::text IS NULL OR rs.name ILIKE ${searchPattern})
        AND (${strategyType}::text IS NULL OR rs.strategy_type = ${strategyType})
        AND (${processId}::text IS NULL OR rs.process_id = ${processId}::uuid)
      ORDER BY rs.name ASC
    `;

    return strategies;
  }

  async findOne(id: string, organizationId: string) {
    const strategies = await this.prisma.$queryRaw<any[]>`
      SELECT rs.*, 
             bp.process_id, bp.name as process_name, bp.criticality_tier
      FROM bcdr.recovery_strategies rs
      LEFT JOIN bcdr.business_processes bp ON rs.process_id = bp.id
      WHERE rs.id = ${id}::uuid
        AND rs.organization_id = ${organizationId}::uuid
        AND rs.deleted_at IS NULL
    `;

    if (!strategies || strategies.length === 0) {
      throw new NotFoundException(`Recovery strategy ${id} not found`);
    }

    // Get linked runbooks
    const runbooks = await this.prisma.$queryRaw<any[]>`
      SELECT id, runbook_id, title, status
      FROM bcdr.runbooks
      WHERE recovery_strategy_id = ${id}::uuid
        AND deleted_at IS NULL
    `;

    // Get linked assets
    const assets = await this.prisma.$queryRaw<any[]>`
      SELECT id, name, type, status
      FROM controls.assets
      WHERE recovery_strategy_id = ${id}::uuid
        AND deleted_at IS NULL
    `;

    return {
      ...strategies[0],
      runbooks,
      assets,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateRecoveryStrategyDto,
    userEmail?: string,
    userName?: string
  ) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.recovery_strategies (
        organization_id, name, description, strategy_type, process_id,
        recovery_location, recovery_procedure, estimated_recovery_time_hours,
        estimated_cost, required_personnel, required_equipment, required_data,
        vendor_name, vendor_contact, contract_reference, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.name}, ${dto.description || null},
        ${dto.strategyType || null}, ${dto.processId || null}::uuid,
        ${dto.recoveryLocation || null}, ${dto.recoveryProcedure || null},
        ${dto.estimatedRecoveryTimeHours || null}, ${dto.estimatedCost || null},
        ${dto.requiredPersonnel || null}, ${dto.requiredEquipment || null},
        ${dto.requiredData || null}, ${dto.vendorName || null},
        ${dto.vendorContact || null}, ${dto.contractReference || null},
        ${dto.tags || []}::text[], ${userId}::uuid, ${userId}::uuid
      )
      RETURNING *
    `;

    const strategy = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'recovery_strategy',
      entityId: strategy.id,
      entityName: strategy.name,
      description: `Created recovery strategy "${strategy.name}"`,
    });

    return strategy;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: Partial<CreateRecoveryStrategyDto>,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(id, organizationId);

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'name',
      'description',
      'strategy_type',
      'process_id',
      'recovery_location',
      'recovery_procedure',
      'estimated_recovery_time_hours',
      'estimated_cost',
      'required_personnel',
      'required_equipment',
      'required_data',
      'vendor_name',
      'vendor_contact',
      'contract_reference',
      'tags',
      'updated_by',
      'updated_at',
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

    if (dto.name !== undefined) {
      addUpdate('name', dto.name);
    }
    if (dto.description !== undefined) {
      addUpdate('description', dto.description);
    }
    if (dto.strategyType !== undefined) {
      addUpdate('strategy_type', dto.strategyType);
    }
    if (dto.processId !== undefined) {
      addUpdate('process_id', dto.processId, '::uuid');
    }
    if (dto.recoveryLocation !== undefined) {
      addUpdate('recovery_location', dto.recoveryLocation);
    }
    if (dto.recoveryProcedure !== undefined) {
      addUpdate('recovery_procedure', dto.recoveryProcedure);
    }
    if (dto.estimatedRecoveryTimeHours !== undefined) {
      addUpdate('estimated_recovery_time_hours', dto.estimatedRecoveryTimeHours);
    }
    if (dto.estimatedCost !== undefined) {
      addUpdate('estimated_cost', dto.estimatedCost);
    }
    if (dto.requiredPersonnel !== undefined) {
      addUpdate('required_personnel', dto.requiredPersonnel);
    }
    if (dto.requiredEquipment !== undefined) {
      addUpdate('required_equipment', dto.requiredEquipment);
    }
    if (dto.requiredData !== undefined) {
      addUpdate('required_data', dto.requiredData);
    }
    if (dto.vendorName !== undefined) {
      addUpdate('vendor_name', dto.vendorName);
    }
    if (dto.vendorContact !== undefined) {
      addUpdate('vendor_contact', dto.vendorContact);
    }
    if (dto.contractReference !== undefined) {
      addUpdate('contract_reference', dto.contractReference);
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
      `UPDATE bcdr.recovery_strategies SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values
    );

    const strategy = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'recovery_strategy',
      entityId: id,
      entityName: strategy.name,
      description: `Updated recovery strategy "${strategy.name}"`,
      changes: dto,
    });

    return strategy;
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ) {
    const strategy = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.recovery_strategies 
      SET deleted_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'recovery_strategy',
      entityId: id,
      entityName: strategy.name,
      description: `Deleted recovery strategy "${strategy.name}"`,
    });

    return { success: true };
  }

  async markTested(id: string, organizationId: string, userId: string, result: string) {
    await this.findOne(id, organizationId);

    const updated = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr.recovery_strategies
      SET is_tested = true,
          last_tested_at = NOW(),
          test_result = ${result}::bcdr.test_result,
          updated_by = ${userId}::uuid,
          updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    return updated[0];
  }

  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_tested = true) as tested_count,
        COUNT(*) FILTER (WHERE is_tested = false OR is_tested IS NULL) as untested_count,
        COUNT(*) FILTER (WHERE test_result = 'passed') as passed_count,
        COUNT(*) FILTER (WHERE test_result = 'failed') as failed_count,
        AVG(estimated_recovery_time_hours) as avg_recovery_time,
        COUNT(DISTINCT strategy_type) as strategy_type_count
      FROM bcdr.recovery_strategies
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    return stats[0];
  }
}
