import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsArray } from 'class-validator';

export class CreateCustomReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Report type' })
  @IsString()
  reportType: string;

  @ApiPropertyOptional({ description: 'Report sections configuration' })
  @IsOptional()
  @IsArray()
  sections?: unknown[];

  @ApiPropertyOptional({ description: 'Report filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Chart configurations' })
  @IsOptional()
  @IsArray()
  chartConfigs?: unknown[];

  @ApiPropertyOptional({ description: 'Include charts in report' })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: 'Include tables in report' })
  @IsOptional()
  @IsBoolean()
  includeTables?: boolean;

  @ApiPropertyOptional({ description: 'Share with organization' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class UpdateCustomReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Report description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Report sections configuration' })
  @IsOptional()
  @IsArray()
  sections?: unknown[];

  @ApiPropertyOptional({ description: 'Report filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Chart configurations' })
  @IsOptional()
  @IsArray()
  chartConfigs?: unknown[];

  @ApiPropertyOptional({ description: 'Include charts in report' })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: 'Include tables in report' })
  @IsOptional()
  @IsBoolean()
  includeTables?: boolean;

  @ApiPropertyOptional({ description: 'Share with organization' })
  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

export class CustomReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  reportType: string;

  @ApiProperty()
  sections: unknown[];

  @ApiProperty()
  filters: Record<string, unknown>;

  @ApiProperty()
  chartConfigs: unknown[];

  @ApiProperty()
  includeCharts: boolean;

  @ApiProperty()
  includeTables: boolean;

  @ApiProperty()
  isShared: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
