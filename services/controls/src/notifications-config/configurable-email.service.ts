import { Injectable, Logger } from '@nestjs/common';
import { NotificationsConfigService } from './notifications-config.service';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

@Injectable()
export class ConfigurableEmailService {
  private readonly logger = new Logger(ConfigurableEmailService.name);

  // Cache transporters per organization
  private transporterCache: Map<string, { transporter: Transporter; createdAt: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: NotificationsConfigService) {}

  /**
   * Get or create a transporter for the organization
   */
  private async getTransporter(organizationId: string): Promise<Transporter | null> {
    // Check cache
    const cached = this.transporterCache.get(organizationId);
    if (cached && Date.now() - cached.createdAt < this.CACHE_TTL) {
      return cached.transporter;
    }

    const config = await this.configService.getRawConfig(organizationId);

    if (!config || config.emailProvider === 'disabled') {
      this.logger.debug(`Email disabled for org ${organizationId}`);
      return null;
    }

    let transporter: Transporter;

    switch (config.emailProvider) {
      case 'smtp':
        if (!config.smtpConfig) {
          this.logger.warn(`SMTP config missing for org ${organizationId}`);
          return null;
        }
        transporter = nodemailer.createTransport({
          host: config.smtpConfig.host,
          port: config.smtpConfig.port,
          secure: config.smtpConfig.secure,
          auth: config.smtpConfig.user
            ? {
                user: config.smtpConfig.user,
                pass: config.smtpConfig.password,
              }
            : undefined,
        });
        this.logger.debug(`Created SMTP transporter for org ${organizationId}`);
        break;

      case 'sendgrid':
        if (!config.sendgridApiKey) {
          this.logger.warn(`SendGrid API key missing for org ${organizationId}`);
          return null;
        }
        transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: config.sendgridApiKey,
          },
        });
        this.logger.debug(`Created SendGrid transporter for org ${organizationId}`);
        break;

      case 'ses':
        if (!config.sesConfig) {
          this.logger.warn(`SES config missing for org ${organizationId}`);
          return null;
        }
        transporter = nodemailer.createTransport({
          host: `email-smtp.${config.sesConfig.region}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: config.sesConfig.accessKeyId,
            pass: config.sesConfig.secretAccessKey,
          },
        });
        this.logger.debug(`Created SES transporter for org ${organizationId}`);
        break;

      default:
        this.logger.warn(`Unknown email provider: ${config.emailProvider}`);
        return null;
    }

    // Cache the transporter
    this.transporterCache.set(organizationId, {
      transporter,
      createdAt: Date.now(),
    });

    return transporter;
  }

  /**
   * Send an email using the organization's configuration
   */
  async isConfigured(organizationId: string): Promise<boolean> {
    return (await this.getTransporter(organizationId)) !== null;
  }

  async sendEmail(organizationId: string, options: EmailOptions): Promise<boolean> {
    const transporter = await this.getTransporter(organizationId);

    if (!transporter) {
      this.logger.debug(`No email transporter available for org ${organizationId}`);
      return false;
    }

    const config = await this.configService.getRawConfig(organizationId);
    const fromAddress = config?.emailFromAddress || 'noreply@gigachad-grc.com';
    const fromName = config?.emailFromName || 'GigaChad GRC';

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments,
      });

      this.logger.log(`Email sent to ${options.to} (Message ID: ${info.messageId})`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(organizationId: string, recipientEmail: string): Promise<boolean> {
    return this.sendEmail(organizationId, {
      to: recipientEmail,
      subject: '🎉 GigaChad GRC - Test Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Test Email Successful!</h1>
            </div>
            <div class="content">
              <div class="success">
                <strong>Your email configuration is working correctly!</strong>
              </div>
              <p>This test email confirms that your GigaChad GRC notification settings are properly configured.</p>
              <p>You will now receive:</p>
              <ul>
                <li>Compliance drift alerts</li>
                <li>Evidence expiration reminders</li>
                <li>Task assignments</li>
                <li>Policy review notifications</li>
                <li>And more...</li>
              </ul>
              <div class="footer">
                <p>Sent from GigaChad GRC at ${new Date().toISOString()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
GigaChad GRC - Test Email Successful!

Your email configuration is working correctly!

This test email confirms that your GigaChad GRC notification settings are properly configured.

You will now receive:
- Compliance drift alerts
- Evidence expiration reminders
- Task assignments
- Policy review notifications
- And more...

Sent from GigaChad GRC at ${new Date().toISOString()}
      `,
    });
  }

  /**
   * Clear transporter cache for an organization (call after config update)
   */
  clearCache(organizationId: string): void {
    this.transporterCache.delete(organizationId);
    this.logger.debug(`Cleared email transporter cache for org ${organizationId}`);
  }

  /**
   * Strip HTML tags from string using iterative approach
   * Prevents bypass via nested patterns like '<sc<script>ript>'
   */
  private stripHtml(html: string): string {
    const tagPattern = /<[^>]*>/g;
    let result = html;
    let previous = '';
    while (result !== previous) {
      previous = result;
      result = result.replace(tagPattern, '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }
}
