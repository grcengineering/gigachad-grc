import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DeclareIncidentDto,
  UpdateIncidentStatusDto,
  AddTimelineEntryDto,
  ActivatePlanDto,
  ActivateTeamDto,
  CloseIncidentDto,
  IncidentFilterDto,
  IncidentStatus,
  TimelineEntryType,
} from './dto/bcdr.dto';

/**
 * Service for managing BC/DR incidents.
 *
 * Handles the full lifecycle of BC/DR incidents from declaration
 * through resolution and post-incident review.
 */
@Injectable()
export class BCDRIncidentsService {
  private readonly logger = new Logger(BCDRIncidentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Declare a new BC/DR incident.
   */
  async declareIncident(
    organizationId: string,
    userId: string,
    dto: DeclareIncidentDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Generate incident ID
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_incidents (
        organization_id, incident_id, title, description,
        incident_type, severity, status,
        declared_at, declared_by,
        activated_plans, activated_teams
      ) VALUES (
        ${organizationId}::uuid, ${incidentId}, ${dto.title},
        ${dto.description || null}, ${dto.incidentType}, ${dto.severity},
        'active', NOW(), ${userId}::uuid,
        '[]'::jsonb, '[]'::jsonb
      )
      RETURNING *
    `;

    const incident = result[0];

    // Add initial timeline entry
    await this.addTimelineEntryInternal(
      incident.id,
      userId,
      TimelineEntryType.STATUS_CHANGE,
      `Incident declared: ${dto.title}`,
      { severity: dto.severity, incidentType: dto.incidentType },
    );

    // Log audit
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'incident_declared',
      entityType: 'bcdr_incident',
      entityId: incident.id,
      entityName: dto.title,
      description: `Declared BC/DR incident "${dto.title}"`,
      metadata: { severity: dto.severity, incidentType: dto.incidentType },
    });

    // Send notifications
    try {
      await this.notificationsService.sendNotification({
        organizationId,
        type: 'bcdr_incident_declared',
        title: `BC/DR Incident: ${dto.title}`,
        message: `A ${dto.severity} ${dto.incidentType} incident has been declared`,
        metadata: { incidentId: incident.id, severity: dto.severity },
      });
    } catch (error) {
      this.logger.warn(`Failed to send incident notification: ${error}`);
    }

    return incident;
  }

  /**
   * Get all incidents with filters.
   */
  async findAll(organizationId: string, filters: IncidentFilterDto) {
    const { search, incidentType, status, severity, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    const whereClauses = [`organization_id = '${organizationId}'::uuid`];

    if (search) {
      const escapedSearch = search.replace(/'/g, "''");
      whereClauses.push(`(title ILIKE '%${escapedSearch}%' OR incident_id ILIKE '%${escapedSearch}%')`);
    }

    if (incidentType) {
      whereClauses.push(`incident_type = '${incidentType}'`);
    }

    if (status) {
      whereClauses.push(`status = '${status}'`);
    }

    if (severity) {
      whereClauses.push(`severity = '${severity}'`);
    }

    const whereClause = whereClauses.join(' AND ');

    const [incidents, total] = await Promise.all([
      this.prisma.$queryRawUnsafe<any[]>(`
        SELECT *,
               (SELECT COUNT(*) FROM bcdr_incident_timeline WHERE incident_id = bcdr_incidents.id) as timeline_count
        FROM bcdr_incidents
        WHERE ${whereClause}
        ORDER BY declared_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      this.prisma.$queryRawUnsafe<[{ count: bigint }]>(`
        SELECT COUNT(*) as count
        FROM bcdr_incidents
        WHERE ${whereClause}
      `),
    ]);

    return {
      data: incidents,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  /**
   * Get a single incident with timeline.
   */
  async findOne(id: string, organizationId: string) {
    const incidents = await this.prisma.$queryRaw<any[]>`
      SELECT i.*,
             u_declared.display_name as declared_by_name,
             u_closed.display_name as closed_by_name
      FROM bcdr_incidents i
      LEFT JOIN public.users u_declared ON i.declared_by::text = u_declared.id
      LEFT JOIN public.users u_closed ON i.closed_by::text = u_closed.id
      WHERE i.id = ${id}::uuid
        AND i.organization_id = ${organizationId}::uuid
    `;

    if (!incidents || incidents.length === 0) {
      throw new NotFoundException(`Incident ${id} not found`);
    }

    // Get timeline
    const timeline = await this.prisma.$queryRaw<any[]>`
      SELECT t.*,
             u.display_name as created_by_name
      FROM bcdr_incident_timeline t
      LEFT JOIN public.users u ON t.created_by::text = u.id
      WHERE t.incident_id = ${id}::uuid
      ORDER BY t.timestamp DESC
    `;

    return {
      ...incidents[0],
      timeline,
    };
  }

  /**
   * Update incident status.
   */
  async updateStatus(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateIncidentStatusDto,
    userEmail?: string,
    userName?: string,
  ) {
    const incident = await this.findOne(id, organizationId);

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'active': ['recovering', 'resolved'],
      'recovering': ['active', 'resolved'],
      'resolved': ['active', 'recovering', 'closed'],
      'closed': [], // Cannot transition out of closed
    };

    if (!validTransitions[incident.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${incident.status} to ${dto.status}`,
      );
    }

    // Build update
    const updates: string[] = [
      `status = '${dto.status}'`,
      'updated_at = NOW()',
    ];

    if (dto.status === 'recovering' && !incident.recovery_started_at) {
      updates.push('recovery_started_at = NOW()');
    }

    if (dto.status === 'resolved') {
      updates.push('resolved_at = NOW()');
      if (incident.recovery_started_at) {
        updates.push(`operational_at = NOW()`);
      }
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      UPDATE bcdr_incidents
      SET ${updates.join(', ')}
      WHERE id = '${id}'::uuid
      RETURNING *
    `);

    // Add timeline entry
    await this.addTimelineEntryInternal(
      id,
      userId,
      TimelineEntryType.STATUS_CHANGE,
      `Status changed from ${incident.status} to ${dto.status}${dto.notes ? ': ' + dto.notes : ''}`,
      { previousStatus: incident.status, newStatus: dto.status },
    );

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'status_changed',
      entityType: 'bcdr_incident',
      entityId: id,
      entityName: incident.title,
      description: `Changed incident status from ${incident.status} to ${dto.status}`,
    });

    return result[0];
  }

  /**
   * Add a timeline entry.
   */
  async addTimelineEntry(
    id: string,
    organizationId: string,
    userId: string,
    dto: AddTimelineEntryDto,
    userEmail?: string,
    userName?: string,
  ) {
    await this.findOne(id, organizationId);

    const result = await this.addTimelineEntryInternal(
      id,
      userId,
      dto.entryType,
      dto.description,
      dto.metadata,
    );

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'timeline_entry_added',
      entityType: 'bcdr_incident',
      entityId: id,
      description: `Added timeline entry: ${dto.description.substring(0, 50)}...`,
    });

    return result;
  }

  /**
   * Internal method to add timeline entry.
   */
  private async addTimelineEntryInternal(
    incidentId: string,
    userId: string,
    entryType: string,
    description: string,
    metadata?: any,
  ) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_incident_timeline (
        incident_id, entry_type, description, created_by, metadata
      ) VALUES (
        ${incidentId}::uuid, ${entryType}, ${description},
        ${userId}::uuid, ${metadata ? JSON.stringify(metadata) : null}::jsonb
      )
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Activate a plan for an incident.
   */
  async activatePlan(
    id: string,
    organizationId: string,
    userId: string,
    dto: ActivatePlanDto,
    userEmail?: string,
    userName?: string,
  ) {
    const incident = await this.findOne(id, organizationId);

    // Get plan details
    const plans = await this.prisma.$queryRaw<any[]>`
      SELECT title FROM bcdr.bcdr_plans
      WHERE id = ${dto.planId}::uuid
    `;

    const planName = plans[0]?.title || dto.planId;

    // Add to activated plans
    const currentPlans = incident.activated_plans || [];
    if (!currentPlans.includes(dto.planId)) {
      currentPlans.push(dto.planId);
    }

    await this.prisma.$executeRaw`
      UPDATE bcdr_incidents
      SET activated_plans = ${JSON.stringify(currentPlans)}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // Add timeline entry
    await this.addTimelineEntryInternal(
      id,
      userId,
      TimelineEntryType.PLAN_ACTIVATED,
      `Plan activated: ${planName}${dto.notes ? ' - ' + dto.notes : ''}`,
      { planId: dto.planId, planName },
    );

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'plan_activated',
      entityType: 'bcdr_incident',
      entityId: id,
      description: `Activated plan "${planName}" for incident`,
      metadata: { planId: dto.planId },
    });

    return { success: true, activatedPlans: currentPlans };
  }

  /**
   * Activate a team for an incident.
   */
  async activateTeam(
    id: string,
    organizationId: string,
    userId: string,
    dto: ActivateTeamDto,
    userEmail?: string,
    userName?: string,
  ) {
    const incident = await this.findOne(id, organizationId);

    // Get team details
    const teams = await this.prisma.$queryRaw<any[]>`
      SELECT name FROM bcdr_recovery_teams
      WHERE id = ${dto.teamId}::uuid
    `;

    const teamName = teams[0]?.name || dto.teamId;

    // Add to activated teams
    const currentTeams = incident.activated_teams || [];
    if (!currentTeams.includes(dto.teamId)) {
      currentTeams.push(dto.teamId);
    }

    await this.prisma.$executeRaw`
      UPDATE bcdr_incidents
      SET activated_teams = ${JSON.stringify(currentTeams)}::jsonb,
          updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    // Add timeline entry
    await this.addTimelineEntryInternal(
      id,
      userId,
      TimelineEntryType.TEAM_ACTIVATED,
      `Team activated: ${teamName}${dto.notes ? ' - ' + dto.notes : ''}`,
      { teamId: dto.teamId, teamName },
    );

    return { success: true, activatedTeams: currentTeams };
  }

  /**
   * Close an incident with post-incident review data.
   */
  async closeIncident(
    id: string,
    organizationId: string,
    userId: string,
    dto: CloseIncidentDto,
    userEmail?: string,
    userName?: string,
  ) {
    const incident = await this.findOne(id, organizationId);

    if (incident.status === 'closed') {
      throw new BadRequestException('Incident is already closed');
    }

    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr_incidents
      SET 
        status = 'closed',
        closed_at = NOW(),
        closed_by = ${userId}::uuid,
        root_cause = ${dto.rootCause || null},
        lessons_learned = ${dto.lessonsLearned || null},
        improvement_actions = ${dto.improvementActions ? JSON.stringify(dto.improvementActions) : null}::jsonb,
        actual_downtime_minutes = ${dto.actualDowntimeMinutes || null},
        data_loss_minutes = ${dto.dataLossMinutes || null},
        financial_impact = ${dto.financialImpact || null},
        post_incident_review_date = NOW(),
        post_incident_review_by = ${userId}::uuid,
        updated_at = NOW()
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    // Add timeline entry
    await this.addTimelineEntryInternal(
      id,
      userId,
      TimelineEntryType.STATUS_CHANGE,
      'Incident closed with post-incident review',
      {
        rootCause: dto.rootCause,
        lessonsLearned: dto.lessonsLearned,
      },
    );

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'incident_closed',
      entityType: 'bcdr_incident',
      entityId: id,
      entityName: incident.title,
      description: `Closed incident "${incident.title}" with post-incident review`,
      metadata: {
        actualDowntimeMinutes: dto.actualDowntimeMinutes,
        financialImpact: dto.financialImpact,
      },
    });

    return result[0];
  }

  /**
   * Get active incidents.
   */
  async getActiveIncidents(organizationId: string) {
    const incidents = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM bcdr_incidents
      WHERE organization_id = ${organizationId}::uuid
        AND status IN ('active', 'recovering')
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'major' THEN 2 
          WHEN 'moderate' THEN 3 
          ELSE 4 
        END,
        declared_at DESC
    `;

    return incidents;
  }

  /**
   * Get incident statistics.
   */
  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'recovering') as recovering_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE incident_type = 'disaster') as disaster_count,
        COUNT(*) FILTER (WHERE incident_type = 'drill') as drill_count,
        AVG(actual_downtime_minutes) FILTER (WHERE actual_downtime_minutes IS NOT NULL) as avg_downtime_minutes,
        AVG(EXTRACT(EPOCH FROM (resolved_at - declared_at))/60) 
          FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_minutes
      FROM bcdr_incidents
      WHERE organization_id = ${organizationId}::uuid
    `;

    return stats[0];
  }
}
