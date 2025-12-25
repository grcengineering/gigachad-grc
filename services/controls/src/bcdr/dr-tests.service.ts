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
  TestStatus,
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

    // Build dynamic query
    const conditions: string[] = ['dt.organization_id = $1', 'dt.deleted_at IS NULL'];
    const params: any[] = [organizationId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(dt.name ILIKE $${paramIndex} OR dt.test_id ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (testType) {
      conditions.push(`dt.test_type = $${paramIndex}::bcdr.test_type`);
      params.push(testType);
      paramIndex++;
    }
    if (status) {
      conditions.push(`dt.status = $${paramIndex}::bcdr.test_status`);
      params.push(status);
      paramIndex++;
    }
    if (planId) {
      conditions.push(`dt.plan_id = $${paramIndex}`);
      params.push(planId);
      paramIndex++;
    }

    const limitIdx = paramIndex;
    const offsetIdx = paramIndex + 1;
    params.push(limit, (page - 1) * limit);

    const tests = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT dt.*, 
             u.display_name as coordinator_name,
             bp.title as plan_title,
             (SELECT COUNT(*) FROM bcdr.dr_test_findings WHERE test_id = dt.id) as finding_count
      FROM bcdr.dr_tests dt
      LEFT JOIN public.users u ON dt.coordinator_id = u.id
      LEFT JOIN bcdr.bcdr_plans bp ON dt.plan_id = bp.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY dt.scheduled_date DESC NULLS LAST, dt.created_at DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, ...params);

    const total = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM bcdr.dr_tests
      WHERE organization_id = ${organizationId}
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
      LEFT JOIN public.users u ON dt.coordinator_id = u.id
      LEFT JOIN bcdr.bcdr_plans bp ON dt.plan_id = bp.id
      WHERE dt.id = ${id}
        AND dt.organization_id = ${organizationId}
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
      LEFT JOIN public.users u ON f.remediation_owner_id = u.id
      LEFT JOIN bcdr.business_processes bp ON f.affected_process_id = bp.id
      WHERE f.test_id = ${id}
      ORDER BY f.finding_number ASC
    `;

    // Get processes
    const processIds = tests[0].process_ids || [];
    const processes = processIds.length > 0 ? await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id, process_id, name, criticality_tier
      FROM bcdr.business_processes
      WHERE id = ANY($1::text[])
        AND deleted_at IS NULL
    `, processIds) : [];

    // Get participants
    const participantIds = tests[0].participant_ids || [];
    const participants = participantIds.length > 0 ? await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id, display_name, email
      FROM public.users
      WHERE id = ANY($1::text[])
    `, participantIds) : [];

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
        ${organizationId}, ${dto.workspaceId || null},
        ${dto.testId}, ${dto.name}, ${dto.description || null}, 
        ${dto.testType}::bcdr.test_type, 'planned'::bcdr.test_status,
        ${dto.planId || null}, ${dto.processIds || []}::text[],
        ${dto.scheduledDate ? new Date(dto.scheduledDate) : null}::date, 
        ${dto.scheduledStartTime || null}::time,
        ${dto.scheduledDurationHours || null},
        ${dto.coordinatorId || null}, ${dto.testObjectives || null}, 
        ${dto.successCriteria || null}, ${dto.scopeDescription || null},
        ${dto.systemsInScope || []}::text[], ${dto.participantIds || []}::text[], 
        ${dto.externalParticipants || null}, ${dto.tags || []}::text[],
        ${userId}, ${userId}
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
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex}::bcdr.test_status`);
      values.push(dto.status);
      paramIndex++;
    }
    if (dto.scheduledDate !== undefined) {
      updates.push(`scheduled_date = $${paramIndex}::date`);
      values.push(dto.scheduledDate ? new Date(dto.scheduledDate) : null);
      paramIndex++;
    }
    if (dto.scheduledStartTime !== undefined) {
      updates.push(`scheduled_start_time = $${paramIndex}::time`);
      values.push(dto.scheduledStartTime);
      paramIndex++;
    }
    if (dto.scheduledDurationHours !== undefined) {
      updates.push(`scheduled_duration_hours = $${paramIndex}`);
      values.push(dto.scheduledDurationHours);
      paramIndex++;
    }
    if (dto.coordinatorId !== undefined) {
      updates.push(`coordinator_id = $${paramIndex}`);
      values.push(dto.coordinatorId);
      paramIndex++;
    }
    if (dto.testObjectives !== undefined) {
      updates.push(`test_objectives = $${paramIndex}`);
      values.push(dto.testObjectives);
      paramIndex++;
    }
    if (dto.successCriteria !== undefined) {
      updates.push(`success_criteria = $${paramIndex}`);
      values.push(dto.successCriteria);
      paramIndex++;
    }
    if (dto.participantIds !== undefined) {
      updates.push(`participant_ids = $${paramIndex}::text[]`);
      values.push(dto.participantIds);
      paramIndex++;
    }
    if (dto.externalParticipants !== undefined) {
      updates.push(`external_participants = $${paramIndex}`);
      values.push(dto.externalParticipants);
      paramIndex++;
    }
    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex}::text[]`);
      values.push(dto.tags);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.dr_tests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
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
    const test = await this.findOne(id, organizationId);

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr.dr_tests
      SET status = 'in_progress'::bcdr.test_status,
          actual_start_at = NOW(),
          updated_by = ${userId},
          updated_at = NOW()
      WHERE id = ${id}
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
          updated_by = ${userId},
          updated_at = NOW()
      WHERE id = ${id}
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
      WHERE test_id = ${testId}
    `;

    const findingNumber = (maxFinding[0]?.max || 0) + 1;

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr.dr_test_findings (
        test_id, finding_number, title, description, severity, category,
        affected_process_id, affected_system, remediation_required, remediation_plan,
        remediation_owner_id, remediation_due_date, created_by
      ) VALUES (
        ${testId}, ${findingNumber}, ${dto.title}, ${dto.description},
        ${dto.severity || 'medium'}, ${dto.category || null},
        ${dto.affectedProcessId || null}, ${dto.affectedSystem || null},
        ${dto.remediationRequired ?? true}, ${dto.remediationPlan || null},
        ${dto.remediationOwnerId || null}, 
        ${dto.remediationDueDate ? new Date(dto.remediationDueDate) : null}::date,
        ${userId}
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
    const updateFields: string[] = ['updated_at = NOW()'];
    const values: any[] = [findingId];
    let paramIndex = 2;

    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(updates.title);
      paramIndex++;
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }
    if (updates.severity !== undefined) {
      updateFields.push(`severity = $${paramIndex}`);
      values.push(updates.severity);
      paramIndex++;
    }
    if (updates.remediationStatus !== undefined) {
      updateFields.push(`remediation_status = $${paramIndex}`);
      values.push(updates.remediationStatus);
      paramIndex++;

      if (updates.remediationStatus === 'resolved') {
        updateFields.push('remediation_completed_at = NOW()');
      }
    }
    if (updates.remediationPlan !== undefined) {
      updateFields.push(`remediation_plan = $${paramIndex}`);
      values.push(updates.remediationPlan);
      paramIndex++;
    }
    if (updates.remediationOwnerId !== undefined) {
      updateFields.push(`remediation_owner_id = $${paramIndex}`);
      values.push(updates.remediationOwnerId);
      paramIndex++;
    }
    if (updates.remediationDueDate !== undefined) {
      updateFields.push(`remediation_due_date = $${paramIndex}::date`);
      values.push(updates.remediationDueDate ? new Date(updates.remediationDueDate) : null);
      paramIndex++;
    }
    if (updates.remediationNotes !== undefined) {
      updateFields.push(`remediation_notes = $${paramIndex}`);
      values.push(updates.remediationNotes);
      paramIndex++;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(
      `UPDATE bcdr.dr_test_findings SET ${updateFields.join(', ')} WHERE id = $1 RETURNING *`,
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
      WHERE id = ${id}
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
      WHERE dt.organization_id = ${organizationId}
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
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
    `;

    // Get open findings count - simplified query
    let openFindingsCount = 0;
    try {
      const openFindings = await this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM bcdr.dr_test_findings f
        JOIN bcdr.dr_tests t ON f.test_id = t.id
        WHERE t.organization_id = ${organizationId}
      `;
      openFindingsCount = Number(openFindings[0]?.count || 0);
    } catch (e) {
      if (e instanceof Error) {
        this.logger.error(
          `Could not fetch open findings count: ${e.message}`,
          e.stack,
        );
      } else {
        this.logger.error(
          `Could not fetch open findings count: ${JSON.stringify(e)}`,
        );
      }
    }

    return {
      ...stats[0],
      openFindingsCount,
    };
  }
}

