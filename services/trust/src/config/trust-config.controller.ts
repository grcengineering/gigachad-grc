import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { TrustConfigService, UpdateTrustConfigDto } from './trust-config.service';
import { CurrentUser, UserContext, Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('trust-config')
@UseGuards(DevAuthGuard, RolesGuard)
export class TrustConfigController {
  constructor(private readonly configService: TrustConfigService) {}

  @Get()
  getConfiguration(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.getConfiguration(user.organizationId);
  }

  @Put()
  @Roles('admin', 'compliance_manager', 'auditor')
  updateConfiguration(@Body() dto: UpdateTrustConfigDto, @CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.updateConfiguration(user.organizationId, dto, user.userId);
  }

  @Post('reset')
  @Roles('admin', 'compliance_manager', 'auditor')
  resetToDefaults(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.resetToDefaults(user.organizationId, user.userId);
  }

  @Get('reference')
  getReferenceData() {
    return this.configService.getReferenceData();
  }
}
