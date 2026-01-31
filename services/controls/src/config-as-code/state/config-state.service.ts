import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

export interface ResourceStateInfo {
  resourceType: string;
  resourceId: string;
  databaseId?: string;
  lastAppliedHash: string;
  lastAppliedContent: Record<string, unknown>;
  lastAppliedAt: Date;
  appliedBy: string;
  sourceFile?: string;
}

export interface DriftItem {
  resourceType: string;
  resourceId: string;
  databaseId: string;
  field: string;
  lastAppliedValue: any;
  currentValue: any;
  changeType: 'modified' | 'added' | 'removed';
}

export interface DriftReport {
  hasDrift: boolean;
  driftCount: number;
  driftItems: DriftItem[];
  resourcesWithDrift: Array<{
    resourceType: string;
    resourceId: string;
    databaseId: string;
    fieldChanges: number;
  }>;
  resourcesNotInState: Array<{
    resourceType: string;
    resourceId: string;
    databaseId: string;
  }>;
  stateResourcesNotInDb: Array<{
    resourceType: string;
    resourceId: string;
  }>;
  checkedAt: Date;
}

export interface ConflictItem {
  resourceType: string;
  resourceId: string;
  field: string;
  terraformValue: any;
  databaseValue: any;
  lastAppliedValue: any;
  severity: 'warning' | 'error';
  recommendation: string;
}

export interface ConflictReport {
  hasConflicts: boolean;
  conflictCount: number;
  conflicts: ConflictItem[];
  safeToApply: Array<{
    resourceType: string;
    resourceId: string;
    action: 'create' | 'update' | 'no_change';
  }>;
  newResources: Array<{
    resourceType: string;
    resourceId: string;
  }>;
}

export interface LockInfo {
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: Date;
  lockReason?: string;
  expiresAt?: Date;
}

@Injectable()
export class ConfigStateService {
  private readonly logger = new Logger(ConfigStateService.name);
  private readonly LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a hash for resource content
   */
  hashContent(content: Prisma.InputJsonValue): string {
    if (typeof content !== 'object' || content === null) {
      return createHash('sha256').update(JSON.stringify(content)).digest('hex');
    }
    const normalized = JSON.stringify(content, Object.keys(content as object).sort());
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Record the applied state of a resource
   */
  async recordAppliedState(
    organizationId: string,
    userId: string,
    resource: {
      type: string;
      id: string;
      databaseId?: string;
      content: Prisma.InputJsonValue;
      sourceFile?: string;
      sourceLine?: number;
    },
    workspaceId?: string,
  ): Promise<void> {
    const hash = this.hashContent(resource.content);

    // Check if state already exists
    const existing = await this.prisma.configResourceState.findFirst({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
        resourceType: resource.type,
        resourceId: resource.id,
      },
    });

    if (existing) {
      await this.prisma.configResourceState.update({
        where: { id: existing.id },
        data: {
          databaseId: resource.databaseId,
          lastAppliedHash: hash,
          lastAppliedContent: resource.content,
          lastAppliedAt: new Date(),
          appliedBy: userId,
          sourceFile: resource.sourceFile,
          sourceLine: resource.sourceLine,
        },
      });
    } else {
      await this.prisma.configResourceState.create({
        data: {
          organizationId,
          workspaceId: workspaceId || null,
          resourceType: resource.type,
          resourceId: resource.id,
          databaseId: resource.databaseId,
          lastAppliedHash: hash,
          lastAppliedContent: resource.content,
          lastAppliedAt: new Date(),
          appliedBy: userId,
          sourceFile: resource.sourceFile,
          sourceLine: resource.sourceLine,
        },
      });
    }
  }

  /**
   * Get the last applied state for a resource
   */
  async getResourceState(
    organizationId: string,
    resourceType: string,
    resourceId: string,
    workspaceId?: string,
  ): Promise<ResourceStateInfo | null> {
    const state = await this.prisma.configResourceState.findFirst({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
        resourceType,
        resourceId,
      },
    });

    if (!state) return null;

    return {
      resourceType: state.resourceType,
      resourceId: state.resourceId,
      databaseId: state.databaseId || undefined,
      lastAppliedHash: state.lastAppliedHash,
      lastAppliedContent: state.lastAppliedContent as Record<string, unknown>,
      lastAppliedAt: state.lastAppliedAt,
      appliedBy: state.appliedBy,
      sourceFile: state.sourceFile || undefined,
    };
  }

  /**
   * Detect drift between last applied state and current database state
   */
  async detectDrift(
    organizationId: string,
    workspaceId?: string,
  ): Promise<DriftReport> {
    this.logger.log(`Detecting drift for organization ${organizationId}`);

    const report: DriftReport = {
      hasDrift: false,
      driftCount: 0,
      driftItems: [],
      resourcesWithDrift: [],
      resourcesNotInState: [],
      stateResourcesNotInDb: [],
      checkedAt: new Date(),
    };

    // Get all tracked states
    const states = await this.prisma.configResourceState.findMany({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
    });

    // Check each tracked resource
    for (const state of states) {
      const currentData = await this.getCurrentResourceData(
        organizationId,
        state.resourceType,
        state.databaseId || state.resourceId,
        workspaceId,
      );

      if (!currentData) {
        // Resource was deleted from DB
        report.stateResourcesNotInDb.push({
          resourceType: state.resourceType,
          resourceId: state.resourceId,
        });
        continue;
      }

      // Compare current data with last applied
      const lastApplied = state.lastAppliedContent as Record<string, unknown>;
      const drifts = this.compareResourceData(lastApplied, currentData);

      if (drifts.length > 0) {
        report.hasDrift = true;
        report.driftCount += drifts.length;
        
        for (const drift of drifts) {
          report.driftItems.push({
            resourceType: state.resourceType,
            resourceId: state.resourceId,
            databaseId: state.databaseId || state.resourceId,
            field: drift.field,
            lastAppliedValue: drift.lastAppliedValue,
            currentValue: drift.currentValue,
            changeType: drift.changeType,
          });
        }

        report.resourcesWithDrift.push({
          resourceType: state.resourceType,
          resourceId: state.resourceId,
          databaseId: state.databaseId || state.resourceId,
          fieldChanges: drifts.length,
        });
      }
    }

    // Find resources in DB that aren't tracked in state
    await this.findUntrackedResources(organizationId, states, report, workspaceId);

    this.logger.log(`Drift detection complete: ${report.driftCount} drifts found`);
    return report;
  }

  /**
   * Check for conflicts between Terraform content and current DB state
   */
  async detectConflicts(
    organizationId: string,
    resources: Array<{ type: string; id: string; attributes: Record<string, unknown> }>,
    workspaceId?: string,
  ): Promise<ConflictReport> {
    this.logger.log(`Detecting conflicts for ${resources.length} resources`);

    const report: ConflictReport = {
      hasConflicts: false,
      conflictCount: 0,
      conflicts: [],
      safeToApply: [],
      newResources: [],
    };

    for (const resource of resources) {
      const state = await this.getResourceState(
        organizationId,
        resource.type,
        resource.id,
        workspaceId,
      );

      const currentData = await this.getCurrentResourceDataByBusinessId(
        organizationId,
        resource.type,
        resource.id,
        workspaceId,
      );

      if (!currentData) {
        // New resource - safe to create
        report.newResources.push({
          resourceType: resource.type,
          resourceId: resource.id,
        });
        report.safeToApply.push({
          resourceType: resource.type,
          resourceId: resource.id,
          action: 'create',
        });
        continue;
      }

      if (!state) {
        // Resource exists in DB but not in state - first time managing via TF
        // Warn user that we'll overwrite
        report.conflicts.push({
          resourceType: resource.type,
          resourceId: resource.id,
          field: '*',
          terraformValue: resource.attributes,
          databaseValue: currentData,
          lastAppliedValue: null,
          severity: 'warning',
          recommendation: 'Resource exists but has never been applied via Config as Code. Values will be overwritten.',
        });
        report.hasConflicts = true;
        report.conflictCount++;
        continue;
      }

      // Compare: TF value vs DB value vs last applied value
      const lastApplied = state.lastAppliedContent;
      const conflicts = this.detectFieldConflicts(
        resource.type,
        resource.id,
        resource.attributes,
        currentData,
        lastApplied,
      );

      if (conflicts.length > 0) {
        report.hasConflicts = true;
        report.conflictCount += conflicts.length;
        report.conflicts.push(...conflicts);
      } else {
        report.safeToApply.push({
          resourceType: resource.type,
          resourceId: resource.id,
          action: 'update',
        });
      }
    }

    this.logger.log(`Conflict detection complete: ${report.conflictCount} conflicts found`);
    return report;
  }

  /**
   * Acquire a lock for apply operation
   */
  async acquireLock(
    organizationId: string,
    userId: string,
    reason?: string,
    workspaceId?: string,
  ): Promise<boolean> {
    // Clean up expired locks first
    await this.prisma.configApplyLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    try {
      await this.prisma.configApplyLock.create({
        data: {
          organizationId,
          workspaceId: workspaceId || null,
          lockedBy: userId,
          lockReason: reason,
          expiresAt: new Date(Date.now() + this.LOCK_DURATION_MS),
        },
      });
      this.logger.log(`Lock acquired for org ${organizationId} by user ${userId}`);
      return true;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        // Unique constraint violation - lock exists
        this.logger.warn(`Lock already exists for org ${organizationId}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(
    organizationId: string,
    userId: string,
    workspaceId?: string,
  ): Promise<boolean> {
    const result = await this.prisma.configApplyLock.deleteMany({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
        lockedBy: userId,
      },
    });
    
    if (result.count > 0) {
      this.logger.log(`Lock released for org ${organizationId} by user ${userId}`);
      return true;
    }
    return false;
  }

  /**
   * Check current lock status
   */
  async getLockStatus(
    organizationId: string,
    workspaceId?: string,
  ): Promise<LockInfo> {
    // Clean up expired locks
    await this.prisma.configApplyLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Prisma doesn't allow null in composite unique queries, so use findFirst
    const lock = await this.prisma.configApplyLock.findFirst({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
      include: {
        locker: {
          select: { displayName: true, email: true },
        },
      },
    });

    if (!lock) {
      return { isLocked: false };
    }

    return {
      isLocked: true,
      lockedBy: lock.locker?.displayName || lock.lockedBy,
      lockedAt: lock.lockedAt,
      lockReason: lock.lockReason || undefined,
      expiresAt: lock.expiresAt,
    };
  }

  /**
   * Record an apply operation in history
   */
  async recordApplyHistory(
    organizationId: string,
    userId: string,
    result: {
      sourceFile?: string;
      commitMessage?: string;
      resourcesCreated: number;
      resourcesUpdated: number;
      resourcesDeleted: number;
      resourcesSkipped: number;
      conflictsDetected: number;
      conflictsResolved?: string;
      durationMs?: number;
      errorCount: number;
      errors?: string[];
      warnings?: string[];
    },
    workspaceId?: string,
  ): Promise<string> {
    // Count total resources in state
    const resourceCount = await this.prisma.configResourceState.count({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
    });

    // Generate state hash
    const states = await this.prisma.configResourceState.findMany({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
      select: {
        resourceType: true,
        resourceId: true,
        lastAppliedHash: true,
      },
      orderBy: [{ resourceType: 'asc' }, { resourceId: 'asc' }],
    });

    const stateHash = this.hashContent(states);

    const history = await this.prisma.configApplyHistory.create({
      data: {
        organizationId,
        workspaceId: workspaceId || null,
        appliedBy: userId,
        sourceFile: result.sourceFile,
        commitMessage: result.commitMessage,
        resourcesCreated: result.resourcesCreated,
        resourcesUpdated: result.resourcesUpdated,
        resourcesDeleted: result.resourcesDeleted,
        resourcesSkipped: result.resourcesSkipped,
        conflictsDetected: result.conflictsDetected,
        conflictsResolved: result.conflictsResolved,
        resourceCount,
        stateHash,
        durationMs: result.durationMs,
        errorCount: result.errorCount,
        errors: result.errors,
        warnings: result.warnings,
      },
    });

    return history.id;
  }

  /**
   * Get apply history
   */
  async getApplyHistory(
    organizationId: string,
    limit: number = 20,
    workspaceId?: string,
  ) {
    return this.prisma.configApplyHistory.findMany({
      where: {
        organizationId,
        workspaceId: workspaceId || null,
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
      include: {
        applier: {
          select: { displayName: true, email: true },
        },
      },
    });
  }

  // ==========================================
  // Private helper methods
  // ==========================================

  private async getCurrentResourceData(
    organizationId: string,
    resourceType: string,
    resourceIdOrDbId: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown> | null> {
    switch (resourceType) {
      case 'control':
      case 'gigachad_grc_control':
        return this.getControlData(organizationId, resourceIdOrDbId);
      case 'framework':
      case 'gigachad_grc_framework':
        return this.getFrameworkData(organizationId, resourceIdOrDbId);
      case 'policy':
      case 'gigachad_grc_policy':
        return this.getPolicyData(organizationId, resourceIdOrDbId, workspaceId);
      case 'risk':
      case 'gigachad_grc_risk':
        return this.getRiskData(organizationId, resourceIdOrDbId, workspaceId);
      case 'vendor':
      case 'gigachad_grc_vendor':
        return this.getVendorData(organizationId, resourceIdOrDbId);
      default:
        return null;
    }
  }

  private async getCurrentResourceDataByBusinessId(
    organizationId: string,
    resourceType: string,
    businessId: string,
    workspaceId?: string,
  ): Promise<Record<string, unknown> | null> {
    switch (resourceType) {
      case 'control':
      case 'gigachad_grc_control':
        return this.getControlDataByControlId(organizationId, businessId);
      case 'framework':
      case 'gigachad_grc_framework':
        return this.getFrameworkDataByName(organizationId, businessId);
      case 'policy':
      case 'gigachad_grc_policy':
        return this.getPolicyDataByTitle(organizationId, businessId, workspaceId);
      case 'risk':
      case 'gigachad_grc_risk':
        return this.getRiskDataByTitle(organizationId, businessId, workspaceId);
      case 'vendor':
      case 'gigachad_grc_vendor':
        return this.getVendorDataByName(organizationId, businessId);
      default:
        return null;
    }
  }

  private async getControlData(organizationId: string, id: string): Promise<Record<string, unknown> | null> {
    const control = await this.prisma.control.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { controlId: id }],
        deletedAt: null,
      },
      include: {
        implementations: {
          where: { organizationId },
          take: 1,
        },
      },
    });

    if (!control) return null;

    return {
      control_id: control.controlId,
      title: control.title,
      description: control.description,
      category: control.category,
      subcategory: control.subcategory,
      tags: control.tags,
      status: control.implementations[0]?.status || 'not_started',
    };
  }

  private async getControlDataByControlId(organizationId: string, controlId: string): Promise<Record<string, unknown> | null> {
    return this.getControlData(organizationId, controlId);
  }

  private async getFrameworkData(organizationId: string, id: string): Promise<Record<string, unknown> | null> {
    const framework = await this.prisma.framework.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { name: id }],
        deletedAt: null,
      },
    });

    if (!framework) return null;

    return {
      name: framework.name,
      type: framework.type,
      version: framework.version,
      description: framework.description,
      is_active: framework.isActive,
    };
  }

  private async getFrameworkDataByName(organizationId: string, name: string): Promise<Record<string, unknown> | null> {
    return this.getFrameworkData(organizationId, name);
  }

  private async getPolicyData(organizationId: string, id: string, _workspaceId?: string): Promise<Record<string, unknown> | null> {
    const policy = await this.prisma.policy.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { title: id }],
        deletedAt: null,
      },
    });

    if (!policy) return null;

    return {
      title: policy.title,
      description: policy.description,
      category: policy.category,
      status: policy.status,
      version: policy.version,
      tags: policy.tags,
    };
  }

  private async getPolicyDataByTitle(organizationId: string, title: string, _workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.getPolicyData(organizationId, title, _workspaceId);
  }

  private async getRiskData(organizationId: string, id: string, _workspaceId?: string): Promise<Record<string, unknown> | null> {
    const risk = await this.prisma.risk.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { title: id }],
        deletedAt: null,
      },
    });

    if (!risk) return null;

    return {
      title: risk.title,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      inherent_risk: risk.inherentRisk,
    };
  }

  private async getRiskDataByTitle(organizationId: string, title: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.getRiskData(organizationId, title, workspaceId);
  }

  private async getVendorData(organizationId: string, id: string): Promise<Record<string, unknown> | null> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { name: id }],
        deletedAt: null,
      },
    });

    if (!vendor) return null;

    return {
      name: vendor.name,
      description: vendor.description,
      category: vendor.category,
      tier: vendor.tier,
      status: vendor.status,
    };
  }

  private async getVendorDataByName(organizationId: string, name: string): Promise<Record<string, unknown> | null> {
    return this.getVendorData(organizationId, name);
  }

  private compareResourceData(
    lastApplied: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Array<{ field: string; lastAppliedValue: unknown; currentValue: unknown; changeType: 'modified' | 'added' | 'removed' }> {
    const drifts: Array<{ field: string; lastAppliedValue: unknown; currentValue: unknown; changeType: 'modified' | 'added' | 'removed' }> = [];

    // Check for modified and removed fields
    for (const [key, lastValue] of Object.entries(lastApplied)) {
      const currentValue = current[key];
      
      if (!(key in current)) {
        drifts.push({
          field: key,
          lastAppliedValue: lastValue,
          currentValue: undefined,
          changeType: 'removed',
        });
      } else if (JSON.stringify(lastValue) !== JSON.stringify(currentValue)) {
        drifts.push({
          field: key,
          lastAppliedValue: lastValue,
          currentValue,
          changeType: 'modified',
        });
      }
    }

    // Check for added fields
    for (const [key, currentValue] of Object.entries(current)) {
      if (!(key in lastApplied)) {
        drifts.push({
          field: key,
          lastAppliedValue: undefined,
          currentValue,
          changeType: 'added',
        });
      }
    }

    return drifts;
  }

  private detectFieldConflicts(
    resourceType: string,
    resourceId: string,
    tfValue: Record<string, unknown>,
    dbValue: Record<string, unknown>,
    lastApplied: Record<string, unknown>,
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];

    for (const [field, tfFieldValue] of Object.entries(tfValue)) {
      const dbFieldValue = dbValue[field];
      const lastAppliedFieldValue = lastApplied[field];

      // Skip if TF value equals DB value (no conflict)
      if (JSON.stringify(tfFieldValue) === JSON.stringify(dbFieldValue)) {
        continue;
      }

      // Check if DB value has changed since last apply
      if (JSON.stringify(dbFieldValue) !== JSON.stringify(lastAppliedFieldValue)) {
        // DB changed since last apply - potential conflict
        if (JSON.stringify(tfFieldValue) === JSON.stringify(lastAppliedFieldValue)) {
          // TF hasn't changed, but DB has - UI change will be overwritten
          conflicts.push({
            resourceType,
            resourceId,
            field,
            terraformValue: tfFieldValue,
            databaseValue: dbFieldValue,
            lastAppliedValue: lastAppliedFieldValue,
            severity: 'warning',
            recommendation: `Field "${field}" was modified in the UI since last apply. Terraform will overwrite with: ${JSON.stringify(tfFieldValue)}`,
          });
        } else {
          // Both TF and DB changed - real conflict
          conflicts.push({
            resourceType,
            resourceId,
            field,
            terraformValue: tfFieldValue,
            databaseValue: dbFieldValue,
            lastAppliedValue: lastAppliedFieldValue,
            severity: 'error',
            recommendation: `Field "${field}" was modified both in Terraform and UI. Manual resolution required.`,
          });
        }
      }
    }

    return conflicts;
  }

  private async findUntrackedResources(
    organizationId: string,
    states: Array<{ resourceType: string; resourceId: string }>,
    report: DriftReport,
    _workspaceId?: string,
  ): Promise<void> {
    // Track which resources are in state
    const trackedControls = new Set(
      states.filter(s => s.resourceType === 'control' || s.resourceType === 'gigachad_grc_control')
        .map(s => s.resourceId)
    );

    // Find controls not in state
    const controls = await this.prisma.control.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: { id: true, controlId: true },
      take: 100,
    });

    for (const control of controls) {
      if (!trackedControls.has(control.controlId) && !trackedControls.has(control.id)) {
        report.resourcesNotInState.push({
          resourceType: 'control',
          resourceId: control.controlId,
          databaseId: control.id,
        });
      }
    }

    // Similar for other resource types...
    // (frameworks, policies, risks, vendors)
  }
}
