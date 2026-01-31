import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsEnum, 
  IsArray, 
  IsInt, 
  Min, 
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CustomFieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  URL = 'url',
  EMAIL = 'email',
  USER = 'user',
}

export enum CustomFieldEntityType {
  Control = 'control',
  Policy = 'policy',
  Risk = 'risk',
  Evidence = 'evidence',
  Task = 'task',
  Vendor = 'vendor',
}

export class CreateCustomFieldDto {
  @ApiProperty({ description: 'Field name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'URL-safe slug for API access' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { 
    message: 'Slug must start with a letter and contain only lowercase letters, numbers, and underscores' 
  })
  slug: string;

  @ApiProperty({ enum: CustomFieldType })
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @ApiProperty({ enum: CustomFieldEntityType })
  @IsEnum(CustomFieldEntityType)
  entityType: CustomFieldEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Default value for the field' })
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Options for select/multiselect fields' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;

  @ApiPropertyOptional({ description: 'Placeholder text for input fields' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number = 0;
}

export class UpdateCustomFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CustomFieldDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: CustomFieldType })
  fieldType: CustomFieldType;

  @ApiProperty({ enum: CustomFieldEntityType })
  entityType: CustomFieldEntityType;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  defaultValue?: string;

  @ApiPropertyOptional({ type: [String] })
  options?: string[];

  @ApiProperty()
  isRequired: boolean;

  @ApiPropertyOptional()
  placeholder?: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SetCustomFieldValueDto {
  @ApiProperty({ description: 'Field ID or slug' })
  @IsString()
  fieldIdOrSlug: string;

  @ApiProperty({ description: 'Value to set (stored as string)' })
  @IsString()
  value: string;
}

export class CustomFieldValueDto {
  @ApiProperty()
  fieldId: string;

  @ApiProperty()
  fieldSlug: string;

  @ApiProperty()
  fieldName: string;

  @ApiProperty({ enum: CustomFieldType })
  fieldType: CustomFieldType;

  @ApiProperty()
  value: string;

  @ApiPropertyOptional({ description: 'Parsed value based on field type' })
  parsedValue?: unknown;
}

export class EntityCustomFieldsDto {
  @ApiProperty()
  entityType: CustomFieldEntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ type: [CustomFieldValueDto] })
  values: CustomFieldValueDto[];
}

export class CustomFieldListQueryDto {
  @ApiPropertyOptional({ enum: CustomFieldEntityType })
  @IsOptional()
  @IsEnum(CustomFieldEntityType)
  entityType?: CustomFieldEntityType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
