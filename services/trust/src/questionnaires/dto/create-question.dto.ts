import { IsString, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  questionnaireId: string;

  @IsString()
  @IsOptional()
  questionNumber?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  questionText: string;

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
  knowledgeBaseId?: string;
}
