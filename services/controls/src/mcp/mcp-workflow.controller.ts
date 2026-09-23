import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { MCPWorkflowService } from './mcp-workflow.service';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Resource, Action } from '../permissions/dto/permission.dto';

@Controller('api/mcp/workflows')
@UseGuards(DevAuthGuard, PermissionGuard)
export class MCPWorkflowController {
  private readonly logger = new Logger(MCPWorkflowController.name);

  constructor(private readonly workflowService: MCPWorkflowService) {}

  @Get()
  @RequirePermission(Resource.AI, Action.READ)
  async listWorkflows() {
    try {
      const workflows = this.workflowService.getWorkflows();
      return {
        success: true,
        data: workflows.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          trigger: w.trigger,
          stepCount: w.steps.length,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to list workflows', error);
      throw new HttpException(
        'Failed to list workflows',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('executions')
  @RequirePermission(Resource.AI, Action.READ)
  async listExecutions() {
    try {
      const executions = this.workflowService.getExecutions();
      return {
        success: true,
        data: executions,
      };
    } catch (error) {
      this.logger.error('Failed to list executions', error);
      throw new HttpException(
        'Failed to list executions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('executions/:executionId')
  @RequirePermission(Resource.AI, Action.READ)
  async getExecution(@Param('executionId') executionId: string) {
    const execution = this.workflowService.getExecution(executionId);
    if (!execution) {
      throw new HttpException('Execution not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      data: execution,
    };
  }

  @Post('executions/:executionId/cancel')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async cancelExecution(@Param('executionId') executionId: string) {
    try {
      await this.workflowService.cancelExecution(executionId);
      return {
        success: true,
        message: 'Execution cancelled',
      };
    } catch (error) {
      this.logger.error('Failed to cancel execution', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to cancel execution',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('events/:eventName')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async dispatchEvent(
    @Param('eventName') eventName: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const executions = await this.workflowService.triggerEvent(eventName, payload);
    return {
      success: true,
      data: executions,
      message: `Started ${executions.length} matching workflow(s)`,
    };
  }

  // Keep dynamic workflow routes after static execution/event routes so
  // "executions" and "events" are never interpreted as workflow IDs.
  @Get(':id')
  @RequirePermission(Resource.AI, Action.READ)
  async getWorkflow(@Param('id') id: string) {
    const workflow = this.workflowService.getWorkflow(id);
    if (!workflow) {
      throw new HttpException('Workflow not found', HttpStatus.NOT_FOUND);
    }
    return {
      success: true,
      data: workflow,
    };
  }

  @Post(':id/execute')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async executeWorkflow(
    @Param('id') id: string,
    @Body() body: { input?: Record<string, unknown>; variables?: Record<string, unknown> },
  ) {
    try {
      const execution = await this.workflowService.executeWorkflow(
        id,
        body.input,
        body.variables,
      );
      return {
        success: true,
        data: execution,
        message: 'Workflow execution started',
      };
    } catch (error) {
      this.logger.error('Failed to execute workflow', error);
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to execute workflow',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
