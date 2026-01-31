/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService, CacheKeys } from '@gigachad-grc/shared';
import { RiskWorkflowTasksService } from './risk-workflow-tasks.service';
import {
  RiskLevel as PrismaRiskLevel,
} from '@prisma/client';
import {
  CreateRiskDto,
  UpdateRiskDto,
  ValidateRiskDto,
  SubmitAssessmentDto,
  ReviewAssessmentDto,
  ReviseAssessmentDto,
  SubmitTreatmentDecisionDto,
  AssignExecutiveApproverDto,
  ExecutiveApprovalDto,
  UpdateMitigationStatusDto,
  UpdateTreatmentDto,
  RiskFilterDto,
  LinkControlDto,
  UpdateControlEffectivenessDto,
  CreateScenarioDto,
  UpdateScenarioDto,
  RiskResponseDto,
  RiskDetailResponseDto,
  RiskDashboardDto,
  RiskHeatmapDto,
  calculateRiskLevel,
  requiresExecutiveApproval,
  determineTreatmentOutcome,
  Likelihood,
  Impact,
  RiskLevel,
  TreatmentDecision,
  RiskIntakeStatus,
  RiskAssessmentStatus,
  RiskTreatmentStatus,
  MitigationProgressStatus,
} from './dto/risk.dto';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private cache: CacheService,
    @Inject(forwardRef(() => RiskWorkflowTasksService))
    private riskWorkflowTasksService: RiskWorkflowTasksService,
  ) {}

  // ===========================
  // Risk CRUD
  // ===========================

  /**
   * Lightweight list endpoint - returns minimal data for fast table rendering
   */
  async findAllLight(
    organizationId: string,
    filters: RiskFilterDto,
    page: number = 1,
    limit: number = 25,
  ) {
    const where: Record<string, unknown> = { organizationId, deletedAt: null };

    if (filters.workspaceId) {
      where.workspaceId = filters.workspaceId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { riskId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.riskLevel) {
      where.inherentRisk = filters.riskLevel;
    }

    const [risks, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        select: {
          id: true,
          riskId: true,
          title: true,
          category: true,
          status: true,
          inherentRisk: true,
          residualRisk: true,
          _count: {
            select: { controls: true, assets: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.risk.count({ where }),
    ]);

    return {
      risks: risks.map(risk => ({
        id: risk.id,
        riskId: risk.riskId,
        title: risk.title,
        category: risk.category,
        status: risk.status,
        inherentRisk: risk.inherentRisk,
        residualRisk: risk.residualRisk,
        controlCount: risk._count.controls,
        assetCount: risk._count.assets,
      })),
      total,
      page,
      limit,
    };
  }

  async findAll(
    organizationId: string,
    filters: RiskFilterDto,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: Record<string, unknown> = { organizationId, deletedAt: null };

    // Workspace filter for multi-workspace mode
    if (filters.workspaceId) {
      where.workspaceId = filters.workspaceId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { riskId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.riskLevel) {
      where.inherentRisk = filters.riskLevel;
    }

    if (filters.ownerId) {
      where.riskOwnerId = filters.ownerId;
    }

    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.grcSmeId) {
      where.grcSmeId = filters.grcSmeId;
    }

    if (filters.riskAssessorId) {
      where.riskAssessorId = filters.riskAssessorId;
    }

    // Filter for "open" risks (matching the dashboard count)
    if (filters.isOpen === 'true') {
      where.status = {
        in: [
          RiskIntakeStatus.RISK_IDENTIFIED,
          RiskIntakeStatus.ACTUAL_RISK,
          RiskIntakeStatus.RISK_ANALYSIS_IN_PROGRESS,
          RiskIntakeStatus.RISK_ANALYZED,
        ],
      };
    }

    // Filter for risks with upcoming reviews (within 30 days)
    if (filters.reviewsDue === 'true') {
      where.AND = [
        ...((where.AND as Array<unknown>) || []),
        { nextReviewDue: { not: null } },
        { nextReviewDue: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
      ];
    }

    const [risks, total] = await Promise.all([
      this.prisma.risk.findMany({
        where,
        include: {
          assessment: {
            select: { status: true },
          },
          treatment: {
            select: { status: true },
          },
          _count: {
            select: {
              assets: true,
              controls: true,
              scenarios: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.risk.count({ where }),
    ]);

    return {
      risks: risks.map(risk => this.toResponseDto(risk)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, organizationId: string): Promise<RiskDetailResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assets: {
          include: {
            asset: true,
          },
        },
        controls: {
          include: {
            control: {
              include: {
                implementations: {
                  where: { organizationId },
                  take: 1,
                },
              },
            },
          },
        },
        scenarios: {
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { changedAt: 'desc' },
          take: 50,
        },
        assessment: true,
        treatment: {
          include: {
            updates: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    return {
      ...this.toResponseDto(risk),
      assets: risk.assets.map(ra => ({
        id: ra.asset.id,
        name: ra.asset.name,
        type: ra.asset.type,
        criticality: ra.asset.criticality,
        source: ra.asset.source,
        notes: ra.notes || undefined,
      })),
      controls: risk.controls.map(rc => ({
        id: rc.control.id,
        controlId: rc.control.controlId,
        title: rc.control.title,
        status: rc.control.implementations[0]?.status || 'not_started',
        effectiveness: rc.effectiveness,
        notes: rc.notes || undefined,
      })),
      scenarios: risk.scenarios.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        threatActor: s.threatActor || undefined,
        attackVector: s.attackVector || undefined,
        likelihood: s.likelihood,
        impact: s.impact,
        createdAt: s.createdAt,
      })),
      history: risk.history.map(h => ({
        id: h.id,
        action: h.action,
        changes: (h.changes as Record<string, unknown>) || {},
        notes: h.notes || undefined,
        changedBy: h.changedBy,
        changedAt: h.changedAt,
      })),
      assessment: risk.assessment ? {
        id: risk.assessment.id,
        status: risk.assessment.status,
        riskAssessorId: risk.assessment.riskAssessorId || undefined,
        grcSmeId: risk.assessment.grcSmeId || undefined,
        threatDescription: risk.assessment.threatDescription || undefined,
        affectedAssets: risk.assets?.map(ra => ra.assetId) || [],
        existingControls: risk.controls?.map(rc => rc.controlId) || [],
        vulnerabilities: risk.assessment.vulnerabilities || undefined,
        likelihoodScore: risk.assessment.likelihoodScore || undefined,
        likelihoodRationale: risk.assessment.likelihoodRationale || undefined,
        impactScore: risk.assessment.impactScore || undefined,
        impactRationale: risk.assessment.impactRationale || undefined,
        impactCategories: (risk.assessment.impactCategories as Record<string, unknown>) || undefined,
        calculatedRiskScore: risk.assessment.calculatedRiskScore || undefined,
        recommendedOwnerId: risk.assessment.recommendedOwnerId || undefined,
        assessmentNotes: risk.assessment.assessmentNotes || undefined,
        treatmentRecommendation: risk.assessment.treatmentRecommendation || undefined,
        grcReviewNotes: risk.assessment.grcReviewNotes || undefined,
        grcApprovedAt: risk.assessment.grcApprovedAt || undefined,
        grcDeclinedReason: risk.assessment.grcDeclinedReason || undefined,
        assessorSubmittedAt: risk.assessment.assessorSubmittedAt || undefined,
        completedAt: risk.assessment.completedAt || undefined,
        createdAt: risk.assessment.createdAt,
        updatedAt: risk.assessment.updatedAt,
      } : undefined,
      treatment: risk.treatment ? {
        id: risk.treatment.id,
        status: risk.treatment.status,
        riskOwnerId: risk.treatment.riskOwnerId || undefined,
        executiveApproverId: risk.treatment.executiveApproverId || undefined,
        grcSmeId: risk.treatment.grcSmeId || undefined,
        treatmentDecision: risk.treatment.treatmentDecision || undefined,
        treatmentJustification: risk.treatment.treatmentJustification || undefined,
        treatmentPlan: risk.treatment.treatmentPlan || undefined,
        mitigationDescription: risk.treatment.mitigationDescription || undefined,
        mitigationTargetDate: risk.treatment.mitigationTargetDate || undefined,
        mitigationActualDate: risk.treatment.mitigationActualDate || undefined,
        transferTo: risk.treatment.transferTo || undefined,
        transferCost: risk.treatment.transferCost || undefined,
        avoidStrategy: risk.treatment.avoidStrategy || undefined,
        acceptanceRationale: risk.treatment.acceptanceRationale || undefined,
        acceptanceExpiresAt: risk.treatment.acceptanceExpiresAt || undefined,
        executiveApprovalRequired: risk.treatment.executiveApprovalRequired,
        executiveApprovalStatus: risk.treatment.executiveApprovalStatus || undefined,
        executiveApprovalNotes: risk.treatment.executiveApprovalNotes || undefined,
        executiveApprovedAt: risk.treatment.executiveApprovedAt || undefined,
        executiveDeniedReason: risk.treatment.executiveDeniedReason || undefined,
        mitigationStatus: risk.treatment.mitigationStatus || undefined,
        mitigationProgress: risk.treatment.mitigationProgress,
        lastProgressUpdate: risk.treatment.lastProgressUpdate || undefined,
        nextReviewDate: risk.treatment.nextReviewDate || undefined,
        residualLikelihood: risk.treatment.residualLikelihood || undefined,
        residualImpact: risk.treatment.residualImpact || undefined,
        residualRiskScore: risk.treatment.residualRiskScore || undefined,
        completedAt: risk.treatment.completedAt || undefined,
        createdAt: risk.treatment.createdAt,
        updatedAt: risk.treatment.updatedAt,
        updates: risk.treatment.updates.map(u => ({
          id: u.id,
          updateType: u.updateType,
          previousStatus: u.previousStatus || undefined,
          newStatus: u.newStatus || undefined,
          progress: u.progress || undefined,
          notes: u.notes || undefined,
          newTargetDate: u.newTargetDate || undefined,
          delayReason: u.delayReason || undefined,
          cancellationReason: u.cancellationReason || undefined,
          createdBy: u.createdBy,
          createdAt: u.createdAt,
        })),
      } : undefined,
    };
  }

  // Invalidate risk-related caches for an organization
  private async invalidateRiskCaches(organizationId: string): Promise<void> {
    await Promise.all([
      this.cache.del(`risk:dashboard:${organizationId}`),
      this.cache.del(CacheKeys.riskMatrix(organizationId)),
      this.cache.del(CacheKeys.riskList(organizationId)),
    ]);
  }

  // Create new risk (Risk Reporter action)
  async create(
    organizationId: string,
    dto: CreateRiskDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    // Generate risk ID
    const count = await this.prisma.risk.count({ where: { organizationId, deletedAt: null } });
    const riskId = `RISK-${String(count + 1).padStart(4, '0')}`;

    const risk = await this.prisma.risk.create({
      data: {
        organizationId,
        riskId,
        title: dto.title,
        description: dto.description,
        category: 'security', // Default category - will be refined during assessment
        source: dto.source,
         
        initialSeverity: dto.initialSeverity as any,
         
        status: RiskIntakeStatus.RISK_IDENTIFIED as any,
        documentation: dto.documentation ? JSON.parse(JSON.stringify(dto.documentation)) : undefined,
        tags: dto.tags || [],
        reporterId: userId,
        createdBy: userId,
      },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        action: 'risk_submitted',
        notes: 'Risk submitted for GRC review',
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'risk_submitted',
      entityType: 'risk',
      entityId: risk.id,
      entityName: risk.title,
      description: `Submitted new risk "${risk.riskId}: ${risk.title}"`,
    });

    // Invalidate caches
    await this.invalidateRiskCaches(organizationId);

    return this.toResponseDto(risk);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateRiskDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const existing = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Risk not found');
    }

    const risk = await this.prisma.risk.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        source: dto.source,
         
        initialSeverity: dto.initialSeverity as any,
        tags: dto.tags,
      },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        action: 'risk_updated',
        changes: {
          before: { title: existing.title, description: existing.description },
          after: { title: risk.title, description: risk.description },
        },
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'risk_updated',
      entityType: 'risk',
      entityId: risk.id,
      entityName: risk.title,
      description: `Updated risk "${risk.riskId}: ${risk.title}"`,
    });

    // Invalidate caches
    await this.invalidateRiskCaches(organizationId);

    return this.toResponseDto(risk);
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    // Soft delete from database
    await this.prisma.risk.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'risk_deleted',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Deleted risk "${risk.riskId}: ${risk.title}"`,
    });

    // Invalidate caches
    await this.invalidateRiskCaches(organizationId);
  }

  // ===========================
  // Risk Intake Workflow
  // ===========================

  // GRC SME validates risk (Risk Identified -> Actual Risk or Not A Risk)
  async validateRisk(
    id: string,
    organizationId: string,
    dto: ValidateRiskDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    if (risk.status !== RiskIntakeStatus.RISK_IDENTIFIED) {
      throw new BadRequestException('Risk is not in the correct status for validation');
    }

    const newStatus = dto.approved
      ? RiskIntakeStatus.ACTUAL_RISK
      : RiskIntakeStatus.NOT_A_RISK;

    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
         
        status: newStatus as any,
        grcSmeId: userId,
        riskAssessorId: dto.riskAssessorId,
      },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: id,
        action: dto.approved ? 'risk_validated' : 'risk_rejected',
        changes: { previousStatus: risk.status, newStatus },
        notes: dto.reason,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: dto.approved ? 'risk_validated' : 'risk_rejected',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: dto.approved
        ? `Validated risk "${risk.riskId}" as actual risk`
        : `Rejected risk "${risk.riskId}" - not a valid risk`,
    });

    // Auto-create task when risk is validated
    if (dto.approved) {
      try {
        const assigneeId = dto.riskAssessorId || userId;
        await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
          id,
          organizationId,
          'risk_validated',
          assigneeId,
          userId,
        );
      } catch (error: unknown) {
        this.logger.error(`Failed to auto-create task for risk validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.toResponseDto(updated);
  }

  // Start risk assessment (Actual Risk -> Risk Analysis In Progress)
  async startAssessment(
    id: string,
    organizationId: string,
    riskAssessorId: string,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    if (risk.status !== RiskIntakeStatus.ACTUAL_RISK) {
      throw new BadRequestException('Risk must be validated before starting assessment');
    }

    // Update risk status and create assessment sub-ticket
    const [updated] = await this.prisma.$transaction([
      this.prisma.risk.update({
        where: { id },
        data: {
           
          status: RiskIntakeStatus.RISK_ANALYSIS_IN_PROGRESS as any,
          riskAssessorId,
        },
        include: {
          assessment: { select: { status: true } },
          treatment: { select: { status: true } },
          _count: { select: { assets: true, controls: true, scenarios: true } },
        },
      }),
      this.prisma.riskAssessment.create({
        data: {
          riskId: id,
           
          status: RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS as any,
          riskAssessorId,
          grcSmeId: risk.grcSmeId,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: 'assessment_started',
          notes: `Risk assessment assigned to assessor`,
          changedBy: userId,
        },
      }),
    ]);

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'assessment_started',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Started risk assessment for "${risk.riskId}"`,
    });

    return this.toResponseDto(updated);
  }

  // ===========================
  // Risk Assessment Workflow
  // ===========================

  // Risk Assessor submits assessment
  async submitAssessment(
    id: string,
    organizationId: string,
    dto: SubmitAssessmentDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS) {
      throw new BadRequestException('Assessment is not in the correct status');
    }

    // Calculate risk score
    const calculatedRiskScore = calculateRiskLevel(
      dto.likelihoodScore as Likelihood,
      dto.impactScore as Impact,
    );

    // Update assessment
    await this.prisma.riskAssessment.update({
      where: { id: risk.assessment.id },
      data: {
         
        status: RiskAssessmentStatus.GRC_APPROVAL as any,
        threatDescription: dto.threatDescription,
        vulnerabilities: dto.vulnerabilities,
         
        likelihoodScore: dto.likelihoodScore as any,
        likelihoodRationale: dto.likelihoodRationale,
         
        impactScore: dto.impactScore as any,
        impactRationale: dto.impactRationale,
        impactCategories: dto.impactCategories || {},
         
        calculatedRiskScore: calculatedRiskScore as any,
        recommendedOwnerId: dto.recommendedOwnerId,
        assessmentNotes: dto.assessmentNotes,
        treatmentRecommendation: dto.treatmentRecommendation,
        assessorSubmittedAt: new Date(),
      },
    });

    // Update affected assets via RiskAsset junction table
    if (dto.affectedAssets && dto.affectedAssets.length > 0) {
      // Delete existing risk-asset links
      await this.prisma.riskAsset.deleteMany({
        where: { riskId: id },
      });

      // Create new risk-asset links
      await this.prisma.riskAsset.createMany({
        data: dto.affectedAssets.map((assetId) => ({
          riskId: id,
          assetId,
        })),
        skipDuplicates: true,
      });
    }

    // Update existing controls via RiskControl junction table
    if (dto.existingControls && dto.existingControls.length > 0) {
      // Delete existing risk-control links
      await this.prisma.riskControl.deleteMany({
        where: { riskId: id },
      });

      // Create new risk-control links
      await this.prisma.riskControl.createMany({
        data: dto.existingControls.map((controlId) => ({
          riskId: id,
          controlId,
          effectiveness: 'partial', // Default effectiveness
        })),
        skipDuplicates: true,
      });
    }

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: id,
        action: 'assessment_submitted',
        changes: { calculatedRiskScore, likelihoodScore: dto.likelihoodScore, impactScore: dto.impactScore },
        notes: 'Assessment submitted for GRC approval',
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'assessment_submitted',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Submitted assessment for risk "${risk.riskId}" with score: ${calculatedRiskScore}`,
    });

    // Auto-create task for GRC review
    try {
      await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
        id,
        organizationId,
        'assessment_submitted',
        risk.grcSmeId || userId,
        userId,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to auto-create task for assessment submission: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.toResponseDto(updated);
  }

  // GRC SME reviews assessment
  async reviewAssessment(
    id: string,
    organizationId: string,
    dto: ReviewAssessmentDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.GRC_APPROVAL) {
      throw new BadRequestException('Assessment is not pending GRC approval');
    }

    if (dto.approved) {
      // Approve assessment and move to treatment
      await this.prisma.$transaction([
        this.prisma.riskAssessment.update({
          where: { id: risk.assessment.id },
          data: {
             
            status: RiskAssessmentStatus.DONE as any,
            grcReviewNotes: dto.notes,
            grcApprovedAt: new Date(),
            completedAt: new Date(),
          },
        }),
        this.prisma.risk.update({
          where: { id },
          data: {
             
            status: RiskIntakeStatus.RISK_ANALYZED as any,
             
            likelihood: risk.assessment.likelihoodScore as any,
             
            impact: risk.assessment.impactScore as any,
             
            inherentRisk: risk.assessment.calculatedRiskScore as any,
            riskOwnerId: risk.assessment.recommendedOwnerId,
          },
        }),
        // Create treatment sub-ticket
        this.prisma.riskTreatment.create({
          data: {
            riskId: id,
           
          status: RiskTreatmentStatus.TREATMENT_DECISION_REVIEW as any,
          riskOwnerId: risk.assessment.recommendedOwnerId,
            grcSmeId: userId,
          },
        }),
        this.prisma.riskHistory.create({
          data: {
            riskId: id,
            action: 'assessment_approved',
            notes: dto.notes || 'Assessment approved by GRC',
            changedBy: userId,
          },
        }),
      ]);
    } else {
      // Send back for revision
      await this.prisma.$transaction([
        this.prisma.riskAssessment.update({
          where: { id: risk.assessment.id },
          data: {
             
            status: RiskAssessmentStatus.GRC_REVISION as any,
            grcDeclinedReason: dto.declinedReason,
          },
        }),
        this.prisma.riskHistory.create({
          data: {
            riskId: id,
            action: 'assessment_revision_requested',
            notes: dto.declinedReason || 'Revision requested by GRC',
            changedBy: userId,
          },
        }),
      ]);
    }

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: dto.approved ? 'assessment_approved' : 'assessment_revision_requested',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: dto.approved
        ? `Approved assessment for risk "${risk.riskId}"`
        : `Requested revision for risk "${risk.riskId}" assessment`,
    });

    // Auto-create task when assessment is approved
    if (dto.approved) {
      try {
        const assigneeId = risk.assessment.recommendedOwnerId || risk.riskOwnerId || userId;
        await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
          id,
          organizationId,
          'assessment_approved',
          assigneeId,
          userId,
        );
      } catch (error: unknown) {
        this.logger.error(`Failed to auto-create task for assessment approval: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.toResponseDto(updated);
  }

  // GRC SME completes revision
  async completeRevision(
    id: string,
    organizationId: string,
    dto: ReviseAssessmentDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.GRC_REVISION) {
      throw new BadRequestException('Assessment is not in revision status');
    }

    // Recalculate score if likelihood or impact changed
    let calculatedRiskScore = risk.assessment.calculatedRiskScore;
    const likelihood = (dto.likelihoodScore || risk.assessment.likelihoodScore) as Likelihood;
    const impact = (dto.impactScore || risk.assessment.impactScore) as Impact;
    if (likelihood && impact) {
      calculatedRiskScore = calculateRiskLevel(likelihood, impact);
    }

    // Update assessment and complete
    await this.prisma.$transaction([
      this.prisma.riskAssessment.update({
        where: { id: risk.assessment.id },
        data: {
           
          status: RiskAssessmentStatus.DONE as any,
           
          likelihoodScore: dto.likelihoodScore as any,
          likelihoodRationale: dto.likelihoodRationale,
           
          impactScore: dto.impactScore as any,
          impactRationale: dto.impactRationale,
          impactCategories: dto.impactCategories,
          recommendedOwnerId: dto.recommendedOwnerId,
          assessmentNotes: dto.assessmentNotes,
           
          calculatedRiskScore: calculatedRiskScore as any,
          completedAt: new Date(),
        },
      }),
      this.prisma.risk.update({
        where: { id },
        data: {
           
          status: RiskIntakeStatus.RISK_ANALYZED as any,
           
          likelihood: (dto.likelihoodScore || risk.assessment.likelihoodScore) as any,
           
          impact: (dto.impactScore || risk.assessment.impactScore) as any,
           
          inherentRisk: calculatedRiskScore as any,
          riskOwnerId: dto.recommendedOwnerId || risk.assessment.recommendedOwnerId,
        },
      }),
      // Create treatment sub-ticket
      this.prisma.riskTreatment.create({
        data: {
          riskId: id,
           
          status: RiskTreatmentStatus.TREATMENT_DECISION_REVIEW as any,
          riskOwnerId: dto.recommendedOwnerId || risk.assessment.recommendedOwnerId,
          grcSmeId: userId,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: 'assessment_revision_completed',
          changes: { calculatedRiskScore },
          notes: 'GRC completed assessment revision',
          changedBy: userId,
        },
      }),
    ]);

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'assessment_revision_completed',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Completed assessment revision for risk "${risk.riskId}"`,
    });

    return this.toResponseDto(updated);
  }

  // ===========================
  // Risk Treatment Workflow
  // ===========================

  // Risk Owner submits treatment decision
  async submitTreatmentDecision(
    id: string,
    organizationId: string,
    dto: SubmitTreatmentDecisionDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.TREATMENT_DECISION_REVIEW) {
      throw new BadRequestException('Treatment is not awaiting decision');
    }

    const riskLevel = risk.inherentRisk as RiskLevel;
    const needsExecutiveApproval = requiresExecutiveApproval(riskLevel, dto.decision);
    const nextStatus = determineTreatmentOutcome(riskLevel, dto.decision);

    // Update treatment
    await this.prisma.$transaction([
      this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: nextStatus as any,
           
          treatmentDecision: dto.decision as any,
          treatmentJustification: dto.justification,
          treatmentPlan: dto.mitigationDescription,
          mitigationDescription: dto.mitigationDescription,
          mitigationTargetDate: dto.mitigationTargetDate ? new Date(dto.mitigationTargetDate) : undefined,
          transferTo: dto.transferTo,
          transferCost: dto.transferCost,
          avoidStrategy: dto.avoidStrategy,
          acceptanceRationale: dto.acceptanceRationale,
          acceptanceExpiresAt: dto.acceptanceExpiresAt ? new Date(dto.acceptanceExpiresAt) : undefined,
          executiveApprovalRequired: needsExecutiveApproval,
           
          mitigationStatus: (dto.decision === TreatmentDecision.MITIGATE ? MitigationProgressStatus.ON_TRACK : undefined) as any,
        },
      }),
      this.prisma.risk.update({
        where: { id },
        data: {
           
          treatmentPlan: dto.decision as any,
          treatmentStatus: 'in_progress',
          treatmentNotes: dto.justification,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: 'treatment_decision_submitted',
          changes: { decision: dto.decision, requiresExecutiveApproval: needsExecutiveApproval },
          notes: dto.justification,
          changedBy: userId,
        },
      }),
    ]);

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'treatment_decision_submitted',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Submitted treatment decision "${dto.decision}" for risk "${risk.riskId}"`,
    });

    return this.toResponseDto(updated);
  }

  // GRC SME assigns executive approver
  async assignExecutiveApprover(
    id: string,
    organizationId: string,
    dto: AssignExecutiveApproverDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER) {
      throw new BadRequestException('Treatment is not awaiting executive approver assignment');
    }

    await this.prisma.$transaction([
      this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: RiskTreatmentStatus.EXECUTIVE_APPROVAL as any,
          executiveApproverId: dto.executiveApproverId,
           
          executiveApprovalStatus: 'pending' as any,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: 'executive_approver_assigned',
          notes: `Executive approver assigned`,
          changedBy: userId,
        },
      }),
    ]);

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'executive_approver_assigned',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Assigned executive approver for risk "${risk.riskId}"`,
    });

    // Auto-create task for executive approval
    try {
      await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
        id,
        organizationId,
        'executive_approver_assigned',
        dto.executiveApproverId,
        userId,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to auto-create task for executive approval: ${error instanceof Error ? error.message : String(error)}`);
    }

    return this.toResponseDto(updated);
  }

  // Executive approves or denies
  async submitExecutiveApproval(
    id: string,
    organizationId: string,
    dto: ExecutiveApprovalDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.EXECUTIVE_APPROVAL) {
      throw new BadRequestException('Treatment is not awaiting executive approval');
    }

    const riskLevel = risk.inherentRisk as RiskLevel;
    const decision = risk.treatment.treatmentDecision as TreatmentDecision;
    const nextStatus = dto.approved
      ? determineTreatmentOutcome(riskLevel, decision, true)
      : RiskTreatmentStatus.TREATMENT_DECISION_REVIEW;

    const treatmentStatus = dto.approved
      ? (decision === TreatmentDecision.MITIGATE ? 'in_progress' : 'completed')
      : 'pending';

    await this.prisma.$transaction([
      this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: nextStatus as any,
           
          executiveApprovalStatus: (dto.approved ? 'approved' : 'denied') as any,
          executiveApprovalNotes: dto.notes,
          executiveApprovedAt: dto.approved ? new Date() : undefined,
          executiveDeniedReason: dto.deniedReason,
          completedAt: dto.approved && decision !== TreatmentDecision.MITIGATE ? new Date() : undefined,
        },
      }),
      this.prisma.risk.update({
        where: { id },
        data: {
          treatmentStatus,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: dto.approved ? 'executive_approved' : 'executive_denied',
          notes: dto.notes || dto.deniedReason,
          changedBy: userId,
        },
      }),
    ]);

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: dto.approved ? 'executive_approved' : 'executive_denied',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: dto.approved
        ? `Executive approved treatment for risk "${risk.riskId}"`
        : `Executive denied treatment for risk "${risk.riskId}"`,
    });

    return this.toResponseDto(updated);
  }

  // Risk Owner updates mitigation status
  async updateMitigationStatus(
    id: string,
    organizationId: string,
    dto: UpdateMitigationStatusDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (![
      RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
      RiskTreatmentStatus.MITIGATION_STATUS_UPDATE,
      RiskTreatmentStatus.MITIGATION_STATUS_ROUTING,
    ].includes(risk.treatment.status as RiskTreatmentStatus)) {
      throw new BadRequestException('Treatment is not in mitigation phase');
    }

    let nextStatus = risk.treatment.status;
    let treatmentStatus = 'in_progress';
    let completedAt: Date | undefined;
    let residualRiskScore: string | undefined;

    switch (dto.status) {
      case MitigationProgressStatus.ON_TRACK:
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
        break;
      case MitigationProgressStatus.DELAYED:
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
        break;
      case MitigationProgressStatus.CANCELLED:
        nextStatus = RiskTreatmentStatus.TREATMENT_DECISION_REVIEW;
        treatmentStatus = 'pending';
        break;
      case MitigationProgressStatus.DONE:
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_COMPLETE;
        treatmentStatus = 'completed';
        completedAt = new Date();
        if (dto.residualLikelihood && dto.residualImpact) {
          residualRiskScore = calculateRiskLevel(dto.residualLikelihood, dto.residualImpact);
        }
        break;
    }

    await this.prisma.$transaction([
      this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: nextStatus as any,
           
          mitigationStatus: dto.status as any,
          mitigationProgress: dto.progress ?? risk.treatment.mitigationProgress,
          lastProgressUpdate: new Date(),
          mitigationTargetDate: dto.newTargetDate ? new Date(dto.newTargetDate) : risk.treatment.mitigationTargetDate,
           
          residualLikelihood: dto.residualLikelihood as any,
           
          residualImpact: dto.residualImpact as any,
           
          residualRiskScore: residualRiskScore as any,
          mitigationActualDate: dto.status === MitigationProgressStatus.DONE ? new Date() : undefined,
          completedAt,
        },
      }),
      this.prisma.risk.update({
        where: { id },
        data: {
          treatmentStatus,
           
          residualRisk: residualRiskScore as any,
        },
      }),
      this.prisma.riskTreatmentUpdate.create({
        data: {
          treatmentId: risk.treatment.id,
          updateType: dto.status === MitigationProgressStatus.DONE ? 'completion'
            : dto.status === MitigationProgressStatus.DELAYED ? 'delay'
            : dto.status === MitigationProgressStatus.CANCELLED ? 'cancellation'
            : 'progress',
           
          previousStatus: risk.treatment.mitigationStatus as any,
           
          newStatus: dto.status as any,
          progress: dto.progress,
          notes: dto.notes,
          newTargetDate: dto.newTargetDate ? new Date(dto.newTargetDate) : undefined,
          delayReason: dto.delayReason,
          cancellationReason: dto.cancellationReason,
          createdBy: userId,
        },
      }),
      this.prisma.riskHistory.create({
        data: {
          riskId: id,
          action: `mitigation_${dto.status}`,
          changes: { progress: dto.progress, status: dto.status },
          notes: dto.notes,
          changedBy: userId,
        },
      }),
    ]);

    const updated = await this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: `mitigation_${dto.status}`,
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Updated mitigation status to "${dto.status}" for risk "${risk.riskId}"`,
    });

    return this.toResponseDto(updated);
  }

  // Legacy treatment update (backwards compatibility)
  async updateTreatment(
    id: string,
    organizationId: string,
    dto: UpdateTreatmentDto,
    userId: string,
    userEmail?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    // Calculate residual risk if provided
    let residualRisk: PrismaRiskLevel | undefined;
    if (dto.residualLikelihood && dto.residualImpact) {
      residualRisk = calculateRiskLevel(dto.residualLikelihood, dto.residualImpact) as PrismaRiskLevel;
    }

    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
         
        treatmentPlan: dto.treatmentPlan as any,
        treatmentNotes: dto.treatmentNotes,
         
        residualRisk: residualRisk as any,
      },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: id,
        action: 'treatment_updated',
        changes: { treatmentPlan: dto.treatmentPlan, residualRisk },
        notes: dto.treatmentNotes,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'treatment_updated',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Updated treatment plan for risk "${risk.riskId}" to ${dto.treatmentPlan}`,
    });

    return this.toResponseDto(updated);
  }

  // Mark risk as reviewed
  async markReviewed(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
    notes?: string,
  ): Promise<RiskResponseDto> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const nextReviewDue = this.calculateNextReviewDate(risk.reviewFrequency);

    const updated = await this.prisma.risk.update({
      where: { id },
      data: {
        lastReviewedAt: new Date(),
        nextReviewDue,
      },
      include: {
        assessment: { select: { status: true } },
        treatment: { select: { status: true } },
        _count: { select: { assets: true, controls: true, scenarios: true } },
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: id,
        action: 'reviewed',
        notes,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'reviewed',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Reviewed risk "${risk.riskId}: ${risk.title}"`,
    });

    return this.toResponseDto(updated);
  }

  // ===========================
  // Risk-Asset Linking
  // ===========================

  async linkAssets(
    id: string,
    organizationId: string,
    assetIds: string[],
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds }, organizationId },
    });

    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets not found');
    }

    await this.prisma.riskAsset.createMany({
      data: assetIds.map(assetId => ({
        riskId: id,
        assetId,
      })),
      skipDuplicates: true,
    });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'assets_linked',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Linked ${assetIds.length} assets to risk "${risk.riskId}"`,
      metadata: { assetIds },
    });
  }

  async unlinkAsset(
    id: string,
    assetId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    await this.prisma.riskAsset.deleteMany({
      where: { riskId: id, assetId },
    });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'asset_unlinked',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Unlinked asset from risk "${risk.riskId}"`,
      metadata: { assetId },
    });
  }

  // ===========================
  // Risk-Control Linking
  // ===========================

  async linkControl(
    id: string,
    organizationId: string,
    dto: LinkControlDto,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const control = await this.prisma.control.findFirst({
      where: { id: dto.controlId, deletedAt: null },
    });

    if (!control) {
      throw new NotFoundException('Control not found');
    }

    const existing = await this.prisma.riskControl.findUnique({
      where: {
        riskId_controlId: { riskId: id, controlId: dto.controlId },
      },
    });

    if (existing) {
      throw new ConflictException('Control already linked to this risk');
    }

    await this.prisma.riskControl.create({
      data: {
        riskId: id,
        controlId: dto.controlId,
        effectiveness: dto.effectiveness || 'partial',
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'control_linked',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Linked control "${control.controlId}" to risk "${risk.riskId}"`,
      metadata: { controlId: dto.controlId },
    });
  }

  async updateControlEffectiveness(
    id: string,
    controlId: string,
    organizationId: string,
    dto: UpdateControlEffectivenessDto,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    await this.prisma.riskControl.update({
      where: {
        riskId_controlId: { riskId: id, controlId },
      },
      data: {
        effectiveness: dto.effectiveness,
        notes: dto.notes,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'control_effectiveness_updated',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Updated control effectiveness to "${dto.effectiveness}" for risk "${risk.riskId}"`,
    });
  }

  async unlinkControl(
    id: string,
    controlId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    await this.prisma.riskControl.deleteMany({
      where: { riskId: id, controlId },
    });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'control_unlinked',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Unlinked control from risk "${risk.riskId}"`,
      metadata: { controlId },
    });
  }

  // ===========================
  // Risk Scenarios
  // ===========================

  async getScenarios(id: string, organizationId: string) {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    return this.prisma.riskScenario.findMany({
      where: { riskId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createScenario(
    id: string,
    organizationId: string,
    dto: CreateScenarioDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const scenario = await this.prisma.riskScenario.create({
      data: {
        riskId: id,
        title: dto.title,
        description: dto.description,
        threatActor: dto.threatActor,
        attackVector: dto.attackVector,
         
        likelihood: dto.likelihood as any,
         
        impact: dto.impact as any,
        notes: dto.notes,
        createdBy: userId,
      },
    });

    // Link target assets via parent Risk's RiskAsset junction table
    if (dto.targetAssets && dto.targetAssets.length > 0) {
      await this.prisma.riskAsset.createMany({
        data: dto.targetAssets.map((assetId) => ({
          riskId: id,
          assetId,
          notes: `Linked via scenario: ${dto.title}`,
        })),
        skipDuplicates: true,
      });
    }

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'scenario_created',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Created scenario "${dto.title}" for risk "${risk.riskId}"`,
    });

    return scenario;
  }

  async updateScenario(
    id: string,
    scenarioId: string,
    organizationId: string,
    dto: UpdateScenarioDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const scenario = await this.prisma.riskScenario.update({
      where: { id: scenarioId },
      data: {
        title: dto.title,
        description: dto.description,
        threatActor: dto.threatActor,
        attackVector: dto.attackVector,
         
        likelihood: dto.likelihood as any,
         
        impact: dto.impact as any,
        notes: dto.notes,
      },
    });

    // Update target assets via parent Risk's RiskAsset junction table
    if (dto.targetAssets !== undefined) {
      // Delete existing risk-asset links for this scenario
      // Note: We can't distinguish which assets belong to which scenario,
      // so we'll update all assets for the risk
      if (dto.targetAssets.length > 0) {
        await this.prisma.riskAsset.createMany({
          data: dto.targetAssets.map((assetId) => ({
            riskId: id,
            assetId,
            notes: `Linked via scenario: ${scenario.title}`,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'scenario_updated',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Updated scenario "${scenario.title}" for risk "${risk.riskId}"`,
    });

    return scenario;
  }

  async deleteScenario(
    id: string,
    scenarioId: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const risk = await this.prisma.risk.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    const scenario = await this.prisma.riskScenario.findUnique({
      where: { id: scenarioId },
    });

    if (!scenario) {
      throw new NotFoundException('Scenario not found');
    }

    await this.prisma.riskScenario.delete({ where: { id: scenarioId } });

    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'scenario_deleted',
      entityType: 'risk',
      entityId: id,
      entityName: risk.title,
      description: `Deleted scenario "${scenario.title}" from risk "${risk.riskId}"`,
    });
  }

  // ===========================
  // Dashboard & Analytics
  // ===========================

  async getDashboard(organizationId: string): Promise<RiskDashboardDto> {
    const cacheKey = `risk:dashboard:${organizationId}`;
    
    // Cache risk dashboard for 5 minutes (dashboard data doesn't change frequently)
    return this.cache.getOrSet(
      cacheKey,
      async () => this.getDashboardUncached(organizationId),
      300,
    );
  }

  private async getDashboardUncached(organizationId: string): Promise<RiskDashboardDto> {
    const startTime = Date.now();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Open status array for SQL query
    const openStatuses = [
      RiskIntakeStatus.RISK_IDENTIFIED,
      RiskIntakeStatus.ACTUAL_RISK,
      RiskIntakeStatus.RISK_ANALYSIS_IN_PROGRESS,
      RiskIntakeStatus.RISK_ANALYZED,
    ];

    // Completed treatment statuses to exclude from overdue
    const completedTreatmentStatuses = [
      RiskTreatmentStatus.RISK_MITIGATION_COMPLETE,
      RiskTreatmentStatus.RISK_ACCEPT,
      RiskTreatmentStatus.RISK_AVOID,
      RiskTreatmentStatus.RISK_TRANSFER,
    ];

    // Pending assessment statuses
    const pendingAssessmentStatuses = [
      RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS,
      RiskAssessmentStatus.GRC_APPROVAL,
      RiskAssessmentStatus.GRC_REVISION,
    ];

    // Executive approval statuses
    const executiveApprovalStatuses = [
      RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
      RiskTreatmentStatus.EXECUTIVE_APPROVAL,
    ];

    // Use 3 parallel queries instead of 13:
    // 1. Aggregates (counts and group bys) - single raw SQL with CTEs
    // 2. Recent/upcoming risks (need full objects)
    // 3. Treatment counts (join required)
    const [aggregates, riskLists, treatmentCounts] = await Promise.all([
      // Query 1: All counts and aggregations in a single SQL query using CTEs
      this.prisma.$queryRaw<Array<{
        total_risks: number;
        open_risks: number;
        status_counts: Record<string, number>;
        category_counts: Record<string, number>;
        risk_level_counts: Record<string, number>;
        source_counts: Record<string, number>;
      }>>`
        WITH base_risks AS (
          SELECT * FROM risks 
          WHERE organization_id = ${organizationId} AND deleted_at IS NULL
        ),
        totals AS (
          SELECT 
            COUNT(*)::int as total_risks,
            COUNT(*) FILTER (WHERE status::text = ANY(${openStatuses}::text[]))::int as open_risks
          FROM base_risks
        ),
        by_status AS (
          SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), cnt) as counts
          FROM (SELECT status, COUNT(*)::int as cnt FROM base_risks GROUP BY status) s
        ),
        by_category AS (
          SELECT jsonb_object_agg(COALESCE(category, 'uncategorized'), cnt) as counts
          FROM (SELECT category, COUNT(*)::int as cnt FROM base_risks GROUP BY category) c
        ),
        by_risk_level AS (
          SELECT jsonb_object_agg(COALESCE(inherent_risk::text, 'unknown'), cnt) as counts
          FROM (SELECT inherent_risk, COUNT(*)::int as cnt FROM base_risks GROUP BY inherent_risk) r
        ),
        by_source AS (
          SELECT jsonb_object_agg(COALESCE(source, 'unknown'), cnt) as counts
          FROM (SELECT source, COUNT(*)::int as cnt FROM base_risks GROUP BY source) s
        )
        SELECT 
          t.total_risks,
          t.open_risks,
          COALESCE(bs.counts, '{}'::jsonb) as status_counts,
          COALESCE(bc.counts, '{}'::jsonb) as category_counts,
          COALESCE(brl.counts, '{}'::jsonb) as risk_level_counts,
          COALESCE(bsr.counts, '{}'::jsonb) as source_counts
        FROM totals t
        CROSS JOIN by_status bs
        CROSS JOIN by_category bc
        CROSS JOIN by_risk_level brl
        CROSS JOIN by_source bsr
      `,

      // Query 2: Recent risks, upcoming reviews, and overdue treatments (3 findMany in parallel)
      Promise.all([
        this.prisma.risk.findMany({
          where: { organizationId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            assessment: { select: { status: true } },
            treatment: { select: { status: true } },
            _count: { select: { assets: true, controls: true, scenarios: true } },
          },
        }),
        this.prisma.risk.findMany({
          where: {
            organizationId,
            deletedAt: null,
            nextReviewDue: { lte: thirtyDaysFromNow },
          },
          orderBy: { nextReviewDue: 'asc' },
          take: 5,
          include: {
            assessment: { select: { status: true } },
            treatment: { select: { status: true } },
            _count: { select: { assets: true, controls: true, scenarios: true } },
          },
        }),
        this.prisma.risk.findMany({
          where: {
            organizationId,
            deletedAt: null,
            treatment: {
              mitigationTargetDate: { lt: now },
               
              status: { notIn: completedTreatmentStatuses as any },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: {
            assessment: { select: { status: true } },
            treatment: { select: { status: true } },
            _count: { select: { assets: true, controls: true, scenarios: true } },
          },
        }),
      ]),

      // Query 3: All workflow counts in a single query
      this.prisma.$queryRaw<Array<{
        pending_assessments: number;
        pending_treatment_decisions: number;
        pending_executive_approvals: number;
        mitigations_in_progress: number;
      }>>`
        SELECT
          (SELECT COUNT(*)::int FROM risk_assessments ra 
           JOIN risks r ON r.id = ra.risk_id 
           WHERE r.organization_id = ${organizationId} AND r.deleted_at IS NULL 
           AND ra.status::text = ANY(${pendingAssessmentStatuses}::text[])) as pending_assessments,
          (SELECT COUNT(*)::int FROM risk_treatments rt 
           JOIN risks r ON r.id = rt.risk_id 
           WHERE r.organization_id = ${organizationId} AND r.deleted_at IS NULL 
           AND rt.status::text = ${RiskTreatmentStatus.TREATMENT_DECISION_REVIEW}) as pending_treatment_decisions,
          (SELECT COUNT(*)::int FROM risk_treatments rt 
           JOIN risks r ON r.id = rt.risk_id 
           WHERE r.organization_id = ${organizationId} AND r.deleted_at IS NULL 
           AND rt.status::text = ANY(${executiveApprovalStatuses}::text[])) as pending_executive_approvals,
          (SELECT COUNT(*)::int FROM risk_treatments rt 
           JOIN risks r ON r.id = rt.risk_id 
           WHERE r.organization_id = ${organizationId} AND r.deleted_at IS NULL 
           AND rt.status::text = ${RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS}) as mitigations_in_progress
      `,
    ]);

    const agg = aggregates[0] || {
      total_risks: 0,
      open_risks: 0,
      status_counts: {},
      category_counts: {},
      risk_level_counts: {},
      source_counts: {},
    };

    const [recentRisks, upcomingReviews, treatmentOverdue] = riskLists;
    const tc = treatmentCounts[0] || {
      pending_assessments: 0,
      pending_treatment_decisions: 0,
      pending_executive_approvals: 0,
      mitigations_in_progress: 0,
    };

    this.logger.debug(`Risk dashboard built in ${Date.now() - startTime}ms (3 queries instead of 13)`);

    // Convert aggregates to expected format
    const byStatus = Object.entries(agg.status_counts as Record<string, number>).map(([status, count]) => ({
      status,
      count,
    }));

    const byCategory = Object.entries(agg.category_counts as Record<string, number>).map(([category, count]) => ({
      category,
      count,
    }));

    const byRiskLevel = Object.entries(agg.risk_level_counts as Record<string, number>).map(([level, count]) => ({
      level,
      count,
    }));

    const bySource = Object.entries(agg.source_counts as Record<string, number>).map(([source, count]) => ({
      source,
      count,
    }));

    return {
      totalRisks: agg.total_risks,
      openRisks: agg.open_risks,
      byStatus,
      byCategory,
      byRiskLevel,
      bySource,
      recentRisks: recentRisks.map(r => this.toResponseDto(r)),
      upcomingReviews: upcomingReviews.map(r => this.toResponseDto(r)),
      treatmentOverdue: treatmentOverdue.map(r => this.toResponseDto(r)),
      pendingAssessments: tc.pending_assessments,
      pendingTreatmentDecisions: tc.pending_treatment_decisions,
      pendingExecutiveApprovals: tc.pending_executive_approvals,
      mitigationsInProgress: tc.mitigations_in_progress,
    };
  }

  async getHeatmap(organizationId: string): Promise<RiskHeatmapDto> {
    const cacheKey = CacheKeys.riskMatrix(organizationId);
    
    // Cache heatmap for 2 minutes
    return this.cache.getOrSet(
      cacheKey,
      async () => this.getHeatmapUncached(organizationId),
      120,
    );
  }

  private async getHeatmapUncached(organizationId: string): Promise<RiskHeatmapDto> {
    const risks = await this.prisma.risk.findMany({
      where: { organizationId, deletedAt: null, likelihood: { not: null }, impact: { not: null } },
      select: {
        id: true,
        riskId: true,
        title: true,
        likelihood: true,
        impact: true,
      },
    });

    const likelihoods = ['rare', 'unlikely', 'possible', 'likely', 'almost_certain'];
    const impacts = ['negligible', 'minor', 'moderate', 'major', 'severe'];

    const matrix: RiskHeatmapDto['matrix'] = [];

    for (const likelihood of likelihoods) {
      for (const impact of impacts) {
        const matchingRisks = risks.filter(
          r => r.likelihood === likelihood && r.impact === impact,
        );
        matrix.push({
          likelihood,
          impact,
          count: matchingRisks.length,
          risks: matchingRisks.map(r => ({
            id: r.id,
            riskId: r.riskId,
            title: r.title,
          })),
        });
      }
    }

    return { matrix };
  }

  async getTrend(organizationId: string, days: number = 90) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await this.prisma.riskHistory.findMany({
      where: {
        risk: { organizationId, deletedAt: null },
        changedAt: { gte: startDate },
        action: { in: ['risk_submitted', 'assessment_approved', 'mitigation_done', 'executive_approved'] },
      },
      orderBy: { changedAt: 'asc' },
      select: {
        action: true,
        changedAt: true,
        changes: true,
      },
    });

    const weeks: Record<string, { created: number; assessed: number; mitigated: number; accepted: number }> = {};

    for (const entry of history) {
      const weekStart = this.getWeekStart(entry.changedAt);
      const key = weekStart.toISOString().split('T')[0];

      if (!weeks[key]) {
        weeks[key] = { created: 0, assessed: 0, mitigated: 0, accepted: 0 };
      }

      switch (entry.action) {
        case 'risk_submitted':
          weeks[key].created++;
          break;
        case 'assessment_approved':
          weeks[key].assessed++;
          break;
        case 'mitigation_done':
          weeks[key].mitigated++;
          break;
        case 'executive_approved':
          weeks[key].accepted++;
          break;
      }
    }

    return Object.entries(weeks).map(([week, data]) => ({
      week,
      ...data,
    }));
  }

  // ===========================
  // Helpers
  // ===========================

   
  private toResponseDto(risk: Record<string, any>): RiskResponseDto {
    return {
      id: risk.id,
      riskId: risk.riskId,
      title: risk.title,
      description: risk.description,
      category: risk.category || undefined,
      source: risk.source,
      status: risk.status,
      initialSeverity: risk.initialSeverity,
      likelihood: risk.likelihood || undefined,
      impact: risk.impact || undefined,
      inherentRisk: risk.inherentRisk || undefined,
      residualRisk: risk.residualRisk || undefined,
      likelihoodPct: risk.likelihoodPct || undefined,
      impactValue: risk.impactValue || undefined,
      annualLossExp: risk.annualLossExp || undefined,
      treatmentPlan: risk.treatmentPlan || undefined,
      treatmentStatus: risk.treatmentStatus || undefined,
      treatmentNotes: risk.treatmentNotes || undefined,
      treatmentDueDate: risk.treatmentDueDate || undefined,
      reporterId: risk.reporterId || undefined,
      grcSmeId: risk.grcSmeId || undefined,
      riskAssessorId: risk.riskAssessorId || undefined,
      riskOwnerId: risk.riskOwnerId || undefined,
      reviewFrequency: risk.reviewFrequency,
      lastReviewedAt: risk.lastReviewedAt || undefined,
      nextReviewDue: risk.nextReviewDue || undefined,
      tags: risk.tags,
      assetCount: risk._count?.assets || 0,
      controlCount: risk._count?.controls || 0,
      scenarioCount: risk._count?.scenarios || 0,
      createdAt: risk.createdAt,
      updatedAt: risk.updatedAt,
      hasAssessment: !!risk.assessment,
      hasTreatment: !!risk.treatment,
      assessmentStatus: risk.assessment?.status || undefined,
      treatmentWorkflowStatus: risk.treatment?.status || undefined,
    };
  }

  private calculateNextReviewDate(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'semi-annual':
        return new Date(now.setMonth(now.getMonth() + 6));
      case 'annual':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 3));
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }
}
