/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateRiskConfigurationDto,
  RiskConfigurationResponseDto,
  LikelihoodScaleItemDto,
  ImpactScaleItemDto,
  RiskCategoryDto,
  WorkflowSettingsDto,
  RiskLevelThresholdsDto,
  RiskAppetiteDto,
} from './dto/risk-config.dto';

// Default configuration values
const DEFAULT_LIKELIHOOD_SCALE: LikelihoodScaleItemDto[] = [
  { value: 'rare', label: 'Rare', description: '<5% probability', weight: 1 },
  { value: 'unlikely', label: 'Unlikely', description: '5-25% probability', weight: 2 },
  { value: 'possible', label: 'Possible', description: '25-50% probability', weight: 3 },
  { value: 'likely', label: 'Likely', description: '50-75% probability', weight: 4 },
  { value: 'almost_certain', label: 'Almost Certain', description: '>75% probability', weight: 5 },
];

const DEFAULT_IMPACT_SCALE: ImpactScaleItemDto[] = [
  { value: 'negligible', label: 'Negligible', description: 'Minimal impact', weight: 1 },
  { value: 'minor', label: 'Minor', description: 'Minor disruption', weight: 2 },
  { value: 'moderate', label: 'Moderate', description: 'Significant impact', weight: 3 },
  { value: 'major', label: 'Major', description: 'Major business impact', weight: 4 },
  { value: 'severe', label: 'Severe', description: 'Critical/catastrophic', weight: 5 },
];

const DEFAULT_CATEGORIES: RiskCategoryDto[] = [
  { id: 'cat-1', name: 'Security', description: 'Information security and cybersecurity risks', color: '#ef4444' },
  { id: 'cat-2', name: 'Compliance', description: 'Regulatory and compliance risks', color: '#f59e0b' },
  { id: 'cat-3', name: 'Operational', description: 'Business operations and process risks', color: '#3b82f6' },
  { id: 'cat-4', name: 'Financial', description: 'Financial and monetary risks', color: '#10b981' },
  { id: 'cat-5', name: 'Strategic', description: 'Strategic and business risks', color: '#8b5cf6' },
  { id: 'cat-6', name: 'Third Party', description: 'Vendor and third-party risks', color: '#ec4899' },
];

const DEFAULT_RISK_LEVEL_THRESHOLDS: RiskLevelThresholdsDto = {
  low: 4,
  medium: 9,
  high: 14,
  critical: 25,
};

const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettingsDto = {
  requireAssessment: true,
  requireGrcReview: true,
  autoAssignOwner: false,
  executiveApprovalThreshold: 'high',
  defaultReviewFrequency: 'quarterly',
  autoCloseAccepted: true,
  notifyOnStatusChange: true,
  notifyOnDueDate: true,
  dueDateReminderDays: 7,
};

const DEFAULT_RISK_APPETITE: RiskAppetiteDto[] = [
  { category: 'Security', level: 'low', description: 'Minimal tolerance for security risks' },
  { category: 'Compliance', level: 'low', description: 'Very low tolerance for compliance violations' },
  { category: 'Operational', level: 'medium', description: 'Moderate tolerance for operational disruptions' },
  { category: 'Financial', level: 'medium', description: 'Moderate tolerance for financial risks' },
  { category: 'Strategic', level: 'high', description: 'Higher tolerance for strategic risks' },
  { category: 'Third Party', level: 'low', description: 'Low tolerance for vendor risks' },
];

@Injectable()
export class RiskConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get risk configuration for an organization
   * Creates default configuration if none exists
   */
  async getConfiguration(organizationId: string): Promise<RiskConfigurationResponseDto> {
    let config = await this.prisma.riskConfiguration.findUnique({
      where: { organizationId },
    });

    // If no configuration exists, create with defaults
    if (!config) {
      config = await this.prisma.riskConfiguration.create({
        data: {
          organizationId,
          methodology: 'qualitative',
          likelihoodScale: JSON.parse(JSON.stringify(DEFAULT_LIKELIHOOD_SCALE)),
          impactScale: JSON.parse(JSON.stringify(DEFAULT_IMPACT_SCALE)),
          categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
          riskLevelThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_LEVEL_THRESHOLDS)),
          workflowSettings: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_SETTINGS)),
          riskAppetite: JSON.parse(JSON.stringify(DEFAULT_RISK_APPETITE)),
        },
      });
    }

    return this.mapToResponse(config);
  }

  /**
   * Update risk configuration
   */
  async updateConfiguration(
    organizationId: string,
    dto: UpdateRiskConfigurationDto,
    userId: string,
  ): Promise<RiskConfigurationResponseDto> {
    // Ensure configuration exists
    const _existing = await this.getConfiguration(organizationId);

     
    const updateData: Record<string, any> = {
      updatedBy: userId,
    };

    if (dto.methodology !== undefined) {
      updateData.methodology = dto.methodology;
    }
    if (dto.likelihoodScale !== undefined) {
      updateData.likelihoodScale = JSON.parse(JSON.stringify(dto.likelihoodScale));
    }
    if (dto.impactScale !== undefined) {
      updateData.impactScale = JSON.parse(JSON.stringify(dto.impactScale));
    }
    if (dto.categories !== undefined) {
      updateData.categories = JSON.parse(JSON.stringify(dto.categories));
    }
    if (dto.riskLevelThresholds !== undefined) {
      updateData.riskLevelThresholds = JSON.parse(JSON.stringify(dto.riskLevelThresholds));
    }
    if (dto.workflowSettings !== undefined) {
      updateData.workflowSettings = JSON.parse(JSON.stringify(dto.workflowSettings));
    }
    if (dto.riskAppetite !== undefined) {
      updateData.riskAppetite = JSON.parse(JSON.stringify(dto.riskAppetite));
    }

    const config = await this.prisma.riskConfiguration.update({
      where: { organizationId },
      data: updateData,
    });

    return this.mapToResponse(config);
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(organizationId: string, userId: string): Promise<RiskConfigurationResponseDto> {
    const config = await this.prisma.riskConfiguration.upsert({
      where: { organizationId },
      update: {
        methodology: 'qualitative',
        likelihoodScale: JSON.parse(JSON.stringify(DEFAULT_LIKELIHOOD_SCALE)),
        impactScale: JSON.parse(JSON.stringify(DEFAULT_IMPACT_SCALE)),
        categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
        riskLevelThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_LEVEL_THRESHOLDS)),
        workflowSettings: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_SETTINGS)),
        riskAppetite: JSON.parse(JSON.stringify(DEFAULT_RISK_APPETITE)),
        updatedBy: userId,
      },
      create: {
        organizationId,
        methodology: 'qualitative',
        likelihoodScale: JSON.parse(JSON.stringify(DEFAULT_LIKELIHOOD_SCALE)),
        impactScale: JSON.parse(JSON.stringify(DEFAULT_IMPACT_SCALE)),
        categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
        riskLevelThresholds: JSON.parse(JSON.stringify(DEFAULT_RISK_LEVEL_THRESHOLDS)),
        workflowSettings: JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_SETTINGS)),
        riskAppetite: JSON.parse(JSON.stringify(DEFAULT_RISK_APPETITE)),
      },
    });

    return this.mapToResponse(config);
  }

  /**
   * Add a new category
   */
  async addCategory(
    organizationId: string,
    category: Omit<RiskCategoryDto, 'id'>,
    userId: string,
  ): Promise<RiskConfigurationResponseDto> {
    const config = await this.getConfiguration(organizationId);
    const newCategory: RiskCategoryDto = {
      ...category,
      id: `cat-${Date.now()}`,
    };
    
    const categories = [...config.categories, newCategory];

    return this.updateConfiguration(organizationId, { categories }, userId);
  }

  /**
   * Remove a category
   */
  async removeCategory(
    organizationId: string,
    categoryId: string,
    userId: string,
  ): Promise<RiskConfigurationResponseDto> {
    const config = await this.getConfiguration(organizationId);
    const categories = config.categories.filter(c => c.id !== categoryId);

    return this.updateConfiguration(organizationId, { categories }, userId);
  }

  /**
   * Update risk appetite for a category
   */
  async updateRiskAppetite(
    organizationId: string,
    category: string,
    level: string,
    description?: string,
    userId?: string,
  ): Promise<RiskConfigurationResponseDto> {
    const config = await this.getConfiguration(organizationId);
    
    const existingIndex = config.riskAppetite.findIndex(a => a.category === category);
    const riskAppetite = [...config.riskAppetite];
    
    if (existingIndex >= 0) {
      riskAppetite[existingIndex] = { category, level, description };
    } else {
      riskAppetite.push({ category, level, description });
    }

    return this.updateConfiguration(organizationId, { riskAppetite }, userId || 'system');
  }

   
  private mapToResponse(config: Record<string, any>): RiskConfigurationResponseDto {
    return {
      id: config.id,
      organizationId: config.organizationId,
      methodology: config.methodology,
      likelihoodScale: (config.likelihoodScale || []) as LikelihoodScaleItemDto[],
      impactScale: (config.impactScale || []) as ImpactScaleItemDto[],
      categories: (config.categories || []) as RiskCategoryDto[],
      riskLevelThresholds: (config.riskLevelThresholds || {}) as RiskLevelThresholdsDto,
      workflowSettings: (config.workflowSettings || {}) as WorkflowSettingsDto,
      riskAppetite: (config.riskAppetite || []) as RiskAppetiteDto[],
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  }
}



