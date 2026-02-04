/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt, decrypt } from '@gigachad-grc/shared';
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
  JiraSyncDirection,
  GrcEntityType,
} from './dto/jira.dto';

interface _JiraApiResponse<T> {
  data?: T;
  error?: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Connection Management
  // ===========================================

  async connect(
    organizationId: string,
    dto: JiraOAuthConfigDto
  ): Promise<JiraConnectionResponseDto> {
    // Validate connection by making a test API call
    const testResult = await this.testConnection(dto);

    if (!testResult.success) {
      throw new BadRequestException(`Connection failed: ${testResult.error}`);
    }

    // Store connection with encrypted credentials
    const encryptedCredentials = {
      clientId: dto.clientId,
      clientSecret: dto.clientSecret ? encrypt(dto.clientSecret) : undefined,
      apiToken: dto.apiToken ? encrypt(dto.apiToken) : undefined,
      userEmail: dto.userEmail,
    };

    const connection = await this.prisma.jiraConnection.upsert({
      where: { organizationId },
      create: {
        organizationId,
        instanceUrl: dto.instanceUrl,
        credentials: JSON.stringify(encryptedCredentials),
        isConnected: true,
        connectedAt: new Date(),
      },
      update: {
        instanceUrl: dto.instanceUrl,
        credentials: JSON.stringify(encryptedCredentials),
        isConnected: true,
        connectedAt: new Date(),
        connectionError: null,
      },
    });

    this.logger.log(`Jira connected for org ${organizationId}`);

    return this.toConnectionResponse(connection);
  }

  async disconnect(organizationId: string): Promise<void> {
    await this.prisma.jiraConnection.update({
      where: { organizationId },
      data: {
        isConnected: false,
        credentials: null,
      },
    });

    this.logger.log(`Jira disconnected for org ${organizationId}`);
  }

  async getConnection(organizationId: string): Promise<JiraConnectionResponseDto | null> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    return connection ? this.toConnectionResponse(connection) : null;
  }

  async getOAuthUrl(organizationId: string, redirectUri: string): Promise<string> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('Jira connection not configured');
    }

    const credentials = this.decryptCredentials(connection.credentials);

    // Atlassian OAuth 2.0 authorization URL
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: credentials.clientId,
      scope: 'read:jira-work write:jira-work read:jira-user offline_access',
      redirect_uri: redirectUri,
      response_type: 'code',
      prompt: 'consent',
      state: organizationId,
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(
    organizationId: string,
    code: string,
    redirectUri: string
  ): Promise<JiraConnectionResponseDto> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('Jira connection not configured');
    }

    const credentials = this.decryptCredentials(connection.credentials);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to exchange OAuth code');
    }

    const tokens = await tokenResponse.json();

    // Store encrypted tokens
    const updated = await this.prisma.jiraConnection.update({
      where: { organizationId },
      data: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isConnected: true,
        connectedAt: new Date(),
      },
    });

    this.logger.log(`Jira OAuth completed for org ${organizationId}`);

    return this.toConnectionResponse(updated);
  }

  // ===========================================
  // Project Mappings
  // ===========================================

  async createProjectMapping(
    organizationId: string,
    dto: CreateJiraProjectMappingDto
  ): Promise<JiraProjectMappingResponseDto> {
    await this.ensureConnected(organizationId);

    // Verify project exists in Jira
    const project = await this.getJiraProject(organizationId, dto.jiraProjectKey);

    const mapping = await this.prisma.jiraProjectMapping.create({
      data: {
        organizationId,
        jiraProjectKey: dto.jiraProjectKey,
        jiraProjectName: project.name,
        grcEntityType: dto.grcEntityType,
        jiraIssueType: dto.jiraIssueType,
        syncDirection: dto.syncDirection,
        fieldMappings: dto.fieldMappings as any,
        statusMappings: dto.statusMappings as any,
        autoCreate: dto.autoCreate ?? false,
        autoSyncStatus: dto.autoSyncStatus ?? true,
        syncComments: dto.syncComments ?? false,
        syncAttachments: dto.syncAttachments ?? false,
        jqlFilter: dto.jqlFilter,
        isEnabled: true,
      },
    });

    this.logger.log(`Created Jira mapping: ${dto.jiraProjectKey} <-> ${dto.grcEntityType}`);

    return this.toMappingResponse(mapping);
  }

  async listProjectMappings(organizationId: string): Promise<JiraProjectMappingResponseDto[]> {
    const mappings = await this.prisma.jiraProjectMapping.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map((m) => this.toMappingResponse(m));
  }

  async deleteProjectMapping(organizationId: string, id: string): Promise<void> {
    const mapping = await this.prisma.jiraProjectMapping.findFirst({
      where: { id, organizationId },
    });

    if (!mapping) {
      throw new NotFoundException('Project mapping not found');
    }

    await this.prisma.jiraProjectMapping.delete({ where: { id } });
  }

  // ===========================================
  // Issue Sync
  // ===========================================

  async syncNow(organizationId: string, mappingId: string): Promise<JiraSyncResultDto> {
    const mapping = await this.prisma.jiraProjectMapping.findFirst({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      throw new NotFoundException('Project mapping not found');
    }

    const startTime = Date.now();
    const result: JiraSyncResultDto = {
      mappingId,
      direction: mapping.syncDirection as JiraSyncDirection,
      issuesCreated: 0,
      issuesUpdated: 0,
      issuesFailed: 0,
      errors: [],
      duration: 0,
      syncedAt: new Date(),
    };

    try {
      const syncDirection = mapping.syncDirection as JiraSyncDirection;

      // Sync GRC -> Jira
      if (
        syncDirection === JiraSyncDirection.GRC_TO_JIRA ||
        syncDirection === JiraSyncDirection.BIDIRECTIONAL
      ) {
        const grcResult = await this.syncGrcToJira(organizationId, mapping);
        result.issuesCreated += grcResult.created;
        result.issuesUpdated += grcResult.updated;
        result.issuesFailed += grcResult.failed;
        if (grcResult.errors?.length) {
          result.errors?.push(...grcResult.errors);
        }
      }

      // Sync Jira -> GRC
      if (
        syncDirection === JiraSyncDirection.JIRA_TO_GRC ||
        syncDirection === JiraSyncDirection.BIDIRECTIONAL
      ) {
        const jiraResult = await this.syncJiraToGrc(organizationId, mapping);
        result.issuesUpdated += jiraResult.updated;
        result.issuesFailed += jiraResult.failed;
        if (jiraResult.errors?.length) {
          result.errors?.push(...jiraResult.errors);
        }
      }

      // Update last sync time
      await this.prisma.jiraProjectMapping.update({
        where: { id: mappingId },
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      result.errors?.push(error.message);
      result.issuesFailed++;
    }

    result.duration = Date.now() - startTime;

    this.logger.log(
      `Jira sync completed: ${result.issuesCreated} created, ${result.issuesUpdated} updated`
    );

    return result;
  }

  async createJiraIssue(
    organizationId: string,
    dto: CreateJiraIssueDto
  ): Promise<JiraIssueResponseDto> {
    await this.ensureConnected(organizationId);

    // Get mapping
    let mapping;
    if (dto.mappingId) {
      mapping = await this.prisma.jiraProjectMapping.findFirst({
        where: { id: dto.mappingId, organizationId },
      });
    } else {
      mapping = await this.prisma.jiraProjectMapping.findFirst({
        where: { organizationId, grcEntityType: dto.entityType, isEnabled: true },
      });
    }

    if (!mapping) {
      throw new NotFoundException('No project mapping found for this entity type');
    }

    // Get GRC entity data
    const entityData = await this.getGrcEntityData(organizationId, dto.entityType, dto.entityId);

    // Build Jira issue
    const jiraIssue = this.buildJiraIssue(mapping, entityData, dto.additionalFields);

    // Create in Jira
    const created = await this.createJiraIssueApi(organizationId, jiraIssue);

    // Store link
    const issueLink = await this.prisma.jiraIssueLink.create({
      data: {
        organizationId,
        mappingId: mapping.id,
        jiraKey: created.key,
        jiraId: created.id,
        jiraUrl: `${await this.getInstanceUrl(organizationId)}/browse/${created.key}`,
        grcEntityType: dto.entityType,
        grcEntityId: dto.entityId,
        lastSyncedAt: new Date(),
      },
    });

    return {
      id: issueLink.id,
      jiraKey: created.key,
      jiraUrl: issueLink.jiraUrl,
      summary: entityData.title || entityData.name,
      status: created.fields?.status?.name,
      grcEntityType: dto.entityType,
      grcEntityId: dto.entityId,
      lastSyncedAt: issueLink.lastSyncedAt,
      createdAt: issueLink.createdAt,
    };
  }

  async getLinkedIssues(
    organizationId: string,
    entityType: GrcEntityType,
    entityId: string
  ): Promise<JiraIssueResponseDto[]> {
    const links = await this.prisma.jiraIssueLink.findMany({
      where: { organizationId, grcEntityType: entityType, grcEntityId: entityId },
    });

    return links.map((l) => ({
      id: l.id,
      jiraKey: l.jiraKey,
      jiraUrl: l.jiraUrl,
      summary: '',
      grcEntityType: l.grcEntityType as GrcEntityType,
      grcEntityId: l.grcEntityId,
      lastSyncedAt: l.lastSyncedAt,
      createdAt: l.createdAt,
    }));
  }

  // ===========================================
  // Jira API Helpers
  // ===========================================

  async listJiraProjects(organizationId: string): Promise<JiraProjectDto[]> {
    await this.ensureConnected(organizationId);

    const response = await this.jiraApiRequest(organizationId, 'GET', '/rest/api/3/project');

    return (response || []).map((p: any) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.['48x48'],
    }));
  }

  async listJiraIssueTypes(
    organizationId: string,
    projectKey: string
  ): Promise<JiraIssueTypeDto[]> {
    await this.ensureConnected(organizationId);

    const response = await this.jiraApiRequest(
      organizationId,
      'GET',
      `/rest/api/3/project/${projectKey}`
    );

    return (response?.issueTypes || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      iconUrl: t.iconUrl,
    }));
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private async ensureConnected(organizationId: string): Promise<void> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    if (!connection?.isConnected) {
      throw new UnauthorizedException('Jira is not connected');
    }

    // Check token expiry and refresh if needed
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
      await this.refreshAccessToken(organizationId);
    }
  }

  private async refreshAccessToken(organizationId: string): Promise<void> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    if (!connection?.refreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    const credentials = this.decryptCredentials(connection.credentials);
    // Decrypt the stored refresh token
    const decryptedRefreshToken = decrypt(connection.refreshToken);

    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: decryptedRefreshToken,
      }),
    });

    if (!response.ok) {
      await this.prisma.jiraConnection.update({
        where: { organizationId },
        data: {
          isConnected: false,
          connectionError: 'Token refresh failed',
        },
      });
      throw new UnauthorizedException('Failed to refresh Jira token');
    }

    const tokens = await response.json();

    // Encrypt new tokens before storing
    await this.prisma.jiraConnection.update({
      where: { organizationId },
      data: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : connection.refreshToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  }

  private async testConnection(
    dto: JiraOAuthConfigDto
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = dto.apiToken
        ? `Basic ${Buffer.from(`${dto.userEmail}:${dto.apiToken}`).toString('base64')}`
        : undefined;

      const response = await fetch(`${dto.instanceUrl}/rest/api/3/myself`, {
        headers: auth ? { Authorization: auth } : {},
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async jiraApiRequest(
    organizationId: string,
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new UnauthorizedException('Jira not connected');
    }

    const credentials = this.decryptCredentials(connection.credentials);
    let auth: string;

    if (connection.accessToken) {
      // Decrypt the stored access token
      const decryptedAccessToken = decrypt(connection.accessToken);
      auth = `Bearer ${decryptedAccessToken}`;
    } else if (credentials.apiToken) {
      auth = `Basic ${Buffer.from(`${credentials.userEmail}:${credentials.apiToken}`).toString('base64')}`;
    } else {
      throw new UnauthorizedException('No authentication available');
    }

    const response = await fetch(`${connection.instanceUrl}${path}`, {
      method,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }

    return response.json();
  }

  private async getJiraProject(
    organizationId: string,
    projectKey: string
  ): Promise<JiraProjectDto> {
    const project = await this.jiraApiRequest(
      organizationId,
      'GET',
      `/rest/api/3/project/${projectKey}`
    );

    return {
      id: project.id,
      key: project.key,
      name: project.name,
    };
  }

  private async getInstanceUrl(organizationId: string): Promise<string> {
    const connection = await this.prisma.jiraConnection.findUnique({
      where: { organizationId },
    });
    return connection?.instanceUrl || '';
  }

  private async getGrcEntityData(
    organizationId: string,
    entityType: GrcEntityType,
    entityId: string
  ): Promise<any> {
    switch (entityType) {
      case GrcEntityType.RISK:
        return this.prisma.risk.findFirst({
          where: { id: entityId, organizationId },
        });
      case GrcEntityType.TASK:
        return this.prisma.task.findFirst({
          where: { id: entityId },
        });
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  private buildJiraIssue(mapping: any, entityData: any, additionalFields?: any): any {
    const fieldMappings = mapping.fieldMappings || [];

    const fields: any = {
      project: { key: mapping.jiraProjectKey },
      issuetype: { name: mapping.jiraIssueType },
      summary: entityData.title || entityData.name || 'Untitled',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: entityData.description || '' }],
          },
        ],
      },
    };

    // Apply field mappings
    for (const mapping of fieldMappings) {
      if (entityData[mapping.grcField] !== undefined) {
        fields[mapping.jiraField] = entityData[mapping.grcField];
      }
    }

    // Apply additional fields
    if (additionalFields) {
      Object.assign(fields, additionalFields);
    }

    return { fields };
  }

  private async createJiraIssueApi(organizationId: string, issueData: any): Promise<any> {
    return this.jiraApiRequest(organizationId, 'POST', '/rest/api/3/issue', issueData);
  }

  private async syncGrcToJira(
    _organizationId: string,
    _mapping: any
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    // Implementation would query GRC entities and sync to Jira
    return { created: 0, updated: 0, failed: 0, errors: [] };
  }

  private async syncJiraToGrc(
    _organizationId: string,
    _mapping: any
  ): Promise<{ updated: number; failed: number; errors: string[] }> {
    // Implementation would query Jira issues and sync to GRC
    return { updated: 0, failed: 0, errors: [] };
  }

  /**
   * Decrypt stored credentials JSON
   */
  private decryptCredentials(credentialsJson: string | null): {
    clientId?: string;
    clientSecret?: string;
    apiToken?: string;
    userEmail?: string;
  } {
    if (!credentialsJson) {
      return {};
    }

    const credentials = JSON.parse(credentialsJson);
    return {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret ? decrypt(credentials.clientSecret) : undefined,
      apiToken: credentials.apiToken ? decrypt(credentials.apiToken) : undefined,
      userEmail: credentials.userEmail,
    };
  }

  private toConnectionResponse(connection: any): JiraConnectionResponseDto {
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      instanceUrl: connection.instanceUrl,
      isConnected: connection.isConnected,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      connectionError: connection.connectionError,
      createdAt: connection.createdAt,
    };
  }

  private toMappingResponse(mapping: any): JiraProjectMappingResponseDto {
    return {
      id: mapping.id,
      jiraProjectKey: mapping.jiraProjectKey,
      jiraProjectName: mapping.jiraProjectName,
      grcEntityType: mapping.grcEntityType,
      jiraIssueType: mapping.jiraIssueType,
      syncDirection: mapping.syncDirection,
      fieldMappings: mapping.fieldMappings,
      statusMappings: mapping.statusMappings,
      autoCreate: mapping.autoCreate,
      autoSyncStatus: mapping.autoSyncStatus,
      syncComments: mapping.syncComments,
      syncAttachments: mapping.syncAttachments,
      jqlFilter: mapping.jqlFilter,
      isEnabled: mapping.isEnabled,
      lastSyncAt: mapping.lastSyncAt,
      syncedIssueCount: mapping.syncedIssueCount,
      createdAt: mapping.createdAt,
    };
  }
}
