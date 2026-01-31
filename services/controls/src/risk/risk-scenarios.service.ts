/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateRiskScenarioDto,
  UpdateRiskScenarioDto,
  ListRiskScenariosQueryDto,
  Likelihood,
  Impact,
} from './dto/risk-scenario.dto';

export interface RiskScenario {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  threatActor: string;
  attackVector: string;
  targetAssets: string[];
  likelihood: string;
  impact: string;
  tags: string[];
  isTemplate: boolean;
  usageCount: number;
  simulation: Record<string, unknown> | null;
  relatedControlIds: string[];
  relatedRiskIds: string[];
  mitigationStrategy: string | null;
  businessContext: string | null;
  complianceImpact: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

// Impact matrix for risk score calculation
const LIKELIHOOD_SCORES: Record<Likelihood, number> = {
  [Likelihood.rare]: 1,
  [Likelihood.unlikely]: 2,
  [Likelihood.possible]: 3,
  [Likelihood.likely]: 4,
  [Likelihood.almost_certain]: 5,
};

const IMPACT_SCORES: Record<Impact, number> = {
  [Impact.negligible]: 1,
  [Impact.minor]: 2,
  [Impact.moderate]: 3,
  [Impact.major]: 4,
  [Impact.severe]: 5,
};

@Injectable()
export class RiskScenariosService {
  private readonly logger = new Logger(RiskScenariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Calculate inherent risk score from likelihood and impact
   */
  private calculateRiskScore(likelihood: Likelihood, impact: Impact): number {
    return LIKELIHOOD_SCORES[likelihood] * IMPACT_SCORES[impact];
  }

  /**
   * Get risk level from score
   */
  private getRiskLevel(score: number): string {
    if (score >= 20) return 'critical';
    if (score >= 12) return 'high';
    if (score >= 6) return 'medium';
    return 'low';
  }

  /**
   * List risk scenarios with filtering and pagination
   */
  async listScenarios(
    organizationId: string,
    query: ListRiskScenariosQueryDto,
  ): Promise<{
    data: RiskScenario[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, category, threatActor, attackVector, isTemplate, page = 1, limit = 25 } = query;

     
    const where: Record<string, any> = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (threatActor) {
      where.threatActor = threatActor;
    }

    if (attackVector) {
      where.attackVector = attackVector;
    }

    if (isTemplate !== undefined) {
      where.isTemplate = isTemplate;
    }

    const [data, total] = await Promise.all([
      this.prisma.riskScenarioTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.riskScenarioTemplate.count({ where }),
    ]);

    return {
      data: data as unknown as RiskScenario[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single risk scenario by ID
   */
  async getScenario(organizationId: string, id: string): Promise<RiskScenario & { riskScore: number; riskLevel: string }> {
    const scenario = await this.prisma.riskScenarioTemplate.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
    });

    if (!scenario) {
      throw new NotFoundException('Risk scenario not found');
    }

    const riskScore = this.calculateRiskScore(
      scenario.likelihood as Likelihood,
      scenario.impact as Impact,
    );

    return {
      ...(scenario as unknown as RiskScenario),
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
    };
  }

  /**
   * Create a new risk scenario
   */
  async createScenario(
    organizationId: string,
    userId: string,
    dto: CreateRiskScenarioDto,
  ): Promise<RiskScenario> {
    const scenario = await this.prisma.riskScenarioTemplate.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        threatActor: dto.threatActor,
        attackVector: dto.attackVector,
        targetAssets: dto.targetAssets,
        likelihood: dto.likelihood,
        impact: dto.impact,
        tags: dto.tags || [],
        isTemplate: dto.isTemplate || false,
        simulation: dto.simulation ? JSON.parse(JSON.stringify(dto.simulation)) : null,
        relatedControlIds: dto.relatedControlIds || [],
        relatedRiskIds: dto.relatedRiskIds || [],
        mitigationStrategy: dto.mitigationStrategy || null,
        businessContext: dto.businessContext || null,
        complianceImpact: dto.complianceImpact || null,
        createdBy: userId,
        usageCount: 0,
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'RISK_SCENARIO',
      entityId: scenario.id,
      description: `Created risk scenario: ${scenario.title}`,
      changes: { after: scenario },
    });

    this.logger.log(`Created risk scenario: ${scenario.id} - ${scenario.title}`);
    return scenario as unknown as RiskScenario;
  }

  /**
   * Update an existing risk scenario
   */
  async updateScenario(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdateRiskScenarioDto,
  ): Promise<RiskScenario> {
    const existing = await this.prisma.riskScenarioTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Risk scenario not found');
    }

    // Extract simulation and handle type conversion
    const { simulation, ...restDto } = dto;
    const updated = await this.prisma.riskScenarioTemplate.update({
      where: { id },
      data: {
        ...restDto,
        ...(simulation !== undefined && { simulation: JSON.parse(JSON.stringify(simulation)) }),
        updatedAt: new Date(),
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'RISK_SCENARIO',
      entityId: id,
      description: `Updated risk scenario: ${updated.title}`,
      changes: { before: existing, after: updated },
    });

    this.logger.log(`Updated risk scenario: ${id}`);
    return updated as unknown as RiskScenario;
  }

  /**
   * Delete a risk scenario (soft delete)
   */
  async deleteScenario(organizationId: string, userId: string, id: string): Promise<void> {
    const existing = await this.prisma.riskScenarioTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Risk scenario not found');
    }

    await this.prisma.riskScenarioTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'RISK_SCENARIO',
      entityId: id,
      description: `Deleted risk scenario: ${existing.title}`,
      changes: { before: existing },
    });

    this.logger.log(`Deleted risk scenario: ${id}`);
  }

  /**
   * Clone a risk scenario
   */
  async cloneScenario(
    organizationId: string,
    userId: string,
    id: string,
    newTitle?: string,
  ): Promise<RiskScenario> {
    const original = await this.prisma.riskScenarioTemplate.findFirst({
      where: { id, deletedAt: null },
    });

    if (!original) {
      throw new NotFoundException('Risk scenario not found');
    }

    // Increment usage count on template
    if (original.isTemplate) {
      await this.prisma.riskScenarioTemplate.update({
        where: { id },
        data: { usageCount: { increment: 1 } },
      });
    }

    const cloned = await this.prisma.riskScenarioTemplate.create({
      data: {
        organizationId,
        title: newTitle || `${original.title} (Copy)`,
        description: original.description,
        category: original.category,
        threatActor: original.threatActor,
        attackVector: original.attackVector,
        targetAssets: original.targetAssets as string[],
        likelihood: original.likelihood,
        impact: original.impact,
        tags: original.tags as string[],
        isTemplate: false,
        simulation: original.simulation ? JSON.parse(JSON.stringify(original.simulation)) : null,
        relatedControlIds: original.relatedControlIds as string[],
        relatedRiskIds: original.relatedRiskIds as string[],
        mitigationStrategy: original.mitigationStrategy,
        businessContext: original.businessContext,
        complianceImpact: original.complianceImpact,
        createdBy: userId,
        usageCount: 0,
      },
    });

    this.logger.log(`Cloned risk scenario: ${id} -> ${cloned.id}`);
    return cloned as unknown as RiskScenario;
  }

  /**
   * Get all unique categories
   */
  async getCategories(organizationId: string): Promise<string[]> {
    const scenarios = await this.prisma.riskScenarioTemplate.findMany({
      where: { organizationId, deletedAt: null },
      distinct: ['category'],
      select: { category: true },
    });

    return scenarios.map((s) => s.category).filter(Boolean).sort();
  }

  /**
   * Get template scenarios (both global library and org-specific templates)
   */
  async getTemplates(organizationId?: string): Promise<RiskScenario[]> {
    const templates = await this.prisma.riskScenarioTemplate.findMany({
      where: {
        isTemplate: true,
        deletedAt: null,
        OR: [
          { organizationId: null }, // Global library templates
          ...(organizationId ? [{ organizationId }] : []), // Org-specific templates
        ],
      },
      orderBy: [{ usageCount: 'desc' }, { title: 'asc' }],
    });

    return templates as unknown as RiskScenario[];
  }

  /**
   * Get only global library templates (available to all organizations)
   */
  async getLibraryTemplates(): Promise<RiskScenario[]> {
    const templates = await this.prisma.riskScenarioTemplate.findMany({
      where: {
        organizationId: null,
        isTemplate: true,
        deletedAt: null,
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });

    return templates as unknown as RiskScenario[];
  }

  /**
   * Get library templates grouped by category
   */
  async getLibraryByCategory(): Promise<{ category: string; templates: RiskScenario[] }[]> {
    const templates = await this.getLibraryTemplates();
    
    const grouped = new Map<string, RiskScenario[]>();
    for (const template of templates) {
      if (!grouped.has(template.category)) {
        grouped.set(template.category, []);
      }
      grouped.get(template.category)!.push(template);
    }
    
    return Array.from(grouped.entries())
      .map(([category, templates]) => ({ category, templates }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Bulk create scenarios from templates
   */
  async bulkCreateFromTemplates(
    organizationId: string,
    userId: string,
    templateIds: string[],
  ): Promise<RiskScenario[]> {
    const results: RiskScenario[] = [];

    for (const templateId of templateIds) {
      try {
        const cloned = await this.cloneScenario(organizationId, userId, templateId);
        results.push(cloned);
      } catch (error: unknown) {
        this.logger.warn(`Failed to clone template ${templateId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return results;
  }

  /**
   * Run risk simulation
   */
  async runSimulation(
    organizationId: string,
    id: string,
    simulationParams: {
      controlEffectiveness?: number;
      mitigations?: string[];
    },
  ): Promise<{
    inherentRisk: { score: number; level: string };
    residualRisk: { score: number; level: string };
    riskReduction: number;
    recommendations: string[];
  }> {
    const scenario = await this.getScenario(organizationId, id);

    const inherentScore = this.calculateRiskScore(
      scenario.likelihood as Likelihood,
      scenario.impact as Impact,
    );

    // Calculate residual risk based on control effectiveness
    const controlEffectiveness = simulationParams.controlEffectiveness || 0;
    const mitigationCount = simulationParams.mitigations?.length || 0;

    // Each mitigation reduces risk by up to 10%, max 50% reduction
    const mitigationReduction = Math.min(mitigationCount * 0.1, 0.5);
    const controlReduction = controlEffectiveness / 100;

    // Combined reduction (multiplicative)
    const totalReduction = 1 - (1 - controlReduction) * (1 - mitigationReduction);
    const residualScore = Math.max(1, Math.round(inherentScore * (1 - totalReduction)));

    // Generate recommendations
    const recommendations: string[] = [];
    if (controlEffectiveness < 50) {
      recommendations.push('Consider implementing additional controls to improve effectiveness');
    }
    if (mitigationCount < 3) {
      recommendations.push('Document additional mitigation strategies');
    }
    if (residualScore > 12) {
      recommendations.push('Residual risk remains high - consider risk acceptance or transfer');
    }
    if (scenario.targetAssets.length > 3) {
      recommendations.push('Multiple assets at risk - prioritize critical asset protection');
    }

    return {
      inherentRisk: {
        score: inherentScore,
        level: this.getRiskLevel(inherentScore),
      },
      residualRisk: {
        score: residualScore,
        level: this.getRiskLevel(residualScore),
      },
      riskReduction: Math.round(totalReduction * 100),
      recommendations,
    };
  }

  /**
   * Get scenario statistics
   */
  async getStatistics(organizationId: string): Promise<{
    total: number;
    byCategory: { category: string; count: number }[];
    byThreatActor: { threatActor: string; count: number }[];
    byRiskLevel: { level: string; count: number }[];
    templates: number;
  }> {
    const scenarios = await this.prisma.riskScenarioTemplate.findMany({
      where: { organizationId, deletedAt: null },
      select: {
        category: true,
        threatActor: true,
        likelihood: true,
        impact: true,
        isTemplate: true,
      },
    });

    const total = scenarios.length;
    const templates = scenarios.filter((s) => s.isTemplate).length;

    // Group by category
    const categoryMap = new Map<string, number>();
    scenarios.forEach((s) => {
      categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + 1);
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Group by threat actor
    const threatActorMap = new Map<string, number>();
    scenarios.forEach((s) => {
      threatActorMap.set(s.threatActor, (threatActorMap.get(s.threatActor) || 0) + 1);
    });
    const byThreatActor = Array.from(threatActorMap.entries())
      .map(([threatActor, count]) => ({ threatActor, count }))
      .sort((a, b) => b.count - a.count);

    // Group by risk level
    const riskLevelMap = new Map<string, number>();
    scenarios.forEach((s) => {
      const score = this.calculateRiskScore(s.likelihood as Likelihood, s.impact as Impact);
      const level = this.getRiskLevel(score);
      riskLevelMap.set(level, (riskLevelMap.get(level) || 0) + 1);
    });
    const byRiskLevel = Array.from(riskLevelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      byCategory,
      byThreatActor,
      byRiskLevel,
      templates,
    };
  }
}

