import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuditStatus } from '@prisma/client';
import {
  FieldGuideConnectDto,
  FieldGuideConnectionStatusDto,
  TriggerSyncDto,
  SyncResultDto,
  SyncHistoryItemDto,
  SyncDirection,
  SyncEntityType,
  FieldGuideWebhookPayloadDto,
  FieldGuideAuditMappingDto,
  LinkAuditDto,
  FieldGuideAudit,
} from './dto/fieldguide.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FieldGuideService {
  private readonly logger = new Logger(FieldGuideService.name);
  private readonly DEFAULT_API_URL = 'https://api.fieldguide.io/v1';

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Connection Management
  // ============================================

  async connect(organizationId: string, dto: FieldGuideConnectDto): Promise<FieldGuideConnectionStatusDto> {
    // Validate the API key by making a test request
    const apiUrl = dto.instanceUrl || this.DEFAULT_API_URL;
    
    try {
      const testResponse = await this.makeFieldGuideRequest(
        apiUrl,
        dto.apiKey,
        'GET',
        '/organization'
      );

      // Store the connection in organization settings
      const existing = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });

      const settings = (existing?.settings as Record<string, unknown>) || {};
      
      const fieldGuideSettings = {
        fieldGuide: {
          connected: true,
          apiKey: dto.apiKey, // In production, this should be encrypted
          instanceUrl: apiUrl,
          fieldGuideOrgId: dto.fieldGuideOrgId || testResponse.id,
          fieldGuideOrgName: testResponse.name,
          connectedAt: new Date().toISOString(),
          lastSyncAt: null,
          syncStatus: 'idle',
        },
      };

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: JSON.parse(JSON.stringify({ ...settings, ...fieldGuideSettings })),
        },
      });

      this.logger.log(`FieldGuide connected for org ${organizationId}`);

      return {
        isConnected: true,
        connectedAt: new Date(),
        fieldGuideOrgName: String(testResponse.name || ''),
        syncStatus: 'idle',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`FieldGuide connection failed: ${message}`);
      throw new BadRequestException(`Failed to connect to FieldGuide: ${message}`);
    }
  }

  async disconnect(organizationId: string): Promise<void> {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (existing?.settings as Record<string, unknown>) || {};
    
    // Remove FieldGuide settings
    delete (settings as Record<string, unknown>).fieldGuide;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: JSON.parse(JSON.stringify(settings)) },
    });

    this.logger.log(`FieldGuide disconnected for org ${organizationId}`);
  }

  async getConnectionStatus(organizationId: string): Promise<FieldGuideConnectionStatusDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const fieldGuide = (settings.fieldGuide as Record<string, unknown>) || {};

    if (!fieldGuide.connected) {
      return {
        isConnected: false,
        syncStatus: 'idle',
      };
    }

    return {
      isConnected: true,
      connectedAt: fieldGuide.connectedAt ? new Date(fieldGuide.connectedAt as string) : undefined,
      fieldGuideOrgName: fieldGuide.fieldGuideOrgName as string,
      lastSyncAt: fieldGuide.lastSyncAt ? new Date(fieldGuide.lastSyncAt as string) : undefined,
      syncStatus: (fieldGuide.syncStatus as 'idle' | 'syncing' | 'error') || 'idle',
      errorMessage: fieldGuide.errorMessage as string,
    };
  }

  // ============================================
  // Sync Operations
  // ============================================

  async triggerSync(organizationId: string, dto: TriggerSyncDto): Promise<SyncResultDto> {
    const status = await this.getConnectionStatus(organizationId);
    
    if (!status.isConnected) {
      throw new BadRequestException('FieldGuide is not connected');
    }

    const syncId = uuidv4();
    const startedAt = new Date();
    const direction = dto.direction || SyncDirection.BIDIRECTIONAL;
    const entityTypes = dto.entityTypes || Object.values(SyncEntityType);

    // Update sync status to running
    await this.updateSyncStatus(organizationId, 'syncing');

    const result: SyncResultDto = {
      syncId,
      startedAt,
      status: 'running',
      entitiesSynced: {
        audits: { created: 0, updated: 0 },
        requests: { created: 0, updated: 0 },
        evidence: { created: 0, updated: 0 },
        findings: { created: 0, updated: 0 },
      },
      warnings: [],
    };

    try {
      const fieldGuideConfig = await this.getFieldGuideConfig(organizationId);

      // Sync audits
      if (entityTypes.includes(SyncEntityType.AUDITS)) {
        const auditResult = await this.syncAudits(
          organizationId,
          fieldGuideConfig,
          direction,
          dto.auditId
        );
        result.entitiesSynced.audits = auditResult;
      }

      // Sync requests
      if (entityTypes.includes(SyncEntityType.REQUESTS)) {
        const requestResult = await this.syncRequests(
          organizationId,
          fieldGuideConfig,
          direction,
          dto.auditId
        );
        result.entitiesSynced.requests = requestResult;
      }

      // Sync evidence
      if (entityTypes.includes(SyncEntityType.EVIDENCE)) {
        const evidenceResult = await this.syncEvidence(
          organizationId,
          fieldGuideConfig,
          direction,
          dto.auditId
        );
        result.entitiesSynced.evidence = evidenceResult;
      }

      // Sync findings
      if (entityTypes.includes(SyncEntityType.FINDINGS)) {
        const findingsResult = await this.syncFindings(
          organizationId,
          fieldGuideConfig,
          direction,
          dto.auditId
        );
        result.entitiesSynced.findings = findingsResult;
      }

      result.status = 'completed';
      result.completedAt = new Date();

      // Update last sync timestamp
      await this.updateSyncStatus(organizationId, 'idle', new Date());

      // Store sync history
      await this.storeSyncHistory(organizationId, result, direction);

      this.logger.log(`Sync completed for org ${organizationId}, syncId: ${syncId}`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'failed';
      result.errorMessage = message;
      result.completedAt = new Date();

      await this.updateSyncStatus(organizationId, 'error', undefined, message);

      this.logger.error(`Sync failed for org ${organizationId}: ${message}`);
    }

    return result;
  }

  async getSyncHistory(organizationId: string, limit = 10): Promise<SyncHistoryItemDto[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const fieldGuide = (settings.fieldGuide as Record<string, unknown>) || {};
    const history = (fieldGuide.syncHistory as SyncHistoryItemDto[]) || [];

    return history.slice(0, limit);
  }

  // ============================================
  // Audit Mapping
  // ============================================

  async getAuditMappings(organizationId: string): Promise<FieldGuideAuditMappingDto[]> {
    const audits = await this.prisma.audit.findMany({
      where: {
        organizationId,
        fieldGuideId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        fieldGuideId: true,
        name: true,
        fieldGuideData: true,
      },
    });

    return audits.map(audit => {
      const fieldGuideData = audit.fieldGuideData as Record<string, unknown> | null;
      return {
        grcAuditId: audit.id,
        fieldGuideAuditId: audit.fieldGuideId!,
        name: audit.name,
        syncStatus: 'synced',
        lastSyncedAt: fieldGuideData?.lastSyncedAt 
          ? new Date(fieldGuideData.lastSyncedAt as string) 
          : undefined,
      };
    });
  }

  async linkAudit(organizationId: string, dto: LinkAuditDto): Promise<FieldGuideAuditMappingDto> {
    const audit = await this.prisma.audit.findFirst({
      where: {
        id: dto.grcAuditId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!audit) {
      throw new NotFoundException('Audit not found');
    }

    // Verify the FieldGuide audit exists
    const fieldGuideConfig = await this.getFieldGuideConfig(organizationId);
    const fieldGuideAudit = await this.fetchFieldGuideAudit(fieldGuideConfig, dto.fieldGuideAuditId);

    if (!fieldGuideAudit) {
      throw new BadRequestException('FieldGuide audit not found');
    }

    // Update the audit with the FieldGuide link
    await this.prisma.audit.update({
      where: { id: dto.grcAuditId },
      data: {
        fieldGuideId: dto.fieldGuideAuditId,
        fieldGuideData: {
          linkedAt: new Date().toISOString(),
          fieldGuideAuditName: fieldGuideAudit.name,
        },
      },
    });

    return {
      grcAuditId: dto.grcAuditId,
      fieldGuideAuditId: dto.fieldGuideAuditId,
      name: audit.name,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    };
  }

  async unlinkAudit(organizationId: string, grcAuditId: string): Promise<void> {
    await this.prisma.audit.update({
      where: { id: grcAuditId },
      data: {
        fieldGuideId: null,
        fieldGuideData: null,
      },
    });
  }

  // ============================================
  // Webhook Processing
  // ============================================

  async processWebhook(
    organizationId: string,
    payload: FieldGuideWebhookPayloadDto,
    rawBody: string
  ): Promise<void> {
    // Verify webhook signature
    const fieldGuideConfig = await this.getFieldGuideConfig(organizationId);
    const isValid = this.verifyWebhookSignature(
      rawBody,
      payload.signature,
      fieldGuideConfig.webhookSecret
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing FieldGuide webhook: ${payload.event}`);

    switch (payload.event) {
      case 'audit.created':
      case 'audit.updated':
        await this.handleAuditWebhook(organizationId, payload.data);
        break;
      case 'request.created':
      case 'request.updated':
        await this.handleRequestWebhook(organizationId, payload.data);
        break;
      case 'evidence.uploaded':
        await this.handleEvidenceWebhook(organizationId, payload.data);
        break;
      case 'finding.created':
      case 'finding.updated':
        await this.handleFindingWebhook(organizationId, payload.data);
        break;
      default:
        this.logger.warn(`Unknown webhook event: ${payload.event}`);
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async getFieldGuideConfig(organizationId: string): Promise<{
    apiKey: string;
    instanceUrl: string;
    fieldGuideOrgId: string;
    webhookSecret?: string;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const fieldGuide = (settings.fieldGuide as Record<string, unknown>) || {};

    if (!fieldGuide.connected) {
      throw new BadRequestException('FieldGuide is not connected');
    }

    return {
      apiKey: fieldGuide.apiKey as string,
      instanceUrl: fieldGuide.instanceUrl as string,
      fieldGuideOrgId: fieldGuide.fieldGuideOrgId as string,
      webhookSecret: fieldGuide.webhookSecret as string,
    };
  }

  private async makeFieldGuideRequest(
    baseUrl: string,
    apiKey: string,
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FieldGuide API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private async updateSyncStatus(
    organizationId: string,
    status: 'idle' | 'syncing' | 'error',
    lastSyncAt?: Date,
    errorMessage?: string
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const fieldGuide = (settings.fieldGuide as Record<string, unknown>) || {};

    fieldGuide.syncStatus = status;
    if (lastSyncAt) fieldGuide.lastSyncAt = lastSyncAt.toISOString();
    if (errorMessage) fieldGuide.errorMessage = errorMessage;
    else delete fieldGuide.errorMessage;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: JSON.parse(JSON.stringify({ ...settings, fieldGuide })) },
    });
  }

  private async storeSyncHistory(
    organizationId: string,
    result: SyncResultDto,
    direction: SyncDirection
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const fieldGuide = (settings.fieldGuide as Record<string, unknown>) || {};
    const history = (fieldGuide.syncHistory as SyncHistoryItemDto[]) || [];

    const totalEntities = 
      result.entitiesSynced.audits.created + result.entitiesSynced.audits.updated +
      result.entitiesSynced.requests.created + result.entitiesSynced.requests.updated +
      result.entitiesSynced.evidence.created + result.entitiesSynced.evidence.updated +
      result.entitiesSynced.findings.created + result.entitiesSynced.findings.updated;

    history.unshift({
      syncId: result.syncId,
      timestamp: result.startedAt,
      direction,
      status: result.status === 'completed' ? 'completed' : 'failed',
      durationSeconds: result.completedAt 
        ? (result.completedAt.getTime() - result.startedAt.getTime()) / 1000 
        : 0,
      totalEntities,
    });

    // Keep only last 50 sync records
    fieldGuide.syncHistory = history.slice(0, 50);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { settings: JSON.parse(JSON.stringify({ ...settings, fieldGuide })) },
    });
  }

  private verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret?: string
  ): boolean {
    if (!secret) return true; // Skip verification if no secret configured

    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // SECURITY: Use timingSafeEqual to prevent timing attacks
    // Regular string comparison (===) can leak timing information
    // that could allow attackers to forge valid signatures
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // ============================================
  // Sync Implementation Methods
  // ============================================

  private async syncAudits(
    organizationId: string,
    config: { apiKey: string; instanceUrl: string },
    direction: SyncDirection,
    specificAuditId?: string
  ): Promise<{ created: number; updated: number }> {
    const created = 0;
    let updated = 0;

    // Pull audits from FieldGuide
    if (direction === SyncDirection.PULL || direction === SyncDirection.BIDIRECTIONAL) {
      const fieldGuideAudits = await this.fetchFieldGuideAudits(config);

      for (const fgAudit of fieldGuideAudits) {
        // Check if audit already exists in GRC
        const existingAudit = await this.prisma.audit.findFirst({
          where: { fieldGuideId: fgAudit.id, organizationId },
        });

        if (existingAudit) {
          // Update existing audit
          await this.prisma.audit.update({
            where: { id: existingAudit.id },
            data: {
              name: fgAudit.name,
              description: fgAudit.description,
              status: this.mapFieldGuideStatus(fgAudit.status),
              fieldGuideData: JSON.parse(JSON.stringify({
                ...((existingAudit.fieldGuideData as Record<string, unknown>) || {}),
                lastSyncedAt: new Date().toISOString(),
                rawData: fgAudit,
              })),
            },
          });
          updated++;
        } else {
          // Create new audit (if no specific audit was requested)
          if (!specificAuditId) {
            // Note: We don't auto-create audits from FieldGuide
            // They should be linked manually
            this.logger.debug(`Found unlinked FieldGuide audit: ${fgAudit.id}`);
          }
        }
      }
    }

    return { created, updated };
  }

  private async syncRequests(
    _organizationId: string,
    _config: { apiKey: string; instanceUrl: string },
    _direction: SyncDirection,
    _specificAuditId?: string
  ): Promise<{ created: number; updated: number }> {
    // Implementation for syncing requests
    // Similar pattern to syncAudits
    return { created: 0, updated: 0 };
  }

  private async syncEvidence(
    _organizationId: string,
    _config: { apiKey: string; instanceUrl: string },
    _direction: SyncDirection,
    _specificAuditId?: string
  ): Promise<{ created: number; updated: number }> {
    // Implementation for syncing evidence
    return { created: 0, updated: 0 };
  }

  private async syncFindings(
    _organizationId: string,
    _config: { apiKey: string; instanceUrl: string },
    _direction: SyncDirection,
    _specificAuditId?: string
  ): Promise<{ created: number; updated: number }> {
    // Implementation for syncing findings
    return { created: 0, updated: 0 };
  }

  private async fetchFieldGuideAudits(
    config: { apiKey: string; instanceUrl: string }
  ): Promise<FieldGuideAudit[]> {
    try {
      const response = await this.makeFieldGuideRequest(
        config.instanceUrl,
        config.apiKey,
        'GET',
        '/audits'
      );
      return (response.data as FieldGuideAudit[]) || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch FieldGuide audits: ${message}`);
      return [];
    }
  }

  private async fetchFieldGuideAudit(
    config: { apiKey: string; instanceUrl: string },
    auditId: string
  ): Promise<FieldGuideAudit | null> {
    try {
      const response = await this.makeFieldGuideRequest(
        config.instanceUrl,
        config.apiKey,
        'GET',
        `/audits/${auditId}`
      );
      return response as unknown as FieldGuideAudit;
    } catch {
      return null;
    }
  }

  private mapFieldGuideStatus(fgStatus: string): AuditStatus {
    const statusMap: Record<string, AuditStatus> = {
      'draft': AuditStatus.planning,
      'planning': AuditStatus.planning,
      'in_progress': AuditStatus.fieldwork,
      'fieldwork': AuditStatus.fieldwork,
      'review': AuditStatus.reporting,
      'reporting': AuditStatus.reporting,
      'completed': AuditStatus.completed,
      'closed': AuditStatus.completed,
    };
    return statusMap[fgStatus.toLowerCase()] || AuditStatus.planning;
  }

  // ============================================
  // Webhook Handlers
  // ============================================

  private async handleAuditWebhook(organizationId: string, data: Record<string, unknown>): Promise<void> {
    const fieldGuideAuditId = data.id as string;
    
    const audit = await this.prisma.audit.findFirst({
      where: { fieldGuideId: fieldGuideAuditId, organizationId },
    });

    if (audit) {
      await this.prisma.audit.update({
        where: { id: audit.id },
        data: {
          name: data.name as string || audit.name,
          description: data.description as string || audit.description,
          status: this.mapFieldGuideStatus(data.status as string || 'planning'),
          fieldGuideData: JSON.parse(JSON.stringify({
            ...((audit.fieldGuideData as Record<string, unknown>) || {}),
            lastSyncedAt: new Date().toISOString(),
            rawData: data,
          })),
        },
      });
      this.logger.log(`Updated audit ${audit.id} from webhook`);
    }
  }

  private async handleRequestWebhook(organizationId: string, _data: Record<string, unknown>): Promise<void> {
    // Handle request webhook
    this.logger.log(`Received request webhook for org ${organizationId}`);
  }

  private async handleEvidenceWebhook(organizationId: string, _data: Record<string, unknown>): Promise<void> {
    // Handle evidence webhook
    this.logger.log(`Received evidence webhook for org ${organizationId}`);
  }

  private async handleFindingWebhook(organizationId: string, _data: Record<string, unknown>): Promise<void> {
    // Handle finding webhook
    this.logger.log(`Received finding webhook for org ${organizationId}`);
  }
}

