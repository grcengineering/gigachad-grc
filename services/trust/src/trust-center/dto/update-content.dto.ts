import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UpdateTrustCenterContentDto {
  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
