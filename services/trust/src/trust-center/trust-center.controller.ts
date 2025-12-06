import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TrustCenterService } from './trust-center.service';
import { UpdateTrustCenterConfigDto } from './dto/update-config.dto';
import { CreateTrustCenterContentDto } from './dto/create-content.dto';
import { UpdateTrustCenterContentDto } from './dto/update-content.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('trust-center')
@UseGuards(DevAuthGuard)
export class TrustCenterController {
  constructor(private readonly trustCenterService: TrustCenterService) {}

  // Config endpoints
  @Get('config')
  getConfig(@Query('organizationId') organizationId: string) {
    return this.trustCenterService.getConfig(organizationId);
  }

  @Patch('config')
  updateConfig(
    @Query('organizationId') organizationId: string,
    @Body() updateConfigDto: UpdateTrustCenterConfigDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.trustCenterService.updateConfig(organizationId, updateConfigDto, user.userId);
  }

  // Content endpoints
  @Post('content')
  createContent(
    @Body() createContentDto: CreateTrustCenterContentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.trustCenterService.createContent(createContentDto, user.userId);
  }

  @Get('content')
  getContent(
    @Query('organizationId') organizationId: string,
    @Query('section') section?: string,
    @Query('publishedOnly') publishedOnly?: string,
  ) {
    return this.trustCenterService.getContent(
      organizationId,
      section,
      publishedOnly === 'true',
    );
  }

  @Get('content/:id')
  getContentById(@Param('id') id: string) {
    return this.trustCenterService.getContentById(id);
  }

  @Patch('content/:id')
  updateContent(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateTrustCenterContentDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.trustCenterService.updateContent(id, updateContentDto, user.userId);
  }

  @Delete('content/:id')
  deleteContent(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.trustCenterService.deleteContent(id, user.userId);
  }

  // Public Trust Center view
  @Get('public')
  getPublicTrustCenter(@Query('organizationId') organizationId: string) {
    return this.trustCenterService.getPublicTrustCenter(organizationId);
  }
}
