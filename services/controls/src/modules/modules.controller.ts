import { Controller, Get, Put, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string; organizationId: string; email?: string };
}

interface OrganizationSettings {
  enabledModules?: string[];
  [key: string]: unknown;
}

interface UpdateModulesDto {
  enabledModules: string[];
}

@ApiTags('modules')
@ApiBearerAuth()
@Controller('api/modules')
@UseGuards(DevAuthGuard, PermissionGuard)
export class ModulesController {
  private readonly logger = new Logger(ModulesController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get enabled modules for the current organization' })
  @RequirePermission(Resource.SETTINGS, Action.READ)
  async getModules(@Req() req: AuthenticatedRequest) {
    const org = await this.prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as OrganizationSettings) || {};
    const enabledModules = Array.isArray(settings.enabledModules)
      ? settings.enabledModules.filter(
          (m: unknown) => typeof m === 'string' && m.trim().length > 0,
        )
      : [];

    return {
      enabledModules,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update enabled modules for the current organization' })
  @RequirePermission(Resource.SETTINGS, Action.UPDATE)
  async updateModules(@Req() req: AuthenticatedRequest, @Body() body: UpdateModulesDto) {
    try {
      const existing = await this.prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { settings: true },
      });

      if (!existing) {
        throw new Error(`Organization ${req.user.organizationId} not found`);
      }

      const oldSettings = (existing.settings as OrganizationSettings) || {};
      const cleaned = Array.from(
        new Set((body.enabledModules || []).map((m) => m.trim()).filter(Boolean)),
      );

      const newSettings = {
        ...oldSettings,
        enabledModules: cleaned,
      };

      await this.prisma.organization.update({
        where: { id: req.user.organizationId },
        data: { settings: newSettings },
      });

      return {
        enabledModules: cleaned,
      };
    } catch (error: unknown) {
      this.logger.error('Error updating modules:', error);
      throw error;
    }
  }
}


