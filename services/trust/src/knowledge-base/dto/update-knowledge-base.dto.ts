import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';

export class UpdateKnowledgeBaseDto {
  @IsString()
  @IsOptional()
  category?: string;

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

  @IsString()
  @IsOptional()
  status?: string;

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
