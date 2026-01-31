import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { PRISMA_SERVICE } from './search.module';

export interface SearchResult {
  type: 'control' | 'framework' | 'policy' | 'evidence' | 'integration' | 'risk' | 'vendor' | 'audit' | 'user' | 'asset';
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

// Prisma model delegate interface for search operations
interface PrismaModelDelegate {
  findMany: (args: { 
    where?: Record<string, unknown>; 
    take?: number; 
    select?: Record<string, boolean>; 
  }) => Promise<Record<string, unknown>[]>;
}

// PrismaService type - each service provides their own implementation
export interface IPrismaService {
  control?: PrismaModelDelegate;
  framework?: PrismaModelDelegate;
  policy?: PrismaModelDelegate;
  evidence?: PrismaModelDelegate;
  integration?: PrismaModelDelegate;
  risk?: PrismaModelDelegate;
  vendor?: PrismaModelDelegate;
  audit?: PrismaModelDelegate;
  user?: PrismaModelDelegate;
  asset?: PrismaModelDelegate;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Optional() @Inject(PRISMA_SERVICE) private prisma: IPrismaService,
  ) {
    if (!prisma) {
      this.logger.warn('SearchService initialized without PrismaService - search functionality will be limited');
    }
  }

  async searchAll(query: string): Promise<SearchResult[]> {
    if (!this.prisma) {
      this.logger.warn('Search called without PrismaService - returning empty results');
      return [];
    }

    const results: SearchResult[] = [];

    try {
      // Search Controls
      if (this.prisma.control) {
        const controls = await this.prisma.control.findMany({
          where: {
            deletedAt: null,
            OR: [
              { controlId: { contains: query, mode: 'insensitive' } },
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, controlId: true, title: true, description: true },
        });

        results.push(
          ...controls.map((c) => ({
            type: 'control' as const,
            id: c.id as string,
            title: `${c.controlId}: ${c.title}`,
            subtitle: (c.description as string | undefined)?.substring(0, 100),
            path: `/controls/${c.id}`,
          }))
        );
      }

      // Search Frameworks
      if (this.prisma.framework) {
        const frameworks = await this.prisma.framework.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, description: true, version: true },
        });

        results.push(
          ...frameworks.map((f) => ({
            type: 'framework' as const,
            id: f.id as string,
            title: f.name as string,
            subtitle: f.version ? `Version ${f.version}` : (f.description as string | undefined)?.substring(0, 100),
            path: `/frameworks/${f.id}`,
          }))
        );
      }

      // Search Policies
      if (this.prisma.policy) {
        const policies = await this.prisma.policy.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, title: true, description: true, status: true },
        });

        results.push(
          ...policies.map((p) => ({
            type: 'policy' as const,
            id: p.id as string,
            title: p.title as string,
            subtitle: p.status as string | undefined,
            path: `/policies`,
          }))
        );
      }

      // Search Evidence
      if (this.prisma.evidence) {
        const evidence = await this.prisma.evidence.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, description: true, fileType: true },
        });

        results.push(
          ...evidence.map((e) => ({
            type: 'evidence' as const,
            id: e.id as string,
            title: e.name as string,
            subtitle: (e.fileType as string | undefined) || (e.description as string | undefined)?.substring(0, 100),
            path: `/evidence`,
          }))
        );
      }

      // Search Integrations
      if (this.prisma.integration) {
        const integrations = await this.prisma.integration.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { type: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, type: true, status: true },
        });

        results.push(
          ...integrations.map((i) => ({
            type: 'integration' as const,
            id: i.id as string,
            title: i.name as string,
            subtitle: `${i.type} - ${i.status}`,
            path: `/integrations`,
          }))
        );
      }

      // Search Risks
      if (this.prisma.risk) {
        const risks = await this.prisma.risk.findMany({
          where: {
            deletedAt: null,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, title: true, description: true, riskLevel: true },
        });

        results.push(
          ...risks.map((r) => ({
            type: 'risk' as const,
            id: r.id as string,
            title: r.title as string,
            subtitle: `${r.riskLevel} risk`,
            path: `/risks/${r.id}`,
          }))
        );
      }

      // Search Vendors
      if (this.prisma.vendor) {
        const vendors = await this.prisma.vendor.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, description: true, tier: true },
        });

        results.push(
          ...vendors.map((v) => ({
            type: 'vendor' as const,
            id: v.id as string,
            title: v.name as string,
            subtitle: v.tier ? `Tier ${v.tier}` : (v.description as string | undefined)?.substring(0, 100),
            path: `/vendors/${v.id}`,
          }))
        );
      }

      // Search Audits
      if (this.prisma.audit) {
        const audits = await this.prisma.audit.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, title: true, description: true, status: true },
        });

        results.push(
          ...audits.map((a) => ({
            type: 'audit' as const,
            id: a.id as string,
            title: a.title as string,
            subtitle: a.status as string | undefined,
            path: `/audits/${a.id}`,
          }))
        );
      }

      // Search Users
      if (this.prisma.user) {
        const users = await this.prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, email: true, role: true },
        });

        results.push(
          ...users.map((u) => ({
            type: 'user' as const,
            id: u.id as string,
            title: u.name as string,
            subtitle: u.email as string | undefined,
            path: `/users`,
          }))
        );
      }

      // Search Assets
      if (this.prisma.asset) {
        const assets = await this.prisma.asset.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: { id: true, name: true, description: true, type: true },
        });

        results.push(
          ...assets.map((a) => ({
            type: 'asset' as const,
            id: a.id as string,
            title: a.name as string,
            subtitle: (a.type as string | undefined) || (a.description as string | undefined)?.substring(0, 100),
            path: `/assets`,
          }))
        );
      }

      // Sort by relevance (exact matches first, then partial matches)
      return results.sort((a, b) => {
        const aExact = a.title.toLowerCase() === query.toLowerCase();
        const bExact = b.title.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    } catch (error) {
      this.logger.error('Search error:', error);
      return [];
    }
  }
}
