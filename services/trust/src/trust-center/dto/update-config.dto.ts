import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateTrustCenterConfigDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  customDomain?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  primaryColor?: string;

  @IsString()
  @IsOptional()
  securityEmail?: string;

  @IsString()
  @IsOptional()
  supportUrl?: string;

  @IsBoolean()
  @IsOptional()
  showCertifications?: boolean;

  @IsBoolean()
  @IsOptional()
  showPolicies?: boolean;

  @IsBoolean()
  @IsOptional()
  showSecurityFeatures?: boolean;

  @IsBoolean()
  @IsOptional()
  showPrivacy?: boolean;

  @IsBoolean()
  @IsOptional()
  showIncidentResponse?: boolean;

  @IsObject()
  @IsOptional()
  customSections?: Record<string, unknown>;
}
