import { IsString, IsOptional, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { KnowledgeBaseCategory, KnowledgeBaseStatus } from '@prisma/client';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(KnowledgeBaseCategory)
  category: KnowledgeBaseCategory;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  answer: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  framework?: string;

  @IsEnum(KnowledgeBaseStatus)
  @IsOptional()
  status?: KnowledgeBaseStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsArray()
  @IsOptional()
  linkedControls?: string[];

  @IsArray()
  @IsOptional()
  linkedEvidence?: string[];

  @IsArray()
  @IsOptional()
  linkedPolicies?: string[];
}
