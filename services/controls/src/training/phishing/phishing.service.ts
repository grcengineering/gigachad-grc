import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { createHmac, timingSafeEqual } from 'crypto';
import { maskEmail } from '@gigachad-grc/shared';
import {
  CampaignStatus,
  PhishingTemplateType,
  DifficultyLevel,
  TargetStatus,
  CreatePhishingTemplateDto,
  PhishingTemplateDto,
  CreateCampaignDto,
  CampaignDto,
  CampaignResultsDto,
  CampaignTargetResultDto,
  ReportPhishingDto,
} from './dto/phishing.dto';

/**
 * Phishing Campaign Service
 *
 * Manages phishing simulation campaigns including:
 * - Template management
 * - Campaign creation and scheduling
 * - Email sending
 * - Click/open/report tracking
 * - Results analysis
 */
@Injectable()
export class PhishingService {
  private readonly logger = new Logger(PhishingService.name);
  private readonly TRACKING_SECRET: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {
    const trackingSecret = process.env.PHISHING_TRACKING_SECRET;
    if (!trackingSecret) {
      throw new Error('PHISHING_TRACKING_SECRET environment variable is required');
    }
    this.TRACKING_SECRET = trackingSecret;
  }

  // ============================================
  // Template Management
  // ============================================

  async getTemplates(organizationId: string): Promise<PhishingTemplateDto[]> {
    // Return built-in templates plus organization custom templates
    const customTemplates = await this.getCustomTemplates(organizationId);
    return [...this.getBuiltInTemplates(), ...customTemplates];
  }

  async getTemplate(
    organizationId: string,
    templateId: string
  ): Promise<PhishingTemplateDto | null> {
    // Check built-in templates first
    const builtIn = this.getBuiltInTemplates().find((t) => t.id === templateId);
    if (builtIn) return builtIn;

    // Check custom templates
    const customTemplates = await this.getCustomTemplates(organizationId);
    return customTemplates.find((t) => t.id === templateId) || null;
  }

  async createTemplate(
    organizationId: string,
    dto: CreatePhishingTemplateDto
  ): Promise<PhishingTemplateDto> {
    const id = uuidv4();
    const now = new Date();

    // Store in organization settings (or a dedicated table if you prefer)
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const phishingTemplates = (settings.phishingTemplates as PhishingTemplateDto[]) || [];

    const newTemplate: PhishingTemplateDto = {
      id,
      ...dto,
      tags: dto.tags || [],
      isActive: true,
      createdAt: now,
    };

    phishingTemplates.push(newTemplate);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          phishingTemplates,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return newTemplate;
  }

  async updateTemplate(
    organizationId: string,
    templateId: string,
    dto: Partial<CreatePhishingTemplateDto>
  ): Promise<PhishingTemplateDto> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const phishingTemplates = (settings.phishingTemplates as PhishingTemplateDto[]) || [];

    const index = phishingTemplates.findIndex((t) => t.id === templateId);
    if (index === -1) {
      throw new NotFoundException('Template not found');
    }

    phishingTemplates[index] = {
      ...phishingTemplates[index],
      ...dto,
    };

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          phishingTemplates,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return phishingTemplates[index];
  }

  async deleteTemplate(organizationId: string, templateId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const phishingTemplates = (settings.phishingTemplates as PhishingTemplateDto[]) || [];

    const filtered = phishingTemplates.filter((t) => t.id !== templateId);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          phishingTemplates: filtered,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ============================================
  // Campaign Management
  // ============================================

  async createCampaign(organizationId: string, dto: CreateCampaignDto): Promise<CampaignDto> {
    const template = await this.getTemplate(organizationId, dto.templateId);
    if (!template) {
      throw new BadRequestException('Template not found');
    }

    const id = uuidv4();
    const now = new Date();

    // Store campaign in organization settings
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

    const campaign = {
      id,
      name: dto.name,
      description: dto.description,
      templateId: dto.templateId,
      status: dto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT,
      targets: dto.targets.map((t) => ({
        ...t,
        trackingToken: this.generateTrackingToken(id, t.userId),
        status: TargetStatus.PENDING,
      })),
      targetCount: dto.targets.length,
      sentCount: 0,
      openedCount: 0,
      clickedCount: 0,
      reportedCount: 0,
      credentialsEnteredCount: 0,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      spreadOverHours: dto.spreadOverHours || 0,
      failureTrainingId: dto.failureTrainingId,
      sendReportEmail: dto.sendReportEmail || false,
      reportRecipients: dto.reportRecipients || [],
      createdAt: now,
    };

    campaigns.push(campaign);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          phishingCampaigns: campaigns,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toCampaignDto(campaign);
  }

  async getCampaigns(organizationId: string): Promise<CampaignDto[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

    return campaigns.map((c) => this.toCampaignDto(c));
  }

  async getCampaign(
    organizationId: string,
    campaignId: string
  ): Promise<Record<string, unknown> | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

    return campaigns.find((c) => c.id === campaignId) || null;
  }

  async startCampaign(organizationId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign cannot be started');
    }

    const template = await this.getTemplate(organizationId, campaign.templateId as string);
    if (!template) {
      throw new BadRequestException('Campaign template not found');
    }

    campaign.status = CampaignStatus.ACTIVE;
    campaign.startedAt = new Date();

    // Send emails to targets
    await this.sendCampaignEmails(organizationId, campaign, template);

    await this.updateCampaign(organizationId, campaign);

    return this.toCampaignDto(campaign);
  }

  async pauseCampaign(organizationId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.status = CampaignStatus.PAUSED;
    await this.updateCampaign(organizationId, campaign);

    return this.toCampaignDto(campaign);
  }

  async completeCampaign(organizationId: string, campaignId: string): Promise<CampaignDto> {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    campaign.status = CampaignStatus.COMPLETED;
    campaign.completedAt = new Date();
    await this.updateCampaign(organizationId, campaign);

    // Send report if configured
    const reportRecipients = campaign.reportRecipients as string[] | undefined;
    if (campaign.sendReportEmail && reportRecipients && reportRecipients.length > 0) {
      await this.sendCampaignReport(organizationId, campaign);
    }

    return this.toCampaignDto(campaign);
  }

  async getCampaignResults(
    organizationId: string,
    campaignId: string
  ): Promise<CampaignResultsDto> {
    const campaign = await this.getCampaign(organizationId, campaignId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const targetsArray = campaign.targets as Array<Record<string, unknown>>;
    const targets: CampaignTargetResultDto[] = targetsArray.map((t) => ({
      userId: t.userId as string,
      email: t.email as string,
      name: t.name as string,
      status: t.status as TargetStatus,
      sentAt: t.sentAt as Date | undefined,
      openedAt: t.openedAt as Date | undefined,
      clickedAt: t.clickedAt as Date | undefined,
      reportedAt: t.reportedAt as Date | undefined,
      credentialsEnteredAt: t.credentialsEnteredAt as Date | undefined,
      trainingAssigned: (t.trainingAssigned as boolean) || false,
      trainingCompleted: (t.trainingCompleted as boolean) || false,
    }));

    const targetCount = campaign.targetCount as number;
    const sentCount = campaign.sentCount as number;
    const openedCount = campaign.openedCount as number;
    const clickedCount = campaign.clickedCount as number;
    const reportedCount = campaign.reportedCount as number;
    const credentialsEnteredCount = campaign.credentialsEnteredCount as number;

    const metrics = {
      totalTargets: targetCount,
      emailsSent: sentCount,
      emailsDelivered: targets.filter(
        (t) => t.status !== TargetStatus.BOUNCED && t.status !== TargetStatus.PENDING
      ).length,
      emailsOpened: openedCount,
      linksClicked: clickedCount,
      credentialsEntered: credentialsEnteredCount,
      reported: reportedCount,
      bounced: targets.filter((t) => t.status === TargetStatus.BOUNCED).length,
      openRate: sentCount > 0 ? (openedCount / sentCount) * 100 : 0,
      clickRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
      reportRate: sentCount > 0 ? (reportedCount / sentCount) * 100 : 0,
      failureRate: sentCount > 0 ? (clickedCount / sentCount) * 100 : 0,
    };

    // Calculate department breakdown
    const deptMap = new Map<string, { total: number; clicked: number }>();
    for (const t of targetsArray) {
      const dept = (t.department as string) || 'Unknown';
      const existing = deptMap.get(dept) || { total: 0, clicked: 0 };
      existing.total++;
      if (t.clickedAt) existing.clicked++;
      deptMap.set(dept, existing);
    }

    const departmentBreakdown = Array.from(deptMap.entries()).map(([dept, data]) => ({
      department: dept,
      targetCount: data.total,
      clickedCount: data.clicked,
      clickRate: data.total > 0 ? (data.clicked / data.total) * 100 : 0,
    }));

    return {
      campaign: this.toCampaignDto(campaign),
      targets,
      metrics,
      departmentBreakdown,
    };
  }

  // ============================================
  // Tracking Events
  // ============================================

  async trackOpen(trackingToken: string): Promise<void> {
    const { campaignId, userId } = this.decodeTrackingToken(trackingToken);

    // Find campaign across all organizations (tracking is anonymous)
    const orgs = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of orgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const target = (campaign.targets as Array<Record<string, unknown>>).find(
          (t) => t.userId === userId
        );
        if (target && !target.openedAt) {
          target.openedAt = new Date();
          target.status = TargetStatus.OPENED;
          (campaign.openedCount as number)++;
          await this.updateCampaign(org.id, campaign);
        }
        return;
      }
    }
  }

  async trackClick(trackingToken: string): Promise<void> {
    const { campaignId, userId } = this.decodeTrackingToken(trackingToken);

    const orgs = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of orgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const target = (campaign.targets as Array<Record<string, unknown>>).find(
          (t) => t.userId === userId
        );
        if (target && !target.clickedAt) {
          target.clickedAt = new Date();
          target.status = TargetStatus.CLICKED;
          (campaign.clickedCount as number)++;

          // Auto-assign training if configured
          if (campaign.failureTrainingId) {
            await this.assignTraining(
              org.id,
              userId as string,
              campaign.failureTrainingId as string,
              (campaign.createdBy || userId) as string
            );
            target.trainingAssigned = true;
          }

          await this.updateCampaign(org.id, campaign);
        }
        return;
      }
    }
  }

  async trackCredentialsEntered(trackingToken: string): Promise<void> {
    const { campaignId, userId } = this.decodeTrackingToken(trackingToken);

    const orgs = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of orgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const target = (campaign.targets as Array<Record<string, unknown>>).find(
          (t) => t.userId === userId
        );
        if (target && !target.credentialsEnteredAt) {
          target.credentialsEnteredAt = new Date();
          target.status = TargetStatus.CREDENTIALS_ENTERED;
          (campaign.credentialsEnteredCount as number)++;

          // Auto-assign training if configured (high priority)
          if (campaign.failureTrainingId && !target.trainingAssigned) {
            await this.assignTraining(
              org.id,
              userId as string,
              campaign.failureTrainingId as string,
              (campaign.createdBy || userId) as string
            );
            target.trainingAssigned = true;
          }

          await this.updateCampaign(org.id, campaign);
        }
        return;
      }
    }
  }

  async reportPhishing(dto: ReportPhishingDto): Promise<{ success: boolean; message: string }> {
    const { campaignId, userId } = this.decodeTrackingToken(dto.trackingToken);

    const orgs = await this.prisma.organization.findMany({
      select: { id: true, settings: true },
    });

    for (const org of orgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const target = (campaign.targets as Array<Record<string, unknown>>).find(
          (t) => t.userId === userId
        );
        if (target) {
          target.reportedAt = new Date();
          target.status = TargetStatus.REPORTED;
          (campaign.reportedCount as number)++;
          await this.updateCampaign(org.id, campaign);

          return {
            success: true,
            message:
              'Thank you for reporting this email! This was a phishing simulation. Great job identifying it!',
          };
        }
      }
    }

    return {
      success: false,
      message: 'Unable to process report',
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private getBuiltInTemplates(): PhishingTemplateDto[] {
    return [
      {
        id: 'builtin-password-reset',
        name: 'Password Reset Request',
        description: 'Simulates a password reset notification from IT',
        type: PhishingTemplateType.CREDENTIAL_HARVEST,
        difficulty: DifficultyLevel.EASY,
        subject: 'Action Required: Password Reset',
        senderName: 'IT Support',
        senderEmail: 'it-support@company-security.com',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Required</h2>
            <p>Your password will expire in 24 hours. Please reset it immediately to avoid losing access to your account.</p>
            <p><a href="{{TRACKING_URL}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password Now</a></p>
            <p>If you did not request this, please ignore this email.</p>
            <p>IT Support Team</p>
          </div>
        `,
        textBody: 'Your password will expire in 24 hours. Please reset it at: {{TRACKING_URL}}',
        landingPageHtml: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ddd;">
            <h2>Reset Your Password</h2>
            <form onsubmit="return false;">
              <input type="text" placeholder="Username" style="width: 100%; padding: 10px; margin: 10px 0;">
              <input type="password" placeholder="Current Password" style="width: 100%; padding: 10px; margin: 10px 0;">
              <input type="password" placeholder="New Password" style="width: 100%; padding: 10px; margin: 10px 0;">
              <button type="submit" onclick="window.location='{{CREDENTIALS_URL}}'" style="width: 100%; padding: 10px; background: #0066cc; color: white; border: none; cursor: pointer;">Reset Password</button>
            </form>
          </div>
        `,
        redFlags: [
          'Sender email uses external domain (company-security.com)',
          'Creates urgency with 24-hour deadline',
          'Generic greeting without your name',
          "Link doesn't go to official company domain",
        ],
        tags: ['password', 'IT', 'credential'],
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'builtin-invoice',
        name: 'Urgent Invoice Payment',
        description: 'Simulates an urgent payment request from a vendor',
        type: PhishingTemplateType.LINK_CLICK,
        difficulty: DifficultyLevel.MEDIUM,
        subject: 'URGENT: Invoice #INV-2024-3847 Past Due',
        senderName: 'Accounts Payable',
        senderEmail: 'billing@vendor-payments.net',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Dear Customer,</p>
            <p>This is an urgent reminder that Invoice #INV-2024-3847 in the amount of <strong>$4,287.50</strong> is now past due.</p>
            <p>To avoid service interruption, please process payment immediately:</p>
            <p><a href="{{TRACKING_URL}}" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Invoice & Pay Now</a></p>
            <p>Please contact us if you have any questions.</p>
            <p>Best regards,<br>Accounts Receivable</p>
          </div>
        `,
        textBody:
          'URGENT: Invoice #INV-2024-3847 for $4,287.50 is past due. Pay now: {{TRACKING_URL}}',
        redFlags: [
          'Unexpected invoice from unknown sender',
          'Creates urgency with "URGENT" in subject',
          'Sender domain is suspicious (vendor-payments.net)',
          'No specific vendor name mentioned',
          'Generic greeting instead of company name',
        ],
        tags: ['finance', 'invoice', 'urgent'],
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'builtin-ceo-request',
        name: 'CEO Gift Card Request',
        description: 'Simulates a CEO requesting gift cards (common BEC scam)',
        type: PhishingTemplateType.REPLY,
        difficulty: DifficultyLevel.HARD,
        subject: 'Quick favor needed',
        senderName: 'John Smith (CEO)',
        senderEmail: 'john.smith.ceo@company-mail.com',
        htmlBody: `
          <div style="font-family: Arial, sans-serif;">
            <p>Hi,</p>
            <p>Are you available? I need your help with something urgent and confidential.</p>
            <p>I'm in a meeting and need you to purchase some gift cards for a client appreciation event. I'll reimburse you later today.</p>
            <p>Please get 5 Amazon gift cards at $100 each. Send me the card numbers and PINs as soon as you have them.</p>
            <p>Thanks,<br>John</p>
            <p style="font-size: 12px; color: #666;">Sent from my iPhone</p>
          </div>
        `,
        textBody:
          'Hi, Are you available? I need your help purchasing some gift cards urgently. Reply to let me know.',
        redFlags: [
          'CEO asking for gift cards is a major red flag',
          'Request to keep it confidential',
          'External email domain pretending to be CEO',
          'Unusual request outside normal business process',
          'Request for immediate action',
        ],
        tags: ['BEC', 'executive', 'gift card'],
        isActive: true,
        createdAt: new Date('2024-01-01'),
      },
    ];
  }

  private async getCustomTemplates(organizationId: string): Promise<PhishingTemplateDto[]> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    return (settings.phishingTemplates as PhishingTemplateDto[]) || [];
  }

  private async updateCampaign(
    organizationId: string,
    campaign: Record<string, unknown>
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as Record<string, unknown>) || {};
    const campaigns = (settings.phishingCampaigns as Array<Record<string, unknown>>) || [];

    const index = campaigns.findIndex((c) => c.id === campaign.id);
    if (index !== -1) {
      campaigns[index] = campaign;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          phishingCampaigns: campaigns,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async sendCampaignEmails(
    organizationId: string,
    campaign: Record<string, unknown>,
    template: PhishingTemplateDto
  ): Promise<void> {
    const trackingDomain = process.env.PHISHING_TRACKING_DOMAIN || 'localhost:3001';
    const targetsArray = campaign.targets as Array<Record<string, unknown>>;

    for (const target of targetsArray) {
      try {
        const trackingUrl = `http://${trackingDomain}/api/phishing/track/click?t=${target.trackingToken}`;
        const openTrackingUrl = `http://${trackingDomain}/api/phishing/track/open?t=${target.trackingToken}`;

        const htmlBody =
          template.htmlBody
            .replace(/{{TRACKING_URL}}/g, trackingUrl)
            .replace(/{{NAME}}/g, (target.name as string) || 'User') +
          `<img src="${openTrackingUrl}" width="1" height="1" style="display:none;" />`;

        const textBody = template.textBody
          .replace(/{{TRACKING_URL}}/g, trackingUrl)
          .replace(/{{NAME}}/g, (target.name as string) || 'User');

        await this.emailService.sendEmail({
          to: target.email as string,
          subject: template.subject,
          html: htmlBody,
          text: textBody,
        });

        target.sentAt = new Date();
        target.status = TargetStatus.SENT;
        (campaign.sentCount as number)++;

        this.logger.log(
          `Sent phishing email to ${maskEmail(target.email)} for campaign ${campaign.id}`
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Failed to send phishing email to ${maskEmail(target.email)}: ${errorMessage}`
        );
        target.status = TargetStatus.BOUNCED;
      }
    }
  }

  private async sendCampaignReport(
    organizationId: string,
    campaign: Record<string, unknown>
  ): Promise<void> {
    // Send summary report to configured recipients
    const results = await this.getCampaignResults(organizationId, campaign.id as string);

    const reportHtml = `
      <h2>Phishing Campaign Report: ${campaign.name}</h2>
      <p>Campaign completed on ${new Date().toLocaleDateString()}</p>
      <h3>Summary</h3>
      <ul>
        <li>Total Targets: ${results.metrics.totalTargets}</li>
        <li>Emails Sent: ${results.metrics.emailsSent}</li>
        <li>Open Rate: ${results.metrics.openRate.toFixed(1)}%</li>
        <li>Click Rate: ${results.metrics.clickRate.toFixed(1)}%</li>
        <li>Report Rate: ${results.metrics.reportRate.toFixed(1)}%</li>
      </ul>
    `;

    const reportRecipients = campaign.reportRecipients as string[];
    for (const recipient of reportRecipients) {
      await this.emailService.sendEmail({
        to: recipient,
        subject: `Phishing Campaign Report: ${campaign.name}`,
        html: reportHtml,
        text: `Campaign ${campaign.name} completed. Click rate: ${results.metrics.clickRate.toFixed(1)}%`,
      });
    }
  }

  private async assignTraining(
    organizationId: string,
    userId: string,
    trainingId: string,
    assignedBy: string
  ): Promise<void> {
    // Create training assignment
    await this.prisma.trainingAssignment
      .create({
        data: {
          moduleId: trainingId,
          userId,
          organizationId,
          assignedBy,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
          status: 'pending',
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to assign training: ${err.message}`);
      });
  }

  private generateTrackingToken(campaignId: string, userId: string): string {
    const data = `${campaignId}:${userId}`;
    const signature = createHmac('sha256', this.TRACKING_SECRET)
      .update(data)
      .digest('hex')
      .substring(0, 8);
    return Buffer.from(`${data}:${signature}`).toString('base64url');
  }

  private decodeTrackingToken(token: string): { campaignId: string; userId: string } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const [campaignId, userId, signature] = decoded.split(':');

      // Verify signature
      const expectedSignature = createHmac('sha256', this.TRACKING_SECRET)
        .update(`${campaignId}:${userId}`)
        .digest('hex')
        .substring(0, 8);

      // SECURITY: Use timingSafeEqual to prevent timing attacks
      // Regular string comparison (===) can leak timing information
      if (!signature || signature.length !== expectedSignature.length) {
        throw new Error('Invalid token signature');
      }

      const signatureValid = timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!signatureValid) {
        throw new Error('Invalid token signature');
      }

      return { campaignId, userId };
    } catch {
      throw new BadRequestException('Invalid tracking token');
    }
  }

  private toCampaignDto(campaign: Record<string, unknown>): CampaignDto {
    return {
      id: campaign.id as string,
      name: campaign.name as string,
      description: campaign.description as string,
      templateId: campaign.templateId as string,
      status: campaign.status as CampaignStatus,
      targetCount: campaign.targetCount as number,
      sentCount: campaign.sentCount as number,
      openedCount: campaign.openedCount as number,
      clickedCount: campaign.clickedCount as number,
      reportedCount: campaign.reportedCount as number,
      credentialsEnteredCount: campaign.credentialsEnteredCount as number,
      scheduledAt: (campaign.scheduledAt || new Date()) as Date,
      startedAt: (campaign.startedAt || new Date()) as Date,
      completedAt: (campaign.completedAt || new Date()) as Date,
      createdAt: (campaign.createdAt || new Date()) as Date,
    };
  }
}
