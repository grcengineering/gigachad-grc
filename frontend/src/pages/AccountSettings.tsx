import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon },
];

export default function AccountSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Account Settings</h1>
        <p className="text-surface-600 mt-1">Manage your personal preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-surface-600 hover:bg-surface-800 hover:text-surface-100'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings user={user} />}
          {activeTab === 'notifications' && <NotificationPreferences />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Profile</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center">
          <span className="text-2xl font-medium text-surface-700">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <button className="btn-secondary">Change Avatar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <input type="text" defaultValue={user?.name || ''} className="input mt-1" />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            defaultValue={user?.email || ''}
            disabled
            className="input mt-1 opacity-50"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <input
            type="text"
            value={user?.role?.replace('_', ' ') || 'Viewer'}
            disabled
            className="input mt-1 opacity-50 capitalize"
          />
        </div>
        <div>
          <label className="label">Organization</label>
          <input
            type="text"
            value="Default Organization"
            disabled
            className="input mt-1 opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-800">
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}

function NotificationPreferences() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    complianceAlerts: true,
    evidenceReminders: true,
    riskAlerts: true,
    weeklyDigest: false,
    inAppNotifications: true,
  });

  // Risk Task Notification Preferences
  const [riskTaskPrefs, setRiskTaskPrefs] = useState({
    email: true,
    inApp: true,
    slack: false,
    slackUserId: '',
    digestMode: 'immediate', // immediate, daily_digest, weekly_digest
    timezone: 'UTC',
  });

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRiskTaskPref = (key: 'email' | 'inApp' | 'slack') => {
    setRiskTaskPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Risk Task Notifications - New Section */}
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-surface-100">
            Risk Workflow Task Notifications
          </h2>
          <p className="text-surface-600 text-sm mt-1">
            Choose how you want to be notified when tasks are assigned to you or completed.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-surface-700">Notification Channels</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email */}
            <label className="flex flex-col p-4 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800 border-2 transition-colors border-transparent has-[:checked]:border-brand-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-surface-100 font-medium flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-surface-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </span>
                <input
                  type="checkbox"
                  checked={riskTaskPrefs.email}
                  onChange={() => toggleRiskTaskPref('email')}
                  className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
                />
              </div>
              <p className="text-surface-500 text-sm">Receive task notifications via email</p>
            </label>

            {/* In-App */}
            <label className="flex flex-col p-4 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800 border-2 transition-colors border-transparent has-[:checked]:border-brand-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-surface-100 font-medium flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-surface-600" />
                  In-App
                </span>
                <input
                  type="checkbox"
                  checked={riskTaskPrefs.inApp}
                  onChange={() => toggleRiskTaskPref('inApp')}
                  className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
                />
              </div>
              <p className="text-surface-500 text-sm">Show notifications in the app</p>
            </label>

            {/* Slack */}
            <label className="flex flex-col p-4 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800 border-2 transition-colors border-transparent has-[:checked]:border-brand-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-surface-100 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5 text-surface-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                  </svg>
                  Slack
                </span>
                <input
                  type="checkbox"
                  checked={riskTaskPrefs.slack}
                  onChange={() => toggleRiskTaskPref('slack')}
                  className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
                />
              </div>
              <p className="text-surface-500 text-sm">Get notifications in Slack DMs</p>
            </label>
          </div>

          {/* Slack User ID - only shown when Slack is enabled */}
          {riskTaskPrefs.slack && (
            <div className="p-4 bg-surface-800/30 rounded-lg border border-surface-700">
              <label className="label">Slack User ID</label>
              <input
                type="text"
                value={riskTaskPrefs.slackUserId}
                onChange={(e) =>
                  setRiskTaskPrefs((prev) => ({ ...prev, slackUserId: e.target.value }))
                }
                placeholder="e.g., U12345678"
                className="input mt-1 max-w-xs"
              />
              <p className="text-surface-500 text-xs mt-1">
                Find your Slack Member ID in your Slack profile settings.
              </p>
            </div>
          )}

          <h3 className="text-sm font-medium text-surface-700 pt-4">Notification Timing</h3>

          <div className="flex flex-wrap gap-3">
            {[
              {
                value: 'immediate',
                label: 'Immediate',
                desc: 'Notify as soon as tasks are assigned',
              },
              { value: 'daily_digest', label: 'Daily Digest', desc: 'Summary once per day' },
              { value: 'weekly_digest', label: 'Weekly Digest', desc: 'Summary once per week' },
            ].map((option) => (
              <label
                key={option.value}
                className={clsx(
                  'flex-1 min-w-[200px] p-3 rounded-lg cursor-pointer border-2 transition-colors',
                  riskTaskPrefs.digestMode === option.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="digestMode"
                    value={option.value}
                    checked={riskTaskPrefs.digestMode === option.value}
                    onChange={() =>
                      setRiskTaskPrefs((prev) => ({ ...prev, digestMode: option.value }))
                    }
                    className="w-4 h-4 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-surface-100 font-medium">{option.label}</span>
                </div>
                <p className="text-surface-500 text-sm mt-1 ml-6">{option.desc}</p>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button className="btn-primary">Save Task Preferences</button>
        </div>
      </div>

      {/* General Notifications */}
      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">General Notifications</h2>
        <p className="text-surface-600 text-sm">
          Choose how you want to be notified about other activity.
        </p>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-surface-700">Email Notifications</h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
              <div>
                <span className="text-surface-100 font-medium">Email Notifications</span>
                <p className="text-surface-500 text-sm">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={() => togglePreference('emailNotifications')}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
              <div>
                <span className="text-surface-100 font-medium">Compliance Alerts</span>
                <p className="text-surface-500 text-sm">
                  Get notified about compliance drift and issues
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.complianceAlerts}
                onChange={() => togglePreference('complianceAlerts')}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
              <div>
                <span className="text-surface-100 font-medium">Evidence Reminders</span>
                <p className="text-surface-500 text-sm">
                  Reminders for expiring or missing evidence
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.evidenceReminders}
                onChange={() => togglePreference('evidenceReminders')}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
              <div>
                <span className="text-surface-100 font-medium">Risk Alerts</span>
                <p className="text-surface-500 text-sm">
                  Notifications about new or escalated risks
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.riskAlerts}
                onChange={() => togglePreference('riskAlerts')}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
              <div>
                <span className="text-surface-100 font-medium">Weekly Digest</span>
                <p className="text-surface-500 text-sm">Summary of activity sent weekly</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.weeklyDigest}
                onChange={() => togglePreference('weeklyDigest')}
                className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
              />
            </label>
          </div>

          <h3 className="text-sm font-medium text-surface-700 pt-4">In-App Notifications</h3>

          <label className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg cursor-pointer hover:bg-surface-800">
            <div>
              <span className="text-surface-100 font-medium">In-App Notifications</span>
              <p className="text-surface-500 text-sm">Show notifications in the app</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.inAppNotifications}
              onChange={() => togglePreference('inAppNotifications')}
              className="w-5 h-5 rounded border-surface-600 text-brand-500 focus:ring-brand-500"
            />
          </label>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button className="btn-primary">Save Preferences</button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900">Appearance</h2>
        <p className="text-surface-600 text-sm mt-1">
          Customize how GigaChad GRC looks on your device
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Date Format</label>
          <select className="input mt-1 max-w-xs">
            <option value="YYYY-MM-DD">YYYY-MM-DD (2025-01-15)</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY (01/15/2025)</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY (15/01/2025)</option>
            <option value="MMM DD, YYYY">MMM DD, YYYY (Jan 15, 2025)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Password</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input mt-1" placeholder="Enter current password" />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input mt-1" placeholder="Enter new password" />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input mt-1" placeholder="Confirm new password" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-surface-800">
          <button className="btn-primary">Update Password</button>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Two-Factor Authentication</h2>
            <p className="text-surface-600 text-sm mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <span className="px-3 py-1 text-sm rounded-full bg-surface-700 text-surface-700">
            Not enabled
          </span>
        </div>

        <button className="btn-secondary">
          <ShieldCheckIcon className="w-5 h-5 mr-2" />
          Enable 2FA
        </button>
      </div>

      <div className="card p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-100">Active Sessions</h2>
        <p className="text-surface-600 text-sm">Manage your active sessions across devices</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-surface-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <ComputerDesktopIcon className="w-8 h-8 text-surface-600" />
              <div>
                <p className="text-surface-100 font-medium">MacOS - Chrome</p>
                <p className="text-surface-500 text-sm">Current session • Last active now</p>
              </div>
            </div>
            <span className="px-2 py-1 text-xs bg-brand-500/20 text-brand-400 rounded">
              Current
            </span>
          </div>
        </div>

        <button className="text-red-600 text-sm hover:text-red-700">
          Sign out of all other sessions
        </button>
      </div>
    </div>
  );
}
