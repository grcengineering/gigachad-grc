/**
 * Workflow Types
 * 
 * Type definitions for workflow state management and automation.
 */

export type WorkflowStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'paused';

export type WorkflowTriggerType =
  | 'manual'
  | 'scheduled'
  | 'event'
  | 'condition';

export type WorkflowActionType =
  | 'notify'
  | 'assign'
  | 'update_status'
  | 'create_task'
  | 'send_email'
  | 'webhook'
  | 'approval'
  | 'escalate'
  | 'custom';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  event?: string; // For event-based triggers
  schedule?: string; // Cron expression for scheduled triggers
  condition?: WorkflowCondition; // For condition-based triggers
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';
  value: unknown;
  and?: WorkflowCondition[];
  or?: WorkflowCondition[];
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: WorkflowActionConfig;
  order: number;
  condition?: WorkflowCondition;
}

export interface WorkflowActionConfig {
  // Notify action
  recipients?: string[];
  notificationType?: 'email' | 'in_app' | 'slack' | 'teams';
  message?: string;
  template?: string;

  // Assign action
  assignTo?: string;
  assignType?: 'user' | 'role' | 'group';

  // Update status action
  newStatus?: string;

  // Create task action
  taskTitle?: string;
  taskDescription?: string;
  taskDueDate?: string;
  taskPriority?: 'low' | 'medium' | 'high' | 'critical';
  taskAssignee?: string;

  // Webhook action
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  webhookHeaders?: Record<string, string>;
  webhookPayload?: Record<string, unknown>;

  // Approval action
  approvers?: string[];
  approvalType?: 'any' | 'all';
  approvalTimeout?: number; // in hours

  // Escalate action
  escalateTo?: string;
  escalateAfter?: number; // in hours

  // Custom action
  customHandler?: string;
  customParams?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  actions: WorkflowAction[];
  onSuccess?: string; // next step id
  onFailure?: string; // step id or 'cancel'
  timeout?: number; // in seconds
}

export interface WorkflowDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  entityType: string; // 'control', 'risk', 'evidence', etc.
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  entityId: string;
  entityType: string;
  status: WorkflowStatus;
  currentStepId?: string;
  context: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  history: WorkflowHistoryEntry[];
}

export interface WorkflowHistoryEntry {
  stepId: string;
  stepName: string;
  action: string;
  status: 'success' | 'failure' | 'skipped';
  timestamp: Date;
  details?: Record<string, unknown>;
  error?: string;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  entityType: string;
  trigger: WorkflowTrigger;
  steps: Omit<WorkflowStep, 'id'>[];
  isActive?: boolean;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  steps?: WorkflowStep[];
  isActive?: boolean;
}
