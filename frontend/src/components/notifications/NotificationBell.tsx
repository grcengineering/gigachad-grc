import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellIcon, CheckIcon, TrashIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { notificationsApi } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const severityIcons = {
  info: '💬',
  success: '✅',
  warning: '⚠️',
  error: '🚨',
};

// Map entity types to routes
const getEntityLink = (
  entityType?: string,
  entityId?: string,
  _metadata?: Record<string, unknown>
): string | null => {
  if (!entityType || !entityId) return null;

  switch (entityType) {
    case 'control':
      return `/controls/${entityId}`;
    case 'evidence':
      return `/evidence?id=${entityId}`;
    case 'policy':
      return `/policies?id=${entityId}`;
    case 'task':
      return `/tasks`;
    case 'integration':
      return `/integrations`;
    default:
      return null;
  }
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const unreadCount = countData?.data?.count || 0;

  // Fetch notifications when dropdown is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ limit: 10, unreadOnly: false }),
    enabled: isOpen,
    refetchInterval: isOpen ? 15000 : false,
  });
  const notifications: Notification[] = notificationsData?.data?.notifications || [];

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: ({ id, markAll }: { id?: string; markAll?: boolean }) => {
      if (markAll) {
        return notificationsApi.markAsRead(undefined, true);
      }
      return notificationsApi.markOneAsRead(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate({ id: notification.id });
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors dark:bg-surface-900 dark:hover:bg-surface-800"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-5 w-5 text-brand-400" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-surface-200 z-[100] overflow-hidden dark:bg-surface-900">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-surface-200 dark:bg-surface-900">
            <h3 className="text-sm font-semibold text-surface-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markReadMutation.mutate({ markAll: true })}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckIcon className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <Link
                to="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="p-1 text-surface-600 hover:text-surface-900 rounded"
                title="Notification settings"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-surface-600">
                <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-xs">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-surface-600">
                <BellIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-surface-200">
                {notifications.map((notification) => {
                  const link = getEntityLink(
                    notification.entityType,
                    notification.entityId,
                    notification.metadata
                  );

                  const NotificationContent = (
                    <div
                      className={`p-3 hover:bg-white dark:hover:bg-surface-800 transition-colors cursor-pointer ${!notification.isRead ? 'bg-white/50 dark:bg-surface-900/50' : ''}`}
                    >
                      <div className="flex items-start space-x-2">
                        {/* Severity Icon */}
                        <span className="text-sm flex-shrink-0">
                          {severityIcons[notification.severity]}
                        </span>

                        <div className="flex-1 min-w-0">
                          {/* Title with unread indicator */}
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-xs font-medium truncate ${notification.isRead ? 'text-surface-700' : 'text-surface-900'}`}
                            >
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="ml-2 h-1.5 w-1.5 bg-brand-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>

                          {/* Message */}
                          <p className="text-xs text-surface-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Timestamp */}
                          <span className="text-[10px] text-surface-500 mt-1 block">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markReadMutation.mutate({ id: notification.id });
                              }}
                              className="p-1 text-surface-500 hover:text-green-600 rounded"
                              title="Mark as read"
                            >
                              <CheckIcon className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteMutation.mutate(notification.id);
                            }}
                            className="p-1 text-surface-500 hover:text-red-600 rounded"
                            title="Delete"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <li key={notification.id}>
                      {link ? (
                        <Link to={link} onClick={() => handleNotificationClick(notification)}>
                          {NotificationContent}
                        </Link>
                      ) : (
                        <div onClick={() => handleNotificationClick(notification)}>
                          {NotificationContent}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-3 py-2 bg-white border-t border-surface-200 text-center dark:bg-surface-900">
              <Link
                to="/settings/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                View all & settings →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
