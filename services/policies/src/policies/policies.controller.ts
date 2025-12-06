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
  StreamableFile,
} from '@nestjs/common';
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
import { PoliciesService } from './policies.service';
import {
  UploadPolicyDto,
  UpdatePolicyDto,
  UpdatePolicyStatusDto,
  PolicyFilterDto,
} from './dto/policy.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { Response } from 'express';

@ApiTags('policies')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('api/policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List all policies' })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of policies' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() filters: PolicyFilterDto,
  ) {
    return this.policiesService.findAll(user.organizationId, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get policy statistics' })
  async getStats(@CurrentUser() user: UserContext) {
    return this.policiesService.getStats(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get policy by ID' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.policiesService.findOne(id, user.organizationId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.policiesService.getDownloadUrl(id, user.organizationId);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Stream policy file for preview' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async streamPreview(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, mimetype, filename } = await this.policiesService.streamFile(
      id,
      user.organizationId,
    );
    res.set({
      'Content-Type': mimetype,
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new policy' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        version: { type: 'string' },
        ownerId: { type: 'string' },
        effectiveDate: { type: 'string', format: 'date' },
        nextReviewDate: { type: 'string', format: 'date' },
        tags: { type: 'array', items: { type: 'string' } },
        controlIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['file', 'title', 'category'],
    },
  })
  async upload(
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadPolicyDto,
  ) {
    return this.policiesService.upload(user.organizationId, user.userId, file, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update policy metadata' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdatePolicyDto,
  ) {
    return this.policiesService.update(id, user.organizationId, user.userId, dto);
  }

  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new version of the policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        versionNumber: { type: 'string' },
        changeNotes: { type: 'string' },
      },
      required: ['file', 'versionNumber'],
    },
  })
  async uploadNewVersion(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @UploadedFile() file: Express.Multer.File,
    @Body('versionNumber') versionNumber: string,
    @Body('changeNotes') changeNotes?: string,
  ) {
    return this.policiesService.uploadNewVersion(
      id,
      user.organizationId,
      user.userId,
      file,
      versionNumber,
      changeNotes,
    );
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update policy status (workflow)' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() dto: UpdatePolicyStatusDto,
  ) {
    return this.policiesService.updateStatus(id, user.organizationId, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a policy' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async delete(@Param('id') id: string, @CurrentUser() user: UserContext) {
    return this.policiesService.delete(id, user.organizationId);
  }

  @Post(':id/link')
  @ApiOperation({ summary: 'Link policy to controls' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  async linkToControls(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body('controlIds') controlIds: string[],
  ) {
    return this.policiesService.linkToControls(id, user.organizationId, user.userId, controlIds);
  }

  @Delete(':id/link/:controlId')
  @ApiOperation({ summary: 'Unlink policy from control' })
  @ApiParam({ name: 'id', description: 'Policy ID' })
  @ApiParam({ name: 'controlId', description: 'Control ID' })
  async unlinkFromControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.policiesService.unlinkFromControl(id, controlId, user.organizationId);
  }
}



