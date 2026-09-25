import { MCPWorkflowService } from './mcp-workflow.service';

describe('MCPWorkflowService durable execution state', () => {
  const definitions: any[] = [];
  const executions: any[] = [];
  const prisma: any = {
    mcpWorkflowDefinition: {
      upsert: jest.fn(async ({ where, create, update }) => {
        const index = definitions.findIndex((row) => row.id === where.id);
        const now = new Date();
        if (index >= 0) {
          definitions[index] = { ...definitions[index], ...update, updatedAt: now };
          return definitions[index];
        }
        const row = { ...create, createdAt: now, updatedAt: now };
        definitions.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where }: any = {}) => {
        if (!where) return definitions;
        return definitions.filter((row) =>
          where.isBuiltIn === true
            ? row.isBuiltIn
            : where.OR.some(
                (condition: any) =>
                  (condition.organizationId !== undefined &&
                    row.organizationId === condition.organizationId) ||
                  (condition.organizationId === null &&
                    row.organizationId === null &&
                    row.isBuiltIn)
              )
        );
      }),
      findFirst: jest.fn(
        async ({ where }) =>
          definitions.find(
            (row) =>
              row.id === where.id &&
              where.OR.some(
                (condition: any) =>
                  (condition.organizationId !== undefined &&
                    row.organizationId === condition.organizationId) ||
                  (condition.organizationId === null &&
                    row.organizationId === null &&
                    row.isBuiltIn)
              )
          ) ?? null
      ),
    },
    mcpWorkflowExecution: {
      updateMany: jest.fn(async ({ where, data }) => {
        let count = 0;
        for (const row of executions) {
          if (row.status === where.status) {
            Object.assign(row, data);
            count++;
          }
        }
        return { count };
      }),
      create: jest.fn(async ({ data }) => {
        const row = {
          ...data,
          input: data.input ?? null,
          variables: data.variables ?? null,
          output: null,
          error: null,
          completedAt: null,
          startedAt: new Date(),
        };
        executions.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }) => {
        const row = executions.find((candidate) => candidate.id === where.id);
        Object.assign(row, data);
        return row;
      }),
      findFirst: jest.fn(
        async ({ where }) =>
          executions.find(
            (row) => row.id === where.id && row.organizationId === where.organizationId
          ) ?? null
      ),
      findMany: jest.fn(async ({ where }) =>
        executions.filter((row) => row.organizationId === where.organizationId)
      ),
    },
    auditLog: { create: jest.fn(async () => ({})) },
    organization: {
      findMany: jest.fn(async () => []),
      findUnique: jest.fn(async () => ({
        name: 'Test Organization',
        settings: { industry: 'technology', riskAppetite: 'medium' },
      })),
    },
  };
  const mcpClient: any = {
    callTool: jest.fn(async (_serverId: string, toolName: string) => {
      if (toolName === 'analyze_risk') return { riskScore: 'medium' };
      if (toolName === 'suggest_controls') return { suggestions: [{ id: 'control-1' }] };
      if (toolName === 'map_requirements') return { mappings: [] };
      return { collected: true };
    }),
  };
  const counter: any = { inc: jest.fn() };

  beforeEach(() => {
    definitions.length = 0;
    executions.length = 0;
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('persists built-in definitions and reads them after reconstruction', async () => {
    const first = new MCPWorkflowService(mcpClient, prisma, counter);
    await first.onModuleInit();

    const restarted = new MCPWorkflowService(mcpClient, prisma, counter);
    await restarted.onModuleInit();
    const workflows = await restarted.getWorkflows('org-a');

    expect(workflows.some((workflow) => workflow.id === 'evidence-collection')).toBe(true);
    expect(definitions).toHaveLength(6);
  });

  it('persists step and completion state across service instances', async () => {
    const service = new MCPWorkflowService(mcpClient, prisma, counter);
    await service.onModuleInit();
    const execution = await service.executeWorkflow('org-a', 'user-a', 'policy-review', {
      policyId: 'policy-1',
      policyContent: 'Access reviews are performed quarterly and documented by the control owner.',
      framework: 'SOC2',
      policyType: 'security',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const restarted = new MCPWorkflowService(mcpClient, prisma, counter);
    const persisted = await restarted.getExecution('org-a', execution.id);
    expect(persisted?.status).toBe('completed');
    expect(persisted?.steps.every((step) => step.status === 'completed')).toBe(true);
  });

  it('marks interrupted executions failed on restart', async () => {
    executions.push({
      id: 'exec-interrupted',
      workflowId: 'policy-review',
      organizationId: 'org-a',
      requestedBy: 'user-a',
      status: 'running',
      steps: [],
      input: null,
      variables: null,
      output: null,
      error: null,
      startedAt: new Date(),
      completedAt: null,
    });

    const restarted = new MCPWorkflowService(mcpClient, prisma, counter);
    await restarted.onModuleInit();
    const persisted = await restarted.getExecution('org-a', 'exec-interrupted');
    expect(persisted).toMatchObject({
      status: 'failed',
      error: 'Execution interrupted by service restart',
    });
  });

  it('starts and persists event-triggered workflows in the authenticated organization', async () => {
    const service = new MCPWorkflowService(mcpClient, prisma, counter);
    await service.onModuleInit();

    const started = await service.triggerEvent('org-a', 'user-a', 'risk.created', {
      riskDescription: 'Credential compromise',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(started).toHaveLength(1);
    expect(started[0].workflowId).toBe('risk-assessment');
    await expect(service.getExecution('org-a', started[0].id)).resolves.toMatchObject({
      status: 'completed',
    });
  });
});
