import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(createVendorDto: CreateVendorDto, userId: string) {
    const vendor = await this.prisma.vendor.create({
      data: {
        ...createVendorDto,
        createdBy: userId,
      } as any,
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'CREATE_VENDOR',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Created vendor ${vendor.name}`,
      metadata: { vendorName: vendor.name },
    });

    return vendor;
  }

  async findAll(filters?: {
    category?: string;
    tier?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.tier) {
      where.tier = filters.tier;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { legalName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    where.deletedAt = null;

    return this.prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: {
            assessments: true,
            contracts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id, deletedAt: null },
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            assessments: true,
            contracts: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found`);
    }

    return vendor;
  }

  async update(id: string, updateVendorDto: UpdateVendorDto, userId: string) {
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: updateVendorDto as any,
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'UPDATE_VENDOR',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Updated vendor ${vendor.name}`,
      changes: updateVendorDto,
    });

    return vendor;
  }

  async remove(id: string, userId: string) {
    // First, get the vendor to include in audit log
    const vendor = await this.findOne(id);

    // Soft delete from database
    await this.prisma.vendor.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || 'system',
      },
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'DELETE_VENDOR',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Deleted vendor ${vendor.name}`,
    });

    return vendor;
  }

  async updateRiskScore(id: string, inherentRiskScore: string, userId: string) {
    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: { inherentRiskScore: inherentRiskScore as any },
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'UPDATE_VENDOR_RISK_SCORE',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Updated risk score for vendor ${vendor.name}`,
      metadata: { inherentRiskScore },
    });

    return vendor;
  }

  async getDashboardStats() {
    const [
      totalVendors,
      activeVendors,
      vendorsByTier,
      vendorsByCategory,
      highRiskVendors,
      recentVendors,
    ] = await Promise.all([
      this.prisma.vendor.count({ where: { deletedAt: null } }),
      this.prisma.vendor.count({ where: { status: 'active', deletedAt: null } }),
      this.prisma.vendor.groupBy({
        by: ['tier'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.vendor.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: true,
      }),
      this.prisma.vendor.count({
        where: {
          inherentRiskScore: { in: ['high', 'critical'] },
          deletedAt: null,
        },
      }),
      this.prisma.vendor.findMany({
        where: { deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          tier: true,
          inherentRiskScore: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalVendors,
      activeVendors,
      vendorsByTier: vendorsByTier.reduce((acc, item) => {
        acc[item.tier] = item._count;
        return acc;
      }, {}),
      vendorsByCategory: vendorsByCategory.reduce((acc, item) => {
        acc[item.category] = item._count;
        return acc;
      }, {}),
      highRiskVendors,
      recentVendors,
    };
  }
}
