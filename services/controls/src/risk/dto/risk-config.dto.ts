import { IsString, IsOptional, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LikelihoodScaleItemDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  weight: number;
}

export class ImpactScaleItemDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  weight: number;
}

export class RiskCategoryDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  color: string;
}

export class RiskAppetiteDto {
  @IsString()
  category: string;

  @IsString()
  level: string; // low, medium, high

  @IsString()
  @IsOptional()
  description?: string;
}

export class WorkflowSettingsDto {
  requireAssessment?: boolean;
  requireGrcReview?: boolean;
  autoAssignOwner?: boolean;
  executiveApprovalThreshold?: string; // critical, high, medium, none
  defaultReviewFrequency?: string; // monthly, quarterly, semi_annually, annually
  autoCloseAccepted?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnDueDate?: boolean;
  dueDateReminderDays?: number;
}

export class RiskLevelThresholdsDto {
  low?: number;
  medium?: number;
  high?: number;
  critical?: number;
}

export class UpdateRiskConfigurationDto {
  @IsString()
  @IsOptional()
  methodology?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LikelihoodScaleItemDto)
  likelihoodScale?: LikelihoodScaleItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImpactScaleItemDto)
  impactScale?: ImpactScaleItemDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RiskCategoryDto)
  categories?: RiskCategoryDto[];

  @IsObject()
  @IsOptional()
  riskLevelThresholds?: RiskLevelThresholdsDto;

  @IsObject()
  @IsOptional()
  workflowSettings?: WorkflowSettingsDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RiskAppetiteDto)
  riskAppetite?: RiskAppetiteDto[];
}

export class RiskConfigurationResponseDto {
  id: string;
  organizationId: string;
  methodology: string;
  likelihoodScale: LikelihoodScaleItemDto[];
  impactScale: ImpactScaleItemDto[];
  categories: RiskCategoryDto[];
  riskLevelThresholds: RiskLevelThresholdsDto;
  workflowSettings: WorkflowSettingsDto;
  riskAppetite: RiskAppetiteDto[];
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}



