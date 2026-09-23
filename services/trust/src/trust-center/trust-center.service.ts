import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { UpdateTrustCenterConfigDto } from './dto/update-config.dto';
import { CreateTrustCenterContentDto } from './dto/create-content.dto';
import { UpdateTrustCenterContentDto } from './dto/update-content.dto';
import { Prisma, TrustCenterContent } from '@prisma/client';
import { sanitizeInput } from '@gigachad-grc/shared';

@Injectable()
export class TrustCenterService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  // Config Management
  async getConfig(organizationId: string) {
    let config = await this.prisma.trustCenterConfig.findUnique({
      where: { organizationId },
    });

    // Create default config if it doesn't exist
    if (!config) {
      config = await this.prisma.trustCenterConfig.create({
        data: {
          organizationId,
          companyName: 'Your Company',
          isEnabled: false,
        },
      });
    }

    return config;
  }

  async updateConfig(
    organizationId: string,
    updateConfigDto: UpdateTrustCenterConfigDto,
    userId: string
  ) {
    const { customSections, ...restDto } = updateConfigDto;
    const config = await this.prisma.trustCenterConfig.upsert({
      where: { organizationId },
      update: {
        ...restDto,
        customSections: customSections as Prisma.InputJsonValue | undefined,
      },
      create: {
        organizationId,
        companyName: updateConfigDto.companyName || 'Your Company',
        ...restDto,
        customSections: customSections as Prisma.InputJsonValue | undefined,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'UPDATE_TRUST_CENTER_CONFIG',
      entityType: 'trust_center_config',
      entityId: config.id,
      entityName: 'Trust Center Configuration',
      description: 'Updated Trust Center configuration',
      changes: updateConfigDto as unknown as Prisma.InputJsonValue,
    });

    return config;
  }

  // Content Management
  async createContent(
    organizationId: string,
    createContentDto: CreateTrustCenterContentDto,
    userId: string
  ) {
    // XSS Protection: Sanitize content before storing
    // Use 'rich' level to allow safe HTML formatting while removing malicious scripts
    const sanitizedDto = {
      ...createContentDto,
      title: sanitizeInput(createContentDto.title, 'strict'),
      content: createContentDto.content
        ? sanitizeInput(createContentDto.content, 'rich')
        : undefined,
    };

    const content = await this.prisma.trustCenterContent.create({
      data: {
        ...sanitizedDto,
        organizationId,
        order: sanitizedDto.order || 0,
        isPublished: sanitizedDto.isPublished || false,
        createdBy: userId,
      },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'CREATE_TRUST_CENTER_CONTENT',
      entityType: 'trust_center_content',
      entityId: content.id,
      entityName: content.title,
      description: `Created Trust Center content: ${content.title}`,
      metadata: { section: content.section },
    });

    return content;
  }

  async getContent(organizationId: string, section?: string, publishedOnly = false) {
    const where: Prisma.TrustCenterContentWhereInput = { organizationId };

    if (section) {
      where.section = section;
    }
    if (publishedOnly) {
      where.isPublished = true;
    }

    return this.prisma.trustCenterContent.findMany({
      where,
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });
  }

  async getContentById(id: string, organizationId: string) {
    // SECURITY: Include organizationId in query to prevent IDOR
    // This ensures users can only access content within their organization
    const content = await this.prisma.trustCenterContent.findFirst({
      where: { id, organizationId },
    });

    if (!content) {
      throw new NotFoundException(`Content not found`);
    }

    return content;
  }

  async updateContent(
    id: string,
    updateContentDto: UpdateTrustCenterContentDto,
    userId: string,
    organizationId: string
  ) {
    // SECURITY: Verify content belongs to user's organization before updating
    const _content = await this.getContentById(id, organizationId);

    // XSS Protection: Sanitize content before storing
    const sanitizedDto: UpdateTrustCenterContentDto = { ...updateContentDto };
    if (updateContentDto.title !== undefined) {
      sanitizedDto.title = sanitizeInput(updateContentDto.title, 'strict');
    }
    if (updateContentDto.content !== undefined) {
      sanitizedDto.content = sanitizeInput(updateContentDto.content, 'rich');
    }

    const updated = await this.prisma.trustCenterContent.update({
      where: { id },
      data: sanitizedDto,
    });

    await this.audit.log({
      organizationId: updated.organizationId,
      userId,
      action: 'UPDATE_TRUST_CENTER_CONTENT',
      entityType: 'trust_center_content',
      entityId: id,
      entityName: updated.title,
      description: `Updated Trust Center content: ${updated.title}`,
      changes: updateContentDto as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async deleteContent(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify content belongs to user's organization before deleting
    const content = await this.getContentById(id, organizationId);

    await this.prisma.trustCenterContent.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId: content.organizationId,
      userId,
      action: 'DELETE_TRUST_CENTER_CONTENT',
      entityType: 'trust_center_content',
      entityId: id,
      entityName: content.title,
      description: `Deleted Trust Center content: ${content.title}`,
    });

    return { message: 'Content deleted successfully' };
  }

  // Public Trust Center View
  async getPublicTrustCenter(organizationId: string) {
    const [config, content] = await Promise.all([
      this.getConfig(organizationId),
      this.getContent(organizationId, undefined, true),
    ]);

    if (!config.isEnabled) {
      throw new NotFoundException('Trust Center is not enabled');
    }

    // Group content by section
    const contentBySection = content.reduce(
      (acc, item) => {
        if (!acc[item.section]) {
          acc[item.section] = [];
        }
        acc[item.section].push(item);
        return acc;
      },
      {} as Record<string, TrustCenterContent[]>
    );

    return {
      config: {
        companyName: config.companyName,
        description: config.description,
        logoUrl: config.logoUrl,
        primaryColor: config.primaryColor,
        securityEmail: config.securityEmail,
        supportUrl: config.supportUrl,
        sections: {
          certifications: config.showCertifications,
          policies: config.showPolicies,
          securityFeatures: config.showSecurityFeatures,
          privacy: config.showPrivacy,
          incidentResponse: config.showIncidentResponse,
        },
      },
      content: contentBySection,
    };
  }
}
