import { IsString, IsOptional, IsDateString, IsInt, Min, Max, IsObject, IsJSON } from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  organizationId: string;

  @IsString()
  vendorId: string;

  @IsString()
  assessmentType: string; // initial_onboarding, annual_review, continuous_monitoring, incident_triggered, contract_renewal

  @IsString()
  @IsOptional()
  status?: string; // pending, in_progress, completed, cancelled

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsString()
  @IsOptional()
  questionnaireTemplate?: string;

  @IsObject()
  @IsOptional()
  responses?: any;

  @IsString()
  @IsOptional()
  inherentRiskScore?: string; // very_low, low, medium, high, critical

  @IsString()
  @IsOptional()
  residualRiskScore?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  overallScore?: number;

  @IsString()
  @IsOptional()
  securityRisk?: string;

  @IsString()
  @IsOptional()
  complianceRisk?: string;

  @IsString()
  @IsOptional()
  operationalRisk?: string;

  @IsString()
  @IsOptional()
  financialRisk?: string;

  @IsString()
  @IsOptional()
  reputationalRisk?: string;

  @IsString()
  @IsOptional()
  outcome?: string; // approved, approved_with_conditions, rejected, requires_remediation

  @IsString()
  @IsOptional()
  outcomeNotes?: string;

  @IsString()
  @IsOptional()
  assessorId?: string;

  @IsString()
  @IsOptional()
  reviewerId?: string;

  @IsObject()
  @IsOptional()
  findings?: any;

  @IsString()
  @IsOptional()
  recommendations?: string;
}
