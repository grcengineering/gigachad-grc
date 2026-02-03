import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import {
  CreateExportJobDto,
  ExportJobDto,
  ExportJobListQueryDto,
} from './dto/export.dto';
import { CurrentUser, UserContext, Roles, RolesGuard, EndpointRateLimit, ENDPOINT_RATE_LIMITS } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Exports')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get()
  @ApiOperation({ summary: 'List export jobs' })
  async listExportJobs(
    @CurrentUser() user: UserContext,
    @Query() query: ExportJobListQueryDto,
  ) {
    return this.exportsService.listExportJobs(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, type: ExportJobDto })
  async getExportJob(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<ExportJobDto> {
    return this.exportsService.getExportJob(user.organizationId, id);
  }

  @Post()
  @Roles('admin', 'compliance_manager', 'auditor')
  @EndpointRateLimit(ENDPOINT_RATE_LIMITS.EXPORT)
  @ApiOperation({ summary: 'Create a new export job' })
  @ApiResponse({ status: 201, type: ExportJobDto })
  async createExportJob(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateExportJobDto,
  ): Promise<ExportJobDto> {
    return this.exportsService.createExportJob(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get(':id/download')
  @EndpointRateLimit(ENDPOINT_RATE_LIMITS.EXPORT)
  @ApiOperation({ summary: 'Download export file' })
  async downloadExport(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { content, contentType, fileName } = await this.exportsService.downloadExport(
      user.organizationId,
      id,
    );

    const buffer = Buffer.from(content, 'base64');
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an export job' })
  async cancelExportJob(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.exportsService.cancelExportJob(user.organizationId, id);
  }
}
