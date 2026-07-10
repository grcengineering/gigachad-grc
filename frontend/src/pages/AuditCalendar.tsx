import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
  type BadgeVariant,
} from '@/components/ui';

type EventType = 'audit_start' | 'audit_end' | 'request_due' | 'milestone';

interface CalendarEvent {
  id: string;
  date: string;
  type: EventType;
  title: string;
  auditId?: string;
  description?: string;
}

const EVENT_VARIANT: Record<EventType, BadgeVariant> = {
  audit_start: 'brand',
  audit_end: 'success',
  request_due: 'warning',
  milestone: 'info',
};

const EVENT_LABEL: Record<EventType, string> = {
  audit_start: 'Start',
  audit_end: 'End',
  request_due: 'Due',
  milestone: 'Milestone',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function toIsoDate(d: Date) {
  // Return YYYY-MM-DD in UTC date sense
  return d.toISOString();
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseEventDate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function buildMonthGrid(year: number, month: number): Date[] {
  // 6 weeks x 7 days = 42 cells, starting from the Sunday on/before the 1st.
  const first = startOfMonth(year, month);
  const startDay = first.getDay();
  const start = new Date(year, month, 1 - startDay);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatLongDate(value: string) {
  const d = parseEventDate(value);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AuditCalendar() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const monthLabel = `${MONTH_LABELS[cursor.month]} ${cursor.year}`;

  const rangeStartIso = useMemo(
    () => toIsoDate(startOfMonth(cursor.year, cursor.month)),
    [cursor.year, cursor.month]
  );
  const rangeEndIso = useMemo(
    () => toIsoDate(endOfMonth(cursor.year, cursor.month)),
    [cursor.year, cursor.month]
  );

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['audits', 'calendar', rangeStartIso, rangeEndIso],
    queryFn: async () => {
      const res = await api.get('/api/audits/calendar', {
        params: { start: rangeStartIso, end: rangeEndIso },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60_000,
  });

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events ?? []).forEach((e) => {
      const d = parseEventDate(e.date);
      const key = dateKey(d);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    });
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const list = (events ?? []).slice();
    list.sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime());
    return list;
  }, [events]);

  const goPrev = () => {
    setCursor(({ year, month }) => {
      const m = month - 1;
      if (m < 0) return { year: year - 1, month: 11 };
      return { year, month: m };
    });
  };
  const goNext = () => {
    setCursor(({ year, month }) => {
      const m = month + 1;
      if (m > 11) return { year: year + 1, month: 0 };
      return { year, month: m };
    });
  };
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const todayKey = dateKey(today);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Calendar"
        description="Upcoming audit milestones, requests, and deadlines."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goPrev} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={goNext} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-h3 text-surface-900 tabular-nums whitespace-nowrap">
              {monthLabel}
            </span>
          </div>
        }
      />

      <Card>
        <CardBody density="cozy">
          {isLoading ? (
            <Skeleton className="h-[420px]" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-px mb-1">
                {WEEKDAYS.map((wd) => (
                  <div
                    key={wd}
                    className="text-xs font-medium text-surface-500 uppercase tracking-wider text-center py-1"
                  >
                    {wd}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-surface-200 rounded-md overflow-hidden">
                {grid.map((d, idx) => {
                  const inMonth = d.getMonth() === cursor.month;
                  const key = dateKey(d);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={idx}
                      className={`min-h-24 bg-white p-1.5 flex flex-col gap-1 ${
                        inMonth ? '' : 'bg-surface-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs tabular-nums ${
                            isToday
                              ? 'inline-flex items-center justify-center h-5 w-5 rounded-md bg-brand-600 text-white font-semibold'
                              : inMonth
                                ? 'text-surface-800 font-medium'
                                : 'text-surface-500'
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((e) => (
                          <Badge
                            key={e.id}
                            variant={EVENT_VARIANT[e.type] ?? 'neutral'}
                            size="sm"
                            capitalize={false}
                            className="block max-w-full truncate"
                            title={e.title}
                          >
                            {e.title}
                          </Badge>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs text-surface-500">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-surface-200 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-surface-500 uppercase tracking-wider font-medium">
                  Legend
                </span>
                {(Object.keys(EVENT_VARIANT) as EventType[]).map((t) => (
                  <Badge key={t} variant={EVENT_VARIANT[t]} size="sm" capitalize={false}>
                    {EVENT_LABEL[t]}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
          <Badge variant="neutral" size="sm" capitalize={false}>
            {upcoming.length}
          </Badge>
        </CardHeader>
        <CardBody density="comfy">
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon className="h-6 w-6" />}
              title="No events this month"
              description="Audit milestones and request deadlines will appear here."
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {upcoming.map((e) => {
                const content = (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-white border border-surface-200 hover:border-surface-300 transition-colors">
                    <div className="min-w-0 flex items-center gap-3">
                      <Badge
                        variant={EVENT_VARIANT[e.type] ?? 'neutral'}
                        size="sm"
                        capitalize={false}
                      >
                        {EVENT_LABEL[e.type] ?? e.type}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-surface-900 font-medium truncate">{e.title}</p>
                        {e.description && (
                          <p className="text-xs text-surface-500 truncate">{e.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-small text-surface-700 tabular-nums shrink-0">
                      {formatLongDate(e.date)}
                    </span>
                  </div>
                );
                return e.auditId ? (
                  <Link key={e.id} to={`/audits/${e.auditId}`} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={e.id}>{content}</div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
