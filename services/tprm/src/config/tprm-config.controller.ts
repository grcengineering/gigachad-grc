import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { DevAuthGuard } from '@gigachad-grc/shared';
import { TprmConfigService } from './tprm-config.service';
import { UpdateTprmConfigurationDto, VendorCategoryDto } from './dto/tprm-config.dto';

@Controller('tprm-config')
@UseGuards(DevAuthGuard)
export class TprmConfigController {
  constructor(private readonly tprmConfigService: TprmConfigService) {}

  /**
   * Get TPRM configuration for organization
   */
  @Get()
  async getConfiguration(@Headers('x-organization-id') organizationId: string) {
    const orgId = organizationId || 'default-org';
    return this.tprmConfigService.getConfiguration(orgId);
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
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateTprmConfigurationDto
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.tprmConfigService.updateConfiguration(orgId, dto, user);
  }

  /**
   * Reset configuration to defaults
   */
  @Post('reset')
  async resetToDefaults(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.tprmConfigService.resetToDefaults(orgId, user);
  }

  /**
   * Add a new vendor category
   */
  @Post('categories')
  async addCategory(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body() category: Omit<VendorCategoryDto, 'id'>
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.tprmConfigService.addCategory(orgId, category, user);
  }

  /**
   * Remove a vendor category
   */
  @Delete('categories/:categoryId')
  async removeCategory(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('categoryId') categoryId: string
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.tprmConfigService.removeCategory(orgId, categoryId, user);
  }

  /**
   * Get frequency for a specific tier
   */
  @Get('tier-frequency/:tier')
  async getTierFrequency(
    @Headers('x-organization-id') organizationId: string,
    @Param('tier') tier: string
  ) {
    const orgId = organizationId || 'default-org';
    const frequency = await this.tprmConfigService.getFrequencyForTier(orgId, tier);
    return { tier, frequency };
  }
}
