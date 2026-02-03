import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TrustConfigService, UpdateTrustConfigDto } from './trust-config.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('trust-config')
@UseGuards(DevAuthGuard)
export class TrustConfigController {
  constructor(private readonly configService: TrustConfigService) {}

  @Get()
  getConfiguration(@CurrentUser() user: UserContext) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.getConfiguration(user.organizationId);
  }

  @Put()
  updateConfiguration(
    @Body() dto: UpdateTrustConfigDto,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.updateConfiguration(
      user.organizationId,
      dto,
      user.userId,
    );
  }

  @Post('reset')
  resetToDefaults(
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Organization ID extracted from authenticated context, not query param
    return this.configService.resetToDefaults(
      user.organizationId,
      user.userId,
    );
  }

  @Get('reference')
  getReferenceData() {
    return this.configService.getReferenceData();
  }
}

