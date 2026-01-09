import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

// SCIM 2.0 Standard DTOs - RFC 7643 & RFC 7644

export class ScimMeta {
  @ApiProperty()
  resourceType: string;

  @ApiProperty()
  created: string;

  @ApiProperty()
  lastModified: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  version?: string;
}

export class ScimName {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formatted?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  givenName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  honorificPrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  honorificSuffix?: string;
}

export class ScimEmail {
  @ApiProperty()
  @IsEmail()
  value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  primary?: boolean;
}

export class ScimGroupMember {
  @ApiProperty()
  @IsString()
  value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  display?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  $ref?: string;
}

// User Resource
export class ScimUserResource {
  @ApiProperty({ example: ['urn:ietf:params:scim:schemas:core:2.0:User'] })
  schemas: string[];

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty()
  userName: string;

  @ApiPropertyOptional({ type: ScimName })
  name?: ScimName;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiPropertyOptional({ type: [ScimEmail] })
  emails?: ScimEmail[];

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional({ type: [Object] })
  groups?: { value: string; display: string; $ref: string }[];

  @ApiProperty({ type: ScimMeta })
  meta: ScimMeta;
}

export class CreateScimUserDto {
  @ApiProperty({ example: ['urn:ietf:params:scim:schemas:core:2.0:User'] })
  @IsArray()
  schemas: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty()
  @IsString()
  userName: string;

  @ApiPropertyOptional({ type: ScimName })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScimName)
  name?: ScimName;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ type: [ScimEmail] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScimEmail)
  emails?: ScimEmail[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateScimUserDto extends CreateScimUserDto {}

export class PatchScimOperation {
  @ApiProperty({ enum: ['add', 'remove', 'replace'] })
  op: 'add' | 'remove' | 'replace';

  @ApiPropertyOptional()
  path?: string;

  @ApiPropertyOptional()
  value?: any;
}

export class PatchScimDto {
  @ApiProperty({ example: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'] })
  schemas: string[];

  @ApiProperty({ type: [PatchScimOperation] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PatchScimOperation)
  Operations: PatchScimOperation[];
}

// Group Resource
export class ScimGroupResource {
  @ApiProperty({ example: ['urn:ietf:params:scim:schemas:core:2.0:Group'] })
  schemas: string[];

  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional({ type: [ScimGroupMember] })
  members?: ScimGroupMember[];

  @ApiProperty({ type: ScimMeta })
  meta: ScimMeta;
}

export class CreateScimGroupDto {
  @ApiProperty({ example: ['urn:ietf:params:scim:schemas:core:2.0:Group'] })
  @IsArray()
  schemas: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty()
  @IsString()
  displayName: string;

  @ApiPropertyOptional({ type: [ScimGroupMember] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScimGroupMember)
  members?: ScimGroupMember[];
}

export class UpdateScimGroupDto extends CreateScimGroupDto {}

// List Response
export class ScimListResponse<T> {
  @ApiProperty({ example: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'] })
  schemas: string[];

  @ApiProperty()
  totalResults: number;

  @ApiProperty()
  startIndex: number;

  @ApiProperty()
  itemsPerPage: number;

  @ApiProperty()
  Resources: T[];
}

// Error Response
export class ScimError {
  @ApiProperty({ example: ['urn:ietf:params:scim:api:messages:2.0:Error'] })
  schemas: string[];

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  scimType?: string;

  @ApiProperty()
  detail: string;
}

// Filter Query
export class ScimQueryDto {
  @ApiPropertyOptional({ description: 'SCIM filter expression' })
  @IsOptional()
  @IsString()
  filter?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  startIndex?: number = 1;

  @ApiPropertyOptional({ default: 100 })
  @IsOptional()
  count?: number = 100;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ascending', 'descending'] })
  @IsOptional()
  sortOrder?: 'ascending' | 'descending';
}
