import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { MappingsService } from './mappings.service';
import {
  CreateMappingDto,
  BulkCreateMappingsDto,
  UpdateMappingDto,
  RestoreMappingDto,
} from './dto/mapping.dto';
import { Roles, RolesGuard, CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

export const MAPPING_IMPORT_MIME_ALLOWLIST = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
export const MAPPING_IMPORT_MAX_BYTES = 25 * 1024 * 1024;

export function mappingImportFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (err: Error | null, acceptFile: boolean) => void
): void {
  if (MAPPING_IMPORT_MIME_ALLOWLIST.includes(file.mimetype)) cb(null, true);
  else cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
}

@ApiTags('mappings')
@ApiBearerAuth()
@Controller('api/mappings')
@UseGuards(DevAuthGuard, RolesGuard)
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Get()
  @ApiOperation({ summary: 'List control-to-requirement mappings' })
  async findAll(
    @Query('frameworkId') frameworkId?: string,
    @Query('controlId') controlId?: string
  ) {
    return this.mappingsService.findAll(frameworkId, controlId);
  }

  @Get('by-control/:controlId')
  @ApiOperation({ summary: 'Get mappings for a control' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  async findByControl(@Param('controlId') controlId: string) {
    return this.mappingsService.findByControl(controlId);
  }

  @Get('by-requirement/:requirementId')
  @ApiOperation({ summary: 'Get mappings for a requirement' })
  @ApiParam({ name: 'requirementId', description: 'Requirement ID' })
  async findByRequirement(@Param('requirementId') requirementId: string) {
    return this.mappingsService.findByRequirement(requirementId);
  }

  @Get('control-coverage')
  @ApiOperation({ summary: 'Get control coverage statistics' })
  async getControlCoverage(@CurrentUser() user: UserContext) {
    return this.mappingsService.getControlCoverage(user.organizationId);
  }

  @Get('requirement-coverage/:frameworkId')
  @ApiOperation({ summary: 'Get requirement coverage for a framework' })
  @ApiParam({ name: 'frameworkId', description: 'Framework ID' })
  async getRequirementCoverage(@Param('frameworkId') frameworkId: string) {
    return this.mappingsService.getRequirementCoverage(frameworkId);
  }

  @Get('gaps')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'List mapping gaps (requirements/controls without coverage)' })
  @ApiQuery({
    name: 'frameworkId',
    required: false,
    description: 'Filter by framework (ignored for unused-controls)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['no-controls', 'supporting-only', 'unused-controls'],
    description: 'Gap type filter; omit to return all three concatenated',
  })
  async findGaps(
    @CurrentUser() user: UserContext,
    @Query('frameworkId') frameworkId?: string,
    @Query('type') type?: 'no-controls' | 'supporting-only' | 'unused-controls'
  ) {
    return this.mappingsService.findGaps(user.organizationId, frameworkId, type);
  }

  @Get('export')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'Export control-to-requirement mappings as CSV or XLSX' })
  async exportFile(
    @CurrentUser() user: UserContext,
    @Query('frameworkId') frameworkId: string,
    @Res() res: Response,
    @Query('format') format?: string
  ) {
    if (!frameworkId) throw new BadRequestException('frameworkId is required');
    const normalizedFormat = (format ?? 'xlsx').toLowerCase();
    if (normalizedFormat !== 'csv' && normalizedFormat !== 'xlsx') {
      throw new BadRequestException(`Unsupported format: ${format}`);
    }
    const { buffer, fileName, contentType } = await this.mappingsService.exportFile(
      frameworkId,
      normalizedFormat as 'csv' | 'xlsx',
      user.organizationId,
      user.userId
    );
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a control-to-requirement mapping' })
  async create(@CurrentUser() user: UserContext, @Body() dto: CreateMappingDto) {
    return this.mappingsService.create(user.userId, user.organizationId, dto);
  }

  @Post('bulk')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Bulk create mappings' })
  async bulkCreate(@CurrentUser() user: UserContext, @Body() dto: BulkCreateMappingsDto) {
    return this.mappingsService.bulkCreate(user.userId, user.organizationId, dto.mappings);
  }

  @Post('import')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Import control-to-requirement mappings from CSV or XLSX' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAPPING_IMPORT_MAX_BYTES },
      fileFilter: mappingImportFileFilter,
    })
  )
  async import(
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File,
    @Query('dryRun') dryRun?: string
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.mappingsService.importMappings(
      file.buffer,
      file.mimetype,
      file.originalname,
      dryRun === 'true',
      user.userId,
      user.organizationId
    );
  }

  @Patch(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update a control-to-requirement mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMappingDto,
    @CurrentUser() user: UserContext
  ) {
    return this.mappingsService.update(id, dto, user.userId, user.organizationId);
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete a mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.mappingsService.delete(id, user.userId, user.organizationId);
  }

  @Get(':id/history')
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiOperation({ summary: 'List change history for a mapping' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  async history(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.mappingsService.getHistory(id, user.organizationId);
  }

  @Post(':id/restore/:historyId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Restore a mapping to a prior history snapshot' })
  @ApiParam({ name: 'id', description: 'Mapping ID' })
  @ApiParam({ name: 'historyId', description: 'History entry ID' })
  async restore(
    @Param('id') id: string,
    @Param('historyId') historyId: string,
    @Body() dto: RestoreMappingDto,
    @CurrentUser() user: UserContext
  ) {
    return this.mappingsService.restore(id, historyId, dto, user.userId, user.organizationId);
  }
}
