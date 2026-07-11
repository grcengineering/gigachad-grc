import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CatalogFramework,
  CatalogFrameworkMeta,
  listCatalogFrameworks,
  getCatalogFramework,
  flattenRequirements,
} from './catalog';

export interface ActivatedFramework {
  id: string;
  catalogId: string;
  name: string;
  version: string;
  description: string;
  requirementCount: number;
  activatedAt: Date;
}

@Injectable()
export class FrameworkCatalogService {
  private readonly logger = new Logger(FrameworkCatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all available frameworks in the catalog
   */
  listAvailableFrameworks(): CatalogFrameworkMeta[] {
    return listCatalogFrameworks();
  }

  /**
   * Get detailed framework with all requirements
   */
  getFrameworkDetails(catalogId: string): CatalogFramework {
    const framework = getCatalogFramework(catalogId);
    if (!framework) {
      throw new NotFoundException(`Framework with catalog ID '${catalogId}' not found in catalog`);
    }
    return framework;
  }

  /**
   * Check if a framework is already activated for an organization
   */
  async isFrameworkActivated(organizationId: string, catalogId: string): Promise<boolean> {
    const existing = await this.prisma.framework.findFirst({
      where: {
        organizationId,
        type: catalogId,
        deletedAt: null,
      },
    });
    return !!existing;
  }

  /**
   * Get all activated frameworks for an organization
   */
  async getActivatedFrameworks(organizationId: string): Promise<ActivatedFramework[]> {
    const frameworks = await this.prisma.framework.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { requirements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return frameworks.map((f) => ({
      id: f.id,
      catalogId: f.type,
      name: f.name,
      version: f.version,
      description: f.description,
      requirementCount: f._count.requirements,
      activatedAt: f.createdAt,
    }));
  }

  /**
   * Activate a framework from the catalog for an organization
   * This copies the framework and all its requirements to the organization
   */
  async activateFramework(
    organizationId: string,
    catalogId: string,
    userId: string
  ): Promise<{ frameworkId: string; requirementsCreated: number }> {
    // Get the catalog framework
    const catalogFramework = getCatalogFramework(catalogId);
    if (!catalogFramework) {
      throw new NotFoundException(`Framework '${catalogId}' not found in catalog`);
    }

    // Check if a framework of this catalog type already exists for the org.
    // If it exists but is soft-deleted, reactivate instead of creating a duplicate.
    const existing = await this.prisma.framework.findFirst({
      where: {
        organizationId,
        type: catalogId,
      },
      include: {
        _count: {
          select: { requirements: true },
        },
      },
    });

    if (existing?.deletedAt === null) {
      throw new ConflictException(
        `Framework '${catalogFramework.name}' is already activated for this organization`
      );
    }

    if (existing?.deletedAt) {
      const reactivated = await this.prisma.framework.update({
        where: { id: existing.id },
        data: {
          name: catalogFramework.name,
          version: catalogFramework.version,
          description: catalogFramework.description,
          isActive: true,
          deletedAt: null,
          deletedBy: null,
        },
      });

      this.logger.log(
        `Reactivated framework '${catalogFramework.name}' for organization ${organizationId}`
      );

      try {
        await this.prisma.auditLog.create({
          data: {
            organizationId,
            userId,
            action: 'framework_reactivated',
            entityType: 'framework',
            entityId: reactivated.id,
            entityName: catalogFramework.name,
            description: `Reactivated framework '${catalogFramework.name}'`,
            metadata: {
              catalogId,
              requirementsReused: existing._count.requirements,
            },
          },
        });
      } catch (error) {
        // Don't fail if audit log creation fails
        this.logger.warn(`Failed to create audit log for framework reactivation: ${error}`);
      }

      return {
        frameworkId: reactivated.id,
        requirementsCreated: existing._count.requirements,
      };
    }

    this.logger.log(
      `Activating framework '${catalogFramework.name}' for organization ${organizationId}`
    );

    // Create the framework
    const framework = await this.prisma.framework.create({
      data: {
        type: catalogId,
        name: catalogFramework.name,
        version: catalogFramework.version,
        description: catalogFramework.description,
        isActive: true,
        isCustom: false,
        organizationId,
      },
    });

    // Flatten requirements for insertion
    const flatRequirements = flattenRequirements(catalogFramework.requirements);

    // Create a map to track parent references to IDs
    const referenceToId: Record<string, string> = {};

    // Insert requirements in order (parents first)
    let requirementsCreated = 0;
    for (const req of flatRequirements) {
      const parentId = req.parentReference ? referenceToId[req.parentReference] : null;

      const created = await this.prisma.frameworkRequirement.create({
        data: {
          frameworkId: framework.id,
          parentId,
          reference: req.reference,
          title: req.title,
          description: req.description,
          guidance: req.guidance,
          level: req.level,
          order: requirementsCreated,
          isCategory: req.isCategory,
        },
      });

      referenceToId[req.reference] = created.id;
      requirementsCreated++;
    }

    this.logger.log(
      `Activated framework '${catalogFramework.name}' with ${requirementsCreated} requirements`
    );

    // Create audit log entry
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'framework_activated',
          entityType: 'framework',
          entityId: framework.id,
          entityName: catalogFramework.name,
          description: `Activated framework '${catalogFramework.name}' with ${requirementsCreated} requirements`,
          metadata: {
            catalogId,
            requirementsCreated,
          },
        },
      });
    } catch (error) {
      // Don't fail if audit log creation fails
      this.logger.warn(`Failed to create audit log for framework activation: ${error}`);
    }

    return {
      frameworkId: framework.id,
      requirementsCreated,
    };
  }

  /**
   * Deactivate (soft-delete) a framework for an organization
   */
  async deactivateFramework(
    organizationId: string,
    frameworkId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    // Find the framework
    const framework = await this.prisma.framework.findFirst({
      where: {
        id: frameworkId,
        organizationId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { mappings: true, assessments: true },
        },
      },
    });

    if (!framework) {
      throw new NotFoundException(`Framework with ID '${frameworkId}' not found`);
    }

    // Warn if there are mappings or assessments
    const hasData = framework._count.mappings > 0 || framework._count.assessments > 0;

    // Soft delete the framework
    await this.prisma.framework.update({
      where: { id: frameworkId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        isActive: false,
      },
    });

    this.logger.log(`Deactivated framework '${framework.name}' (${frameworkId})`);

    // Create audit log entry
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: 'framework_deactivated',
          entityType: 'framework',
          entityId: frameworkId,
          entityName: framework.name,
          description: `Deactivated framework '${framework.name}'`,
          metadata: {
            hadMappings: framework._count.mappings,
            hadAssessments: framework._count.assessments,
          },
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to create audit log for framework deactivation: ${error}`);
    }

    return {
      success: true,
      message: hasData
        ? `Framework '${framework.name}' has been deactivated. Note: ${framework._count.mappings} control mappings and ${framework._count.assessments} assessments were associated with this framework.`
        : `Framework '${framework.name}' has been deactivated.`,
    };
  }

  /**
   * Get catalog status for an organization (which frameworks are activated)
   */
  async getCatalogStatus(
    organizationId: string
  ): Promise<
    Array<CatalogFrameworkMeta & { isActivated: boolean; activatedFrameworkId?: string }>
  > {
    const catalogFrameworks = listCatalogFrameworks();
    const activatedFrameworks = await this.prisma.framework.findMany({
      where: {
        organizationId,
        deletedAt: null,
        type: { in: catalogFrameworks.map((f) => f.id) },
      },
      select: {
        id: true,
        type: true,
      },
    });

    const activatedMap = new Map(activatedFrameworks.map((f) => [f.type, f.id]));

    return catalogFrameworks.map((cf) => ({
      ...cf,
      isActivated: activatedMap.has(cf.id),
      activatedFrameworkId: activatedMap.get(cf.id),
    }));
  }
}
