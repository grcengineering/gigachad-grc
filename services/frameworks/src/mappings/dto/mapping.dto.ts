import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';

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



