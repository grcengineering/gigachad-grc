import { IsString, IsOptional, IsArray, IsEnum, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsString()
  keycloakId: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SyncUserFromKeycloakDto {
  @IsString()
  keycloakId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];
}

export class UserFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  groupId?: string;
}

export class UserResponseDto {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt?: Date;
  groups: { id: string; name: string }[];
  createdAt: Date;
  updatedAt: Date;
}

export class UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
}



