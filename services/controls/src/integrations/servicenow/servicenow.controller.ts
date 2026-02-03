 
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ServiceNowService } from './servicenow.service';
import {
  ServiceNowConnectionConfigDto,
  ServiceNowConnectionResponseDto,
  CreateTableMappingDto,
  TableMappingResponseDto,
  SyncResultDto,
  CreateRecordDto,
  RecordLinkResponseDto,
  ServiceNowTableDto,
  AssignmentGroupDto,
  GrcEntityType,
} from './dto/servicenow.dto';
import {
  CurrentUser,
  UserContext,
  Roles,
  RolesGuard,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../../auth/dev-auth.guard';

@ApiTags('Integrations - ServiceNow')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/integrations/servicenow')
export class ServiceNowController {
  constructor(private readonly serviceNowService: ServiceNowService) {}

  @Get('connection')
  @ApiOperation({ summary: 'Get current ServiceNow connection status' })
  @ApiResponse({ status: 200, type: ServiceNowConnectionResponseDto })
  async getConnection(
    @CurrentUser() user: UserContext,
  ): Promise<ServiceNowConnectionResponseDto | null> {
    return this.serviceNowService.getConnection(user.organizationId);
  }

  @Post('connect')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Connect to ServiceNow instance' })
  @ApiResponse({ status: 201, type: ServiceNowConnectionResponseDto })
  async connect(
    @CurrentUser() user: UserContext,
    @Body() dto: ServiceNowConnectionConfigDto,
  ): Promise<ServiceNowConnectionResponseDto> {
    return this.serviceNowService.connect(user.organizationId, dto);
  }

  @Post('disconnect')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Disconnect from ServiceNow' })
  @ApiResponse({ status: 200 })
  async disconnect(@CurrentUser() user: UserContext): Promise<void> {
    return this.serviceNowService.disconnect(user.organizationId);
  }

  @Get('oauth/url')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Get OAuth authorization URL' })
  @ApiQuery({ name: 'redirectUri', required: true })
  @ApiResponse({ status: 200, type: String })
  async getOAuthUrl(
    @CurrentUser() user: UserContext,
    @Query('redirectUri') redirectUri: string,
  ): Promise<string> {
    return this.serviceNowService.getOAuthUrl(user.organizationId, redirectUri);
  }

  @Post('oauth/callback')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'redirectUri', required: true })
  @ApiResponse({ status: 200, type: ServiceNowConnectionResponseDto })
  async handleOAuthCallback(
    @CurrentUser() user: UserContext,
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
  ): Promise<ServiceNowConnectionResponseDto> {
    return this.serviceNowService.handleOAuthCallback(
      user.organizationId,
      code,
      redirectUri,
    );
  }

  @Get('mappings')
  @ApiOperation({ summary: 'List all table mappings' })
  @ApiResponse({ status: 200, type: [TableMappingResponseDto] })
  async listMappings(
    @CurrentUser() user: UserContext,
  ): Promise<TableMappingResponseDto[]> {
    return this.serviceNowService.listTableMappings(user.organizationId);
  }

  @Post('mappings')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a table mapping' })
  @ApiResponse({ status: 201, type: TableMappingResponseDto })
  async createMapping(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateTableMappingDto,
  ): Promise<TableMappingResponseDto> {
    return this.serviceNowService.createTableMapping(user.organizationId, dto);
  }

  @Delete('mappings/:id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete a table mapping' })
  @ApiResponse({ status: 200 })
  async deleteMapping(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.serviceNowService.deleteTableMapping(user.organizationId, id);
  }

  @Post('sync/:mappingId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Trigger sync for a mapping' })
  @ApiResponse({ status: 200, type: SyncResultDto })
  async syncNow(
    @CurrentUser() user: UserContext,
    @Param('mappingId') mappingId: string,
  ): Promise<SyncResultDto> {
    return this.serviceNowService.syncNow(user.organizationId, mappingId);
  }

  @Post('records')
  @ApiOperation({ summary: 'Create a ServiceNow record from GRC entity' })
  @ApiResponse({ status: 201, type: RecordLinkResponseDto })
  async createRecord(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateRecordDto,
  ): Promise<RecordLinkResponseDto> {
    return this.serviceNowService.createRecord(user.organizationId, dto);
  }

  @Get('records')
  @ApiOperation({ summary: 'Get linked ServiceNow records for a GRC entity' })
  @ApiQuery({ name: 'entityType', enum: GrcEntityType, required: true })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiResponse({ status: 200, type: [RecordLinkResponseDto] })
  async getLinkedRecords(
    @CurrentUser() user: UserContext,
    @Query('entityType') entityType: GrcEntityType,
    @Query('entityId') entityId: string,
  ): Promise<RecordLinkResponseDto[]> {
    return this.serviceNowService.getLinkedRecords(
      user.organizationId,
      entityType,
      entityId,
    );
  }

  @Get('tables')
  @ApiOperation({ summary: 'List available ServiceNow tables' })
  @ApiResponse({ status: 200, type: [ServiceNowTableDto] })
  async listTables(@CurrentUser() user: UserContext): Promise<ServiceNowTableDto[]> {
    return this.serviceNowService.listTables(user.organizationId);
  }

  @Get('assignment-groups')
  @ApiOperation({ summary: 'List ServiceNow assignment groups' })
  @ApiResponse({ status: 200, type: [AssignmentGroupDto] })
  async listAssignmentGroups(
    @CurrentUser() user: UserContext,
  ): Promise<AssignmentGroupDto[]> {
    return this.serviceNowService.listAssignmentGroups(user.organizationId);
  }
}
