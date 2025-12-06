import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum ControlCategory {
  ACCESS_CONTROL = 'access_control',
  DATA_PROTECTION = 'data_protection',
  NETWORK_SECURITY = 'network_security',
  INCIDENT_RESPONSE = 'incident_response',
  BUSINESS_CONTINUITY = 'business_continuity',
  CHANGE_MANAGEMENT = 'change_management',
  RISK_MANAGEMENT = 'risk_management',
  VENDOR_MANAGEMENT = 'vendor_management',
  PHYSICAL_SECURITY = 'physical_security',
  HUMAN_RESOURCES = 'human_resources',
  COMPLIANCE = 'compliance',
  OTHER = 'other',
}

export class CreateControlDto {
  @ApiProperty({ example: 'AC-001', description: 'Unique control identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  controlId: string;

  @ApiProperty({ example: 'Access Control Policy', description: 'Control title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the control' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ControlCategory, example: ControlCategory.ACCESS_CONTROL })
  @IsEnum(ControlCategory)
  category: ControlCategory;

  @ApiPropertyOptional({ example: 'authentication' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ type: [String], example: ['authentication', 'mfa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Implementation guidance' })
  @IsOptional()
  @IsString()
  guidance?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  automationSupported?: boolean;
}

export class UpdateControlDto {
  @ApiPropertyOptional({ example: 'Access Control Policy' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ControlCategory })
  @IsOptional()
  @IsEnum(ControlCategory)
  category?: ControlCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guidance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  automationSupported?: boolean;
}

export class ControlFilterDto {
  @ApiPropertyOptional({ enum: ControlCategory, isArray: true })
  @IsOptional()
  @IsArray()
  category?: ControlCategory[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by framework ID' })
  @IsOptional()
  @IsString()
  frameworkId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by implementation status (can be single value or array)',
    enum: ['implemented', 'in_progress', 'not_started', 'not_applicable'],
  })
  @IsOptional()
  status?: string | string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  customOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ default: 'controlId' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class BulkControlItemDto {
  @ApiProperty({ example: 'AC-001', description: 'Unique control identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  controlId: string;

  @ApiProperty({ example: 'Access Control Policy', description: 'Control title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Detailed description of the control' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: ControlCategory, example: ControlCategory.ACCESS_CONTROL })
  @IsEnum(ControlCategory)
  category: ControlCategory;

  @ApiPropertyOptional({ example: 'authentication' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ type: [String], example: ['authentication', 'mfa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Implementation guidance' })
  @IsOptional()
  @IsString()
  guidance?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  automationSupported?: boolean;
}

export class BulkUploadControlsDto {
  @ApiProperty({ 
    type: [BulkControlItemDto], 
    description: 'Array of controls to import' 
  })
  @IsArray()
  controls: BulkControlItemDto[];

  @ApiPropertyOptional({ 
    default: false, 
    description: 'Skip controls that already exist instead of failing' 
  })
  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean;

  @ApiPropertyOptional({ 
    default: false, 
    description: 'Update existing controls instead of skipping' 
  })
  @IsOptional()
  @IsBoolean()
  updateExisting?: boolean;
}

export class BulkUploadResultDto {
  @ApiProperty({ description: 'Total controls processed' })
  total: number;

  @ApiProperty({ description: 'Successfully created controls' })
  created: number;

  @ApiProperty({ description: 'Updated controls (if updateExisting=true)' })
  updated: number;

  @ApiProperty({ description: 'Skipped controls (if skipExisting=true)' })
  skipped: number;

  @ApiProperty({ description: 'Failed controls with error messages' })
  errors: Array<{
    controlId: string;
    error: string;
    row?: number;
  }>;
}

