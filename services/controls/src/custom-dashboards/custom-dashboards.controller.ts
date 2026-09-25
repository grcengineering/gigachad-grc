import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CustomDashboardsService } from './custom-dashboards.service';
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  ExecuteQueryDto,
} from './dto/dashboard.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller('api/dashboards')
@UseGuards(DevAuthGuard)
export class CustomDashboardsController {
  constructor(private readonly dashboardsService: CustomDashboardsService) {}

  // ==================== Dashboard CRUD ====================

  @Get()
  @ApiOperation({ summary: 'List all dashboards for current user' })
  @ApiResponse({ status: 200, description: 'Returns list of dashboards' })
  async findAll(@CurrentUser() user: UserContext) {
    return this.dashboardsService.findAll(user.organizationId, user.userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available templates' })
  @ApiResponse({ status: 200, description: 'Returns list of templates' })
  async getTemplates(@CurrentUser() user: UserContext) {
    return this.dashboardsService.getTemplates(user.organizationId);
  }

  @Get('data-sources')
  @ApiOperation({ summary: 'Get available data sources for widgets' })
  @ApiResponse({ status: 200, description: 'Returns list of data sources' })
  async getDataSources() {
    return this.dashboardsService.getAvailableDataSources();
  }

  @Post('query')
  @ApiOperation({ summary: 'Execute a data query (preview mode)' })
  @ApiBody({ type: ExecuteQueryDto })
  @ApiResponse({ status: 200, description: 'Returns query results' })
  async executeQuery(
    @CurrentUser() user: UserContext,
    @Body() dto: ExecuteQueryDto,
  ) {
    return this.dashboardsService.executeQuery(
      user.organizationId,
      dto.query,
      dto.preview ?? true,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Returns dashboard with widgets' })
  async findById(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ) {
    return this.dashboardsService.findById(id, user.organizationId, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiBody({ type: CreateDashboardDto })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateDashboardDto,
  ) {
    if (
      dto.isTemplate &&
      user.role !== 'admin' &&
      user.role !== 'compliance_manager'
    ) {
      throw new ForbiddenException('Only administrators can create organization templates');
    }
    return this.dashboardsService.create(user.organizationId, user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiBody({ type: UpdateDashboardDto })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async update(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboardsService.update(id, user.organizationId, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async delete(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ) {
    return this.dashboardsService.delete(id, user.organizationId, user.userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a dashboard or template' })
  @ApiParam({ name: 'id', description: 'Dashboard ID to duplicate' })
  @ApiResponse({ status: 201, description: 'Dashboard duplicated' })
  async duplicate(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body('name') name?: string,
  ) {
    return this.dashboardsService.duplicate(id, user.organizationId, user.userId, name);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set a dashboard as the default' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard set as default' })
  async setDefault(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ) {
    return this.dashboardsService.setDefault(id, user.organizationId, user.userId);
  }

  // ==================== Widget CRUD ====================

  @Post(':dashboardId/widgets')
  @ApiOperation({ summary: 'Add a widget to a dashboard' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiBody({ type: CreateWidgetDto })
  @ApiResponse({ status: 201, description: 'Widget added' })
  async addWidget(
    @CurrentUser() user: UserContext,
    @Param('dashboardId') dashboardId: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.dashboardsService.addWidget(
      dashboardId,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Update a widget' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiBody({ type: UpdateWidgetDto })
  @ApiResponse({ status: 200, description: 'Widget updated' })
  async updateWidget(
    @CurrentUser() user: UserContext,
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.dashboardsService.updateWidget(
      widgetId,
      dashboardId,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Delete(':dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Delete a widget' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiResponse({ status: 200, description: 'Widget deleted' })
  async deleteWidget(
    @CurrentUser() user: UserContext,
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardsService.deleteWidget(
      widgetId,
      dashboardId,
      user.organizationId,
      user.userId,
    );
  }

  @Get(':dashboardId/widgets/:widgetId/data')
  @ApiOperation({ summary: 'Get widget data' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiParam({ name: 'widgetId', description: 'Widget ID' })
  @ApiResponse({ status: 200, description: 'Returns widget data' })
  async getWidgetData(
    @CurrentUser() user: UserContext,
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardsService.getWidgetData(
      widgetId,
      dashboardId,
      user.organizationId,
      user.userId,
    );
  }
}




