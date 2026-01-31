import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsObject,
} from 'class-validator';

// ===========================================
// Enums
// ===========================================

export enum JobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
}

// ===========================================
// Queue DTOs
// ===========================================

export class CreateQueueDto {
  @ApiProperty({ description: 'Queue name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Queue description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Concurrency limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  concurrency?: number;

  @ApiPropertyOptional({ description: 'Max retries per job' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Retry delay in ms' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  retryDelay?: number;
}

export class QueueDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isPaused: boolean;

  @ApiProperty()
  concurrency: number;

  @ApiProperty()
  maxRetries: number;

  @ApiProperty()
  retryDelay: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Stats
  @ApiPropertyOptional()
  pendingCount?: number;

  @ApiPropertyOptional()
  activeCount?: number;

  @ApiPropertyOptional()
  completedCount?: number;

  @ApiPropertyOptional()
  failedCount?: number;

  @ApiPropertyOptional()
  delayedCount?: number;
}

export class QueueStatsDto {
  @ApiProperty()
  queueId: string;

  @ApiProperty()
  queueName: string;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  active: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  delayed: number;

  @ApiProperty()
  paused: boolean;
}

// ===========================================
// Job DTOs
// ===========================================

export class CreateJobDto {
  @ApiProperty({ description: 'Job name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Job data/payload' })
  @IsObject()
  data: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Job priority (higher = more important)' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional({ description: 'Delay job execution (ms)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  delay?: number;
}

export class JobDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  queueId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  data: Record<string, unknown>;

  @ApiProperty({ enum: JobStatus })
  status: JobStatus;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  attempts: number;

  @ApiProperty()
  maxAttempts: number;

  @ApiProperty()
  progress: number;

  @ApiPropertyOptional()
  result?: unknown;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  stackTrace?: string;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  failedAt?: Date;

  @ApiPropertyOptional()
  delayUntil?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class JobListQueryDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RetryJobDto {
  @ApiPropertyOptional({ description: 'Reset attempt count' })
  @IsOptional()
  @IsBoolean()
  resetAttempts?: boolean;
}

// ===========================================
// Scheduled Job DTOs
// ===========================================

export class CreateScheduledJobDto {
  @ApiProperty({ description: 'Job name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cron expression (e.g., "0 * * * *" for hourly)' })
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({ description: 'Timezone (default: UTC)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Job data/payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class UpdateScheduledJobDto {
  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Cron expression' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Job data/payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Enable/disable job' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class ScheduledJobDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  queueId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  cronExpression: string;

  @ApiProperty()
  timezone: string;

  @ApiPropertyOptional()
  data?: Record<string, unknown>;

  @ApiProperty()
  isEnabled: boolean;

  @ApiPropertyOptional()
  lastRunAt?: Date;

  @ApiPropertyOptional()
  nextRunAt?: Date;

  @ApiPropertyOptional()
  lastRunStatus?: string;

  @ApiPropertyOptional()
  lastRunError?: string;

  @ApiProperty()
  runCount: number;

  @ApiProperty()
  failCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// ===========================================
// Dashboard Summary DTO
// ===========================================

export class JobDashboardSummaryDto {
  @ApiProperty({ type: [QueueStatsDto] })
  queues: QueueStatsDto[];

  @ApiProperty()
  totalPending: number;

  @ApiProperty()
  totalActive: number;

  @ApiProperty()
  totalCompleted: number;

  @ApiProperty()
  totalFailed: number;

  @ApiProperty()
  activeScheduledJobs: number;

  @ApiProperty({ type: [JobDto], description: 'Recent failed jobs' })
  recentFailedJobs: JobDto[];

  @ApiProperty({ type: [ScheduledJobDto], description: 'Upcoming scheduled runs' })
  upcomingScheduledRuns: ScheduledJobDto[];
}
