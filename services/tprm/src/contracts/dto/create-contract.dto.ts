import { IsString, IsOptional, IsDateString, IsNumber, IsBoolean, IsInt } from 'class-validator';

export class CreateContractDto {
  @IsString()
  organizationId: string;

  @IsString()
  vendorId: string;

  @IsString()
  @IsOptional()
  contractNumber?: string;

  @IsString()
  contractType: string; // msa, sow, dpa, sla, nda, purchase_order

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  contractValue?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsDateString()
  @IsOptional()
  renewalDate?: string;

  @IsInt()
  @IsOptional()
  noticePeriodDays?: number;

  @IsString()
  @IsOptional()
  status?: string; // draft, active, expiring_soon, expired, terminated, renewed

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresSoc2?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresIso27001?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresPenTest?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresRightToAudit?: boolean;

  @IsBoolean()
  @IsOptional()
  dataProcessingAddendum?: boolean;

  @IsInt()
  @IsOptional()
  notifyDaysBefore?: number;

  @IsString()
  @IsOptional()
  contractOwner?: string;

  @IsString()
  @IsOptional()
  businessOwner?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
