import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  timezone: string;
}

export class ChangeMyPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(12)
  @MaxLength(256)
  newPassword: string;
}

export class DisableTotpDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  currentPassword: string;
}
