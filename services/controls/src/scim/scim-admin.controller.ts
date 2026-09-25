import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CurrentUser, Roles, RolesGuard, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { ScimService } from './scim.service';

enum ScimProvider {
  OKTA = 'okta',
  AZURE_AD = 'azure_ad',
  ONELOGIN = 'onelogin',
  GOOGLE = 'google',
  GENERIC = 'generic',
}

enum ScimDefaultRole {
  ADMIN = 'admin',
  COMPLIANCE_MANAGER = 'compliance_manager',
  AUDITOR = 'auditor',
  VIEWER = 'viewer',
}

class RotateScimTokenDto {
  @IsEnum(ScimProvider)
  provider: ScimProvider;

  @IsOptional()
  @IsEnum(ScimDefaultRole)
  defaultRole?: ScimDefaultRole;
}

class SetScimEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('SCIM Administration')
@ApiBearerAuth()
@Controller('api/scim-config')
@UseGuards(DevAuthGuard, RolesGuard)
@Roles('admin')
export class ScimAdminController {
  constructor(private readonly scimService: ScimService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current organization SCIM configuration' })
  getConfig(@CurrentUser() user: UserContext) {
    return this.scimService.getProviderConfig(user.organizationId);
  }

  @Post('rotate-token')
  @ApiOperation({ summary: 'Create or rotate the organization SCIM bearer token' })
  rotateToken(@CurrentUser() user: UserContext, @Body() dto: RotateScimTokenDto) {
    return this.scimService.rotateProviderToken(
      user.organizationId,
      dto.provider,
      dto.defaultRole
    );
  }

  @Patch('enabled')
  @ApiOperation({ summary: 'Enable or disable SCIM provisioning' })
  setEnabled(@CurrentUser() user: UserContext, @Body() dto: SetScimEnabledDto) {
    return this.scimService.setProviderEnabled(user.organizationId, dto.enabled);
  }
}
