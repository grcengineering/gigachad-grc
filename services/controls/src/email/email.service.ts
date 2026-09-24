import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { maskEmail } from '@gigachad-grc/shared';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailServiceStatus {
  isConfigured: boolean;
  provider: string;
  isConsoleMode: boolean;
  consoleReason?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private _isConsoleMode = false;
  private _consoleReason?: string;
  private _provider: string = 'unknown';

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Get the current email service configuration status
   */
  getStatus(): EmailServiceStatus {
    return {
      isConfigured: !this._isConsoleMode,
      provider: this._provider,
      isConsoleMode: this._isConsoleMode,
      consoleReason: this._consoleReason,
    };
  }

  private initializeTransporter(): void {
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');

    if (emailProvider === 'console') {
      // Console mode for development - just logs emails
      this.logger.log('Email service initialized in CONSOLE mode');
      this._provider = 'console';
      this._isConsoleMode = true;
      this._consoleReason = 'EMAIL_PROVIDER is set to console (development mode)';
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      return;
    }

    if (emailProvider === 'sendgrid') {
      // SendGrid configuration
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!apiKey) {
        this.logger.warn('SENDGRID_API_KEY not configured, falling back to console mode');
        this.initializeConsoleMode('SENDGRID_API_KEY environment variable not set');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: apiKey,
        },
      });
      this._provider = 'sendgrid';
      this._isConsoleMode = false;
      this.logger.log('Email service initialized with SendGrid');
    } else if (emailProvider === 'ses') {
      // AWS SES configuration
      const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn('AWS credentials not configured, falling back to console mode');
        this.initializeConsoleMode(
          'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables not set'
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: `email-smtp.${region}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: {
          user: accessKeyId,
          pass: secretAccessKey,
        },
      });
      this._provider = 'ses';
      this._isConsoleMode = false;
      this.logger.log('Email service initialized with AWS SES');
    } else {
      // Generic SMTP configuration
      const host = this.configService.get<string>('SMTP_HOST');
      const port = this.configService.get<number>('SMTP_PORT', 587);
      const secure = this.configService.get<boolean>('SMTP_SECURE', false);
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');

      if (!host || !user || !pass) {
        this.logger.warn('SMTP credentials not configured, falling back to console mode');
        this.initializeConsoleMode(
          'SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables not set'
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this._provider = 'smtp';
      this._isConsoleMode = false;
      this.logger.log('Email service initialized with SMTP');
    }
  }

  private initializeConsoleMode(reason?: string): void {
    this._provider = 'console';
    this._isConsoleMode = true;
    this._consoleReason = reason || 'No email provider configured';
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    this.logger.log('Email service initialized in CONSOLE mode (fallback)');
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const from = this.configService.get<string>('EMAIL_FROM', 'noreply@gigachad-grc.com');
      const fromName = this.configService.get<string>('EMAIL_FROM_NAME', 'GigaChad GRC');

      const mailOptions = {
        from: `"${fromName}" <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);

      // In console mode, log the email content
      if (this._isConsoleMode) {
        this.logger.log(`[CONSOLE MODE] Email would be sent:
  From: ${mailOptions.from}
  To: ${maskEmail(options.to)}
  Subject: ${options.subject}
  Message ID: ${info.messageId}

  Body Preview:
  ${options.text ? options.text.substring(0, 200) : this.stripHtml(options.html).substring(0, 200)}...
        `);
        return false;
      } else {
        this.logger.log(
          `Email sent successfully to ${maskEmail(options.to)} (Message ID: ${info.messageId})`
        );
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${maskEmail(options.to)}:`, error.message);
      return false;
    }
  }

  /**
   * Strip HTML tags using iterative approach
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
    return result.trim();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed:', error.message);
      return false;
    }
  }
}
