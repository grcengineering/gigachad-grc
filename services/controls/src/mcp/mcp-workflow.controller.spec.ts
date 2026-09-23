import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'net';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { MCPWorkflowController } from './mcp-workflow.controller';
import { MCPWorkflowService } from './mcp-workflow.service';

describe('MCPWorkflowController routing', () => {
  let app: INestApplication;
  let baseUrl: string;
  const workflowService = {
    getWorkflows: jest.fn().mockReturnValue([]),
    getExecutions: jest.fn().mockReturnValue([{ id: 'exec-1' }]),
    getExecution: jest.fn(),
    getWorkflow: jest.fn(),
    triggerEvent: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const devAuthGuard = {
      canActivate: (context: ExecutionContext) => {
        context.switchToHttp().getRequest().user = {
          userId: 'b17a0371-4e0a-4eac-a834-88b8af1bc9e5',
          organizationId: 'a17a0371-4e0a-4eac-a834-88b8af1bc9e5',
        };
        return true;
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [MCPWorkflowController],
      providers: [
        { provide: MCPWorkflowService, useValue: workflowService },
        { provide: DevAuthGuard, useValue: devAuthGuard },
        { provide: PermissionGuard, useValue: { canActivate: () => true } },
      ],
    })
      .overrideGuard(DevAuthGuard)
      .useValue(devAuthGuard)
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not shadow the executions collection with the workflow ID route', async () => {
    const response = await fetch(`${baseUrl}/api/mcp/workflows/executions`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: 'exec-1' }],
    });

    expect(workflowService.getExecutions).toHaveBeenCalled();
    expect(workflowService.getWorkflow).not.toHaveBeenCalled();
  });
});
