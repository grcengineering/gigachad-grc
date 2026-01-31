import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  UpdateTprmConfigurationDto,
  TprmConfigurationResponseDto,
  TierFrequencyMappingDto,
  VendorCategoryDto,
  RiskThresholdsDto,
  AssessmentSettingsDto,
  ContractSettingsDto,
  FeatureSettingsDto,
} from './dto/tprm-config.dto';
import { TprmConfiguration, Prisma } from '@prisma/client';

// Default configuration values
const DEFAULT_TIER_FREQUENCY_MAPPING: TierFrequencyMappingDto = {
  tier_1: 'quarterly',
  tier_2: 'semi_annual',
  tier_3: 'annual',
  tier_4: 'biennial',
};

const DEFAULT_VENDOR_CATEGORIES: VendorCategoryDto[] = [
  { id: 'cat-1', name: 'SaaS Provider', description: 'Software as a Service providers', color: '#3b82f6' },
  { id: 'cat-2', name: 'Infrastructure Provider', description: 'Cloud and infrastructure services', color: '#8b5cf6' },
  { id: 'cat-3', name: 'Professional Services', description: 'Consulting and professional services', color: '#10b981' },
  { id: 'cat-4', name: 'Data Processor', description: 'Companies that process data on your behalf', color: '#ef4444' },
  { id: 'cat-5', name: 'Reseller/Distributor', description: 'Channel partners and resellers', color: '#f59e0b' },
  { id: 'cat-6', name: 'Hardware Vendor', description: 'Physical equipment and hardware suppliers', color: '#6366f1' },
  { id: 'cat-7', name: 'Financial Services', description: 'Banking and financial service providers', color: '#ec4899' },
  { id: 'cat-8', name: 'Other', description: 'Other vendor types', color: '#64748b' },
];

const DEFAULT_RISK_THRESHOLDS: RiskThresholdsDto = {
  very_low: 20,
  low: 40,
  medium: 60,
  high: 80,
  critical: 100,
};

const DEFAULT_ASSESSMENT_SETTINGS: AssessmentSettingsDto = {
  requireDocumentUpload: false,
  autoCreateAssessmentOnNewVendor: false,
  defaultAssessmentType: 'standard',
  enableAIAnalysis: true,
  notifyOnOverdueReview: true,
  overdueReminderDays: 7,
};

const DEFAULT_CONTRACT_SETTINGS: ContractSettingsDto = {
  expirationWarningDays: [90, 60, 30, 14, 7],
  requireSecurityAddendum: false,
  autoRenewNotification: true,
};

/**
 * Default feature settings - all features enabled by default
 * Note: Disabling a feature hides it from the UI but preserves all data
 */
const DEFAULT_FEATURE_SETTINGS: FeatureSettingsDto = {
  enableSecurityScanning: true,
  enableRiskAssessmentWizard: true,
  enableSubdomainSpider: true,
  enableVendorPortal: true,
  enableContractManagement: true,
  enableQuestionnaireAutomation: true,
};

/**
 * Available review frequency options (predefined)
 * Custom frequencies are stored as 'custom_X' where X is the number of months
 */
export const REVIEW_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly', months: 1 },
  { value: 'quarterly', label: 'Quarterly', months: 3 },
  { value: 'semi_annual', label: 'Semi-Annual', months: 6 },
  { value: 'annual', label: 'Annual', months: 12 },
  { value: 'biennial', label: 'Bi-Annual (2 years)', months: 24 },
  { value: 'custom', label: 'Custom...', months: 0 }, // Custom allows any number of months
];

/**
 * Parse a frequency value and return the number of months
 * Supports both predefined values and custom_X format
 */
export function parseFrequencyToMonths(frequency: string): number {
  // Check predefined frequencies first
  const predefined = REVIEW_FREQUENCY_OPTIONS.find(f => f.value === frequency);
  if (predefined && predefined.months > 0) {
    return predefined.months;
  }
  
  // Check for custom_X format (e.g., 'custom_18' = 18 months)
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
  const predefined = REVIEW_FREQUENCY_OPTIONS.find(f => f.value === frequency);
  if (predefined && predefined.value !== 'custom') {
    return predefined.label;
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
 * Tier labels for display
 */
export const TIER_LABELS = {
  tier_1: 'Tier 1 (Critical)',
  tier_2: 'Tier 2 (Important)',
  tier_3: 'Tier 3 (Standard)',
  tier_4: 'Tier 4 (Low Risk)',
};

@Injectable()
export class TprmConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get TPRM configuration for an organization
   * Creates default configuration if none exists
   */
  async getConfiguration(organizationId: string): Promise<TprmConfigurationResponseDto> {
    let config = await this.prisma.tprmConfiguration.findUnique({
      where: { organizationId },
    });

    // If no configuration exists, create with defaults
    if (!config) {
      config = await this.prisma.tprmConfiguration.create({
        data: {
          organizationId,
          tierFrequencyMapping: JSON.parse(JSON.stringify(DEFAULT_TIER_FREQUENCY_MAPPING)),
          vendorCategories: JSON.parse(JSON.stringify(DEFAULT_VENDOR_CATEGORIES)),
          riskThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_THRESHOLDS)),
          assessmentSettings: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_SETTINGS)),
          contractSettings: JSON.parse(JSON.stringify(DEFAULT_CONTRACT_SETTINGS)),
          featureSettings: JSON.parse(JSON.stringify(DEFAULT_FEATURE_SETTINGS)),
        },
      });
    }

    return this.mapToResponse(config);
  }

  /**
   * Update TPRM configuration
   */
  async updateConfiguration(
    organizationId: string,
    dto: UpdateTprmConfigurationDto,
    userId: string,
  ): Promise<TprmConfigurationResponseDto> {
    // Ensure configuration exists
    await this.getConfiguration(organizationId);

    // Build update data with proper JSON serialization
    const updateData: Record<string, Prisma.InputJsonValue | string> = {};
    
    // Only set updatedBy if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && uuidRegex.test(userId)) {
      updateData.updatedBy = userId;
    }

    if (dto.tierFrequencyMapping !== undefined) {
      updateData.tierFrequencyMapping = JSON.parse(JSON.stringify(dto.tierFrequencyMapping));
    }
    if (dto.vendorCategories !== undefined) {
      updateData.vendorCategories = JSON.parse(JSON.stringify(dto.vendorCategories));
    }
    if (dto.riskThresholds !== undefined) {
      updateData.riskThresholds = JSON.parse(JSON.stringify(dto.riskThresholds));
    }
    if (dto.assessmentSettings !== undefined) {
      updateData.assessmentSettings = JSON.parse(JSON.stringify(dto.assessmentSettings));
    }
    if (dto.contractSettings !== undefined) {
      updateData.contractSettings = JSON.parse(JSON.stringify(dto.contractSettings));
    }
    if (dto.featureSettings !== undefined) {
      updateData.featureSettings = JSON.parse(JSON.stringify(dto.featureSettings));
    }

    const config = await this.prisma.tprmConfiguration.update({
      where: { organizationId },
      data: updateData,
    });

    return this.mapToResponse(config);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(organizationId: string, userId: string): Promise<TprmConfigurationResponseDto> {
    // Only set updatedBy if it's a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUserId = userId && uuidRegex.test(userId) ? userId : undefined;
    
    const config = await this.prisma.tprmConfiguration.upsert({
      where: { organizationId },
      update: {
        tierFrequencyMapping: JSON.parse(JSON.stringify(DEFAULT_TIER_FREQUENCY_MAPPING)),
        vendorCategories: JSON.parse(JSON.stringify(DEFAULT_VENDOR_CATEGORIES)),
        riskThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_THRESHOLDS)),
        assessmentSettings: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_SETTINGS)),
        contractSettings: JSON.parse(JSON.stringify(DEFAULT_CONTRACT_SETTINGS)),
        featureSettings: JSON.parse(JSON.stringify(DEFAULT_FEATURE_SETTINGS)),
        ...(validUserId && { updatedBy: validUserId }),
      },
      create: {
        organizationId,
        tierFrequencyMapping: JSON.parse(JSON.stringify(DEFAULT_TIER_FREQUENCY_MAPPING)),
        vendorCategories: JSON.parse(JSON.stringify(DEFAULT_VENDOR_CATEGORIES)),
        riskThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_THRESHOLDS)),
        assessmentSettings: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_SETTINGS)),
        contractSettings: JSON.parse(JSON.stringify(DEFAULT_CONTRACT_SETTINGS)),
        featureSettings: JSON.parse(JSON.stringify(DEFAULT_FEATURE_SETTINGS)),
      },
    });

    return this.mapToResponse(config);
  }

  /**
   * Get the review frequency for a specific tier
   */
  async getFrequencyForTier(organizationId: string, tier: string): Promise<string> {
    const config = await this.getConfiguration(organizationId);
    return config.tierFrequencyMapping[tier as keyof TierFrequencyMappingDto] || 'annual';
  }

  /**
   * Add a new vendor category
   */
  async addCategory(
    organizationId: string,
    category: Omit<VendorCategoryDto, 'id'>,
    userId: string,
  ): Promise<TprmConfigurationResponseDto> {
    const config = await this.getConfiguration(organizationId);
    const newCategory: VendorCategoryDto = {
      ...category,
      id: `cat-${Date.now()}`,
    };

    const categories = [...config.vendorCategories, newCategory];

    return this.updateConfiguration(organizationId, { vendorCategories: categories }, userId);
  }

  /**
   * Remove a vendor category
   */
  async removeCategory(
    organizationId: string,
    categoryId: string,
    userId: string,
  ): Promise<TprmConfigurationResponseDto> {
    const config = await this.getConfiguration(organizationId);
    const categories = config.vendorCategories.filter(c => c.id !== categoryId);

    return this.updateConfiguration(organizationId, { vendorCategories: categories }, userId);
  }

  /**
   * Get reference data (frequency options, tier labels)
   */
  getReferenceData() {
    return {
      frequencyOptions: REVIEW_FREQUENCY_OPTIONS,
      tierLabels: TIER_LABELS,
      defaults: {
        tierFrequencyMapping: DEFAULT_TIER_FREQUENCY_MAPPING,
        vendorCategories: DEFAULT_VENDOR_CATEGORIES,
        riskThresholds: DEFAULT_RISK_THRESHOLDS,
        assessmentSettings: DEFAULT_ASSESSMENT_SETTINGS,
        contractSettings: DEFAULT_CONTRACT_SETTINGS,
        featureSettings: DEFAULT_FEATURE_SETTINGS,
      },
    };
  }

  private mapToResponse(config: TprmConfiguration): TprmConfigurationResponseDto {
    return {
      id: config.id,
      organizationId: config.organizationId,
      tierFrequencyMapping: (config.tierFrequencyMapping || DEFAULT_TIER_FREQUENCY_MAPPING) as unknown as TierFrequencyMappingDto,
      vendorCategories: (config.vendorCategories || []) as unknown as VendorCategoryDto[],
      riskThresholds: (config.riskThresholds || DEFAULT_RISK_THRESHOLDS) as unknown as RiskThresholdsDto,
      assessmentSettings: (config.assessmentSettings || {}) as unknown as AssessmentSettingsDto,
      contractSettings: (config.contractSettings || {}) as unknown as ContractSettingsDto,
      featureSettings: (config.featureSettings || DEFAULT_FEATURE_SETTINGS) as unknown as FeatureSettingsDto,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy ?? undefined,
    };
  }
}

