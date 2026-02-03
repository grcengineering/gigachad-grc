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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import {
  CreateQueueDto,
  QueueDto,
  QueueStatsDto,
  CreateJobDto,
  JobDto,
  JobStatus,
  JobListQueryDto,
  RetryJobDto,
  CreateScheduledJobDto,
  UpdateScheduledJobDto,
  ScheduledJobDto,
  JobDashboardSummaryDto,
} from './dto/job.dto';
import { Roles, RolesGuard } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

@ApiTags('Admin - Job Queue')
@ApiBearerAuth()
@UseGuards(DevAuthGuard, RolesGuard)
@Roles('admin')
@Controller('api/admin/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get job queue dashboard summary' })
  @ApiResponse({ status: 200, type: JobDashboardSummaryDto })
  async getDashboard(): Promise<JobDashboardSummaryDto> {
    return this.jobsService.getDashboardSummary();
  }

  @Get('queues')
  @ApiOperation({ summary: 'List all job queues' })
  @ApiResponse({ status: 200, type: [QueueDto] })
  async listQueues(): Promise<QueueDto[]> {
    return this.jobsService.listQueues();
  }

  @Get('queues/:id')
  @ApiOperation({ summary: 'Get a job queue by ID' })
  @ApiResponse({ status: 200, type: QueueDto })
  async getQueue(@Param('id') id: string): Promise<QueueDto> {
    return this.jobsService.getQueue(id);
  }

  @Post('queues')
  @ApiOperation({ summary: 'Create a new job queue' })
  @ApiResponse({ status: 201, type: QueueDto })
  async createQueue(@Body() dto: CreateQueueDto): Promise<QueueDto> {
    return this.jobsService.createQueue(dto);
  }

  @Post('queues/:id/pause')
  @ApiOperation({ summary: 'Pause a job queue' })
  @ApiResponse({ status: 200, type: QueueDto })
  async pauseQueue(@Param('id') id: string): Promise<QueueDto> {
    return this.jobsService.pauseQueue(id);
  }

  @Post('queues/:id/resume')
  @ApiOperation({ summary: 'Resume a paused job queue' })
  @ApiResponse({ status: 200, type: QueueDto })
  async resumeQueue(@Param('id') id: string): Promise<QueueDto> {
    return this.jobsService.resumeQueue(id);
  }

  @Get('queues/:id/stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, type: QueueStatsDto })
  async getQueueStats(@Param('id') id: string): Promise<QueueStatsDto> {
    return this.jobsService.getQueueStats(id);
  }

  @Delete('queues/:id/clear')
  @ApiOperation({ summary: 'Clear jobs from a queue' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiResponse({ status: 200, description: 'Number of jobs cleared' })
  async clearQueue(
    @Param('id') id: string,
    @Query('status') status?: JobStatus,
  ): Promise<{ cleared: number }> {
    const cleared = await this.jobsService.clearQueue(id, status);
    return { cleared };
  }

  @Get('queues/:queueId/jobs')
  @ApiOperation({ summary: 'List jobs in a queue' })
  @ApiQuery({ name: 'status', enum: JobStatus, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiResponse({ status: 200, type: [JobDto] })
  async listJobs(
    @Param('queueId') queueId: string,
    @Query() query: JobListQueryDto,
  ): Promise<JobDto[]> {
    return this.jobsService.listJobs(queueId, query);
  }

  @Post('queues/:queueId/jobs')
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, type: JobDto })
  async createJob(
    @Param('queueId') queueId: string,
    @Body() dto: CreateJobDto,
  ): Promise<JobDto> {
    return this.jobsService.createJob(queueId, dto);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiResponse({ status: 200, type: JobDto })
  async getJob(@Param('id') id: string): Promise<JobDto> {
    return this.jobsService.getJob(id);
  }

  @Post('jobs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, type: JobDto })
  async retryJob(
    @Param('id') id: string,
    @Body() dto?: RetryJobDto,
  ): Promise<JobDto> {
    return this.jobsService.retryJob(id, dto);
  }

  @Post('queues/:queueId/retry-all')
  @ApiOperation({ summary: 'Retry all failed jobs in a queue' })
  @ApiResponse({ status: 200, description: 'Number of jobs queued for retry' })
  async retryAllFailed(@Param('queueId') queueId: string): Promise<{ retried: number }> {
    const retried = await this.jobsService.retryAllFailed(queueId);
    return { retried };
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Cancel a pending or delayed job' })
  @ApiResponse({ status: 200 })
  async cancelJob(@Param('id') id: string): Promise<void> {
    return this.jobsService.cancelJob(id);
  }

  @Get('queues/:queueId/scheduled')
  @ApiOperation({ summary: 'List scheduled jobs in a queue' })
  @ApiResponse({ status: 200, type: [ScheduledJobDto] })
  async listScheduledJobs(@Param('queueId') queueId: string): Promise<ScheduledJobDto[]> {
    return this.jobsService.listScheduledJobs(queueId);
  }

  @Post('queues/:queueId/scheduled')
  @ApiOperation({ summary: 'Create a scheduled job' })
  @ApiResponse({ status: 201, type: ScheduledJobDto })
  async createScheduledJob(
    @Param('queueId') queueId: string,
    @Body() dto: CreateScheduledJobDto,
  ): Promise<ScheduledJobDto> {
    return this.jobsService.createScheduledJob(queueId, dto);
  }

  @Put('scheduled/:id')
  @ApiOperation({ summary: 'Update a scheduled job' })
  @ApiResponse({ status: 200, type: ScheduledJobDto })
  async updateScheduledJob(
    @Param('id') id: string,
    @Body() dto: UpdateScheduledJobDto,
  ): Promise<ScheduledJobDto> {
    return this.jobsService.updateScheduledJob(id, dto);
  }

  @Delete('scheduled/:id')
  @ApiOperation({ summary: 'Delete a scheduled job' })
  @ApiResponse({ status: 200 })
  async deleteScheduledJob(@Param('id') id: string): Promise<void> {
    return this.jobsService.deleteScheduledJob(id);
  }

  @Post('scheduled/:id/trigger')
  @ApiOperation({ summary: 'Manually trigger a scheduled job' })
  @ApiResponse({ status: 200, type: JobDto })
  async triggerScheduledJob(@Param('id') id: string): Promise<JobDto> {
    return this.jobsService.triggerScheduledJob(id);
  }
}
