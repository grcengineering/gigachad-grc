import { IsString, IsOptional, IsDateString, IsArray, IsObject, IsEnum } from 'class-validator';
import { Priority, QuestionnaireStatus } from '@prisma/client';

export class UpdateQuestionnaireDto {
  @IsString()
  @IsOptional()
  requesterName?: string;

  @IsString()
  @IsOptional()
  requesterEmail?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  title?: string;

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

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
