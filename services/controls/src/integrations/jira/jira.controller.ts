 
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
import { JiraService } from './jira.service';
import {
  JiraOAuthConfigDto,
  JiraConnectionResponseDto,
  CreateJiraProjectMappingDto,
  JiraProjectMappingResponseDto,
  JiraSyncResultDto,
  CreateJiraIssueDto,
  JiraIssueResponseDto,
  JiraProjectDto,
  JiraIssueTypeDto,
  GrcEntityType,
} from './dto/jira.dto';
import {
  CurrentUser,
  UserContext,
  Roles,
  RolesGuard,
} from '@gigachad-grc/shared';
import { DevAuthGuard } from '../../auth/dev-auth.guard';

@ApiTags('Integrations - Jira')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Controller('api/integrations/jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('connection')
  @ApiOperation({ summary: 'Get current Jira connection status' })
  @ApiResponse({ status: 200, type: JiraConnectionResponseDto })
  async getConnection(
    @CurrentUser() user: UserContext,
  ): Promise<JiraConnectionResponseDto | null> {
    return this.jiraService.getConnection(user.organizationId);
  }

  @Post('connect')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Connect to Jira instance' })
  @ApiResponse({ status: 201, type: JiraConnectionResponseDto })
  async connect(
    @CurrentUser() user: UserContext,
    @Body() dto: JiraOAuthConfigDto,
  ): Promise<JiraConnectionResponseDto> {
    return this.jiraService.connect(user.organizationId, dto);
  }

  @Post('disconnect')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Disconnect from Jira' })
  @ApiResponse({ status: 200 })
  async disconnect(@CurrentUser() user: UserContext): Promise<void> {
    return this.jiraService.disconnect(user.organizationId);
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
    return this.jiraService.getOAuthUrl(user.organizationId, redirectUri);
  }

  @Post('oauth/callback')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'redirectUri', required: true })
  @ApiResponse({ status: 200, type: JiraConnectionResponseDto })
  async handleOAuthCallback(
    @CurrentUser() user: UserContext,
    @Query('code') code: string,
    @Query('redirectUri') redirectUri: string,
  ): Promise<JiraConnectionResponseDto> {
    return this.jiraService.handleOAuthCallback(
      user.organizationId,
      code,
      redirectUri,
    );
  }

  @Get('mappings')
  @ApiOperation({ summary: 'List all project mappings' })
  @ApiResponse({ status: 200, type: [JiraProjectMappingResponseDto] })
  async listMappings(
    @CurrentUser() user: UserContext,
  ): Promise<JiraProjectMappingResponseDto[]> {
    return this.jiraService.listProjectMappings(user.organizationId);
  }

  @Post('mappings')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create a project mapping' })
  @ApiResponse({ status: 201, type: JiraProjectMappingResponseDto })
  async createMapping(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateJiraProjectMappingDto,
  ): Promise<JiraProjectMappingResponseDto> {
    return this.jiraService.createProjectMapping(user.organizationId, dto);
  }

  @Delete('mappings/:id')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Delete a project mapping' })
  @ApiResponse({ status: 200 })
  async deleteMapping(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
  ): Promise<void> {
    return this.jiraService.deleteProjectMapping(user.organizationId, id);
  }

  @Post('sync/:mappingId')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Trigger sync for a mapping' })
  @ApiResponse({ status: 200, type: JiraSyncResultDto })
  async syncNow(
    @CurrentUser() user: UserContext,
    @Param('mappingId') mappingId: string,
  ): Promise<JiraSyncResultDto> {
    return this.jiraService.syncNow(user.organizationId, mappingId);
  }

  @Post('issues')
  @ApiOperation({ summary: 'Create a Jira issue from GRC entity' })
  @ApiResponse({ status: 201, type: JiraIssueResponseDto })
  async createIssue(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateJiraIssueDto,
  ): Promise<JiraIssueResponseDto> {
    return this.jiraService.createJiraIssue(user.organizationId, dto);
  }

  @Get('issues')
  @ApiOperation({ summary: 'Get linked Jira issues for a GRC entity' })
  @ApiQuery({ name: 'entityType', enum: GrcEntityType, required: true })
  @ApiQuery({ name: 'entityId', required: true })
  @ApiResponse({ status: 200, type: [JiraIssueResponseDto] })
  async getLinkedIssues(
    @CurrentUser() user: UserContext,
    @Query('entityType') entityType: GrcEntityType,
    @Query('entityId') entityId: string,
  ): Promise<JiraIssueResponseDto[]> {
    return this.jiraService.getLinkedIssues(
      user.organizationId,
      entityType,
      entityId,
    );
  }

  @Get('projects')
  @ApiOperation({ summary: 'List available Jira projects' })
  @ApiResponse({ status: 200, type: [JiraProjectDto] })
  async listProjects(
    @CurrentUser() user: UserContext,
  ): Promise<JiraProjectDto[]> {
    return this.jiraService.listJiraProjects(user.organizationId);
  }

  @Get('projects/:projectKey/issue-types')
  @ApiOperation({ summary: 'List issue types for a Jira project' })
  @ApiResponse({ status: 200, type: [JiraIssueTypeDto] })
  async listIssueTypes(
    @CurrentUser() user: UserContext,
    @Param('projectKey') projectKey: string,
  ): Promise<JiraIssueTypeDto[]> {
    return this.jiraService.listJiraIssueTypes(
      user.organizationId,
      projectKey,
    );
  }
}
