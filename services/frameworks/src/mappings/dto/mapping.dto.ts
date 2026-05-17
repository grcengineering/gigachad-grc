import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum, IsUUID } from 'class-validator';

export class CreateMappingDto {
  @ApiProperty()
  @IsUUID()
  frameworkId: string;

  @ApiProperty()
  @IsUUID()
  requirementId: string;

  @ApiProperty()
  @IsUUID()
  controlId: string;

  @ApiPropertyOptional({ enum: ['primary', 'supporting'], default: 'primary' })
  @IsOptional()
  @IsEnum(['primary', 'supporting'])
  mappingType?: 'primary' | 'supporting';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkCreateMappingsDto {
  @ApiProperty({ type: [CreateMappingDto] })
  @IsArray()
  mappings: CreateMappingDto[];
}

export class UpdateMappingDto {
  @ApiPropertyOptional({ enum: ['primary', 'supporting'] })
  @IsOptional()
  @IsEnum(['primary', 'supporting'])
  mappingType?: 'primary' | 'supporting';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export interface MappingImportError {
  row: number;
  message: string;
  originalValues: Record<string, string>;
}

export interface MappingImportRowOutcome {
  row: number;
  status: 'will_create' | 'duplicate' | 'error';
  originalValues: Record<string, string>;
  errorMessage?: string;
  resolvedIds?: {
    frameworkId: string;
    requirementId: string;
    controlId: string;
  };
}

export interface ImportResult {
  totalRows: number;
  successful: number;
  duplicates: number;
  errors: MappingImportError[];
  rows: MappingImportRowOutcome[];
  dryRun: boolean;
  sourceStorageKey: string | null;
}
