import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateTrustCenterContentDto {
  @IsString()
  organizationId: string;

  @IsString()
  section: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
