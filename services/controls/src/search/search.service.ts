import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  GlobalSearchDto, 
  SearchResultDto, 
  SearchResultItemDto, 
  SearchEntityType,
} from './dto/search.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(
    organizationId: string,
    dto: GlobalSearchDto,
  ): Promise<SearchResultDto> {
    const startTime = Date.now();
    const { query, entityTypes, page = 1, limit = 20 } = dto;
    const offset = (page - 1) * limit;

    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) {
      return {
        total: 0,
        page,
        limit,
        query,
        results: [],
        took: Date.now() - startTime,
      };
    }

    const typesToSearch = entityTypes?.length 
      ? entityTypes 
      : Object.values(SearchEntityType);

    const searchPromises: Promise<SearchResultItemDto[]>[] = [];

    if (typesToSearch.includes(SearchEntityType.Control)) {
      searchPromises.push(this.searchControls(organizationId, searchTerm, limit));
    }

    if (typesToSearch.includes(SearchEntityType.Policy)) {
      searchPromises.push(this.searchPolicies(organizationId, searchTerm, limit));
    }

    if (typesToSearch.includes(SearchEntityType.Risk)) {
      searchPromises.push(this.searchRisks(organizationId, searchTerm, limit));
    }

    if (typesToSearch.includes(SearchEntityType.Evidence)) {
      searchPromises.push(this.searchEvidence(organizationId, searchTerm, limit));
    }

    if (typesToSearch.includes(SearchEntityType.Task)) {
      searchPromises.push(this.searchTasks(organizationId, searchTerm, limit));
    }

    if (typesToSearch.includes(SearchEntityType.Framework)) {
      searchPromises.push(this.searchFrameworks(organizationId, searchTerm, limit));
    }

    const resultsArrays = await Promise.all(searchPromises);
    const allResults = resultsArrays.flat();

    // Sort by relevance
    allResults.sort((a, b) => {
      const aScore = this.getRelevanceScore(a, searchTerm);
      const bScore = this.getRelevanceScore(b, searchTerm);
      return bScore - aScore;
    });

    const paginatedResults = allResults.slice(offset, offset + limit);

    return {
      total: allResults.length,
      page,
      limit,
      query,
      results: paginatedResults,
      took: Date.now() - startTime,
    };
  }

  private getRelevanceScore(item: SearchResultItemDto, searchTerm: string): number {
    let score = 0;
    const term = searchTerm.toLowerCase();

    if (item.title.toLowerCase() === term) score += 100;
    else if (item.title.toLowerCase().startsWith(term)) score += 50;
    else if (item.title.toLowerCase().includes(term)) score += 25;

    if (item.identifier?.toLowerCase().includes(term)) score += 30;
    if (item.category?.toLowerCase().includes(term)) score += 10;
    if (item.tags?.some(t => t.toLowerCase().includes(term))) score += 15;

    return score;
  }

  private async searchControls(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const controls = await this.prisma.control.findMany({
      where: {
        AND: [
          {
            OR: [
              { organizationId: null },
              { organizationId },
            ],
          },
          { deletedAt: null },
          {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { controlId: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        controlId: true,
        title: true,
        description: true,
        category: true,
        tags: true,
      },
      take: limit,
    });

    return controls.map(c => ({
      id: c.id,
      entityType: SearchEntityType.Control,
      title: c.title,
      description: c.description?.substring(0, 200),
      identifier: c.controlId,
      category: c.category,
      tags: c.tags,
      matchedField: this.getMatchedField(c, searchTerm),
      url: `/controls/${c.id}`,
    }));
  }

  private async searchPolicies(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const policies = await this.prisma.policy.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        tags: true,
      },
      take: limit,
    });

    return policies.map(p => ({
      id: p.id,
      entityType: SearchEntityType.Policy,
      title: p.title,
      description: p.description?.substring(0, 200),
      category: p.category,
      tags: p.tags,
      matchedField: this.getMatchedField(p, searchTerm),
      url: `/policies/${p.id}`,
    }));
  }

  private async searchRisks(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const risks = await this.prisma.risk.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { riskId: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        riskId: true,
        title: true,
        description: true,
        category: true,
        tags: true,
      },
      take: limit,
    });

    return risks.map(r => ({
      id: r.id,
      entityType: SearchEntityType.Risk,
      title: r.title,
      description: r.description?.substring(0, 200),
      identifier: r.riskId,
      category: r.category,
      tags: r.tags,
      matchedField: this.getMatchedField(r, searchTerm),
      url: `/risks/${r.id}`,
    }));
  }

  private async searchEvidence(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const evidence = await this.prisma.evidence.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        tags: true,
      },
      take: limit,
    });

    return evidence.map(e => ({
      id: e.id,
      entityType: SearchEntityType.Evidence,
      title: e.title,
      description: e.description?.substring(0, 200),
      category: e.type,
      tags: e.tags,
      matchedField: this.getMatchedField({ title: e.title, description: e.description }, searchTerm),
      url: `/evidence/${e.id}`,
    }));
  }

  private async searchTasks(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        entityType: true,
        status: true,
      },
      take: limit,
    });

    return tasks.map(t => ({
      id: t.id,
      entityType: SearchEntityType.Task,
      title: t.title,
      description: t.description?.substring(0, 200),
      category: t.entityType,
      matchedField: this.getMatchedField(t, searchTerm),
      url: `/tasks/${t.id}`,
    }));
  }

  private async searchFrameworks(
    organizationId: string,
    searchTerm: string,
    limit: number,
  ): Promise<SearchResultItemDto[]> {
    const frameworks = await this.prisma.framework.findMany({
      where: {
        OR: [
          { organizationId: null },
          { organizationId },
        ],
        AND: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { type: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
      },
      take: limit,
    });

    return frameworks.map(f => ({
      id: f.id,
      entityType: SearchEntityType.Framework,
      title: f.name,
      description: f.description?.substring(0, 200),
      identifier: f.type,
      category: f.type,
      matchedField: this.getMatchedField({ title: f.name, description: f.description }, searchTerm),
      url: `/frameworks/${f.id}`,
    }));
  }

  private getMatchedField(item: Record<string, unknown>, searchTerm: string): string {
    const term = searchTerm.toLowerCase();
    if ((item.controlId as string | undefined)?.toLowerCase().includes(term)) return 'controlId';
    if ((item.riskId as string | undefined)?.toLowerCase().includes(term)) return 'riskId';
    if ((item.title as string | undefined)?.toLowerCase().includes(term)) return 'title';
    if ((item.description as string | undefined)?.toLowerCase().includes(term)) return 'description';
    if ((item.tags as string[] | undefined)?.some((t: string) => t.toLowerCase().includes(term))) return 'tags';
    return 'content';
  }
}
