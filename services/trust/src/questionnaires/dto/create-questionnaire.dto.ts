import { IsString, IsOptional, IsDateString, IsArray, IsObject } from 'class-validator';

export class CreateQuestionnaireDto {
  @IsString()
  organizationId: string;

  @IsString()
  requesterName: string;

  @IsString()
  requesterEmail: string;

  @IsString()
  @IsOptional()
  requesterId?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
