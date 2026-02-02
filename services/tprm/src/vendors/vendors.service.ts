import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { TprmConfigService } from '../config/tprm-config.service';
import { CacheService } from '@gigachad-grc/shared';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Prisma, VendorCategory, VendorTier, VendorStatus, VendorRiskScore } from '@prisma/client';

// Valid enum values for type guards
const VALID_CATEGORIES: VendorCategory[] = ['software_vendor', 'cloud_provider', 'professional_services', 'hardware_vendor', 'consultant'];
const VALID_TIERS: VendorTier[] = ['tier_1', 'tier_2', 'tier_3', 'tier_4'];
const VALID_STATUSES: VendorStatus[] = ['active', 'inactive', 'pending_onboarding', 'offboarding', 'terminated'];
const VALID_RISK_SCORES: VendorRiskScore[] = ['very_low', 'low', 'medium', 'high', 'critical'];

// Helper functions to convert strings to enum types
function toVendorCategory(value: string | undefined, defaultValue: VendorCategory = 'software_vendor'): VendorCategory {
  return VALID_CATEGORIES.includes(value as VendorCategory) ? value as VendorCategory : defaultValue;
}

function toVendorTier(value: string | undefined, defaultValue: VendorTier = 'tier_3'): VendorTier {
  return VALID_TIERS.includes(value as VendorTier) ? value as VendorTier : defaultValue;
}

function toVendorStatus(value: string | undefined, defaultValue: VendorStatus = 'active'): VendorStatus {
  return VALID_STATUSES.includes(value as VendorStatus) ? value as VendorStatus : defaultValue;
}

function toVendorRiskScore(value: string | undefined): VendorRiskScore | undefined {
  return VALID_RISK_SCORES.includes(value as VendorRiskScore) ? value as VendorRiskScore : undefined;
}

// ============================================
// Tier-Based Review Scheduling Constants
// ============================================

/**
 * Default tier-to-frequency mapping (used as fallback if config service unavailable)
 */
export const DEFAULT_TIER_REVIEW_FREQUENCY: Record<string, string> = {
  tier_1: 'quarterly',
  tier_2: 'semi_annual',
  tier_3: 'annual',
  tier_4: 'biennial',
};

/**
 * Maps review frequency to months until next review (predefined options)
 */
export const FREQUENCY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  biennial: 24,
};

/**
 * Human-readable labels for review frequencies
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_annual: 'Semi-Annual',
  annual: 'Annual',
  biennial: 'Bi-Annual (2 years)',
};

/**
 * Parse a frequency value and return the number of months
 * Supports both predefined values and custom_X format (e.g., 'custom_18' = 18 months)
 */
export function parseFrequencyToMonths(frequency: string): number {
  // Check predefined frequencies first
  if (FREQUENCY_MONTHS[frequency]) {
    return FREQUENCY_MONTHS[frequency];
  }
  
  // Check for custom_X format
  if (frequency.startsWith('custom_')) {
    const months = parseInt(frequency.replace('custom_', ''), 10);
    if (!isNaN(months) && months > 0) {
      return months;
    }
  }
  
  // Default to annual if unparseable
  return 12;
}

/**
 * Format a frequency value for display
 */
export function formatFrequencyLabel(frequency: string): string {
  if (FREQUENCY_LABELS[frequency]) {
    return FREQUENCY_LABELS[frequency];
  }
  
  if (frequency.startsWith('custom_')) {
    const months = parseInt(frequency.replace('custom_', ''), 10);
    if (!isNaN(months) && months > 0) {
      if (months === 1) return '1 Month';
      if (months < 12) return `${months} Months`;
      if (months === 12) return '1 Year';
      if (months % 12 === 0) return `${months / 12} Years`;
      return `${months} Months`;
    }
  }
  
  return frequency;
}

/**
 * Calculate the next review due date based on frequency
 * Supports both predefined and custom frequencies
 */
export function calculateNextReviewDate(
  lastReviewDate: Date | null,
  frequency: string,
): Date {
  const baseDate = lastReviewDate || new Date();
  const months = parseFrequencyToMonths(frequency);
  const nextDate = new Date(baseDate);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

/**
 * Check if a vendor review is overdue
 */
export function isReviewOverdue(nextReviewDue: Date | null): boolean {
  if (!nextReviewDue) return false;
  return new Date() > new Date(nextReviewDue);
}

/**
 * Get days until next review (negative if overdue)
 */
export function getDaysUntilReview(nextReviewDue: Date | null): number | null {
  if (!nextReviewDue) return null;
  const now = new Date();
  const due = new Date(nextReviewDue);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly tprmConfig: TprmConfigService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Auto-generate a unique vendorId in format VND-XXXX
   * Finds the highest existing sequential vendor ID and increments from there
   * Ignores timestamp-based IDs (more than 6 digits) to maintain proper sequencing
   */
  private async generateVendorId(): Promise<string> {
    // Find all vendors and extract the highest numeric ID
    const vendors = await this.prisma.vendor.findMany({
      select: { vendorId: true },
      where: {
        vendorId: { startsWith: 'VND-' }
      }
    });

    let maxNum = 0;
    for (const vendor of vendors) {
      // Match VND- followed by 1-6 digits (sequential IDs, not timestamps)
      const match = vendor.vendorId.match(/^VND-0*(\d{1,6})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        // Only consider numbers up to 999999 (sequential IDs, not timestamps)
        if (num <= 999999 && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `VND-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Get the review frequency for a tier using org-level config
   */
  private async getFrequencyForTier(organizationId: string, tier: string): Promise<string> {
    try {
      return await this.tprmConfig.getFrequencyForTier(organizationId, tier);
    } catch {
      // Fallback to default if config service fails
      return DEFAULT_TIER_REVIEW_FREQUENCY[tier] || 'annual';
    }
  }

  async create(createVendorDto: CreateVendorDto, userId: string) {
    // Auto-generate vendorId if not provided
    const vendorId = createVendorDto.vendorId || await this.generateVendorId();
    
    // Set defaults for category and tier if not provided
    const category = toVendorCategory(createVendorDto.category);
    const tier = toVendorTier(createVendorDto.tier);
    const status = toVendorStatus(createVendorDto.status);
    
    // Auto-set review frequency based on tier if not provided
    const reviewFrequency = createVendorDto.reviewFrequency || 
      await this.getFrequencyForTier(createVendorDto.organizationId!, tier);
    
    // Calculate next review due date
    const nextReviewDue = calculateNextReviewDate(null, reviewFrequency);

    const vendor = await this.prisma.vendor.create({
      data: {
        organizationId: createVendorDto.organizationId!,
        vendorId,
        name: createVendorDto.name,
        legalName: createVendorDto.legalName,
        category,
        tier,
        status,
        description: createVendorDto.description,
        website: createVendorDto.website,
        primaryContact: createVendorDto.primaryContact,
        primaryContactEmail: createVendorDto.primaryContactEmail,
        primaryContactPhone: createVendorDto.primaryContactPhone,
        notes: createVendorDto.notes,
        reviewFrequency,
        nextReviewDue,
        createdBy: userId,
      },
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'CREATE_VENDOR',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Created vendor ${vendor.name}`,
      metadata: { vendorName: vendor.name, reviewFrequency, nextReviewDue },
    });

    return vendor;
  }

  async findAll(filters?: {
    category?: string;
    tier?: string;
    status?: string;
    search?: string;
  }) {
    const where: Prisma.VendorWhereInput = {};

    if (filters?.category) {
      where.category = toVendorCategory(filters.category);
    }

    if (filters?.tier) {
      where.tier = toVendorTier(filters.tier);
    }

    if (filters?.status) {
      where.status = toVendorStatus(filters.status);
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { legalName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    where.deletedAt = null;

    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({
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
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, organizationId: string) {
    // SECURITY: Include organizationId in query to prevent IDOR
    // This ensures users can only access vendors within their organization
    const vendor = await this.prisma.vendor.findFirst({
      where: { 
        id, 
        organizationId, // Tenant isolation - prevents cross-organization access
        deletedAt: null,
      },
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

  async update(id: string, updateVendorDto: UpdateVendorDto, userId: string, organizationId: string) {
    // SECURITY: Verify vendor belongs to user's organization before updating
    const currentVendor = await this.findOne(id, organizationId);
    
    const { category, tier, status, ...restDto } = updateVendorDto;
    const updateData: Prisma.VendorUpdateInput = { ...restDto };
    
    if (category) {
      updateData.category = toVendorCategory(category);
    }
    
    if (status) {
      updateData.status = toVendorStatus(status);
    }
    
    // If tier is being changed, update review frequency and next review date using org config
    if (tier && tier !== currentVendor.tier) {
      const newTier = toVendorTier(tier);
      updateData.tier = newTier;
      const newFrequency = await this.getFrequencyForTier(
        currentVendor.organizationId,
        tier
      );
      updateData.reviewFrequency = newFrequency;
      updateData.nextReviewDue = calculateNextReviewDate(
        currentVendor.lastReviewedAt,
        newFrequency
      );
    } else if (tier) {
      updateData.tier = toVendorTier(tier);
    }

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'UPDATE_VENDOR',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Updated vendor ${vendor.name}`,
      changes: updateVendorDto as unknown as Prisma.InputJsonValue,
    });

    return vendor;
  }

  async remove(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify vendor belongs to user's organization before deleting
    const vendor = await this.findOne(id, organizationId);

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

  async updateRiskScore(id: string, inherentRiskScore: string, userId: string, organizationId: string) {
    // SECURITY: Verify vendor belongs to user's organization before updating
    const existingVendor = await this.findOne(id, organizationId);
    
    const vendor = await this.prisma.vendor.update({
      where: { id: existingVendor.id },
      data: { inherentRiskScore: toVendorRiskScore(inherentRiskScore) },
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

  /**
   * Get vendors due for review with categorization
   * PERFORMANCE: Cached for 5 minutes to reduce dashboard load times
   */
  async getVendorsDueForReview(organizationId?: string) {
    const cacheKey = `vendor-reviews-due:${organizationId || 'all'}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => this.getVendorsDueForReviewUncached(organizationId),
      300, // 5 minute cache
    );
  }

  /**
   * Uncached implementation of getVendorsDueForReview
   */
  private async getVendorsDueForReviewUncached(organizationId?: string) {
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const baseWhere: Prisma.VendorWhereInput = {
      deletedAt: null,
      status: 'active',
    };

    if (organizationId) {
      baseWhere.organizationId = organizationId;
    }

    const [overdue, dueThisWeek, dueThisMonth, allUpcoming] = await Promise.all([
      // Overdue reviews
      this.prisma.vendor.findMany({
        where: {
          ...baseWhere,
          nextReviewDue: { lt: now },
        },
        select: {
          id: true,
          name: true,
          vendorId: true,
          tier: true,
          inherentRiskScore: true,
          nextReviewDue: true,
          lastReviewedAt: true,
          reviewFrequency: true,
        },
        orderBy: { nextReviewDue: 'asc' },
      }),

      // Due this week (not overdue)
      this.prisma.vendor.findMany({
        where: {
          ...baseWhere,
          nextReviewDue: { gte: now, lte: oneWeekFromNow },
        },
        select: {
          id: true,
          name: true,
          vendorId: true,
          tier: true,
          inherentRiskScore: true,
          nextReviewDue: true,
          lastReviewedAt: true,
          reviewFrequency: true,
        },
        orderBy: { nextReviewDue: 'asc' },
      }),

      // Due this month (not this week)
      this.prisma.vendor.findMany({
        where: {
          ...baseWhere,
          nextReviewDue: { gt: oneWeekFromNow, lte: oneMonthFromNow },
        },
        select: {
          id: true,
          name: true,
          vendorId: true,
          tier: true,
          inherentRiskScore: true,
          nextReviewDue: true,
          lastReviewedAt: true,
          reviewFrequency: true,
        },
        orderBy: { nextReviewDue: 'asc' },
      }),

      // Count of all upcoming (next 90 days)
      this.prisma.vendor.count({
        where: {
          ...baseWhere,
          nextReviewDue: {
            gte: now,
            lte: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      overdue: overdue.map((v) => ({
        ...v,
        daysOverdue: getDaysUntilReview(v.nextReviewDue) ? Math.abs(getDaysUntilReview(v.nextReviewDue)!) : 0,
      })),
      dueThisWeek: dueThisWeek.map((v) => ({
        ...v,
        daysUntilDue: getDaysUntilReview(v.nextReviewDue),
      })),
      dueThisMonth: dueThisMonth.map((v) => ({
        ...v,
        daysUntilDue: getDaysUntilReview(v.nextReviewDue),
      })),
      summary: {
        overdueCount: overdue.length,
        dueThisWeekCount: dueThisWeek.length,
        dueThisMonthCount: dueThisMonth.length,
        upcomingCount: allUpcoming,
      },
    };
  }

  /**
   * Update vendor's last review date and recalculate next review due
   */
  async updateReviewDates(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify vendor belongs to user's organization before updating
    const vendor = await this.findOne(id, organizationId);
    const now = new Date();
    const nextReviewDue = calculateNextReviewDate(now, vendor.reviewFrequency || 'annual');

    const updated = await this.prisma.vendor.update({
      where: { id },
      data: {
        lastReviewedAt: now,
        nextReviewDue,
      },
    });

    await this.audit.log({
      organizationId: vendor.organizationId,
      userId,
      action: 'UPDATE_VENDOR_REVIEW_DATES',
      entityType: 'vendor',
      entityId: vendor.id,
      entityName: vendor.name,
      description: `Updated review dates for vendor ${vendor.name}`,
      metadata: { lastReviewedAt: now, nextReviewDue },
    });

    return updated;
  }
}
