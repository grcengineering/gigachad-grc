import { IsString, IsOptional, IsBoolean, IsArray, IsDateString, IsEnum } from 'class-validator';

export class UpdateAuditDto {
  @IsEnum(['internal', 'external', 'surveillance', 'certification'])
  @IsOptional()
  auditType?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  framework?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsEnum(['planning', 'fieldwork', 'testing', 'reporting', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @IsDateString()
  @IsOptional()
  actualEndDate?: string;

  @IsString()
  @IsOptional()
  leadAuditorId?: string;

  @IsArray()
  @IsOptional()
  auditTeam?: string[];

  @IsBoolean()
  @IsOptional()
  isExternal?: boolean;

  @IsString()
  @IsOptional()
  auditFirm?: string;

  @IsString()
  @IsOptional()
  externalLeadName?: string;

  @IsString()
  @IsOptional()
  externalLeadEmail?: string;

  @IsBoolean()
  @IsOptional()
  auditPortalEnabled?: boolean;

  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['pass', 'pass_with_observations', 'fail'])
  @IsOptional()
  overallRating?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
