import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateAssetDto,
  UpdateAssetDto,
  AssetFilterDto,
  AssetDto,
  AssetSummaryDto,
} from './dto/asset.dto';
import {
  parsePaginationParams,
  createPaginatedResponse,
  getPrismaSkipTake,
} from '@gigachad-grc/shared';
import { AssetType, AssetStatus, AssetCriticality, Prisma } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================
  // CRUD Operations
  // ============================================

  async create(organizationId: string, dto: CreateAssetDto, userId?: string): Promise<AssetDto> {
    // Check for duplicate external ID if provided
    if (dto.externalId) {
      const existing = await this.prisma.asset.findFirst({
        where: {
          externalId: dto.externalId,
          source: dto.source || 'manual',
          organizationId,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new BadRequestException(`Asset with external ID ${dto.externalId} already exists`);
      }
    }

    const asset = await this.prisma.asset.create({
      data: {
        name: dto.name,
        type: dto.type as AssetType || AssetType.server,
        status: dto.status as AssetStatus || AssetStatus.active,
        criticality: dto.criticality as AssetCriticality || AssetCriticality.medium,
        source: dto.source || 'manual',
        externalId: dto.externalId,
        category: dto.category,
        owner: dto.owner,
        location: dto.location,
        department: dto.department,
        metadata: dto.metadata as Prisma.InputJsonValue || Prisma.JsonNull,
        organizationId,
        workspaceId: dto.workspaceId,
      },
      include: {
        organization: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        riskAssets: {
          include: {
            risk: { select: { id: true, riskId: true, title: true } },
          },
        },
      },
    });

    await this.auditService.log({
      action: 'asset_created',
      entityType: 'asset',
      entityId: asset.id,
      entityName: dto.name,
      organizationId,
      userId,
      description: `Created asset: ${dto.name}`,
    });

    return this.toAssetDto(asset);
  }

  async findAll(
    organizationId: string,
    filters: AssetFilterDto
  ): Promise<{ data: AssetDto[]; meta: Record<string, unknown> }> {
    const pagination = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy || 'createdAt',
      sortOrder: filters.sortOrder || 'desc',
    });

    const where: Prisma.AssetWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { externalId: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { owner: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.types?.length) {
      where.type = { in: filters.types as AssetType[] };
    }

    if (filters.statuses?.length) {
      where.status = { in: filters.statuses as AssetStatus[] };
    }

    if (filters.criticalities?.length) {
      where.criticality = { in: filters.criticalities as AssetCriticality[] };
    }

    if (filters.department) {
      where.department = filters.department;
    }

    if (filters.source) {
      where.source = filters.source;
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        include: {
          workspace: { select: { id: true, name: true } },
          riskAssets: {
            select: { riskId: true },
          },
        },
        ...getPrismaSkipTake(pagination),
        orderBy: { [pagination.sortBy]: pagination.sortOrder },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return createPaginatedResponse(
      assets.map(a => this.toAssetDto(a)),
      total,
      pagination
    );
  }

  async findOne(organizationId: string, id: string): Promise<AssetDto> {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
        riskAssets: {
          include: {
            risk: { select: { id: true, riskId: true, title: true, status: true } },
          },
        },
        vendorAccessSystems: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.toAssetDto(asset);
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateAssetDto,
    userId?: string
  ): Promise<AssetDto> {
    const existing = await this.prisma.asset.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    const asset = await this.prisma.asset.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as AssetType,
        status: dto.status as AssetStatus,
        criticality: dto.criticality as AssetCriticality,
        category: dto.category,
        owner: dto.owner,
        location: dto.location,
        department: dto.department,
        metadata: dto.metadata as Prisma.InputJsonValue,
        lastSyncAt: dto.lastSyncAt ? new Date(dto.lastSyncAt) : undefined,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        riskAssets: {
          select: { riskId: true },
        },
      },
    });

    await this.auditService.log({
      action: 'asset_updated',
      entityType: 'asset',
      entityId: id,
      entityName: asset.name,
      organizationId,
      userId,
      description: `Updated asset: ${asset.name}`,
    });

    return this.toAssetDto(asset);
  }

  async delete(organizationId: string, id: string, userId?: string): Promise<void> {
    const existing = await this.prisma.asset.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    await this.prisma.asset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'asset_deleted',
      entityType: 'asset',
      entityId: id,
      entityName: existing.name,
      organizationId,
      userId,
      description: `Deleted asset: ${existing.name}`,
    });
  }

  // ============================================
  // Summary & Analytics
  // ============================================

  async getSummary(organizationId: string): Promise<AssetSummaryDto> {
    const [
      totalAssets,
      byType,
      byStatus,
      byCriticality,
    ] = await Promise.all([
      this.prisma.asset.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.asset.groupBy({
        by: ['type'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.asset.groupBy({
        by: ['criticality'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      totalAssets,
      byType: byType.map(b => ({ type: b.type, count: b._count })),
      byStatus: byStatus.map(b => ({ status: b.status, count: b._count })),
      byCriticality: byCriticality.map(b => ({
        criticality: b.criticality,
        count: b._count,
      })),
    };
  }

  // ============================================
  // Link Operations
  // ============================================

  async linkToRisk(
    organizationId: string,
    assetId: string,
    riskId: string,
    notes?: string
  ): Promise<void> {
    const [asset, risk] = await Promise.all([
      this.prisma.asset.findFirst({
        where: { id: assetId, organizationId, deletedAt: null },
      }),
      this.prisma.risk.findFirst({
        where: { id: riskId, organizationId, deletedAt: null },
      }),
    ]);

    if (!asset) throw new NotFoundException('Asset not found');
    if (!risk) throw new NotFoundException('Risk not found');

    const existing = await this.prisma.riskAsset.findFirst({
      where: { assetId, riskId },
    });

    if (existing) {
      throw new BadRequestException('Asset is already linked to this risk');
    }

    await this.prisma.riskAsset.create({
      data: {
        assetId,
        riskId,
        notes,
      },
    });

    await this.auditService.log({
      action: 'asset_linked_to_risk',
      entityType: 'asset',
      entityId: assetId,
      organizationId,
      description: `Linked asset to risk ${riskId}`,
      metadata: { riskId, notes },
    });
  }

  async unlinkFromRisk(
    organizationId: string,
    assetId: string,
    riskId: string
  ): Promise<void> {
    await this.prisma.riskAsset.deleteMany({
      where: { assetId, riskId },
    });

    await this.auditService.log({
      action: 'asset_unlinked_from_risk',
      entityType: 'asset',
      entityId: assetId,
      organizationId,
      description: `Unlinked asset from risk ${riskId}`,
      metadata: { riskId },
    });
  }

  // ============================================
  // Helper Methods
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toAssetDto(asset: any): AssetDto {
    return {
      id: asset.id,
      externalId: asset.externalId,
      source: asset.source,
      name: asset.name,
      type: asset.type,
      category: asset.category,
      status: asset.status,
      criticality: asset.criticality,
      owner: asset.owner,
      location: asset.location,
      department: asset.department,
      metadata: asset.metadata as Record<string, unknown>,
      lastSyncAt: asset.lastSyncAt,
      workspaceId: asset.workspaceId,
      workspaceName: asset.workspace?.name,
      riskCount: asset.riskAssets?.length || 0,
      linkedRisks: asset.riskAssets?.map((ra: { risk?: { id: string; riskId: string; title: string } }) => ({
        riskId: ra.risk?.id,
        riskCode: ra.risk?.riskId,
        title: ra.risk?.title,
      })),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
