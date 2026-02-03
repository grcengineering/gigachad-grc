import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import {
  CreateDRTestDto,
  UpdateDRTestDto,
  DRTestFilterDto,
  RecordTestResultDto,
  CreateTestFindingDto,
} from './dto/bcdr.dto';

@Injectable()
export class DRTestsService {
  private readonly logger = new Logger(DRTestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string, filters: DRTestFilterDto) {
    const { search, testType, status, planId, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const tests = await this.prisma.$queryRaw<any[]>`
      SELECT dt.*, 
             u.display_name as coordinator_name,
             bp.title as plan_title,
             (SELECT COUNT(*) FROM bcdr.dr_test_findings WHERE test_id = dt.id) as finding_count
      FROM bcdr.dr_tests dt
      LEFT JOIN public.users u ON dt.coordinator_id::text = u.id
      LEFT JOIN bcdr.bcdr_plans bp ON dt.plan_id = bp.id
      WHERE dt.organization_id = ${organizationId}::uuid
        AND dt.deleted_at IS NULL
        AND (${searchPattern}::text IS NULL OR (dt.name ILIKE ${searchPattern} OR dt.test_id ILIKE ${searchPattern}))
        AND (${testType}::text IS NULL OR dt.test_type = ${testType})
        AND (${status}::text IS NULL OR dt.status = ${status})
        AND (${planId}::text IS NULL OR dt.plan_id = ${planId}::uuid)
      ORDER BY dt.scheduled_date DESC NULLS LAST, dt.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const total = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    return {
      data: tests,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  async findOne(id: string, organizationId: string) {
    const tests = await this.prisma.$queryRaw<any[]>`
      SELECT dt.*, 
             u.display_name as coordinator_name, u.email as coordinator_email,
             bp.title as plan_title
      FROM bcdr.dr_tests dt
      LEFT JOIN shared.users u ON dt.coordinator_id = u.id
      LEFT JOIN bcdr.bcdr_plans bp ON dt.plan_id = bp.id
      WHERE dt.id = ${id}::uuid
        AND dt.organization_id = ${organizationId}::uuid
        AND dt.deleted_at IS NULL
    `;

    if (!tests || tests.length === 0) {
      throw new NotFoundException(`DR Test ${id} not found`);
    }

    // Get findings
    const findings = await this.prisma.$queryRaw<any[]>`
      SELECT f.*, 
             u.display_name as remediation_owner_name,
             bp.name as affected_process_name
      FROM bcdr.dr_test_findings f
      LEFT JOIN shared.users u ON f.remediation_owner_id = u.id
      LEFT JOIN bcdr.business_processes bp ON f.affected_process_id = bp.id
      WHERE f.test_id = ${id}::uuid
      ORDER BY f.finding_number ASC
    `;

    // Get processes
    const processes = await this.prisma.$queryRaw<any[]>`
      SELECT id, process_id, name, criticality_tier
      FROM bcdr.business_processes
      WHERE id = ANY(${tests[0].process_ids || []}::uuid[])
        AND deleted_at IS NULL
    `;

    // Get participants
    const participants = await this.prisma.$queryRaw<any[]>`
      SELECT id, display_name, email
      FROM shared.users
      WHERE id = ANY(${tests[0].participant_ids || []}::uuid[])
    `;

    return {
      ...tests[0],
      findings,
      processes,
      participants,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateDRTestDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Check for duplicate testId
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM bcdr.dr_tests 
      WHERE organization_id = ${organizationId} 
        AND test_id = ${dto.testId}
        AND deleted_at IS NULL
    `;

    if (existing.length > 0) {
      throw new ConflictException(`Test ID ${dto.testId} already exists`);
    }

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.dr_tests (
        organization_id, workspace_id, test_id, name, description, test_type, status,
        plan_id, process_ids, scheduled_date, scheduled_start_time, scheduled_duration_hours,
        coordinator_id, test_objectives, success_criteria, scope_description,
        systems_in_scope, participant_ids, external_participants, tags,
        created_by, updated_by
      ) VALUES (
        ${organizationId}, ${dto.workspaceId || null}::uuid,
        ${dto.testId}, ${dto.name}, ${dto.description || null}, 
        ${dto.testType}::bcdr.test_type, 'planned'::bcdr.test_status,
        ${dto.planId || null}::uuid, ${dto.processIds || []}::uuid[],
        ${dto.scheduledDate ? new Date(dto.scheduledDate) : null}::date, 
        ${dto.scheduledStartTime || null}::time,
        ${dto.scheduledDurationHours || null},
        ${dto.coordinatorId || null}::uuid, ${dto.testObjectives || null}, 
        ${dto.successCriteria || null}, ${dto.scopeDescription || null},
        ${dto.systemsInScope || []}::text[], ${dto.participantIds || []}::uuid[], 
        ${dto.externalParticipants || null}, ${dto.tags || []}::text[],
        ${userId}::uuid, ${userId}::uuid
      )
      RETURNING *
    `;

    const test = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'dr_test',
      entityId: test.id,
      entityName: test.name,
      description: `Created DR test "${test.name}" (${test.test_id})`,
      metadata: { testType: dto.testType },
    });

    return test;
  }

  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateDRTestDto,
    userEmail?: string,
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    // This prevents SQL injection even though column names come from code, not user input.
    const ALLOWED_COLUMNS = new Set([
      'name', 'description', 'status', 'scheduled_date', 'scheduled_start_time',
      'scheduled_duration_hours', 'coordinator_id', 'test_objectives', 'success_criteria',
      'participant_ids', 'external_participants', 'tags', 'updated_by', 'updated_at',
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
    if (dto.status !== undefined) {
      addUpdate('status', dto.status, '::bcdr.test_status');
    }
    if (dto.scheduledDate !== undefined) {
      addUpdate('scheduled_date', dto.scheduledDate ? new Date(dto.scheduledDate) : null, '::date');
    }
    if (dto.scheduledStartTime !== undefined) {
      addUpdate('scheduled_start_time', dto.scheduledStartTime, '::time');
    }
    if (dto.scheduledDurationHours !== undefined) {
      addUpdate('scheduled_duration_hours', dto.scheduledDurationHours);
    }
    if (dto.coordinatorId !== undefined) {
      addUpdate('coordinator_id', dto.coordinatorId, '::uuid');
    }
    if (dto.testObjectives !== undefined) {
      addUpdate('test_objectives', dto.testObjectives);
    }
    if (dto.successCriteria !== undefined) {
      addUpdate('success_criteria', dto.successCriteria);
    }
    if (dto.participantIds !== undefined) {
      addUpdate('participant_ids', dto.participantIds, '::uuid[]');
    }
    if (dto.externalParticipants !== undefined) {
      addUpdate('external_participants', dto.externalParticipants);
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
      `UPDATE bcdr.dr_tests SET ${updates.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values,
    );

    const test = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'dr_test',
      entityId: id,
      entityName: test.name,
      description: `Updated DR test "${test.name}"`,
      changes: dto,
    });

    return test;
  }

  async startTest(id: string, organizationId: string, userId: string) {
    const _test = await this.findOne(id, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr.dr_tests
      SET status = 'in_progress'::bcdr.test_status,
          actual_start_at = NOW(),
          updated_by = ${userId}::uuid,
          updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    return result[0];
  }

  async recordResults(
    id: string,
    organizationId: string,
    userId: string,
    dto: RecordTestResultDto,
    userEmail?: string,
    userName?: string,
  ) {
    const test = await this.findOne(id, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr.dr_tests
      SET status = 'completed'::bcdr.test_status,
          result = ${dto.result}::bcdr.test_result,
          actual_start_at = ${dto.actualStartAt ? new Date(dto.actualStartAt) : test.actual_start_at},
          actual_end_at = ${dto.actualEndAt ? new Date(dto.actualEndAt) : new Date()},
          actual_recovery_time_minutes = ${dto.actualRecoveryTimeMinutes || null},
          data_loss_minutes = ${dto.dataLossMinutes || null},
          executive_summary = ${dto.executiveSummary || null},
          lessons_learned = ${dto.lessonsLearned || null},
          updated_by = ${userId}::uuid,
          updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'completed',
      entityType: 'dr_test',
      entityId: id,
      entityName: test.name,
      description: `Completed DR test "${test.name}" with result: ${dto.result}`,
      metadata: {
        result: dto.result,
        recoveryTimeMinutes: dto.actualRecoveryTimeMinutes,
      },
    });

    return result[0];
  }

  async addFinding(
    testId: string,
    organizationId: string,
    userId: string,
    dto: CreateTestFindingDto,
  ) {
    await this.findOne(testId, organizationId);

    // Get next finding number
    const maxFinding = await this.prisma.$queryRaw<[{ max: number }]>`
      SELECT COALESCE(MAX(finding_number), 0) as max
      FROM bcdr.dr_test_findings
      WHERE test_id = ${testId}::uuid
    `;

    const findingNumber = (maxFinding[0]?.max || 0) + 1;

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.dr_test_findings (
        test_id, finding_number, title, description, severity, category,
        affected_process_id, affected_system, remediation_required, remediation_plan,
        remediation_owner_id, remediation_due_date, created_by
      ) VALUES (
        ${testId}::uuid, ${findingNumber}, ${dto.title}, ${dto.description},
        ${dto.severity || 'medium'}, ${dto.category || null},
        ${dto.affectedProcessId || null}::uuid, ${dto.affectedSystem || null},
        ${dto.remediationRequired ?? true}, ${dto.remediationPlan || null},
        ${dto.remediationOwnerId || null}::uuid, 
        ${dto.remediationDueDate ? new Date(dto.remediationDueDate) : null}::date,
        ${userId}::uuid
      )
      RETURNING *
    `;

    // Notify remediation owner
    if (dto.remediationOwnerId && dto.remediationRequired) {
      await this.notificationsService.create({
        organizationId,
        userId: dto.remediationOwnerId,
        type: NotificationType.TASK_ASSIGNED,
        severity: NotificationSeverity.WARNING,
        title: 'DR Test Finding Assigned',
        message: `You have been assigned to remediate: ${dto.title}`,
        entityType: 'bcdr_dr_test_finding',
        entityId: result[0].id,
        metadata: { findingId: result[0].id },
      });
    }

    return result[0];
  }

  async updateFinding(
    testId: string,
    findingId: string,
    userId: string,
    updates: Partial<CreateTestFindingDto> & { remediationStatus?: string; remediationNotes?: string },
  ) {
    // SECURITY: Allowed column names for dynamic UPDATE query.
    // Only these hardcoded column names can be included in the query.
    const ALLOWED_COLUMNS = new Set([
      'title', 'description', 'severity', 'remediation_status', 'remediation_completed_at',
      'remediation_plan', 'remediation_owner_id', 'remediation_due_date', 'remediation_notes',
      'updated_at',
    ]);

    const updateFields: string[] = ['updated_at = NOW()'];
    const values: any[] = [findingId];
    let paramIndex = 2;

    // Helper to safely add column updates - validates column is in allowed list
    const addUpdate = (column: string, value: any, typeCast?: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updateFields.push(`${column} = $${paramIndex}${typeCast || ''}`);
      values.push(value);
      paramIndex++;
    };

    // Helper for non-parameterized updates (like NOW())
    const addRawUpdate = (column: string, expression: string) => {
      if (!ALLOWED_COLUMNS.has(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }
      updateFields.push(`${column} = ${expression}`);
    };

    if (updates.title !== undefined) {
      addUpdate('title', updates.title);
    }
    if (updates.description !== undefined) {
      addUpdate('description', updates.description);
    }
    if (updates.severity !== undefined) {
      addUpdate('severity', updates.severity);
    }
    if (updates.remediationStatus !== undefined) {
      addUpdate('remediation_status', updates.remediationStatus);

      if (updates.remediationStatus === 'resolved') {
        addRawUpdate('remediation_completed_at', 'NOW()');
      }
    }
    if (updates.remediationPlan !== undefined) {
      addUpdate('remediation_plan', updates.remediationPlan);
    }
    if (updates.remediationOwnerId !== undefined) {
      addUpdate('remediation_owner_id', updates.remediationOwnerId, '::uuid');
    }
    if (updates.remediationDueDate !== undefined) {
      addUpdate('remediation_due_date', updates.remediationDueDate ? new Date(updates.remediationDueDate) : null, '::date');
    }
    if (updates.remediationNotes !== undefined) {
      addUpdate('remediation_notes', updates.remediationNotes);
    }

    // SECURITY NOTE: $queryRawUnsafe is used here because Prisma's tagged template
    // doesn't support dynamic column names. This is safe because:
    // 1. Column names are hardcoded strings validated against ALLOWED_COLUMNS
    // 2. All values are parameterized via positional parameters ($1, $2, etc.)
    // 3. No user input is interpolated into column names
    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.dr_test_findings SET ${updateFields.join(', ')} WHERE id = $1::uuid RETURNING *`,
      ...values,
    );

    return result[0];
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const test = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr.dr_tests 
      SET deleted_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'dr_test',
      entityId: id,
      entityName: test.name,
      description: `Deleted DR test "${test.name}"`,
    });

    return { success: true };
  }

  async getUpcomingTests(organizationId: string, days: number = 30) {
    const tests = await this.prisma.$queryRaw<any[]>`
      SELECT dt.*, bp.title as plan_title
      FROM bcdr.dr_tests dt
      LEFT JOIN bcdr.bcdr_plans bp ON dt.plan_id = bp.id
      WHERE dt.organization_id = ${organizationId}::uuid
        AND dt.deleted_at IS NULL
        AND dt.status IN ('planned', 'scheduled')
        AND dt.scheduled_date >= CURRENT_DATE
        AND dt.scheduled_date <= CURRENT_DATE + ${days}::integer
      ORDER BY dt.scheduled_date ASC
    `;

    return tests;
  }

  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status IN ('planned', 'scheduled')) as upcoming_count,
        COUNT(*) FILTER (WHERE result = 'passed') as passed_count,
        COUNT(*) FILTER (WHERE result = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE result = 'passed_with_issues') as issues_count,
        AVG(actual_recovery_time_minutes) FILTER (WHERE result IS NOT NULL) as avg_recovery_time
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    // Get open findings count
    const openFindings = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM bcdr.dr_test_findings f
      JOIN bcdr.dr_tests t ON f.test_id = t.id
      WHERE t.organization_id = ${organizationId}::uuid
        AND f.remediation_required = true
        AND f.remediation_status NOT IN ('resolved', 'accepted')
    `;

    return {
      ...stats[0],
      openFindingsCount: Number(openFindings[0]?.count || 0),
    };
  }
}

