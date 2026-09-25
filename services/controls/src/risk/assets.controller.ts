import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { AssetFilterDto, CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { DevAuthGuard, User } from '../auth/dev-auth.guard';
import { Roles, RolesGuard, type UserContext } from '@gigachad-grc/shared';

@Controller('api/assets')
@UseGuards(DevAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ===========================
  // Asset CRUD
  // ===========================

  @Get()
  async listAssets(
    @Query() filters: AssetFilterDto,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @User() user: UserContext
  ) {
    return this.assetsService.findAll(
      user.organizationId,
      filters,
      parseInt(page, 10),
      parseInt(limit, 10)
    );
  }

  @Get('stats')
  async getStats(@User() user: UserContext) {
    return this.assetsService.getStats(user.organizationId);
  }

  @Get('sources')
  async getSources(@User() user: UserContext) {
    return this.assetsService.getSources(user.organizationId);
  }

  @Get('departments')
  async getDepartments(@User() user: UserContext) {
    return this.assetsService.getDepartments(user.organizationId);
  }

  @Get(':id')
  async getAsset(@Param('id') id: string, @User() user: UserContext) {
    return this.assetsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  async createAsset(@Body() dto: CreateAssetDto, @User() user: UserContext) {
    return this.assetsService.create(user.organizationId, dto, user.userId, user.email);
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  async updateAsset(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @User() user: UserContext
  ) {
    return this.assetsService.update(id, user.organizationId, dto, user.userId, user.email);
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(@Param('id') id: string, @User() user: UserContext) {
    await this.assetsService.delete(id, user.organizationId, user.userId, user.email);
  }

  // ===========================
  // Integration Sync
  // ===========================

  @Post('sync/:source')
  @Roles('admin', 'compliance_manager')
  async syncFromSource(
    @Param('source') source: string,
    @Body() body: { integrationId: string },
    @User() user: UserContext
  ) {
    if (source === 'jamf') {
      return this.assetsService.syncFromJamf(
        user.organizationId,
        body.integrationId,
        user.userId,
        user.email
      );
    }

    throw new BadRequestException(`Source "${source}" is not supported for asset sync`);
  }
}
