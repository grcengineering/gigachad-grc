import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowDto,
  CreateApprovalRequestDto,
  ApprovalActionDto,
  ApprovalRequestDto,
  StepApprovalDto,
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
  context?: Record<string, any>;
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

// In-memory stores
const workflowStore = new Map<string, WorkflowRecord>();
const requestStore = new Map<string, ApprovalRequestRecord>();

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
    const id = crypto.randomUUID();
    const now = new Date();

    // Sort steps by order
    const steps = [...dto.steps].sort((a, b) => a.order - b.order);

    const workflow: WorkflowRecord = {
      id,
      organizationId,
      name: dto.name,
      description: dto.description,
      entityType: dto.entityType,
      trigger: dto.trigger || WorkflowTrigger.Manual,
      approvalType: dto.approvalType || ApprovalType.Sequential,
      steps,
      isActive: dto.isActive !== false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };

    workflowStore.set(id, workflow);
    this.logger.log(`Created workflow ${id} (${dto.name})`);

    return this.toWorkflowDto(workflow);
  }

  async updateWorkflow(
    organizationId: string,
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowDto> {
    const workflow = workflowStore.get(workflowId);
    if (!workflow || workflow.organizationId !== organizationId) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    const steps = dto.steps 
      ? [...dto.steps].sort((a, b) => a.order - b.order)
      : workflow.steps;

    const updated: WorkflowRecord = {
      ...workflow,
      name: dto.name ?? workflow.name,
      description: dto.description ?? workflow.description,
      trigger: dto.trigger ?? workflow.trigger,
      approvalType: dto.approvalType ?? workflow.approvalType,
      steps,
      isActive: dto.isActive ?? workflow.isActive,
      updatedAt: new Date(),
    };

    workflowStore.set(workflowId, updated);
    return this.toWorkflowDto(updated);
  }

  async deleteWorkflow(organizationId: string, workflowId: string): Promise<void> {
    const workflow = workflowStore.get(workflowId);
    if (!workflow || workflow.organizationId !== organizationId) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }

    // Check for pending requests
    const pendingRequests = Array.from(requestStore.values()).filter(
      r => r.workflowId === workflowId && 
        [ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(r.status)
    );

    if (pendingRequests.length > 0) {
      throw new BadRequestException('Cannot delete workflow with pending approval requests');
    }

    workflowStore.delete(workflowId);
    this.logger.log(`Deleted workflow ${workflowId}`);
  }

  async getWorkflow(organizationId: string, workflowId: string): Promise<WorkflowDto> {
    const workflow = workflowStore.get(workflowId);
    if (!workflow || workflow.organizationId !== organizationId) {
      throw new NotFoundException(`Workflow ${workflowId} not found`);
    }
    return this.toWorkflowDto(workflow);
  }

  async listWorkflows(
    organizationId: string,
    query: WorkflowListQueryDto,
  ) {
    const pagination = parsePaginationParams({
      page: query.page,
      limit: query.limit,
    });

    let workflows = Array.from(workflowStore.values())
      .filter(w => w.organizationId === organizationId);

    if (query.entityType) {
      workflows = workflows.filter(w => w.entityType === query.entityType);
    }

    if (query.activeOnly) {
      workflows = workflows.filter(w => w.isActive);
    }

    workflows.sort((a, b) => a.name.localeCompare(b.name));

    const total = workflows.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedWorkflows = workflows.slice(offset, offset + pagination.limit);

    return createPaginatedResponse(
      paginatedWorkflows.map(w => this.toWorkflowDto(w)),
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
    const workflow = workflowStore.get(dto.workflowId);
    if (!workflow || workflow.organizationId !== organizationId) {
      throw new NotFoundException(`Workflow ${dto.workflowId} not found`);
    }

    if (!workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    // Check for existing pending request
    const existing = Array.from(requestStore.values()).find(
      r => r.workflowId === dto.workflowId && 
           r.entityId === dto.entityId &&
           [ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(r.status)
    );

    if (existing) {
      throw new BadRequestException('An approval request is already pending for this entity');
    }

    const id = crypto.randomUUID();
    const now = new Date();

    // Initialize step approvals
    const stepApprovals: StepApprovalRecord[] = workflow.steps.map(step => ({
      stepOrder: step.order,
      stepName: step.name,
      status: ApprovalStepStatus.Pending,
    }));

    const request: ApprovalRequestRecord = {
      id,
      organizationId,
      workflowId: dto.workflowId,
      entityId: dto.entityId,
      status: ApprovalRequestStatus.Pending,
      currentStep: 1,
      stepApprovals,
      comment: dto.comment,
      context: dto.context,
      requestedBy: userId,
      createdAt: now,
    };

    // Set expiration if any step has a timeout
    const maxTimeout = Math.max(...workflow.steps.map(s => s.timeoutHours || 0));
    if (maxTimeout > 0) {
      request.expiresAt = new Date(now.getTime() + maxTimeout * 60 * 60 * 1000);
    }

    requestStore.set(id, request);
    this.logger.log(`Created approval request ${id} for ${workflow.entityType} ${dto.entityId}`);

    return this.toApprovalRequestDto(request, workflow);
  }

  async approveOrReject(
    organizationId: string,
    userId: string,
    requestId: string,
    dto: ApprovalActionDto,
  ): Promise<ApprovalRequestDto> {
    const request = requestStore.get(requestId);
    if (!request || request.organizationId !== organizationId) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    if (![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(request.status)) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    const workflow = workflowStore.get(request.workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Find current step
    const currentStepDef = workflow.steps.find(s => s.order === request.currentStep);
    if (!currentStepDef) {
      throw new BadRequestException('Invalid workflow state');
    }

    // Check if user can approve this step
    const canApprove = await this.canUserApproveStep(userId, currentStepDef);
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

    request.stepApprovals = [...request.stepApprovals];
    requestStore.set(requestId, request);

    this.logger.log(`Approval request ${requestId} step ${request.currentStep - 1} ${dto.action}d by ${userId}`);

    return this.toApprovalRequestDto(request, workflow);
  }

  async cancelRequest(
    organizationId: string,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const request = requestStore.get(requestId);
    if (!request || request.organizationId !== organizationId) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    // Only requester or admin can cancel
    if (request.requestedBy !== userId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    if (![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(request.status)) {
      throw new BadRequestException(`Request is already ${request.status}`);
    }

    request.status = ApprovalRequestStatus.Cancelled;
    request.completedAt = new Date();
    requestStore.set(requestId, request);

    this.logger.log(`Approval request ${requestId} cancelled by ${userId}`);
  }

  async getApprovalRequest(
    organizationId: string,
    requestId: string,
  ): Promise<ApprovalRequestDto> {
    const request = requestStore.get(requestId);
    if (!request || request.organizationId !== organizationId) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    const workflow = workflowStore.get(request.workflowId);
    return this.toApprovalRequestDto(request, workflow!);
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

    let requests = Array.from(requestStore.values())
      .filter(r => r.organizationId === organizationId);

    if (query.status) {
      requests = requests.filter(r => r.status === query.status);
    }

    if (query.entityType) {
      requests = requests.filter(r => {
        const workflow = workflowStore.get(r.workflowId);
        return workflow?.entityType === query.entityType;
      });
    }

    if (query.myRequests) {
      requests = requests.filter(r => r.requestedBy === userId);
    }

    if (query.pendingMyApproval) {
      // Filter to requests where user can approve the current step
      const filtered: ApprovalRequestRecord[] = [];
      for (const request of requests) {
        if (![ApprovalRequestStatus.Pending, ApprovalRequestStatus.InProgress].includes(request.status)) {
          continue;
        }
        const workflow = workflowStore.get(request.workflowId);
        if (!workflow) continue;
        const currentStep = workflow.steps.find(s => s.order === request.currentStep);
        if (currentStep && await this.canUserApproveStep(userId, currentStep)) {
          filtered.push(request);
        }
      }
      requests = filtered;
    }

    requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = requests.length;
    const offset = (pagination.page - 1) * pagination.limit;
    const paginatedRequests = requests.slice(offset, offset + pagination.limit);

    const dtos = paginatedRequests.map(r => {
      const workflow = workflowStore.get(r.workflowId);
      return this.toApprovalRequestDto(r, workflow!);
    });

    return createPaginatedResponse(dtos, total, pagination);
  }

  // ==================== Helpers ====================

  private async canUserApproveStep(userId: string, step: WorkflowStepDto): Promise<boolean> {
    // Check if user is in approver list
    if (step.approverUserIds?.includes(userId)) {
      return true;
    }

    // Check user roles and groups
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
