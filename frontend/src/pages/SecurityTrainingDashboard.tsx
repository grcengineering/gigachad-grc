import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GraduationCap,
  Play,
  Award,
  Download,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/cn';
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
  StatCard,
} from '@/components/ui';

interface AssignedCourse {
  id: string;
  courseId?: string;
  title: string;
  description?: string;
  status?: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  progress?: number; // 0-100
  dueDate?: string;
  startUrl?: string;
}

interface EarnedCertificate {
  id: string;
  name: string;
  courseName?: string;
  issuedAt?: string;
  expiresAt?: string;
  pdfUrl?: string;
}

interface MyTrainingResponse {
  summary?: {
    assigned?: number;
    inProgress?: number;
    completed?: number;
    overdue?: number;
    completionPct?: number;
  };
  courses?: AssignedCourse[];
  certificates?: EarnedCertificate[];
}

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function daysUntil(value?: string): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function CompletionRing({ value, size = 132 }: { value: number; size?: number }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const stroke =
    clamped >= 80 ? 'rgb(16 185 129)' : clamped >= 50 ? 'rgb(251 191 36)' : 'rgb(239 68 68)';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(229 229 226)"
          strokeWidth={10}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-h1 text-surface-900 tabular-nums leading-none">{clamped}%</span>
        <span className="text-xs text-surface-500 uppercase tracking-wider mt-1">Complete</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'red' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const color =
    tone === 'red' ? 'bg-red-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-brand-500';
  return (
    <div className="h-1.5 w-full bg-surface-100 rounded-full overflow-hidden">
      <div
        className={cn('h-full transition-all', color)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function statusVariant(status?: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'overdue':
      return 'danger';
    case 'not_started':
      return 'warning';
    default:
      return 'neutral';
  }
}

function statusLabel(status?: string): string {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ');
}

export default function SecurityTrainingDashboard() {
  const { data, isLoading } = useQuery<MyTrainingResponse>({
    queryKey: ['training', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/training/my');
      return res.data ?? {};
    },
    staleTime: 30_000,
  });

  const summary = data?.summary ?? {};
  const courses = useMemo(() => data?.courses ?? [], [data?.courses]);
  const certificates = useMemo(() => data?.certificates ?? [], [data?.certificates]);

  const assigned = summary.assigned ?? courses.length;
  const completed =
    summary.completed ?? courses.filter((c) => c.status === 'completed').length;
  const inProgress =
    summary.inProgress ?? courses.filter((c) => c.status === 'in_progress').length;
  const overdue = summary.overdue ?? courses.filter((c) => c.status === 'overdue').length;
  const completionPct =
    summary.completionPct ?? (assigned > 0 ? Math.round((completed / assigned) * 100) : 0);

  const nextUp = useMemo(
    () =>
      courses
        .filter((c) => c.status !== 'completed')
        .sort((a, b) => {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
          return ad - bd;
        })
        .slice(0, 8),
    [courses],
  );

  const upcomingDueDates = useMemo(
    () =>
      courses
        .filter((c) => c.dueDate && c.status !== 'completed')
        .sort(
          (a, b) =>
            new Date(a.dueDate as string).getTime() - new Date(b.dueDate as string).getTime(),
        ),
    [courses],
  );

  const earnedCerts = useMemo(
    () =>
      [...certificates].sort((a, b) => {
        const at = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
        const bt = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
        return bt - at;
      }),
    [certificates],
  );

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="My Training"
          description="Your assigned security training, progress, and certificates."
        />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="My Training"
        description="Your assigned security training, progress, and certificates."
      />

      {/* Hero personal completion */}
      <Card>
        <CardBody
          density="comfy"
          className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-6">
            <CompletionRing value={completionPct} />
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider font-medium">
                Your progress
              </p>
              <p className="text-h2 text-surface-900 mt-1">
                {completed} of {assigned} completed
              </p>
              <p className="text-small text-surface-600 mt-1">
                {overdue > 0
                  ? `${overdue} ${overdue === 1 ? 'course is' : 'courses are'} overdue — finish them first.`
                  : inProgress > 0
                    ? `${inProgress} in progress. Keep going!`
                    : assigned === 0
                      ? 'No training is currently assigned to you.'
                      : 'Nice — your training is on track.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">In progress</p>
              <p className="text-h2 text-surface-900 tabular-nums">{inProgress}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Completed</p>
              <p className="text-h2 text-emerald-700 tabular-nums">{completed}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500 uppercase tracking-wider">Overdue</p>
              <p
                className={cn(
                  'text-h2 tabular-nums',
                  overdue > 0 ? 'text-red-700' : 'text-surface-900',
                )}
              >
                {overdue}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assigned"
          value={assigned}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="brand"
          caption="Across all active campaigns"
        />
        <StatCard
          label="In Progress"
          value={inProgress}
          icon={<Activity className="h-5 w-5" />}
          tone="blue"
          caption={inProgress === 1 ? '1 course started' : `${inProgress} courses started`}
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
          caption={assigned > 0 ? `${completionPct}% of total` : 'None yet'}
        />
        <StatCard
          label="Overdue"
          value={overdue}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          caption={overdue > 0 ? 'Needs attention now' : 'Nothing overdue'}
        />
      </div>

      {/* 2-col: Next up | Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Next up */}
        <Card>
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            {nextUp.length > 0 && (
              <Badge variant="info" size="sm" capitalize={false}>
                {nextUp.length} {nextUp.length === 1 ? 'course' : 'courses'}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {nextUp.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                title="You're all caught up"
                description="No outstanding training right now. New assignments will show up here."
                size="sm"
              />
            ) : (
              <div className="space-y-3">
                {nextUp.map((course) => {
                  const progress = course.progress ?? 0;
                  const isOverdue = course.status === 'overdue';
                  const isInProgress = course.status === 'in_progress';
                  const tone: 'brand' | 'amber' | 'red' = isOverdue
                    ? 'red'
                    : isInProgress
                      ? 'amber'
                      : 'brand';
                  const ctaLabel = isInProgress
                    ? 'Resume'
                    : isOverdue
                      ? 'Resume now'
                      : 'Start';
                  return (
                    <div
                      key={course.id}
                      className="rounded-md border border-surface-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-surface-900 font-medium truncate">
                              {course.title}
                            </p>
                            <Badge variant={statusVariant(course.status)} size="sm" dot>
                              {statusLabel(course.status)}
                            </Badge>
                          </div>
                          {course.description && (
                            <p className="text-xs text-surface-500 mt-0.5 truncate">
                              {course.description}
                            </p>
                          )}
                          {course.dueDate && (
                            <p
                              className={cn(
                                'text-xs mt-1 tabular-nums',
                                isOverdue ? 'text-red-700' : 'text-surface-600',
                              )}
                            >
                              Due {formatDate(course.dueDate)}
                            </p>
                          )}
                        </div>
                        {course.startUrl ? (
                          <a href={course.startUrl} target="_blank" rel="noreferrer">
                            <Button
                              size="sm"
                              variant={isOverdue ? 'danger' : 'primary'}
                              leftIcon={<Play className="h-3.5 w-3.5" />}
                            >
                              {ctaLabel}
                            </Button>
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            variant={isOverdue ? 'danger' : 'primary'}
                            leftIcon={<Play className="h-3.5 w-3.5" />}
                          >
                            {ctaLabel}
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={progress} tone={tone} />
                        </div>
                        <span className="text-xs text-surface-600 tabular-nums w-9 text-right">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Earned certificates */}
        <Card>
          <CardHeader>
            <CardTitle>Earned certificates</CardTitle>
            {earnedCerts.length > 0 && (
              <Badge variant="success" size="sm" capitalize={false}>
                {earnedCerts.length}
              </Badge>
            )}
          </CardHeader>
          <CardBody density="comfy">
            {earnedCerts.length === 0 ? (
              <EmptyState
                icon={<Award className="h-6 w-6" />}
                title="No certificates yet"
                description="Complete a course to earn your first certificate."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {earnedCerts.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 rounded-md border border-surface-200 bg-white p-3"
                  >
                    <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-700 shrink-0">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 font-medium truncate">{cert.name}</p>
                      <p className="text-xs text-surface-500 truncate">
                        {cert.courseName ? `${cert.courseName} · ` : ''}
                        Issued {formatDate(cert.issuedAt)}
                        {cert.expiresAt ? ` · Expires ${formatDate(cert.expiresAt)}` : ''}
                      </p>
                    </div>
                    {cert.pdfUrl ? (
                      <a href={cert.pdfUrl} target="_blank" rel="noreferrer" download>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Download className="h-3.5 w-3.5" />}
                        >
                          PDF
                        </Button>
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                      >
                        PDF
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Upcoming due dates */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming due dates</CardTitle>
          {upcomingDueDates.length > 0 && (
            <Badge
              variant={overdue > 0 ? 'danger' : 'warning'}
              size="sm"
              capitalize={false}
            >
              {upcomingDueDates.length}
            </Badge>
          )}
        </CardHeader>
        <CardBody density="comfy">
          {upcomingDueDates.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title="Nothing on the calendar"
              description="You don't have any training with an upcoming due date."
              size="sm"
            />
          ) : (
            <ul className="divide-y divide-surface-200">
              {upcomingDueDates.map((course) => {
                const days = daysUntil(course.dueDate);
                const isOverdue = course.status === 'overdue' || (days !== null && days < 0);
                return (
                  <li
                    key={course.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div
                      className={cn(
                        'p-2 rounded-md shrink-0',
                        isOverdue
                          ? 'bg-red-500/10 text-red-700'
                          : 'bg-amber-500/10 text-amber-700',
                      )}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-surface-900 truncate">{course.title}</p>
                      <p className="text-xs text-surface-500">
                        {isOverdue
                          ? `Overdue · was due ${formatDate(course.dueDate)}`
                          : days === 0
                            ? 'Due today'
                            : days !== null && days > 0
                              ? `Due in ${days} day${days === 1 ? '' : 's'} · ${formatDate(course.dueDate)}`
                              : `Due ${formatDate(course.dueDate)}`}
                      </p>
                    </div>
                    <Badge variant={statusVariant(course.status)} size="sm" dot>
                      {statusLabel(course.status)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
