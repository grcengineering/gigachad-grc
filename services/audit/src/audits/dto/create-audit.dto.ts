import { IsString, IsOptional, IsBoolean, IsArray, IsDateString, IsEnum } from 'class-validator';

export class CreateAuditDto {
  // organizationId is injected by controller from user context, so it's optional in request
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  auditId?: string;

  @IsEnum(['internal', 'external', 'surveillance', 'certification'])
  auditType: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  framework?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

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

  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  methodology?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
