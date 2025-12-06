import { Injectable } from '@nestjs/common';

export interface SearchResult {
  type: 'control' | 'framework' | 'policy' | 'evidence' | 'integration' | 'risk' | 'vendor' | 'audit' | 'user' | 'asset';
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

// PrismaService type - each service provides their own implementation
export interface IPrismaService {
  control: any;
  framework: any;
  policy: any;
  evidence: any;
  integration: any;
  risk: any;
  vendor: any;
  audit: any;
  user: any;
  asset: any;
}

@Injectable()
export class SearchService {
  constructor(private prisma: IPrismaService) {}

  async searchAll(query: string): Promise<SearchResult[]> {
    const searchTerm = `%${query}%`;
    const results: SearchResult[] = [];

    try {
      // Search Controls
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
        ...controls.map((c: any) => ({
          type: 'control' as const,
          id: c.id,
          title: `${c.controlId}: ${c.title}`,
          subtitle: c.description?.substring(0, 100),
          path: `/controls/${c.id}`,
        }))
      );

      // Search Frameworks
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
        ...frameworks.map((f: any) => ({
          type: 'framework' as const,
          id: f.id,
          title: f.name,
          subtitle: f.version ? `Version ${f.version}` : f.description?.substring(0, 100),
          path: `/frameworks/${f.id}`,
        }))
      );

      // Search Policies
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
        ...policies.map((p: any) => ({
          type: 'policy' as const,
          id: p.id,
          title: p.title,
          subtitle: p.status,
          path: `/policies`,
        }))
      );

      // Search Evidence
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
        ...evidence.map((e: any) => ({
          type: 'evidence' as const,
          id: e.id,
          title: e.name,
          subtitle: e.fileType || e.description?.substring(0, 100),
          path: `/evidence`,
        }))
      );

      // Search Integrations
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
        ...integrations.map((i: any) => ({
          type: 'integration' as const,
          id: i.id,
          title: i.name,
          subtitle: `${i.type} - ${i.status}`,
          path: `/integrations`,
        }))
      );

      // Search Risks
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
        ...risks.map((r: any) => ({
          type: 'risk' as const,
          id: r.id,
          title: r.title,
          subtitle: `${r.riskLevel} risk`,
          path: `/risks/${r.id}`,
        }))
      );

      // Search Vendors
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
        ...vendors.map((v: any) => ({
          type: 'vendor' as const,
          id: v.id,
          title: v.name,
          subtitle: v.tier ? `Tier ${v.tier}` : v.description?.substring(0, 100),
          path: `/vendors/${v.id}`,
        }))
      );

      // Search Audits
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
        ...audits.map((a: any) => ({
          type: 'audit' as const,
          id: a.id,
          title: a.title,
          subtitle: a.status,
          path: `/audits/${a.id}`,
        }))
      );

      // Search Users
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
        ...users.map((u: any) => ({
          type: 'user' as const,
          id: u.id,
          title: u.name,
          subtitle: u.email,
          path: `/users`,
        }))
      );

      // Search Assets
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
        ...assets.map((a: any) => ({
          type: 'asset' as const,
          id: a.id,
          title: a.name,
          subtitle: a.type || a.description?.substring(0, 100),
          path: `/assets`,
        }))
      );

      // Sort by relevance (exact matches first, then partial matches)
      return results.sort((a, b) => {
        const aExact = a.title.toLowerCase() === query.toLowerCase();
        const bExact = b.title.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
}
