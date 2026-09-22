import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

type OrganizationSettings = Record<string, unknown> & {
  timezone?: string;
  dateFormat?: string;
};

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        settings: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.toResponse(organization);
  }

  async updateCurrent(organizationId: string, userId: string, dto: UpdateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        settings: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Organization not found');
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Organization name cannot be empty');
    }

    const currentSettings = (existing.settings as OrganizationSettings | null) || {};
    const nextSettings = (
      dto.settings
        ? {
            ...currentSettings,
            ...dto.settings,
          }
        : currentSettings
    ) as Prisma.InputJsonObject;

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.settings ? { settings: nextSettings } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        settings: true,
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'organization.settings_changed',
          entityType: 'organization',
          entityId: organizationId,
          entityName: updated.name,
          description: 'Organization settings updated',
          changes: JSON.parse(
            JSON.stringify({
              before: {
                name: existing.name,
                description: existing.description,
                settings: currentSettings,
              },
              after: {
                name: updated.name,
                description: updated.description,
                settings: nextSettings,
              },
            })
          ) as Prisma.InputJsonObject,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to write organization settings audit log: ${String(error)}`);
    }

    return this.toResponse(updated);
  }

  private toResponse(organization: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: unknown;
    settings: unknown;
  }) {
    const settings = (organization.settings as OrganizationSettings | null) || {};
    return {
      ...organization,
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        ...settings,
      } as OrganizationSettings & { timezone: string; dateFormat: string },
    };
  }
}
