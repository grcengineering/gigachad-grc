import { IsString, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';

export class CreateAuditRequestDto {
  @IsString()
  auditId: string;

  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  requestNumber?: string;

  @IsEnum(['control_documentation', 'policy', 'evidence', 'interview', 'access', 'walkthrough'])
  category: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  controlId?: string;

  @IsString()
  @IsOptional()
  requirementRef?: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
