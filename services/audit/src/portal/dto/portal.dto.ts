import { IsString, IsOptional, IsBoolean, IsArray, IsNumber, IsDateString, IsEmail } from 'class-validator';

export class PortalLoginDto {
  @IsString()
  accessCode: string;
}

export class PortalSessionDto {
  auditId: string;
  auditName: string;
  auditorName: string;
  auditorEmail: string;
  role: string;
  organizationName: string;
  expiresAt: Date;
  permissions: {
    canViewAll: boolean;
    canUpload: boolean;
    canComment: boolean;
  };
  portalUserId: string;
}

export class CreatePortalUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  role: string; // lead_auditor, auditor, reviewer

  @IsBoolean()
  @IsOptional()
  canViewAll?: boolean;

  @IsBoolean()
  @IsOptional()
  canUpload?: boolean;

  @IsBoolean()
  @IsOptional()
  canComment?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIpRanges?: string[];

  @IsBoolean()
  @IsOptional()
  enforceIpRestriction?: boolean;

  @IsNumber()
  @IsOptional()
  downloadLimit?: number;

  @IsBoolean()
  @IsOptional()
  enableWatermark?: boolean;

  @IsString()
  @IsOptional()
  watermarkText?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdatePortalUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  canViewAll?: boolean;

  @IsBoolean()
  @IsOptional()
  canUpload?: boolean;

  @IsBoolean()
  @IsOptional()
  canComment?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIpRanges?: string[];

  @IsBoolean()
  @IsOptional()
  enforceIpRestriction?: boolean;

  @IsNumber()
  @IsOptional()
  downloadLimit?: number;

  @IsBoolean()
  @IsOptional()
  enableWatermark?: boolean;

  @IsString()
  @IsOptional()
  watermarkText?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class PortalUserResponseDto {
  id: string;
  auditId: string;
  name: string;
  email: string;
  role: string;
  accessCode: string; // Only shown on creation
  isActive: boolean;
  lastLoginAt?: Date;
  canViewAll: boolean;
  canUpload: boolean;
  canComment: boolean;
  allowedIpRanges: string[];
  enforceIpRestriction: boolean;
  downloadLimit?: number;
  downloadsUsed: number;
  enableWatermark: boolean;
  watermarkText?: string;
  expiresAt: Date;
  createdAt: Date;
}

export class PortalAccessLogDto {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
  portalUser?: {
    id: string;
    name: string;
    email: string;
  };
}
