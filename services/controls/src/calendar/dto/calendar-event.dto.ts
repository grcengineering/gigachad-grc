import { IsString, IsOptional, IsBoolean, IsDateString, IsArray, IsObject } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  eventType: string; // custom, policy_review, audit, control_review, contract_expiration

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrenceRule?: string; // RRULE format

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  reminders?: Array<{ type: string; before: number }>;
}

export class UpdateCalendarEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  allDay?: boolean;

  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @IsString()
  @IsOptional()
  recurrenceRule?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsArray()
  @IsOptional()
  reminders?: Array<{ type: string; before: number }>;
}

export class CalendarEventResponseDto {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startDate: Date;
  endDate?: Date;
  allDay: boolean;
  isRecurring: boolean;
  recurrenceRule?: string;
  entityId?: string;
  entityType?: string;
  assigneeId?: string;
  priority: string;
  status: string;
  color?: string;
  reminders?: Array<{ type: string; before: number }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarEventListResponseDto {
  events: CalendarEventResponseDto[];
  total: number;
}

export class CalendarEventFilterDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  eventType?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsBoolean()
  @IsOptional()
  includeAutomated?: boolean; // Include events from policies, audits, etc.
}
