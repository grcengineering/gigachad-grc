import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateRecoveryTeamDto,
  UpdateRecoveryTeamDto,
  AddTeamMemberDto,
  LinkTeamToPlanDto,
  RecoveryTeamFilterDto,
} from './dto/bcdr.dto';

/**
 * Service for managing BC/DR recovery teams.
 *
 * Recovery teams define the people responsible for executing
 * recovery activities during an incident or disaster.
 */
@Injectable()
export class RecoveryTeamsService {
  private readonly logger = new Logger(RecoveryTeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  /**
   * List all recovery teams.
   */
  async findAll(organizationId: string, filters: RecoveryTeamFilterDto) {
    const { search, teamType, isActive, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // Use parameterized queries to prevent SQL injection
    const searchPattern = search ? `%${search}%` : null;

    const [teams, total] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT t.*,
               (SELECT COUNT(*) FROM bcdr_recovery_team_members WHERE team_id = t.id) as member_count,
               (SELECT COUNT(*) FROM bcdr_recovery_team_plan_links WHERE team_id = t.id) as plan_count
        FROM bcdr_recovery_teams t
        WHERE t.organization_id = ${organizationId}
          AND t.deleted_at IS NULL
          AND (${searchPattern}::text IS NULL OR (t.name ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern}))
          AND (${teamType}::text IS NULL OR t.team_type = ${teamType})
          AND (${isActive}::boolean IS NULL OR t.is_active = ${isActive})
        ORDER BY t.name ASC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM bcdr_recovery_teams t
        WHERE t.organization_id = ${organizationId}
          AND t.deleted_at IS NULL
          AND (${searchPattern}::text IS NULL OR (t.name ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern}))
          AND (${teamType}::text IS NULL OR t.team_type = ${teamType})
          AND (${isActive}::boolean IS NULL OR t.is_active = ${isActive})
      `,
    ]);

    return {
      data: teams,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  /**
   * Get a single team with all members.
   */
  async findOne(id: string, organizationId: string) {
    const teams = await this.prisma.$queryRaw<any[]>`
      SELECT t.*
      FROM bcdr_recovery_teams t
      WHERE t.id = ${id}
        AND t.organization_id = ${organizationId}
        AND t.deleted_at IS NULL
    `;

    if (!teams || teams.length === 0) {
      throw new NotFoundException(`Recovery team ${id} not found`);
    }

    // Get members
    const members = await this.prisma.$queryRaw<any[]>`
      SELECT m.*,
             u.display_name as user_name,
             u.email as user_email
      FROM bcdr_recovery_team_members m
      LEFT JOIN public.users u ON m.user_id::text = u.id
      WHERE m.team_id = ${id}
      ORDER BY m.sort_order ASC, m.role ASC
    `;

    // Get linked plans
    const planLinks = await this.prisma.$queryRaw<any[]>`
      SELECT l.*, p.title as plan_title, p.plan_type
      FROM bcdr_recovery_team_plan_links l
      JOIN bcdr.bcdr_plans p ON l.plan_id::text = p.id::text
      WHERE l.team_id = ${id}
        AND p.deleted_at IS NULL
    `;

    return {
      ...teams[0],
      members,
      planLinks,
    };
  }

  /**
   * Create a new recovery team.
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateRecoveryTeamDto,
    userEmail?: string,
    userName?: string
  ) {
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_recovery_teams (
        id, organization_id, name, description, team_type,
        activation_criteria, assembly_location, communication_channel,
        created_by, updated_at
      ) VALUES (
        gen_random_uuid()::text, ${organizationId}, ${dto.name}, ${dto.description || null},
        ${dto.teamType}, ${dto.activationCriteria || null},
        ${dto.assemblyLocation || null}, ${dto.communicationChannel || null},
        ${userId}, NOW()
      )
      RETURNING *
    `;

    const team = result[0];

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'recovery_team',
      entityId: team.id,
      entityName: team.name,
      description: `Created recovery team "${team.name}"`,
    });

    return team;
  }

  /**
   * Update a recovery team.
   */
  async update(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateRecoveryTeamDto,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(id, organizationId);

    // Use parameterized query to prevent SQL injection
    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr_recovery_teams
      SET 
        updated_at = NOW(),
        name = COALESCE(${dto.name ?? null}, name),
        description = CASE WHEN ${dto.description !== undefined} THEN ${dto.description ?? null} ELSE description END,
        team_type = COALESCE(${dto.teamType ?? null}, team_type),
        activation_criteria = CASE WHEN ${dto.activationCriteria !== undefined} THEN ${dto.activationCriteria ?? null} ELSE activation_criteria END,
        assembly_location = CASE WHEN ${dto.assemblyLocation !== undefined} THEN ${dto.assemblyLocation ?? null} ELSE assembly_location END,
        communication_channel = CASE WHEN ${dto.communicationChannel !== undefined} THEN ${dto.communicationChannel ?? null} ELSE communication_channel END,
        is_active = COALESCE(${dto.isActive ?? null}, is_active)
      WHERE id = ${id}
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'recovery_team',
      entityId: id,
      entityName: result[0].name,
      description: `Updated recovery team "${result[0].name}"`,
    });

    return result[0];
  }

  /**
   * Delete a recovery team.
   */
  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ) {
    const team = await this.findOne(id, organizationId);

    await this.prisma.$executeRaw`
      UPDATE bcdr_recovery_teams
      SET deleted_at = NOW()
      WHERE id = ${id}
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'recovery_team',
      entityId: id,
      entityName: team.name,
      description: `Deleted recovery team "${team.name}"`,
    });

    return { success: true };
  }

  /**
   * Add a member to a team.
   */
  async addMember(
    teamId: string,
    organizationId: string,
    userId: string,
    dto: AddTeamMemberDto,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(teamId, organizationId);

    // Get current max sort order
    const maxOrder = await this.prisma.$queryRaw<[{ max: number }]>`
      SELECT COALESCE(MAX(sort_order), 0) as max
      FROM bcdr_recovery_team_members
      WHERE team_id = ${teamId}
    `;

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_recovery_team_members (
        team_id, role, user_id,
        external_name, external_email, external_phone,
        responsibilities, is_primary, alternate_for, sort_order
      ) VALUES (
        ${teamId}, ${dto.role}, ${dto.userId || null},
        ${dto.externalName || null}, ${dto.externalEmail || null}, ${dto.externalPhone || null},
        ${dto.responsibilities || null}, ${dto.isPrimary ?? true},
        ${dto.alternateFor || null}, ${(maxOrder[0]?.max || 0) + 1}
      )
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'member_added',
      entityType: 'recovery_team',
      entityId: teamId,
      description: `Added member to recovery team`,
      metadata: { memberId: result[0].id, role: dto.role },
    });

    return result[0];
  }

  /**
   * Update a team member.
   */
  async updateMember(
    teamId: string,
    memberId: string,
    organizationId: string,
    dto: Partial<AddTeamMemberDto>
  ) {
    await this.findOne(teamId, organizationId);

    // Use parameterized query to prevent SQL injection
    const result = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr_recovery_team_members
      SET 
        updated_at = NOW(),
        role = COALESCE(${dto.role ?? null}, role),
        responsibilities = CASE WHEN ${dto.responsibilities !== undefined} THEN ${dto.responsibilities ?? null} ELSE responsibilities END,
        is_primary = COALESCE(${dto.isPrimary ?? null}, is_primary),
        alternate_for = CASE WHEN ${dto.alternateFor !== undefined} THEN ${dto.alternateFor ?? null} ELSE alternate_for END
      WHERE id = ${memberId} AND team_id = ${teamId}
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Remove a member from a team.
   */
  async removeMember(
    teamId: string,
    memberId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(teamId, organizationId);

    await this.prisma.$executeRaw`
      DELETE FROM bcdr_recovery_team_members
      WHERE id = ${memberId} AND team_id = ${teamId}
    `;

    // Clear any alternate_for references to this member
    await this.prisma.$executeRaw`
      UPDATE bcdr_recovery_team_members
      SET alternate_for = NULL
      WHERE alternate_for = ${memberId}
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'member_removed',
      entityType: 'recovery_team',
      entityId: teamId,
      description: `Removed member from recovery team`,
      metadata: { memberId },
    });

    return { success: true };
  }

  /**
   * Link a team to a BC/DR plan.
   */
  async linkToPlan(
    teamId: string,
    organizationId: string,
    userId: string,
    dto: LinkTeamToPlanDto,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(teamId, organizationId);

    // Check if link already exists
    const existing = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM bcdr_recovery_team_plan_links
      WHERE team_id = ${teamId} AND plan_id = ${dto.planId}
    `;

    if (existing && existing.length > 0) {
      throw new ConflictException('Team is already linked to this plan');
    }

    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_recovery_team_plan_links (team_id, plan_id, role_in_plan)
      VALUES (${teamId}, ${dto.planId}, ${dto.roleInPlan || null})
      RETURNING *
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'linked_to_plan',
      entityType: 'recovery_team',
      entityId: teamId,
      description: `Linked recovery team to plan`,
      metadata: { planId: dto.planId },
    });

    return result[0];
  }

  /**
   * Unlink a team from a plan.
   */
  async unlinkFromPlan(
    teamId: string,
    planId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    userName?: string
  ) {
    await this.findOne(teamId, organizationId);

    await this.prisma.$executeRaw`
      DELETE FROM bcdr_recovery_team_plan_links
      WHERE team_id = ${teamId} AND plan_id = ${planId}
    `;

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'unlinked_from_plan',
      entityType: 'recovery_team',
      entityId: teamId,
      description: `Unlinked recovery team from plan`,
      metadata: { planId },
    });

    return { success: true };
  }

  /**
   * Get teams linked to a specific plan.
   */
  async getTeamsForPlan(planId: string, organizationId: string) {
    const teams = await this.prisma.$queryRaw<any[]>`
      SELECT t.*, l.role_in_plan,
             (SELECT COUNT(*) FROM bcdr_recovery_team_members WHERE team_id = t.id) as member_count
      FROM bcdr_recovery_teams t
      JOIN bcdr_recovery_team_plan_links l ON t.id = l.team_id
      WHERE l.plan_id = ${planId}
        AND t.organization_id = ${organizationId}
        AND t.deleted_at IS NULL
      ORDER BY t.name ASC
    `;

    return teams;
  }

  /**
   * Get team statistics.
   */
  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active_count,
        COUNT(*) FILTER (WHERE team_type = 'crisis_management') as crisis_management_count,
        COUNT(*) FILTER (WHERE team_type = 'it_recovery') as it_recovery_count,
        COUNT(*) FILTER (WHERE team_type = 'business_recovery') as business_recovery_count,
        (SELECT COUNT(*) FROM bcdr_recovery_team_members m
         JOIN bcdr_recovery_teams t ON m.team_id = t.id
         WHERE t.organization_id = ${organizationId} AND t.deleted_at IS NULL) as total_members
      FROM bcdr_recovery_teams
      WHERE organization_id = ${organizationId}
        AND deleted_at IS NULL
    `;

    return stats[0];
  }
}
