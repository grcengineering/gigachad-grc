import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { MCPClientService } from './mcp-client.service';
import { PrismaService } from '../prisma/prisma.service';

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
export class MCPWorkflowService {
  private readonly logger = new Logger(MCPWorkflowService.name);
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor(
    private mcpClient: MCPClientService,
    private prisma: PrismaService,
    @InjectMetric('mcp_workflow_executions_total')
    private readonly workflowExecutionsCounter: Counter<string>,
  ) {
    // Register built-in workflows
    this.registerBuiltinWorkflows();
  }

  private registerBuiltinWorkflows(): void {
    // Evidence Collection Workflow
    this.registerWorkflow({
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
        {
          id: 'store-evidence',
          name: 'Store Collected Evidence',
          serverId: 'grc-evidence',
          toolName: 'store_evidence',
          arguments: {
            sources: ['${collect-aws.output}', '${collect-github.output}', '${collect-okta.output}'],
          },
          dependsOn: ['collect-github', 'collect-okta'],
        },
      ],
    });

    // Compliance Check Workflow
    this.registerWorkflow({
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
            frameworks: ['SOC2', 'ISO27001'],
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
    this.registerWorkflow({
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
    this.registerWorkflow({
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
    this.registerWorkflow({
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
    this.registerWorkflow({
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
  }

  // Register a new workflow
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Registered workflow: ${workflow.name} (${workflow.id})`);
  }

  // Get all workflows
  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  // Get workflow by ID
  getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  // Execute a workflow
  async executeWorkflow(
    workflowId: string,
    input?: Record<string, unknown>,
    variables?: Record<string, unknown>,
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
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

    this.executions.set(executionId, execution);
    this.logger.log(`Starting workflow execution: ${workflow.name} (${executionId})`);

    // Execute workflow in background and record metrics
    this.runWorkflow(execution, workflow, { ...workflow.variables, ...variables, input })
      .then(() => {
        this.workflowExecutionsCounter.inc({ status: 'success' });
      })
      .catch((error) => {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = new Date();
        this.workflowExecutionsCounter.inc({ status: 'failure' });
        this.logger.error(`Workflow failed: ${error.message}`);
      });

    return execution;
  }

  private async runWorkflow(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    context: Record<string, unknown>,
  ): Promise<void> {
    const startedAt = Date.now();
    const maxDurationMs =
      workflow.timeout ?? Number(process.env.MCP_WORKFLOW_MAX_DURATION_MS || 5 * 60 * 1000);

    const stepOutputs: Record<string, unknown> = {};

    // Build dependency graph and execute steps
    const completed = new Set<string>();
    const _stepMap = new Map(workflow.steps.map((s) => [s.id, s]));

    while (completed.size < workflow.steps.length) {
      // Check for global timeout
      if (Date.now() - startedAt > maxDurationMs) {
        throw new Error(`Workflow exceeded max duration of ${maxDurationMs}ms`);
      }

      // Find steps that can run (all dependencies completed)
      const readySteps = workflow.steps.filter(
        (step) =>
          !completed.has(step.id) &&
          (!step.dependsOn || step.dependsOn.every((dep) => completed.has(dep))),
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
          } catch (error) {
            stepExecution.status = 'failed';
            stepExecution.completedAt = new Date();
            stepExecution.error = error instanceof Error ? error.message : 'Unknown error';

            // Handle failure actions
            if (step.onFailure === 'continue') {
              completed.add(step.id);
            } else {
              throw error;
            }
          }
        }),
      );
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.output = stepOutputs;
  }

  private async executeStepWithRetry(
    step: WorkflowStep,
    args: Record<string, unknown>,
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
          } – retrying in ${delay}ms`,
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
    stepOutputs: Record<string, unknown>,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('${')) {
        resolved[key] = this.resolveVariable(value, context, stepOutputs);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveArguments(
          value as Record<string, unknown>,
          context,
          stepOutputs,
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private resolveVariable(
    variable: string,
    context: Record<string, unknown>,
    stepOutputs: Record<string, unknown>,
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
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  // Get all executions
  getExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  // Cancel execution
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      this.logger.log(`Cancelled workflow execution: ${executionId}`);
    }
  }
}

