 
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import { RiskConfigService } from './risk-config.service';
import { UpdateRiskConfigurationDto, RiskCategoryDto } from './dto/risk-config.dto';

@Controller('api/risk-config')
export class RiskConfigController {
  constructor(private readonly riskConfigService: RiskConfigService) {}

  /**
   * Get risk configuration for organization
   */
  @Get()
  async getConfiguration(
    @Headers('x-organization-id') organizationId: string,
  ) {
    const orgId = organizationId || 'default-org';
    return this.riskConfigService.getConfiguration(orgId);
  }

  /**
   * Update risk configuration
   */
  @Put()
  async updateConfiguration(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateRiskConfigurationDto,
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.riskConfigService.updateConfiguration(orgId, dto, user);
  }

  /**
   * Reset configuration to defaults
   */
  @Post('reset')
  async resetToDefaults(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.riskConfigService.resetToDefaults(orgId, user);
  }

  /**
   * Add a new category
   */
  @Post('categories')
  async addCategory(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Body() category: Omit<RiskCategoryDto, 'id'>,
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.riskConfigService.addCategory(orgId, category, user);
  }

  /**
   * Remove a category
   */
  @Delete('categories/:categoryId')
  async removeCategory(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.riskConfigService.removeCategory(orgId, categoryId, user);
  }

  /**
   * Update risk appetite for a category
   */
  @Put('appetite/:category')
  async updateRiskAppetite(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-user-id') userId: string,
    @Param('category') category: string,
    @Body() body: { level: string; description?: string },
  ) {
    const orgId = organizationId || 'default-org';
    const user = userId || 'system';
    return this.riskConfigService.updateRiskAppetite(
      orgId,
      category,
      body.level,
      body.description,
      user,
    );
  }
}

