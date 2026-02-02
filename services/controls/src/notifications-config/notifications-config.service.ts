import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  UpdateEmailConfigDto,
  UpdateSlackConfigDto,
  UpdateDefaultNotificationsDto,
  NotificationConfigResponseDto,
  EmailProvider,
} from './dto/notification-config.dto';

@Injectable()
export class NotificationsConfigService {
  private readonly logger = new Logger(NotificationsConfigService.name);
  
  // Encryption key from env or fallback (in production, always use env var)
  private readonly encryptionKey: string;

  private validateEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for secure credential storage');
    }
    if (key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    return key;
  }
  private readonly algorithm = 'aes-256-gcm';

  constructor(private prisma: PrismaService) {
    this.encryptionKey = this.validateEncryptionKey();
  }

  // ============================================
  // Encryption/Decryption Helpers
  // ============================================

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
    
    // New format with salt: iv:authTag:salt:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${salt.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    
    try {
      const parts = encryptedText.split(':');
      
      // Support both old format (3 parts) and new format (4 parts with salt)
      if (parts.length === 3) {
        // Legacy format without salt
        const [ivHex, authTagHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32); // Legacy salt
        
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } else if (parts.length === 4) {
        // New format with random salt
        const [ivHex, authTagHex, saltHex, encrypted] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const salt = Buffer.from(saltHex, 'hex');
        const key = crypto.scryptSync(this.encryptionKey, salt, 32);
        
        const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
      } else {
        return encryptedText; // Not encrypted
      }
    } catch {
      this.logger.warn('Failed to decrypt value, returning as-is');
      return encryptedText;
    }
  }

  private maskSecret(value: string | null | undefined, showLast: number = 4): string | undefined {
    if (!value) return undefined;
    if (value.length <= showLast) return '••••••••';
    return '••••••••' + value.slice(-showLast);
  }

  // ============================================
  // Get Configuration
  // ============================================

  async getConfig(organizationId: string): Promise<NotificationConfigResponseDto> {
    let config = await this.prisma.notificationConfiguration.findUnique({
      where: { organizationId },
    });

    // Create default config if not exists
    if (!config) {
      config = await this.prisma.notificationConfiguration.create({
        data: {
          organizationId,
          emailProvider: 'disabled',
          slackNotificationsEnabled: false,
          defaultNotifications: {
            complianceDrift: { email: true, slack: true, inApp: true },
            evidenceExpiring: { email: true, slack: false, inApp: true },
            assessmentDue: { email: true, slack: true, inApp: true },
            vendorRisk: { email: true, slack: false, inApp: true },
            policyReview: { email: true, slack: false, inApp: true },
            controlFailure: { email: true, slack: true, inApp: true },
            taskAssigned: { email: true, slack: false, inApp: true },
          },
        },
      });
    }

    // Return with masked secrets
    return this.toResponseDto(config);
  }

  private toResponseDto(config: any): NotificationConfigResponseDto {
    const smtpConfig = config.smtpConfig as any;
    const sesConfig = config.sesConfig as any;

    return {
      id: config.id,
      organizationId: config.organizationId,
      emailProvider: config.emailProvider as EmailProvider,
      emailFromAddress: config.emailFromAddress,
      emailFromName: config.emailFromName,
      smtpConfig: smtpConfig ? {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.user,
        password: smtpConfig.password ? '••••••••' : undefined,
        secure: smtpConfig.secure,
      } : undefined,
      sendgridApiKey: this.maskSecret(config.sendgridApiKey),
      sesConfig: sesConfig ? {
        region: sesConfig.region,
        accessKeyId: this.maskSecret(sesConfig.accessKeyId),
        secretAccessKey: sesConfig.secretAccessKey ? '••••••••' : undefined,
      } : undefined,
      slackNotificationsEnabled: config.slackNotificationsEnabled,
      slackWebhookUrl: this.maskSecret(config.slackWebhookUrl),
      slackBotToken: this.maskSecret(config.slackBotToken),
      slackDefaultChannel: config.slackDefaultChannel,
      slackWorkspaceName: config.slackWorkspaceName,
      defaultNotifications: config.defaultNotifications as Record<string, any>,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  // ============================================
  // Update Email Configuration
  // ============================================

  async updateEmailConfig(
    organizationId: string,
    dto: UpdateEmailConfigDto,
  ): Promise<NotificationConfigResponseDto> {
    // Get or create config
    await this.getConfig(organizationId);

    const updateData: any = {
      emailProvider: dto.emailProvider,
      emailFromAddress: dto.emailFromAddress,
      emailFromName: dto.emailFromName,
    };

    // Handle provider-specific config
    if (dto.emailProvider === EmailProvider.SMTP && dto.smtpConfig) {
      updateData.smtpConfig = {
        host: dto.smtpConfig.host,
        port: dto.smtpConfig.port,
        user: dto.smtpConfig.user,
        password: dto.smtpConfig.password ? this.encrypt(dto.smtpConfig.password) : undefined,
        secure: dto.smtpConfig.secure,
      };
      // Clear other provider configs
      updateData.sendgridApiKey = null;
      updateData.sesConfig = null;
    } else if (dto.emailProvider === EmailProvider.SENDGRID && dto.sendgridApiKey) {
      updateData.sendgridApiKey = this.encrypt(dto.sendgridApiKey);
      updateData.smtpConfig = null;
      updateData.sesConfig = null;
    } else if (dto.emailProvider === EmailProvider.SES && dto.sesConfig) {
      updateData.sesConfig = {
        region: dto.sesConfig.region,
        accessKeyId: dto.sesConfig.accessKeyId ? this.encrypt(dto.sesConfig.accessKeyId) : undefined,
        secretAccessKey: dto.sesConfig.secretAccessKey ? this.encrypt(dto.sesConfig.secretAccessKey) : undefined,
      };
      updateData.smtpConfig = null;
      updateData.sendgridApiKey = null;
    } else if (dto.emailProvider === EmailProvider.DISABLED) {
      updateData.smtpConfig = null;
      updateData.sendgridApiKey = null;
      updateData.sesConfig = null;
    }

    const config = await this.prisma.notificationConfiguration.update({
      where: { organizationId },
      data: updateData,
    });

    this.logger.log(`Updated email configuration for org ${organizationId}: provider=${dto.emailProvider}`);

    return this.toResponseDto(config);
  }

  // ============================================
  // Update Slack Configuration
  // ============================================

  async updateSlackConfig(
    organizationId: string,
    dto: UpdateSlackConfigDto,
  ): Promise<NotificationConfigResponseDto> {
    // Get or create config
    await this.getConfig(organizationId);

    const updateData: any = {
      slackNotificationsEnabled: dto.slackNotificationsEnabled,
      slackDefaultChannel: dto.slackDefaultChannel,
      slackWorkspaceName: dto.slackWorkspaceName,
    };

    // Only update secrets if provided (not masked values)
    if (dto.slackWebhookUrl && !dto.slackWebhookUrl.startsWith('••••')) {
      updateData.slackWebhookUrl = this.encrypt(dto.slackWebhookUrl);
    }

    if (dto.slackBotToken && !dto.slackBotToken.startsWith('••••')) {
      updateData.slackBotToken = this.encrypt(dto.slackBotToken);
    }

    const config = await this.prisma.notificationConfiguration.update({
      where: { organizationId },
      data: updateData,
    });

    this.logger.log(`Updated Slack configuration for org ${organizationId}: enabled=${dto.slackNotificationsEnabled}`);

    return this.toResponseDto(config);
  }

  // ============================================
  // Update Default Notifications
  // ============================================

  async updateDefaultNotifications(
    organizationId: string,
    dto: UpdateDefaultNotificationsDto,
  ): Promise<NotificationConfigResponseDto> {
    // Get or create config
    const existing = await this.getConfig(organizationId);

    // Merge with existing defaults
    const mergedDefaults = {
      ...existing.defaultNotifications,
      ...dto,
    };

    const config = await this.prisma.notificationConfiguration.update({
      where: { organizationId },
      data: {
        defaultNotifications: mergedDefaults as any,
      },
    });

    this.logger.log(`Updated default notifications for org ${organizationId}`);

    return this.toResponseDto(config);
  }

  // ============================================
  // Disconnect Slack
  // ============================================

  async disconnectSlack(organizationId: string): Promise<NotificationConfigResponseDto> {
    const config = await this.prisma.notificationConfiguration.update({
      where: { organizationId },
      data: {
        slackNotificationsEnabled: false,
        slackWebhookUrl: null,
        slackBotToken: null,
        slackDefaultChannel: null,
        slackWorkspaceName: null,
      },
    });

    this.logger.log(`Disconnected Slack for org ${organizationId}`);

    return this.toResponseDto(config);
  }

  // ============================================
  // Get Raw Config (for internal use)
  // ============================================

  async getRawConfig(organizationId: string): Promise<{
    emailProvider: string;
    emailFromAddress: string | null;
    emailFromName: string | null;
    smtpConfig: any | null;
    sendgridApiKey: string | null;
    sesConfig: any | null;
    slackNotificationsEnabled: boolean;
    slackWebhookUrl: string | null;
    slackBotToken: string | null;
    slackDefaultChannel: string | null;
  } | null> {
    const config = await this.prisma.notificationConfiguration.findUnique({
      where: { organizationId },
    });

    if (!config) return null;

    // Decrypt secrets for internal use
    const smtpConfig = config.smtpConfig as any;
    const sesConfig = config.sesConfig as any;

    return {
      emailProvider: config.emailProvider,
      emailFromAddress: config.emailFromAddress,
      emailFromName: config.emailFromName,
      smtpConfig: smtpConfig ? {
        ...smtpConfig,
        password: smtpConfig.password ? this.decrypt(smtpConfig.password) : undefined,
      } : null,
      sendgridApiKey: config.sendgridApiKey ? this.decrypt(config.sendgridApiKey) : null,
      sesConfig: sesConfig ? {
        ...sesConfig,
        accessKeyId: sesConfig.accessKeyId ? this.decrypt(sesConfig.accessKeyId) : undefined,
        secretAccessKey: sesConfig.secretAccessKey ? this.decrypt(sesConfig.secretAccessKey) : undefined,
      } : null,
      slackNotificationsEnabled: config.slackNotificationsEnabled,
      slackWebhookUrl: config.slackWebhookUrl ? this.decrypt(config.slackWebhookUrl) : null,
      slackBotToken: config.slackBotToken ? this.decrypt(config.slackBotToken) : null,
      slackDefaultChannel: config.slackDefaultChannel,
    };
  }
}

