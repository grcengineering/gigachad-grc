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
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CustomIntegrationService } from './custom/custom-integration.service';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  IntegrationFilterDto,
} from './dto/integration.dto';
import { SaveCustomConfigDto, TestEndpointDto } from './custom/dto/custom-config.dto';
import { Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('api/integrations')
@UseGuards(DevAuthGuard, RolesGuard)
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly customIntegrationService: CustomIntegrationService,
  ) {}

  @Roles('admin', 'compliance_manager')
  @Get()
  @ApiOperation({ summary: 'List all integrations' })
  findAll(@Req() req: AuthenticatedRequest, @Query() filters: IntegrationFilterDto) {
    return this.integrationsService.findAll(req.user.organizationId, filters);
  }

  @Roles('admin', 'compliance_manager')
  @Get('stats')
  @ApiOperation({ summary: 'Get integration statistics' })
  getStats(@Req() req: AuthenticatedRequest) {
    return this.integrationsService.getStats(req.user.organizationId);
  }

  @Roles('admin', 'compliance_manager')
  @Get('types')
  @ApiOperation({ summary: 'Get available integration types and their configuration' })
  getTypes() {
    return this.integrationsService.getTypeMetadata();
  }

  @Roles('admin', 'compliance_manager')
  @Get(':id')
  @ApiOperation({ summary: 'Get integration details' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.integrationsService.findOne(id, req.user.organizationId);
  }

  @Roles('admin', 'compliance_manager')
  @Post()
  @ApiOperation({ summary: 'Create a new integration' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(
      req.user.organizationId,
      req.user.userId,
      dto
    );
  }

  @Roles('admin', 'compliance_manager')
  @Put(':id')
  @ApiOperation({ summary: 'Update an integration' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIntegrationDto
  ) {
    return this.integrationsService.update(
      id,
      req.user.organizationId,
      req.user.userId,
      dto
    );
  }

  @Roles('admin', 'compliance_manager')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an integration' })
  delete(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.integrationsService.delete(id, req.user.organizationId);
  }

  @Roles('admin', 'compliance_manager')
  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  testConnection(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.integrationsService.testConnection(id, req.user.organizationId);
  }

  @Roles('admin', 'compliance_manager')
  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger a manual sync' })
  triggerSync(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.integrationsService.triggerSync(
      id,
      req.user.organizationId,
      req.user.userId
    );
  }

  // ============================================
  // Custom Integration Configuration Endpoints
  // ============================================

  @Roles('admin', 'compliance_manager')
  @Get(':id/custom-config')
  @ApiOperation({ summary: 'Get custom integration configuration' })
  getCustomConfig(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.customIntegrationService.getConfig(id, req.user.organizationId);
  }

  @Roles('admin', 'compliance_manager')
  @Put(':id/custom-config')
  @ApiOperation({ summary: 'Save custom integration configuration' })
  saveCustomConfig(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveCustomConfigDto,
  ) {
    return this.customIntegrationService.saveConfig(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Roles('admin', 'compliance_manager')
  @Post(':id/custom-config/test')
  @ApiOperation({ summary: 'Test custom integration endpoint' })
  testCustomEndpoint(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestEndpointDto,
  ) {
    return this.customIntegrationService.testEndpoint(
      id,
      req.user.organizationId,
      req.user.userId,
      dto,
    );
  }

  @Roles('admin', 'compliance_manager')
  @Post(':id/custom-config/validate')
  @ApiOperation({ summary: 'Validate custom code syntax' })
  validateCustomCode(@Body() dto: { code: string }) {
    return this.customIntegrationService.validateCode(dto.code);
  }

  @Roles('admin', 'compliance_manager')
  @Get('custom/template')
  @ApiOperation({ summary: 'Get default code template' })
  getCodeTemplate() {
    return { template: this.customIntegrationService.getCodeTemplate() };
  }

  @Roles('admin', 'compliance_manager')
  @Post(':id/custom-sync')
  @ApiOperation({ summary: 'Execute custom integration sync' })
  executeCustomSync(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.customIntegrationService.executeSync(
      id,
      req.user.organizationId,
      req.user.userId,
    );
  }
}

