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
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ControlsService } from './controls.service';
import {
  CreateControlDto,
  UpdateControlDto,
  ControlFilterDto,
  BulkUploadControlsDto,
  BulkUploadResultDto,
} from './dto/control.dto';
import {
  Roles,
  RolesGuard,
  CurrentUser,
  UserContext,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('controls')
@ApiBearerAuth()
@Controller('api/controls')
@UseGuards(DevAuthGuard, RolesGuard)
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Get()
  @ApiOperation({ summary: 'List all controls' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of controls' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: ControlFilterDto,
  ) {
    // Use light endpoint by default for better performance
    // Full data is loaded on individual control detail pages
    return this.controlsService.findAllLight(user.organizationId, filters);
  }

  @Get('full')
  @ApiOperation({ summary: 'List all controls with full details (for exports)' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of controls with full details' })
  async findAllFull(
    @CurrentUser() user: UserContext,
    @Query() filters: ControlFilterDto,
  ) {
    return this.controlsService.findAll(user.organizationId, filters);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get control categories with counts' })
  async getCategories() {
    return this.controlsService.getCategories();
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all tags with counts' })
  async getTags(@CurrentUser() user: UserContext) {
    return this.controlsService.getTags(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get control by ID' })
  @ApiParam({ name: 'id', description: 'Control ID' })
  @ApiResponse({ status: 200, description: 'Returns control details' })
  @ApiResponse({ status: 404, description: 'Control not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.controlsService.findOne(id, user.organizationId);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a custom control' })
  @ApiResponse({ status: 201, description: 'Control created successfully' })
  @ApiResponse({ status: 409, description: 'Control ID already exists' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateControlDto,
  ) {
    return this.controlsService.create(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a control' })
  @ApiParam({ name: 'id', description: 'Control ID' })
  @ApiResponse({ status: 200, description: 'Control updated successfully' })
  @ApiResponse({ status: 404, description: 'Control not found' })
  @ApiResponse({ status: 409, description: 'Cannot modify system controls' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateControlDto,
  ) {
    return this.controlsService.update(id, user.organizationId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a control' })
  @ApiParam({ name: 'id', description: 'Control ID' })
  @ApiResponse({ status: 200, description: 'Control deleted successfully' })
  @ApiResponse({ status: 404, description: 'Control not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete system controls' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.controlsService.delete(id, user.organizationId);
  }

  @Post('bulk')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk upload controls from JSON' })
  @ApiBody({ type: BulkUploadControlsDto })
  @ApiResponse({ status: 201, description: 'Bulk upload completed', type: BulkUploadResultDto })
  @ApiResponse({ status: 400, description: 'Invalid data format' })
  async bulkUpload(
    @CurrentUser() user: UserContext,
    @Body() dto: BulkUploadControlsDto,
  ): Promise<BulkUploadResultDto> {
    return this.controlsService.bulkUpload(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post('bulk/csv')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk upload controls from CSV content' })
  @ApiConsumes('text/csv', 'application/json')
  @ApiBody({ 
    schema: { 
      type: 'object',
      properties: {
        csv: { type: 'string', description: 'CSV content' },
        skipExisting: { type: 'boolean', default: false },
        updateExisting: { type: 'boolean', default: false },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Bulk upload completed', type: BulkUploadResultDto })
  @ApiResponse({ status: 400, description: 'Invalid CSV format' })
  async bulkUploadCSV(
    @CurrentUser() user: UserContext,
    @Body() body: { csv: string; skipExisting?: boolean; updateExisting?: boolean },
  ): Promise<BulkUploadResultDto> {
    const controls = this.controlsService.parseCSV(body.csv);
    return this.controlsService.bulkUpload(
      user.organizationId,
      user.userId,
      {
        controls,
        skipExisting: body.skipExisting,
        updateExisting: body.updateExisting,
      },
    );
  }

  @Get('bulk/template')
  @ApiOperation({ summary: 'Download CSV template for bulk upload' })
  @ApiResponse({ status: 200, description: 'CSV template file' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="controls-template.csv"')
  async downloadTemplate(@Res() res: Response) {
    const template = this.controlsService.getCSVTemplate();
    res.send(template);
  }
}

