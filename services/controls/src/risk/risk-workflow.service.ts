/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import { calculateRiskLevel, Likelihood, Impact } from './dto/risk.dto';
import { RiskWorkflowTasksService } from './risk-workflow-tasks.service';
import {
  RiskLevel as _PrismaRiskLevel,
  RiskTreatmentStatus as _PrismaRiskTreatmentStatus,
  RiskIntakeStatus as _PrismaRiskIntakeStatus,
  RiskAssessmentStatus as _PrismaRiskAssessmentStatus
} from '@prisma/client';

// ===========================================
// Risk Workflow Status Constants
// ===========================================

export const RiskIntakeStatus = {
  RISK_IDENTIFIED: 'risk_identified',
  NOT_A_RISK: 'not_a_risk',
  ACTUAL_RISK: 'actual_risk',
  RISK_ANALYSIS_IN_PROGRESS: 'risk_analysis_in_progress',
  RISK_ANALYZED: 'risk_analyzed',
} as const;

export const RiskAssessmentStatus = {
  RISK_ASSESSOR_ANALYSIS: 'risk_assessor_analysis',
  GRC_APPROVAL: 'grc_approval',
  GRC_REVISION: 'grc_revision',
  DONE: 'done',
} as const;

export const RiskTreatmentStatus = {
  TREATMENT_DECISION_REVIEW: 'treatment_decision_review',
  IDENTIFY_EXECUTIVE_APPROVER: 'identify_executive_approver',
  EXECUTIVE_APPROVAL: 'executive_approval',
  ROUTING: 'routing',
  RISK_MITIGATION_IN_PROGRESS: 'risk_mitigation_in_progress',
  MITIGATION_STATUS_UPDATE: 'mitigation_status_update',
  MITIGATION_STATUS_ROUTING: 'mitigation_status_routing',
  RISK_ACCEPT: 'risk_accept',
  RISK_TRANSFER: 'risk_transfer',
  RISK_AVOID: 'risk_avoid',
  RISK_AUTO_ACCEPT: 'risk_auto_accept',
  RISK_MITIGATION_COMPLETE: 'risk_mitigation_complete',
} as const;

export const TreatmentDecision = {
  MITIGATE: 'mitigate',
  ACCEPT: 'accept',
  TRANSFER: 'transfer',
  AVOID: 'avoid',
} as const;

export const RiskLevel = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
} as const;

// Treatment Logic Matrix - determines next state based on decision + risk level
const TREATMENT_ROUTING: Record<string, Record<string, string>> = {
  [TreatmentDecision.MITIGATE]: {
    [RiskLevel.VERY_HIGH]: RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
    [RiskLevel.HIGH]: RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
    [RiskLevel.MEDIUM]: RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
    [RiskLevel.LOW]: RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
    [RiskLevel.VERY_LOW]: RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
  },
  [TreatmentDecision.ACCEPT]: {
    [RiskLevel.VERY_HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.MEDIUM]: RiskTreatmentStatus.RISK_ACCEPT,
    [RiskLevel.LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
    [RiskLevel.VERY_LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
  },
  [TreatmentDecision.TRANSFER]: {
    [RiskLevel.VERY_HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.MEDIUM]: RiskTreatmentStatus.RISK_TRANSFER,
    [RiskLevel.LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
    [RiskLevel.VERY_LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
  },
  [TreatmentDecision.AVOID]: {
    [RiskLevel.VERY_HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.HIGH]: RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER,
    [RiskLevel.MEDIUM]: RiskTreatmentStatus.RISK_AVOID,
    [RiskLevel.LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
    [RiskLevel.VERY_LOW]: RiskTreatmentStatus.RISK_AUTO_ACCEPT,
  },
};

// ===========================================
// DTOs
// ===========================================

export interface CreateRiskIntakeDto {
  title: string;
  description: string;
  source: string; // internal_security_reviews, ad_hoc_discovery, external_security_reviews, incident_response, policy_exception, employee_reporting
  category?: string;
  initialSeverity: string; // very_low, low, medium, high, very_high
  documentation?: Record<string, unknown>;
  suggestedSmeId?: string;
  tags?: string[];
}

export interface ValidateRiskDto {
  decision: 'approve' | 'decline';
  grcSmeId: string;
  notes?: string;
}

export interface AssignRiskAssessorDto {
  riskAssessorId: string;
  notes?: string;
}

export interface SubmitAssessmentDto {
  threatDescription: string;
  affectedAssets?: string[];
  existingControls?: string[];
  vulnerabilities?: string;
  likelihoodScore: string; // rare, unlikely, possible, likely, almost_certain
  likelihoodRationale?: string;
  impactScore: string; // negligible, minor, moderate, major, severe
  impactRationale?: string;
  impactCategories?: { financial?: string; operational?: string; reputational?: string };
  recommendedOwnerId?: string;
  assessmentNotes?: string;
  treatmentRecommendation?: string;
}

export interface GrcReviewDto {
  decision: 'approve' | 'decline';
  notes?: string;
  updatedAssessment?: Partial<SubmitAssessmentDto>;
}

export interface SubmitTreatmentDecisionDto {
  treatmentDecision: string; // mitigate, accept, transfer, avoid
  justification: string;
  // Mitigation fields
  mitigationDescription?: string;
  mitigationTargetDate?: string;
  // Transfer fields
  transferTo?: string;
  transferCost?: number;
  // Avoid fields
  avoidStrategy?: string;
  // Accept fields
  acceptanceRationale?: string;
  acceptanceExpiresAt?: string;
}

export interface SetExecutiveApproverDto {
  executiveApproverId: string;
}

export interface ExecutiveDecisionDto {
  decision: 'approve' | 'deny';
  notes?: string;
}

export interface MitigationUpdateDto {
  status: 'on_track' | 'delayed' | 'cancelled' | 'done';
  progress?: number; // 0-100
  notes?: string;
  newTargetDate?: string; // If delayed
  delayReason?: string;
  cancellationReason?: string;
  completionEvidence?: string;
  effectivenessNotes?: string;
  // Residual risk after mitigation
  residualLikelihood?: string;
  residualImpact?: string;
}

@Injectable()
export class RiskWorkflowService {
  private readonly logger = new Logger(RiskWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => RiskWorkflowTasksService))
    private riskWorkflowTasksService: RiskWorkflowTasksService,
  ) {}

  // ===========================================
  // Risk Intake Workflow
  // ===========================================

  /**
   * Submit a new risk intake (creates in RISK_IDENTIFIED status)
   */
  async submitRiskIntake(
    organizationId: string,
    dto: CreateRiskIntakeDto,
    reporterId: string,
    _userEmail?: string,
  ) {
    // Generate risk ID
    const count = await this.prisma.risk.count({ where: { organizationId } });
    const riskId = `RISK-${String(count + 1).padStart(3, '0')}`;

    const risk = await this.prisma.risk.create({
      data: {
        organizationId,
        riskId,
        title: dto.title,
        description: dto.description,
        source: dto.source,
        category: dto.category || 'security',
         
        status: RiskIntakeStatus.RISK_IDENTIFIED as any,
         
        initialSeverity: dto.initialSeverity as any,
        documentation: dto.documentation ? JSON.parse(JSON.stringify(dto.documentation)) : undefined,
        reporterId,
        riskAssessorId: dto.suggestedSmeId, // Store suggested SME
        tags: dto.tags || [],
        createdBy: reporterId,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId: risk.id,
        action: 'risk_submitted',
        notes: `Risk submitted by reporter`,
        changedBy: reporterId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId: reporterId,
      userEmail: _userEmail,
      action: 'risk_intake_submitted',
      entityType: 'risk',
      entityId: risk.id,
      entityName: risk.title,
      description: `New risk "${riskId}" submitted for review`,
    });

    // Notify GRC team (you'd typically notify a group here)
    this.logger.log(`Risk ${riskId} submitted - awaiting GRC validation`);

    return risk;
  }

  /**
   * GRC SME validates the risk (approve -> ACTUAL_RISK, decline -> NOT_A_RISK)
   */
  async validateRisk(
    riskId: string,
    organizationId: string,
    dto: ValidateRiskDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId, status: RiskIntakeStatus.RISK_IDENTIFIED },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found or not in RISK_IDENTIFIED status');
    }

    const newStatus = dto.decision === 'approve' 
      ? RiskIntakeStatus.ACTUAL_RISK 
      : RiskIntakeStatus.NOT_A_RISK;

    const updated = await this.prisma.risk.update({
      where: { id: riskId },
      data: {
         
        status: newStatus as any,
        grcSmeId: dto.grcSmeId,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: dto.decision === 'approve' ? 'risk_validated' : 'risk_declined',
        changes: { decision: dto.decision, newStatus },
        notes: dto.notes,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: dto.decision === 'approve' ? 'risk_validated' : 'risk_declined',
      entityType: 'risk',
      entityId: riskId,
      entityName: risk.title,
      description: `Risk "${risk.riskId}" ${dto.decision === 'approve' ? 'validated as actual risk' : 'declined (not a risk)'}`,
    });

    // Notify reporter
    if (risk.reporterId) {
      await this.notificationsService.create({
        organizationId,
        userId: risk.reporterId,
        type: NotificationType.RISK_STATUS_CHANGED,
        title: `Risk ${risk.riskId} ${dto.decision === 'approve' ? 'Validated' : 'Declined'}`,
        message: dto.decision === 'approve' 
          ? `Your submitted risk has been validated and will proceed to assessment`
          : `Your submitted risk was declined: ${dto.notes || 'Not classified as a risk'}`,
        entityType: 'risk',
        entityId: riskId,
        severity: NotificationSeverity.INFO,
      });
    }

    // Auto-create task when risk is validated
    if (dto.decision === 'approve' && dto.grcSmeId) {
      try {
        await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
          riskId,
          organizationId,
          'risk_validated',
          dto.grcSmeId, // GRC SME will assign the assessor
          userId,
        );
      } catch (error: unknown) {
        this.logger.error(`Failed to auto-create task for risk validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return updated;
  }

  /**
   * GRC SME assigns risk assessor and moves to analysis (ACTUAL_RISK -> RISK_ANALYSIS_IN_PROGRESS)
   */
  async assignRiskAssessor(
    riskId: string,
    organizationId: string,
    dto: AssignRiskAssessorDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId, status: RiskIntakeStatus.ACTUAL_RISK },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found or not in ACTUAL_RISK status');
    }

    // Create assessment sub-ticket
    const assessment = await this.prisma.riskAssessment.create({
      data: {
        riskId,
         
        status: RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS as any,
        riskAssessorId: dto.riskAssessorId,
        grcSmeId: risk.grcSmeId,
      },
    });

    // Update risk status
    const updated = await this.prisma.risk.update({
      where: { id: riskId },
      data: {
         
        status: RiskIntakeStatus.RISK_ANALYSIS_IN_PROGRESS as any,
        riskAssessorId: dto.riskAssessorId,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'risk_assessor_assigned',
        changes: { riskAssessorId: dto.riskAssessorId },
        notes: dto.notes,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'risk_assessor_assigned',
      entityType: 'risk',
      entityId: riskId,
      entityName: risk.title,
      description: `Risk assessor assigned for "${risk.riskId}"`,
    });

    // Notify risk assessor
    await this.notificationsService.create({
      organizationId,
      userId: dto.riskAssessorId,
      type: NotificationType.TASK_ASSIGNED,
      title: `Risk Assessment Assigned: ${risk.riskId}`,
      message: `You have been assigned to assess risk "${risk.title}"`,
      entityType: 'risk',
      entityId: riskId,
      severity: NotificationSeverity.WARNING,
    });

    return { risk: updated, assessment };
  }

  // ===========================================
  // Risk Assessment Workflow
  // ===========================================

  /**
   * Risk Assessor submits their assessment
   */
  async submitAssessment(
    riskId: string,
    organizationId: string,
    dto: SubmitAssessmentDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS) {
      throw new BadRequestException('Assessment is not in RISK_ASSESSOR_ANALYSIS status');
    }

    // Calculate risk score
    const calculatedRiskScore = calculateRiskLevel(
      dto.likelihoodScore as Likelihood, 
      dto.impactScore as Impact
    );

    // Update assessment
    const assessment = await this.prisma.riskAssessment.update({
      where: { id: risk.assessment.id },
      data: {
         
        status: RiskAssessmentStatus.GRC_APPROVAL as any,
        threatDescription: dto.threatDescription,
        vulnerabilities: dto.vulnerabilities,
         
        likelihoodScore: dto.likelihoodScore as any,
        likelihoodRationale: dto.likelihoodRationale,
         
        impactScore: dto.impactScore as any,
        impactRationale: dto.impactRationale,
        impactCategories: dto.impactCategories,
         
        calculatedRiskScore: calculatedRiskScore as any,
        recommendedOwnerId: dto.recommendedOwnerId,
        assessmentNotes: dto.assessmentNotes,
        treatmentRecommendation: dto.treatmentRecommendation,
        assessorSubmittedAt: new Date(),
      },
    });

    // Update affected assets via RiskAsset junction table
    if (dto.affectedAssets && dto.affectedAssets.length > 0) {
      await this.prisma.riskAsset.deleteMany({
        where: { riskId },
      });
      await this.prisma.riskAsset.createMany({
        data: dto.affectedAssets.map((assetId) => ({
          riskId,
          assetId,
        })),
        skipDuplicates: true,
      });
    }

    // Update existing controls via RiskControl junction table
    if (dto.existingControls && dto.existingControls.length > 0) {
      await this.prisma.riskControl.deleteMany({
        where: { riskId },
      });
      await this.prisma.riskControl.createMany({
        data: dto.existingControls.map((controlId) => ({
          riskId,
          controlId,
          effectiveness: 'partial',
        })),
        skipDuplicates: true,
      });
    }

    // Update risk with assessment values
    await this.prisma.risk.update({
      where: { id: riskId },
      data: {
         
        likelihood: dto.likelihoodScore as any,
         
        impact: dto.impactScore as any,
         
        inherentRisk: calculatedRiskScore as any,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'assessment_submitted',
        changes: {
          likelihoodScore: dto.likelihoodScore,
          impactScore: dto.impactScore,
          calculatedRiskScore,
        },
        notes: dto.assessmentNotes,
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
      entityId: riskId,
      entityName: risk.title,
      description: `Assessment submitted for "${risk.riskId}" - Risk Score: ${calculatedRiskScore}`,
    });

    // Notify GRC SME
    if (risk.grcSmeId) {
      await this.notificationsService.create({
        organizationId,
        userId: risk.grcSmeId,
        type: NotificationType.TASK_ASSIGNED,
        title: `Risk Assessment Ready for Review: ${risk.riskId}`,
        message: `Assessment for "${risk.title}" has been submitted and requires GRC approval`,
        entityType: 'risk',
        entityId: riskId,
        severity: NotificationSeverity.WARNING,
      });

      // Auto-create task for GRC review
      try {
        await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
          riskId,
          organizationId,
          'assessment_submitted',
          risk.grcSmeId,
          userId,
        );
      } catch (error: unknown) {
        this.logger.error(`Failed to auto-create task for assessment review: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return assessment;
  }

  /**
   * GRC SME reviews and approves/declines the assessment
   */
  async reviewAssessment(
    riskId: string,
    organizationId: string,
    dto: GrcReviewDto,
    userId: string,
    _userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.GRC_APPROVAL) {
      throw new BadRequestException('Assessment is not in GRC_APPROVAL status');
    }

    if (dto.decision === 'approve') {
      // Approve assessment -> Create treatment sub-ticket
      const assessment = await this.prisma.riskAssessment.update({
        where: { id: risk.assessment.id },
        data: {
           
          status: RiskAssessmentStatus.DONE as any,
          grcReviewNotes: dto.notes,
          grcApprovedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Update risk status
      await this.prisma.risk.update({
        where: { id: riskId },
        data: {
           
          status: RiskIntakeStatus.RISK_ANALYZED as any,
          riskOwnerId: risk.assessment.recommendedOwnerId,
        },
      });

      // Create treatment sub-ticket
      const treatment = await this.prisma.riskTreatment.create({
        data: {
          riskId,
           
          status: RiskTreatmentStatus.TREATMENT_DECISION_REVIEW as any,
          riskOwnerId: risk.assessment.recommendedOwnerId,
          grcSmeId: risk.grcSmeId,
        },
      });

      // Record history
      await this.prisma.riskHistory.create({
        data: {
          riskId,
          action: 'assessment_approved',
          notes: dto.notes,
          changedBy: userId,
        },
      });

      // Notify Risk Owner
      if (risk.assessment.recommendedOwnerId) {
        await this.notificationsService.create({
          organizationId,
          userId: risk.assessment.recommendedOwnerId,
          type: NotificationType.TASK_ASSIGNED,
          title: `Risk Treatment Decision Required: ${risk.riskId}`,
          message: `Risk "${risk.title}" assessment approved - treatment decision needed`,
          entityType: 'risk',
          entityId: riskId,
          severity: NotificationSeverity.WARNING,
        });

        // Auto-create task for treatment decision
        try {
          await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
            riskId,
            organizationId,
            'assessment_approved',
            risk.assessment.recommendedOwnerId,
            userId,
          );
        } catch (error: unknown) {
          this.logger.error(`Failed to auto-create task for treatment decision: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return { assessment, treatment };
    } else {
      // Decline -> GRC Revision
      const assessment = await this.prisma.riskAssessment.update({
        where: { id: risk.assessment.id },
        data: {
           
          status: RiskAssessmentStatus.GRC_REVISION as any,
          grcReviewNotes: dto.notes,
          grcDeclinedReason: dto.notes,
        },
      });

      // Record history
      await this.prisma.riskHistory.create({
        data: {
          riskId,
          action: 'assessment_revision_requested',
          notes: dto.notes,
          changedBy: userId,
        },
      });

      return { assessment };
    }
  }

  /**
   * GRC SME submits revised assessment (from GRC_REVISION -> DONE)
   */
  async submitGrcRevision(
    riskId: string,
    organizationId: string,
    dto: SubmitAssessmentDto,
    userId: string,
    _userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { assessment: true },
    });

    if (!risk || !risk.assessment) {
      throw new NotFoundException('Risk or assessment not found');
    }

    if (risk.assessment.status !== RiskAssessmentStatus.GRC_REVISION) {
      throw new BadRequestException('Assessment is not in GRC_REVISION status');
    }

    // Recalculate risk score
    const calculatedRiskScore = calculateRiskLevel(
      dto.likelihoodScore as Likelihood, 
      dto.impactScore as Impact
    );

    // Update assessment
    const assessment = await this.prisma.riskAssessment.update({
      where: { id: risk.assessment.id },
      data: {
         
        status: RiskAssessmentStatus.DONE as any,
        threatDescription: dto.threatDescription,
        vulnerabilities: dto.vulnerabilities,
         
        likelihoodScore: dto.likelihoodScore as any,
        likelihoodRationale: dto.likelihoodRationale,
         
        impactScore: dto.impactScore as any,
        impactRationale: dto.impactRationale,
        impactCategories: dto.impactCategories,
         
        calculatedRiskScore: calculatedRiskScore as any,
        recommendedOwnerId: dto.recommendedOwnerId,
        assessmentNotes: dto.assessmentNotes,
        treatmentRecommendation: dto.treatmentRecommendation,
        completedAt: new Date(),
      },
    });

    // Update affected assets via RiskAsset junction table
    if (dto.affectedAssets && dto.affectedAssets.length > 0) {
      await this.prisma.riskAsset.deleteMany({
        where: { riskId },
      });
      await this.prisma.riskAsset.createMany({
        data: dto.affectedAssets.map((assetId) => ({
          riskId,
          assetId,
        })),
        skipDuplicates: true,
      });
    }

    // Update existing controls via RiskControl junction table
    if (dto.existingControls && dto.existingControls.length > 0) {
      await this.prisma.riskControl.deleteMany({
        where: { riskId },
      });
      await this.prisma.riskControl.createMany({
        data: dto.existingControls.map((controlId) => ({
          riskId,
          controlId,
          effectiveness: 'partial',
        })),
        skipDuplicates: true,
      });
    }

    // Update risk with assessment values
    await this.prisma.risk.update({
      where: { id: riskId },
      data: {
         
        status: RiskIntakeStatus.RISK_ANALYZED as any,
         
        likelihood: dto.likelihoodScore as any,
         
        impact: dto.impactScore as any,
         
        inherentRisk: calculatedRiskScore as any,
        riskOwnerId: dto.recommendedOwnerId,
      },
    });

    // Create treatment sub-ticket
    const treatment = await this.prisma.riskTreatment.create({
      data: {
        riskId,
         
        status: RiskTreatmentStatus.TREATMENT_DECISION_REVIEW as any,
        riskOwnerId: dto.recommendedOwnerId,
        grcSmeId: risk.grcSmeId,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'assessment_revised',
        changes: {
          likelihoodScore: dto.likelihoodScore,
          impactScore: dto.impactScore,
          calculatedRiskScore,
        },
        changedBy: userId,
      },
    });

    // Notify Risk Owner
    if (dto.recommendedOwnerId) {
      await this.notificationsService.create({
        organizationId,
        userId: dto.recommendedOwnerId,
        type: NotificationType.TASK_ASSIGNED,
        title: `Risk Treatment Decision Required: ${risk.riskId}`,
        message: `Risk "${risk.title}" assessment completed - treatment decision needed`,
        entityType: 'risk',
        entityId: riskId,
        severity: NotificationSeverity.WARNING,
      });
    }

    return { assessment, treatment };
  }

  // ===========================================
  // Risk Treatment Workflow
  // ===========================================

  /**
   * Risk Owner submits treatment decision
   */
  async submitTreatmentDecision(
    riskId: string,
    organizationId: string,
    dto: SubmitTreatmentDecisionDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { treatment: true, assessment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.TREATMENT_DECISION_REVIEW) {
      throw new BadRequestException('Treatment is not in TREATMENT_DECISION_REVIEW status');
    }

    // Determine next status based on treatment decision + risk level
    const riskLevel = risk.inherentRisk || RiskLevel.MEDIUM;
    const nextStatus = TREATMENT_ROUTING[dto.treatmentDecision]?.[riskLevel] 
      || RiskTreatmentStatus.RISK_ACCEPT;

    // Determine if executive approval is required
    const executiveApprovalRequired = nextStatus === RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER;

    // Update treatment
    const treatment = await this.prisma.riskTreatment.update({
      where: { id: risk.treatment.id },
      data: {
         
        status: nextStatus as any,
         
        treatmentDecision: dto.treatmentDecision as any,
        treatmentJustification: dto.justification,
        treatmentPlan: dto.mitigationDescription,
        mitigationDescription: dto.mitigationDescription,
        mitigationTargetDate: dto.mitigationTargetDate ? new Date(dto.mitigationTargetDate) : undefined,
        transferTo: dto.transferTo,
        transferCost: dto.transferCost,
        avoidStrategy: dto.avoidStrategy,
        acceptanceRationale: dto.acceptanceRationale,
        acceptanceExpiresAt: dto.acceptanceExpiresAt ? new Date(dto.acceptanceExpiresAt) : undefined,
        executiveApprovalRequired,
      },
    });

    // Update risk with treatment plan
    await this.prisma.risk.update({
      where: { id: riskId },
      data: {
         
        treatmentPlan: dto.treatmentDecision as any,
        treatmentStatus: 'pending',
        treatmentNotes: dto.justification,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'treatment_decision_submitted',
        changes: {
          decision: dto.treatmentDecision,
          nextStatus,
          executiveApprovalRequired,
        },
        notes: dto.justification,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'treatment_decision_submitted',
      entityType: 'risk',
      entityId: riskId,
      entityName: risk.title,
      description: `Treatment decision "${dto.treatmentDecision}" submitted for "${risk.riskId}"`,
    });

    // Handle notifications based on next status
    if (executiveApprovalRequired && risk.grcSmeId) {
      // Notify GRC SME to identify executive approver
      await this.notificationsService.create({
        organizationId,
        userId: risk.grcSmeId,
        type: NotificationType.TASK_ASSIGNED,
        title: `Executive Approver Needed: ${risk.riskId}`,
        message: `High/Very High risk "${risk.title}" requires executive approval for ${dto.treatmentDecision}`,
        entityType: 'risk',
        entityId: riskId,
        severity: NotificationSeverity.ERROR,
      });
    }

    return treatment;
  }

  /**
   * GRC SME sets executive approver
   */
  async setExecutiveApprover(
    riskId: string,
    organizationId: string,
    dto: SetExecutiveApproverDto,
    userId: string,
    _userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER) {
      throw new BadRequestException('Treatment is not in IDENTIFY_EXECUTIVE_APPROVER status');
    }

    const treatment = await this.prisma.riskTreatment.update({
      where: { id: risk.treatment.id },
      data: {
         
        status: RiskTreatmentStatus.EXECUTIVE_APPROVAL as any,
        executiveApproverId: dto.executiveApproverId,
         
        executiveApprovalStatus: 'pending' as any,
      },
    });

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'executive_approver_assigned',
        changes: { executiveApproverId: dto.executiveApproverId },
        changedBy: userId,
      },
    });

    // Notify executive approver
    await this.notificationsService.create({
      organizationId,
      userId: dto.executiveApproverId,
      type: NotificationType.TASK_ASSIGNED,
      title: `Executive Approval Required: ${risk.riskId}`,
      message: `Your approval is needed for risk treatment decision on "${risk.title}"`,
      entityType: 'risk',
      entityId: riskId,
      severity: NotificationSeverity.ERROR,
    });

    // Auto-create task for executive approval
    try {
      await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
        riskId,
        organizationId,
        'executive_approval_needed',
        dto.executiveApproverId,
        userId,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to auto-create task for executive approval: ${error instanceof Error ? error.message : String(error)}`);
    }

    return treatment;
  }

  /**
   * Executive approves or denies treatment decision
   */
  async submitExecutiveDecision(
    riskId: string,
    organizationId: string,
    dto: ExecutiveDecisionDto,
    userId: string,
    _userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    if (risk.treatment.status !== RiskTreatmentStatus.EXECUTIVE_APPROVAL) {
      throw new BadRequestException('Treatment is not in EXECUTIVE_APPROVAL status');
    }

    if (dto.decision === 'approve') {
      // Determine final status based on treatment decision
      let nextStatus: string;
      switch (risk.treatment.treatmentDecision) {
        case TreatmentDecision.MITIGATE:
          nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
          break;
        case TreatmentDecision.ACCEPT:
          nextStatus = RiskTreatmentStatus.RISK_ACCEPT;
          break;
        case TreatmentDecision.TRANSFER:
          nextStatus = RiskTreatmentStatus.RISK_TRANSFER;
          break;
        case TreatmentDecision.AVOID:
          nextStatus = RiskTreatmentStatus.RISK_AVOID;
          break;
        default:
          nextStatus = RiskTreatmentStatus.RISK_ACCEPT;
      }

      const treatment = await this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: nextStatus as any,
           
          executiveApprovalStatus: 'approved' as any,
          executiveApprovalNotes: dto.notes,
          executiveApprovedAt: new Date(),
        },
      });

      // Update risk treatment status
      await this.prisma.risk.update({
        where: { id: riskId },
        data: {
          treatmentStatus: 'in_progress',
        },
      });

      // Record history
      await this.prisma.riskHistory.create({
        data: {
          riskId,
          action: 'executive_approval_granted',
          changes: { nextStatus },
          notes: dto.notes,
          changedBy: userId,
        },
      });

      // Notify Risk Owner
      if (risk.riskOwnerId) {
        await this.notificationsService.create({
          organizationId,
          userId: risk.riskOwnerId,
          type: NotificationType.RISK_STATUS_CHANGED,
          title: `Executive Approval Granted: ${risk.riskId}`,
          message: `Executive approval granted for ${risk.treatment.treatmentDecision} decision on "${risk.title}"`,
          entityType: 'risk',
          entityId: riskId,
          severity: NotificationSeverity.SUCCESS,
        });

        // Auto-create task for mitigation if mitigate was the decision
        if (risk.treatment.treatmentDecision === TreatmentDecision.MITIGATE) {
          try {
            await this.riskWorkflowTasksService.createTaskForWorkflowTransition(
              riskId,
              organizationId,
              'mitigation_started',
              risk.riskOwnerId,
              userId,
            );
          } catch (error: unknown) {
            this.logger.error(`Failed to auto-create task for mitigation: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      return treatment;
    } else {
      // Denied -> back to treatment decision review
      const treatment = await this.prisma.riskTreatment.update({
        where: { id: risk.treatment.id },
        data: {
           
          status: RiskTreatmentStatus.TREATMENT_DECISION_REVIEW as any,
           
          executiveApprovalStatus: 'denied' as any,
          executiveDeniedReason: dto.notes,
          treatmentDecision: null, // Clear previous decision
        },
      });

      // Record history
      await this.prisma.riskHistory.create({
        data: {
          riskId,
          action: 'executive_approval_denied',
          notes: dto.notes,
          changedBy: userId,
        },
      });

      // Notify Risk Owner
      if (risk.riskOwnerId) {
        await this.notificationsService.create({
          organizationId,
          userId: risk.riskOwnerId,
          type: NotificationType.RISK_STATUS_CHANGED,
          title: `Executive Approval Denied: ${risk.riskId}`,
          message: `Executive approval denied for "${risk.title}". Please select a different treatment approach.`,
          entityType: 'risk',
          entityId: riskId,
          severity: NotificationSeverity.ERROR,
        });
      }

      return treatment;
    }
  }

  /**
   * Risk Owner submits mitigation progress update
   */
  async submitMitigationUpdate(
    riskId: string,
    organizationId: string,
    dto: MitigationUpdateDto,
    userId: string,
    userEmail?: string,
  ) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: { treatment: true },
    });

    if (!risk || !risk.treatment) {
      throw new NotFoundException('Risk or treatment not found');
    }

    const allowedStatuses = [
      RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS,
      RiskTreatmentStatus.MITIGATION_STATUS_UPDATE,
    ];

     
    if (!allowedStatuses.includes(risk.treatment.status as any)) {
      throw new BadRequestException('Treatment is not in a mitigation status');
    }

    // Determine next status based on update
    let nextStatus: string;
    switch (dto.status) {
      case 'on_track':
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
        break;
      case 'delayed':
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
        break;
      case 'cancelled':
        // Cancelled goes back to treatment decision
        nextStatus = RiskTreatmentStatus.TREATMENT_DECISION_REVIEW;
        break;
      case 'done':
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_COMPLETE;
        break;
      default:
        nextStatus = RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
    }

    // Calculate residual risk if provided
    let residualRiskScore: string | undefined;
    if (dto.residualLikelihood && dto.residualImpact) {
      residualRiskScore = calculateRiskLevel(
        dto.residualLikelihood as Likelihood,
        dto.residualImpact as Impact
      );
    }

    // Update treatment
    const treatment = await this.prisma.riskTreatment.update({
      where: { id: risk.treatment.id },
      data: {
         
        status: nextStatus as any,
         
        mitigationStatus: dto.status as any,
        mitigationProgress: dto.progress ?? risk.treatment.mitigationProgress,
        lastProgressUpdate: new Date(),
        mitigationTargetDate: dto.newTargetDate ? new Date(dto.newTargetDate) : risk.treatment.mitigationTargetDate,
        mitigationActualDate: dto.status === 'done' ? new Date() : undefined,
         
        residualLikelihood: dto.residualLikelihood as any,
         
        residualImpact: dto.residualImpact as any,
         
        residualRiskScore: residualRiskScore as any,
        completedAt: dto.status === 'done' ? new Date() : undefined,
      },
    });

    // Create treatment update record
    await this.prisma.riskTreatmentUpdate.create({
      data: {
        treatmentId: risk.treatment.id,
        updateType: dto.status === 'done' ? 'completion' :
                    dto.status === 'delayed' ? 'delay' :
                    dto.status === 'cancelled' ? 'cancellation' : 'progress',
           
          previousStatus: risk.treatment.mitigationStatus as any,
           
          newStatus: dto.status as any,
        progress: dto.progress,
        notes: dto.notes,
        newTargetDate: dto.newTargetDate ? new Date(dto.newTargetDate) : undefined,
        delayReason: dto.delayReason,
        cancellationReason: dto.cancellationReason,
        completionEvidence: dto.completionEvidence,
        effectivenessNotes: dto.effectivenessNotes,
        createdBy: userId,
      },
    });

    // Update risk with residual values if completed
    if (dto.status === 'done') {
      await this.prisma.risk.update({
        where: { id: riskId },
        data: {
          treatmentStatus: 'completed',
           
          residualRisk: residualRiskScore as any,
        },
      });
    }

    // Record history
    await this.prisma.riskHistory.create({
      data: {
        riskId,
        action: 'mitigation_update',
        changes: {
          status: dto.status,
          progress: dto.progress,
          residualRiskScore,
        },
        notes: dto.notes,
        changedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'mitigation_update',
      entityType: 'risk',
      entityId: riskId,
      entityName: risk.title,
      description: `Mitigation update for "${risk.riskId}": ${dto.status}`,
    });

    // Notify GRC SME on completion or cancellation
    if ((dto.status === 'done' || dto.status === 'cancelled') && risk.grcSmeId) {
      await this.notificationsService.create({
        organizationId,
        userId: risk.grcSmeId,
        type: NotificationType.RISK_STATUS_CHANGED,
        title: `Risk Mitigation ${dto.status === 'done' ? 'Complete' : 'Cancelled'}: ${risk.riskId}`,
        message: `Mitigation for "${risk.title}" has been ${dto.status === 'done' ? 'completed' : 'cancelled'}`,
        entityType: 'risk',
        entityId: riskId,
        severity: dto.status === 'done' ? NotificationSeverity.SUCCESS : NotificationSeverity.WARNING,
      });
    }

    return treatment;
  }

  // ===========================================
  // Workflow State Query
  // ===========================================

  /**
   * Get complete workflow state for a risk
   */
  async getWorkflowState(riskId: string, organizationId: string) {
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId },
      include: {
        assessment: true,
        treatment: {
          include: {
            updates: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        history: {
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    return {
      risk: {
        id: risk.id,
        riskId: risk.riskId,
        title: risk.title,
        status: risk.status,
        source: risk.source,
        initialSeverity: risk.initialSeverity,
        inherentRisk: risk.inherentRisk,
        residualRisk: risk.residualRisk,
        treatmentPlan: risk.treatmentPlan,
        treatmentStatus: risk.treatmentStatus,
      },
      roles: {
        reporterId: risk.reporterId,
        grcSmeId: risk.grcSmeId,
        riskAssessorId: risk.riskAssessorId,
        riskOwnerId: risk.riskOwnerId,
      },
      assessment: risk.assessment ? {
        id: risk.assessment.id,
        status: risk.assessment.status,
        calculatedRiskScore: risk.assessment.calculatedRiskScore,
        recommendedOwnerId: risk.assessment.recommendedOwnerId,
        assessorSubmittedAt: risk.assessment.assessorSubmittedAt,
        grcApprovedAt: risk.assessment.grcApprovedAt,
        completedAt: risk.assessment.completedAt,
      } : null,
      treatment: risk.treatment ? {
        id: risk.treatment.id,
        status: risk.treatment.status,
        treatmentDecision: risk.treatment.treatmentDecision,
        executiveApprovalRequired: risk.treatment.executiveApprovalRequired,
        executiveApprovalStatus: risk.treatment.executiveApprovalStatus,
        executiveApproverId: risk.treatment.executiveApproverId,
        mitigationStatus: risk.treatment.mitigationStatus,
        mitigationProgress: risk.treatment.mitigationProgress,
        mitigationTargetDate: risk.treatment.mitigationTargetDate,
        residualRiskScore: risk.treatment.residualRiskScore,
        completedAt: risk.treatment.completedAt,
        updates: risk.treatment.updates,
      } : null,
      history: risk.history,
      currentStage: this.determineCurrentStage(risk),
      availableActions: this.getAvailableActions(risk),
    };
  }

  /**
   * Determine current workflow stage for display
   */
   
  private determineCurrentStage(risk: Record<string, any>): string {
    // Check treatment status first
    if (risk.treatment) {
      const treatmentStatus = risk.treatment.status;
      if (treatmentStatus === RiskTreatmentStatus.RISK_MITIGATION_COMPLETE) {
        return 'completed';
      }
      if ([RiskTreatmentStatus.RISK_ACCEPT, RiskTreatmentStatus.RISK_TRANSFER, 
           RiskTreatmentStatus.RISK_AVOID, RiskTreatmentStatus.RISK_AUTO_ACCEPT].includes(treatmentStatus)) {
        return 'treatment_final';
      }
      if (treatmentStatus === RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS) {
        return 'mitigation_in_progress';
      }
      if (treatmentStatus === RiskTreatmentStatus.EXECUTIVE_APPROVAL) {
        return 'awaiting_executive_approval';
      }
      if (treatmentStatus === RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER) {
        return 'identify_executive';
      }
      if (treatmentStatus === RiskTreatmentStatus.TREATMENT_DECISION_REVIEW) {
        return 'treatment_decision';
      }
    }

    // Check assessment status
    if (risk.assessment) {
      const assessmentStatus = risk.assessment.status;
      if (assessmentStatus === RiskAssessmentStatus.GRC_REVISION) {
        return 'grc_revision';
      }
      if (assessmentStatus === RiskAssessmentStatus.GRC_APPROVAL) {
        return 'grc_review';
      }
      if (assessmentStatus === RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS) {
        return 'assessment';
      }
    }

    // Check risk intake status
    switch (risk.status) {
      case RiskIntakeStatus.RISK_IDENTIFIED:
        return 'intake_review';
      case RiskIntakeStatus.NOT_A_RISK:
        return 'declined';
      case RiskIntakeStatus.ACTUAL_RISK:
        return 'awaiting_assessor';
      case RiskIntakeStatus.RISK_ANALYSIS_IN_PROGRESS:
        return 'assessment';
      case RiskIntakeStatus.RISK_ANALYZED:
        return 'treatment_decision';
      default:
        return 'unknown';
    }
  }

  /**
   * Get available actions based on current workflow state
   */
   
  private getAvailableActions(risk: Record<string, any>): string[] {
    const actions: string[] = [];

    // Treatment actions
    if (risk.treatment) {
      switch (risk.treatment.status) {
        case RiskTreatmentStatus.TREATMENT_DECISION_REVIEW:
          actions.push('submit_treatment_decision');
          break;
        case RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER:
          actions.push('set_executive_approver');
          break;
        case RiskTreatmentStatus.EXECUTIVE_APPROVAL:
          actions.push('submit_executive_decision');
          break;
        case RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS:
          actions.push('submit_mitigation_update');
          break;
      }
    }

    // Assessment actions
    if (risk.assessment && !risk.treatment) {
      switch (risk.assessment.status) {
        case RiskAssessmentStatus.RISK_ASSESSOR_ANALYSIS:
          actions.push('submit_assessment');
          break;
        case RiskAssessmentStatus.GRC_APPROVAL:
          actions.push('review_assessment');
          break;
        case RiskAssessmentStatus.GRC_REVISION:
          actions.push('submit_grc_revision');
          break;
      }
    }

    // Risk intake actions
    if (!risk.assessment) {
      switch (risk.status) {
        case RiskIntakeStatus.RISK_IDENTIFIED:
          actions.push('validate_risk');
          break;
        case RiskIntakeStatus.ACTUAL_RISK:
          actions.push('assign_risk_assessor');
          break;
      }
    }

    return actions;
  }
}

