import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  organizationId: string;

  @IsString()
  category: string;

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

  @IsString()
  @IsOptional()
  status?: string;

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
