import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowDto,
  CreateApprovalRequestDto,
  ApprovalActionDto,
  ApprovalRequestDto,
  ApprovalRequestListQueryDto,
  WorkflowListQueryDto,
  WorkflowEntityType,
  WorkflowTrigger,
  ApprovalType,
  ApprovalStepStatus,
  ApprovalRequestStatus,
  WorkflowStepDto,
} from './dto/workflow.dto';
import { 
  parsePaginationParams, 
  createPaginatedResponse,
} from '@gigachad-grc/shared';

interface WorkflowRecord {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  entityType: WorkflowEntityType;
  trigger: WorkflowTrigger;
  approvalType: ApprovalType;
  steps: WorkflowStepDto[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StepApprovalRecord {
  stepOrder: number;
  stepName: string;
  status: ApprovalStepStatus;
  approvedBy?: string;
  approvedAt?: Date;
  comment?: string;
}

interface ApprovalRequestRecord {
  id: string;
  organizationId: string;
  workflowId: string;
  entityId: string;
  status: ApprovalRequestStatus;
  currentStep: number;
  stepApprovals: StepApprovalRecord[];
  comment?: string;
  context?: Record<string, unknown>;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Workflows ====================

  async createWorkflow(
    organizationId: string,
    userId: string,
    dto: CreateWorkflowDto,
  ): Promise<WorkflowDto> {
    const steps = [...dto.steps].sort((a, b) => a.order - b.order);
    const created = await this.prisma.approvalWorkflow.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        entityType: dto.entityType,
        trigger: dto.trigger || WorkflowTrigger.Manual,
        mode: dto.approvalType || ApprovalType.Sequential,
        steps: steps as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive !== false,
        createdBy: userId,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'ApprovalWorkflow',
      entityId: created.id,
      entityName: created.name,
      description: `Created approval workflow: ${created.name}`,
    });
    this.logger.log(`Created workflow ${created.id} (${dto.name})`);
    return this.toWorkflowDto(this.toWorkflowRecord(created));
  }

  async updateWorkflow(
    organizationId: string,
    userId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowDto> {
    const existing = await this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId },
    });
    if (!existing) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }
    const updated = await this.prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        name: dto.name,
        description: dto.description,
        trigger: dto.trigger,
        mode: dto.approvalType,
        steps: dto.steps
          ? ([...dto.steps].sort((a, b) => a.order - b.order) as unknown as Prisma.InputJsonValue)
          : undefined,
        isActive: dto.isActive,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'ApprovalWorkflow',
      entityId: updated.id,
      entityName: updated.name,
      description: `Updated approval workflow: ${updated.name}`,
    });
    return this.toWorkflowDto(this.toWorkflowRecord(updated));
  }

  async deleteWorkflow(organizationId: string, userId: string, workflowId: string): Promise<void> {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    const pendingRequests = await this.prisma.approvalRequest.count({
      where: {
        workflowId,
        organizationId,
        status: { in: [ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress] },
      },
    });
    if (pendingRequests > 0) {
      throw new BadRequestException('Cannot delete workflow with pending approval requests');
    }

    await this.prisma.approvalWorkflow.delete({ where: { id: workflowId } });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'ApprovalWorkflow',
      entityId: workflowId,
      entityName: workflow.name,
      description: `Deleted approval workflow: ${workflow.name}`,
    });
    this.logger.log(`Deleted workflow ${workflowId}`);
  }

  async getWorkflow(organizationId: string, workflowId: string): Promise<WorkflowDto> {
    const workflow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: workflowId, organizationId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }
    return this.toWorkflowDto(this.toWorkflowRecord(workflow));
  }

  async listWorkflows(
    organizationId: string,
    query: WorkflowListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const where: Prisma.ApprovalWorkflowWhereInput = {
      organizationId,
      entityType: query.entityType,
      isActive: query.activeOnly ? true : undefined,
    };
    const [workflows, total] = await Promise.all([
      this.prisma.approvalWorkflow.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.approvalWorkflow.count({ where }),
    ]);

    return createPaginatedResponse(
      workflows.map((w) => this.toWorkflowDto(this.toWorkflowRecord(w))),
      total,
      pagination,
    );
  }

  // ==================== Approval Requests ====================

  async createApprovalRequest(
    organizationId: string,
    userId: string,
    dto: CreateApprovalRequestDto,
  ): Promise<ApprovalRequestDto> {
    const workflowRow = await this.prisma.approvalWorkflow.findFirst({
      where: { id: dto.workflowId, organizationId },
    });
    if (!workflowRow) {
      throw new NotFoundException(`Workflow ${dto.workflowId} not found`);
    }
    const workflow = this.toWorkflowRecord(workflowRow);

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    const existing = await this.prisma.approvalRequest.findFirst({
      where: {
        organizationId,
        workflowId: dto.workflowId,
        entityId: dto.entityId,
        status: { in: [ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress] },
      },
    });
    if (existing) {
      throw new BadRequestException('An approval request is already pending for this entity');
    }

    const now = new Date();
    const stepApprovals: StepApprovalRecord[] = workflow.steps.map(step => ({
      stepOrder: step.order,
      stepName: step.name,
      status: ApprovalStepStatus.Pending,
    }));
    const maxTimeout = Math.max(...workflow.steps.map(s => s.timeoutHours || 0));
    const created = await this.prisma.approvalRequest.create({
      data: {
        organizationId,
        workflowId: dto.workflowId,
        entityType: workflow.entityType,
        entityId: dto.entityId,
        title: `${workflow.name}: ${dto.entityId}`,
        justification: dto.comment,
        context: dto.context as Prisma.InputJsonValue | undefined,
        stepApprovals: stepApprovals as unknown as Prisma.InputJsonValue,
        status: ApprovalRequestStatus.Pending,
        currentStep: workflow.steps[0]?.order ?? 1,
        requestedBy: userId,
        requestedByName: userId,
        expiresAt: maxTimeout > 0
          ? new Date(now.getTime() + maxTimeout * 60 * 60 * 1000)
          : undefined,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'ApprovalRequest',
      entityId: created.id,
      description: `Created approval request for ${workflow.entityType} ${dto.entityId}`,
    });
    const request = this.toApprovalRequestRecord(created);
    this.logger.log(`Created approval request ${created.id} for ${workflow.entityType} ${dto.entityId}`);
    return this.toApprovalRequestDto(request, workflow);
  }

  async approveOrReject(
    organizationId: string,
    userId: string,
    requestId: string,
    dto: ApprovalActionDto,
  ): Promise<ApprovalRequestDto> {
    const requestRow = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { workflow: true },
    });
    if (!requestRow) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }
    const request = this.toApprovalRequestRecord(requestRow);

    if (
      ![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(
        request.status as ApprovalRequestStatus,
      )
    ) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    if (requestRow.workflow.organizationId !== organizationId) {
      throw new NotFoundException('Workflow not found');
    }
    const workflow = this.toWorkflowRecord(requestRow.workflow);

    // Find current step
    const currentStepDef = workflow.steps.find(s => s.order === request.currentStep);
    if (!currentStepDef) {
      throw new BadRequestException('Invalid workflow state');
    }

    // Check if user can approve this step
    const canApprove = await this.canUserApproveStep(organizationId, userId, currentStepDef);
    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to approve this step');
    }

    // Update step approval
    const stepApproval = request.stepApprovals.find(s => s.stepOrder === request.currentStep);
    if (stepApproval) {
      stepApproval.status = dto.action === 'approve' 
        ? ApprovalStepStatus.Approved 
        : ApprovalStepStatus.Rejected;
      stepApproval.approvedBy = userId;
      stepApproval.approvedAt = new Date();
      stepApproval.comment = dto.comment;
    }

    // Update request status
    if (dto.action === 'reject') {
      request.status = ApprovalRequestStatus.Rejected;
      request.completedAt = new Date();
    } else {
      // Check if there are more steps
      const nextStep = workflow.steps.find(s => s.order > request.currentStep);
      if (nextStep) {
        request.currentStep = nextStep.order;
        request.status = ApprovalRequestStatus.InProgress;
      } else {
        request.status = ApprovalRequestStatus.Approved;
        request.completedAt = new Date();
      }
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: request.status,
        currentStep: request.currentStep,
        stepApprovals: request.stepApprovals as unknown as Prisma.InputJsonValue,
        completedAt: request.completedAt,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: dto.action === 'approve' ? 'APPROVE' : 'REJECT',
      entityType: 'ApprovalRequest',
      entityId: requestId,
      description: `${dto.action === 'approve' ? 'Approved' : 'Rejected'} approval request ${requestId}`,
      metadata: { comment: dto.comment },
    });

    this.logger.log(`Approval request ${requestId} step ${request.currentStep - 1} ${dto.action}d by ${userId}`);

    return this.toApprovalRequestDto(this.toApprovalRequestRecord(updated), workflow);
  }

  async cancelRequest(
    organizationId: string,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
    });
    if (!request) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    // Only requester or admin can cancel
    if (request.requestedBy !== userId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    if (
      ![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(
        request.status as ApprovalRequestStatus,
      )
    ) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalRequestStatus.Cancelled,
        completedAt: new Date(),
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'CANCEL',
      entityType: 'ApprovalRequest',
      entityId: requestId,
      description: `Cancelled approval request ${requestId}`,
    });

    this.logger.log(`Approval request ${requestId} cancelled by ${userId}`);
  }

  async getApprovalRequest(
    organizationId: string,
    requestId: string,
  ): Promise<ApprovalRequestDto> {
    const request = await this.prisma.approvalRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { workflow: true },
    });
    if (!request) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    return this.toApprovalRequestDto(
      this.toApprovalRequestRecord(request),
      this.toWorkflowRecord(request.workflow),
    );
  }

  async listApprovalRequests(
    organizationId: string,
    userId: string,
    query: ApprovalRequestListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    const rows = await this.prisma.approvalRequest.findMany({
      where: {
        organizationId,
        status: query.status,
        entityType: query.entityType,
        requestedBy: query.myRequests ? userId : undefined,
      },
      include: { workflow: true },
      orderBy: { createdAt: 'desc' },
    });
    let requests = rows.map((row) => ({
      request: this.toApprovalRequestRecord(row),
      workflow: this.toWorkflowRecord(row.workflow),
    }));

    if (query.pendingMyApproval) {
      const filtered: typeof requests = [];
      for (const item of requests) {
        if (![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(item.request.status)) {
          continue;
        }
        const currentStep = item.workflow.steps.find(s => s.order === item.request.currentStep);
        if (currentStep && await this.canUserApproveStep(organizationId, userId, currentStep)) {
          filtered.push(item);
        }
      }
      requests = filtered;
    }

    const total = requests.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedRequests = requests.slice(offset, offset + pagination.limit);

    const dtos = paginatedRequests.map(({ request, workflow }) =>
      this.toApprovalRequestDto(request, workflow),
    );

    return createPaginatedResponse(dtos, total, pagination);
  }

  // ==================== Helpers ====================

  private async canUserApproveStep(
    organizationId: string,
    userId: string,
    step: WorkflowStepDto,
  ): Promise<boolean> {
    // Check if user is in approver list
    if (step.approverUserIds?.includes(userId)) {
      return true;
    }

    // Check user roles and groups
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) return false;

    // Check roles
    if (step.approverRoles?.includes(user.role)) {
      return true;
    }

    // Check permission groups
    if (step.approverGroupIds?.length) {
      const memberships = await this.prisma.userGroupMembership.findMany({
        where: { userId },
      });
      const userGroupIds = memberships.map(m => m.groupId);
      if (step.approverGroupIds.some(id => userGroupIds.includes(id))) {
        return true;
      }
    }

    return false;
  }

  private toWorkflowRecord(workflow: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    entityType: string;
    trigger: string;
    mode: string;
    steps: Prisma.JsonValue;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }): WorkflowRecord {
    return {
      id: workflow.id,
      organizationId: workflow.organizationId,
      name: workflow.name,
      description: workflow.description ?? undefined,
      entityType: workflow.entityType as WorkflowEntityType,
      trigger: workflow.trigger as WorkflowTrigger,
      approvalType: workflow.mode as ApprovalType,
      steps: workflow.steps as unknown as WorkflowStepDto[],
      isActive: workflow.isActive,
      createdBy: workflow.createdBy,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  private toApprovalRequestRecord(request: {
    id: string;
    organizationId: string;
    workflowId: string;
    entityId: string;
    status: string;
    currentStep: number;
    stepApprovals: Prisma.JsonValue;
    justification: string | null;
    context: Prisma.JsonValue | null;
    requestedBy: string;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
  }): ApprovalRequestRecord {
    return {
      id: request.id,
      organizationId: request.organizationId,
      workflowId: request.workflowId,
      entityId: request.entityId,
      status: request.status as ApprovalRequestStatus,
      currentStep: request.currentStep,
      stepApprovals: request.stepApprovals as unknown as StepApprovalRecord[],
      comment: request.justification ?? undefined,
      context: request.context as Record<string, unknown> | undefined,
      requestedBy: request.requestedBy,
      createdAt: request.createdAt,
      completedAt: request.completedAt ?? undefined,
      expiresAt: request.expiresAt ?? undefined,
    };
  }

  private toWorkflowDto(workflow: WorkflowRecord): WorkflowDto {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      entityType: workflow.entityType,
      trigger: workflow.trigger,
      approvalType: workflow.approvalType,
      steps: workflow.steps,
      isActive: workflow.isActive,
      createdBy: workflow.createdBy,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  private toApprovalRequestDto(request: ApprovalRequestRecord, workflow: WorkflowRecord): ApprovalRequestDto {
    return {
      id: request.id,
      workflowId: request.workflowId,
      workflowName: workflow.name,
      entityType: workflow.entityType,
      entityId: request.entityId,
      status: request.status,
      currentStep: request.currentStep,
      stepApprovals: request.stepApprovals.map(s => ({
        stepOrder: s.stepOrder,
        stepName: s.stepName,
        status: s.status,
        approvedBy: s.approvedBy,
        approvedByName: s.approvedBy, // Would fetch from user in production
        approvedAt: s.approvedAt,
        comment: s.comment,
      })),
      comment: request.comment,
      context: request.context,
      requestedBy: request.requestedBy,
      requestedByName: request.requestedBy, // Would fetch from user in production
      createdAt: request.createdAt,
      completedAt: request.completedAt,
      expiresAt: request.expiresAt,
    };
  }
}
