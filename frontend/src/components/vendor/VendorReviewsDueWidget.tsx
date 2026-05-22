import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { vendorsApi, VendorReviewItem } from '@/lib/api';
import clsx from 'clsx';

interface VendorReviewsDueWidgetProps {
  className?: string;
}

// Tier labels for display
const TIER_LABELS: Record<string, string> = {
  tier_1: 'Tier 1',
  tier_2: 'Tier 2',
  tier_3: 'Tier 3',
  tier_4: 'Tier 4',
};

const TIER_COLORS: Record<string, string> = {
  tier_1: 'bg-red-500/20 text-red-600',
  tier_2: 'bg-orange-500/20 text-orange-600',
  tier_3: 'bg-yellow-500/20 text-yellow-600',
  tier_4: 'bg-green-500/20 text-green-600',
};

export function VendorReviewsDueWidget({ className }: VendorReviewsDueWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor-reviews-due'],
    queryFn: () => vendorsApi.getReviewsDue().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className={clsx('card p-6', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-12 bg-surface-200 rounded"></div>
            <div className="h-12 bg-surface-200 rounded"></div>
            <div className="h-12 bg-surface-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('card p-6', className)}>
        <div className="text-center text-surface-600">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2" />
          <p>Failed to load review data</p>
        </div>
      </div>
    );
  }

  const { overdue, dueThisWeek, dueThisMonth, summary } = data || {
    overdue: [],
    dueThisWeek: [],
    dueThisMonth: [],
    summary: { overdueCount: 0, dueThisWeekCount: 0, dueThisMonthCount: 0, upcomingCount: 0 },
  };

  const hasAnyReviews =
    summary.overdueCount > 0 || summary.dueThisWeekCount > 0 || summary.dueThisMonthCount > 0;

  return (
    <div className={clsx('card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-900">Vendor Reviews Due</h2>
        </div>
        <Link
          to="/vendors"
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View all <ChevronRightIcon className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div
          className={clsx(
            'p-3 rounded-lg text-center',
            summary.overdueCount > 0
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-white dark:bg-surface-900'
          )}
        >
          <p
            className={clsx(
              'text-2xl font-bold',
              summary.overdueCount > 0 ? 'text-red-600' : 'text-surface-700'
            )}
          >
            {summary.overdueCount}
          </p>
          <p className="text-xs text-surface-600">Overdue</p>
        </div>
        <div
          className={clsx(
            'p-3 rounded-lg text-center',
            summary.dueThisWeekCount > 0
              ? 'bg-orange-500/10 border border-orange-500/30'
              : 'bg-white dark:bg-surface-900'
          )}
        >
          <p
            className={clsx(
              'text-2xl font-bold',
              summary.dueThisWeekCount > 0 ? 'text-orange-600' : 'text-surface-700'
            )}
          >
            {summary.dueThisWeekCount}
          </p>
          <p className="text-xs text-surface-600">This Week</p>
        </div>
        <div
          className={clsx(
            'p-3 rounded-lg text-center',
            summary.dueThisMonthCount > 0
              ? 'bg-yellow-500/10 border border-yellow-500/30'
              : 'bg-white dark:bg-surface-900'
          )}
        >
          <p
            className={clsx(
              'text-2xl font-bold',
              summary.dueThisMonthCount > 0 ? 'text-yellow-600' : 'text-surface-700'
            )}
          >
            {summary.dueThisMonthCount}
          </p>
          <p className="text-xs text-surface-600">This Month</p>
        </div>
      </div>

      {/* Reviews List */}
      {!hasAnyReviews ? (
        <div className="text-center py-6">
          <BuildingOfficeIcon className="w-10 h-10 text-surface-600 mx-auto mb-2" />
          <p className="text-surface-600 text-sm">No reviews due</p>
          <p className="text-surface-500 text-xs mt-1">All vendor reviews are up to date</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {/* Overdue Reviews */}
          {overdue.slice(0, 3).map((vendor: VendorReviewItem) => (
            <ReviewItem
              key={vendor.id}
              vendor={vendor}
              status="overdue"
              statusText={`${vendor.daysOverdue} days overdue`}
            />
          ))}

          {/* Due This Week */}
          {dueThisWeek.slice(0, 3).map((vendor: VendorReviewItem) => (
            <ReviewItem
              key={vendor.id}
              vendor={vendor}
              status="thisWeek"
              statusText={`Due in ${vendor.daysUntilDue} days`}
            />
          ))}

          {/* Due This Month */}
          {dueThisMonth.slice(0, 2).map((vendor: VendorReviewItem) => (
            <ReviewItem
              key={vendor.id}
              vendor={vendor}
              status="thisMonth"
              statusText={`Due in ${vendor.daysUntilDue} days`}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {summary.upcomingCount > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-200 text-center">
          <p className="text-xs text-surface-600">
            {summary.upcomingCount} reviews scheduled in the next 90 days
          </p>
        </div>
      )}
    </div>
  );
}

interface ReviewItemProps {
  vendor: VendorReviewItem;
  status: 'overdue' | 'thisWeek' | 'thisMonth';
  statusText: string;
}

function ReviewItem({ vendor, status, statusText }: ReviewItemProps) {
  const statusColors = {
    overdue: 'text-red-600',
    thisWeek: 'text-orange-600',
    thisMonth: 'text-yellow-600',
  };

  const statusIcons = {
    overdue: ExclamationTriangleIcon,
    thisWeek: ClockIcon,
    thisMonth: CalendarDaysIcon,
  };

  const Icon = statusIcons[status];

  return (
    <Link
      to={`/vendors/${vendor.id}`}
      className="flex items-center justify-between p-3 bg-white/50 hover:bg-surface-200 rounded-lg transition-colors group dark:bg-surface-900/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={clsx('w-4 h-4 flex-shrink-0', statusColors[status])} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-900 truncate group-hover:text-brand-400 transition-colors">
            {vendor.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={clsx(
                'text-xs px-1.5 py-0.5 rounded',
                TIER_COLORS[vendor.tier] || 'bg-surface-200 text-surface-600'
              )}
            >
              {TIER_LABELS[vendor.tier] || vendor.tier}
            </span>
            <span className={clsx('text-xs', statusColors[status])}>{statusText}</span>
          </div>
        </div>
      </div>
      <ChevronRightIcon className="w-4 h-4 text-surface-500 group-hover:text-surface-700 flex-shrink-0" />
    </Link>
  );
}

export default VendorReviewsDueWidget;
