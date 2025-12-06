import { IsString, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';

export class UpdateAuditRequestDto {
  @IsEnum(['control_documentation', 'policy', 'evidence', 'interview', 'access', 'walkthrough'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  controlId?: string;

  @IsString()
  @IsOptional()
  requirementRef?: string;

  @IsEnum(['open', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'clarification_needed'])
  @IsOptional()
  status?: string;

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

  @IsString()
  @IsOptional()
  responseNotes?: string;

  @IsString()
  @IsOptional()
  reviewerNotes?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
