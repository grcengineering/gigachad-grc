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
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';
import { ConfigFilesService } from './config-files.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}
import {
  CreateConfigFileDto,
  UpdateConfigFileDto,
  ConfigFileResponseDto,
  ConfigFileListResponseDto,
  PreviewChangesDto,
  PreviewChangesResponseDto,
  ApplyChangesDto,
  ApplyChangesResponseDto,
  ConfigFileVersionDto,
} from './dto/config-file.dto';

@ApiTags('config-as-code')
@ApiBearerAuth()
@Controller('api/config-as-code/files')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ConfigFilesController {
  private readonly logger = new Logger(ConfigFilesController.name);

  constructor(private readonly configFilesService: ConfigFilesService) {}

  // ===========================================
  // State Management Endpoints (MUST be before wildcard routes)
  // ===========================================

  @Get('state/drift')
  @ApiOperation({ summary: 'Detect drift between last applied state and current database' })
  @ApiResponse({
    status: 200,
    description: 'Drift report showing changes made via UI since last terraform apply',
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getDriftReport(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.configFilesService.getDriftReport(
      req.user.organizationId,
      workspaceId,
    );
  }

  @Get('state/history')
  @ApiOperation({ summary: 'Get apply operation history' })
  @ApiResponse({
    status: 200,
    description: 'List of past apply operations',
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records to return' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getApplyHistory(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.configFilesService.getApplyHistory(
      req.user.organizationId,
      limit ? parseInt(limit, 10) : 20,
      workspaceId,
    );
  }

  @Get('state/lock')
  @ApiOperation({ summary: 'Get current apply lock status' })
  @ApiResponse({
    status: 200,
    description: 'Current lock status',
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getLockStatus(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.configFilesService.getLockStatus(
      req.user.organizationId,
      workspaceId,
    );
  }

  @Delete('state/lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force release an apply lock (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Lock released',
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async forceReleaseLock(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.configFilesService.forceReleaseLock(
      req.user.organizationId,
      req.user.userId,
      workspaceId,
    );
  }

  // ===========================================
  // File Management Endpoints
  // ===========================================

  @Get()
  @ApiOperation({ summary: 'List all config files' })
  @ApiResponse({
    status: 200,
    description: 'List of config files',
    type: ConfigFileListResponseDto,
  })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Workspace ID filter' })
  @ApiQuery({ name: 'initialize', required: false, description: 'Initialize default files if none exist' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async listFiles(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
    @Query('initialize') initialize?: string,
  ): Promise<ConfigFileListResponseDto> {
    // Initialize default files if requested and none exist
    if (initialize === 'true') {
      this.logger.log(`Initialization requested for org ${req.user.organizationId}, user ${req.user.userId}, workspace ${workspaceId || 'none'}`);
      try {
        await this.configFilesService.initializeDefaultFiles(
          req.user.organizationId,
          req.user.userId,
          workspaceId,
        );
        this.logger.log('Initialization completed successfully');
      } catch (error: unknown) {
        // Log the error with full details
        const err = error as Error & { response?: { data?: unknown }; status?: number };
        this.logger.error('Failed to initialize config files', err.stack);
        this.logger.error(`Error details: ${JSON.stringify({
          message: err.message,
          response: err.response?.data,
          status: err.status,
        })}`);
        // Re-throw the error so the frontend can handle it properly
        throw error;
      }
    }
    
    return this.configFilesService.listFiles(
      req.user.organizationId,
      workspaceId,
    );
  }

  @Get(':path')
  @ApiOperation({ summary: 'Get a specific config file' })
  @ApiParam({ name: 'path', description: 'File path (e.g., controls/main.tf)' })
  @ApiResponse({
    status: 200,
    description: 'Config file',
    type: ConfigFileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getFile(
    @Req() req: AuthenticatedRequest,
    @Param('path') path: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ConfigFileResponseDto> {
    return this.configFilesService.getFile(
      req.user.organizationId,
      path,
      workspaceId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new config file' })
  @ApiResponse({
    status: 201,
    description: 'Config file created',
    type: ConfigFileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'File already exists' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async createFile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateConfigFileDto,
  ): Promise<ConfigFileResponseDto> {
    return this.configFilesService.createFile(
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Put(':path')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing config file' })
  @ApiParam({ name: 'path', description: 'File path' })
  @ApiResponse({
    status: 200,
    description: 'Config file updated',
    type: ConfigFileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async updateFile(
    @Req() req: AuthenticatedRequest,
    @Param('path') path: string,
    @Body() dto: UpdateConfigFileDto,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ConfigFileResponseDto> {
    return this.configFilesService.updateFile(
      req.user.organizationId,
      req.user.userId,
      path,
      dto,
      workspaceId,
    );
  }

  @Delete(':path')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a config file' })
  @ApiParam({ name: 'path', description: 'File path' })
  @ApiResponse({ status: 204, description: 'File deleted' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async deleteFile(
    @Req() req: AuthenticatedRequest,
    @Param('path') path: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<void> {
    return this.configFilesService.deleteFile(
      req.user.organizationId,
      req.user.userId,
      path,
      workspaceId,
    );
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview changes before applying - includes conflict detection' })
  @ApiResponse({
    status: 200,
    description: 'Preview of changes with conflict detection',
    type: PreviewChangesResponseDto,
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async previewChanges(
    @Req() req: AuthenticatedRequest,
    @Body() dto: PreviewChangesDto,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<PreviewChangesResponseDto> {
    return this.configFilesService.previewChanges(
      req.user.organizationId,
      dto,
      workspaceId,
    );
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply changes from config file to platform' })
  @ApiResponse({
    status: 200,
    description: 'Changes applied',
    type: ApplyChangesResponseDto,
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async applyChanges(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ApplyChangesDto,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ApplyChangesResponseDto> {
    return this.configFilesService.applyChanges(
      req.user.organizationId,
      req.user.userId,
      dto,
      workspaceId,
    );
  }

  @Get(':path/versions')
  @ApiOperation({ summary: 'Get version history for a file' })
  @ApiParam({ name: 'path', description: 'File path' })
  @ApiResponse({
    status: 200,
    description: 'Version history',
    type: [ConfigFileVersionDto],
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getVersionHistory(
    @Req() req: AuthenticatedRequest,
    @Param('path') path: string,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ConfigFileVersionDto[]> {
    return this.configFilesService.getVersionHistory(
      req.user.organizationId,
      path,
      workspaceId,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh all config files from current database state' })
  @ApiResponse({
    status: 200,
    description: 'Files refreshed from database',
  })
  @ApiQuery({ name: 'workspaceId', required: false })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async refreshFromDatabase(
    @Req() req: AuthenticatedRequest,
    @Query('workspaceId') workspaceId?: string,
  ): Promise<{ message: string; filesUpdated: number }> {
    return this.configFilesService.refreshFromDatabase(
      req.user.organizationId,
      req.user.userId,
      workspaceId,
    );
  }
}

