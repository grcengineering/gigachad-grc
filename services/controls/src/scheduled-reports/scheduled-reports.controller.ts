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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ScheduledReportsService } from './scheduled-reports.service';
import { CreateScheduledReportDto, UpdateScheduledReportDto, ScheduledReportResponseDto } from './dto/scheduled-report.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@ApiTags('scheduled-reports')
@ApiBearerAuth()
@Controller('api/scheduled-reports')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ScheduledReportsController {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all scheduled reports' })
  @ApiResponse({ status: 200, description: 'List of scheduled reports', type: [ScheduledReportResponseDto] })
  @RequirePermission(Resource.REPORTS, Action.READ)
  async findAll(@CurrentUser() user: UserContext) {
    const data = await this.scheduledReportsService.findAll(user.organizationId);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific scheduled report' })
  @ApiResponse({ status: 200, description: 'Scheduled report details', type: ScheduledReportResponseDto })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.READ)
  async findOne(@CurrentUser() user: UserContext, @Param('id') id: string) {
    const data = await this.scheduledReportsService.findOne(user.organizationId, id);
    return { success: true, data };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get execution history for a scheduled report' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @RequirePermission(Resource.REPORTS, Action.READ)
  async getExecutions(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.scheduledReportsService.getExecutions(
      user.organizationId,
      id,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new scheduled report' })
  @ApiResponse({ status: 201, description: 'Report created', type: ScheduledReportResponseDto })
  @RequirePermission(Resource.REPORTS, Action.CREATE)
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateScheduledReportDto) {
    const data = await this.scheduledReportsService.create(user.organizationId, user.userId, dto);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a scheduled report' })
  @ApiResponse({ status: 200, description: 'Report updated', type: ScheduledReportResponseDto })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.UPDATE)
  async update(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateScheduledReportDto,
  ) {
    const data = await this.scheduledReportsService.update(user.organizationId, user.userId, id, dto);
    return { success: true, data };
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Manually trigger a scheduled report to run now' })
  @ApiResponse({ status: 200, description: 'Report queued for execution' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.EXPORT)
  async runNow(@CurrentUser() user: UserContext, @Param('id') id: string) {
    const data = await this.scheduledReportsService.runNow(user.organizationId, user.userId, id);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a scheduled report' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.DELETE)
  async delete(@CurrentUser() user: UserContext, @Param('id') id: string) {
    await this.scheduledReportsService.delete(user.organizationId, user.userId, id);
  }
}
