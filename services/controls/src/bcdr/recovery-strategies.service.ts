import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRecoveryStrategyDto } from './dto/bcdr.dto';

@Injectable()
export class RecoveryStrategiesService {
  private readonly logger = new Logger(RecoveryStrategiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, filters?: { search?: string; strategyType?: string; processId?: string }) {
    const { search, strategyType, processId } = filters || {};

    // Build dynamic query
    const conditions: string[] = ['rs.organization_id = $1', 'rs.deleted_at IS NULL'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`rs.name ILIKE $${paramIndex}`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (strategyType) {
      conditions.push(`rs.strategy_type = $${paramIndex}`);
      params.push(strategyType);
      paramIndex++;
    }
    if (processId) {
      conditions.push(`rs.process_id = $${paramIndex}`);
      params.push(processId);
      paramIndex++;
    }

    const strategies = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT rs.*, 
             bp.process_id, bp.name as process_name
      FROM bcdr.recovery_strategies rs
      LEFT JOIN bcdr.business_processes bp ON rs.process_id = bp.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY rs.name ASC
    `, ...params);

    return strategies;
  }

  async findOne(id: string, organizationId: string) {
    const strategies = await this.prisma.$queryRaw<any[]>`
      SELECT rs.*, 
             bp.process_id, bp.name as process_name, bp.criticality_tier
      FROM bcdr.recovery_strategies rs
      LEFT JOIN bcdr.business_processes bp ON rs.process_id = bp.id
      WHERE rs.id = ${id}
        AND rs.organization_id = ${organizationId}
        AND rs.deleted_at IS NULL
    `;

    if (!strategies || strategies.length === 0) {
      throw new NotFoundException(`Recovery strategy ${id} not found`);
    }

    // Get linked runbooks
    const runbooks = await this.prisma.$queryRaw<any[]>`
      SELECT id, runbook_id, title, status
      FROM bcdr.runbooks
      WHERE recovery_strategy_id = ${id}
        AND deleted_at IS NULL
    `;

    // Get linked assets
    const assets = await this.prisma.$queryRaw<any[]>`
      SELECT id, name, type, status
      FROM public.assets
      WHERE recovery_strategy_id = ${id}
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
    userName?: string,
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
        ${dto.strategyType || null}, ${dto.processId || null},
        ${dto.recoveryLocation || null}, ${dto.recoveryProcedure || null},
        ${dto.estimatedRecoveryTimeHours || null}, ${dto.estimatedCost || null},
        ${dto.requiredPersonnel || null}, ${dto.requiredEquipment || null},
        ${dto.requiredData || null}, ${dto.vendorName || null},
        ${dto.vendorContact || null}, ${dto.contractReference || null},
        ${dto.tags || []}::text[], ${userId}, ${userId}
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
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

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
    if (dto.strategyType !== undefined) {
      updates.push(`strategy_type = $${paramIndex}`);
      values.push(dto.strategyType);
      paramIndex++;
    }
    if (dto.processId !== undefined) {
      updates.push(`process_id = $${paramIndex}`);
      values.push(dto.processId);
      paramIndex++;
    }
    if (dto.recoveryLocation !== undefined) {
      updates.push(`recovery_location = $${paramIndex}`);
      values.push(dto.recoveryLocation);
      paramIndex++;
    }
    if (dto.recoveryProcedure !== undefined) {
      updates.push(`recovery_procedure = $${paramIndex}`);
      values.push(dto.recoveryProcedure);
      paramIndex++;
    }
    if (dto.estimatedRecoveryTimeHours !== undefined) {
      updates.push(`estimated_recovery_time_hours = $${paramIndex}`);
      values.push(dto.estimatedRecoveryTimeHours);
      paramIndex++;
    }
    if (dto.estimatedCost !== undefined) {
      updates.push(`estimated_cost = $${paramIndex}`);
      values.push(dto.estimatedCost);
      paramIndex++;
    }
    if (dto.requiredPersonnel !== undefined) {
      updates.push(`required_personnel = $${paramIndex}`);
      values.push(dto.requiredPersonnel);
      paramIndex++;
    }
    if (dto.requiredEquipment !== undefined) {
      updates.push(`required_equipment = $${paramIndex}`);
      values.push(dto.requiredEquipment);
      paramIndex++;
    }
    if (dto.requiredData !== undefined) {
      updates.push(`required_data = $${paramIndex}`);
      values.push(dto.requiredData);
      paramIndex++;
    }
    if (dto.vendorName !== undefined) {
      updates.push(`vendor_name = $${paramIndex}`);
      values.push(dto.vendorName);
      paramIndex++;
    }
    if (dto.vendorContact !== undefined) {
      updates.push(`vendor_contact = $${paramIndex}`);
      values.push(dto.vendorContact);
      paramIndex++;
    }
    if (dto.contractReference !== undefined) {
      updates.push(`contract_reference = $${paramIndex}`);
      values.push(dto.contractReference);
      paramIndex++;
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex}::text[]`);
      values.push(dto.tags);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.recovery_strategies SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      ...values,
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
    userName?: string,
  ) {
    const strategy = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.recovery_strategies 
      SET deleted_at = NOW()
      WHERE id = ${id}
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
          updated_by = ${userId},
          updated_at = NOW()
      WHERE id = ${id}
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
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
    `;

    return stats[0];
  }
}

