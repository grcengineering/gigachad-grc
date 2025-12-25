import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsDateString, Min, Max, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

// Helper to transform empty strings to undefined (for optional enum fields in query params)
const EmptyToUndefined = () => Transform(({ value }) => (value === '' ? undefined : value));

// ===========================
// Enums
// ===========================

// Risk Categories (from document)
export enum RiskCategory {
  TECHNICAL = 'technical', // Data Protection, Access Control, System Security, Monitoring & Logging
  PROCESS_COMPLIANCE = 'process_compliance', // Operational, Compliance, Review & Approval
  THIRD_PARTY = 'third_party', // Vendor Management, Shadow IT, Supply Chain
  OPERATIONAL = 'operational',
  STRATEGIC = 'strategic',
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  FINANCIAL = 'financial',
}

// Risk Sources (from document - Risk Identification Sources)
export enum RiskSource {
  INTERNAL_SECURITY_REVIEWS = 'internal_security_reviews',
  AD_HOC_DISCOVERY = 'ad_hoc_discovery',
  EXTERNAL_SECURITY_REVIEWS = 'external_security_reviews',
  INCIDENT_RESPONSE = 'incident_response',
  POLICY_EXCEPTION = 'policy_exception',
  EMPLOYEE_REPORTING = 'employee_reporting',
}

// Risk Intake Statuses (from workflow diagram 1)
export enum RiskIntakeStatus {
  RISK_IDENTIFIED = 'risk_identified',
  NOT_A_RISK = 'not_a_risk',
  ACTUAL_RISK = 'actual_risk',
  RISK_ANALYSIS_IN_PROGRESS = 'risk_analysis_in_progress',
  RISK_ANALYZED = 'risk_analyzed',
}

// Risk Assessment Statuses (from workflow diagram 3)
export enum RiskAssessmentStatus {
  RISK_ASSESSOR_ANALYSIS = 'risk_assessor_analysis',
  GRC_APPROVAL = 'grc_approval',
  GRC_REVISION = 'grc_revision',
  DONE = 'done',
}

// Risk Treatment Statuses (from workflow diagram 2)
export enum RiskTreatmentStatus {
  TREATMENT_DECISION_REVIEW = 'treatment_decision_review',
  ROUTING = 'routing',
  IDENTIFY_EXECUTIVE_APPROVER = 'identify_executive_approver',
  EXECUTIVE_APPROVAL = 'executive_approval',
  RISK_MITIGATION_IN_PROGRESS = 'risk_mitigation_in_progress',
  MITIGATION_STATUS_UPDATE = 'mitigation_status_update',
  MITIGATION_STATUS_ROUTING = 'mitigation_status_routing',
  RISK_MITIGATION_COMPLETE = 'risk_mitigation_complete',
  RISK_ACCEPT = 'risk_accept',
  RISK_TRANSFER = 'risk_transfer',
  RISK_AVOID = 'risk_avoid',
  RISK_AUTO_ACCEPT = 'risk_auto_accept',
}

// Mitigation Progress Statuses (from document)
export enum MitigationProgressStatus {
  ON_TRACK = 'on_track',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
  DONE = 'done',
}

// Qualitative Scoring
export enum Likelihood {
  RARE = 'rare',
  UNLIKELY = 'unlikely',
  POSSIBLE = 'possible',
  LIKELY = 'likely',
  ALMOST_CERTAIN = 'almost_certain',
}

export enum Impact {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
}

// Initial Severity (from intake form)
export enum InitialSeverity {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum TreatmentDecision {
  ACCEPT = 'accept',
  MITIGATE = 'mitigate',
  TRANSFER = 'transfer',
  AVOID = 'avoid',
}

export enum ControlEffectiveness {
  NONE = 'none',
  PARTIAL = 'partial',
  FULL = 'full',
}

// ===========================
// Risk Intake DTOs
// ===========================

// Initial Risk Submission (Risk Reporter)
export class CreateRiskDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(RiskSource)
  source: RiskSource = RiskSource.EMPLOYEE_REPORTING;

  @IsEnum(InitialSeverity)
  initialSeverity: InitialSeverity = InitialSeverity.MEDIUM;

  @IsOptional()
  @IsString()
  smeId?: string; // Suggested SME for assessment

  @IsOptional()
  @IsArray()
  documentation?: any[]; // Attachments info

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateRiskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(RiskCategory)
  category?: RiskCategory;

  @IsOptional()
  @IsEnum(RiskSource)
  source?: RiskSource;

  @IsOptional()
  @IsEnum(InitialSeverity)
  initialSeverity?: InitialSeverity;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// GRC SME validates risk (Risk Identified -> Actual Risk or Not A Risk)
export class ValidateRiskDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  reason?: string; // Required if declining

  @IsOptional()
  @IsString()
  riskAssessorId?: string; // Assign risk assessor if approving
}

// ===========================
// Risk Assessment DTOs
// ===========================

// Risk Assessor completes assessment form
export class SubmitAssessmentDto {
  @IsString()
  threatDescription: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  affectedAssets?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingControls?: string[];

  @IsOptional()
  @IsString()
  vulnerabilities?: string;

  @IsEnum(Likelihood)
  likelihoodScore: Likelihood;

  @IsString()
  likelihoodRationale: string;

  @IsEnum(Impact)
  impactScore: Impact;

  @IsString()
  impactRationale: string;

  @IsOptional()
  impactCategories?: {
    financial?: string;
    operational?: string;
    reputational?: string;
    legal?: string;
  };

  @IsString()
  recommendedOwnerId: string; // Who should own this risk

  @IsOptional()
  @IsString()
  assessmentNotes?: string;

  @IsOptional()
  @IsEnum(TreatmentDecision)
  treatmentRecommendation?: TreatmentDecision;
}

// GRC SME approves or declines assessment
export class ReviewAssessmentDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  declinedReason?: string;
}

// GRC SME revises assessment
export class ReviseAssessmentDto {
  @IsOptional()
  @IsEnum(Likelihood)
  likelihoodScore?: Likelihood;

  @IsOptional()
  @IsString()
  likelihoodRationale?: string;

  @IsOptional()
  @IsEnum(Impact)
  impactScore?: Impact;

  @IsOptional()
  @IsString()
  impactRationale?: string;

  @IsOptional()
  impactCategories?: {
    financial?: string;
    operational?: string;
    reputational?: string;
    legal?: string;
  };

  @IsOptional()
  @IsString()
  recommendedOwnerId?: string;

  @IsOptional()
  @IsString()
  assessmentNotes?: string;
}

// ===========================
// Risk Treatment DTOs
// ===========================

// Risk Owner makes treatment decision
export class SubmitTreatmentDecisionDto {
  @IsEnum(TreatmentDecision)
  decision: TreatmentDecision;

  @IsString()
  justification: string;

  // Mitigation specific
  @IsOptional()
  @IsString()
  mitigationDescription?: string;

  @IsOptional()
  @IsDateString()
  mitigationTargetDate?: string;

  // Transfer specific
  @IsOptional()
  @IsString()
  transferTo?: string;

  @IsOptional()
  @IsNumber()
  transferCost?: number;

  // Avoid specific
  @IsOptional()
  @IsString()
  avoidStrategy?: string;

  // Accept specific
  @IsOptional()
  @IsString()
  acceptanceRationale?: string;

  @IsOptional()
  @IsDateString()
  acceptanceExpiresAt?: string;
}

// GRC SME identifies executive approver
export class AssignExecutiveApproverDto {
  @IsString()
  executiveApproverId: string;
}

// Executive approves or denies
export class ExecutiveApprovalDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  deniedReason?: string;
}

// Risk Owner updates mitigation status
export class UpdateMitigationStatusDto {
  @IsEnum(MitigationProgressStatus)
  status: MitigationProgressStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // If delayed
  @IsOptional()
  @IsDateString()
  newTargetDate?: string;

  @IsOptional()
  @IsString()
  delayReason?: string;

  // If cancelled
  @IsOptional()
  @IsString()
  cancellationReason?: string;

  // If done
  @IsOptional()
  @IsEnum(Likelihood)
  residualLikelihood?: Likelihood;

  @IsOptional()
  @IsEnum(Impact)
  residualImpact?: Impact;
}

// Legacy DTO for backwards compatibility
export class UpdateTreatmentDto {
  @IsEnum(TreatmentDecision)
  treatmentPlan: TreatmentDecision;

  @IsOptional()
  @IsString()
  treatmentNotes?: string;

  @IsOptional()
  @IsDateString()
  treatmentDueDate?: string;

  @IsOptional()
  @IsEnum(Likelihood)
  residualLikelihood?: Likelihood;

  @IsOptional()
  @IsEnum(Impact)
  residualImpact?: Impact;
}

// ===========================
// Filter DTOs
// ===========================

export class RiskFilterDto {
  @IsOptional()
  @IsString()
  @EmptyToUndefined()
  search?: string;

  @IsOptional()
  @IsEnum(RiskCategory)
  @EmptyToUndefined()
  category?: RiskCategory;

  @IsOptional()
  @IsString()
  @EmptyToUndefined()
  status?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  @EmptyToUndefined()
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsString()
  @EmptyToUndefined()
  ownerId?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string; // Filter by workspace ID (multi-workspace mode)

  @IsOptional()
  @IsString()
  isOpen?: string; // 'true' to filter only open risks

  @IsOptional()
  @IsString()
  reviewsDue?: string; // 'true' to filter risks with upcoming reviews

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsEnum(RiskSource)
  source?: RiskSource;

  @IsOptional()
  @IsString()
  grcSmeId?: string;

  @IsOptional()
  @IsString()
  riskAssessorId?: string;
}

// ===========================
// Risk Asset DTOs
// ===========================

export class LinkAssetDto {
  @IsString()
  assetId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LinkAssetsDto {
  @IsArray()
  @IsString({ each: true })
  assetIds: string[];
}

// ===========================
// Risk Control DTOs
// ===========================

export class LinkControlDto {
  @IsString()
  controlId: string;

  @IsOptional()
  @IsEnum(ControlEffectiveness)
  effectiveness?: ControlEffectiveness;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateControlEffectivenessDto {
  @IsEnum(ControlEffectiveness)
  effectiveness: ControlEffectiveness;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================
// Risk Scenario DTOs
// ===========================

export class CreateScenarioDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  threatActor?: string;

  @IsOptional()
  @IsString()
  attackVector?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAssets?: string[];

  @IsEnum(Likelihood)
  likelihood: Likelihood;

  @IsEnum(Impact)
  impact: Impact;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateScenarioDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  threatActor?: string;

  @IsOptional()
  @IsString()
  attackVector?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetAssets?: string[];

  @IsOptional()
  @IsEnum(Likelihood)
  likelihood?: Likelihood;

  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================
// Response DTOs
// ===========================

export class RiskResponseDto {
  id: string;
  riskId: string;
  title: string;
  description: string;
  category?: string;
  source: string;
  status: string;
  initialSeverity: string;
  
  // Scoring (populated after assessment)
  likelihood?: string;
  impact?: string;
  inherentRisk?: string;
  residualRisk?: string;
  likelihoodPct?: number;
  impactValue?: number;
  annualLossExp?: number;
  
  // Treatment
  treatmentPlan?: string;
  treatmentStatus?: string;
  treatmentNotes?: string;
  treatmentDueDate?: Date;
  
  // Assignments
  reporterId?: string;
  reporterName?: string;
  grcSmeId?: string;
  grcSmeName?: string;
  riskAssessorId?: string;
  riskAssessorName?: string;
  riskOwnerId?: string;
  riskOwnerName?: string;
  
  // Review
  reviewFrequency: string;
  lastReviewedAt?: Date;
  nextReviewDue?: Date;
  
  // Metadata
  tags: string[];
  assetCount: number;
  controlCount: number;
  scenarioCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Sub-ticket info
  hasAssessment: boolean;
  hasTreatment: boolean;
  assessmentStatus?: string;
  treatmentWorkflowStatus?: string;
}

export class RiskDetailResponseDto extends RiskResponseDto {
  assets: AssetSummaryDto[];
  controls: ControlSummaryDto[];
  scenarios: ScenarioSummaryDto[];
  history: RiskHistoryDto[];
  assessment?: RiskAssessmentDto;
  treatment?: RiskTreatmentDto;
}

export class AssetSummaryDto {
  id: string;
  name: string;
  type: string;
  criticality: string;
  source: string;
  notes?: string;
}

export class ControlSummaryDto {
  id: string;
  controlId: string;
  title: string;
  status: string;
  effectiveness: string;
  notes?: string;
}

export class ScenarioSummaryDto {
  id: string;
  title: string;
  description: string;
  threatActor?: string;
  attackVector?: string;
  likelihood: string;
  impact: string;
  createdAt: Date;
}

export class RiskHistoryDto {
  id: string;
  action: string;
  changes?: any;
  notes?: string;
  changedBy: string;
  changedByName?: string;
  changedAt: Date;
}

export class RiskAssessmentDto {
  id: string;
  status: string;
  riskAssessorId?: string;
  grcSmeId?: string;
  threatDescription?: string;
  affectedAssets: string[];
  existingControls: string[];
  vulnerabilities?: string;
  likelihoodScore?: string;
  likelihoodRationale?: string;
  impactScore?: string;
  impactRationale?: string;
  impactCategories?: any;
  calculatedRiskScore?: string;
  recommendedOwnerId?: string;
  assessmentNotes?: string;
  treatmentRecommendation?: string;
  grcReviewNotes?: string;
  grcApprovedAt?: Date;
  grcDeclinedReason?: string;
  assessorSubmittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class RiskTreatmentDto {
  id: string;
  status: string;
  riskOwnerId?: string;
  executiveApproverId?: string;
  grcSmeId?: string;
  treatmentDecision?: string;
  treatmentJustification?: string;
  treatmentPlan?: string;
  mitigationDescription?: string;
  mitigationTargetDate?: Date;
  mitigationActualDate?: Date;
  transferTo?: string;
  transferCost?: number;
  avoidStrategy?: string;
  acceptanceRationale?: string;
  acceptanceExpiresAt?: Date;
  executiveApprovalRequired: boolean;
  executiveApprovalStatus?: string;
  executiveApprovalNotes?: string;
  executiveApprovedAt?: Date;
  executiveDeniedReason?: string;
  mitigationStatus?: string;
  mitigationProgress: number;
  lastProgressUpdate?: Date;
  nextReviewDate?: Date;
  residualLikelihood?: string;
  residualImpact?: string;
  residualRiskScore?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  updates: RiskTreatmentUpdateDto[];
}

export class RiskTreatmentUpdateDto {
  id: string;
  updateType: string;
  previousStatus?: string;
  newStatus?: string;
  progress?: number;
  notes?: string;
  newTargetDate?: Date;
  delayReason?: string;
  cancellationReason?: string;
  createdBy: string;
  createdAt: Date;
}

// ===========================
// Dashboard DTOs
// ===========================

export class RiskDashboardDto {
  totalRisks: number;
  openRisks: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byRiskLevel: { level: string; count: number }[];
  bySource: { source: string; count: number }[];
  recentRisks: RiskResponseDto[];
  upcomingReviews: RiskResponseDto[];
  treatmentOverdue: RiskResponseDto[];
  pendingAssessments: number;
  pendingTreatmentDecisions: number;
  pendingExecutiveApprovals: number;
  mitigationsInProgress: number;
}

export class RiskHeatmapDto {
  matrix: {
    likelihood: string;
    impact: string;
    count: number;
    risks: { id: string; riskId: string; title: string }[];
  }[];
}

// ===========================
// Risk Scoring Utilities
// ===========================

export const LIKELIHOOD_VALUES: Record<Likelihood, number> = {
  [Likelihood.RARE]: 1,
  [Likelihood.UNLIKELY]: 2,
  [Likelihood.POSSIBLE]: 3,
  [Likelihood.LIKELY]: 4,
  [Likelihood.ALMOST_CERTAIN]: 5,
};

export const IMPACT_VALUES: Record<Impact, number> = {
  [Impact.NEGLIGIBLE]: 1,
  [Impact.MINOR]: 2,
  [Impact.MODERATE]: 3,
  [Impact.MAJOR]: 4,
  [Impact.SEVERE]: 5,
};

export function calculateRiskLevel(likelihood: Likelihood, impact: Impact): RiskLevel {
  const score = LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact];
  
  if (score >= 16) return RiskLevel.VERY_HIGH;
  if (score >= 12) return RiskLevel.HIGH;
  if (score >= 6) return RiskLevel.MEDIUM;
  if (score >= 3) return RiskLevel.LOW;
  return RiskLevel.VERY_LOW;
}

export function getRiskScore(likelihood: Likelihood, impact: Impact): number {
  return LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact];
}

export function calculateALE(likelihoodPct?: number, impactValue?: number): number | null {
  if (likelihoodPct === undefined || impactValue === undefined) return null;
  return (likelihoodPct / 100) * impactValue;
}

// Treatment Logic Matrix (from document)
// Returns whether executive approval is required based on risk level and treatment decision
export function requiresExecutiveApproval(riskLevel: RiskLevel, decision: TreatmentDecision): boolean {
  // Mitigation never requires executive approval
  if (decision === TreatmentDecision.MITIGATE) {
    return false;
  }
  
  // Very High and High risks require executive approval for accept/transfer/avoid
  if (riskLevel === RiskLevel.VERY_HIGH || riskLevel === RiskLevel.HIGH) {
    return true;
  }
  
  // Medium and below don't require executive approval
  return false;
}

// Determine final treatment status based on decision and risk level
export function determineTreatmentOutcome(
  riskLevel: RiskLevel,
  decision: TreatmentDecision,
  executiveApproved?: boolean,
): RiskTreatmentStatus {
  if (decision === TreatmentDecision.MITIGATE) {
    return RiskTreatmentStatus.RISK_MITIGATION_IN_PROGRESS;
  }
  
  // Low and Very Low risks auto-accept any decision
  if (riskLevel === RiskLevel.LOW || riskLevel === RiskLevel.VERY_LOW) {
    return RiskTreatmentStatus.RISK_AUTO_ACCEPT;
  }
  
  // Medium risks go directly to final status
  if (riskLevel === RiskLevel.MEDIUM) {
    switch (decision) {
      case TreatmentDecision.ACCEPT:
        return RiskTreatmentStatus.RISK_ACCEPT;
      case TreatmentDecision.TRANSFER:
        return RiskTreatmentStatus.RISK_TRANSFER;
      case TreatmentDecision.AVOID:
        return RiskTreatmentStatus.RISK_AVOID;
    }
  }
  
  // High and Very High risks require executive approval first
  if (executiveApproved === undefined) {
    return RiskTreatmentStatus.IDENTIFY_EXECUTIVE_APPROVER;
  }
  
  if (executiveApproved) {
    switch (decision) {
      case TreatmentDecision.ACCEPT:
        return RiskTreatmentStatus.RISK_ACCEPT;
      case TreatmentDecision.TRANSFER:
        return RiskTreatmentStatus.RISK_TRANSFER;
      case TreatmentDecision.AVOID:
        return RiskTreatmentStatus.RISK_AVOID;
    }
  }
  
  // Executive denied - go back to treatment decision review
  return RiskTreatmentStatus.TREATMENT_DECISION_REVIEW;
}
