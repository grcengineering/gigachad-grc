import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('api/tasks')
@UseGuards(DevAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks or filter by entity' })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    if (entityType && entityId) {
      return this.tasksService.findByEntity(
        user.organizationId,
        entityType,
        entityId,
      );
    }
    return this.tasksService.findAll(user.organizationId, { status, priority });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get tasks assigned to current user' })
  async findMyTasks(
    @CurrentUser() user: UserContext,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findByAssignee(
      user.organizationId,
      user.userId,
      status,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  async create(
    @CurrentUser() user: UserContext,
    @Body() body: {
      entityType: string;
      entityId: string;
      title: string;
      description?: string;
      priority?: string;
      assigneeId?: string;
      dueDate?: string;
    },
  ) {
    return this.tasksService.create(
      user.organizationId,
      user.userId,
      body,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Body() body: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    },
  ) {
    return this.tasksService.update(id, user.organizationId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
  ) {
    return this.tasksService.delete(id, user.organizationId);
  }
}



