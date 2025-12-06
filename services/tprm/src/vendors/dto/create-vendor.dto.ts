import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

export class CreateVendorDto {
  @IsString()
  organizationId: string;

  @IsString()
  vendorId: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsIn(['software_vendor', 'cloud_provider', 'professional_services', 'hardware_vendor', 'consultant'])
  category: string;

  @IsIn(['tier_1', 'tier_2', 'tier_3', 'tier_4'])
  tier: string;

  @IsIn(['active', 'inactive', 'pending_onboarding', 'offboarding', 'terminated'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  primaryContact?: string;

  @IsEmail()
  @IsOptional()
  primaryContactEmail?: string;

  @IsString()
  @IsOptional()
  primaryContactPhone?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
