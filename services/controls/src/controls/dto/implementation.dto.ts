import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export enum ImplementationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  NOT_APPLICABLE = 'not_applicable',
}

export enum TestingFrequency {
  CONTINUOUS = 'continuous',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  AS_NEEDED = 'as_needed',
}

export enum TestResult {
  PASS = 'pass',
  FAIL = 'fail',
  PARTIAL = 'partial',
  NOT_TESTED = 'not_tested',
}

export class UpdateImplementationDto {
  @ApiPropertyOptional({ enum: ImplementationStatus })
  @IsOptional()
  @IsEnum(ImplementationStatus)
  status?: ImplementationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  implementationNotes?: string;

  @ApiPropertyOptional({ enum: TestingFrequency })
  @IsOptional()
  @IsEnum(TestingFrequency)
  testingFrequency?: TestingFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class CreateControlTestDto {
  @ApiProperty({ enum: ['manual', 'automated'] })
  @IsEnum(['manual', 'automated'])
  testType: 'manual' | 'automated';

  @ApiProperty({ enum: TestResult })
  @IsEnum(TestResult)
  result: TestResult;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidenceIds?: string[];
}

export class BulkUpdateImplementationsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  implementationIds: string[];

  @ApiPropertyOptional({ enum: ImplementationStatus })
  @IsOptional()
  @IsEnum(ImplementationStatus)
  status?: ImplementationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ImplementationFilterDto {
  @ApiPropertyOptional({ enum: ImplementationStatus, isArray: true })
  @IsOptional()
  @IsArray()
  status?: ImplementationStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  overdue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  needsTesting?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}



