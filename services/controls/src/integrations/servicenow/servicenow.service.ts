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
  ServiceNowConnectionConfigDto,
  ServiceNowConnectionResponseDto,
  CreateTableMappingDto,
  TableMappingResponseDto,
  SyncResultDto,
  CreateRecordDto,
  RecordLinkResponseDto,
  ServiceNowTableDto,
  AssignmentGroupDto,
  ServiceNowSyncDirection,
  ServiceNowAuthType,
  GrcEntityType,
} from './dto/servicenow.dto';

@Injectable()
export class ServiceNowService {
  private readonly logger = new Logger(ServiceNowService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================
  // Connection Management
  // ===========================================

  async connect(
    organizationId: string,
    dto: ServiceNowConnectionConfigDto
  ): Promise<ServiceNowConnectionResponseDto> {
    // Validate connection
    const testResult = await this.testConnection(dto);

    if (!testResult.success) {
      throw new BadRequestException(`Connection failed: ${testResult.error}`);
    }

    // Store connection
    const connection = await this.prisma.serviceNowConnection.upsert({
      where: { organizationId },
      create: {
        organizationId,
        instanceUrl: dto.instanceUrl,
        authType: dto.authType,
        credentials: JSON.stringify(this.encryptCredentials(dto)),
        isConnected: true,
        connectedAt: new Date(),
      },
      update: {
        instanceUrl: dto.instanceUrl,
        authType: dto.authType,
        credentials: JSON.stringify(this.encryptCredentials(dto)),
        isConnected: true,
        connectedAt: new Date(),
        connectionError: null,
      },
    });

    this.logger.log(`ServiceNow connected for org ${organizationId}`);

    return this.toConnectionResponse(connection);
  }

  async disconnect(organizationId: string): Promise<void> {
    await this.prisma.serviceNowConnection.update({
      where: { organizationId },
      data: {
        isConnected: false,
        credentials: null,
        accessToken: null,
        refreshToken: null,
      },
    });

    this.logger.log(`ServiceNow disconnected for org ${organizationId}`);
  }

  async getConnection(organizationId: string): Promise<ServiceNowConnectionResponseDto | null> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    return connection ? this.toConnectionResponse(connection) : null;
  }

  async getOAuthUrl(organizationId: string, redirectUri: string): Promise<string> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('ServiceNow connection not configured');
    }

    const credentials = this.decryptCredentials(connection.credentials);

    const params = new URLSearchParams({
      response_type: 'code',
      redirect_uri: redirectUri,
      client_id: credentials.clientId || '',
      state: organizationId,
    });

    return `${connection.instanceUrl}/oauth_auth.do?${params.toString()}`;
  }

  async handleOAuthCallback(
    organizationId: string,
    code: string,
    redirectUri: string
  ): Promise<ServiceNowConnectionResponseDto> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new NotFoundException('ServiceNow connection not configured');
    }

    const credentials = this.decryptCredentials(connection.credentials);

    // Exchange code for tokens
    const tokenResponse = await fetch(`${connection.instanceUrl}/oauth_token.do`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: credentials.clientId || '',
        client_secret: credentials.clientSecret || '',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to exchange OAuth code');
    }

    const tokens = await tokenResponse.json();

    // Store encrypted tokens
    const updated = await this.prisma.serviceNowConnection.update({
      where: { organizationId },
      data: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isConnected: true,
        connectedAt: new Date(),
      },
    });

    this.logger.log(`ServiceNow OAuth completed for org ${organizationId}`);

    return this.toConnectionResponse(updated);
  }

  // ===========================================
  // Table Mappings
  // ===========================================

  async createTableMapping(
    organizationId: string,
    dto: CreateTableMappingDto
  ): Promise<TableMappingResponseDto> {
    await this.ensureConnected(organizationId);

    // Get table label from ServiceNow
    const tableLabel = await this.getTableLabel(organizationId, dto.snowTableName);

    const mapping = await this.prisma.serviceNowTableMapping.create({
      data: {
        organizationId,
        snowTableName: dto.snowTableName,
        snowTableLabel: tableLabel,
        grcEntityType: dto.grcEntityType,
        syncDirection: dto.syncDirection,
        fieldMappings: dto.fieldMappings as any,
        statusMappings: dto.statusMappings as any,
        priorityMappings: dto.priorityMappings as any,
        autoCreate: dto.autoCreate ?? false,
        autoSyncStatus: dto.autoSyncStatus ?? true,
        syncAttachments: dto.syncAttachments ?? false,
        syncWorkNotes: dto.syncWorkNotes ?? false,
        queryFilter: dto.queryFilter,
        assignmentGroupId: dto.assignmentGroupId,
        categoryId: dto.categoryId,
        isEnabled: true,
      },
    });

    this.logger.log(`Created ServiceNow mapping: ${dto.snowTableName} <-> ${dto.grcEntityType}`);

    return this.toMappingResponse(mapping);
  }

  async listTableMappings(organizationId: string): Promise<TableMappingResponseDto[]> {
    const mappings = await this.prisma.serviceNowTableMapping.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return mappings.map((m) => this.toMappingResponse(m));
  }

  async deleteTableMapping(organizationId: string, id: string): Promise<void> {
    const mapping = await this.prisma.serviceNowTableMapping.findFirst({
      where: { id, organizationId },
    });

    if (!mapping) {
      throw new NotFoundException('Table mapping not found');
    }

    await this.prisma.serviceNowTableMapping.delete({ where: { id } });
  }

  // ===========================================
  // Record Sync
  // ===========================================

  async syncNow(organizationId: string, mappingId: string): Promise<SyncResultDto> {
    const mapping = await this.prisma.serviceNowTableMapping.findFirst({
      where: { id: mappingId, organizationId },
    });

    if (!mapping) {
      throw new NotFoundException('Table mapping not found');
    }

    const startTime = Date.now();
    const result: SyncResultDto = {
      mappingId,
      direction: mapping.syncDirection as ServiceNowSyncDirection,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
      syncedAt: new Date(),
    };

    try {
      const syncDirection = mapping.syncDirection as ServiceNowSyncDirection;

      // Sync GRC -> ServiceNow
      if (
        syncDirection === ServiceNowSyncDirection.GRC_TO_SNOW ||
        syncDirection === ServiceNowSyncDirection.BIDIRECTIONAL
      ) {
        const grcResult = await this.syncGrcToSnow(organizationId, mapping);
        result.recordsCreated += grcResult.created;
        result.recordsUpdated += grcResult.updated;
        result.recordsFailed += grcResult.failed;
        if (grcResult.errors?.length) {
          result.errors?.push(...grcResult.errors);
        }
      }

      // Sync ServiceNow -> GRC
      if (
        syncDirection === ServiceNowSyncDirection.SNOW_TO_GRC ||
        syncDirection === ServiceNowSyncDirection.BIDIRECTIONAL
      ) {
        const snowResult = await this.syncSnowToGrc(organizationId, mapping);
        result.recordsUpdated += snowResult.updated;
        result.recordsFailed += snowResult.failed;
        if (snowResult.errors?.length) {
          result.errors?.push(...snowResult.errors);
        }
      }

      // Update last sync time
      await this.prisma.serviceNowTableMapping.update({
        where: { id: mappingId },
        data: { lastSyncAt: new Date() },
      });
    } catch (error) {
      result.errors?.push(error.message);
      result.recordsFailed++;
    }

    result.duration = Date.now() - startTime;

    this.logger.log(
      `ServiceNow sync completed: ${result.recordsCreated} created, ${result.recordsUpdated} updated`
    );

    return result;
  }

  async createRecord(organizationId: string, dto: CreateRecordDto): Promise<RecordLinkResponseDto> {
    await this.ensureConnected(organizationId);

    // Get mapping
    let mapping;
    if (dto.mappingId) {
      mapping = await this.prisma.serviceNowTableMapping.findFirst({
        where: { id: dto.mappingId, organizationId },
      });
    } else {
      mapping = await this.prisma.serviceNowTableMapping.findFirst({
        where: { organizationId, grcEntityType: dto.entityType, isEnabled: true },
      });
    }

    if (!mapping) {
      throw new NotFoundException('No table mapping found for this entity type');
    }

    // Get GRC entity data
    const entityData = await this.getGrcEntityData(organizationId, dto.entityType, dto.entityId);

    // Build ServiceNow record
    const snowRecord = this.buildSnowRecord(mapping, entityData, dto.additionalFields);

    // Create in ServiceNow
    const created = await this.createSnowRecord(organizationId, mapping.snowTableName, snowRecord);

    const instanceUrl = await this.getInstanceUrl(organizationId);

    // Store link
    const recordLink = await this.prisma.serviceNowRecordLink.create({
      data: {
        organizationId,
        mappingId: mapping.id,
        snowSysId: created.sys_id,
        snowNumber: created.number || created.sys_id,
        snowUrl: `${instanceUrl}/${mapping.snowTableName}.do?sys_id=${created.sys_id}`,
        grcEntityType: dto.entityType,
        grcEntityId: dto.entityId,
        lastSyncedAt: new Date(),
      },
    });

    return {
      id: recordLink.id,
      snowSysId: created.sys_id,
      snowNumber: recordLink.snowNumber,
      snowUrl: recordLink.snowUrl,
      grcEntityType: dto.entityType as GrcEntityType,
      grcEntityId: dto.entityId,
      lastSyncedAt: recordLink.lastSyncedAt,
      createdAt: recordLink.createdAt,
    };
  }

  async getLinkedRecords(
    organizationId: string,
    entityType: GrcEntityType,
    entityId: string
  ): Promise<RecordLinkResponseDto[]> {
    const links = await this.prisma.serviceNowRecordLink.findMany({
      where: { organizationId, grcEntityType: entityType, grcEntityId: entityId },
    });

    return links.map((l) => ({
      id: l.id,
      snowSysId: l.snowSysId,
      snowNumber: l.snowNumber,
      snowUrl: l.snowUrl,
      grcEntityType: l.grcEntityType as GrcEntityType,
      grcEntityId: l.grcEntityId,
      lastSyncedAt: l.lastSyncedAt,
      createdAt: l.createdAt,
    }));
  }

  // ===========================================
  // ServiceNow Resources
  // ===========================================

  async listTables(organizationId: string): Promise<ServiceNowTableDto[]> {
    await this.ensureConnected(organizationId);

    // Return common ITSM tables - in production would query sys_db_object
    return [
      { name: 'incident', label: 'Incident' },
      { name: 'change_request', label: 'Change Request' },
      { name: 'problem', label: 'Problem' },
      { name: 'sn_si_incident', label: 'Security Incident' },
      { name: 'sn_risk_risk', label: 'GRC Risk' },
      { name: 'sn_compliance_policy_statement', label: 'GRC Control' },
    ];
  }

  async listAssignmentGroups(organizationId: string): Promise<AssignmentGroupDto[]> {
    await this.ensureConnected(organizationId);

    const response = await this.snowApiRequest(
      organizationId,
      'GET',
      '/api/now/table/sys_user_group?sysparm_limit=100&sysparm_fields=sys_id,name'
    );

    return (response?.result || []).map((g: any) => ({
      sysId: g.sys_id,
      name: g.name,
    }));
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  private async ensureConnected(organizationId: string): Promise<void> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    if (!connection?.isConnected) {
      throw new UnauthorizedException('ServiceNow is not connected');
    }

    // Check token expiry and refresh if needed
    if (
      connection.authType === ServiceNowAuthType.OAUTH &&
      connection.tokenExpiresAt &&
      connection.tokenExpiresAt < new Date()
    ) {
      await this.refreshAccessToken(organizationId);
    }
  }

  private async refreshAccessToken(organizationId: string): Promise<void> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    if (!connection?.refreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    const credentials = this.decryptCredentials(connection.credentials);
    // Decrypt the stored refresh token
    const decryptedRefreshToken = decrypt(connection.refreshToken);

    const response = await fetch(`${connection.instanceUrl}/oauth_token.do`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: credentials.clientId || '',
        client_secret: credentials.clientSecret || '',
        refresh_token: decryptedRefreshToken,
      }).toString(),
    });

    if (!response.ok) {
      await this.prisma.serviceNowConnection.update({
        where: { organizationId },
        data: {
          isConnected: false,
          connectionError: 'Token refresh failed',
        },
      });
      throw new UnauthorizedException('Failed to refresh ServiceNow token');
    }

    const tokens = await response.json();

    // Encrypt new tokens before storing
    await this.prisma.serviceNowConnection.update({
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
    dto: ServiceNowConnectionConfigDto
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let auth: string;

      if (dto.authType === ServiceNowAuthType.BASIC) {
        auth = `Basic ${Buffer.from(`${dto.username}:${dto.password}`).toString('base64')}`;
      } else {
        // For OAuth, we'd need to get a token first
        return { success: true }; // Skip test for OAuth initial setup
      }

      const response = await fetch(`${dto.instanceUrl}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: { Authorization: auth, Accept: 'application/json' },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async snowApiRequest(
    organizationId: string,
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
      where: { organizationId },
    });

    if (!connection) {
      throw new UnauthorizedException('ServiceNow not connected');
    }

    const credentials = this.decryptCredentials(connection.credentials);
    let auth: string;

    if (connection.accessToken) {
      // Decrypt the stored access token
      const decryptedAccessToken = decrypt(connection.accessToken);
      auth = `Bearer ${decryptedAccessToken}`;
    } else if (connection.authType === 'basic' && credentials.username && credentials.password) {
      auth = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;
    } else {
      throw new UnauthorizedException('No authentication available');
    }

    const response = await fetch(`${connection.instanceUrl}${path}`, {
      method,
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`ServiceNow API error: ${response.status}`);
    }

    return response.json();
  }

  private async getTableLabel(organizationId: string, tableName: string): Promise<string> {
    try {
      const response = await this.snowApiRequest(
        organizationId,
        'GET',
        `/api/now/table/sys_db_object?sysparm_query=name=${tableName}&sysparm_fields=label`
      );
      return response?.result?.[0]?.label || tableName;
    } catch {
      return tableName;
    }
  }

  private async getInstanceUrl(organizationId: string): Promise<string> {
    const connection = await this.prisma.serviceNowConnection.findUnique({
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

  private buildSnowRecord(mapping: any, entityData: any, additionalFields?: any): any {
    const fieldMappings = mapping.fieldMappings || [];

    const record: any = {
      short_description: entityData.title || entityData.name || 'GRC Item',
      description: entityData.description || '',
    };

    // Set assignment group if configured
    if (mapping.assignmentGroupId) {
      record.assignment_group = mapping.assignmentGroupId;
    }

    // Set category if configured
    if (mapping.categoryId) {
      record.category = mapping.categoryId;
    }

    // Apply field mappings
    for (const fm of fieldMappings) {
      if (entityData[fm.grcField] !== undefined) {
        record[fm.snowField] = entityData[fm.grcField];
      }
    }

    // Apply additional fields
    if (additionalFields) {
      Object.assign(record, additionalFields);
    }

    return record;
  }

  private async createSnowRecord(
    organizationId: string,
    tableName: string,
    data: any
  ): Promise<any> {
    const response = await this.snowApiRequest(
      organizationId,
      'POST',
      `/api/now/table/${tableName}`,
      data
    );
    return response?.result;
  }

  private async syncGrcToSnow(
    _organizationId: string,
    _mapping: any
  ): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    // Implementation would query GRC entities and sync to ServiceNow
    return { created: 0, updated: 0, failed: 0, errors: [] };
  }

  private async syncSnowToGrc(
    _organizationId: string,
    _mapping: any
  ): Promise<{ updated: number; failed: number; errors: string[] }> {
    // Implementation would query ServiceNow records and sync to GRC
    return { updated: 0, failed: 0, errors: [] };
  }

  /**
   * Encrypt sensitive credential fields before storing
   */
  private encryptCredentials(dto: ServiceNowConnectionConfigDto): any {
    return {
      username: dto.username,
      password: dto.password ? encrypt(dto.password) : undefined,
      clientId: dto.clientId,
      clientSecret: dto.clientSecret ? encrypt(dto.clientSecret) : undefined,
    };
  }

  /**
   * Decrypt stored credentials JSON
   */
  private decryptCredentials(credentialsJson: string | null): {
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
  } {
    if (!credentialsJson) {
      return {};
    }

    const credentials = JSON.parse(credentialsJson);
    return {
      username: credentials.username,
      password: credentials.password ? decrypt(credentials.password) : undefined,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret ? decrypt(credentials.clientSecret) : undefined,
    };
  }

  private toConnectionResponse(connection: any): ServiceNowConnectionResponseDto {
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      instanceUrl: connection.instanceUrl,
      authType: connection.authType as ServiceNowAuthType,
      isConnected: connection.isConnected,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      connectionError: connection.connectionError,
      createdAt: connection.createdAt,
    };
  }

  private toMappingResponse(mapping: any): TableMappingResponseDto {
    return {
      id: mapping.id,
      snowTableName: mapping.snowTableName,
      snowTableLabel: mapping.snowTableLabel,
      grcEntityType: mapping.grcEntityType,
      syncDirection: mapping.syncDirection,
      fieldMappings: mapping.fieldMappings,
      statusMappings: mapping.statusMappings,
      priorityMappings: mapping.priorityMappings,
      autoCreate: mapping.autoCreate,
      autoSyncStatus: mapping.autoSyncStatus,
      syncAttachments: mapping.syncAttachments,
      syncWorkNotes: mapping.syncWorkNotes,
      queryFilter: mapping.queryFilter,
      assignmentGroupId: mapping.assignmentGroupId,
      isEnabled: mapping.isEnabled,
      lastSyncAt: mapping.lastSyncAt,
      syncedRecordCount: mapping.syncedRecordCount,
      createdAt: mapping.createdAt,
    };
  }
}
