import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import {
  RequestAttestationDto,
  SubmitAttestationDto,
  AttestationFilterDto,
} from './dto/bcdr.dto';
import { addMonths } from 'date-fns';

/**
 * Service for managing BC/DR plan attestations.
 *
 * Plan attestations provide formal sign-off from plan owners confirming
 * BC/DR plans are accurate and current. This supports audit requirements
 * and establishes an audit trail for plan reviews.
 *
 * @example
 * // Request attestation for a plan
 * await attestationService.requestAttestation(organizationId, planId, userId, {
 *   attestationType: 'annual_review',
 *   message: 'Please confirm this plan is current.'
 * });
 */
@Injectable()
export class PlanAttestationsService {
  private readonly logger = new Logger(PlanAttestationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Request an attestation from the plan owner.
   *
   * Creates a pending attestation record and optionally sends
   * a notification to the plan owner.
   *
   * @param organizationId - UUID of the organization
   * @param planId - UUID of the BC/DR plan
   * @param requesterId - UUID of the user requesting attestation
   * @param dto - Attestation request details
   * @returns The created attestation record
   * @throws NotFoundException if plan does not exist
   */
  async requestAttestation(
    organizationId: string,
    planId: string,
    requesterId: string,
    dto: RequestAttestationDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Verify plan exists and get owner
    const plans = await this.prisma.$queryRaw<any[]>`
      SELECT id, title, owner_id
      FROM bcdr.bcdr_plans
      WHERE id = ${planId}::uuid
        AND organization_id = ${organizationId}::uuid
        AND deleted_at IS NULL
    `;

    if (!plans || plans.length === 0) {
      throw new NotFoundException(`BC/DR Plan ${planId} not found`);
    }

    const plan = plans[0];
    const attesterId = plan.owner_id || requesterId;

    // Calculate valid until date (default 1 year from now)
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : addMonths(new Date(), 12);

    // Create attestation record
    const result = await this.prisma.$queryRaw<any[]>`
      INSERT INTO bcdr_plan_attestations (
        plan_id, attester_id, organization_id,
        attestation_type, status, message,
        valid_until, requested_by, requested_at
      ) VALUES (
        ${planId}::uuid, ${attesterId}::uuid, ${organizationId}::uuid,
        ${dto.attestationType}, 'pending', ${dto.message || null},
        ${validUntil}, ${requesterId}::uuid, NOW()
      )
      RETURNING *
    `;

    const attestation = result[0];

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId: requesterId,
      userEmail,
      userName,
      action: 'attestation_requested',
      entityType: 'bcdr_plan_attestation',
      entityId: attestation.id,
      entityName: plan.title,
      description: `Requested ${dto.attestationType} attestation for plan "${plan.title}"`,
      metadata: {
        planId,
        attestationType: dto.attestationType,
        attesterId,
      },
    });

    // Send notification to attester
    try {
      await this.notificationsService.sendNotification({
        organizationId,
        userId: attesterId,
        type: NotificationType.BCDR_ATTESTATION_REQUESTED,
        title: 'Plan Attestation Requested',
        message: `You have been requested to attest BC/DR plan "${plan.title}"`,
        metadata: {
          planId,
          attestationId: attestation.id,
          attestationType: dto.attestationType,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to send attestation notification: ${error}`);
    }

    return attestation;
  }

  /**
   * Submit an attestation response (attest or decline).
   *
   * @param attestationId - UUID of the attestation
   * @param userId - UUID of the attesting user
   * @param dto - Attestation response
   * @returns Updated attestation record
   * @throws NotFoundException if attestation not found
   * @throws BadRequestException if attestation already completed
   */
  async submitAttestation(
    attestationId: string,
    userId: string,
    dto: SubmitAttestationDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Get attestation
    const attestations = await this.prisma.$queryRaw<any[]>`
      SELECT a.*, p.title as plan_title, p.organization_id
      FROM bcdr_plan_attestations a
      JOIN bcdr.bcdr_plans p ON a.plan_id = p.id
      WHERE a.id = ${attestationId}::uuid
    `;

    if (!attestations || attestations.length === 0) {
      throw new NotFoundException(`Attestation ${attestationId} not found`);
    }

    const attestation = attestations[0];

    // Check if already completed
    if (attestation.status !== 'pending') {
      throw new BadRequestException(
        `Attestation has already been ${attestation.status}`,
      );
    }

    // Validate decline reason if declining
    if (dto.status === 'declined' && !dto.declineReason) {
      throw new BadRequestException(
        'Decline reason is required when declining an attestation',
      );
    }

    // Update attestation
    const updateResult = await this.prisma.$queryRaw<any[]>`
      UPDATE bcdr_plan_attestations
      SET 
        status = ${dto.status},
        attested_at = ${dto.status === 'attested' ? new Date() : null},
        declined_at = ${dto.status === 'declined' ? new Date() : null},
        comments = ${dto.comments || null},
        decline_reason = ${dto.declineReason || null},
        updated_at = NOW()
      WHERE id = ${attestationId}::uuid
      RETURNING *
    `;

    const updated = updateResult[0];

    // Log audit event
    await this.auditService.log({
      organizationId: attestation.organization_id,
      userId,
      userEmail,
      userName,
      action: dto.status === 'attested' ? 'attestation_completed' : 'attestation_declined',
      entityType: 'bcdr_plan_attestation',
      entityId: attestationId,
      entityName: attestation.plan_title,
      description: dto.status === 'attested'
        ? `Attested BC/DR plan "${attestation.plan_title}"`
        : `Declined attestation for BC/DR plan "${attestation.plan_title}"`,
      metadata: {
        planId: attestation.plan_id,
        status: dto.status,
        comments: dto.comments,
        declineReason: dto.declineReason,
      },
    });

    // Update plan's last reviewed date if attested
    if (dto.status === 'attested') {
      await this.prisma.$executeRaw`
        UPDATE bcdr.bcdr_plans
        SET last_reviewed_at = NOW(),
            next_review_due = NOW() + (review_frequency_months || ' months')::interval
        WHERE id = ${attestation.plan_id}::uuid
      `;
    }

    return updated;
  }

  /**
   * Get attestation history for a specific plan.
   *
   * @param planId - UUID of the plan
   * @param organizationId - UUID of the organization
   * @returns List of attestations ordered by date descending
   */
  async getAttestationHistory(planId: string, organizationId: string) {
    const attestations = await this.prisma.$queryRaw<any[]>`
      SELECT a.*,
             u_attester.display_name as attester_name,
             u_attester.email as attester_email,
             u_requester.display_name as requester_name
      FROM bcdr_plan_attestations a
      LEFT JOIN public.users u_attester ON a.attester_id::text = u_attester.id
      LEFT JOIN public.users u_requester ON a.requested_by::text = u_requester.id
      WHERE a.plan_id = ${planId}::uuid
        AND a.organization_id = ${organizationId}::uuid
      ORDER BY a.requested_at DESC
    `;

    return attestations;
  }

  /**
   * Get pending attestations for a user.
   *
   * @param userId - UUID of the user
   * @param organizationId - UUID of the organization
   * @returns List of pending attestations
   */
  async getPendingAttestations(userId: string, organizationId: string) {
    const attestations = await this.prisma.$queryRaw<any[]>`
      SELECT a.*,
             p.title as plan_title,
             p.plan_type,
             u_requester.display_name as requester_name
      FROM bcdr_plan_attestations a
      JOIN bcdr.bcdr_plans p ON a.plan_id = p.id
      LEFT JOIN public.users u_requester ON a.requested_by::text = u_requester.id
      WHERE a.attester_id = ${userId}::uuid
        AND a.organization_id = ${organizationId}::uuid
        AND a.status = 'pending'
      ORDER BY a.requested_at DESC
    `;

    return attestations;
  }

  /**
   * Get a single attestation by ID.
   *
   * @param attestationId - UUID of the attestation
   * @returns Attestation record with related data
   * @throws NotFoundException if attestation not found
   */
  async findOne(attestationId: string) {
    const attestations = await this.prisma.$queryRaw<any[]>`
      SELECT a.*,
             p.title as plan_title,
             p.plan_type,
             p.description as plan_description,
             u_attester.display_name as attester_name,
             u_attester.email as attester_email,
             u_requester.display_name as requester_name
      FROM bcdr_plan_attestations a
      JOIN bcdr.bcdr_plans p ON a.plan_id = p.id
      LEFT JOIN public.users u_attester ON a.attester_id::text = u_attester.id
      LEFT JOIN public.users u_requester ON a.requested_by::text = u_requester.id
      WHERE a.id = ${attestationId}::uuid
    `;

    if (!attestations || attestations.length === 0) {
      throw new NotFoundException(`Attestation ${attestationId} not found`);
    }

    return attestations[0];
  }

  /**
   * List all attestations with filters.
   *
   * @param organizationId - UUID of the organization
   * @param filters - Filter options
   * @returns Paginated list of attestations
   */
  async findAll(organizationId: string, filters: AttestationFilterDto) {
    const { planId, status, page = 1, limit = 25 } = filters;
    const offset = (page - 1) * limit;

    // SECURITY FIX: Use Prisma's parameterized $queryRaw instead of $queryRawUnsafe
    // to prevent SQL injection. All variables are properly escaped as parameters.
    const [attestations, total] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT a.*,
               p.title as plan_title,
               p.plan_type,
               u_attester.display_name as attester_name,
               u_requester.display_name as requester_name
        FROM bcdr_plan_attestations a
        JOIN bcdr.bcdr_plans p ON a.plan_id = p.id
        LEFT JOIN public.users u_attester ON a.attester_id::text = u_attester.id
        LEFT JOIN public.users u_requester ON a.requested_by::text = u_requester.id
        WHERE a.organization_id = ${organizationId}::uuid
          AND (${planId}::uuid IS NULL OR a.plan_id = ${planId}::uuid)
          AND (${status}::text IS NULL OR a.status = ${status})
        ORDER BY a.requested_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count
        FROM bcdr_plan_attestations a
        WHERE a.organization_id = ${organizationId}::uuid
          AND (${planId}::uuid IS NULL OR a.plan_id = ${planId}::uuid)
          AND (${status}::text IS NULL OR a.status = ${status})
      `,
    ]);

    return {
      data: attestations,
      total: Number(total[0]?.count || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(total[0]?.count || 0) / limit),
    };
  }

  /**
   * Get attestation statistics for dashboard.
   *
   * @param organizationId - UUID of the organization
   * @returns Attestation statistics
   */
  async getStats(organizationId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'attested') as attested_count,
        COUNT(*) FILTER (WHERE status = 'declined') as declined_count,
        COUNT(*) FILTER (WHERE status = 'pending' AND requested_at < NOW() - INTERVAL '7 days') as overdue_count
      FROM bcdr_plan_attestations
      WHERE organization_id = ${organizationId}::uuid
    `;

    return stats[0];
  }
}
