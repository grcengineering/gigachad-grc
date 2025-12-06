import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionnairesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Questionnaire CRUD
  async create(createQuestionnaireDto: CreateQuestionnaireDto, userId: string) {
    const questionnaire = await this.prisma.questionnaireRequest.create({
      data: {
        ...createQuestionnaireDto,
        status: createQuestionnaireDto.status || 'pending',
        priority: createQuestionnaireDto.priority || 'medium',
        dueDate: createQuestionnaireDto.dueDate ? new Date(createQuestionnaireDto.dueDate) : undefined,
        createdBy: userId,
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

  async findAll(organizationId: string, filters?: any) {
    const where: any = { organizationId };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.assignedTo) {
      where.assignedTo = filters.assignedTo;
    }
    if (filters?.priority) {
      where.priority = filters.priority;
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

  async findOne(id: string) {
    const questionnaire = await this.prisma.questionnaireRequest.findUnique({
      where: { id },
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

  async update(id: string, updateQuestionnaireDto: UpdateQuestionnaireDto, userId: string) {
    const questionnaire = await this.findOne(id);

    const updated = await this.prisma.questionnaireRequest.update({
      where: { id },
      data: {
        ...updateQuestionnaireDto,
        dueDate: updateQuestionnaireDto.dueDate ? new Date(updateQuestionnaireDto.dueDate) : undefined,
        completedAt: updateQuestionnaireDto.completedAt ? new Date(updateQuestionnaireDto.completedAt) : undefined,
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
      changes: updateQuestionnaireDto,
    });

    return updated;
  }

  async remove(id: string, userId: string) {
    const questionnaire = await this.findOne(id);

    await this.prisma.questionnaireRequest.delete({
      where: { id },
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
  async createQuestion(createQuestionDto: CreateQuestionDto, userId: string) {
    const questionnaire = await this.prisma.questionnaireRequest.findUnique({
      where: { id: createQuestionDto.questionnaireId },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire not found`);
    }

    const question = await this.prisma.questionnaireQuestion.create({
      data: {
        ...createQuestionDto,
        status: createQuestionDto.status || 'pending',
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

  async updateQuestion(id: string, updateQuestionDto: UpdateQuestionDto, userId: string) {
    const question = await this.prisma.questionnaireQuestion.findUnique({
      where: { id },
      include: { questionnaire: true },
    });

    if (!question) {
      throw new NotFoundException(`Question not found`);
    }

    const updated = await this.prisma.questionnaireQuestion.update({
      where: { id },
      data: {
        ...updateQuestionDto,
        reviewedAt: updateQuestionDto.reviewedAt ? new Date(updateQuestionDto.reviewedAt) : undefined,
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
      changes: updateQuestionDto,
    });

    return updated;
  }

  async removeQuestion(id: string, userId: string) {
    const question = await this.prisma.questionnaireQuestion.findUnique({
      where: { id },
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
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: 'in_progress' } }),
      this.prisma.questionnaireRequest.count({ where: { organizationId, status: 'completed' } }),
      this.prisma.questionnaireRequest.count({
        where: {
          organizationId,
          status: { in: ['pending', 'in_progress'] },
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
}
