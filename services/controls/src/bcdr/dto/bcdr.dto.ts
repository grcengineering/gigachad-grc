import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

// ===========================================
// ENUMS
// ===========================================

export enum CriticalityTier {
  TIER_1_CRITICAL = 'tier_1_critical',
  TIER_2_ESSENTIAL = 'tier_2_essential',
  TIER_3_IMPORTANT = 'tier_3_important',
  TIER_4_STANDARD = 'tier_4_standard',
}

export enum ImpactLevel {
  CATASTROPHIC = 'catastrophic',
  SEVERE = 'severe',
  MAJOR = 'major',
  MODERATE = 'moderate',
  MINOR = 'minor',
  NEGLIGIBLE = 'negligible',
}

export enum PlanType {
  BUSINESS_CONTINUITY = 'business_continuity',
  DISASTER_RECOVERY = 'disaster_recovery',
  INCIDENT_RESPONSE = 'incident_response',
  CRISIS_COMMUNICATION = 'crisis_communication',
  PANDEMIC_RESPONSE = 'pandemic_response',
  IT_RECOVERY = 'it_recovery',
  DATA_BACKUP = 'data_backup',
  OTHER = 'other',
}

export enum PlanStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  EXPIRED = 'expired',
}

export enum TestType {
  TABLETOP = 'tabletop',
  WALKTHROUGH = 'walkthrough',
  SIMULATION = 'simulation',
  PARALLEL = 'parallel',
  FULL_INTERRUPTION = 'full_interruption',
}

export enum TestStatus {
  PLANNED = 'planned',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum TestResult {
  PASSED = 'passed',
  PASSED_WITH_ISSUES = 'passed_with_issues',
  FAILED = 'failed',
  INCOMPLETE = 'incomplete',
}

export enum RunbookStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  NEEDS_REVIEW = 'needs_review',
  ARCHIVED = 'archived',
}

export enum ContactType {
  INTERNAL = 'internal',
  VENDOR = 'vendor',
  CUSTOMER = 'customer',
  REGULATORY = 'regulatory',
  EMERGENCY_SERVICES = 'emergency_services',
  MEDIA = 'media',
  OTHER = 'other',
}

// ===========================================
// BUSINESS PROCESS DTOs
// ===========================================

export class CreateBusinessProcessDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  processId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiProperty({ enum: CriticalityTier })
  @IsEnum(CriticalityTier)
  criticalityTier: CriticalityTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  businessCriticalityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rtoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rpoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mtpdHours?: number;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  financialImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  operationalImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  reputationalImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  regulatoryImpact?: ImpactLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hourlyRevenueImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyRevenueImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  recoveryCostEstimate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  reviewFrequencyMonths?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class UpdateBusinessProcessDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @ApiPropertyOptional({ enum: CriticalityTier })
  @IsOptional()
  @IsEnum(CriticalityTier)
  criticalityTier?: CriticalityTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  businessCriticalityScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rtoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rpoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mtpdHours?: number;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  financialImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  operationalImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  reputationalImpact?: ImpactLevel;

  @ApiPropertyOptional({ enum: ImpactLevel })
  @IsOptional()
  @IsEnum(ImpactLevel)
  regulatoryImpact?: ImpactLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hourlyRevenueImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  dailyRevenueImpact?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  recoveryCostEstimate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  reviewFrequencyMonths?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AddProcessDependencyDto {
  @ApiProperty()
  @IsUUID()
  dependencyProcessId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dependencyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class LinkProcessAssetDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationshipType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================================
// BC/DR PLAN DTOs
// ===========================================

export class CreateBCDRPlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  planId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType)
  planType: PlanType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inScopeProcesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outOfScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  reviewFrequencyMonths?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class UpdateBCDRPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  versionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approverId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  inScopeProcesses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outOfScope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objectives?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assumptions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deactivationCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  reviewFrequencyMonths?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// ===========================================
// DR TEST DTOs
// ===========================================

export class CreateDRTestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  testId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TestType })
  @IsEnum(TestType)
  testType: TestType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  processIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledStartTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  scheduledDurationHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coordinatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testObjectives?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scopeDescription?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  systemsInScope?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalParticipants?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workspaceId?: string;
}

export class UpdateDRTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TestStatus })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledStartTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  scheduledDurationHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coordinatorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testObjectives?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successCriteria?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  participantIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalParticipants?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class RecordTestResultDto {
  @ApiProperty({ enum: TestResult })
  @IsEnum(TestResult)
  result: TestResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualRecoveryTimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dataLossMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executiveSummary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessonsLearned?: string;
}

export class CreateTestFindingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  affectedProcessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  affectedSystem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  remediationRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remediationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  remediationOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  remediationDueDate?: string;
}

// ===========================================
// RUNBOOK DTOs
// ===========================================

export class CreateRunbookDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  runbookId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  processId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recoveryStrategyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredAccessLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prerequisites?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateRunbookDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RunbookStatus })
  @IsOptional()
  @IsEnum(RunbookStatus)
  status?: RunbookStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  processId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredAccessLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prerequisites?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateRunbookStepDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  stepNumber: number;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  instructions: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approvalRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verificationSteps?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollbackSteps?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  warnings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================================
// COMMUNICATION PLAN DTOs
// ===========================================

export class CreateCommunicationPlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bcdrPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationTriggers?: string;
}

export class UpdateCommunicationPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  bcdrPlanId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationTriggers?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizationName?: string;

  @ApiProperty({ enum: ContactType })
  @IsEnum(ContactType)
  contactType: ContactType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  secondaryPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alternateEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timeZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleInPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  escalationLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  escalationWaitMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  availabilityHours?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

// ===========================================
// RECOVERY STRATEGY DTOs
// ===========================================

export class CreateRecoveryStrategyDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strategyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  processId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recoveryLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recoveryProcedure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedRecoveryTimeHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredPersonnel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredEquipment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredData?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractReference?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// ===========================================
// FILTER DTOs
// ===========================================

export class BusinessProcessFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CriticalityTier })
  @IsOptional()
  @IsEnum(CriticalityTier)
  criticalityTier?: CriticalityTier;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class BCDRPlanFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class DRTestFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TestType })
  @IsOptional()
  @IsEnum(TestType)
  testType?: TestType;

  @ApiPropertyOptional({ enum: TestStatus })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ===========================================
// PLAN ATTESTATION DTOs
// ===========================================

export enum AttestationType {
  ANNUAL_REVIEW = 'annual_review',
  POST_UPDATE = 'post_update',
  POST_INCIDENT = 'post_incident',
}

export enum AttestationStatus {
  PENDING = 'pending',
  ATTESTED = 'attested',
  DECLINED = 'declined',
}

/**
 * DTO for requesting an attestation from a plan owner.
 */
export class RequestAttestationDto {
  @ApiProperty({ enum: AttestationType, description: 'Type of attestation being requested' })
  @IsEnum(AttestationType)
  attestationType: AttestationType;

  @ApiPropertyOptional({ description: 'Optional message to the attester' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ description: 'Date until which the attestation is valid' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

/**
 * DTO for submitting an attestation response.
 */
export class SubmitAttestationDto {
  @ApiProperty({ enum: ['attested', 'declined'], description: 'Attestation response status' })
  @IsString()
  status: 'attested' | 'declined';

  @ApiPropertyOptional({ description: 'Comments from the attester' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @ApiPropertyOptional({ description: 'Reason for declining (required if status is declined)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  declineReason?: string;
}

export class AttestationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ enum: AttestationStatus })
  @IsOptional()
  @IsEnum(AttestationStatus)
  status?: AttestationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ===========================================
// EXERCISE TEMPLATE DTOs
// ===========================================

export enum ExerciseCategory {
  RANSOMWARE = 'ransomware',
  NATURAL_DISASTER = 'natural_disaster',
  VENDOR_OUTAGE = 'vendor_outage',
  DATA_BREACH = 'data_breach',
  PANDEMIC = 'pandemic',
  INFRASTRUCTURE = 'infrastructure',
}

export enum ScenarioType {
  TABLETOP = 'tabletop',
  WALKTHROUGH = 'walkthrough',
  SIMULATION = 'simulation',
}

export class CreateExerciseTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  templateId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ExerciseCategory })
  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @ApiProperty({ enum: ScenarioType })
  @IsEnum(ScenarioType)
  scenarioType: ScenarioType;

  @ApiProperty()
  @IsString()
  scenarioNarrative: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  discussionQuestions: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  injects?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  expectedDecisions?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilitatorNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(15)
  estimatedDuration?: number;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  participantRoles?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ExerciseTemplateFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ enum: ScenarioType })
  @IsOptional()
  @IsEnum(ScenarioType)
  scenarioType?: ScenarioType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeGlobal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ===========================================
// RECOVERY TEAM DTOs
// ===========================================

export enum TeamType {
  CRISIS_MANAGEMENT = 'crisis_management',
  IT_RECOVERY = 'it_recovery',
  BUSINESS_RECOVERY = 'business_recovery',
  COMMUNICATIONS = 'communications',
  EXECUTIVE = 'executive',
}

export enum TeamMemberRole {
  TEAM_LEAD = 'team_lead',
  ALTERNATE_LEAD = 'alternate_lead',
  TECHNICAL_LEAD = 'technical_lead',
  COORDINATOR = 'coordinator',
  MEMBER = 'member',
}

export class CreateRecoveryTeamDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TeamType })
  @IsEnum(TeamType)
  teamType: TeamType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assemblyLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communicationChannel?: string;
}

export class UpdateRecoveryTeamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TeamType })
  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activationCriteria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assemblyLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  communicationChannel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddTeamMemberDto {
  @ApiProperty({ enum: TeamMemberRole })
  @IsEnum(TeamMemberRole)
  role: TeamMemberRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsibilities?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  alternateFor?: string;
}

export class LinkTeamToPlanDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleInPlan?: string;
}

export class RecoveryTeamFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TeamType })
  @IsOptional()
  @IsEnum(TeamType)
  teamType?: TeamType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

// ===========================================
// VENDOR DEPENDENCY DTOs
// ===========================================

export enum VendorDependencyType {
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  SUPPORTING = 'supporting',
}

export class CreateVendorDependencyDto {
  @ApiProperty()
  @IsUUID()
  vendorId: string;

  @ApiProperty({ enum: VendorDependencyType })
  @IsEnum(VendorDependencyType)
  dependencyType: VendorDependencyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorRtoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorRpoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vendorHasBCP?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vendorBCPReviewed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gapAnalysis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateVendorDependencyDto {
  @ApiPropertyOptional({ enum: VendorDependencyType })
  @IsOptional()
  @IsEnum(VendorDependencyType)
  dependencyType?: VendorDependencyType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorRtoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  vendorRpoHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  vendorHasBCP?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  vendorBCPReviewed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gapAnalysis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mitigationPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================================
// INCIDENT DTOs
// ===========================================

export enum IncidentType {
  DISASTER = 'disaster',
  MAJOR_INCIDENT = 'major_incident',
  DRILL = 'drill',
  NEAR_MISS = 'near_miss',
}

export enum IncidentSeverity {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MODERATE = 'moderate',
  MINOR = 'minor',
}

export enum IncidentStatus {
  ACTIVE = 'active',
  RECOVERING = 'recovering',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TimelineEntryType {
  STATUS_CHANGE = 'status_change',
  PLAN_ACTIVATED = 'plan_activated',
  TEAM_ACTIVATED = 'team_activated',
  NOTE = 'note',
  ACTION_TAKEN = 'action_taken',
}

export class DeclareIncidentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IncidentType })
  @IsEnum(IncidentType)
  incidentType: IncidentType;

  @ApiProperty({ enum: IncidentSeverity })
  @IsEnum(IncidentSeverity)
  severity: IncidentSeverity;
}

export class UpdateIncidentStatusDto {
  @ApiProperty({ enum: IncidentStatus })
  @IsEnum(IncidentStatus)
  status: IncidentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddTimelineEntryDto {
  @ApiProperty({ enum: TimelineEntryType })
  @IsEnum(TimelineEntryType)
  entryType: TimelineEntryType;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class ActivatePlanDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ActivateTeamDto {
  @ApiProperty()
  @IsUUID()
  teamId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseIncidentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lessonsLearned?: string;

  @ApiPropertyOptional({ type: 'array', items: { type: 'object' } })
  @IsOptional()
  @IsArray()
  improvementActions?: Record<string, unknown>[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDowntimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dataLossMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  financialImpact?: number;
}

export class IncidentFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: IncidentType })
  @IsOptional()
  @IsEnum(IncidentType)
  incidentType?: IncidentType;

  @ApiPropertyOptional({ enum: IncidentStatus })
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @ApiPropertyOptional({ enum: IncidentSeverity })
  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}
