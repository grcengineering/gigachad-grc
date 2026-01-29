import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomReportsService } from './custom-reports.service';
import { CreateCustomReportDto, UpdateCustomReportDto, CustomReportResponseDto } from './dto/custom-report.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@ApiTags('custom-reports')
@ApiBearerAuth()
@Controller('api/custom-reports')
@UseGuards(DevAuthGuard, PermissionGuard)
export class CustomReportsController {
  constructor(private readonly customReportsService: CustomReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List all custom reports' })
  @ApiResponse({ status: 200, description: 'List of custom reports', type: [CustomReportResponseDto] })
  @RequirePermission(Resource.REPORTS, Action.READ)
  async findAll(@CurrentUser() user: UserContext) {
    const data = await this.customReportsService.findAll(user.organizationId, user.userId);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific custom report' })
  @ApiResponse({ status: 200, description: 'Custom report details', type: CustomReportResponseDto })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.READ)
  async findOne(@CurrentUser() user: UserContext, @Param('id') id: string) {
    const data = await this.customReportsService.findOne(user.organizationId, user.userId, id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new custom report' })
  @ApiResponse({ status: 201, description: 'Report created', type: CustomReportResponseDto })
  @RequirePermission(Resource.REPORTS, Action.CREATE)
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateCustomReportDto) {
    const data = await this.customReportsService.create(user.organizationId, user.userId, dto);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a custom report' })
  @ApiResponse({ status: 200, description: 'Report updated', type: CustomReportResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorized to update this report' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.UPDATE)
  async update(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() dto: UpdateCustomReportDto,
  ) {
    const data = await this.customReportsService.update(user.organizationId, user.userId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom report' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this report' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @RequirePermission(Resource.REPORTS, Action.DELETE)
  async delete(@CurrentUser() user: UserContext, @Param('id') id: string) {
    await this.customReportsService.delete(user.organizationId, user.userId, id);
  }
}
