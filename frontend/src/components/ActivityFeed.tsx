import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ExclamationTriangleIcon,
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { auditLogApi } from '@/lib/api';
import clsx from 'clsx';

import { SelectNative } from '@/components/ui/SelectNative';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  description?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: PlusCircleIcon,
  updated: PencilSquareIcon,
  deleted: TrashIcon,
  viewed: EyeIcon,
  exported: ArrowUpTrayIcon,
  approved: CheckCircleIcon,
  rejected: ExclamationTriangleIcon,
  uploaded: ArrowUpTrayIcon,
  default: ArrowPathIcon,
};

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  control: ShieldCheckIcon,
  policy: DocumentTextIcon,
  evidence: FolderOpenIcon,
  risk: ExclamationTriangleIcon,
  user: UserIcon,
  vendor: BuildingOfficeIcon,
  framework: ChartBarIcon,
  assessment: ClipboardDocumentCheckIcon,
  default: DocumentTextIcon,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-600 bg-emerald-500/10',
  updated: 'text-blue-600 bg-blue-500/10',
  deleted: 'text-red-600 bg-red-500/10',
  viewed: 'text-surface-600 bg-surface-500/10',
  exported: 'text-purple-600 bg-purple-500/10',
  approved: 'text-emerald-600 bg-emerald-500/10',
  rejected: 'text-amber-600 bg-amber-500/10',
  uploaded: 'text-cyan-600 bg-cyan-500/10',
  default: 'text-surface-600 bg-surface-500/10',
};

const ENTITY_PATHS: Record<string, string> = {
  control: '/controls',
  policy: '/policies',
  evidence: '/evidence',
  risk: '/risks',
  vendor: '/vendors',
  framework: '/frameworks',
  assessment: '/assessments',
  user: '/users',
  audit: '/audits',
};

interface ActivityFeedProps {
  limit?: number;
  entityType?: string;
  entityId?: string;
  compact?: boolean;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({
  limit = 10,
  entityType,
  entityId,
  compact = false,
  showHeader = true,
  className,
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['audit-log', { limit, entityType, entityId, filter }],
    queryFn: () =>
      auditLogApi
        .list({
          limit,
          entityType: entityType || (filter !== 'all' ? filter : undefined),
          entityId,
        })
        .then((res) => res.data),
    staleTime: 60 * 1000, // 1 minute - prevent excessive refetching
    refetchOnWindowFocus: false,
  });

  const activities: AuditLogEntry[] = data?.logs || [];

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action.toLowerCase()] || ACTION_ICONS.default;
    return Icon;
  };

  const getEntityIcon = (type: string) => {
    const Icon = ENTITY_ICONS[type.toLowerCase()] || ENTITY_ICONS.default;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return ACTION_COLORS[action.toLowerCase()] || ACTION_COLORS.default;
  };

  const getEntityPath = (type: string, id: string) => {
    const basePath = ENTITY_PATHS[type.toLowerCase()];
    if (!basePath) return null;
    return `${basePath}/${id}`;
  };

  if (isLoading) {
    return (
      <div className={clsx('bg-surface-800 rounded-xl border border-surface-700', className)}>
        {showHeader && (
          <div className="px-4 py-3 border-b border-surface-700">
            <div className="h-5 bg-surface-700 rounded w-32 animate-pulse" />
          </div>
        )}
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-surface-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-surface-700 rounded w-3/4" />
                <div className="h-3 bg-surface-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-surface-800 rounded-xl border border-surface-700', className)}>
      {showHeader && (
        <div className="px-4 py-3 border-b border-surface-700 flex items-center justify-between">
          <h3 className="font-medium text-white">Recent Activity</h3>
          <div className="flex items-center gap-2">
            {!entityType && (
              <SelectNative
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs bg-surface-700 border-surface-600 rounded-md text-surface-700 py-1 px-2"
              >
                <option value="all">All Types</option>
                <option value="control">Controls</option>
                <option value="policy">Policies</option>
                <option value="evidence">Evidence</option>
                <option value="risk">Risks</option>
                <option value="vendor">Vendors</option>
              </SelectNative>
            )}
            <button
              onClick={() => refetch()}
              className={clsx(
                'p-1.5 rounded-md hover:bg-surface-700 text-surface-600 hover:text-white transition-colors',
                isRefetching && 'animate-spin'
              )}
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {activities.length === 0 ? (
        <div className="p-8 text-center">
          <ArrowPathIcon className="w-10 h-10 mx-auto text-surface-600 mb-3" />
          <p className="text-surface-600">No recent activity</p>
          <p className="text-surface-500 text-sm mt-1">
            Activity will appear here as changes are made
          </p>
        </div>
      ) : (
        <div className={clsx('divide-y divide-surface-700', compact ? '' : 'p-2')}>
          {activities.map((activity) => {
            const ActionIcon = getActionIcon(activity.action);
            const EntityIcon = getEntityIcon(activity.entityType);
            const actionColor = getActionColor(activity.action);
            const entityPath = getEntityPath(activity.entityType, activity.entityId);

            return (
              <div
                key={activity.id}
                className={clsx(
                  'flex items-start gap-3 hover:bg-surface-700/50 transition-colors',
                  compact ? 'py-2 px-3' : 'p-3 rounded-lg'
                )}
              >
                {/* Action Icon */}
                <div className={clsx('p-1.5 rounded-lg', actionColor)}>
                  <ActionIcon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-surface-700 text-sm">
                      {activity.userName || 'System'}
                    </span>
                    <span className="text-surface-500 text-sm">
                      {activity.action.toLowerCase()}
                    </span>
                    <div className="flex items-center gap-1 text-surface-600">
                      <EntityIcon className="w-3.5 h-3.5" />
                      {entityPath ? (
                        <Link
                          to={entityPath}
                          className="text-sm text-brand-400 hover:text-brand-300 truncate max-w-[200px]"
                        >
                          {activity.entityName || activity.entityType}
                        </Link>
                      ) : (
                        <span className="text-sm truncate max-w-[200px]">
                          {activity.entityName || activity.entityType}
                        </span>
                      )}
                    </div>
                  </div>

                  {activity.description && !compact && (
                    <p className="text-surface-500 text-xs mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}

                  <p className="text-surface-600 text-xs mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activities.length > 0 && showHeader && (
        <div className="px-4 py-3 border-t border-surface-700">
          <Link to="/audit-log" className="text-sm text-brand-400 hover:text-brand-300 font-medium">
            View all activity →
          </Link>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebars
export function CompactActivityFeed({ limit = 5 }: { limit?: number }) {
  return <ActivityFeed limit={limit} compact showHeader className="bg-surface-800/50" />;
}

export default ActivityFeed;
