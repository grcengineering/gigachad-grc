import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi, auditsApi, controlsApi, contractsApi, calendarApi, type CalendarEvent as ApiCalendarEvent, type CreateCalendarEventData } from '@/lib/api';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  DocumentIcon,
  CalendarIcon,
  Bars3Icon,
  PlusIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// View mode types
type ViewMode = 'month' | 'week' | 'list';

// ===========================================
// Types
// ===========================================

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'policy_review' | 'audit' | 'control_review' | 'contract_expiration';
  entityId: string;
  entityType: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface ComplianceCalendarProps {
  className?: string;
  showFilters?: boolean;
}

// ===========================================
// Event Type Configuration
// ===========================================

const EVENT_CONFIG = {
  policy_review: {
    label: 'Policy Review',
    icon: DocumentTextIcon,
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    path: '/policies',
  },
  audit: {
    label: 'Audit',
    icon: ClipboardDocumentListIcon,
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
    path: '/audits',
  },
  control_review: {
    label: 'Control Review',
    icon: ShieldCheckIcon,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    path: '/controls',
  },
  contract_expiration: {
    label: 'Contract Expiration',
    icon: DocumentIcon,
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    path: '/contracts',
  },
  custom: {
    label: 'Custom Event',
    icon: CalendarIcon,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-400',
    path: '#',
  },
};

// ===========================================
// Helper Functions
// ===========================================

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isToday = (date: Date) => {
  return isSameDay(date, new Date());
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// ===========================================
// Main Component
// ===========================================

export function ComplianceCalendar({ className, showFilters = true }: ComplianceCalendarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['policy_review', 'audit', 'control_review', 'contract_expiration', 'custom']));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPriority, setNewEventPriority] = useState('medium');

  // Create custom event mutation
  const createEventMutation = useMutation({
    mutationFn: (data: CreateCalendarEventData) => calendarApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowCreateModal(false);
      setNewEventTitle('');
      setNewEventDescription('');
      setNewEventDate('');
      setNewEventPriority('medium');
      toast.success('Event created');
    },
    onError: () => toast.error('Failed to create event'),
  });

  // Fetch custom calendar events from backend
  const { data: customEventsData } = useQuery({
    queryKey: ['calendar-events', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: () => {
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();
      return calendarApi.list({ startDate, endDate, includeAutomated: false }).then((res) => res.data);
    },
  });
  const customEvents = customEventsData?.events || [];

  // iCal export handler
  const handleExportIcal = useCallback(async () => {
    try {
      const response = await calendarApi.exportIcal();
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'compliance-calendar.ics';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Calendar exported');
    } catch {
      toast.error('Failed to export calendar');
    }
  }, []);

  // Handle create event
  const handleCreateEvent = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate) return;
    createEventMutation.mutate({
      title: newEventTitle.trim(),
      description: newEventDescription.trim() || undefined,
      startDate: new Date(newEventDate).toISOString(),
      eventType: 'custom',
      priority: newEventPriority,
      allDay: true,
    });
  }, [newEventTitle, newEventDescription, newEventDate, newEventPriority, createEventMutation]);

  // Fetch data from various sources
  const { data: policiesData } = useQuery({
    queryKey: ['policies-calendar'],
    queryFn: () => policiesApi.list({ limit: 100 }).then((res) => res.data),
  });
  const policies = policiesData?.data || [];

  const { data: audits } = useQuery({
    queryKey: ['audits-calendar'],
    queryFn: () => auditsApi.list().then((res) => res.data),
  });

  const { data: controlsData } = useQuery({
    queryKey: ['controls-calendar'],
    queryFn: () => controlsApi.list({ limit: 100 }).then((res) => res.data),
  });
  const controls = controlsData?.data || [];

  const { data: contracts } = useQuery({
    queryKey: ['contracts-calendar'],
    queryFn: () => contractsApi.list().then((res) => res.data),
  });

  // Build calendar events
  const events = useMemo(() => {
    const eventList: CalendarEvent[] = [];

    // Policy review dates
    (policies || []).forEach((policy: any) => {
      if (policy.reviewDate) {
        eventList.push({
          id: `policy-${policy.id}`,
          title: `Review: ${policy.title}`,
          date: new Date(policy.reviewDate),
          type: 'policy_review',
          entityId: policy.id,
          entityType: 'policy',
          status: policy.status,
          priority: new Date(policy.reviewDate) < today ? 'critical' : 'medium',
        });
      }
    });

    // Audit dates
    (audits || []).forEach((audit: any) => {
      if (audit.plannedStartDate) {
        eventList.push({
          id: `audit-start-${audit.id}`,
          title: `Start: ${audit.name}`,
          date: new Date(audit.plannedStartDate),
          type: 'audit',
          entityId: audit.id,
          entityType: 'audit',
          status: audit.status,
          priority: 'high',
        });
      }
      if (audit.plannedEndDate) {
        eventList.push({
          id: `audit-end-${audit.id}`,
          title: `Due: ${audit.name}`,
          date: new Date(audit.plannedEndDate),
          type: 'audit',
          entityId: audit.id,
          entityType: 'audit',
          status: audit.status,
          priority: audit.status !== 'completed' ? 'critical' : 'low',
        });
      }
    });

    // Control review dates
    (controls || []).forEach((control: any) => {
      if (control.implementation?.nextReviewDate) {
        eventList.push({
          id: `control-${control.id}`,
          title: `Review: ${control.title}`,
          date: new Date(control.implementation.nextReviewDate),
          type: 'control_review',
          entityId: control.id,
          entityType: 'control',
          status: control.implementation?.status,
          priority: new Date(control.implementation.nextReviewDate) < today ? 'critical' : 'medium',
        });
      }
    });

    // Contract expiration dates
    (contracts || []).forEach((contract: any) => {
      if (contract.endDate) {
        const expirationDate = new Date(contract.endDate);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        eventList.push({
          id: `contract-${contract.id}`,
          title: `Expires: ${contract.name || contract.title}`,
          date: expirationDate,
          type: 'contract_expiration',
          entityId: contract.id,
          entityType: 'contract',
          status: contract.status,
          priority: daysUntilExpiration <= 0 ? 'critical' : daysUntilExpiration <= 30 ? 'high' : 'medium',
        });
      }
    });

    // Custom events from backend
    (customEvents || []).forEach((event: ApiCalendarEvent) => {
      eventList.push({
        id: event.id,
        title: event.title,
        date: new Date(event.startDate),
        type: 'custom' as any,
        entityId: event.id,
        entityType: 'custom',
        status: event.status,
        priority: event.priority as 'low' | 'medium' | 'high' | 'critical',
      });
    });

    return eventList.filter((e) => visibleTypes.has(e.type));
  }, [policies, audits, controls, contracts, customEvents, visibleTypes, today]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => isSameDay(event.date, date));
  };

  // Get events for the selected date
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // Get upcoming events (next 30 days)
  const upcomingEvents = useMemo(() => {
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return events
      .filter((e) => e.date >= today && e.date <= thirtyDaysFromNow)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [events, today]);

  // Calendar grid data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  const toggleEventType = (type: string) => {
    const newTypes = new Set(visibleTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setVisibleTypes(newTypes);
  };

  const handleEventClick = (event: CalendarEvent) => {
    const config = EVENT_CONFIG[event.type];
    navigate(`${config.path}/${event.entityId}`);
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* View Mode Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-surface-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('month')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm flex items-center gap-1',
              viewMode === 'month' ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm flex items-center gap-1',
              viewMode === 'week' ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'px-3 py-1.5 rounded text-sm flex items-center gap-1',
              viewMode === 'list' ? 'bg-brand-500 text-white' : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <Bars3Icon className="w-4 h-4" />
            List
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportIcal}
            className="px-3 py-1.5 text-sm text-surface-400 hover:text-surface-200 flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export iCal
          </button>
          <button
            onClick={() => {
              setNewEventDate(new Date().toISOString().split('T')[0]);
              setShowCreateModal(true);
            }}
            className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-brand-600"
          >
            <PlusIcon className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-surface-800 rounded-xl border border-surface-700 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm bg-surface-700 hover:bg-surface-600 rounded-lg text-surface-300"
              >
                Today
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-400"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-surface-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first of month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dayEvents = getEventsForDate(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              const isPast = date < today && !isTodayDate;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={clsx(
                    'aspect-square p-1 rounded-lg transition-all relative',
                    isSelected
                      ? 'bg-brand-500/20 ring-2 ring-brand-500'
                      : 'hover:bg-surface-700',
                    isTodayDate && 'bg-surface-700',
                    isPast && 'opacity-50'
                  )}
                >
                  <span
                    className={clsx(
                      'text-sm',
                      isTodayDate ? 'text-brand-400 font-bold' : 'text-surface-300'
                    )}
                  >
                    {day}
                  </span>
                  
                  {/* Event indicators */}
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, idx) => (
                        <div
                          key={idx}
                          className={clsx('w-1.5 h-1.5 rounded-full', EVENT_CONFIG[event.type].color)}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-surface-400">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Filter toggles */}
          {showFilters && (
            <div className="mt-6 pt-4 border-t border-surface-700">
              <div className="flex flex-wrap gap-2">
                {Object.entries(EVENT_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  const isActive = visibleTypes.has(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleEventType(type)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all',
                        isActive
                          ? `${config.color}/20 ${config.textColor}`
                          : 'bg-surface-700/50 text-surface-500'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
              <h3 className="font-medium text-white mb-3">{formatDate(selectedDate)}</h3>
              {selectedDateEvents.length === 0 ? (
                <p className="text-sm text-surface-500">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => {
                    const config = EVENT_CONFIG[event.type];
                    const Icon = config.icon;
                    return (
                      <button
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className="w-full text-left p-2 rounded-lg bg-surface-700/50 hover:bg-surface-700 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className={clsx('p-1 rounded', `${config.color}/20`)}>
                            <Icon className={clsx('w-4 h-4', config.textColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-100 truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-surface-500">{config.label}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-4">
            <h3 className="font-medium text-white mb-3">Upcoming (30 days)</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-surface-500">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type];
                  const Icon = config.icon;
                  const daysUntil = Math.ceil(
                    (event.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="w-full text-left p-2 rounded-lg bg-surface-700/50 hover:bg-surface-700 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className={clsx('p-1 rounded', `${config.color}/20`)}>
                          <Icon className={clsx('w-4 h-4', config.textColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-100 truncate">
                            {event.title}
                          </p>
                          <p className="text-xs text-surface-500">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Create Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-surface-400 hover:text-surface-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Event title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
                <textarea
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Priority</label>
                <select
                  value={newEventPriority}
                  onChange={(e) => setNewEventPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-surface-400 hover:text-surface-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending || !newEventTitle.trim() || !newEventDate}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceCalendar;

