/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RISK_SCENARIO_LIBRARY } from './risk-scenario-library';

/**
 * Service to manage the built-in Risk Scenario Library.
 * Seeds global templates on application startup.
 */
@Injectable()
export class RiskScenarioLibraryService implements OnModuleInit {
  private readonly logger = new Logger(RiskScenarioLibraryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed the library on module initialization
   */
  async onModuleInit() {
    await this.seedLibrary();
  }

  /**
   * Seed all library templates (idempotent - only creates if not exists)
   */
  async seedLibrary(): Promise<{ created: number; updated: number; total: number }> {
    this.logger.log('Checking risk scenario library...');
    
    let created = 0;
    const updated = 0;

    for (const template of RISK_SCENARIO_LIBRARY) {
      try {
        // Check if template exists by its fixed ID
        const existing = await this.prisma.riskScenarioTemplate.findUnique({
          where: { id: template.id },
        });

        if (!existing) {
          // Create new template
          await this.prisma.riskScenarioTemplate.create({
            data: {
              id: template.id,
              organizationId: null, // Global template
              title: template.title,
              description: template.description,
              category: template.category,
              threatActor: template.threatActor,
              attackVector: template.attackVector,
              targetAssets: template.targetAssets,
              likelihood: template.likelihood,
              impact: template.impact,
              tags: template.tags,
              isTemplate: true,
              usageCount: 0,
              mitigationStrategy: template.mitigationStrategy,
              businessContext: template.businessContext,
              complianceImpact: template.complianceImpact,
              createdBy: null,
            },
          });
          created++;
          this.logger.debug(`Created library template: ${template.title}`);
        } else {
          // Optionally update existing template (uncomment to enable updates)
          // This allows updating library templates without losing usage counts
          /*
          await this.prisma.riskScenarioTemplate.update({
            where: { id: template.id },
            data: {
              title: template.title,
              description: template.description,
              category: template.category,
              threatActor: template.threatActor,
              attackVector: template.attackVector,
              targetAssets: template.targetAssets,
              likelihood: template.likelihood,
              impact: template.impact,
              tags: template.tags,
              mitigationStrategy: template.mitigationStrategy,
              businessContext: template.businessContext,
              complianceImpact: template.complianceImpact,
            },
          });
          updated++;
          */
        }
      } catch (error) {
        this.logger.error(`Failed to seed template ${template.id}: ${error.message}`);
      }
    }

    if (created > 0) {
      this.logger.log(`Risk scenario library seeded: ${created} new templates created`);
    } else {
      this.logger.log(`Risk scenario library is up to date (${RISK_SCENARIO_LIBRARY.length} templates)`);
    }

    return { created, updated, total: RISK_SCENARIO_LIBRARY.length };
  }

  /**
   * Get all library templates (global templates available to all orgs)
   */
  async getLibraryTemplates(): Promise<any[]> {
    return this.prisma.riskScenarioTemplate.findMany({
      where: {
        organizationId: null,
        isTemplate: true,
        deletedAt: null,
      },
      orderBy: [
        { category: 'asc' },
        { title: 'asc' },
      ],
    });
  }

  /**
   * Get library templates grouped by category
   */
  async getLibraryByCategory(): Promise<Record<string, any[]>> {
    const templates = await this.getLibraryTemplates();
    
    const grouped: Record<string, any[]> = {};
    for (const template of templates) {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    }
    
    return grouped;
  }

  /**
   * Get library categories with counts
   */
  async getLibraryCategories(): Promise<{ category: string; count: number }[]> {
    const templates = await this.getLibraryTemplates();
    
    const categoryMap = new Map<string, number>();
    for (const template of templates) {
      categoryMap.set(template.category, (categoryMap.get(template.category) || 0) + 1);
    }
    
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Search library templates
   */
  async searchLibrary(query: string): Promise<any[]> {
    return this.prisma.riskScenarioTemplate.findMany({
      where: {
        organizationId: null,
        isTemplate: true,
        deletedAt: null,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query] } },
        ],
      },
      orderBy: { title: 'asc' },
    });
  }

  /**
   * Increment usage count when a template is cloned
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    await this.prisma.riskScenarioTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });
  }
}




