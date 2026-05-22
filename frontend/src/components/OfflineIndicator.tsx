import { useState } from 'react';
import {
  CloudIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useOffline } from '@/hooks/useOffline';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function OfflineIndicator({
  className,
  showDetails = false,
}: OfflineIndicatorProps) {
  const { isOnline, isSyncing, pendingCount, sync, storageStats } = useOffline();
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if online with no pending actions
  if (isOnline && pendingCount === 0 && !showDetails) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Main Indicator */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
          isOnline
            ? pendingCount > 0
              ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
              : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
            : 'bg-red-500/20 text-red-600 border border-red-500/30'
        )}
      >
        {isSyncing ? (
          <>
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Syncing...
          </>
        ) : isOnline ? (
          pendingCount > 0 ? (
            <>
              <CloudArrowUpIcon className="w-4 h-4" />
              {pendingCount} pending
            </>
          ) : (
            <>
              <CloudIcon className="w-4 h-4" />
              Online
            </>
          )
        ) : (
          <>
            <ExclamationTriangleIcon className="w-4 h-4" />
            Offline
          </>
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-surface-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-surface-200">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" />
              )}
              <span className="font-medium text-white">
                {isOnline ? 'Connected' : 'No Connection'}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-surface-600 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Status Message */}
            {!isOnline && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-xs text-red-600">
                  You're working offline. Changes will be saved locally and synced when you
                  reconnect.
                </p>
              </div>
            )}

            {/* Pending Actions */}
            {pendingCount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-surface-600">Pending Changes</span>
                  <span className="text-xs font-medium text-yellow-600">{pendingCount}</span>
                </div>
                <div className="w-full bg-white rounded-full h-1">
                  <div
                    className="bg-yellow-500 rounded-full h-1 transition-all"
                    style={{ width: `${Math.min(pendingCount * 10, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Storage Stats */}
            {storageStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg">
                  <span className="text-surface-600">Cached Items</span>
                  <div className="font-medium text-white">{storageStats.cachedItems}</div>
                </div>
                <div className="p-2 bg-white rounded-lg">
                  <span className="text-surface-600">Storage Used</span>
                  <div className="font-medium text-white">{storageStats.estimatedSize}</div>
                </div>
              </div>
            )}

            {/* Sync Button */}
            {isOnline && pendingCount > 0 && (
              <button
                onClick={sync}
                disabled={isSyncing}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isSyncing
                    ? 'bg-surface-200 text-surface-600 cursor-wait'
                    : 'bg-brand-500 hover:bg-brand-600 text-white'
                )}
              >
                {isSyncing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-4 h-4" />
                    Sync Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
