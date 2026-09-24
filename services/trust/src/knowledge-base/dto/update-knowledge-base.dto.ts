import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { KnowledgeBaseCategory, KnowledgeBaseStatus } from '@prisma/client';

export class UpdateKnowledgeBaseDto {
  @IsEnum(KnowledgeBaseCategory)
  @IsOptional()
  category?: KnowledgeBaseCategory;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  question?: string;

  @IsString()
  @IsOptional()
  answer?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  framework?: string;

  @IsEnum(KnowledgeBaseStatus)
  @IsOptional()
  status?: KnowledgeBaseStatus;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsDateString()
  @IsOptional()
  approvedAt?: string;

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
