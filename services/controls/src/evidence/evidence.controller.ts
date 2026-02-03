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
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { EvidenceService } from './evidence.service';
import {
  UploadEvidenceDto,
  UpdateEvidenceDto,
  EvidenceFilterDto,
  LinkEvidenceDto,
  ReviewEvidenceDto,
  CreateFolderDto,
} from './dto/evidence.dto';
import {
  Roles,
  RolesGuard,
  CurrentUser,
  UserContext,
  EndpointRateLimit,
  ENDPOINT_RATE_LIMITS,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('evidence')
@ApiBearerAuth()
@Controller('api/evidence')
@UseGuards(DevAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @ApiOperation({ summary: 'List all evidence' })
  @ApiResponse({ status: 200, description: 'Returns paginated evidence list' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: EvidenceFilterDto,
  ) {
    return this.evidenceService.findAll(user.organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get evidence statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.evidenceService.getStats(user.organizationId);
  }

  @Get('folders')
  @ApiOperation({ summary: 'List folders' })
  async getFolders(
    @CurrentUser() user: UserContext,
    @Query('parentId') parentId?: string,
  ) {
    return this.evidenceService.getFolders(user.organizationId, parentId);
  }

  @Post('folders')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a folder' })
  async createFolder(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateFolderDto,
  ) {
    return this.evidenceService.createFolder(
      user.organizationId,
      user.userId,
      dto.name,
      dto.parentId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence by ID' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.evidenceService.findOne(id, user.organizationId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for evidence' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.evidenceService.getDownloadUrl(id, user.organizationId);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Stream file content for preview' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async preview(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Res() res: Response,
  ) {
    const { stream, mimeType, filename } = await this.evidenceService.getFileStream(id, user.organizationId);
    res.set({
      'Content-Type': mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    stream.pipe(res);
  }

  @Post()
  @Roles('admin', 'compliance_manager')
  @EndpointRateLimit(ENDPOINT_RATE_LIMITS.FILE_UPLOAD)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload evidence' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' },
        category: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        validFrom: { type: 'string', format: 'date-time' },
        validUntil: { type: 'string', format: 'date-time' },
        controlIds: { type: 'array', items: { type: 'string' } },
        folderId: { type: 'string' },
      },
    },
  })
  async upload(
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadEvidenceDto,
  ) {
    return this.evidenceService.upload(
      user.organizationId,
      user.userId,
      file,
      dto,
    );
  }

  @Put(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update evidence' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateEvidenceDto,
  ) {
    return this.evidenceService.update(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Delete(':id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete evidence' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.evidenceService.delete(id, user.organizationId);
  }

  @Post(':id/review')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Review evidence' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async review(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: ReviewEvidenceDto,
  ) {
    return this.evidenceService.review(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post(':id/link')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Link evidence to controls' })
  @ApiParam({ name: 'id', description: 'Evidence ID' })
  async linkToControls(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: LinkEvidenceDto,
  ) {
    return this.evidenceService.linkToControls(
      id,
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Delete(':id/link/:controlId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Unlink evidence from control' })
  async unlinkFromControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.evidenceService.unlinkFromControl(
      id,
      controlId,
      user.organizationId,
    );
  }
}

