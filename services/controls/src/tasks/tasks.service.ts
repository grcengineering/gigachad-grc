import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationSeverity } from '../notifications/dto/notification.dto';
// TaskStatus and TaskPriority are string fields in the schema, not enums

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.task.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      include: {
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async findByAssignee(organizationId: string, assigneeId: string, status?: string) {
    const where: { organizationId: string; assigneeId: string; status?: string } = {
      organizationId,
      assigneeId,
    };
    if (status) {
      where.status = status;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async findAll(organizationId: string, filters?: { status?: string; priority?: string }) {
    const where: { organizationId: string; status?: string; priority?: string } = { organizationId };
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;

    return this.prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });
  }

  async create(
    organizationId: string,
    createdById: string,
    data: {
      entityType: string;
      entityId: string;
      title: string;
      description?: string;
      priority?: string;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    const task = await this.prisma.task.create({
      data: {
        organizationId,
        createdById,
        entityType: data.entityType,
        entityId: data.entityId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'medium',
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    // Notify assignee if task is assigned
    if (task.assigneeId) {
      await this.notificationsService.create({
        organizationId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'New Task Assigned',
        message: `You've been assigned a new task: ${task.title}`,
        entityType: data.entityType,
        entityId: data.entityId,
        severity: task.priority === 'critical' || task.priority === 'high' 
          ? NotificationSeverity.WARNING 
          : NotificationSeverity.INFO,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString(),
          createdByName: task.createdBy?.displayName,
        },
      });
    }

    return task;
  }

  async update(
    id: string,
    organizationId: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    },
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updateData: {
      title?: string;
      description?: string;
      status?: string;
      completedAt?: Date;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: Date | null;
    } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, displayName: true, email: true },
        },
        createdBy: {
          select: { id: true, displayName: true, email: true },
        },
      },
    });

    // Notify if task is assigned or reassigned
    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      await this.notificationsService.create({
        organizationId,
        userId: data.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned to You',
        message: `You've been assigned a task: ${updatedTask.title}`,
        entityType: task.entityType,
        entityId: task.entityId,
        severity: NotificationSeverity.INFO,
        metadata: {
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          priority: updatedTask.priority,
          dueDate: updatedTask.dueDate?.toISOString(),
        },
      });
    }

    // Notify task creator when task is completed
    if (data.status === 'completed' && task.status !== 'completed') {
      await this.notificationsService.create({
        organizationId,
        userId: task.createdById,
        type: NotificationType.TASK_COMPLETED,
        title: 'Task Completed',
        message: `Task "${updatedTask.title}" has been marked as completed`,
        entityType: task.entityType,
        entityId: task.entityId,
        severity: NotificationSeverity.SUCCESS,
        metadata: {
          taskId: updatedTask.id,
          taskTitle: updatedTask.title,
          completedByName: updatedTask.assignee?.displayName,
        },
      });
    }

    return updatedTask;
  }

  async delete(id: string, organizationId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.task.delete({
      where: { id },
    });
  }
}

