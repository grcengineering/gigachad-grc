import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsArray, IsNumber, IsIn, Min, Max } from 'class-validator';

export class CreateScheduledReportDto {
  @ApiProperty({ description: 'Report name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Report type' })
  @IsString()
  reportType: string;

  @ApiProperty({ description: 'Output format', enum: ['pdf', 'csv', 'xlsx'] })
  @IsString()
  @IsIn(['pdf', 'csv', 'xlsx'])
  format: 'pdf' | 'csv' | 'xlsx';

  @ApiProperty({ description: 'Schedule frequency', enum: ['daily', 'weekly', 'monthly', 'quarterly'] })
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'quarterly'])
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';

  @ApiPropertyOptional({ description: 'Day of week (0=Sunday, 6=Saturday) for weekly schedules' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month (1-31) for monthly schedules' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiProperty({ description: 'Time to run (HH:mm format)', default: '09:00' })
  @IsString()
  time: string;

  @ApiPropertyOptional({ description: 'Timezone', default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: 'Email recipients', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({ description: 'Report filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether the schedule is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateScheduledReportDto {
  @ApiPropertyOptional({ description: 'Report name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Output format', enum: ['pdf', 'csv', 'xlsx'] })
  @IsOptional()
  @IsString()
  @IsIn(['pdf', 'csv', 'xlsx'])
  format?: 'pdf' | 'csv' | 'xlsx';

  @ApiPropertyOptional({ description: 'Schedule frequency', enum: ['daily', 'weekly', 'monthly', 'quarterly'] })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly', 'quarterly'])
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';

  @ApiPropertyOptional({ description: 'Day of week (0=Sunday, 6=Saturday) for weekly schedules' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Day of month (1-31) for monthly schedules' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({ description: 'Time to run (HH:mm format)' })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Email recipients', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Report filters' })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Whether the schedule is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ScheduledReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  reportType: string;

  @ApiProperty()
  format: string;

  @ApiProperty()
  schedule: {
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };

  @ApiProperty()
  recipients: string[];

  @ApiProperty()
  filters: Record<string, unknown>;

  @ApiProperty()
  enabled: boolean;

  @ApiPropertyOptional()
  lastRun?: string;

  @ApiPropertyOptional()
  nextRun?: string;

  @ApiProperty()
  createdAt: string;
}
