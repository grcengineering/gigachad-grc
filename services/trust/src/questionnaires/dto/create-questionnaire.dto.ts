import { IsString, IsOptional, IsDateString, IsArray, IsObject, IsEnum } from 'class-validator';
import { Priority, QuestionnaireStatus } from '@prisma/client';

export class CreateQuestionnaireDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

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

  @IsEnum(QuestionnaireStatus)
  @IsOptional()
  status?: QuestionnaireStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

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
