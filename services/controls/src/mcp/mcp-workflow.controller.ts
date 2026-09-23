import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
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
  async listWorkflows(@CurrentUser() user: UserContext) {
    try {
      const workflows = await this.workflowService.getWorkflows(user.organizationId);
      return {
        success: true,
        data: workflows.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          trigger: workflow.trigger,
          stepCount: workflow.steps.length,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to list workflows', error);
      throw new HttpException('Failed to list workflows', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('executions')
  @RequirePermission(Resource.AI, Action.READ)
  async listExecutions(@CurrentUser() user: UserContext) {
    const executions = await this.workflowService.getExecutions(user.organizationId);
    return { success: true, data: executions };
  }

  @Get('executions/:executionId')
  @RequirePermission(Resource.AI, Action.READ)
  async getExecution(
    @CurrentUser() user: UserContext,
    @Param('executionId') executionId: string,
  ) {
    const execution = await this.workflowService.getExecution(user.organizationId, executionId);
    if (!execution) {
      throw new HttpException('Execution not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, data: execution };
  }

  @Post('executions/:executionId/cancel')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async cancelExecution(
    @CurrentUser() user: UserContext,
    @Param('executionId') executionId: string,
  ) {
    await this.workflowService.cancelExecution(
      user.organizationId,
      user.userId,
      executionId,
    );
    return { success: true, message: 'Execution cancelled' };
  }

  @Post('events/:eventName')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async dispatchEvent(
    @CurrentUser() user: UserContext,
    @Param('eventName') eventName: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const executions = await this.workflowService.triggerEvent(
      user.organizationId,
      user.userId,
      eventName,
      payload,
    );
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
  async getWorkflow(@CurrentUser() user: UserContext, @Param('id') id: string) {
    const workflow = await this.workflowService.getWorkflow(user.organizationId, id);
    if (!workflow) {
      throw new HttpException('Workflow not found', HttpStatus.NOT_FOUND);
    }
    return { success: true, data: workflow };
  }

  @Post(':id/execute')
  @RequirePermission(Resource.AI, Action.UPDATE)
  async executeWorkflow(
    @CurrentUser() user: UserContext,
    @Param('id') id: string,
    @Body() body: { input?: Record<string, unknown>; variables?: Record<string, unknown> },
  ) {
    try {
      const execution = await this.workflowService.executeWorkflow(
        user.organizationId,
        user.userId,
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
