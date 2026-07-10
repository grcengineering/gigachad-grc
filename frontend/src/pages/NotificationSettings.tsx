import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellIcon,
  EnvelopeIcon,
  CheckIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { notificationsApi } from '../lib/api';
import { formatRelativeTimeFromNow } from '../lib/date';

interface NotificationPreference {
  notificationType: string;
  typeName: string;
  category: string;
  description: string;
  inApp: boolean;
  email: boolean;
}

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

const severityColors = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

const categoryIcons: Record<string, string> = {
  Controls: '🎛️',
  Evidence: '📁',
  Tasks: '✅',
  Policies: '📋',
  Integrations: '🔌',
  Collaboration: '💬',
  System: '⚙️',
};

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'settings'>('all');
  const [localPreferences, setLocalPreferences] = useState<NotificationPreference[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch all notifications
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications', 'all', activeTab],
    queryFn: () =>
      notificationsApi.list({
        limit: 50,
        unreadOnly: activeTab === 'unread',
      }),
    enabled: activeTab !== 'settings',
  });
  const notifications: Notification[] = notificationsData?.data?.notifications || [];
  const unreadCount = notificationsData?.data?.unreadCount || 0;

  // Fetch preferences
  const { data: preferencesData, isLoading: preferencesLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: activeTab === 'settings',
  });
  const preferences: NotificationPreference[] = useMemo(
    () => preferencesData?.data || [],
    [preferencesData]
  );

  // Update local preferences when fetched
  useEffect(() => {
    if (preferences.length > 0 && localPreferences.length === 0) {
      setLocalPreferences(preferences);
    }
  }, [preferences, localPreferences.length]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: (prefs: NotificationPreference[]) =>
      notificationsApi.updatePreferences(
        prefs.map((p) => ({
          notificationType: p.notificationType,
          inApp: p.inApp,
          email: p.email,
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
      setHasChanges(false);
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAsRead(undefined, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Delete single mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markOneAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handlePreferenceChange = (type: string, field: 'inApp' | 'email', value: boolean) => {
    setLocalPreferences((prev) =>
      prev.map((p) => (p.notificationType === type ? { ...p, [field]: value } : p))
    );
    setHasChanges(true);
  };

  const handleToggleAll = (field: 'inApp' | 'email', value: boolean) => {
    setLocalPreferences((prev) => prev.map((p) => ({ ...p, [field]: value })));
    setHasChanges(true);
  };

  const handleSavePreferences = () => {
    savePreferencesMutation.mutate(localPreferences);
  };

  // Group preferences by category
  const preferencesByCategory = localPreferences.reduce(
    (acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = [];
      }
      acc[pref.category].push(pref);
      return acc;
    },
    {} as Record<string, NotificationPreference[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Notifications</h1>
          <p className="text-surface-500 mt-1">
            Manage your notification preferences and view history
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab !== 'settings' && (
            <>
              <button
                onClick={() => refetch()}
                className="p-2 text-surface-500 hover:text-white hover:bg-surface-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="px-3 py-2 text-sm text-indigo-700 hover:text-indigo-800 hover:bg-surface-100 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <CheckIcon className="h-4 w-4" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all notifications?')) {
                      deleteAllMutation.mutate();
                    }
                  }}
                  className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-surface-100 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Clear all</span>
                </button>
              )}
            </>
          )}
          {activeTab === 'settings' && hasChanges && (
            <button
              onClick={handleSavePreferences}
              disabled={savePreferencesMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4" />
              <span>{savePreferencesMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-surface-500 hover:text-surface-500 hover:border-surface-300'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
              activeTab === 'unread'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-surface-500 hover:text-surface-500 hover:border-surface-300'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-surface-500 hover:text-surface-500 hover:border-surface-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'settings' ? (
        /* Preferences Settings */
        <div className="space-y-6">
          {/* Quick Toggles */}
          <div className="bg-white rounded-xl p-4 border border-surface-200">
            <h3 className="text-lg font-medium text-surface-900 mb-4">Quick Settings</h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <span className="text-surface-500 flex items-center space-x-2">
                  <BellIcon className="h-5 w-5" />
                  <span>In-App</span>
                </span>
                <button
                  onClick={() => handleToggleAll('inApp', true)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500"
                >
                  All On
                </button>
                <button
                  onClick={() => handleToggleAll('inApp', false)}
                  className="px-2 py-1 text-xs bg-surface-200 text-white rounded hover:bg-surface-300"
                >
                  All Off
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-surface-500 flex items-center space-x-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  <span>Email</span>
                </span>
                <button
                  onClick={() => handleToggleAll('email', true)}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500"
                >
                  All On
                </button>
                <button
                  onClick={() => handleToggleAll('email', false)}
                  className="px-2 py-1 text-xs bg-surface-200 text-white rounded hover:bg-surface-300"
                >
                  All Off
                </button>
              </div>
            </div>
          </div>

          {/* Preferences by Category */}
          {preferencesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-surface-500">Loading preferences...</p>
            </div>
          ) : (
            Object.entries(preferencesByCategory).map(([category, prefs]) => (
              <div
                key={category}
                className="bg-white rounded-xl border border-surface-200 overflow-hidden"
              >
                <div className="px-4 py-3 bg-white border-b border-surface-200">
                  <h3 className="text-lg font-medium text-surface-900 flex items-center space-x-2">
                    <span>{categoryIcons[category] || '📌'}</span>
                    <span>{category}</span>
                  </h3>
                </div>
                <div className="divide-y divide-surface-200">
                  {prefs.map((pref) => (
                    <div
                      key={pref.notificationType}
                      className="px-4 py-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-surface-900 font-medium">{pref.typeName}</p>
                        <p className="text-sm text-surface-500">{pref.description}</p>
                      </div>
                      <div className="flex items-center space-x-6">
                        {/* In-App Toggle */}
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <BellIcon
                            className={`h-5 w-5 ${pref.inApp ? 'text-indigo-600' : 'text-surface-600'}`}
                          />
                          <input
                            type="checkbox"
                            checked={pref.inApp}
                            onChange={(e) =>
                              handlePreferenceChange(
                                pref.notificationType,
                                'inApp',
                                e.target.checked
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`relative w-10 h-6 rounded-full transition-colors ${pref.inApp ? 'bg-indigo-600' : 'bg-surface-200'}`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${pref.inApp ? 'translate-x-4' : 'translate-x-0'}`}
                            ></div>
                          </div>
                        </label>
                        {/* Email Toggle */}
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <EnvelopeIcon
                            className={`h-5 w-5 ${pref.email ? 'text-indigo-600' : 'text-surface-600'}`}
                          />
                          <input
                            type="checkbox"
                            checked={pref.email}
                            onChange={(e) =>
                              handlePreferenceChange(
                                pref.notificationType,
                                'email',
                                e.target.checked
                              )
                            }
                            className="sr-only"
                          />
                          <div
                            className={`relative w-10 h-6 rounded-full transition-colors ${pref.email ? 'bg-indigo-600' : 'bg-surface-200'}`}
                          >
                            <div
                              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${pref.email ? 'translate-x-4' : 'translate-x-0'}`}
                            ></div>
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Email Configuration Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <EnvelopeIcon className="h-6 w-6 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-amber-700 font-medium">Email Notifications</h4>
                <p className="text-surface-500 text-sm mt-1">
                  Email notifications are currently in placeholder mode. Configure your email
                  provider in the settings to enable email delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Notifications List */
        <div className="space-y-4">
          {notificationsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-surface-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
              <BellIcon className="h-16 w-16 mx-auto text-surface-700 mb-4" />
              <h3 className="text-lg font-medium text-surface-900">No notifications</h3>
              <p className="text-surface-500 mt-1">
                {activeTab === 'unread'
                  ? "You're all caught up!"
                  : "You haven't received any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-200 overflow-hidden">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-surface-100/50 transition-colors ${!notification.isRead ? 'bg-surface-100/30' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Severity Badge */}
                      <div
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${severityColors[notification.severity]}`}
                      >
                        {notification.severity}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4
                            className={`text-sm font-medium ${notification.isRead ? 'text-surface-500' : 'text-surface-900'}`}
                          >
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-indigo-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-surface-500 mt-1">{notification.message}</p>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="text-xs text-surface-600">
                            {formatRelativeTimeFromNow(notification.createdAt)}
                          </span>
                          {notification.entityType && (
                            <span className="text-xs text-surface-600 bg-surface-100 px-2 py-0.5 rounded">
                              {notification.entityType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markReadMutation.mutate(notification.id)}
                          className="p-2 text-surface-500 hover:text-emerald-700 hover:bg-surface-100 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(notification.id)}
                        className="p-2 text-surface-500 hover:text-red-600 hover:bg-surface-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
