import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { Prisma } from '@prisma/client';

export interface CreateTemplateDto {
  organizationId: string;
  title: string;
  content: string;
  category?: string;
  variables?: string[];
  tags?: string[];
}

export interface UpdateTemplateDto {
  title?: string;
  content?: string;
  category?: string;
  variables?: string[];
  tags?: string[];
  status?: string;
}

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: CreateTemplateDto, userId: string) {
    // Extract variables from content (pattern: {{variable_name}})
    const extractedVariables = this.extractVariables(dto.content);
    const variables = dto.variables || extractedVariables;

    const template = await this.prisma.answerTemplate.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title,
        content: dto.content,
        category: dto.category,
        variables: variables,
        tags: dto.tags || [],
        createdBy: userId,
      },
    });

    await this.audit.log({
      organizationId: dto.organizationId,
      userId,
      action: 'CREATE_ANSWER_TEMPLATE',
      entityType: 'answer_template',
      entityId: template.id,
      entityName: template.title,
      description: `Created answer template "${template.title}"`,
    });

    return template;
  }

  async findAll(organizationId: string, filters?: {
    category?: string;
    status?: string;
    search?: string;
  }) {
    const where: Prisma.AnswerTemplateWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = 'active'; // Default to active
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
        { tags: { has: filters.search } },
      ];
    }

    return this.prisma.answerTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.answerTemplate.findFirst({
      where: { id, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, dto: UpdateTemplateDto, userId: string) {
    const template = await this.findOne(id);

    // Re-extract variables if content changed
    let variables = dto.variables;
    if (dto.content && !dto.variables) {
      variables = this.extractVariables(dto.content);
    }

    const updated = await this.prisma.answerTemplate.update({
      where: { id },
      data: {
        ...dto,
        variables: variables !== undefined ? variables : undefined,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      organizationId: template.organizationId,
      userId,
      action: 'UPDATE_ANSWER_TEMPLATE',
      entityType: 'answer_template',
      entityId: id,
      entityName: updated.title,
      description: `Updated answer template "${updated.title}"`,
      changes: dto as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const template = await this.findOne(id);

    // Soft delete
    await this.prisma.answerTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.audit.log({
      organizationId: template.organizationId,
      userId,
      action: 'DELETE_ANSWER_TEMPLATE',
      entityType: 'answer_template',
      entityId: id,
      entityName: template.title,
      description: `Deleted answer template "${template.title}"`,
    });

    return { message: 'Template deleted successfully' };
  }

  async archive(id: string, userId: string) {
    return this.update(id, { status: 'archived' }, userId);
  }

  async unarchive(id: string, userId: string) {
    return this.update(id, { status: 'active' }, userId);
  }

  async incrementUsage(id: string) {
    await this.prisma.answerTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  // Apply template with variable substitution
  async applyTemplate(id: string, variableValues: Record<string, string>) {
    const template = await this.findOne(id);
    let content = template.content;

    // Replace variables with values
    const variables = (template.variables as string[]) || [];
    for (const variable of variables) {
      const value = variableValues[variable] || `{{${variable}}}`;
      content = content.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    }

    // Track usage
    await this.incrementUsage(id);

    return {
      content,
      templateId: template.id,
      templateTitle: template.title,
    };
  }

  // Get available categories
  async getCategories(organizationId: string) {
    const categories = await this.prisma.answerTemplate.groupBy({
      by: ['category'],
      where: {
        organizationId,
        deletedAt: null,
        category: { not: null },
      },
      _count: true,
    });

    const defaultCategories = [
      { value: 'security', label: 'Security' },
      { value: 'privacy', label: 'Privacy' },
      { value: 'compliance', label: 'Compliance' },
      { value: 'legal', label: 'Legal' },
      { value: 'technical', label: 'Technical' },
      { value: 'general', label: 'General' },
    ];

    return {
      categories: defaultCategories,
      usedCategories: categories.map(c => ({
        category: c.category,
        count: c._count,
      })),
    };
  }

  // Extract variable placeholders from content
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // Get template stats
  async getStats(organizationId: string) {
    const [total, active, archived, byCategory, topUsed] = await Promise.all([
      this.prisma.answerTemplate.count({
        where: { organizationId, deletedAt: null },
      }),
      this.prisma.answerTemplate.count({
        where: { organizationId, deletedAt: null, status: 'active' },
      }),
      this.prisma.answerTemplate.count({
        where: { organizationId, deletedAt: null, status: 'archived' },
      }),
      this.prisma.answerTemplate.groupBy({
        by: ['category'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.answerTemplate.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { usageCount: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          usageCount: true,
          category: true,
        },
      }),
    ]);

    return {
      total,
      active,
      archived,
      byCategory: byCategory.map(c => ({
        category: c.category || 'uncategorized',
        count: c._count,
      })),
      topUsed,
    };
  }
}

