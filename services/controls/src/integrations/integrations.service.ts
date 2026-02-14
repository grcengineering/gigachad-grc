import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { isSafePropertyName, safePropertySet, SecretsService } from '@gigachad-grc/shared';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
import { IntegrationStatus, AlertJobStatus, EvidenceStatus, Prisma } from '@prisma/client';
import {
  CreateIntegrationDto,
  UpdateIntegrationDto,
  IntegrationFilterDto,
  INTEGRATION_TYPES,
} from './dto/integration.dto';
import { ConnectorFactory } from './connectors/connector.factory';
import { ZipSyncResult } from './connectors/zip.connector';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';

/**
 * Interface for sync results from connectors
 * @remarks Using index signature with any to allow flexible access to connector-specific properties
 */
export interface SyncResult {
  summary?: { totalRecords?: number };
  computers?: { total?: number; managed?: number; compliant?: number; devices?: unknown[] };
  mobileDevices?: { total?: number; managed?: number };
  suppliers?: { total?: number; items?: unknown[] };
  securitySummary?: { fileVaultEnabled?: number; sipEnabled?: number; gatekeeperEnabled?: number };
  collectedAt?: string;
  // AWS/Security-related properties
  securityHub?: { totalFindings?: number; criticalCount?: number; highCount?: number };
  iam?: { users?: unknown[] };
  config?: { compliancePercentage?: number };
  // Identity provider properties
  users?: { total?: number; withMFA?: number; noMFA?: number };
  groups?: { total?: number; withPolicy?: number };
  apps?: { total?: number };
  applications?: { total?: number };
  // GitHub properties
  repositories?: { total?: number; private?: number; protected?: number };
  securityAlerts?: { total?: number; critical?: number };
  branchProtection?: { protected?: number };
  // CrowdStrike properties
  devices?: { total?: number; online?: number };
  detections?: { total?: number; critical?: number };
  protectionPercentage?: number;
  // Jira properties
  projects?: { total?: number; openIssues?: number; overdueIssues?: number };
  issues?: { total?: number; open?: number };
  securityIssues?: { total?: number };
  // Snyk properties
  vulnerabilities?: { total?: number; critical?: number; high?: number; fixable?: number };
  orgs?: { total?: number };
  policies?: { total?: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Sensitive fields that should be encrypted
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'secretKey',
  'secret_key',
  'secretAccessKey',
  'password',
  'token',
  'accessToken',
  'access_token',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
  'bearerToken',
  'bearer_token',
  'refreshToken',
  'refresh_token',
  'credentials',
  'authToken',
  'auth_token',
];

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly connectorFactory: ConnectorFactory;
  private readonly encryptionKey: string;

  private validateEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        'ENCRYPTION_KEY environment variable is required for secure credential storage'
      );
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    return key;
  }
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
    private secretsService: SecretsService
  ) {
    this.connectorFactory = new ConnectorFactory();
    this.encryptionKey = this.validateEncryptionKey();
  }

  /** Secret reference URI prefix for externally-stored integration credentials */
  private readonly SECRETS_PREFIX = 'secrets://';
  /** Legacy prefix for backwards compatibility with existing database values */
  private readonly LEGACY_SECRETS_PREFIX = 'infisical://';

  /**
   * Generate an opaque secret name for an integration field
   */
  private secretRefName(organizationId: string, integrationId: string, fieldName: string): string {
    return `int_${organizationId.slice(0, 8)}_${integrationId.slice(0, 8)}_${fieldName}`;
  }

  /**
   * Secret path for integration credentials
   */
  private secretRefPath(organizationId: string): string {
    return `/integrations/${organizationId}`;
  }

  /**
   * Store a sensitive field in the secrets manager and return a reference string
   */
  private async storeInSecretsManager(
    organizationId: string,
    integrationId: string,
    fieldName: string,
    value: string
  ): Promise<string> {
    const secretName = this.secretRefName(organizationId, integrationId, fieldName);
    const secretPath = this.secretRefPath(organizationId);
    await this.secretsService.setSecret(secretName, value, secretPath);
    return `${this.SECRETS_PREFIX}${secretName}`;
  }

  /**
   * Retrieve a sensitive field from the secrets manager by its reference string
   */
  private async fetchFromSecretsManager(
    reference: string,
    organizationId: string
  ): Promise<string | undefined> {
    const secretName = reference
      .replace(this.SECRETS_PREFIX, '')
      .replace(this.LEGACY_SECRETS_PREFIX, '');
    const secretPath = this.secretRefPath(organizationId);
    return this.secretsService.getSecret(secretName, secretPath);
  }

  /**
   * Check if a value is a secrets manager reference (current or legacy prefix)
   */
  private isSecretsRef(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      (value.startsWith(this.SECRETS_PREFIX) || value.startsWith(this.LEGACY_SECRETS_PREFIX))
    );
  }

  /**
   * Clean up secrets manager entries for a deleted integration
   */
  private async cleanupSecrets(
    organizationId: string,
    integrationId: string,
    config: Record<string, unknown>
  ): Promise<void> {
    if (!this.secretsService.isEnabled()) return;

    for (const [key, value] of Object.entries(config)) {
      if (this.isSecretsRef(value)) {
        try {
          const secretName = (value as string)
            .replace(this.SECRETS_PREFIX, '')
            .replace(this.LEGACY_SECRETS_PREFIX, '');
          const secretPath = this.secretRefPath(organizationId);
          await this.secretsService.deleteSecret(secretName, secretPath);
        } catch (error) {
          this.logger.warn(`Failed to cleanup secret for ${key}: ${error}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        await this.cleanupSecrets(organizationId, integrationId, value as Record<string, unknown>);
      }
    }
  }
  // ============================================
  // Encryption/Decryption for Sensitive Data
  // ============================================

  /**
   * Check if a string value is already in our encrypted format (iv:authTag:salt:encrypted or legacy iv:authTag:encrypted).
   * Used to prevent double-encryption when the frontend sends back encrypted values.
   */
  private isEncryptedFormat(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    const parts = value.split(':');
    const hexPattern = /^[0-9a-f]+$/i;
    if (parts.length === 4) {
      // New format: iv(32 hex chars):authTag(32):salt(32):encrypted(hex)
      return (
        parts[0].length === 32 &&
        parts[1].length === 32 &&
        parts[2].length === 32 &&
        parts[3].length > 0 &&
        hexPattern.test(parts[0]) &&
        hexPattern.test(parts[1]) &&
        hexPattern.test(parts[2]) &&
        hexPattern.test(parts[3])
      );
    }
    if (parts.length === 3) {
      // Legacy format: iv(32):authTag(32):encrypted(hex)
      return (
        parts[0].length === 32 &&
        parts[1].length === 32 &&
        parts[2].length > 0 &&
        hexPattern.test(parts[0]) &&
        hexPattern.test(parts[1]) &&
        hexPattern.test(parts[2])
      );
    }
    return false;
  }

  private encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    // SECURITY FIX: Generate random salt per encryption instead of using hardcoded salt
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, salt, 32);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:salt:encrypted (new format with salt)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string, depth = 0): string {
    if (!encryptedText) return encryptedText;
    // Guard against infinite recursion (max 3 layers should be more than enough)
    if (depth > 3) return encryptedText;

    try {
      const parts = encryptedText.split(':');

      let decrypted: string;

      // Support both old format (3 parts: iv:authTag:encrypted) and new format (4 parts: iv:authTag:salt:encrypted)
      if (parts.length === 3) {
        // Legacy format without salt - use hardcoded salt for backwards compatibility
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32); // Legacy salt

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      } else if (parts.length === 4) {
        // New format with random salt
        const [ivHex, authTagHex, saltHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const salt = Buffer.from(saltHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, salt, 32);

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);

        decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      } else {
        // Not encrypted or invalid format
        return encryptedText;
      }

      // Handle double-encrypted values: if decrypted result is still in encrypted format,
      // decrypt again. This can happen when the frontend sends back raw encrypted values
      // that get re-encrypted on update.
      if (this.isEncryptedFormat(decrypted)) {
        this.logger.warn('Detected double-encrypted value, decrypting inner layer');
        return this.decrypt(decrypted, depth + 1);
      }

      return decrypted;
    } catch {
      this.logger.warn('Failed to decrypt value, returning as-is');
      return encryptedText;
    }
  }

  /**
   * Encrypt sensitive fields in config object before storing.
   * When a secrets provider is enabled, stores sensitive fields there and saves a reference.
   * Falls back to local AES-256-GCM encryption otherwise.
   */
  private async encryptConfigAsync(
    config: Record<string, unknown>,
    organizationId: string,
    integrationId: string
  ): Promise<Record<string, unknown>> {
    if (!config) return config;

    const encrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      // SECURITY: Skip blocked property names to prevent prototype pollution
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in encryptConfig: ${key}`);
        continue;
      }

      if (Array.isArray(value)) {
        // Preserve arrays as-is (e.g., evidenceTypes)
        safePropertySet(encrypted, key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively encrypt nested objects
        safePropertySet(
          encrypted,
          key,
          await this.encryptConfigAsync(
            value as Record<string, unknown>,
            organizationId,
            integrationId
          )
        );
      } else if (
        typeof value === 'string' &&
        SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        // Skip already-encrypted values to prevent double encryption
        // (can happen when frontend sends back raw encrypted values on update)
        if (this.isEncryptedFormat(value)) {
          safePropertySet(encrypted, key, value);
        } else if (this.isSecretsRef(value)) {
          // Preserve existing secrets manager references
          safePropertySet(encrypted, key, value);
        } else if (this.secretsService.isEnabled()) {
          // Store in secrets manager if available, otherwise encrypt locally
          try {
            const ref = await this.storeInSecretsManager(organizationId, integrationId, key, value);
            safePropertySet(encrypted, key, ref);
          } catch (error) {
            this.logger.warn(
              `Failed to store ${key} in secrets manager, falling back to local encryption: ${error}`
            );
            safePropertySet(encrypted, key, this.encrypt(value));
          }
        } else {
          safePropertySet(encrypted, key, this.encrypt(value));
        }
      } else {
        safePropertySet(encrypted, key, value);
      }
    }

    return encrypted;
  }

  /**
   * Synchronous encrypt for backward compatibility (no external secrets manager).
   */
  private encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
    if (!config) return config;

    const encrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in encryptConfig: ${key}`);
        continue;
      }

      if (Array.isArray(value)) {
        // Preserve arrays as-is (e.g., evidenceTypes)
        safePropertySet(encrypted, key, value);
      } else if (typeof value === 'object' && value !== null) {
        safePropertySet(encrypted, key, this.encryptConfig(value as Record<string, unknown>));
      } else if (
        typeof value === 'string' &&
        SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        // Skip already-encrypted values to prevent double encryption
        if (this.isEncryptedFormat(value)) {
          safePropertySet(encrypted, key, value);
        } else {
          safePropertySet(encrypted, key, this.encrypt(value));
        }
      } else {
        safePropertySet(encrypted, key, value);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in config object for internal use.
   * Supports both secrets manager references (secrets://... or infisical://...) and local encrypted values.
   */
  private async decryptConfigAsync(
    config: Record<string, unknown>,
    organizationId: string
  ): Promise<Record<string, unknown>> {
    if (!config) return config;

    const decrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      // SECURITY: Skip blocked property names to prevent prototype pollution
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in decryptConfig: ${key}`);
        continue;
      }

      if (Array.isArray(value)) {
        // Preserve arrays as-is (e.g., evidenceTypes)
        safePropertySet(decrypted, key, value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively decrypt nested objects
        safePropertySet(
          decrypted,
          key,
          await this.decryptConfigAsync(value as Record<string, unknown>, organizationId)
        );
      } else if (this.isSecretsRef(value)) {
        // Fetch from secrets manager
        try {
          const fetched = await this.fetchFromSecretsManager(value, organizationId);
          safePropertySet(decrypted, key, fetched || value);
        } catch (error) {
          this.logger.warn(`Failed to fetch ${key} from secrets manager: ${error}`);
          safePropertySet(decrypted, key, value);
        }
      } else if (
        typeof value === 'string' &&
        SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        // Decrypt locally (legacy or fallback)
        safePropertySet(decrypted, key, this.decrypt(value));
      } else {
        safePropertySet(decrypted, key, value);
      }
    }

    return decrypted;
  }

  /**
   * Synchronous decrypt for backward compatibility (no secrets manager refs).
   */
  private decryptConfig(config: Record<string, unknown>): Record<string, unknown> {
    if (!config) return config;

    const decrypted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (!isSafePropertyName(key)) {
        this.logger.warn(`Skipping blocked property name in decryptConfig: ${key}`);
        continue;
      }

      if (Array.isArray(value)) {
        // Preserve arrays as-is (e.g., evidenceTypes)
        safePropertySet(decrypted, key, value);
      } else if (typeof value === 'object' && value !== null) {
        safePropertySet(decrypted, key, this.decryptConfig(value as Record<string, unknown>));
      } else if (
        typeof value === 'string' &&
        SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))
      ) {
        safePropertySet(decrypted, key, this.decrypt(value));
      } else {
        safePropertySet(decrypted, key, value);
      }
    }

    return decrypted;
  }

  async findAll(organizationId: string, filters: IntegrationFilterDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.IntegrationWhereInput = { organizationId };

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
      config: this.maskSensitiveConfig(
        integration.type,
        integration.config as Record<string, unknown>
      ),
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
      config: this.maskSensitiveConfig(
        integration.type,
        integration.config as Record<string, unknown>
      ),
    };
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateIntegrationDto,
    userEmail?: string,
    userName?: string
  ) {
    // Validate integration type
    if (!INTEGRATION_TYPES[dto.type as keyof typeof INTEGRATION_TYPES]) {
      throw new BadRequestException(`Invalid integration type: ${dto.type}`);
    }

    // Generate a temporary ID for secrets path (will be replaced with actual ID)
    const tempId = crypto.randomUUID();

    // Encrypt sensitive fields in config before storing (uses secrets manager when available)
    const encryptedConfig = dto.config
      ? await this.encryptConfigAsync(dto.config, organizationId, tempId)
      : {};

    const integration = await this.prisma.integration.create({
      data: {
        organizationId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        config: encryptedConfig as Prisma.InputJsonValue,
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
    userName?: string
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Integration not found');
    }

    // Merge config if provided (don't overwrite entire config)
    let newConfig = existing.config as Record<string, unknown>;
    if (dto.config) {
      // Encrypt sensitive fields in the new config before merging (uses secrets manager when available)
      const encryptedNewConfig = await this.encryptConfigAsync(dto.config, organizationId, id);
      newConfig = { ...newConfig, ...encryptedNewConfig };
    }

    const integration = await this.prisma.integration.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        config: newConfig as Prisma.InputJsonValue,
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
        before: {
          name: existing.name,
          status: existing.status,
          syncFrequency: existing.syncFrequency,
        },
        after: {
          name: integration.name,
          status: integration.status,
          syncFrequency: integration.syncFrequency,
        },
      },
    });

    return {
      ...integration,
      typeMeta: INTEGRATION_TYPES[integration.type as keyof typeof INTEGRATION_TYPES] || null,
      config: this.maskSensitiveConfig(
        integration.type,
        integration.config as Record<string, unknown>
      ),
    };
  }

  async delete(
    id: string,
    organizationId: string,
    userId?: string,
    userEmail?: string,
    userName?: string
  ) {
    const existing = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Integration not found');
    }

    // Clean up externally-stored secrets for this integration
    if (existing.config && this.secretsService.isEnabled()) {
      await this.cleanupSecrets(organizationId, id, existing.config as Record<string, unknown>);
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
    userName?: string
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Decrypt config for use in connection testing (supports secrets manager refs)
    const rawConfig = await this.decryptConfigAsync(
      integration.config as Record<string, unknown>,
      organizationId
    );

    // Flatten credentials into top-level config so connectors can access fields
    // directly (quick setup stores them under config.credentials)
    const credentials = rawConfig.credentials as Record<string, unknown> | undefined;
    const flattened = credentials ? { ...rawConfig, ...credentials } : { ...rawConfig };

    // Map common field aliases (quick setup may use different names than configFields)
    if (flattened.baseUrl && !flattened.siteUrl) {
      flattened.siteUrl = flattened.baseUrl;
    }

    const config = flattened;

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

    // Use the ConnectorFactory to test connection for all integration types
    const result = await this.connectorFactory.testConnection(integration.type, config);

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
    userName?: string
  ) {
    const integration = await this.prisma.integration.findFirst({
      where: { id, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    if (integration.status !== IntegrationStatus.active) {
      throw new BadRequestException(
        'Integration must be active to sync. Please test the connection first.'
      );
    }

    // Decrypt config for use in sync operations (supports secrets manager refs)
    const config = await this.decryptConfigAsync(
      integration.config as Record<string, unknown>,
      organizationId
    );

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
      let itemsProcessed = 0;
      let evidenceCreated = 0;

      this.logger.log(`Starting sync for ${integration.type} integration ${id}`);

      // Use the ConnectorFactory to sync all integration types
      const syncResult = (await this.connectorFactory.sync(integration.type, config)) as SyncResult;

      // Calculate items processed from sync result
      if (syncResult.summary) {
        itemsProcessed = syncResult.summary.totalRecords || 0;
      } else if (syncResult.computers || syncResult.mobileDevices) {
        itemsProcessed =
          (syncResult.computers?.total || 0) + (syncResult.mobileDevices?.total || 0);
      } else if (syncResult.suppliers) {
        itemsProcessed = syncResult.suppliers?.total || 0;
      }

      // Create evidence records
      evidenceCreated = await this.createGenericEvidence(
        organizationId,
        userId,
        integration.id,
        integration.type,
        syncResult
      );
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
            {
              timestamp: new Date().toISOString(),
              message: `Created ${evidenceCreated} evidence records`,
            },
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Sync failed for integration ${id}`, error);

      // Update sync job as failed
      await this.prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: AlertJobStatus.failed,
          completedAt: new Date(),
          error: errorMessage,
          logs: [
            { timestamp: new Date().toISOString(), message: 'Sync started' },
            { timestamp: new Date().toISOString(), message: `Error: ${errorMessage}` },
          ],
        },
      });

      // Update integration status
      await this.prisma.integration.update({
        where: { id },
        data: {
          lastSyncStatus: AlertJobStatus.failed,
          lastSyncError: errorMessage,
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
        description: `Sync failed for integration "${integration.name}" - ${errorMessage}`,
        metadata: {
          jobId: syncJob.id,
          success: false,
          error: errorMessage,
        },
      });

      // Notify about sync failure
      await this.notificationsService.create({
        organizationId,
        userId: integration.createdBy,
        type: NotificationType.INTEGRATION_SYNC_FAILED,
        title: 'Integration Sync Failed',
        message: `Sync failed for "${integration.name}": ${errorMessage}`,
        entityType: 'integration',
        entityId: integration.id,
        severity: NotificationSeverity.ERROR,
        metadata: {
          integrationId: integration.id,
          integrationName: integration.name,
          integrationType: integration.type,
          error: errorMessage,
          jobId: syncJob.id,
        },
      });

      return {
        success: false,
        jobId: syncJob.id,
        message: `Sync failed: ${errorMessage}`,
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
    syncResult: SyncResult
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
      await this.storage.upload(Buffer.from(inventoryJson, 'utf-8'), inventoryPath, {
        contentType: 'application/json',
      });

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
        complianceRate:
          syncResult.computers.total > 0
            ? Math.round((syncResult.computers.compliant / syncResult.computers.total) * 100)
            : 0,
        // Include per-device security details for audit
        deviceDetails:
          (
            (syncResult.computers as Record<string, unknown>)?.devices as Array<
              Record<string, unknown>
            >
          )?.map((d) => ({
            name: d.name,
            serialNumber: d.serialNumber,
            security: d.security,
          })) || [],
      };
      const securityJson = JSON.stringify(securityData, null, 2);
      const securityPath = `integrations/jamf/${integrationId}/security-${timestamp}.json`;

      // Actually save the file to storage
      await this.storage.upload(Buffer.from(securityJson, 'utf-8'), securityPath, {
        contentType: 'application/json',
      });

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
            complianceRate:
              syncResult.computers.total > 0
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

  /**
   * Create evidence records for generic integration sync results
   */
  private async createGenericEvidence(
    organizationId: string,
    userId: string,
    integrationId: string,
    integrationType: string,
    syncResult: SyncResult
  ): Promise<number> {
    const timestamp = Date.now();
    let created = 0;

    // Create a comprehensive evidence record for the sync
    const evidenceData = {
      collectedAt: syncResult.collectedAt || new Date().toISOString(),
      integrationType,
      summary: this.generateSyncSummary(integrationType, syncResult),
      data: syncResult,
    };

    const evidenceJson = JSON.stringify(evidenceData, null, 2);
    const storagePath = `integrations/${integrationType}/${integrationId}/sync-${timestamp}.json`;

    try {
      // Save to storage
      await this.storage.upload(Buffer.from(evidenceJson, 'utf-8'), storagePath, {
        contentType: 'application/json',
      });

      // Create evidence record
      await this.prisma.evidence.create({
        data: {
          organizationId,
          title: `${this.getIntegrationDisplayName(integrationType)} Evidence - ${new Date().toLocaleDateString()}`,
          description: this.generateEvidenceDescription(integrationType, syncResult),
          type: 'automated',
          source: integrationType,
          status: EvidenceStatus.approved,
          filename: `${integrationType}-sync-${timestamp}.json`,
          mimeType: 'application/json',
          size: evidenceJson.length,
          storagePath,
          metadata: {
            integrationId,
            integrationType,
            syncTimestamp: timestamp,
            ...this.extractMetadata(integrationType, syncResult),
          },
          collectedAt: new Date(),
          validFrom: new Date(),
          createdBy: userId,
          updatedBy: userId,
          tags: [integrationType, 'automated', 'integration-sync'],
        },
      });
      created++;
    } catch (error) {
      this.logger.error(`Failed to create evidence for ${integrationType}: ${error}`);
    }

    return created;
  }

  /**
   * Generate sync summary based on integration type
   */
  private generateSyncSummary(integrationType: string, syncResult: SyncResult): string {
    switch (integrationType) {
      case 'aws':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return `AWS: ${syncResult.securityHub?.totalFindings || 0} Security Hub findings, ${(syncResult.iam as any)?.users?.length || 0} IAM users, ${syncResult.config?.compliancePercentage || 0}% Config compliance`;
      case 'okta':
        return `Okta: ${syncResult.users?.total || 0} users (${syncResult.users?.withMFA || 0} with MFA), ${syncResult.applications?.total || 0} applications`;
      case 'github':
        return `GitHub: ${syncResult.repositories?.total || 0} repos, ${syncResult.securityAlerts?.total || 0} security alerts, ${syncResult.branchProtection?.protected || 0} protected branches`;
      case 'crowdstrike':
        return `CrowdStrike: ${syncResult.devices?.total || 0} devices (${syncResult.devices?.online || 0} online), ${syncResult.detections?.total || 0} detections`;
      case 'jira':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return `Jira: ${(syncResult.issues as any)?.total || 0} issues (${(syncResult.issues as any)?.open || 0} open), ${(syncResult.securityIssues as any)?.total || 0} security-related`;
      case 'snyk':
        return `Snyk: ${syncResult.projects?.total || 0} projects, ${syncResult.vulnerabilities?.total || 0} vulnerabilities (${syncResult.vulnerabilities?.critical || 0} critical)`;
      default:
        return `Collected data from ${integrationType}`;
    }
  }

  /**
   * Generate evidence description based on integration type
   */
  private generateEvidenceDescription(
    integrationType: string,
    _syncResult: Record<string, unknown>
  ): string {
    const summaries: Record<string, string> = {
      aws: `AWS security and compliance data including Security Hub findings, IAM users and roles, S3 bucket configurations, and AWS Config compliance status.`,
      okta: `Identity and access management data from Okta including user directory, MFA status, application assignments, and security event logs.`,
      github: `DevSecOps evidence from GitHub including repository security settings, Dependabot alerts, code scanning results, and secret scanning status.`,
      crowdstrike: `Endpoint security data from CrowdStrike Falcon including device inventory, threat detections, and vulnerability assessments.`,
      jira: `IT operations and security task tracking from Jira including issue metrics, security-related tickets, and SLA compliance.`,
      snyk: `Security scanning results from Snyk including open source vulnerabilities, license compliance, and container security findings.`,
    };
    return summaries[integrationType] || `Evidence collected from ${integrationType} integration.`;
  }

  /**
   * Get display name for integration type
   */
  private getIntegrationDisplayName(integrationType: string): string {
    const names: Record<string, string> = {
      aws: 'AWS Security',
      okta: 'Okta Identity',
      github: 'GitHub Security',
      crowdstrike: 'CrowdStrike Falcon',
      jira: 'Jira IT Operations',
      snyk: 'Snyk Security Scanning',
      jamf: 'Jamf Pro',
      ziphq: 'Zip Procurement',
    };
    return names[integrationType] || integrationType;
  }

  /**
   * Extract relevant metadata based on integration type
   */
  private extractMetadata(
    integrationType: string,
    syncResult: SyncResult
  ): Record<string, unknown> {
    switch (integrationType) {
      case 'aws':
        return {
          securityHubFindings: syncResult.securityHub?.totalFindings || 0,
          criticalFindings: syncResult.securityHub?.criticalCount || 0,
          highFindings: syncResult.securityHub?.highCount || 0,
          iamUsers: syncResult.iam?.users?.length || 0,
          configCompliance: syncResult.config?.compliancePercentage || 0,
        };
      case 'okta':
        return {
          totalUsers: syncResult.users?.total || 0,
          usersWithMFA: syncResult.users?.withMFA || 0,
          usersWithoutMFA: syncResult.users?.noMFA || 0,
          applications: syncResult.applications?.total || 0,
          securityEvents: syncResult.securityEvents?.total || 0,
        };
      case 'github':
        return {
          repositories: syncResult.repositories?.total || 0,
          privateRepos: syncResult.repositories?.private || 0,
          protectedBranches: syncResult.branchProtection?.protected || 0,
          securityAlerts: syncResult.securityAlerts?.total || 0,
          criticalAlerts: syncResult.securityAlerts?.critical || 0,
        };
      case 'crowdstrike':
        return {
          totalDevices: syncResult.devices?.total || 0,
          onlineDevices: syncResult.devices?.online || 0,
          detections: syncResult.detections?.total || 0,
          criticalDetections: syncResult.detections?.critical || 0,
          protectionRate: syncResult.prevention?.protectionPercentage || 0,
        };
      case 'jira': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jiraIssues = syncResult.issues as any;
        return {
          totalIssues: jiraIssues?.total || 0,
          openIssues: jiraIssues?.openIssues || jiraIssues?.open || 0,
          overdueIssues: jiraIssues?.overdueIssues || 0,
          securityIssues: syncResult.securityIssues?.total || 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          avgResolutionDays: (syncResult.slaMetrics as any)?.avgResolutionTime || 0,
        };
      }
      case 'snyk':
        return {
          projects: syncResult.projects?.total || 0,
          vulnerabilities: syncResult.vulnerabilities?.total || 0,
          criticalVulns: syncResult.vulnerabilities?.critical || 0,
          highVulns: syncResult.vulnerabilities?.high || 0,
          fixableVulns: syncResult.vulnerabilities?.fixable || 0,
        };
      default:
        return {};
    }
  }

  /**
   * Sync Zip vendors to TPRM service
   */
  private async syncZipVendorsToTPRM(
    organizationId: string,
    userId: string,
    integrationId: string,
    zipResult: ZipSyncResult
  ): Promise<{ created: number; updated: number; skipped: number }> {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const supplier of zipResult.suppliers.items) {
      try {
        // Check if vendor already exists (by vendorId pattern or name)
        const zipVendorId = `zip-${supplier.zipId}`;
        const existingVendor = await this.prisma.vendor.findFirst({
          where: {
            organizationId,
            OR: [
              { vendorId: zipVendorId },
              { name: { equals: supplier.name, mode: 'insensitive' } },
            ],
          },
        });

        // Build certifications array from compliance data
        const certifications: string[] = [];
        if (supplier.soc2Certified) certifications.push('SOC2');
        if (supplier.iso27001Certified) certifications.push('ISO27001');

        if (existingVendor) {
          // Update existing vendor
          await this.prisma.vendor.update({
            where: { id: existingVendor.id },
            data: {
              name: supplier.name,
              legalName: supplier.legalName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: this.mapZipCategory(supplier.category) as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tier: this.determineZipVendorTier(supplier) as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: this.mapZipStatus(supplier.status) as any,
              website: supplier.website,
              primaryContact: supplier.primaryContactName,
              primaryContactEmail: supplier.primaryContactEmail,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              inherentRiskScore: (supplier.riskLevel ?? null) as any,
              certifications,
              tags: ['zip-synced', 'auto-imported'],
              notes: `Last synced from Zip: ${new Date().toISOString()}. Total spend: $${supplier.totalSpend || 0}`,
            },
          });
          updated++;
        } else {
          // Create new vendor
          await this.prisma.vendor.create({
            data: {
              organizationId,
              vendorId: zipVendorId,
              name: supplier.name,
              legalName: supplier.legalName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: this.mapZipCategory(supplier.category) as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tier: this.determineZipVendorTier(supplier) as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: this.mapZipStatus(supplier.status) as any,
              website: supplier.website,
              primaryContact: supplier.primaryContactName,
              primaryContactEmail: supplier.primaryContactEmail,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              inherentRiskScore: (supplier.riskLevel ?? null) as any,
              certifications,
              tags: ['zip-synced', 'auto-imported'],
              notes: `Imported from Zip on ${new Date().toISOString()}. Total spend: $${supplier.totalSpend || 0}`,
              createdBy: userId,
            },
          });
          created++;
        }
      } catch (error) {
        this.logger.warn(`Failed to sync vendor ${supplier.name}: ${error}`);
        skipped++;
      }
    }

    // Audit log the sync
    await this.auditService.log({
      organizationId,
      userId,
      action: 'vendor_sync',
      entityType: 'integration',
      entityId: integrationId,
      description: `Synced ${created + updated} vendors from Zip (created: ${created}, updated: ${updated}, skipped: ${skipped})`,
      metadata: {
        source: 'ziphq',
        created,
        updated,
        skipped,
        totalSuppliers: zipResult.suppliers.total,
      },
    });

    return { created, updated, skipped };
  }

  /**
   * Map Zip category to TPRM category
   */
  private mapZipCategory(category?: string): string {
    if (!category) return 'software_vendor';
    const lower = category.toLowerCase();
    if (lower.includes('software') || lower.includes('saas')) return 'software_vendor';
    if (lower.includes('cloud') || lower.includes('infrastructure')) return 'cloud_provider';
    if (lower.includes('consult')) return 'consultant';
    if (lower.includes('professional') || lower.includes('service')) return 'professional_services';
    if (lower.includes('hardware') || lower.includes('equipment')) return 'hardware_vendor';
    return 'software_vendor';
  }

  /**
   * Determine vendor tier based on Zip data
   */
  private determineZipVendorTier(supplier: { totalSpend?: number; riskLevel?: string }): string {
    const spend = supplier.totalSpend || 0;
    if (spend >= 1000000) return 'tier_1';
    if (spend >= 100000) return 'tier_2';
    if (spend >= 10000) return 'tier_3';
    if (supplier.riskLevel === 'critical' || supplier.riskLevel === 'high') return 'tier_2';
    return 'tier_4';
  }

  /**
   * Map Zip status to TPRM status
   */
  private mapZipStatus(status?: string): string {
    if (!status) return 'active';
    const lower = status.toLowerCase();
    if (lower === 'active' || lower === 'approved') return 'active';
    if (lower === 'inactive') return 'inactive';
    if (lower.includes('pending') || lower.includes('onboarding')) return 'pending_onboarding';
    if (lower === 'blocked' || lower === 'terminated') return 'terminated';
    if (lower.includes('offboarding')) return 'offboarding';
    return 'active';
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

    const statusCounts = byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {
      active: 0,
      inactive: 0,
      error: 0,
      pending_setup: 0,
    });

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
  private maskSensitiveConfig(
    type: string,
    config: Record<string, unknown>
  ): Record<string, unknown> {
    if (!config) return {};

    const typeMeta = INTEGRATION_TYPES[type as keyof typeof INTEGRATION_TYPES];
    if (!typeMeta) return config;

    const passwordFieldKeys = new Set(
      typeMeta.configFields.filter((f) => f.type === 'password').map((f) => f.key)
    );

    const maskValue = (val: unknown): string => {
      const str = String(val);
      return str.length > 4 ? '••••••••' + str.slice(-4) : '••••••••';
    };

    const maskObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result = { ...obj };
      for (const [key, value] of Object.entries(result)) {
        if (passwordFieldKeys.has(key) && value) {
          result[key] = maskValue(value);
        } else if (
          typeof value === 'string' &&
          SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase())) &&
          this.isEncryptedFormat(value)
        ) {
          // Mask any encrypted sensitive field even if not in configFields
          result[key] = '••••••••';
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result[key] = maskObject(value as Record<string, unknown>);
        }
      }
      return result;
    };

    return maskObject(config);
  }
}
