import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ApiKeyResponseDto {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export class ApiKeyWithSecretResponseDto extends ApiKeyResponseDto {
  /** The full API key - only returned once on creation */
  key: string;
}

export class ApiKeyListResponseDto {
  keys: ApiKeyResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export class ApiKeyFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// Available scopes for API keys
export const API_KEY_SCOPES = [
  'controls:read',
  'controls:write',
  'evidence:read',
  'evidence:write',
  'risks:read',
  'risks:write',
  'policies:read',
  'policies:write',
  'frameworks:read',
  'frameworks:write',
  'vendors:read',
  'vendors:write',
  'audits:read',
  'audits:write',
  'all',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
