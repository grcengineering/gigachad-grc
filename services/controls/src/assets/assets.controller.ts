import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetFilterDto,
  LinkAssetToRiskDto,
} from './dto/asset.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('api/assets')
@UseGuards(DevAuthGuard, PermissionGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  // ============================================
  // CRUD Endpoints
  // ============================================

  @Get()
  @ApiOperation({ summary: 'List all assets' })
  @ApiResponse({ status: 200, description: 'List of assets' })
  @RequirePermission(Resource.CONTROLS, Action.READ)
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() filters: AssetFilterDto
  ) {
    return this.assetsService.findAll(req.user.organizationId, filters);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get asset summary statistics' })
  @ApiResponse({ status: 200, description: 'Asset summary' })
  @RequirePermission(Resource.CONTROLS, Action.READ)
  async getSummary(@Req() req: AuthenticatedRequest) {
    return this.assetsService.getSummary(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset details' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @RequirePermission(Resource.CONTROLS, Action.READ)
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.assetsService.findOne(req.user.organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  @RequirePermission(Resource.CONTROLS, Action.CREATE)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssetDto
  ) {
    return this.assetsService.create(
      req.user.organizationId,
      dto,
      req.user.userId
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto
  ) {
    return this.assetsService.update(
      req.user.organizationId,
      id,
      dto,
      req.user.userId
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 204, description: 'Asset deleted' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Resource.CONTROLS, Action.DELETE)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ) {
    return this.assetsService.delete(
      req.user.organizationId,
      id,
      req.user.userId
    );
  }

  // ============================================
  // Risk Linking Endpoints
  // ============================================

  @Post(':id/risks')
  @ApiOperation({ summary: 'Link asset to risk' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({ status: 201, description: 'Asset linked to risk' })
  @RequirePermission(Resource.CONTROLS, Action.UPDATE)
  async linkToRisk(
    @Req() req: AuthenticatedRequest,
    @Param('id') assetId: string,
    @Body() dto: LinkAssetToRiskDto
  ) {
    await this.assetsService.linkToRisk(
      req.user.organizationId,
      assetId,
      dto.riskId,
      dto.impactDescription
    );
    return { success: true };
  }

  @Delete(':id/risks/:riskId')
  @ApiOperation({ summary: 'Unlink asset from risk' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiParam({ name: 'riskId', description: 'Risk ID' })
  @ApiResponse({ status: 204, description: 'Asset unlinked from risk' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Resource.CONTROLS, Action.UPDATE)
  async unlinkFromRisk(
    @Req() req: AuthenticatedRequest,
    @Param('id') assetId: string,
    @Param('riskId') riskId: string
  ) {
    await this.assetsService.unlinkFromRisk(
      req.user.organizationId,
      assetId,
      riskId
    );
  }
}
