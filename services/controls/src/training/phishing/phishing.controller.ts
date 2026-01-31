import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PhishingService } from './phishing.service';
import { DevAuthGuard } from '../../auth/dev-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../../permissions/dto/permission.dto';
import {
  CreatePhishingTemplateDto,
  PhishingTemplateDto,
  CreateCampaignDto,
  CampaignDto,
  CampaignResultsDto,
  ReportPhishingDto,
} from './dto/phishing.dto';

@ApiTags('Phishing Simulations')
@Controller('api/phishing')
export class PhishingController {
  constructor(private readonly phishingService: PhishingService) {}

  // ============================================
  // Template Endpoints
  // ============================================

  @Get('templates')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all phishing templates' })
  @ApiResponse({ status: 200, description: 'List of templates', type: [PhishingTemplateDto] })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getTemplates(@Req() req: AuthenticatedRequest): Promise<PhishingTemplateDto[]> {
    return this.phishingService.getTemplates(req.user.organizationId);
  }

  @Get('templates/:id')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<PhishingTemplateDto | null> {
    return this.phishingService.getTemplate(req.user.organizationId, id);
  }

  @Post('templates')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a custom phishing template' })
  @ApiBody({ type: CreatePhishingTemplateDto })
  @ApiResponse({ status: 201, description: 'Template created', type: PhishingTemplateDto })
  @RequirePermission(Resource.SETTINGS, Action.CREATE)
  async createTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePhishingTemplateDto
  ): Promise<PhishingTemplateDto> {
    return this.phishingService.createTemplate(req.user.organizationId, dto);
  }

  @Put('templates/:id')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a custom template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async updateTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePhishingTemplateDto>
  ): Promise<PhishingTemplateDto> {
    return this.phishingService.updateTemplate(req.user.organizationId, id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @RequirePermission(Resource.SETTINGS, Action.DELETE)
  async deleteTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<void> {
    return this.phishingService.deleteTemplate(req.user.organizationId, id);
  }

  // ============================================
  // Campaign Endpoints
  // ============================================

  @Get('campaigns')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all phishing campaigns' })
  @ApiResponse({ status: 200, description: 'List of campaigns', type: [CampaignDto] })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getCampaigns(@Req() req: AuthenticatedRequest): Promise<CampaignDto[]> {
    return this.phishingService.getCampaigns(req.user.organizationId);
  }

  @Get('campaigns/:id')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<Record<string, unknown> | null> {
    const campaign = await this.phishingService.getCampaign(req.user.organizationId, id);
    return campaign;
  }

  @Post('campaigns')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new phishing campaign' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaign created', type: CampaignDto })
  @RequirePermission(Resource.SETTINGS, Action.CREATE)
  async createCampaign(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCampaignDto
  ): Promise<CampaignDto> {
    return this.phishingService.createCampaign(req.user.organizationId, dto);
  }

  @Post('campaigns/:id/start')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async startCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<CampaignDto> {
    return this.phishingService.startCampaign(req.user.organizationId, id);
  }

  @Post('campaigns/:id/pause')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async pauseCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<CampaignDto> {
    return this.phishingService.pauseCampaign(req.user.organizationId, id);
  }

  @Post('campaigns/:id/complete')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async completeCampaign(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<CampaignDto> {
    return this.phishingService.completeCampaign(req.user.organizationId, id);
  }

  @Get('campaigns/:id/results')
  @UseGuards(DevAuthGuard, PermissionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign results and analytics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign results', type: CampaignResultsDto })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getCampaignResults(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<CampaignResultsDto> {
    return this.phishingService.getCampaignResults(req.user.organizationId, id);
  }

  // ============================================
  // Tracking Endpoints (Public - No Auth)
  // ============================================

  @Get('track/open')
  @ApiOperation({ summary: 'Track email open (tracking pixel)' })
  @ApiQuery({ name: 't', description: 'Tracking token' })
  async trackOpen(
    @Query('t') token: string,
    @Res() res: Response
  ): Promise<void> {
    await this.phishingService.trackOpen(token).catch(() => {});
    
    // Return a 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pixel);
  }

  @Get('track/click')
  @ApiOperation({ summary: 'Track link click and redirect to landing page' })
  @ApiQuery({ name: 't', description: 'Tracking token' })
  async trackClick(
    @Query('t') token: string,
    @Res() res: Response
  ): Promise<void> {
    await this.phishingService.trackClick(token).catch(() => {});
    
    // Redirect to landing page or training page
    res.redirect('/training/phishing-awareness?t=' + token);
  }

  @Post('track/credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track credentials entered on landing page' })
  async trackCredentials(
    @Body() body: { token: string }
  ): Promise<{ message: string }> {
    await this.phishingService.trackCredentialsEntered(body.token).catch(() => {});
    return { message: 'This was a phishing simulation. Please complete the security training.' };
  }

  @Post('report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a phishing email' })
  @ApiBody({ type: ReportPhishingDto })
  async reportPhishing(
    @Body() dto: ReportPhishingDto
  ): Promise<{ success: boolean; message: string }> {
    return this.phishingService.reportPhishing(dto);
  }
}

