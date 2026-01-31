 
import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { RiskWorkflowTasksService } from './risk-workflow-tasks.service';
import {
  CreateRiskWorkflowTaskDto,
  UpdateRiskWorkflowTaskDto,
  ReassignTaskDto,
  CompleteTaskDto,
  RiskWorkflowTaskFilterDto,
} from './dto/risk-workflow-task.dto';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@Controller('api/risk-tasks')
@UseGuards(DevAuthGuard)
export class RiskWorkflowTasksController {
  constructor(private readonly tasksService: RiskWorkflowTasksService) {}

  // ===========================
  // My Tasks (User Queue)
  // ===========================

  /**
   * Get all tasks assigned to the current user
   * GET /api/risk-tasks/my-tasks
   */
  @Get('my-tasks')
  async getMyTasks(
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
    @Query('status') status?: string,
    @Query('taskType') taskType?: string,
    @Query('priority') priority?: string,
    @Query('workflowStage') workflowStage?: string,
    @Query('overdue') overdue?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: RiskWorkflowTaskFilterDto = {
      status,
      taskType,
      priority,
      workflowStage,
      overdue: overdue === 'true',
    };

    return this.tasksService.getMyTasks(
      userId,
      orgId,
      filters,
      parseInt(page || '1', 10),
      parseInt(limit || '25', 10),
    );
  }

  /**
   * Get task statistics for the current user
   * GET /api/risk-tasks/my-stats
   */
  @Get('my-stats')
  async getMyStats(
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.getTaskStats(orgId, userId);
  }

  // ===========================
  // Organization-wide Tasks (Admin)
  // ===========================

  /**
   * Get all tasks in the organization
   * GET /api/risk-tasks
   */
  @Get()
  async getAllTasks(
    @Headers('x-organization-id') orgId: string = 'default',
    @Query('status') status?: string,
    @Query('taskType') taskType?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('workflowStage') workflowStage?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: RiskWorkflowTaskFilterDto = {
      status,
      taskType,
      priority,
      assigneeId,
      workflowStage,
    };

    return this.tasksService.getAllTasks(
      orgId,
      filters,
      parseInt(page || '1', 10),
      parseInt(limit || '25', 10),
    );
  }

  /**
   * Get organization-wide task statistics
   * GET /api/risk-tasks/stats
   */
  @Get('stats')
  async getOrgStats(
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.tasksService.getTaskStats(orgId);
  }

  // ===========================
  // Risk-specific Tasks
  // ===========================

  /**
   * Get all tasks for a specific risk
   * GET /api/risk-tasks/risk/:riskId
   */
  @Get('risk/:riskId')
  async getTasksForRisk(
    @Param('riskId') riskId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.tasksService.getTasksForRisk(riskId, orgId);
  }

  /**
   * Create a manual task for a risk
   * POST /api/risk-tasks/risk/:riskId
   */
  @Post('risk/:riskId')
  async createTask(
    @Param('riskId') riskId: string,
    @Body() dto: CreateRiskWorkflowTaskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.createTask(riskId, orgId, dto, userId);
  }

  // ===========================
  // Single Task Operations
  // ===========================

  /**
   * Get a single task by ID
   * GET /api/risk-tasks/:taskId
   */
  @Get(':taskId')
  async getTask(
    @Param('taskId') taskId: string,
    @Headers('x-organization-id') orgId: string = 'default',
  ) {
    return this.tasksService.getTask(taskId, orgId);
  }

  /**
   * Update a task
   * PUT /api/risk-tasks/:taskId
   */
  @Put(':taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateRiskWorkflowTaskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.updateTask(taskId, orgId, dto, userId);
  }

  /**
   * Start working on a task
   * POST /api/risk-tasks/:taskId/start
   */
  @Post(':taskId/start')
  async startTask(
    @Param('taskId') taskId: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.startTask(taskId, orgId, userId);
  }

  /**
   * Complete a task
   * POST /api/risk-tasks/:taskId/complete
   */
  @Post(':taskId/complete')
  async completeTask(
    @Param('taskId') taskId: string,
    @Body() dto: CompleteTaskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.completeTask(taskId, orgId, dto, userId);
  }

  /**
   * Reassign a task to another user
   * POST /api/risk-tasks/:taskId/reassign
   */
  @Post(':taskId/reassign')
  async reassignTask(
    @Param('taskId') taskId: string,
    @Body() dto: ReassignTaskDto,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.reassignTask(taskId, orgId, dto, userId);
  }

  /**
   * Cancel a task
   * POST /api/risk-tasks/:taskId/cancel
   */
  @Post(':taskId/cancel')
  async cancelTask(
    @Param('taskId') taskId: string,
    @Body('reason') reason: string,
    @Headers('x-organization-id') orgId: string = 'default',
    @Headers('x-user-id') userId: string = 'system',
  ) {
    return this.tasksService.cancelTask(taskId, orgId, reason, userId);
  }
}
