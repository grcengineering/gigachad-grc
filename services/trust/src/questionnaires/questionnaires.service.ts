import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CacheService } from '@gigachad-grc/shared';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionnaireStatus, QuestionStatus, Priority, Prisma } from '@prisma/client';

interface QuestionnaireFilters {
  status?: string;
  assignedTo?: string;
  priority?: string;
}

interface QueueItemInput {
  id: string;
  title: string;
  requesterName: string | null;
  company: string | null;
  status: QuestionnaireStatus;
  priority: Priority;
  dueDate: Date | null;
  createdAt: Date;
  _count: { questions: number };
  questions: { id: string }[];
}

@Injectable()
export class QuestionnairesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private cache: CacheService,
  ) {}

  // Questionnaire CRUD
  async create(createQuestionnaireDto: CreateQuestionnaireDto, userId: string) {
    const { status, priority, dueDate, metadata, assignedTo, ...restDto } = createQuestionnaireDto;
    const questionnaire = await this.prisma.questionnaireRequest.create({
      data: {
        ...restDto,
        status: (status as QuestionnaireStatus) || QuestionnaireStatus.pending,
        priority: (priority as Priority) || Priority.medium,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        createdByUser: { connect: { id: userId } },
        ...(assignedTo && { assignedToUser: { connect: { id: assignedTo } } }),
      },
      include: {
        questions: true,
      },
    });

    await this.audit.log({
      organizationId: questionnaire.organizationId,
      userId,
      action: 'CREATE_QUESTIONNAIRE',
      entityType: 'questionnaire',
      entityId: questionnaire.id,
      entityName: questionnaire.title,
      description: `Created questionnaire ${questionnaire.title}`,
      metadata: { requesterEmail: questionnaire.requesterEmail },
    });

    return questionnaire;
  }

  async findAll(organizationId: string, filters?: QuestionnaireFilters) {
    const where: Prisma.QuestionnaireRequestWhereInput = { organizationId, deletedAt: null };

    if (filters?.status) {
      where.status = filters.status as QuestionnaireStatus;
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters?.priority) {
      where.priority = filters.priority as Priority;
    }

    return this.prisma.questionnaireRequest.findMany({
      where,
      include: {
        questions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string, organizationId: string) {
    // SECURITY: Include organizationId in query to prevent IDOR
    // This ensures users can only access questionnaires within their organization
    const questionnaire = await this.prisma.questionnaireRequest.findFirst({
      where: { 
        id, 
        organizationId, // Tenant isolation - prevents cross-organization access
        deletedAt: null,
      },
      include: {
        questions: {
          include: {
            knowledgeBase: {
              select: {
                id: true,
                title: true,
                answer: true,
              },
            },
            attachments: true,
          },
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    return questionnaire;
  }

  async update(id: string, updateQuestionnaireDto: UpdateQuestionnaireDto, userId: string, organizationId: string) {
    // SECURITY: Verify questionnaire belongs to user's organization before updating
    const _questionnaire = await this.findOne(id, organizationId);

    const { status, priority, assignedTo, metadata, dueDate, completedAt, ...restDto } = updateQuestionnaireDto;

    const updated = await this.prisma.questionnaireRequest.update({
      where: { id },
      data: {
        ...restDto,
        status: status as QuestionnaireStatus | undefined,
        priority: priority as Priority | undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ...(assignedTo && { assignee: { connect: { id: assignedTo } } }),
      },
      include: {
        questions: true,
      },
    });

    await this.audit.log({
      organizationId: updated.organizationId,
      userId,
      action: 'UPDATE_QUESTIONNAIRE',
      entityType: 'questionnaire',
      entityId: id,
      entityName: updated.title,
      description: `Updated questionnaire ${updated.title}`,
      changes: updateQuestionnaireDto as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async remove(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify questionnaire belongs to user's organization before deleting
    const questionnaire = await this.findOne(id, organizationId);

    // Soft delete
    await this.prisma.questionnaireRequest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    await this.audit.log({
      organizationId: questionnaire.organizationId,
      userId,
      action: 'DELETE_QUESTIONNAIRE',
      entityType: 'questionnaire',
      entityId: id,
      entityName: questionnaire.title,
      description: `Deleted questionnaire ${questionnaire.title}`,
    });

    return { message: 'Questionnaire deleted successfully' };
  }

  // Question CRUD
  async createQuestion(createQuestionDto: CreateQuestionDto, userId: string, organizationId: string) {
    // SECURITY: Verify questionnaire belongs to user's organization before creating question
    const questionnaire = await this.prisma.questionnaireRequest.findFirst({
      where: { 
        id: createQuestionDto.questionnaireId,
        organizationId, // Tenant isolation - prevents cross-organization access
      },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire not found`);
    }

    const { status: questionStatus, assignedTo: questionAssignee, ...restQuestionDto } = createQuestionDto;

    const question = await this.prisma.questionnaireQuestion.create({
      data: {
        ...restQuestionDto,
        status: (questionStatus as QuestionStatus) || QuestionStatus.pending,
        ...(questionAssignee && { assignee: { connect: { id: questionAssignee } } }),
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            title: true,
            answer: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: questionnaire.organizationId,
      userId,
      action: 'CREATE_QUESTION',
      entityType: 'question',
      entityId: question.id,
      description: `Added question to questionnaire ${questionnaire.title}`,
      metadata: { questionnaireId: questionnaire.id },
    });

    return question;
  }

  async updateQuestion(id: string, updateQuestionDto: UpdateQuestionDto, userId: string, organizationId: string) {
    // SECURITY: Verify question's questionnaire belongs to user's organization
    const question = await this.prisma.questionnaireQuestion.findFirst({
      where: { 
        id,
        questionnaire: {
          organizationId, // Tenant isolation - prevents cross-organization access
        },
      },
      include: { questionnaire: true },
    });

    if (!question) {
      throw new NotFoundException(`Question not found`);
    }

    const { status: qStatus, assignedTo: qAssignee, reviewedBy, ...restUpdateDto } = updateQuestionDto;

    const updated = await this.prisma.questionnaireQuestion.update({
      where: { id },
      data: {
        ...restUpdateDto,
        status: qStatus as QuestionStatus | undefined,
        reviewedAt: updateQuestionDto.reviewedAt ? new Date(updateQuestionDto.reviewedAt) : undefined,
        ...(qAssignee && { assignee: { connect: { id: qAssignee } } }),
        ...(reviewedBy && { reviewer: { connect: { id: reviewedBy } } }),
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            title: true,
            answer: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: question.questionnaire.organizationId,
      userId,
      action: 'UPDATE_QUESTION',
      entityType: 'question',
      entityId: id,
      description: `Updated question in questionnaire`,
      changes: updateQuestionDto as unknown as Prisma.InputJsonValue,
    });

    return updated;
  }

  async removeQuestion(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify question's questionnaire belongs to user's organization
    const question = await this.prisma.questionnaireQuestion.findFirst({
      where: { 
        id,
        questionnaire: {
          organizationId, // Tenant isolation - prevents cross-organization access
        },
      },
      include: { questionnaire: true },
    });

    if (!question) {
      throw new NotFoundException(`Question not found`);
    }

    await this.prisma.questionnaireQuestion.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId: question.questionnaire.organizationId,
      userId,
      action: 'DELETE_QUESTION',
      entityType: 'question',
      entityId: id,
      description: `Deleted question from questionnaire`,
    });

    return { message: 'Question deleted successfully' };
  }

  // Get user's assigned questions (queue)
  async getMyQueue(userId: string, organizationId: string) {
    return this.prisma.questionnaireQuestion.findMany({
      where: {
        assignedTo: userId,
        questionnaire: {
          organizationId,
          status: { in: ['pending', 'in_progress'] },
        },
      },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            requesterName: true,
            company: true,
            dueDate: true,
            priority: true,
          },
        },
        knowledgeBase: {
          select: {
            id: true,
            title: true,
            answer: true,
          },
        },
      },
      orderBy: [
        { questionnaire: { priority: 'desc' } },
        { questionnaire: { dueDate: 'asc' } },
      ],
    });
  }

  // Dashboard stats
  async getStats(organizationId: string) {
    const [
      total,
      pending,
      inProgress,
      completed,
      overdue,
    ] = await Promise.all([
      this.prisma.questionnaireRequest.count({ where: { organizationId } }),
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: QuestionnaireStatus.pending } }),
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: QuestionnaireStatus.in_progress } }),
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: QuestionnaireStatus.approved } }),
      this.prisma.questionnaireRequest.count({
        where: {
          organizationId,
          status: { in: [QuestionnaireStatus.pending, QuestionnaireStatus.in_progress] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    };
  }

  // Analytics for Trust Analytics page
  async getAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = dateRange?.start || thirtyDaysAgo;
    const endDate = dateRange?.end || now;

    // Get questionnaire stats
    const [
      totalQuestionnaires,
      completedQuestionnaires,
      avgQuestionsPerQuestionnaire,
      questionsByStatus,
      questionnairesByPriority,
      completionTrend,
      avgResponseTime,
      topKbEntries,
    ] = await Promise.all([
      // Total questionnaires
      this.prisma.questionnaireRequest.count({
        where: { organizationId, deletedAt: null },
      }),
      // Completed
      this.prisma.questionnaireRequest.count({
        where: { organizationId, deletedAt: null, status: QuestionnaireStatus.approved },
      }),
      // Average questions per questionnaire
      this.prisma.questionnaireQuestion.groupBy({
        by: ['questionnaireId'],
        where: { questionnaire: { organizationId, deletedAt: null } },
        _count: true,
      }),
      // Questions by status
      this.prisma.questionnaireQuestion.groupBy({
        by: ['status'],
        where: { questionnaire: { organizationId, deletedAt: null } },
        _count: true,
      }),
      // Questionnaires by priority
      this.prisma.questionnaireRequest.groupBy({
        by: ['priority'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      // Completion trend (last 30 days)
      this.prisma.questionnaireRequest.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: QuestionnaireStatus.approved,
          completedAt: { gte: startDate, lte: endDate },
        },
        select: { completedAt: true },
      }),
      // Average response time for completed questionnaires
      this.prisma.questionnaireRequest.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: QuestionnaireStatus.approved,
          completedAt: { not: null },
        },
        select: { createdAt: true, completedAt: true, priority: true },
        take: 100,
      }),
      // Top KB entries used
      this.prisma.knowledgeBaseEntry.findMany({
        where: { organizationId, deletedAt: null, usageCount: { gt: 0 } },
        select: { id: true, title: true, usageCount: true, category: true },
        orderBy: { usageCount: 'desc' },
        take: 10,
      }),
    ]);

    // Calculate average questions per questionnaire
    const totalQuestions = avgQuestionsPerQuestionnaire.reduce((sum, q) => sum + q._count, 0);
    const avgQuestions = avgQuestionsPerQuestionnaire.length > 0
      ? Math.round(totalQuestions / avgQuestionsPerQuestionnaire.length)
      : 0;

    // Calculate average response time by priority (in hours)
    const responseTimeByPriority: Record<string, { avgHours: number; count: number }> = {};
    avgResponseTime.forEach((q) => {
      if (q.completedAt) {
        const hours = (new Date(q.completedAt).getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60);
        if (!responseTimeByPriority[q.priority]) {
          responseTimeByPriority[q.priority] = { avgHours: 0, count: 0 };
        }
        responseTimeByPriority[q.priority].avgHours += hours;
        responseTimeByPriority[q.priority].count += 1;
      }
    });

    Object.keys(responseTimeByPriority).forEach((priority) => {
      const data = responseTimeByPriority[priority];
      data.avgHours = Math.round(data.avgHours / data.count);
    });

    // Group completion trend by week
    const completionsByWeek: Record<string, number> = {};
    completionTrend.forEach((q) => {
      if (q.completedAt) {
        const weekStart = new Date(q.completedAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        completionsByWeek[weekKey] = (completionsByWeek[weekKey] || 0) + 1;
      }
    });

    return {
      summary: {
        totalQuestionnaires,
        completedQuestionnaires,
        completionRate: totalQuestionnaires > 0 
          ? Math.round((completedQuestionnaires / totalQuestionnaires) * 100) 
          : 0,
        avgQuestionsPerQuestionnaire: avgQuestions,
        totalQuestions,
      },
      questionsByStatus: questionsByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      questionnairesByPriority: questionnairesByPriority.map((p) => ({
        priority: p.priority,
        count: p._count,
      })),
      responseTimeByPriority: Object.entries(responseTimeByPriority).map(([priority, data]) => ({
        priority,
        avgHours: data.avgHours,
        count: data.count,
      })),
      completionTrend: Object.entries(completionsByWeek)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, count]) => ({ week, count })),
      topKbEntries,
    };
  }

  // Get dashboard data for trust analyst queue widget
  // PERFORMANCE: Cached for 60s + all queries run in parallel for ~4x faster response
  async getDashboardQueue(organizationId: string, userId?: string) {
    const cacheKey = `questionnaire-dashboard-queue:${organizationId}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => this.getDashboardQueueUncached(organizationId, userId),
      60, // 1 minute cache - questionnaire data changes more frequently
    );
  }

  /**
   * Uncached implementation of getDashboardQueue
   */
  private async getDashboardQueueUncached(organizationId: string, _userId?: string) {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const baseWhere: Prisma.QuestionnaireRequestWhereInput = {
      organizationId,
      deletedAt: null,
      status: { in: [QuestionnaireStatus.pending, QuestionnaireStatus.in_progress] },
    };

    const selectFields = {
      id: true,
      title: true,
      requesterName: true,
      company: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      _count: { select: { questions: true } },
      questions: { 
        where: { status: { in: [QuestionStatus.completed] } },
        select: { id: true }
      },
    };

    // Run all queries in parallel for maximum performance
    const [overdue, dueThisWeek, dueNextWeek, highPriority] = await Promise.all([
      // Get overdue questionnaires
      this.prisma.questionnaireRequest.findMany({
        where: {
          ...baseWhere,
          dueDate: { lt: now },
        },
        select: selectFields,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
        take: 10,
      }),

      // Get due this week
      this.prisma.questionnaireRequest.findMany({
        where: {
          ...baseWhere,
          dueDate: { gte: now, lte: oneWeekFromNow },
        },
        select: selectFields,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
        take: 10,
      }),

      // Get due next week
      this.prisma.questionnaireRequest.findMany({
        where: {
          ...baseWhere,
          dueDate: { gt: oneWeekFromNow, lte: twoWeeksFromNow },
        },
        select: selectFields,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
        take: 5,
      }),

      // Get high priority items without due dates
      this.prisma.questionnaireRequest.findMany({
        where: {
          ...baseWhere,
          priority: { in: [Priority.high, Priority.critical] },
          dueDate: null,
        },
        select: selectFields,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        take: 5,
      }),
    ]);

    // Format results with progress calculation
    const formatItem = (item: QueueItemInput) => ({
      id: item.id,
      title: item.title,
      requesterName: item.requesterName,
      company: item.company,
      status: item.status,
      priority: item.priority,
      dueDate: item.dueDate,
      totalQuestions: item._count.questions,
      answeredQuestions: item.questions.length,
      progress: item._count.questions > 0 
        ? Math.round((item.questions.length / item._count.questions) * 100) 
        : 0,
    });

    return {
      overdue: overdue.map(formatItem),
      dueThisWeek: dueThisWeek.map(formatItem),
      dueNextWeek: dueNextWeek.map(formatItem),
      highPriority: highPriority.map(formatItem),
      summary: {
        overdueCount: overdue.length,
        dueThisWeekCount: dueThisWeek.length,
        dueNextWeekCount: dueNextWeek.length,
        highPriorityCount: highPriority.length,
      },
    };
  }
}
