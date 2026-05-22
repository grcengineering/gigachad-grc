import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  FireIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { questionnairesApi, QuestionnaireQueueItem } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

interface TrustAnalystQueueWidgetProps {
  className?: string;
}

export function TrustAnalystQueueWidget({ className }: TrustAnalystQueueWidgetProps) {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const {
    data: queue,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['questionnaire-dashboard-queue', organizationId],
    queryFn: async () => {
      const response = await questionnairesApi.getDashboardQueue(organizationId!);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
    enabled: !!organizationId,
  });

  if (!organizationId) {
    return (
      <div className={clsx('bg-white border border-surface-200 rounded-xl p-6', className)}>
        <p className="text-surface-600 text-sm">Sign in to view your questionnaire queue.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={clsx('bg-white border border-surface-200 rounded-xl p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-200 rounded w-48" />
          <div className="space-y-3">
            <div className="h-16 bg-white rounded" />
            <div className="h-16 bg-white rounded" />
            <div className="h-16 bg-white rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('bg-white border border-surface-200 rounded-xl p-6', className)}>
        <p className="text-red-600 text-sm">Failed to load queue</p>
      </div>
    );
  }

  const totalActionable =
    (queue?.summary.overdueCount || 0) +
    (queue?.summary.dueThisWeekCount || 0) +
    (queue?.summary.highPriorityCount || 0);

  return (
    <div
      className={clsx('bg-white border border-surface-200 rounded-xl overflow-hidden', className)}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-600/20 rounded-lg">
            <DocumentTextIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900">Trust Queue</h3>
            <p className="text-xs text-surface-600">Questionnaires requiring attention</p>
          </div>
        </div>
        {totalActionable > 0 && (
          <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500/20 text-red-600 text-xs font-bold rounded-full">
            {totalActionable}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-px bg-surface-200">
        <StatBox
          icon={ExclamationTriangleIcon}
          label="Overdue"
          value={queue?.summary.overdueCount || 0}
          color="red"
        />
        <StatBox
          icon={ClockIcon}
          label="This Week"
          value={queue?.summary.dueThisWeekCount || 0}
          color="amber"
        />
        <StatBox
          icon={CalendarIcon}
          label="Next Week"
          value={queue?.summary.dueNextWeekCount || 0}
          color="blue"
        />
        <StatBox
          icon={FireIcon}
          label="High Priority"
          value={queue?.summary.highPriorityCount || 0}
          color="orange"
        />
      </div>

      {/* Queue Items */}
      <div className="max-h-80 overflow-y-auto">
        {/* Overdue Section */}
        {queue?.overdue && queue.overdue.length > 0 && (
          <QueueSection
            title="Overdue"
            items={queue.overdue}
            color="red"
            icon={ExclamationTriangleIcon}
          />
        )}

        {/* Due This Week Section */}
        {queue?.dueThisWeek && queue.dueThisWeek.length > 0 && (
          <QueueSection
            title="Due This Week"
            items={queue.dueThisWeek}
            color="amber"
            icon={ClockIcon}
          />
        )}

        {/* High Priority Section */}
        {queue?.highPriority && queue.highPriority.length > 0 && (
          <QueueSection
            title="High Priority"
            items={queue.highPriority}
            color="orange"
            icon={FireIcon}
          />
        )}

        {/* Empty State */}
        {totalActionable === 0 && (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-600 text-sm">All caught up!</p>
            <p className="text-surface-500 text-xs mt-1">No urgent questionnaires</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-surface-200 bg-white/50">
        <Link
          to="/questionnaires"
          className="flex items-center justify-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          View All Questionnaires
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'red' | 'amber' | 'blue' | 'orange';
}) {
  const colorClasses = {
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
  };

  return (
    <div className="bg-white p-3 text-center">
      <div
        className={clsx('text-2xl font-bold', value > 0 ? colorClasses[color] : 'text-surface-500')}
      >
        {value}
      </div>
      <div className="flex items-center justify-center gap-1 text-xs text-surface-600 mt-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}

// Queue Section Component
function QueueSection({
  title,
  items,
  color,
  icon: Icon,
}: {
  title: string;
  items: QuestionnaireQueueItem[];
  color: 'red' | 'amber' | 'blue' | 'orange';
  icon: React.ComponentType<{ className?: string }>;
}) {
  const colorClasses = {
    red: 'text-red-600 bg-red-500/10 border-red-500/30',
    amber: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
    blue: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
    orange: 'text-orange-600 bg-orange-500/10 border-orange-500/30',
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-600',
    high: 'bg-orange-500/20 text-orange-600',
    medium: 'bg-yellow-500/20 text-yellow-600',
    low: 'bg-surface-200 text-surface-600',
  };

  return (
    <div className="border-b border-surface-200 last:border-b-0">
      <div
        className={clsx(
          'px-4 py-2 flex items-center gap-2 text-xs font-medium border-l-2',
          colorClasses[color]
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {title} ({items.length})
      </div>
      <div className="divide-y divide-surface-200">
        {items.slice(0, 3).map((item) => (
          <Link
            key={item.id}
            to={`/questionnaires/${item.id}`}
            className="block px-4 py-3 hover:bg-white/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-surface-900 truncate">
                    {item.title}
                  </span>
                  <span
                    className={clsx(
                      'px-1.5 py-0.5 text-xs rounded capitalize',
                      priorityColors[item.priority] || priorityColors.medium
                    )}
                  >
                    {item.priority}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-600">
                  <span>{item.requesterName}</span>
                  {item.company && (
                    <>
                      <span className="text-surface-600">•</span>
                      <span>{item.company}</span>
                    </>
                  )}
                </div>
                {/* Progress Bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full transition-all',
                        item.progress >= 100
                          ? 'bg-green-500'
                          : item.progress >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-surface-500 min-w-[3rem] text-right">
                    {item.answeredQuestions}/{item.totalQuestions}
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-surface-500 group-hover:text-surface-700 flex-shrink-0 mt-1" />
            </div>
            {item.dueDate && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <CalendarIcon className="w-3 h-3" />
                <span
                  className={clsx(
                    new Date(item.dueDate) < new Date() ? 'text-red-600' : 'text-surface-600'
                  )}
                >
                  Due {new Date(item.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </Link>
        ))}
        {items.length > 3 && (
          <div className="px-4 py-2 text-xs text-surface-500 text-center">
            +{items.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}
