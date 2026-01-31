/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { SlackService } from '../notifications/slack.service';
import {
  CreateRiskWorkflowTaskDto,
  UpdateRiskWorkflowTaskDto,
  ReassignTaskDto,
  CompleteTaskDto,
  RiskWorkflowTaskFilterDto,
  RiskWorkflowTaskResponseDto,
  RiskWorkflowTaskType,
  RiskWorkflowTaskStatus,
  RiskWorkflowTaskPriority,
  RiskWorkflowStage,
  WORKFLOW_TASK_CONFIGS,
} from './dto/risk-workflow-task.dto';

@Injectable()
export class RiskWorkflowTasksService {
  private readonly logger = new Logger(RiskWorkflowTasksService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly slack: SlackService,
  ) {
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';
  }

  // ===========================
  // Task CRUD Operations
  // ===========================

  /**
   * Create a manual task for a risk
   */
  async createTask(
    riskId: string,
    organizationId: string,
    dto: CreateRiskWorkflowTaskDto,
    createdById: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    // Verify risk exists
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    // Verify assignee exists
    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    // Create the task
    const task = await this.prisma.riskWorkflowTask.create({
      data: {
        organizationId,
        riskId,
        taskType: dto.taskType,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        assignedById: createdById,
        priority: dto.priority || RiskWorkflowTaskPriority.MEDIUM,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        workflowStage: dto.workflowStage || this.inferWorkflowStage(dto.taskType),
        isAutoCreated: false,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Send notification to assignee
    await this.sendTaskAssignedNotification(task, assignee);

    return this.toResponseDto(task);
  }

  /**
   * Auto-create a task when workflow transitions
   */
  async createTaskForWorkflowTransition(
    riskId: string,
    organizationId: string,
    transitionType: string,
    assigneeId: string,
    assignedById: string,
  ): Promise<RiskWorkflowTaskResponseDto | null> {
    const config = WORKFLOW_TASK_CONFIGS[transitionType];
    if (!config) {
      this.logger.warn(`No task config found for transition: ${transitionType}`);
      return null;
    }

    // Verify risk exists
    const risk = await this.prisma.risk.findFirst({
      where: { id: riskId, organizationId, deletedAt: null },
    });

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    // Calculate due date
    const dueDate = config.dueDaysFromNow
      ? new Date(Date.now() + config.dueDaysFromNow * 24 * 60 * 60 * 1000)
      : undefined;

    // Create the task
    const task = await this.prisma.riskWorkflowTask.create({
      data: {
        organizationId,
        riskId,
        taskType: config.taskType,
        title: config.title,
        description: config.description,
        assigneeId,
        assignedById,
        priority: config.defaultPriority,
        dueDate,
        workflowStage: config.workflowStage,
        isAutoCreated: true,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Send notification to assignee
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });
    if (assignee) {
      await this.sendTaskAssignedNotification(task, assignee);
    }

    this.logger.log(`Auto-created ${config.taskType} task for risk ${risk.riskId}`);

    return this.toResponseDto(task);
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string, organizationId: string): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        completedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.toResponseDto(task);
  }

  /**
   * Get all tasks for a risk
   */
  async getTasksForRisk(
    riskId: string,
    organizationId: string,
  ): Promise<RiskWorkflowTaskResponseDto[]> {
    const tasks = await this.prisma.riskWorkflowTask.findMany({
      where: { riskId, organizationId },
      include: {
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        completedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map(t => this.toResponseDto(t));
  }

  /**
   * Get tasks assigned to a user (their queue)
   */
  async getMyTasks(
    userId: string,
    organizationId: string,
    filters: RiskWorkflowTaskFilterDto = {},
    page: number = 1,
    limit: number = 25,
  ): Promise<{ tasks: RiskWorkflowTaskResponseDto[]; total: number; page: number; limit: number }> {
     
    const where: Record<string, any> = {
      organizationId,
      assigneeId: userId,
    };

    // Apply filters
    if (filters.status) {
      where.status = filters.status;
    } else {
      // Default to active tasks
      where.status = { in: [RiskWorkflowTaskStatus.PENDING, RiskWorkflowTaskStatus.IN_PROGRESS] };
    }

    if (filters.taskType) {
      where.taskType = filters.taskType;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.workflowStage) {
      where.workflowStage = filters.workflowStage;
    }

    if (filters.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { in: [RiskWorkflowTaskStatus.PENDING, RiskWorkflowTaskStatus.IN_PROGRESS] };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.riskWorkflowTask.findMany({
        where,
        include: {
          risk: {
            select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
          },
          assignedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.riskWorkflowTask.count({ where }),
    ]);

    return {
      tasks: tasks.map(t => this.toResponseDto(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get all tasks for an organization (admin view)
   */
  async getAllTasks(
    organizationId: string,
    filters: RiskWorkflowTaskFilterDto = {},
    page: number = 1,
    limit: number = 25,
  ): Promise<{ tasks: RiskWorkflowTaskResponseDto[]; total: number; page: number; limit: number }> {
     
    const where: Record<string, any> = { organizationId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.taskType) {
      where.taskType = filters.taskType;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.workflowStage) {
      where.workflowStage = filters.workflowStage;
    }

    const [tasks, total] = await Promise.all([
      this.prisma.riskWorkflowTask.findMany({
        where,
        include: {
          risk: {
            select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
          },
          assignee: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          assignedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.riskWorkflowTask.count({ where }),
    ]);

    return {
      tasks: tasks.map(t => this.toResponseDto(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    organizationId: string,
    dto: UpdateRiskWorkflowTaskDto,
    _userId: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === RiskWorkflowTaskStatus.COMPLETED || task.status === RiskWorkflowTaskStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a completed or cancelled task');
    }

    const updated = await this.prisma.riskWorkflowTask.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Start working on a task
   */
  async startTask(
    taskId: string,
    organizationId: string,
    userId: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status !== RiskWorkflowTaskStatus.PENDING) {
      throw new BadRequestException('Task is not in pending status');
    }

    if (task.assigneeId !== userId) {
      throw new BadRequestException('You are not assigned to this task');
    }

    const updated = await this.prisma.riskWorkflowTask.update({
      where: { id: taskId },
      data: {
        status: RiskWorkflowTaskStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Complete a task
   */
  async completeTask(
    taskId: string,
    organizationId: string,
    dto: CompleteTaskDto,
    userId: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === RiskWorkflowTaskStatus.COMPLETED || task.status === RiskWorkflowTaskStatus.CANCELLED) {
      throw new BadRequestException('Task is already completed or cancelled');
    }

    const updated = await this.prisma.riskWorkflowTask.update({
      where: { id: taskId },
      data: {
        status: RiskWorkflowTaskStatus.COMPLETED,
        completedAt: new Date(),
        completedById: userId,
        completionNotes: dto.completionNotes,
        resultingAction: dto.resultingAction,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        completedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify the person who assigned the task
    if (task.assignedById !== userId) {
      await this.sendTaskCompletedNotification(updated);
    }

    return this.toResponseDto(updated);
  }

  /**
   * Reassign a task to another user
   */
  async reassignTask(
    taskId: string,
    organizationId: string,
    dto: ReassignTaskDto,
    reassignedById: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === RiskWorkflowTaskStatus.COMPLETED || task.status === RiskWorkflowTaskStatus.CANCELLED) {
      throw new BadRequestException('Cannot reassign a completed or cancelled task');
    }

    // Verify new assignee exists
    const newAssignee = await this.prisma.user.findUnique({
      where: { id: dto.newAssigneeId },
    });

    if (!newAssignee) {
      throw new NotFoundException('New assignee not found');
    }

    const _previousAssigneeId = task.assigneeId;

    const updated = await this.prisma.riskWorkflowTask.update({
      where: { id: taskId },
      data: {
        assigneeId: dto.newAssigneeId,
        assignedById: reassignedById,
        assignedAt: new Date(),
        status: RiskWorkflowTaskStatus.PENDING, // Reset to pending
        startedAt: null,
        notes: dto.reason
          ? `${task.notes ? task.notes + '\n\n' : ''}Reassigned: ${dto.reason}`
          : task.notes,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify new assignee
    await this.sendTaskAssignedNotification(updated, newAssignee);

    return this.toResponseDto(updated);
  }

  /**
   * Cancel a task
   */
  async cancelTask(
    taskId: string,
    organizationId: string,
    reason: string,
    userId: string,
  ): Promise<RiskWorkflowTaskResponseDto> {
    const task = await this.prisma.riskWorkflowTask.findFirst({
      where: { id: taskId, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === RiskWorkflowTaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed task');
    }

    const updated = await this.prisma.riskWorkflowTask.update({
      where: { id: taskId },
      data: {
        status: RiskWorkflowTaskStatus.CANCELLED,
        completedAt: new Date(),
        completedById: userId,
        completionNotes: `Cancelled: ${reason}`,
      },
      include: {
        risk: {
          select: { id: true, riskId: true, title: true, inherentRisk: true, status: true },
        },
        assignee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        assignedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get task statistics for dashboard
   */
  async getTaskStats(organizationId: string, userId?: string): Promise<{
    pending: number;
    inProgress: number;
    overdue: number;
    completedThisWeek: number;
    total: number;
  }> {
     
    const where: Record<string, any> = { organizationId };
    if (userId) {
      where.assigneeId = userId;
    }

    const [pending, inProgress, overdue, completedThisWeek] = await Promise.all([
      this.prisma.riskWorkflowTask.count({
        where: { ...where, status: RiskWorkflowTaskStatus.PENDING },
      }),
      this.prisma.riskWorkflowTask.count({
        where: { ...where, status: RiskWorkflowTaskStatus.IN_PROGRESS },
      }),
      this.prisma.riskWorkflowTask.count({
        where: {
          ...where,
          status: { in: [RiskWorkflowTaskStatus.PENDING, RiskWorkflowTaskStatus.IN_PROGRESS] },
          dueDate: { lt: new Date() },
        },
      }),
      this.prisma.riskWorkflowTask.count({
        where: {
          ...where,
          status: RiskWorkflowTaskStatus.COMPLETED,
          completedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      pending,
      inProgress,
      overdue,
      completedThisWeek,
      total: pending + inProgress,
    };
  }

  // ===========================
  // Helper Methods
  // ===========================

  private inferWorkflowStage(taskType: string): RiskWorkflowStage {
    switch (taskType) {
      case RiskWorkflowTaskType.VALIDATE:
        return RiskWorkflowStage.INTAKE;
      case RiskWorkflowTaskType.ASSESS:
      case RiskWorkflowTaskType.REVIEW_ASSESSMENT:
        return RiskWorkflowStage.ASSESSMENT;
      case RiskWorkflowTaskType.TREATMENT_DECISION:
      case RiskWorkflowTaskType.EXECUTIVE_APPROVAL:
      case RiskWorkflowTaskType.MITIGATION_UPDATE:
        return RiskWorkflowStage.TREATMENT;
      default:
        return RiskWorkflowStage.INTAKE;
    }
  }

   
  private async sendTaskAssignedNotification(task: Record<string, any>, assignee: Record<string, any>): Promise<void> {
    try {
      // Check user notification preferences
      const prefs = await this.prisma.userNotificationPreferences.findUnique({
        where: { userId: assignee.id },
      });

      // Default to enabled if no preferences set
      const _sendEmail = prefs?.riskTaskEmail ?? true;
      const sendInApp = prefs?.riskTaskInApp ?? true;
      const sendSlack = prefs?.riskTaskSlack ?? false;
      const slackUserId = prefs?.slackUserId;

      // In-app notification
      if (sendInApp) {
        await this.notifications.create({
          organizationId: task.organizationId,
          userId: assignee.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'New Risk Task Assigned',
          message: `You have been assigned: ${task.title}`,
          entityType: 'risk_workflow_task',
          entityId: task.id,
          metadata: {
            riskId: task.riskId,
            taskType: task.taskType,
            priority: task.priority,
            dueDate: task.dueDate,
          },
        });
      }

      // Slack notification
      if (sendSlack && slackUserId && this.slack.isEnabled()) {
        await this.slack.sendTaskAssignedNotification({
          slackUserId,
          taskTitle: task.title,
          taskType: task.taskType,
          riskId: task.risk?.riskId || 'Unknown',
          riskTitle: task.risk?.title || 'Unknown Risk',
          priority: task.priority,
          dueDate: task.dueDate,
          appUrl: `${this.appUrl}/risks/${task.riskId}`,
        });
      }

      // Email notification is handled by the notifications service based on sendEmail preference
      // The notifications.create call above will trigger email if configured
      
      this.logger.log(`Task assigned notification sent to ${assignee.email} (in-app: ${sendInApp}, slack: ${sendSlack && !!slackUserId})`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send task assigned notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

   
  private async sendTaskCompletedNotification(task: Record<string, any>): Promise<void> {
    try {
      // Check user notification preferences for the person who assigned the task
      const prefs = await this.prisma.userNotificationPreferences.findUnique({
        where: { userId: task.assignedById },
      });

      const sendInApp = prefs?.riskTaskInApp ?? true;
      const sendSlack = prefs?.riskTaskSlack ?? false;
      const slackUserId = prefs?.slackUserId;

      // In-app notification
      if (sendInApp) {
        await this.notifications.create({
          organizationId: task.organizationId,
          userId: task.assignedById,
          type: NotificationType.TASK_COMPLETED,
          title: 'Risk Task Completed',
          message: `Task "${task.title}" has been completed`,
          entityType: 'risk_workflow_task',
          entityId: task.id,
          metadata: {
            riskId: task.riskId,
            taskType: task.taskType,
            completedById: task.completedById,
            resultingAction: task.resultingAction,
          },
        });
      }

      // Slack notification
      if (sendSlack && slackUserId && this.slack.isEnabled()) {
        const completedBy = task.completedBy 
          ? `${task.completedBy.firstName} ${task.completedBy.lastName}`
          : 'Someone';
        
        await this.slack.sendTaskCompletedNotification(
          slackUserId,
          task.title,
          task.risk?.riskId || 'Unknown',
          completedBy,
          task.resultingAction,
        );
      }
    } catch (error: unknown) {
      this.logger.error(`Failed to send task completed notification: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

   
  private toResponseDto(task: Record<string, any>): RiskWorkflowTaskResponseDto {
    return {
      id: task.id,
      riskId: task.riskId,
      taskType: task.taskType,
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      assignedById: task.assignedById,
      assignedAt: task.assignedAt,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      completedById: task.completedById,
      workflowStage: task.workflowStage,
      previousStatus: task.previousStatus,
      resultingAction: task.resultingAction,
      notes: task.notes,
      completionNotes: task.completionNotes,
      isAutoCreated: task.isAutoCreated,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      risk: task.risk,
      assignee: task.assignee,
      assignedBy: task.assignedBy,
    };
  }
}
