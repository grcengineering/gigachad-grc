import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto';
import { KnowledgeBaseStatus, Prisma, KnowledgeBaseCategory } from '@prisma/client';

interface KnowledgeBaseFilters {
  category?: string;
  status?: string;
  framework?: string;
  isPublic?: string;
  search?: string;
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(createKnowledgeBaseDto: CreateKnowledgeBaseDto, userId: string) {
    const { linkedControls, linkedEvidence, linkedPolicies, status, category, ...createData } = createKnowledgeBaseDto;

    const entry = await this.prisma.knowledgeBaseEntry.create({
      data: {
        ...createData,
        category: category as KnowledgeBaseCategory,
        status: (status as KnowledgeBaseStatus) || KnowledgeBaseStatus.draft,
        createdBy: userId,
      },
      include: {
        attachments: true,
      },
    });

    // Link to controls via KnowledgeBaseControl junction table
    if (linkedControls && linkedControls.length > 0) {
      await this.prisma.knowledgeBaseControl.createMany({
        data: linkedControls.map((controlId) => ({
          knowledgeBaseId: entry.id,
          controlId,
        })),
        skipDuplicates: true,
      });
    }

    // Link to evidence via KnowledgeBaseEvidence junction table
    if (linkedEvidence && linkedEvidence.length > 0) {
      await this.prisma.knowledgeBaseEvidence.createMany({
        data: linkedEvidence.map((evidenceId) => ({
          knowledgeBaseId: entry.id,
          evidenceId,
        })),
        skipDuplicates: true,
      });
    }

    // Link to policies via KnowledgeBasePolicy junction table
    if (linkedPolicies && linkedPolicies.length > 0) {
      await this.prisma.knowledgeBasePolicy.createMany({
        data: linkedPolicies.map((policyId) => ({
          knowledgeBaseId: entry.id,
          policyId,
        })),
        skipDuplicates: true,
      });
    }

    await this.audit.log({
      organizationId: entry.organizationId,
      userId,
      action: 'CREATE_KNOWLEDGE_BASE_ENTRY',
      entityType: 'knowledge_base',
      entityId: entry.id,
      entityName: entry.title,
      description: `Created knowledge base entry ${entry.title}`,
      metadata: { category: entry.category },
    });

    return entry;
  }

  async bulkCreate(entries: CreateKnowledgeBaseDto[], userId: string) {
    const created = [];
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = await this.create(entries[i], userId);
        created.push(entry);
      } catch (error) {
        errors.push({
          index: i,
          entry: entries[i],
          error: error.message,
        });
      }
    }

    return {
      success: created.length,
      failed: errors.length,
      created,
      errors,
    };
  }

  async findAll(organizationId: string, filters?: KnowledgeBaseFilters) {
    const where: Prisma.KnowledgeBaseEntryWhereInput = { organizationId, deletedAt: null };

    if (filters?.category) {
      where.category = filters.category as KnowledgeBaseCategory;
    }
    if (filters?.status) {
      where.status = filters.status as KnowledgeBaseStatus;
    }
    if (filters?.framework) {
      where.framework = filters.framework;
    }
    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic === 'true';
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { question: { contains: filters.search, mode: 'insensitive' } },
        { answer: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    return this.prisma.knowledgeBaseEntry.findMany({
      where,
      include: {
        attachments: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, organizationId: string) {
    // SECURITY: Include organizationId in query to prevent IDOR
    // This ensures users can only access knowledge base entries within their organization
    const entry = await this.prisma.knowledgeBaseEntry.findFirst({
      where: { 
        id, 
        organizationId, // Tenant isolation - prevents cross-organization access
        deletedAt: null,
      },
      include: {
        attachments: true,
        questions: {
          include: {
            questionnaire: {
              select: {
                id: true,
                title: true,
                requesterName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException(`Knowledge base entry with ID ${id} not found`);
    }

    return entry;
  }

  async update(id: string, updateKnowledgeBaseDto: UpdateKnowledgeBaseDto, userId: string, organizationId: string) {
    // SECURITY: Verify entry belongs to user's organization before updating
    const _entry = await this.findOne(id, organizationId);

    const { linkedControls, linkedEvidence, linkedPolicies, approvedBy, status, category, ...updateData } = updateKnowledgeBaseDto;

    const updated = await this.prisma.knowledgeBaseEntry.update({
      where: { id },
      data: {
        ...updateData,
        category: category as KnowledgeBaseCategory | undefined,
        status: status as KnowledgeBaseStatus | undefined,
        approvedAt: updateKnowledgeBaseDto.approvedAt ? new Date(updateKnowledgeBaseDto.approvedAt) : undefined,
        ...(userId && { updatedByUser: { connect: { id: userId } } }),
        ...(approvedBy && { approvedByUser: { connect: { id: approvedBy } } }),
      },
      include: {
        attachments: true,
      },
    });

    // Update linked controls via KnowledgeBaseControl junction table
    if (linkedControls !== undefined) {
      // Delete existing links
      await this.prisma.knowledgeBaseControl.deleteMany({
        where: { knowledgeBaseId: id },
      });

      // Create new links
      if (linkedControls.length > 0) {
        await this.prisma.knowledgeBaseControl.createMany({
          data: linkedControls.map((controlId) => ({
            knowledgeBaseId: id,
            controlId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update linked evidence via KnowledgeBaseEvidence junction table
    if (linkedEvidence !== undefined) {
      // Delete existing links
      await this.prisma.knowledgeBaseEvidence.deleteMany({
        where: { knowledgeBaseId: id },
      });

      // Create new links
      if (linkedEvidence.length > 0) {
        await this.prisma.knowledgeBaseEvidence.createMany({
          data: linkedEvidence.map((evidenceId) => ({
            knowledgeBaseId: id,
            evidenceId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update linked policies via KnowledgeBasePolicy junction table
    if (linkedPolicies !== undefined) {
      // Delete existing links
      await this.prisma.knowledgeBasePolicy.deleteMany({
        where: { knowledgeBaseId: id },
      });

      // Create new links
      if (linkedPolicies.length > 0) {
        await this.prisma.knowledgeBasePolicy.createMany({
          data: linkedPolicies.map((policyId) => ({
            knowledgeBaseId: id,
            policyId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.audit.log({
      organizationId: updated.organizationId,
      userId,
      action: 'UPDATE_KNOWLEDGE_BASE_ENTRY',
      entityType: 'knowledge_base',
      entityId: id,
      entityName: updated.title,
      description: `Updated knowledge base entry ${updated.title}`,
      changes: updateKnowledgeBaseDto as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async remove(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify entry belongs to user's organization before deleting
    const entry = await this.findOne(id, organizationId);

    // Soft delete
    await this.prisma.knowledgeBaseEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.audit.log({
      organizationId: entry.organizationId,
      userId,
      action: 'DELETE_KNOWLEDGE_BASE_ENTRY',
      entityType: 'knowledge_base',
      entityId: id,
      entityName: entry.title,
      description: `Deleted knowledge base entry ${entry.title}`,
    });

    return { message: 'Knowledge base entry deleted successfully' };
  }

  async approve(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify entry belongs to user's organization before approving
    const _entry = await this.findOne(id, organizationId);

    const approved = await this.prisma.knowledgeBaseEntry.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await this.audit.log({
      organizationId: approved.organizationId,
      userId,
      action: 'APPROVE_KNOWLEDGE_BASE_ENTRY',
      entityType: 'knowledge_base',
      entityId: id,
      entityName: approved.title,
      description: `Approved knowledge base entry ${approved.title}`,
    });

    return approved;
  }

  async incrementUsage(id: string, organizationId: string) {
    // SECURITY: Include organizationId to prevent incrementing entries from other orgs
    const entry = await this.prisma.knowledgeBaseEntry.findFirst({
      where: { id, organizationId },
    });
    
    if (!entry) {
      throw new NotFoundException(`Knowledge base entry with ID ${id} not found`);
    }
    
    await this.prisma.knowledgeBaseEntry.update({
      where: { id: entry.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  // Search for relevant knowledge base entries for a question
  async search(organizationId: string, query: string) {
    // Split query into terms for better matching
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    
    // Build OR conditions for each term
    const termConditions = terms.flatMap(term => [
      { title: { contains: term, mode: 'insensitive' as const } },
      { question: { contains: term, mode: 'insensitive' as const } },
      { answer: { contains: term, mode: 'insensitive' as const } },
      { tags: { has: term } },
    ]);

    const results = await this.prisma.knowledgeBaseEntry.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: termConditions.length > 0 ? termConditions : [
          { title: { contains: query, mode: 'insensitive' } },
          { question: { contains: query, mode: 'insensitive' } },
          { answer: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        question: true,
        answer: true,
        category: true,
        framework: true,
        usageCount: true,
        status: true,
        tags: true,
        lastUsedAt: true,
      },
      orderBy: [
        { status: 'asc' }, // approved first
        { usageCount: 'desc' },
        { lastUsedAt: 'desc' },
      ],
      take: 15,
    });

    // Score and re-rank results based on relevance
    const scored = results.map(entry => {
      let score = 0;
      const titleLower = (entry.title || '').toLowerCase();
      const questionLower = (entry.question || '').toLowerCase();
      const answerLower = (entry.answer || '').toLowerCase();
      
      terms.forEach(term => {
        // Title matches are most valuable
        if (titleLower.includes(term)) score += 10;
        // Question matches are valuable
        if (questionLower.includes(term)) score += 5;
        // Answer matches
        if (answerLower.includes(term)) score += 2;
        // Tag exact matches
        if (entry.tags?.some(t => t.toLowerCase() === term)) score += 8;
      });
      
      // Bonus for approved status
      if (entry.status === 'approved') score += 5;
      // Bonus for usage (popularity)
      score += Math.min((entry.usageCount || 0) * 0.5, 10);
      
      return { ...entry, relevanceScore: score };
    });

    // Sort by relevance score and return top 10
    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  // Get public entries for Trust Center
  async getPublicEntries(organizationId: string, category?: string) {
    const where: Prisma.KnowledgeBaseEntryWhereInput = {
      organizationId,
      isPublic: true,
      status: 'approved',
    };

    if (category) {
      where.category = category as KnowledgeBaseCategory;
    }

    return this.prisma.knowledgeBaseEntry.findMany({
      where,
      select: {
        id: true,
        category: true,
        title: true,
        question: true,
        answer: true,
        framework: true,
        tags: true,
      },
      orderBy: [
        { category: 'asc' },
        { title: 'asc' },
      ],
    });
  }

  // Dashboard stats
  async getStats(organizationId: string) {
    const [
      total,
      approved,
      draft,
      publicEntries,
      totalUsage,
    ] = await Promise.all([
      this.prisma.knowledgeBaseEntry.count({ where: { organizationId } }),
      this.prisma.knowledgeBaseEntry.count({ where: { organizationId, status: 'approved' } }),
      this.prisma.knowledgeBaseEntry.count({ where: { organizationId, status: 'draft' } }),
      this.prisma.knowledgeBaseEntry.count({ where: { organizationId, isPublic: true } }),
      this.prisma.knowledgeBaseEntry.aggregate({
        where: { organizationId },
        _sum: { usageCount: true },
      }),
    ]);

    const categories = await this.prisma.knowledgeBaseEntry.groupBy({
      by: ['category'],
      where: { organizationId },
      _count: true,
    });

    return {
      total,
      approved,
      draft,
      publicEntries,
      totalUsage: totalUsage._sum.usageCount || 0,
      byCategory: categories.map(c => ({ category: c.category, count: c._count })),
    };
  }
}
