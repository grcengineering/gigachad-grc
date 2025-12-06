import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const emailProvider = this.configService.get<string>('EMAIL_PROVIDER', 'smtp');

    if (emailProvider === 'console') {
      // Console mode for development - just logs emails
      this.logger.log('Email service initialized in CONSOLE mode');
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
        this.initializeConsoleMode();
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
      this.logger.log('Email service initialized with SendGrid');
    } else if (emailProvider === 'ses') {
      // AWS SES configuration
      const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn('AWS credentials not configured, falling back to console mode');
        this.initializeConsoleMode();
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
        this.initializeConsoleMode();
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
      this.logger.log('Email service initialized with SMTP');
    }
  }

  private initializeConsoleMode(): void {
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
      if (this.configService.get<string>('EMAIL_PROVIDER', 'smtp') === 'console') {
        this.logger.log(`[CONSOLE MODE] Email would be sent:
  From: ${mailOptions.from}
  To: ${options.to}
  Subject: ${options.subject}
  Message ID: ${info.messageId}

  Body Preview:
  ${options.text ? options.text.substring(0, 200) : this.stripHtml(options.html).substring(0, 200)}...
        `);
      } else {
        this.logger.log(`Email sent successfully to ${options.to} (Message ID: ${info.messageId})`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
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
