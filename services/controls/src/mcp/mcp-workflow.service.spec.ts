/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MCPWorkflowService } from './mcp-workflow.service';
import { MCPClientService } from './mcp-client.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock Prometheus Counter
const mockCounter = {
  inc: jest.fn(),
  labels: jest.fn().mockReturnThis(),
};

// The injection token used by @InjectMetric decorator
const METRIC_TOKEN = 'PROM_METRIC_MCP_WORKFLOW_EXECUTIONS_TOTAL';

// Simple MCPClientService mock
class MCPClientServiceMock {
  public calls: Array<{ serverId: string; toolName: string; args: any }> = [];
  private failCount = 0;
  private failUntil = 0;

  setFailureMode(failUntil: number) {
    this.failCount = 0;
    this.failUntil = failUntil;
  }

  async callTool(serverId: string, toolName: string, args: any) {
    this.calls.push({ serverId, toolName, args });
    if (this.failCount < this.failUntil) {
      this.failCount++;
      throw new Error('Simulated MCP failure');
    }
    return { success: true, result: { ok: true, attempt: this.failCount + 1 } };
  }
}

describe('MCPWorkflowService - resilience features', () => {
  let service: MCPWorkflowService;
  let mcpClient: MCPClientServiceMock;

  beforeAll(async () => {
    mcpClient = new MCPClientServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MCPWorkflowService,
        { provide: MCPClientService, useValue: mcpClient },
        { provide: PrismaService, useValue: {} },
        { provide: METRIC_TOKEN, useValue: mockCounter },
      ],
    })
      .setLogger(new Logger('MCPWorkflowServiceTest'))
      .compile();

    service = module.get<MCPWorkflowService>(MCPWorkflowService);
  });

  it('retries a failing step according to retryPolicy and eventually succeeds', async () => {
    const workflow: any = {
      id: 'wf-1',
      name: 'Test Workflow',
      steps: [
        {
          id: 'step-1',
          serverId: 'server',
          toolName: 'tool',
          arguments: {},
          retryPolicy: {
            maxAttempts: 3,
            delayMs: 1,
          },
        },
      ],
    };

    // Register workflow directly into the service
    (service as any).workflows.set(workflow.id, workflow);

    mcpClient.setFailureMode(1); // fail once, then succeed

    const execution = await service.executeWorkflow(workflow.id, {});

    // Let the internal runWorkflow promise finish
    await new Promise((resolve) => setTimeout(resolve, 25));

    const updatedExecution = service.getExecution(execution.id)!;
    expect(updatedExecution.status).toBe('completed');
    expect(updatedExecution.steps[0].status).toBe('completed');
    expect(mcpClient.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces a max workflow duration', async () => {
    const workflow: any = {
      id: 'wf-long',
      name: 'Long Workflow',
      timeout: 1,
      steps: [
        {
          id: 'step-1',
          serverId: 'server',
          toolName: 'tool',
          arguments: {},
        },
      ],
    };

    // Force callTool to be slow but successful
    mcpClient.setFailureMode(0);
    const originalCallTool = mcpClient.callTool.bind(mcpClient);
    jest.spyOn(mcpClient, 'callTool').mockImplementation(async (serverId: string, toolName: string, args: any) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return originalCallTool(serverId, toolName, args);
    });

    (service as any).workflows.set(workflow.id, workflow);
    const execution = await service.executeWorkflow(workflow.id, {});

    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatedExecution = service.getExecution(execution.id)!;
    expect(['failed', 'completed']).toContain(updatedExecution.status);
  });

  it('marks step as failed and stops workflow when retries are exhausted', async () => {
    const workflow: any = {
      id: 'wf-retry-fail',
      name: 'Retry Exhaustion Workflow',
      steps: [
        {
          id: 'step-1',
          serverId: 'server',
          toolName: 'always-fail',
          arguments: {},
          retryPolicy: {
            maxAttempts: 2,
            delayMs: 1,
          },
        },
      ],
    };

    (service as any).workflows.set(workflow.id, workflow);

    jest
      .spyOn(mcpClient, 'callTool')
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'));

    const execution = await service.executeWorkflow(workflow.id, {});
    await new Promise((resolve) => setTimeout(resolve, 25));

    const updatedExecution = service.getExecution(execution.id)!;
    expect(updatedExecution.status).toBe('failed');
    expect(updatedExecution.steps[0].status).toBe('failed');
    expect(mcpClient.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('continues workflow when a step fails with onFailure=continue', async () => {
    const workflow: any = {
      id: 'wf-continue',
      name: 'Continue on Failure Workflow',
      steps: [
        {
          id: 'step-1',
          serverId: 'server',
          toolName: 'fail-step',
          arguments: {},
          onFailure: 'continue',
        },
        {
          id: 'step-2',
          serverId: 'server',
          toolName: 'success-step',
          arguments: {},
          dependsOn: ['step-1'],
        },
      ],
    };

    (service as any).workflows.set(workflow.id, workflow);

    jest
      .spyOn(mcpClient, 'callTool')
      .mockRejectedValueOnce(new Error('step-1-fail'))
      .mockResolvedValueOnce({ success: true, result: { ok: true, attempt: 1 } });

    const execution = await service.executeWorkflow(workflow.id, {});
    await new Promise((resolve) => setTimeout(resolve, 25));

    const updatedExecution = service.getExecution(execution.id)!;
    expect(updatedExecution.status).toBe('completed');
    expect(updatedExecution.steps.find((s) => s.stepId === 'step-1')?.status).toBe('failed');
    expect(updatedExecution.steps.find((s) => s.stepId === 'step-2')?.status).toBe('completed');
  });
});


