import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import * as cronParser from 'cron-parser';
import { EVENT_BUS, EventBus } from '@gigachad-grc/shared';
import { MCPClientService } from './mcp-client.service';
import { PrismaService } from '../prisma/prisma.service';
import { McpWorkflowDefinition, McpWorkflowExecution, Prisma } from '@prisma/client';
import { auditMutation } from '../common/audit-mutation';

interface WorkflowStep {
  id: string;
  name: string;
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  dependsOn?: string[];
  onSuccess?: string;
  onFailure?: string;
  retryPolicy?: {
    maxAttempts: number;
    delayMs: number;
  };
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
  timeout?: number;
}

export interface WorkflowTrigger {
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  schedule?: string; // Cron expression for scheduled
  event?: string; // Event name for event-driven
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  steps: WorkflowStepExecution[];
  output?: Record<string, unknown>;
  error?: string;
}

interface WorkflowStepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

@Injectable()
export class MCPWorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MCPWorkflowService.name);
  private scheduleTimers = new Map<string, NodeJS.Timeout>();
  private readonly eventChannels = ['grc:risks', 'grc:vendors', 'grc:alerts'];

  constructor(
    private mcpClient: MCPClientService,
    private prisma: PrismaService,
    @InjectMetric('mcp_workflow_executions_total')
    private readonly workflowExecutionsCounter: Counter<string>,
    @Optional() @Inject(EVENT_BUS) private readonly eventBus?: EventBus
  ) {}

  private getBuiltinWorkflows(): WorkflowDefinition[] {
    const workflows: WorkflowDefinition[] = [];
    // Evidence Collection Workflow
    workflows.push({
      id: 'evidence-collection',
      name: 'Automated Evidence Collection',
      description: 'Collect compliance evidence from configured sources',
      trigger: { type: 'scheduled', schedule: '0 0 * * *' }, // Daily at midnight
      steps: [
        {
          id: 'collect-aws',
          name: 'Collect AWS Evidence',
          serverId: 'grc-evidence',
          toolName: 'collect_aws_evidence',
          arguments: {
            services: ['s3', 'iam', 'ec2', 'config'],
            includeConfigurations: true,
          },
        },
        {
          id: 'collect-github',
          name: 'Collect GitHub Evidence',
          serverId: 'grc-evidence',
          toolName: 'collect_github_evidence',
          arguments: {
            organization: '${GITHUB_ORG}',
            checks: ['branch-protection', 'secrets-scanning', 'dependabot'],
          },
          dependsOn: ['collect-aws'],
        },
        {
          id: 'collect-okta',
          name: 'Collect Okta Evidence',
          serverId: 'grc-evidence',
          toolName: 'collect_okta_evidence',
          arguments: {
            domain: '${OKTA_DOMAIN}',
            checks: ['mfa-status', 'password-policy', 'inactive-users'],
          },
          dependsOn: ['collect-aws'],
        },
      ],
    });

    // Compliance Check Workflow
    workflows.push({
      id: 'compliance-check',
      name: 'Automated Compliance Check',
      description: 'Run automated compliance checks against frameworks',
      trigger: { type: 'scheduled', schedule: '0 6 * * 1' }, // Weekly on Monday at 6 AM
      steps: [
        {
          id: 'check-soc2',
          name: 'Check SOC 2 Controls',
          serverId: 'grc-compliance',
          toolName: 'check_soc2_controls',
          arguments: {
            trustServiceCategories: ['security', 'availability'],
          },
        },
        {
          id: 'check-iso27001',
          name: 'Check ISO 27001 Controls',
          serverId: 'grc-compliance',
          toolName: 'check_iso27001_controls',
          arguments: {
            domains: ['A.5', 'A.6', 'A.8', 'A.9'],
          },
        },
        {
          id: 'generate-report',
          name: 'Generate Compliance Report',
          serverId: 'grc-compliance',
          toolName: 'generate_compliance_report',
          arguments: {
            framework: 'SOC2',
            reportType: 'detailed',
            includeEvidence: true,
          },
          dependsOn: ['check-soc2', 'check-iso27001'],
        },
        {
          id: 'analyze-gaps',
          name: 'Analyze Compliance Gaps',
          serverId: 'grc-ai-assistant',
          toolName: 'analyze_compliance_gap',
          arguments: {
            currentControls: '${generate-report.output.controls}',
            targetFramework: 'SOC2',
            includeRoadmap: true,
          },
          dependsOn: ['generate-report'],
        },
      ],
    });

    // Risk Assessment Workflow
    workflows.push({
      id: 'risk-assessment',
      name: 'AI-Powered Risk Assessment',
      description: 'Analyze risks and generate mitigation recommendations',
      trigger: { type: 'event', event: 'risk.created' },
      steps: [
        {
          id: 'analyze-risk',
          name: 'Analyze Risk',
          serverId: 'grc-ai-assistant',
          toolName: 'analyze_risk',
          arguments: {
            riskDescription: '${event.riskDescription}',
            context: {
              industry: '${ORG_INDUSTRY}',
              frameworks: ['SOC2', 'ISO27001'],
            },
            includeQuantitative: true,
          },
        },
        {
          id: 'suggest-controls',
          name: 'Suggest Controls',
          serverId: 'grc-ai-assistant',
          toolName: 'suggest_controls',
          arguments: {
            risk: '${analyze-risk.output}',
            frameworks: ['SOC2', 'ISO27001'],
            maxSuggestions: 5,
          },
          dependsOn: ['analyze-risk'],
        },
        {
          id: 'map-requirements',
          name: 'Map to Framework Requirements',
          serverId: 'grc-ai-assistant',
          toolName: 'map_requirements',
          arguments: {
            control: '${suggest-controls.output.suggestions[0]}',
            targetFrameworks: ['SOC2', 'ISO27001'],
          },
          dependsOn: ['suggest-controls'],
        },
      ],
    });

    // Vendor Assessment Workflow
    workflows.push({
      id: 'vendor-assessment',
      name: 'Vendor Risk Assessment',
      description: 'Comprehensive vendor security assessment',
      trigger: { type: 'event', event: 'vendor.assessment_requested' },
      steps: [
        {
          id: 'assess-vendor',
          name: 'AI Vendor Assessment',
          serverId: 'grc-ai-assistant',
          toolName: 'assess_vendor_risk',
          arguments: {
            vendor: '${event.vendor}',
            assessmentData: '${event.assessmentData}',
            riskAppetite: '${ORG_RISK_APPETITE}',
          },
        },
        {
          id: 'collect-evidence',
          name: 'Collect Vendor Evidence',
          serverId: 'grc-evidence',
          toolName: 'collect_github_evidence',
          arguments: {
            organization: '${event.vendor.githubOrg}',
            checks: ['branch-protection', 'code-scanning'],
          },
          dependsOn: ['assess-vendor'],
        },
      ],
    });

    // Incident Response Workflow
    workflows.push({
      id: 'incident-response',
      name: 'Incident Response Assistance',
      description: 'AI-assisted incident response guidance',
      trigger: { type: 'event', event: 'incident.created' },
      steps: [
        {
          id: 'explain-finding',
          name: 'Explain Incident',
          serverId: 'grc-ai-assistant',
          toolName: 'explain_finding',
          arguments: {
            finding: '${event.incident}',
            audience: 'technical',
            includeRemediation: true,
          },
        },
        {
          id: 'prioritize-remediation',
          name: 'Prioritize Remediation',
          serverId: 'grc-ai-assistant',
          toolName: 'prioritize_remediation',
          arguments: {
            findings: ['${event.incident}'],
            prioritizationStrategy: 'risk_based',
          },
          dependsOn: ['explain-finding'],
        },
      ],
    });

    // Policy Review Workflow
    workflows.push({
      id: 'policy-review',
      name: 'Policy Compliance Review',
      description: 'Review policies against compliance frameworks',
      trigger: { type: 'manual' },
      steps: [
        {
          id: 'validate-policy',
          name: 'Validate Policy',
          serverId: 'grc-compliance',
          toolName: 'validate_policy_compliance',
          arguments: {
            policyId: '${input.policyId}',
            framework: '${input.framework}',
          },
        },
        {
          id: 'draft-updates',
          name: 'Draft Policy Updates',
          serverId: 'grc-ai-assistant',
          toolName: 'draft_policy',
          arguments: {
            policyType: '${input.policyType}',
            frameworks: ['${input.framework}'],
            organizationContext: {
              name: '${ORG_NAME}',
              industry: '${ORG_INDUSTRY}',
            },
          },
          dependsOn: ['validate-policy'],
        },
      ],
    });
    return workflows;
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.mcpWorkflowExecution.updateMany({
      where: { status: 'running' },
      data: {
        status: 'failed',
        error: 'Execution interrupted by service restart',
        completedAt: new Date(),
      },
    });
    for (const workflow of this.getBuiltinWorkflows()) {
      await this.persistWorkflow(workflow, null, true);
    }

    if (process.env.NODE_ENV === 'test') return;

    const scheduledRows = await this.prisma.mcpWorkflowDefinition.findMany();
    for (const row of scheduledRows) {
      const workflow = this.toWorkflowDefinition(row);
      if (workflow.trigger.type === 'scheduled' && workflow.trigger.schedule) {
        this.scheduleWorkflow(workflow, row.organizationId);
      }
    }

    if (this.eventBus) {
      for (const channel of this.eventChannels) {
        await this.eventBus.subscribe<{
          type?: string;
          data?: Record<string, unknown>;
          organizationId?: string;
          entityId?: string;
        }>(channel, async (event) => {
          if (!event?.type || !event.organizationId) return;
          await this.triggerEvent(event.organizationId, 'system-event', event.type, {
            ...(event.data || {}),
            organizationId: event.organizationId,
            entityId: event.entityId,
          });
        });
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.scheduleTimers.values()) {
      clearTimeout(timer);
    }
    this.scheduleTimers.clear();

    if (this.eventBus) {
      await Promise.all(
        this.eventChannels.map((channel) =>
          this.eventBus!.unsubscribe(channel).catch((error) =>
            this.logger.warn(`Failed to unsubscribe MCP workflows from ${channel}: ${error}`)
          )
        )
      );
    }
  }

  async triggerEvent(
    organizationId: string,
    userId: string,
    eventName: string,
    payload: Record<string, unknown>
  ): Promise<WorkflowExecution[]> {
    const workflows = (await this.getWorkflows(organizationId)).filter(
      (workflow) => workflow.trigger.type === 'event' && workflow.trigger.event === eventName
    );

    return Promise.all(
      workflows.map((workflow) =>
        this.executeWorkflow(organizationId, userId, workflow.id, undefined, { event: payload })
      )
    );
  }

  private scheduleWorkflow(
    workflow: WorkflowDefinition,
    workflowOrganizationId: string | null
  ): void {
    const schedule = workflow.trigger.schedule;
    if (!schedule) return;

    try {
      const nextRun = cronParser
        .parseExpression(schedule, {
          currentDate: new Date(),
        })
        .next()
        .toDate();
      const delay = Math.max(0, nextRun.getTime() - Date.now());
      const timer = setTimeout(async () => {
        try {
          const organizationIds = workflowOrganizationId
            ? [workflowOrganizationId]
            : (
                await this.prisma.organization.findMany({
                  select: { id: true },
                })
              ).map((organization) => organization.id);
          await Promise.all(
            organizationIds.map((organizationId) =>
              this.executeWorkflow(organizationId, 'system-scheduler', workflow.id, undefined, {
                trigger: {
                  type: 'scheduled',
                  scheduledAt: nextRun.toISOString(),
                },
              })
            )
          );
        } catch (error) {
          this.logger.error(
            `Scheduled MCP workflow ${workflow.id} failed to start: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        } finally {
          this.scheduleWorkflow(workflow, workflowOrganizationId);
        }
      }, delay);
      timer.unref();
      this.scheduleTimers.set(`${workflowOrganizationId || 'built-in'}:${workflow.id}`, timer);
      this.logger.log(`Scheduled MCP workflow ${workflow.id} for ${nextRun.toISOString()}`);
    } catch (error) {
      this.logger.error(
        `Invalid schedule for MCP workflow ${workflow.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Register a new workflow
  async registerWorkflow(
    organizationId: string,
    userId: string,
    workflow: WorkflowDefinition
  ): Promise<void> {
    await this.persistWorkflow(workflow, organizationId, false);
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'UPSERT',
      entityType: 'McpWorkflowDefinition',
      entityId: workflow.id,
      entityName: workflow.name,
      description: `Registered MCP workflow: ${workflow.name}`,
    });
    this.logger.log(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  // Get all workflows
  async getWorkflows(organizationId?: string, builtInsOnly = false): Promise<WorkflowDefinition[]> {
    const rows = await this.prisma.mcpWorkflowDefinition.findMany({
      where: builtInsOnly
        ? { isBuiltIn: true }
        : organizationId
          ? { OR: [{ organizationId }, { organizationId: null, isBuiltIn: true }] }
          : { isBuiltIn: true },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toWorkflowDefinition(row));
  }

  // Get workflow by ID
  async getWorkflow(organizationId: string, id: string): Promise<WorkflowDefinition | undefined> {
    const row = await this.prisma.mcpWorkflowDefinition.findFirst({
      where: {
        id,
        OR: [{ organizationId }, { organizationId: null, isBuiltIn: true }],
      },
    });
    return row ? this.toWorkflowDefinition(row) : undefined;
  }

  // Execute a workflow
  async executeWorkflow(
    organizationId: string,
    userId: string,
    workflowId: string,
    input?: Record<string, unknown>,
    variables?: Record<string, unknown>
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(organizationId, workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = `exec-${randomBytes(8).toString('hex')}`;
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'running',
      startedAt: new Date(),
      steps: workflow.steps.map((step) => ({
        stepId: step.id,
        status: 'pending',
      })),
    };

    await this.prisma.mcpWorkflowExecution.create({
      data: {
        id: executionId,
        workflowId,
        organizationId,
        requestedBy: userId,
        status: execution.status,
        steps: execution.steps as unknown as Prisma.InputJsonValue,
        input: input as Prisma.InputJsonValue | undefined,
        variables: variables as Prisma.InputJsonValue | undefined,
      },
    });
    await auditMutation(this.prisma, {
      organizationId,
      userId,
      action: 'EXECUTE',
      entityType: 'McpWorkflowExecution',
      entityId: executionId,
      entityName: workflow.name,
      description: `Started MCP workflow: ${workflow.name}`,
    });
    this.logger.log(`Starting workflow execution: ${workflow.name} (${executionId})`);

    // Execute workflow in background and record metrics
    this.runWorkflow(execution, workflow, {
      ...workflow.variables,
      ...variables,
      input,
      organizationId,
    })
      .then(() => {
        this.workflowExecutionsCounter.inc({ status: 'success' });
      })
      .catch((error) => {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = new Date();
        this.workflowExecutionsCounter.inc({ status: 'failure' });
        this.logger.error(`Workflow failed: ${error.message}`);
        return this.persistExecution(execution);
      });

    return execution;
  }

  private async runWorkflow(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    context: Record<string, unknown>
  ): Promise<void> {
    const startedAt = Date.now();
    const maxDurationMs =
      workflow.timeout ?? Number(process.env.MCP_WORKFLOW_MAX_DURATION_MS || 5 * 60 * 1000);

    const stepOutputs: Record<string, unknown> = {};

    // Build dependency graph and execute steps
    const completed = new Set<string>();

    while (completed.size < workflow.steps.length) {
      const durableState = await this.prisma.mcpWorkflowExecution.findFirst({
        where: { id: execution.id, organizationId: context.organizationId as string | undefined },
        select: { status: true },
      });
      if (durableState?.status === 'cancelled') {
        execution.status = 'cancelled';
        execution.completedAt = new Date();
        return;
      }
      // Check for global timeout
      if (Date.now() - startedAt > maxDurationMs) {
        throw new Error(`Workflow exceeded max duration of ${maxDurationMs}ms`);
      }

      // Find steps that can run (all dependencies completed)
      const readySteps = workflow.steps.filter(
        (step) =>
          !completed.has(step.id) &&
          (!step.dependsOn || step.dependsOn.every((dep) => completed.has(dep)))
      );

      if (readySteps.length === 0) {
        throw new Error('Workflow deadlock: no steps can proceed');
      }

      // Execute ready steps in parallel
      await Promise.all(
        readySteps.map(async (step) => {
          const stepExecution = execution.steps.find((s) => s.stepId === step.id);
          if (!stepExecution) return;

          stepExecution.status = 'running';
          stepExecution.startedAt = new Date();
          await this.persistExecution(execution);

          try {
            // Resolve arguments with context and step outputs
            const resolvedArgs = this.resolveArguments(step.arguments, context, stepOutputs);

            // Execute the step with optional retry policy
            const result = await this.executeStepWithRetry(step, resolvedArgs);

            if (!result.success) {
              throw new Error(result.error || 'Step execution failed');
            }

            stepExecution.status = 'completed';
            stepExecution.completedAt = new Date();
            stepExecution.output = result.result;
            stepOutputs[step.id] = result.result;

            completed.add(step.id);
            await this.persistExecution(execution);
          } catch (error) {
            stepExecution.status = 'failed';
            stepExecution.completedAt = new Date();
            stepExecution.error = error instanceof Error ? error.message : 'Unknown error';
            await this.persistExecution(execution);

            // Handle failure actions
            if (step.onFailure === 'continue') {
              completed.add(step.id);
            } else {
              throw error;
            }
          }
        })
      );
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.output = stepOutputs;
    await this.persistExecution(execution);
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const maxAttempts = step.retryPolicy?.maxAttempts ?? 1;
    const baseDelayMs = step.retryPolicy?.delayMs ?? 1000;
    const maxDelayMs = 10000;

    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        const result = await this.mcpClient.callTool(step.serverId, step.toolName, args);
        return { success: true, result };
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts - 1) {
          break;
        }
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        this.logger.warn(
          `MCP workflow step "${step.id}" failed (attempt ${attempt + 1}/${maxAttempts}): ${
            error instanceof Error ? error.message : String(error)
          } – retrying in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw lastError;
  }

  private resolveArguments(
    args: Record<string, unknown>,
    context: Record<string, unknown>,
    stepOutputs: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      resolved[key] = this.resolveValue(value, context, stepOutputs);
    }

    return resolved;
  }

  private resolveValue(
    value: unknown,
    context: Record<string, unknown>,
    stepOutputs: Record<string, unknown>
  ): unknown {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      return this.resolveVariable(value, context, stepOutputs);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.resolveValue(item, context, stepOutputs));
    }
    if (typeof value === 'object' && value !== null) {
      return this.resolveArguments(value as Record<string, unknown>, context, stepOutputs);
    }
    return value;
  }

  private resolveVariable(
    variable: string,
    context: Record<string, unknown>,
    stepOutputs: Record<string, unknown>
  ): unknown {
    // Extract variable path from ${...}
    const path = variable.slice(2, -1);
    const parts = path.split('.');

    // Check step outputs first
    if (parts[0].includes('-') && stepOutputs[parts[0]]) {
      let value: unknown = stepOutputs[parts[0]];
      for (let i = 1; i < parts.length; i++) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[parts[i]];
        }
      }
      return value;
    }

    // Check context
    let value: unknown = context;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      }
    }

    // Return original if not resolved
    return value ?? variable;
  }

  // Get execution status
  async getExecution(
    organizationId: string,
    executionId: string
  ): Promise<WorkflowExecution | undefined> {
    const execution = await this.prisma.mcpWorkflowExecution.findFirst({
      where: { id: executionId, organizationId },
    });
    return execution ? this.toWorkflowExecution(execution) : undefined;
  }

  // Get all executions
  async getExecutions(organizationId: string): Promise<WorkflowExecution[]> {
    const executions = await this.prisma.mcpWorkflowExecution.findMany({
      where: { organizationId },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return executions.map((execution) => this.toWorkflowExecution(execution));
  }

  // Cancel execution
  async cancelExecution(
    organizationId: string,
    userId: string,
    executionId: string
  ): Promise<void> {
    const execution = await this.prisma.mcpWorkflowExecution.findFirst({
      where: { id: executionId, organizationId },
    });
    if (execution?.status === 'running') {
      await this.prisma.mcpWorkflowExecution.update({
        where: { id: executionId },
        data: { status: 'cancelled', completedAt: new Date() },
      });
      await auditMutation(this.prisma, {
        organizationId,
        userId,
        action: 'CANCEL',
        entityType: 'McpWorkflowExecution',
        entityId: executionId,
        description: `Cancelled MCP workflow execution ${executionId}`,
      });
      this.logger.log(`Cancelled workflow execution: ${executionId}`);
    }
  }

  private async persistWorkflow(
    workflow: WorkflowDefinition,
    organizationId: string | null,
    isBuiltIn: boolean
  ): Promise<void> {
    const data = {
      organizationId,
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger as unknown as Prisma.InputJsonValue,
      steps: workflow.steps as unknown as Prisma.InputJsonValue,
      variables: workflow.variables as Prisma.InputJsonValue | undefined,
      timeoutMs: workflow.timeout,
      isBuiltIn,
    };
    await this.prisma.mcpWorkflowDefinition.upsert({
      where: { id: workflow.id },
      create: { id: workflow.id, ...data },
      update: data,
    });
  }

  private async persistExecution(execution: WorkflowExecution): Promise<void> {
    await this.prisma.mcpWorkflowExecution.update({
      where: { id: execution.id },
      data: {
        status: execution.status,
        steps: execution.steps as unknown as Prisma.InputJsonValue,
        output: execution.output as Prisma.InputJsonValue | undefined,
        error: execution.error,
        completedAt: execution.completedAt,
      },
    });
  }

  private toWorkflowDefinition(row: McpWorkflowDefinition): WorkflowDefinition {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      trigger: row.trigger as unknown as WorkflowTrigger,
      steps: row.steps as unknown as WorkflowStep[],
      variables: row.variables as Record<string, unknown> | undefined,
      timeout: row.timeoutMs ?? undefined,
    };
  }

  private toWorkflowExecution(row: McpWorkflowExecution): WorkflowExecution {
    return {
      id: row.id,
      workflowId: row.workflowId,
      status: row.status as WorkflowExecution['status'],
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
      steps: row.steps as unknown as WorkflowStepExecution[],
      output: row.output as Record<string, unknown> | undefined,
      error: row.error ?? undefined,
    };
  }
}
