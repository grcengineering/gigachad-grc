import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateQuestionDto {
  @IsString()
  @IsOptional()
  questionNumber?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  questionText?: string;

  @IsString()
  @IsOptional()
  answerText?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @IsDateString()
  @IsOptional()
  reviewedAt?: string;

  @IsString()
  @IsOptional()
  knowledgeBaseId?: string;
}
