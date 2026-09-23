import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FieldGuideService } from './fieldguide.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { Roles, RolesGuard } from '@gigachad-grc/shared';
import {
  FieldGuideConnectDto,
  FieldGuideConnectionStatusDto,
  TriggerSyncDto,
  SyncResultDto,
  SyncHistoryItemDto,
  FieldGuideAuditMappingDto,
  LinkAuditDto,
  FieldGuideWebhookPayloadDto,
} from './dto/fieldguide.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

@ApiTags('FieldGuide Integration')
@Controller('api/fieldguide')
export class FieldGuideController {
  constructor(private readonly fieldGuideService: FieldGuideService) {}

  // ============================================
  // Connection Management
  // ============================================

  @Post('connect')
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect to FieldGuide' })
  @ApiResponse({
    status: 201,
    description: 'Successfully connected',
    type: FieldGuideConnectionStatusDto,
  })
  @ApiBody({ type: FieldGuideConnectDto })
  async connect(
    @Request() req: AuthenticatedRequest,
    @Body() dto: FieldGuideConnectDto
  ): Promise<FieldGuideConnectionStatusDto> {
    return this.fieldGuideService.connect(req.user.organizationId, dto);
  }

  @Post('disconnect')
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect from FieldGuide' })
  @ApiResponse({ status: 204, description: 'Successfully disconnected' })
  async disconnect(@Request() req: AuthenticatedRequest): Promise<void> {
    return this.fieldGuideService.disconnect(req.user.organizationId);
  }

  @Get('status')
  @UseGuards(DevAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get FieldGuide connection status' })
  @ApiResponse({
    status: 200,
    description: 'Connection status',
    type: FieldGuideConnectionStatusDto,
  })
  async getStatus(@Request() req: AuthenticatedRequest): Promise<FieldGuideConnectionStatusDto> {
    return this.fieldGuideService.getConnectionStatus(req.user.organizationId);
  }

  // ============================================
  // Sync Operations
  // ============================================

  @Post('sync')
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger synchronization with FieldGuide' })
  @ApiResponse({ status: 200, description: 'Sync result', type: SyncResultDto })
  @ApiBody({ type: TriggerSyncDto })
  async triggerSync(
    @Request() req: AuthenticatedRequest,
    @Body() dto: TriggerSyncDto
  ): Promise<SyncResultDto> {
    return this.fieldGuideService.triggerSync(req.user.organizationId, dto);
  }

  @Get('sync/history')
  @UseGuards(DevAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sync history' })
  @ApiResponse({ status: 200, description: 'Sync history', type: [SyncHistoryItemDto] })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return',
  })
  async getSyncHistory(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: number
  ): Promise<SyncHistoryItemDto[]> {
    return this.fieldGuideService.getSyncHistory(req.user.organizationId, limit);
  }

  // ============================================
  // Audit Mapping
  // ============================================

  @Get('mappings')
  @UseGuards(DevAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get audit mappings between GRC and FieldGuide' })
  @ApiResponse({ status: 200, description: 'Audit mappings', type: [FieldGuideAuditMappingDto] })
  async getAuditMappings(
    @Request() req: AuthenticatedRequest
  ): Promise<FieldGuideAuditMappingDto[]> {
    return this.fieldGuideService.getAuditMappings(req.user.organizationId);
  }

  @Post('mappings')
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a GRC audit to a FieldGuide audit' })
  @ApiResponse({ status: 201, description: 'Audit linked', type: FieldGuideAuditMappingDto })
  @ApiBody({ type: LinkAuditDto })
  async linkAudit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: LinkAuditDto
  ): Promise<FieldGuideAuditMappingDto> {
    return this.fieldGuideService.linkAudit(req.user.organizationId, dto);
  }

  @Delete('mappings/:auditId')
  @UseGuards(DevAuthGuard, RolesGuard)
  @Roles('admin', 'compliance_manager', 'auditor')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink an audit from FieldGuide' })
  @ApiResponse({ status: 204, description: 'Audit unlinked' })
  async unlinkAudit(
    @Request() req: AuthenticatedRequest,
    @Param('auditId') auditId: string
  ): Promise<void> {
    return this.fieldGuideService.unlinkAudit(req.user.organizationId, auditId);
  }

  // ============================================
  // Webhook Endpoint
  // ============================================

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive webhooks from FieldGuide' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  @ApiBody({ type: FieldGuideWebhookPayloadDto })
  async processWebhook(
    @Query('orgId') organizationId: string,
    @Body() payload: FieldGuideWebhookPayloadDto,
    @Request() req: RawBodyRequest<Request>
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody?.toString() || JSON.stringify(payload);
    await this.fieldGuideService.processWebhook(organizationId, payload, rawBody);
    return { received: true };
  }
}
