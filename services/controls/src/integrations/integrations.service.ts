import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import { IntegrationStatus, AlertJobStatus, EvidenceStatus } from '@prisma/client';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  IntegrationFilterDto,
  INTEGRATION_TYPES,
} from './dto/integration.dto';
import { JamfConnector } from './connectors/jamf.connector';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly jamfConnector: JamfConnector;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {
    this.jamfConnector = new JamfConnector();
  }

  async findAll(organizationId: string, filters: IntegrationFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [integrations, total] = await Promise.all([
      this.prisma.integration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integration.count({ where }),
    ]);

    // Add type metadata to each integration
    const integrationsWithMeta = integrations.map((integration) => ({
      ...integration,
      typeMeta: INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES] || null,
      // Don't expose sensitive config values in list
      config: this.maskSensitiveConfig(integration.type, integration.config as Record<string, any>),
    }));

    return {
      data: integrationsWithMeta,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, organizationId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
      include: {
        syncJobs: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return {
      ...integration,
      typeMeta: INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES] || null,
      // Mask sensitive config values
      config: this.maskSensitiveConfig(integration.type, integration.config as Record<string, any>),
    };
  }

  async create(
    organizationId: string, 
    userId: string, 
    dto: CreateIntegrationDto,
    userEmail?: string,
    userName?: string,
  ) {
    // Validate integration type
    if (!INTEGRATION_TYPES[dto.type as keyof typeof INTEGRATION_TYPES]) {
      throw new BadRequestException(`Invalid integration type: ${dto.type}`);
    }

    const integration = await this.prisma.integration.create({
      data: {
        organizationId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        config: dto.config || {},
        syncFrequency: dto.syncFrequency || 'daily',
        status: IntegrationStatus.pending_setup,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'created',
      entityType: 'integration',
      entityId: integration.id,
      entityName: integration.name,
      description: `Created integration "${integration.name}" (${dto.type})`,
      metadata: { type: dto.type, syncFrequency: dto.syncFrequency },
    });

    return {
      ...integration,
      typeMeta: INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES] || null,
    };
  }

  async update(
    id: string, 
    organizationId: string, 
    userId: string, 
    dto: UpdateIntegrationDto,
    userEmail?: string,
    userName?: string,
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Integration not found');
    }

    // Merge config if provided (don't overwrite entire config)
    let newConfig = existing.config as Record<string, any>;
    if (dto.config) {
      newConfig = { ...newConfig, ...dto.config };
    }

    const integration = await this.prisma.integration.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        config: newConfig,
        syncFrequency: dto.syncFrequency,
        updatedBy: userId,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'updated',
      entityType: 'integration',
      entityId: integration.id,
      entityName: integration.name,
      description: `Updated integration "${integration.name}"`,
      changes: {
        before: { name: existing.name, status: existing.status, syncFrequency: existing.syncFrequency },
        after: { name: integration.name, status: integration.status, syncFrequency: integration.syncFrequency },
      },
    });

    return {
      ...integration,
      typeMeta: INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES] || null,
      config: this.maskSensitiveConfig(integration.type, integration.config as Record<string, any>),
    };
  }

  async delete(
    id: string, 
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Integration not found');
    }

    await this.prisma.integration.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'deleted',
      entityType: 'integration',
      entityId: existing.id,
      entityName: existing.name,
      description: `Deleted integration "${existing.name}" (${existing.type})`,
      changes: { before: existing },
    });

    return { success: true };
  }

  async testConnection(
    id: string, 
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string,
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    const config = integration.config as Record<string, any>;
    const typeMeta = INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES];
    
    if (!typeMeta) {
      return { success: false, message: 'Unknown integration type' };
    }

    // Check if required fields are present
    const missingFields = typeMeta.configFields
      .filter((f) => f.required && !config[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      await this.prisma.integration.update({
        where: { id },
        data: {
          status: IntegrationStatus.pending_setup,
          lastSyncError: `Missing required fields: ${missingFields.join(', ')}`,
        },
      });
      
      return {
        success: false,
        message: `Missing required configuration: ${missingFields.join(', ')}`,
      };
    }

    // Test connection based on integration type
    let result: { success: boolean; message: string; details?: any };

    try {
      switch (integration.type) {
        case 'jamf':
          result = await this.jamfConnector.testConnection({
            serverUrl: config.serverUrl,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
          });
          break;
        
        // Add other integration types here as they are implemented
        default:
          // For unimplemented types, just validate config exists
          result = { success: true, message: 'Configuration validated (connector not yet implemented)' };
      }
    } catch (error: any) {
      this.logger.error(`Connection test failed for ${integration.type}`, error);
      result = { success: false, message: error.message || 'Connection test failed' };
    }

    // Update integration status based on result
    await this.prisma.integration.update({
      where: { id },
      data: {
        status: result.success ? IntegrationStatus.active : IntegrationStatus.error,
        lastSyncError: result.success ? null : result.message,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      userName,
      action: 'tested',
      entityType: 'integration',
      entityId: integration.id,
      entityName: integration.name,
      description: `Tested connection for integration "${integration.name}" - ${result.success ? 'Success' : 'Failed'}`,
      metadata: { success: result.success, message: result.message },
    });

    return result;
  }

  async triggerSync(
    id: string, 
    organizationId: string, 
    userId: string,
    userEmail?: string,
    userName?: string,
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    if (integration.status !== IntegrationStatus.active) {
      throw new BadRequestException('Integration must be active to sync. Please test the connection first.');
    }

    const config = integration.config as Record<string, any>;

    // Create a sync job
    const syncJob = await this.prisma.syncJob.create({
      data: {
        integrationId: id,
        organizationId,
        status: AlertJobStatus.running,
        triggeredBy: 'manual',
        startedAt: new Date(),
      },
    });

    try {
      let syncResult: any;
      let itemsProcessed = 0;
      let evidenceCreated = 0;

      switch (integration.type) {
        case 'jamf':
          this.logger.log(`Starting Jamf sync for integration ${id}`);
          syncResult = await this.jamfConnector.sync({
            serverUrl: config.serverUrl,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
          });
          
          itemsProcessed = syncResult.computers.total + syncResult.mobileDevices.total;
          
          // Create evidence records for the sync results
          evidenceCreated = await this.createJamfEvidence(organizationId, userId, integration.id, syncResult);
          break;

        default:
          syncResult = { message: 'Sync not implemented for this integration type' };
      }

      // Update sync job as completed
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: AlertJobStatus.completed,
          completedAt: new Date(),
          itemsProcessed,
          evidenceCreated,
          logs: [
            { timestamp: new Date().toISOString(), message: 'Sync started' },
            { timestamp: new Date().toISOString(), message: `Processed ${itemsProcessed} items` },
            { timestamp: new Date().toISOString(), message: `Created ${evidenceCreated} evidence records` },
            { timestamp: new Date().toISOString(), message: 'Sync completed successfully' },
          ],
        },
      });

      // Update integration
      await this.prisma.integration.update({
        where: { id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: AlertJobStatus.completed,
          lastSyncError: null,
          totalEvidenceCollected: { increment: evidenceCreated },
          lastEvidenceAt: evidenceCreated > 0 ? new Date() : undefined,
        },
      });

      // Audit log success
      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'synced',
        entityType: 'integration',
        entityId: integration.id,
        entityName: integration.name,
        description: `Synced integration "${integration.name}" - ${itemsProcessed} items processed, ${evidenceCreated} evidence records created`,
        metadata: {
          jobId: syncJob.id,
          itemsProcessed,
          evidenceCreated,
          syncResult: { ...syncResult, devices: undefined }, // Don't log full device list
        },
      });

      return {
        success: true,
        jobId: syncJob.id,
        message: `Sync completed: ${itemsProcessed} items processed, ${evidenceCreated} evidence records created`,
        data: syncResult,
      };

    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${id}`, error);

      // Update sync job as failed
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: AlertJobStatus.failed,
          completedAt: new Date(),
          error: error.message,
          logs: [
            { timestamp: new Date().toISOString(), message: 'Sync started' },
            { timestamp: new Date().toISOString(), message: `Error: ${error.message}` },
          ],
        },
      });

      // Update integration status
      await this.prisma.integration.update({
        where: { id },
        data: {
          lastSyncStatus: AlertJobStatus.failed,
          lastSyncError: error.message,
        },
      });

      // Audit log failure
      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        userName,
        action: 'synced',
        entityType: 'integration',
        entityId: integration.id,
        entityName: integration.name,
        description: `Sync failed for integration "${integration.name}" - ${error.message}`,
        metadata: {
          jobId: syncJob.id,
          success: false,
          error: error.message,
        },
      });

      // Notify about sync failure
      await this.notificationsService.create({
        organizationId,
        userId: integration.createdBy,
        type: NotificationType.INTEGRATION_SYNC_FAILED,
        title: 'Integration Sync Failed',
        message: `Sync failed for "${integration.name}": ${error.message}`,
        entityType: 'integration',
        entityId: integration.id,
        severity: NotificationSeverity.ERROR,
        metadata: {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationType: integration.type,
          error: error.message,
          jobId: syncJob.id,
        },
      });

      return {
        success: false,
        jobId: syncJob.id,
        message: `Sync failed: ${error.message}`,
      };
    }
  }

  /**
   * Create evidence records from Jamf sync results
   */
  private async createJamfEvidence(
    organizationId: string,
    userId: string,
    integrationId: string,
    syncResult: any
  ): Promise<number> {
    let created = 0;
    const timestamp = Date.now();

    // Create device inventory evidence
    if (syncResult.computers.total > 0 || syncResult.mobileDevices.total > 0) {
      const inventoryData = {
        collectedAt: syncResult.collectedAt,
        computers: syncResult.computers,
        mobileDevices: syncResult.mobileDevices,
      };
      const inventoryJson = JSON.stringify(inventoryData, null, 2);
      const inventoryPath = `integrations/jamf/${integrationId}/inventory-${timestamp}.json`;
      
      // Actually save the file to storage
      await this.storage.upload(
        Buffer.from(inventoryJson, 'utf-8'),
        inventoryPath,
        { contentType: 'application/json' },
      );

      await this.prisma.evidence.create({
        data: {
          organizationId,
          title: `Jamf Device Inventory - ${new Date().toLocaleDateString()}`,
          description: `Device inventory collected from Jamf Pro. ${syncResult.computers.total} computers, ${syncResult.mobileDevices.total} mobile devices.`,
          type: 'automated',
          source: 'jamf',
          status: EvidenceStatus.approved,
          filename: `jamf-inventory-${timestamp}.json`,
          mimeType: 'application/json',
          size: inventoryJson.length,
          storagePath: inventoryPath,
          metadata: {
            integrationId,
            syncType: 'device_inventory',
            computerCount: syncResult.computers.total,
            mobileDeviceCount: syncResult.mobileDevices.total,
            managedComputers: syncResult.computers.managed,
            managedMobileDevices: syncResult.mobileDevices.managed,
          },
          collectedAt: new Date(),
          validFrom: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
      created++;
    }

    // Create security configuration evidence
    if (syncResult.securitySummary) {
      const securityData = {
        collectedAt: syncResult.collectedAt,
        summary: syncResult.securitySummary,
        totalComputers: syncResult.computers.total,
        compliantComputers: syncResult.computers.compliant,
        complianceRate: syncResult.computers.total > 0 
          ? Math.round((syncResult.computers.compliant / syncResult.computers.total) * 100) 
          : 0,
        // Include per-device security details for audit
        deviceDetails: syncResult.computers.devices?.map((d: any) => ({
          name: d.name,
          serialNumber: d.serialNumber,
          security: d.security,
        })) || [],
      };
      const securityJson = JSON.stringify(securityData, null, 2);
      const securityPath = `integrations/jamf/${integrationId}/security-${timestamp}.json`;
      
      // Actually save the file to storage
      await this.storage.upload(
        Buffer.from(securityJson, 'utf-8'),
        securityPath,
        { contentType: 'application/json' },
      );

      await this.prisma.evidence.create({
        data: {
          organizationId,
          title: `Jamf Security Configuration - ${new Date().toLocaleDateString()}`,
          description: `Security configuration status from Jamf Pro. FileVault: ${syncResult.securitySummary.fileVaultEnabled}/${syncResult.computers.total} enabled, SIP: ${syncResult.securitySummary.sipEnabled}/${syncResult.computers.total} enabled, Gatekeeper: ${syncResult.securitySummary.gatekeeperEnabled}/${syncResult.computers.total} enabled.`,
          type: 'automated',
          source: 'jamf',
          status: EvidenceStatus.approved,
          filename: `jamf-security-${timestamp}.json`,
          mimeType: 'application/json',
          size: securityJson.length,
          storagePath: securityPath,
          metadata: {
            integrationId,
            syncType: 'security_configuration',
            ...syncResult.securitySummary,
            totalComputers: syncResult.computers.total,
            compliantComputers: syncResult.computers.compliant,
            complianceRate: syncResult.computers.total > 0 
              ? Math.round((syncResult.computers.compliant / syncResult.computers.total) * 100) 
              : 0,
          },
          collectedAt: new Date(),
          validFrom: new Date(),
          createdBy: userId,
          updatedBy: userId,
          tags: ['jamf', 'security', 'endpoint', 'encryption', 'compliance'],
        },
      });
      created++;
    }

    return created;
  }

  async getStats(organizationId: string) {
    const [total, byStatus, byType, totalEvidence] = await Promise.all([
      this.prisma.integration.count({ where: { organizationId } }),
      this.prisma.integration.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.integration.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.integration.aggregate({
        where: { organizationId },
        _sum: { totalEvidenceCollected: true },
      }),
    ]);

    const statusCounts = byStatus.reduce(
      (acc, item) => ({ ...acc, [item.status]: item._count }),
      { active: 0, inactive: 0, error: 0, pending_setup: 0 }
    );

    return {
      total,
      byStatus: statusCounts,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: item._count }), {}),
      totalEvidenceCollected: totalEvidence._sum.totalEvidenceCollected || 0,
    };
  }

  async getTypeMetadata() {
    return INTEGRATION_TYPES;
  }

  // Helper to mask sensitive values in config
  private maskSensitiveConfig(type: string, config: Record<string, any>): Record<string, any> {
    if (!config) return {};
    
    const typeMeta = INTEGRATION_TYPES[type as keyof typeof INTEGRATION_TYPES];
    if (!typeMeta) return config;

    const masked = { ...config };
    for (const field of typeMeta.configFields) {
      if (field.type === 'password' && masked[field.key]) {
        // Show only last 4 characters
        const value = String(masked[field.key]);
        masked[field.key] = value.length > 4 
          ? '••••••••' + value.slice(-4) 
          : '••••••••';
      }
    }
    return masked;
  }
}

