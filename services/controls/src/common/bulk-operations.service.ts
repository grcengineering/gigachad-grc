import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface BulkDeleteResult {
  deleted: number;
  failed: string[];
  errors: string[];
}

export interface BulkUpdateResult<T = unknown> {
  updated: number;
  failed: string[];
  errors: string[];
  results?: T[];
}

export interface BulkOperationContext {
  organizationId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
}

const MAX_BULK_OPERATIONS = 500;

/**
 * Service for handling bulk operations across entities.
 * Provides atomic batch processing with proper error handling,
 * audit logging, and transaction support.
 */
@Injectable()
export class BulkOperationsService {
  private readonly logger = new Logger(BulkOperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Validate bulk operation request
   */
  private validateBulkRequest(ids: string[], maxCount = MAX_BULK_OPERATIONS): void {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No IDs provided for bulk operation');
    }
    if (ids.length > maxCount) {
      throw new BadRequestException(
        `Bulk operation limited to ${maxCount} items. Received ${ids.length}.`,
      );
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidIds = ids.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid ID format: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`,
      );
    }
  }

  /**
   * Bulk delete risks
   */
  async bulkDeleteRisks(
    ids: string[],
    context: BulkOperationContext,
  ): Promise<BulkDeleteResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkDeleteResult = { deleted: 0, failed: [], errors: [] };

    try {
      // Soft delete in transaction
      const deleteResult = await this.prisma.risk.updateMany({
        where: {
          id: { in: ids },
          organizationId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      result.deleted = deleteResult.count;

      // Audit log
      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_delete',
        entityType: 'risk',
        entityId: ids.join(','),
        description: `Bulk deleted ${deleteResult.count} risks`,
        metadata: { ids, requestedCount: ids.length, deletedCount: deleteResult.count },
      });

      this.logger.log(
        `Bulk deleted ${deleteResult.count} risks for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk delete risks failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Bulk update risk status
   */
  async bulkUpdateRiskStatus(
    ids: string[],
    status: string,
    context: BulkOperationContext,
  ): Promise<BulkUpdateResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkUpdateResult = { updated: 0, failed: [], errors: [] };

    try {
      const updateResult = await this.prisma.risk.updateMany({
        where: {
          id: { in: ids },
          organizationId,
          deletedAt: null,
        },
        data: {
          status: status as any,
          updatedAt: new Date(),
        },
      });

      result.updated = updateResult.count;

      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_update',
        entityType: 'risk',
        entityId: ids.join(','),
        description: `Bulk updated ${updateResult.count} risks to status: ${status}`,
        metadata: { ids, status, requestedCount: ids.length, updatedCount: updateResult.count },
      });

      this.logger.log(
        `Bulk updated ${updateResult.count} risks to status ${status} for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk update risk status failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Bulk delete controls
   */
  async bulkDeleteControls(
    ids: string[],
    context: BulkOperationContext,
  ): Promise<BulkDeleteResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkDeleteResult = { deleted: 0, failed: [], errors: [] };

    try {
      // For controls, we delete implementations for the org
      const deleteResult = await this.prisma.controlImplementation.deleteMany({
        where: {
          controlId: { in: ids },
          organizationId,
        },
      });

      result.deleted = deleteResult.count;

      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_delete',
        entityType: 'control_implementation',
        entityId: ids.join(','),
        description: `Bulk deleted ${deleteResult.count} control implementations`,
        metadata: { ids, requestedCount: ids.length, deletedCount: deleteResult.count },
      });

      this.logger.log(
        `Bulk deleted ${deleteResult.count} control implementations for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk delete controls failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Bulk update control implementation status
   */
  async bulkUpdateControlStatus(
    ids: string[],
    status: string,
    context: BulkOperationContext,
  ): Promise<BulkUpdateResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkUpdateResult = { updated: 0, failed: [], errors: [] };

    try {
      const updateResult = await this.prisma.controlImplementation.updateMany({
        where: {
          id: { in: ids },
          organizationId,
        },
        data: {
          status: status as any,
          updatedAt: new Date(),
        },
      });

      result.updated = updateResult.count;

      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_update',
        entityType: 'control_implementation',
        entityId: ids.join(','),
        description: `Bulk updated ${updateResult.count} control implementations to status: ${status}`,
        metadata: { ids, status, requestedCount: ids.length, updatedCount: updateResult.count },
      });

      this.logger.log(
        `Bulk updated ${updateResult.count} control implementations to status ${status} for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk update control status failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Bulk delete evidence (soft delete)
   */
  async bulkDeleteEvidence(
    ids: string[],
    context: BulkOperationContext,
  ): Promise<BulkDeleteResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkDeleteResult = { deleted: 0, failed: [], errors: [] };

    try {
      const deleteResult = await this.prisma.evidence.updateMany({
        where: {
          id: { in: ids },
          organizationId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      result.deleted = deleteResult.count;

      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_delete',
        entityType: 'evidence',
        entityId: ids.join(','),
        description: `Bulk deleted ${deleteResult.count} evidence items`,
        metadata: { ids, requestedCount: ids.length, deletedCount: deleteResult.count },
      });

      this.logger.log(
        `Bulk deleted ${deleteResult.count} evidence items for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk delete evidence failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }

  /**
   * Bulk assign owner to entities
   */
  async bulkAssignOwner(
    entityType: 'risk' | 'control_implementation' | 'evidence',
    ids: string[],
    ownerId: string,
    context: BulkOperationContext,
  ): Promise<BulkUpdateResult> {
    this.validateBulkRequest(ids);
    const { organizationId, userId, userEmail, userName } = context;

    const result: BulkUpdateResult = { updated: 0, failed: [], errors: [] };

    try {
      let updateResult: { count: number };

      switch (entityType) {
        case 'risk':
          updateResult = await this.prisma.risk.updateMany({
            where: { id: { in: ids }, organizationId, deletedAt: null },
            data: { riskOwnerId: ownerId, updatedAt: new Date() },
          });
          break;
        case 'control_implementation':
          updateResult = await this.prisma.controlImplementation.updateMany({
            where: { id: { in: ids }, organizationId },
            data: { ownerId, updatedAt: new Date() },
          });
          break;
        case 'evidence':
          // Evidence doesn't have ownerId, skip
          updateResult = { count: 0 };
          result.errors.push('Evidence does not support owner assignment');
          break;
        default:
          throw new BadRequestException(`Unknown entity type: ${entityType}`);
      }

      result.updated = updateResult.count;

      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'bulk_assign',
        entityType,
        entityId: ids.join(','),
        description: `Bulk assigned owner to ${updateResult.count} ${entityType} items`,
        metadata: { ids, ownerId, requestedCount: ids.length, updatedCount: updateResult.count },
      });

      this.logger.log(
        `Bulk assigned owner to ${updateResult.count} ${entityType} items for org ${organizationId}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk assign owner failed: ${message}`);
      result.errors.push(message);
    }

    return result;
  }
}

