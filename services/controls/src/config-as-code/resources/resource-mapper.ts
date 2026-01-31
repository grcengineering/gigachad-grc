import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceType } from '../dto/export-config.dto';
import { 
  ResourceData, 
  ControlItem, 
  FrameworkItem, 
  PolicyItem, 
  RiskItem, 
  EvidenceItem, 
  VendorItem 
} from '../exporters/exporter.interface';

// Workspace filter type for queries
interface WorkspaceFilter {
  workspaceId?: string;
}

// Cache for exported resources to avoid repeated database queries
interface CacheEntry {
  data: ResourceData;
  timestamp: number;
  organizationId: string;
  workspaceId?: string;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

@Injectable()
export class ResourceMapper {
  private readonly logger = new Logger(ResourceMapper.name);
  private cache: CacheEntry | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map database resources to configuration format
   * Uses parallel fetching and caching for better performance
   */
  async mapResources(
    organizationId: string,
    resourceTypes: ResourceType[],
    workspaceId?: string,
    skipCache = false,
  ): Promise<ResourceData> {
    const startTime = Date.now();
    
    // Check cache first (unless explicitly skipped)
    if (!skipCache && this.cache) {
      const cacheValid = 
        this.cache.organizationId === organizationId &&
        this.cache.workspaceId === workspaceId &&
        Date.now() - this.cache.timestamp < CACHE_TTL;
      
      if (cacheValid) {
        this.logger.log(`Using cached resources (age: ${Date.now() - this.cache.timestamp}ms)`);
        // Filter to requested resource types
        const filtered: ResourceData = {};
        for (const type of resourceTypes) {
          const key = type.toLowerCase() as keyof ResourceData;
          const cachedData = this.cache.data[key];
          if (cachedData) {
            // Use type assertion to handle the union type assignment
             
            (filtered as Record<string, unknown>)[key] = cachedData;
          }
        }
        return filtered;
      }
    }

    const data: ResourceData = {};

    // Build workspace filter if provided
    const workspaceFilter = workspaceId ? { workspaceId } : {};

    // Create an array of promises for parallel execution
    const fetchPromises: Array<{ type: ResourceType; promise: Promise<unknown[]> }> = [];

    for (const resourceType of resourceTypes) {
      switch (resourceType) {
        case ResourceType.CONTROLS:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapControls(organizationId, workspaceFilter),
          });
          break;
        case ResourceType.FRAMEWORKS:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapFrameworks(organizationId),
          });
          break;
        case ResourceType.POLICIES:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapPolicies(organizationId, workspaceFilter),
          });
          break;
        case ResourceType.RISKS:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapRisks(organizationId, workspaceFilter),
          });
          break;
        case ResourceType.EVIDENCE:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapEvidence(organizationId, workspaceFilter),
          });
          break;
        case ResourceType.VENDORS:
          fetchPromises.push({
            type: resourceType,
            promise: this.mapVendors(organizationId),
          });
          break;
      }
    }

    // Execute all fetches in parallel
    const results = await Promise.all(
      fetchPromises.map(async ({ type, promise }) => ({
        type,
        result: await promise,
      })),
    );

    // Assign results to data object
    for (const { type, result } of results) {
      switch (type) {
        case ResourceType.CONTROLS:
          data.controls = result as ControlItem[];
          break;
        case ResourceType.FRAMEWORKS:
          data.frameworks = result as FrameworkItem[];
          break;
        case ResourceType.POLICIES:
          data.policies = result as PolicyItem[];
          break;
        case ResourceType.RISKS:
          data.risks = result as RiskItem[];
          break;
        case ResourceType.EVIDENCE:
          data.evidence = result as EvidenceItem[];
          break;
        case ResourceType.VENDORS:
          data.vendors = result as VendorItem[];
          break;
      }
    }

    // Update cache
    this.cache = {
      data,
      timestamp: Date.now(),
      organizationId,
      workspaceId,
    };

    const elapsed = Date.now() - startTime;
    this.logger.log(`Resource mapping completed in ${elapsed}ms`);

    return data;
  }

  /**
   * Clear the resource cache (call after data changes)
   */
  clearCache(): void {
    this.cache = null;
    this.logger.log('Resource cache cleared');
  }

  private async mapControls(organizationId: string, workspaceFilter: WorkspaceFilter): Promise<ControlItem[]> {
    const startTime = Date.now();
    
    // Use a more efficient query - select only needed fields and limit the join
    const controls = await this.prisma.control.findMany({
      where: {
        OR: [
          { organizationId: null }, // System controls
          { organizationId }, // Organization-specific controls
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        controlId: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        tags: true,
        isCustom: true,
        organizationId: true,
        implementations: {
          where: {
            organizationId,
            ...workspaceFilter,
          },
          select: {
            id: true,
            status: true,
          },
          take: 1,
        },
      },
      orderBy: { controlId: 'asc' },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${controls.length} controls in ${elapsed}ms`);

    return controls.map(control => ({
      id: control.id,
      controlId: control.controlId,
      title: control.title,
      description: control.description,
      category: control.category,
      subcategory: control.subcategory,
      tags: control.tags,
      isCustom: control.isCustom,
      organizationId: control.organizationId,
      status: control.implementations[0]?.status || 'not_started',
      implementationId: control.implementations[0]?.id,
    }));
  }

  private async mapFrameworks(organizationId: string): Promise<any[]> {
    const startTime = Date.now();
    
    const frameworks = await this.prisma.framework.findMany({
      where: {
        OR: [
          { organizationId: null }, // System frameworks
          { organizationId }, // Organization-specific frameworks
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        version: true,
        description: true,
        isActive: true,
        organizationId: true,
        workspaceId: true,
      },
      orderBy: { name: 'asc' },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${frameworks.length} frameworks in ${elapsed}ms`);

    return frameworks.map(framework => ({
      id: framework.id,
      name: framework.name,
      type: framework.type,
      version: framework.version,
      description: framework.description,
      isActive: framework.isActive,
      isCustom: framework.organizationId !== null,
      organizationId: framework.organizationId,
      workspaceId: framework.workspaceId,
    }));
  }

  private async mapPolicies(organizationId: string, workspaceFilter: WorkspaceFilter): Promise<PolicyItem[]> {
    const startTime = Date.now();
    
    const policies = await this.prisma.policy.findMany({
      where: {
        organizationId,
        ...workspaceFilter,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        version: true,
        tags: true,
      },
      orderBy: { title: 'asc' },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${policies.length} policies in ${elapsed}ms`);

    return policies.map(policy => ({
      id: policy.id,
      title: policy.title,
      description: policy.description,
      category: policy.category,
      status: policy.status,
      version: policy.version,
      tags: policy.tags,
    }));
  }

  private async mapRisks(organizationId: string, workspaceFilter: WorkspaceFilter): Promise<RiskItem[]> {
    const startTime = Date.now();
    
    const risks = await this.prisma.risk.findMany({
      where: {
        organizationId,
        ...workspaceFilter,
        deletedAt: null,
      },
      select: {
        id: true,
        riskId: true,
        title: true,
        description: true,
        category: true,
        likelihood: true,
        impact: true,
        status: true,
        tags: true,
        riskOwner: {
          select: {
            email: true,
          },
        },
        treatment: {
          select: {
            treatmentDecision: true,
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${risks.length} risks in ${elapsed}ms`);

    return risks.map(risk => ({
      id: risk.id,
      riskId: risk.riskId,
      title: risk.title,
      description: risk.description,
      category: risk.category,
      likelihood: risk.likelihood,
      impact: risk.impact,
      status: risk.status,
      treatmentDecision: risk.treatment?.treatmentDecision,
      ownerEmail: risk.riskOwner?.email,
      tags: risk.tags,
    }));
  }

  private async mapEvidence(organizationId: string, workspaceFilter: WorkspaceFilter): Promise<EvidenceItem[]> {
    const startTime = Date.now();
    
    const evidence = await this.prisma.evidence.findMany({
      where: {
        organizationId,
        ...workspaceFilter,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        source: true,
        validUntil: true,
        collectedAt: true,
        controlLinks: {
          select: {
            controlId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit evidence to recent 500 for performance
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${evidence.length} evidence items in ${elapsed}ms`);

    return evidence.map(ev => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      type: ev.type,
      status: ev.status,
      source: ev.source,
      validUntil: ev.validUntil,
      collectedAt: ev.collectedAt,
      controlIds: ev.controlLinks.map(link => link.controlId),
    }));
  }

  private async mapVendors(organizationId: string): Promise<any[]> {
    const startTime = Date.now();
    
    const vendors = await this.prisma.vendor.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        description: true,
        category: true,
        status: true,
        primaryContactEmail: true,
        website: true,
        tags: true,
        contacts: {
          select: {
            email: true,
          },
          where: {
            isPrimary: true,
          },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const elapsed = Date.now() - startTime;
    this.logger.log(`Fetched ${vendors.length} vendors in ${elapsed}ms`);

    return vendors.map(vendor => ({
      id: vendor.id,
      vendorId: vendor.vendorId,
      name: vendor.name,
      description: vendor.description,
      category: vendor.category,
      status: vendor.status,
      contactEmail: vendor.primaryContactEmail || vendor.contacts[0]?.email,
      website: vendor.website,
      tags: vendor.tags,
    }));
  }
}

