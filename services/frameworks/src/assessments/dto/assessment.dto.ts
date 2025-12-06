import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateAssessmentDto {
  @ApiProperty()
  @IsUUID()
  frameworkId: string;

  @ApiProperty({ example: 'Q4 2024 SOC 2 Assessment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRequirementStatusDto {
  @ApiProperty({ enum: ['compliant', 'partial', 'non_compliant', 'not_applicable'] })
  @IsEnum(['compliant', 'partial', 'non_compliant', 'not_applicable'])
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidenceIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedControlIds?: string[];
}

export class CreateGapDto {
  @ApiProperty()
  @IsUUID()
  requirementId: string;

  @ApiProperty({ enum: ['critical', 'high', 'medium', 'low'] })
  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity: 'critical' | 'high' | 'medium' | 'low';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  recommendation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  remediationDueDate?: string;
}

export class CreateRemediationTaskDto {
  @ApiProperty()
  @IsUUID()
  gapId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['critical', 'high', 'medium', 'low'] })
  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  priority?: 'critical' | 'high' | 'medium' | 'low';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  effort?: 'low' | 'medium' | 'high';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  linkedControlIds?: string[];
}

export class UpdateRemediationTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['critical', 'high', 'medium', 'low'] })
  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  priority?: 'critical' | 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ enum: ['todo', 'in_progress', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'completed', 'cancelled'])
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}



