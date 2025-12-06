import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PolicyStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  RETIRED = 'retired',
}

export enum PolicyCategory {
  INFORMATION_SECURITY = 'information_security',
  ACCEPTABLE_USE = 'acceptable_use',
  DATA_PRIVACY = 'data_privacy',
  INCIDENT_RESPONSE = 'incident_response',
  ACCESS_CONTROL = 'access_control',
  BUSINESS_CONTINUITY = 'business_continuity',
  CHANGE_MANAGEMENT = 'change_management',
  RISK_MANAGEMENT = 'risk_management',
  VENDOR_MANAGEMENT = 'vendor_management',
  OTHER = 'other',
}

export class UploadPolicyDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: PolicyCategory })
  @IsEnum(PolicyCategory)
  category: PolicyCategory;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  nextReviewDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  controlIds?: string[];
}

export class UpdatePolicyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: PolicyCategory })
  @IsEnum(PolicyCategory)
  @IsOptional()
  category?: PolicyCategory;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  nextReviewDate?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdatePolicyStatusDto {
  @ApiProperty({ enum: PolicyStatus })
  @IsEnum(PolicyStatus)
  status: PolicyStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class PolicyFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: PolicyStatus, isArray: true })
  @IsArray()
  @IsOptional()
  status?: PolicyStatus[];

  @ApiPropertyOptional({ enum: PolicyCategory, isArray: true })
  @IsArray()
  @IsOptional()
  category?: PolicyCategory[];

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

