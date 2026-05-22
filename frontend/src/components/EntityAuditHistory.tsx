import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  LinkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { auditApi } from '@/lib/api';

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
  changes?:
    | {
        before?: Record<string, any>;
        after?: Record<string, any>;
      }
    | Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
  createdAt: string;
}

interface EntityAuditHistoryProps {
  entityType: 'control' | 'evidence' | 'risk' | 'policy' | 'vendor' | 'framework';
  entityId: string;
  limit?: number;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: PlusCircleIcon,
  uploaded: ArrowUpTrayIcon,
  updated: PencilSquareIcon,
  deleted: TrashIcon,
  linked: LinkIcon,
  unlinked: LinkIcon,
  reviewed: CheckCircleIcon,
  approved: CheckCircleIcon,
  rejected: XCircleIcon,
  synced: ArrowPathIcon,
  viewed: EyeIcon,
  cloned: DocumentDuplicateIcon,
  status_changed: ArrowPathIcon,
  default: ClockIcon,
};

const ACTION_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  created: { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  uploaded: { text: 'text-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  updated: { text: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  deleted: { text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  linked: { text: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  unlinked: { text: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  reviewed: { text: 'text-teal-600', bg: 'bg-teal-500/10', border: 'border-teal-500/30' },
  approved: { text: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  rejected: { text: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  synced: { text: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  viewed: { text: 'text-surface-600', bg: 'bg-surface-500/10', border: 'border-surface-500/30' },
  default: { text: 'text-surface-600', bg: 'bg-surface-500/10', border: 'border-surface-500/30' },
};

// Fields to exclude from diff display
const EXCLUDED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'organizationId',
  'workspaceId',
  'createdBy',
  'updatedBy',
];

// Human-readable field names
const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  status: 'Status',
  category: 'Category',
  subcategory: 'Subcategory',
  tags: 'Tags',
  guidance: 'Guidance',
  controlId: 'Control ID',
  ownerId: 'Owner',
  testingFrequency: 'Testing Frequency',
  effectivenessScore: 'Effectiveness Score',
  implementationNotes: 'Implementation Notes',
  lastTestedAt: 'Last Tested',
  nextTestDue: 'Next Test Due',
  likelihood: 'Likelihood',
  impact: 'Impact',
  riskScore: 'Risk Score',
  treatment: 'Treatment',
  treatmentPlan: 'Treatment Plan',
  residualLikelihood: 'Residual Likelihood',
  residualImpact: 'Residual Impact',
  residualScore: 'Residual Score',
  priority: 'Priority',
  dueDate: 'Due Date',
  mimeType: 'File Type',
  fileSize: 'File Size',
  fileName: 'File Name',
  version: 'Version',
  approvedBy: 'Approved By',
  approvedAt: 'Approved At',
  reviewedBy: 'Reviewed By',
  reviewedAt: 'Reviewed At',
  automationSupported: 'Automation Supported',
  isCustom: 'Custom Control',
};

function formatFieldValue(value: any, fieldName: string): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Format dates
  if (fieldName.includes('At') || fieldName.includes('Date') || fieldName.includes('Due')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    } catch {
      // Not a date, return as string
    }
  }

  // Format status values
  if (fieldName === 'status') {
    const statusMap: Record<string, string> = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      implemented: 'Implemented',
      not_applicable: 'Not Applicable',
      pending_review: 'Pending Review',
      approved: 'Approved',
      rejected: 'Rejected',
      expired: 'Expired',
      draft: 'Draft',
      active: 'Active',
      archived: 'Archived',
    };
    return statusMap[value] || value;
  }

  return String(value);
}

function getChangedFields(
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined
): { field: string; oldValue: any; newValue: any }[] {
  if (!before && !after) return [];

  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    if (EXCLUDED_FIELDS.includes(key)) continue;

    const oldVal = before?.[key];
    const newVal = after?.[key];

    // Deep comparison for objects/arrays
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      changes.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

function ChangesDiff({
  changes,
}: {
  changes: { before?: Record<string, any>; after?: Record<string, any> } | Record<string, any>;
}) {
  const changedFields = getChangedFields(changes.before, changes.after);

  if (changedFields.length === 0) {
    // Check if this is a "created" action with only "after" data
    if (changes.after && !changes.before) {
      const fields = Object.entries(changes.after).filter(
        ([key]) => !EXCLUDED_FIELDS.includes(key) && changes.after[key] != null
      );

      if (fields.length === 0) return null;

      return (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Initial Values</p>
          <div className="space-y-1.5">
            {fields.slice(0, 10).map(([field, value]) => (
              <div key={field} className="flex items-start gap-2 text-sm">
                <span className="text-surface-600 min-w-[120px]">
                  {FIELD_LABELS[field] || field}:
                </span>
                <span className="text-emerald-600">{formatFieldValue(value, field)}</span>
              </div>
            ))}
            {fields.length > 10 && (
              <p className="text-xs text-surface-500 italic">+ {fields.length - 10} more fields</p>
            )}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Changes</p>
      <div className="space-y-2">
        {changedFields.map(({ field, oldValue, newValue }) => (
          <div
            key={field}
            className="flex flex-col gap-1 p-2 rounded-lg bg-white/50 border border-surface-200 dark:bg-surface-900/50"
          >
            <span className="text-xs text-surface-600 font-medium">
              {FIELD_LABELS[field] || field}
            </span>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-red-600 line-through opacity-75">
                {formatFieldValue(oldValue, field)}
              </span>
              <span className="text-surface-500">→</span>
              <span className="text-emerald-600">{formatFieldValue(newValue, field)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const action = entry.action.toLowerCase().replace(/\./g, '_');
  const ActionIcon = ACTION_ICONS[action] || ACTION_ICONS.default;
  const colors = ACTION_COLORS[action] || ACTION_COLORS.default;

  // Check if there are actual changes to show
  const changesData = entry.changes as
    | { before?: Record<string, any>; after?: Record<string, any> }
    | undefined;
  const changedFields = changesData ? getChangedFields(changesData.before, changesData.after) : [];

  // Has changes if there are field differences OR if it's a "created" action with initial values
  const hasInitialValues =
    changesData?.after &&
    !changesData?.before &&
    Object.entries(changesData.after).filter(
      ([key]) => !EXCLUDED_FIELDS.includes(key) && changesData.after![key] != null
    ).length > 0;

  const hasChanges = changedFields.length > 0 || hasInitialValues;

  const timestamp = entry.timestamp || entry.createdAt;

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-surface-200 last:hidden" />
      {/* Timeline dot */}
      <div
        className={clsx(
          'absolute left-0 w-6 h-6 rounded-full flex items-center justify-center',
          colors.bg,
          'border',
          colors.border
        )}
      >
        <ActionIcon className={clsx('w-3.5 h-3.5', colors.text)} />
      </div>
      {/* Content */}
      <div
        className={clsx(
          'bg-white rounded-lg border border-surface-200 overflow-hidden dark:bg-surface-900',
          hasChanges && 'cursor-pointer hover:border-surface-300 transition-colors'
        )}
        onClick={() => hasChanges && setIsExpanded(!isExpanded)}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={clsx('font-medium capitalize', colors.text)}>
                  {action.replace(/_/g, ' ')}
                </span>
                {entry.entityName && (
                  <span className="text-surface-700 truncate">"{entry.entityName}"</span>
                )}
              </div>

              {entry.description && (
                <p className="text-sm text-surface-600 mt-1 line-clamp-2">{entry.description}</p>
              )}

              {/* User and time */}
              <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                <div className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>{entry.userName || entry.userEmail || 'System'}</span>
                </div>
                <div
                  className="flex items-center gap-1"
                  title={format(new Date(timestamp), 'PPpp')}
                >
                  <ClockIcon className="w-3.5 h-3.5" />
                  <span>{formatDistanceToNow(new Date(timestamp), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {/* Expand button */}
            {hasChanges && (
              <button
                className="p-1 rounded hover:bg-surface-200 text-surface-600 hover:text-surface-800 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Expanded changes */}
          {isExpanded && hasChanges && <ChangesDiff changes={entry.changes!} />}
        </div>
      </div>
    </div>
  );
}

export function EntityAuditHistory({ entityType, entityId, limit = 50 }: EntityAuditHistoryProps) {
  const [filterAction, setFilterAction] = useState<string>('all');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['entity-audit', entityType, entityId, limit],
    queryFn: () => auditApi.getByEntity(entityType, entityId, limit).then((res) => res.data),
    enabled: !!entityType && !!entityId,
  });

  const entries: AuditLogEntry[] = Array.isArray(data) ? data : data?.data || data?.logs || [];

  // Filter entries by action
  const filteredEntries =
    filterAction === 'all'
      ? entries
      : entries.filter((e) => e.action.toLowerCase().includes(filterAction));

  // Get unique actions for filter dropdown
  const uniqueActions = [...new Set(entries.map((e) => e.action.toLowerCase()))];

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Failed to load history</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-brand-400 hover:text-brand-300"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Change History</h3>
          {entries.length > 0 && (
            <span className="text-xs text-surface-500 bg-white px-2 py-0.5 rounded-full dark:bg-surface-900">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          {uniqueActions.length > 1 && (
            <SelectNative
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs bg-white border border-surface-200 rounded-md text-surface-700 py-1.5 px-2 dark:bg-surface-900"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ').replace(/\./g, ' ')}
                </option>
              ))}
            </SelectNative>
          )}

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className={clsx(
              'p-1.5 rounded-md hover:bg-surface-200 text-surface-600 hover:text-white transition-colors',
              isRefetching && 'animate-spin'
            )}
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative pl-8 pb-6">
              <div className="absolute left-0 w-6 h-6 rounded-full bg-surface-200 animate-pulse" />
              <div className="bg-white rounded-lg border border-surface-200 p-4 animate-pulse dark:bg-surface-900">
                <div className="h-4 bg-surface-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-lg border border-surface-200 dark:bg-surface-900/50">
          <ClockIcon className="w-10 h-10 mx-auto text-surface-600 mb-3" />
          <p className="text-surface-600">No history recorded yet</p>
          <p className="text-surface-500 text-sm mt-1">Changes will appear here as they are made</p>
        </div>
      ) : (
        <div className="relative">
          {filteredEntries.map((entry) => (
            <AuditLogItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

export default EntityAuditHistory;
