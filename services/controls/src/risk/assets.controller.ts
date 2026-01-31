 
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import {
  AssetFilterDto,
  CreateAssetDto,
  UpdateAssetDto,
} from './dto/asset.dto';

@Controller('api/assets')
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
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.assetsService.findAll(
      orgId,
      filters,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('stats')
  async getStats(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.assetsService.getStats(orgId);
  }

  @Get('sources')
  async getSources(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.assetsService.getSources(orgId);
  }

  @Get('departments')
  async getDepartments(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.assetsService.getDepartments(orgId);
  }

  @Get(':id')
  async getAsset(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.assetsService.findOne(id, orgId);
  }

  @Post()
  async createAsset(
    @Body() dto: CreateAssetDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.assetsService.create(orgId, dto, userId, userEmail);
  }

  @Put(':id')
  async updateAsset(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    return this.assetsService.update(id, orgId, dto, userId, userEmail);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAsset(
    @Param('id') id: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    await this.assetsService.delete(id, orgId, userId, userEmail);
  }

  // ===========================
  // Integration Sync
  // ===========================

  @Post('sync/:source')
  async syncFromSource(
    @Param('source') source: string,
    @Body() body: { integrationId: string },
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Headers('x-user-email') userEmail?: string,
  ) {
    if (source === 'jamf') {
      return this.assetsService.syncFromJamf(
        orgId,
        body.integrationId,
        userId,
        userEmail,
      );
    }

    return {
      source,
      error: `Unsupported source: ${source}`,
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [`Source "${source}" is not supported for asset sync`],
      duration: 0,
    };
  }
}



