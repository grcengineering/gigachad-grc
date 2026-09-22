import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DevAuthGuard, CurrentUser, UserContext } from '@gigachad-grc/shared';
import { TprmConfigService } from './tprm-config.service';
import { UpdateTprmConfigurationDto, VendorCategoryDto } from './dto/tprm-config.dto';

@Controller('api/tprm-config')
@UseGuards(DevAuthGuard)
export class TprmConfigController {
  constructor(private readonly tprmConfigService: TprmConfigService) {}

  /**
   * Get TPRM configuration for organization
   */
  @Get()
  async getConfiguration(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not header
    return this.tprmConfigService.getConfiguration(user.organizationId);
  }

  /**
   * Get reference data (frequency options, tier labels, defaults)
   */
  @Get('reference')
  getReferenceData() {
    return this.tprmConfigService.getReferenceData();
  }

  /**
   * Update TPRM configuration
   */
  @Put()
  async updateConfiguration(
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateTprmConfigurationDto
  ) {
    // SECURITY: Organization ID and user ID extracted from authenticated context, not headers
    return this.tprmConfigService.updateConfiguration(user.organizationId, dto, user.userId);
  }

  /**
   * Reset configuration to defaults
   */
  @Post('reset')
  async resetToDefaults(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID and user ID extracted from authenticated context, not headers
    return this.tprmConfigService.resetToDefaults(user.organizationId, user.userId);
  }

  /**
   * Add a new vendor category
   */
  @Post('categories')
  async addCategory(
    @CurrentUser() user: UserContext,
    @Body() category: Omit<VendorCategoryDto, 'id'>
  ) {
    // SECURITY: Organization ID and user ID extracted from authenticated context, not headers
    return this.tprmConfigService.addCategory(user.organizationId, category, user.userId);
  }

  /**
   * Remove a vendor category
   */
  @Delete('categories/:categoryId')
  async removeCategory(@CurrentUser() user: UserContext, @Param('categoryId') categoryId: string) {
    // SECURITY: Organization ID and user ID extracted from authenticated context, not headers
    return this.tprmConfigService.removeCategory(user.organizationId, categoryId, user.userId);
  }

  /**
   * Get frequency for a specific tier
   */
  @Get('tier-frequency/:tier')
  async getTierFrequency(@CurrentUser() user: UserContext, @Param('tier') tier: string) {
    // SECURITY: Organization ID extracted from authenticated context, not header
    const frequency = await this.tprmConfigService.getFrequencyForTier(user.organizationId, tier);
    return { tier, frequency };
  }
}
