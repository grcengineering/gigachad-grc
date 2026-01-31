/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AssetFilterDto,
  CreateAssetDto,
  UpdateAssetDto,
  AssetResponseDto,
  AssetDetailResponseDto,
  AssetStatsDto,
  SyncResultDto,
  AssetType,
} from './dto/asset.dto';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // ===========================
  // Asset CRUD
  // ===========================

  async findAll(
    organizationId: string,
    filters: AssetFilterDto,
    page: number = 1,
    limit: number = 50,
  ) {
    const where: any = { organizationId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { externalId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.source) {
      where.source = filters.source;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.criticality) {
      where.criticality = filters.criticality;
    }

    if (filters.department) {
      where.department = filters.department;
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: {
          _count: {
            select: { riskAssets: true },
          },
        },
        orderBy: [
          { criticality: 'desc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      assets: assets.map(asset => this.toResponseDto(asset)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, organizationId: string): Promise<AssetDetailResponseDto> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
      include: {
        riskAssets: {
          include: {
            risk: {
              select: {
                id: true,
                riskId: true,
                title: true,
                inherentRisk: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return {
      ...this.toResponseDto(asset),
      risks: asset.riskAssets.map(ra => ({
        id: ra.risk.id,
        riskId: ra.risk.riskId,
        title: ra.risk.title,
        inherentRisk: ra.risk.inherentRisk || 'unknown',
        status: ra.risk.status,
      })),
    };
  }

  async create(
    organizationId: string,
    dto: CreateAssetDto,
    userId: string,
    userEmail?: string,
  ): Promise<AssetResponseDto> {
    const asset = await this.prisma.asset.create({
      data: {
        organizationId,
        source: 'manual',
        name: dto.name,
        type: dto.type,
        category: dto.category,
        criticality: dto.criticality || 'medium',
        owner: dto.owner,
        location: dto.location,
        department: dto.department,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
      include: {
        _count: { select: { riskAssets: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'created',
      entityType: 'asset',
      entityId: asset.id,
      entityName: asset.name,
      description: `Created asset "${asset.name}"`,
    });

    return this.toResponseDto(asset);
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateAssetDto,
    userId: string,
    userEmail?: string,
  ): Promise<AssetResponseDto> {
    const existing = await this.prisma.asset.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        category: dto.category,
        status: dto.status,
        criticality: dto.criticality,
        owner: dto.owner,
        location: dto.location,
        department: dto.department,
      },
      include: {
        _count: { select: { riskAssets: true } },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'updated',
      entityType: 'asset',
      entityId: asset.id,
      entityName: asset.name,
      description: `Updated asset "${asset.name}"`,
    });

    return this.toResponseDto(asset);
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    await this.prisma.asset.delete({ where: { id } });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      userEmail,
      action: 'deleted',
      entityType: 'asset',
      entityId: id,
      entityName: asset.name,
      description: `Deleted asset "${asset.name}"`,
    });
  }

  // ===========================
  // Statistics
  // ===========================

  async getStats(organizationId: string): Promise<AssetStatsDto> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      totalAssets,
      bySource,
      byType,
      byCriticality,
      byStatus,
      recentlySynced,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { organizationId } }),
      this.prisma.asset.groupBy({
        by: ['source'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.asset.groupBy({
        by: ['type'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.asset.groupBy({
        by: ['criticality'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.asset.count({
        where: {
          organizationId,
          lastSyncAt: { gte: oneHourAgo },
        },
      }),
    ]);

    return {
      totalAssets,
      bySource: bySource.map(s => ({ source: s.source, count: s._count })),
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      byCriticality: byCriticality.map(c => ({ criticality: c.criticality, count: c._count })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      recentlySynced,
    };
  }

  async getSources(organizationId: string): Promise<string[]> {
    const sources = await this.prisma.asset.findMany({
      where: { organizationId },
      select: { source: true },
      distinct: ['source'],
    });
    return sources.map(s => s.source);
  }

  async getDepartments(organizationId: string): Promise<string[]> {
    const departments = await this.prisma.asset.findMany({
      where: { organizationId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });
    return departments.map(d => d.department!).filter(Boolean);
  }

  // ===========================
  // Integration Sync
  // ===========================

  async syncFromJamf(
    organizationId: string,
    integrationId: string,
    userId: string,
    userEmail?: string,
  ): Promise<SyncResultDto> {
    const startTime = Date.now();
    const result: SyncResultDto = {
      source: 'jamf',
      itemsProcessed: 0,
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get the integration config
      const integration = await this.prisma.integration.findFirst({
        where: { id: integrationId, organizationId, type: 'jamf' },
      });

      if (!integration) {
        throw new Error('Jamf integration not found');
      }

      const config = integration.config as any;
      if (!config.serverUrl || !config.clientId || !config.clientSecret) {
        throw new Error('Jamf integration not properly configured');
      }

      // Get access token
      const tokenResponse = await fetch(`${config.serverUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to obtain Jamf access token');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Fetch computers
      const computersResponse = await fetch(
        `${config.serverUrl}/api/v1/computers-inventory?section=GENERAL&section=HARDWARE&section=OPERATING_SYSTEM`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      );

      if (computersResponse.ok) {
        const computersData = await computersResponse.json();
        const computers = computersData.results || [];

        for (const computer of computers) {
          result.itemsProcessed++;
          try {
            await this.upsertAssetFromJamf(organizationId, computer, 'computer');
            result.itemsCreated++; // Simplified - could track create vs update
          } catch (error: any) {
            result.itemsFailed++;
            result.errors.push(`Computer ${computer.id}: ${error.message}`);
          }
        }
      }

      // Fetch mobile devices
      const mobileResponse = await fetch(
        `${config.serverUrl}/api/v2/mobile-devices`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        },
      );

      if (mobileResponse.ok) {
        const mobileData = await mobileResponse.json();
        const devices = mobileData.results || [];

        for (const device of devices) {
          result.itemsProcessed++;
          try {
            await this.upsertAssetFromJamf(organizationId, device, 'mobile');
            result.itemsCreated++;
          } catch (error: any) {
            result.itemsFailed++;
            result.errors.push(`Mobile ${device.id}: ${error.message}`);
          }
        }
      }

      // Update integration sync status
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.itemsFailed === 0 ? 'success' : 'partial',
        },
      });

      // Audit log
      await this.auditService.log({
        organizationId,
        userId,
        userEmail,
        action: 'synced',
        entityType: 'asset',
        entityId: integrationId,
        entityName: 'Jamf Asset Sync',
        description: `Synced ${result.itemsProcessed} assets from Jamf (${result.itemsCreated} created/updated, ${result.itemsFailed} failed)`,
      });

    } catch (error: any) {
      this.logger.error(`Jamf sync failed: ${error.message}`);
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async upsertAssetFromJamf(
    organizationId: string,
    data: any,
    deviceType: 'computer' | 'mobile',
  ) {
    const externalId = String(data.id);
    const general = data.general || data;
    const hardware = data.hardware || {};
    const os = data.operatingSystem || {};

    const assetType = deviceType === 'computer' 
      ? (hardware.model?.toLowerCase().includes('macbook') ? AssetType.WORKSTATION : AssetType.SERVER)
      : AssetType.MOBILE;

    await this.prisma.asset.upsert({
      where: {
        organizationId_externalId_source: {
          organizationId,
          externalId,
          source: 'jamf',
        },
      },
      update: {
        name: general.name || `Jamf Device ${externalId}`,
        type: assetType,
        category: hardware.model || undefined,
        status: 'active',
        owner: general.lastContactedUser?.username || undefined,
        department: general.site?.name || undefined,
        metadata: {
          model: hardware.model,
          serialNumber: hardware.serialNumber,
          osVersion: os.version,
          osName: os.name,
          managementId: general.managementId,
          lastContactTime: general.lastContactTime,
        },
        lastSyncAt: new Date(),
      },
      create: {
        organizationId,
        externalId,
        source: 'jamf',
        name: general.name || `Jamf Device ${externalId}`,
        type: assetType,
        category: hardware.model || undefined,
        criticality: 'medium',
        status: 'active',
        owner: general.lastContactedUser?.username || undefined,
        department: general.site?.name || undefined,
        metadata: {
          model: hardware.model,
          serialNumber: hardware.serialNumber,
          osVersion: os.version,
          osName: os.name,
          managementId: general.managementId,
          lastContactTime: general.lastContactTime,
        },
        lastSyncAt: new Date(),
      },
    });
  }

  // ===========================
  // Helpers
  // ===========================

  private toResponseDto(asset: any): AssetResponseDto {
    return {
      id: asset.id,
      externalId: asset.externalId || undefined,
      source: asset.source,
      name: asset.name,
      type: asset.type,
      category: asset.category || undefined,
      status: asset.status,
      criticality: asset.criticality,
      owner: asset.owner || undefined,
      location: asset.location || undefined,
      department: asset.department || undefined,
      metadata: asset.metadata || undefined,
      lastSyncAt: asset.lastSyncAt || undefined,
      riskCount: asset._count?.riskAssets || 0,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}

