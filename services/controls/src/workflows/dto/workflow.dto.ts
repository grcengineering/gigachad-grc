import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsEnum, 
  IsArray, 
  IsInt, 
  Min, 
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkflowEntityType {
  Policy = 'policy',
  Control = 'control',
  Risk = 'risk',
  Vendor = 'vendor',
  Evidence = 'evidence',
  Exception = 'exception',
}

export enum WorkflowTrigger {
  Manual = 'manual',
  OnCreate = 'on_create',
  OnUpdate = 'on_update',
  OnStatusChange = 'on_status_change',
}

export enum ApprovalType {
  Sequential = 'sequential',  // Each step must complete before next
  Parallel = 'parallel',      // All steps can approve simultaneously
  Any = 'any',               // Any one approver is sufficient
}

export enum ApprovalStepStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Skipped = 'skipped',
}

export enum ApprovalRequestStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

// Workflow Step Definition
export class WorkflowStepDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Order of this step in the workflow' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order: number;

  @ApiPropertyOptional({ description: 'Specific user IDs who can approve' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverUserIds?: string[];

  @ApiPropertyOptional({ description: 'Role names who can approve' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverRoles?: string[];

  @ApiPropertyOptional({ description: 'Permission group IDs who can approve' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverGroupIds?: string[];

  @ApiPropertyOptional({ description: 'Number of approvals required for this step', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredApprovals?: number = 1;

  @ApiPropertyOptional({ description: 'Timeout in hours before step auto-escalates' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeoutHours?: number;
}

// Workflow Definition
export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: WorkflowEntityType })
  @IsEnum(WorkflowEntityType)
  entityType: WorkflowEntityType;

  @ApiPropertyOptional({ enum: WorkflowTrigger, default: WorkflowTrigger.Manual })
  @IsOptional()
  @IsEnum(WorkflowTrigger)
  trigger?: WorkflowTrigger = WorkflowTrigger.Manual;

  @ApiPropertyOptional({ enum: ApprovalType, default: ApprovalType.Sequential })
  @IsOptional()
  @IsEnum(ApprovalType)
  approvalType?: ApprovalType = ApprovalType.Sequential;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: WorkflowTrigger })
  @IsOptional()
  @IsEnum(WorkflowTrigger)
  trigger?: WorkflowTrigger;

  @ApiPropertyOptional({ enum: ApprovalType })
  @IsOptional()
  @IsEnum(ApprovalType)
  approvalType?: ApprovalType;

  @ApiPropertyOptional({ type: [WorkflowStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps?: WorkflowStepDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkflowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: WorkflowEntityType })
  entityType: WorkflowEntityType;

  @ApiProperty({ enum: WorkflowTrigger })
  trigger: WorkflowTrigger;

  @ApiProperty({ enum: ApprovalType })
  approvalType: ApprovalType;

  @ApiProperty({ type: [WorkflowStepDto] })
  steps: WorkflowStepDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// Approval Request
export class CreateApprovalRequestDto {
  @ApiProperty()
  @IsString()
  workflowId: string;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Additional context data' })
  @IsOptional()
  context?: Record<string, any>;
}

export class ApprovalActionDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class StepApprovalDto {
  @ApiProperty()
  stepOrder: number;

  @ApiProperty()
  stepName: string;

  @ApiProperty({ enum: ApprovalStepStatus })
  status: ApprovalStepStatus;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedByName?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  comment?: string;
}

export class ApprovalRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workflowId: string;

  @ApiProperty()
  workflowName: string;

  @ApiProperty({ enum: WorkflowEntityType })
  entityType: WorkflowEntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty({ enum: ApprovalRequestStatus })
  status: ApprovalRequestStatus;

  @ApiProperty()
  currentStep: number;

  @ApiProperty({ type: [StepApprovalDto] })
  stepApprovals: StepApprovalDto[];

  @ApiPropertyOptional()
  comment?: string;

  @ApiPropertyOptional()
  context?: Record<string, any>;

  @ApiProperty()
  requestedBy: string;

  @ApiProperty()
  requestedByName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  expiresAt?: Date;
}

export class ApprovalRequestListQueryDto {
  @ApiPropertyOptional({ enum: ApprovalRequestStatus })
  @IsOptional()
  @IsEnum(ApprovalRequestStatus)
  status?: ApprovalRequestStatus;

  @ApiPropertyOptional({ enum: WorkflowEntityType })
  @IsOptional()
  @IsEnum(WorkflowEntityType)
  entityType?: WorkflowEntityType;

  @ApiPropertyOptional({ description: 'Show requests where I am an approver' })
  @IsOptional()
  @IsBoolean()
  pendingMyApproval?: boolean;

  @ApiPropertyOptional({ description: 'Show requests I submitted' })
  @IsOptional()
  @IsBoolean()
  myRequests?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class WorkflowListQueryDto {
  @ApiPropertyOptional({ enum: WorkflowEntityType })
  @IsOptional()
  @IsEnum(WorkflowEntityType)
  entityType?: WorkflowEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
