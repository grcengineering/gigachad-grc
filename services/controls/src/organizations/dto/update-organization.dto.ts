import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^(UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+)$/, {
    message: 'timezone must be UTC or a valid IANA timezone',
  })
  timezone?: string;

  @IsOptional()
  @IsIn(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'])
  dateFormat?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateOrganizationSettingsDto)
  settings?: UpdateOrganizationSettingsDto;
}
