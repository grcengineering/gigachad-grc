import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCalendarEventDto,
  UpdateCalendarEventDto,
  CalendarEventResponseDto,
  CalendarEventListResponseDto,
  CalendarEventFilterDto,
} from './dto/calendar-event.dto';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get all calendar events (including automated ones from policies, audits, etc.)
   */
  async findAll(
    organizationId: string,
    filters: CalendarEventFilterDto,
    workspaceId?: string,
  ): Promise<CalendarEventListResponseDto> {
    const where: any = { organizationId };

    if (workspaceId) {
      where.OR = [{ workspaceId }, { workspaceId: null }];
    }

    if (filters.startDate) {
      where.startDate = { gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      where.startDate = {
        ...where.startDate,
        lte: new Date(filters.endDate),
      };
    }

    if (filters.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    // Get custom events from database
    const customEvents = await this.prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    let allEvents = customEvents.map((e) => this.toResponseDto(e));

    // Include automated events if requested
    if (filters.includeAutomated !== false) {
      const automatedEvents = await this.getAutomatedEvents(
        organizationId,
        filters.startDate ? new Date(filters.startDate) : undefined,
        filters.endDate ? new Date(filters.endDate) : undefined,
        workspaceId,
      );
      allEvents = [...allEvents, ...automatedEvents];
    }

    // Sort by start date
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return {
      events: allEvents,
      total: allEvents.length,
    };
  }

  /**
   * Get automated events from policies, audits, controls, and contracts
   */
  private async getAutomatedEvents(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    workspaceId?: string,
  ): Promise<CalendarEventResponseDto[]> {
    const events: CalendarEventResponseDto[] = [];
    const now = new Date();
    const rangeStart = startDate || new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rangeEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 3, 0);

    // Policy reviews
    const policies = await this.prisma.policy.findMany({
      where: {
        organizationId,
        nextReviewDue: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        status: { not: 'retired' },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        nextReviewDue: true,
        ownerId: true,
      },
    });

    for (const policy of policies) {
      if (policy.nextReviewDue) {
        events.push({
          id: `policy-${policy.id}`,
          title: `Policy Review: ${policy.title}`,
          eventType: 'policy_review',
          startDate: policy.nextReviewDue,
          allDay: true,
          isRecurring: false,
          priority: this.getPriorityFromDate(policy.nextReviewDue),
          status: 'scheduled',
          entityId: policy.id,
          entityType: 'policy',
          assigneeId: policy.ownerId || undefined,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Audits
    const audits = await this.prisma.audit.findMany({
      where: {
        organizationId,
        OR: [
          {
            plannedStartDate: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          {
            plannedEndDate: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        plannedStartDate: true,
        plannedEndDate: true,
        leadAuditorId: true,
        status: true,
      },
    });

    for (const audit of audits) {
      if (audit.plannedStartDate) {
        events.push({
          id: `audit-${audit.id}`,
          title: `Audit: ${audit.name}`,
          eventType: 'audit',
          startDate: audit.plannedStartDate,
          endDate: audit.plannedEndDate || undefined,
          allDay: true,
          isRecurring: false,
          priority: 'high',
          status: audit.status === 'completed' ? 'completed' : 'scheduled',
          entityId: audit.id,
          entityType: 'audit',
          assigneeId: audit.leadAuditorId || undefined,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Control reviews (using nextTestDue from ControlImplementation)
    const implementations = await this.prisma.controlImplementation.findMany({
      where: {
        organizationId,
        nextTestDue: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        control: {
          deletedAt: null,
        },
      },
      include: {
        control: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    for (const impl of implementations) {
      if (impl.nextTestDue) {
        events.push({
          id: `control-${impl.control.id}`,
          title: `Control Review: ${impl.control.title}`,
          eventType: 'control_review',
          startDate: impl.nextTestDue,
          allDay: true,
          isRecurring: false,
          priority: this.getPriorityFromDate(impl.nextTestDue),
          status: 'scheduled',
          entityId: impl.control.id,
          entityType: 'control',
          assigneeId: impl.ownerId || undefined,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Contract expirations (using VendorContract)
    const contracts = await this.prisma.vendorContract.findMany({
      where: {
        vendor: {
          organizationId,
          deletedAt: null,
        },
        endDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const contract of contracts) {
      if (contract.endDate) {
        events.push({
          id: `contract-${contract.id}`,
          title: `Contract Expiration: ${contract.title} (${contract.vendor.name})`,
          eventType: 'contract_expiration',
          startDate: contract.endDate,
          allDay: true,
          isRecurring: false,
          priority: this.getPriorityFromDate(contract.endDate),
          status: 'scheduled',
          entityId: contract.id,
          entityType: 'contract',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return events;
  }

  /**
   * Get priority based on how soon an event is
   */
  private getPriorityFromDate(date: Date): string {
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'critical'; // Overdue
    if (daysUntil <= 7) return 'critical';
    if (daysUntil <= 14) return 'high';
    if (daysUntil <= 30) return 'medium';
    return 'low';
  }

  /**
   * Get a single calendar event by ID
   */
  async findOne(id: string, organizationId: string): Promise<CalendarEventResponseDto> {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    return this.toResponseDto(event);
  }

  /**
   * Create a new calendar event
   */
  async create(
    organizationId: string,
    dto: CreateCalendarEventDto,
    actorId: string,
    actorEmail?: string,
    workspaceId?: string,
  ): Promise<CalendarEventResponseDto> {
    const event = await this.prisma.calendarEvent.create({
      data: {
        organizationId,
        workspaceId,
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType || 'custom',
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        allDay: dto.allDay ?? true,
        isRecurring: dto.isRecurring ?? false,
        recurrenceRule: dto.recurrenceRule,
        entityId: dto.entityId,
        entityType: dto.entityType,
        assigneeId: dto.assigneeId,
        priority: dto.priority || 'medium',
        color: dto.color,
        reminders: dto.reminders ? JSON.parse(JSON.stringify(dto.reminders)) : null,
        createdBy: actorId,
      },
    });

    this.logger.log(`Created calendar event: ${event.title}`);

    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'created',
      entityType: 'calendar_event',
      entityId: event.id,
      entityName: event.title,
      description: `Created calendar event "${event.title}"`,
    });

    return this.toResponseDto(event);
  }

  /**
   * Update a calendar event
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateCalendarEventDto,
    actorId?: string,
    actorEmail?: string,
  ): Promise<CalendarEventResponseDto> {
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Calendar event not found');
    }

    const event = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        eventType: dto.eventType,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        allDay: dto.allDay,
        isRecurring: dto.isRecurring,
        recurrenceRule: dto.recurrenceRule,
        assigneeId: dto.assigneeId,
        priority: dto.priority,
        status: dto.status,
        color: dto.color,
        reminders: dto.reminders ? JSON.parse(JSON.stringify(dto.reminders)) : undefined,
      },
    });

    this.logger.log(`Updated calendar event: ${event.title}`);

    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'updated',
      entityType: 'calendar_event',
      entityId: event.id,
      entityName: event.title,
      description: `Updated calendar event "${event.title}"`,
    });

    return this.toResponseDto(event);
  }

  /**
   * Delete a calendar event
   */
  async delete(
    id: string,
    organizationId: string,
    actorId?: string,
    actorEmail?: string,
  ): Promise<void> {
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Calendar event not found');
    }

    await this.prisma.calendarEvent.delete({
      where: { id },
    });

    this.logger.log(`Deleted calendar event: ${existing.title}`);

    await this.auditService.log({
      organizationId,
      userId: actorId,
      userEmail: actorEmail,
      action: 'deleted',
      entityType: 'calendar_event',
      entityId: id,
      entityName: existing.title,
      description: `Deleted calendar event "${existing.title}"`,
    });
  }

  /**
   * Export events to iCal format
   */
  async exportIcal(
    organizationId: string,
    filters: CalendarEventFilterDto,
    workspaceId?: string,
  ): Promise<string> {
    const { events } = await this.findAll(organizationId, filters, workspaceId);

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GigaChad GRC//Compliance Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Compliance Calendar',
    ];

    for (const event of events) {
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}@gigachad-grc`);
      lines.push(`DTSTAMP:${this.formatIcalDate(new Date())}`);

      if (event.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${this.formatIcalDateOnly(startDate)}`);
        lines.push(`DTEND;VALUE=DATE:${this.formatIcalDateOnly(endDate)}`);
      } else {
        lines.push(`DTSTART:${this.formatIcalDate(startDate)}`);
        lines.push(`DTEND:${this.formatIcalDate(endDate)}`);
      }

      lines.push(`SUMMARY:${this.escapeIcalText(event.title)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeIcalText(event.description)}`);
      }

      lines.push(`CATEGORIES:${event.eventType.toUpperCase().replace('_', ' ')}`);
      lines.push(`PRIORITY:${this.getIcalPriority(event.priority)}`);

      if (event.isRecurring && event.recurrenceRule) {
        lines.push(`RRULE:${event.recurrenceRule}`);
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }

  /**
   * Format date for iCal (full datetime)
   */
  private formatIcalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  /**
   * Format date for iCal (date only)
   */
  private formatIcalDateOnly(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  /**
   * Escape text for iCal
   */
  private escapeIcalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Convert priority to iCal priority (1-9, 1 highest)
   */
  private getIcalPriority(priority: string): number {
    switch (priority) {
      case 'critical':
        return 1;
      case 'high':
        return 3;
      case 'medium':
        return 5;
      case 'low':
        return 7;
      default:
        return 5;
    }
  }

  /**
   * Convert event to response DTO
   */
  private toResponseDto(event: any): CalendarEventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description || undefined,
      eventType: event.eventType,
      startDate: event.startDate,
      endDate: event.endDate || undefined,
      allDay: event.allDay,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule || undefined,
      entityId: event.entityId || undefined,
      entityType: event.entityType || undefined,
      assigneeId: event.assigneeId || undefined,
      priority: event.priority,
      status: event.status,
      color: event.color || undefined,
      reminders: event.reminders || undefined,
      createdBy: event.createdBy,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
