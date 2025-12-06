import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  { id: 'api', label: 'API Keys', icon: KeyIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
];

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Settings</h1>
        <p className="text-surface-400 mt-1">Manage your account and preferences</p>
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
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
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
          {activeTab === 'organization' && <OrganizationSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'api' && <ApiSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Profile Settings</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center">
          <span className="text-2xl font-medium text-surface-300">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <button className="btn-secondary">Change Avatar</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <input
            type="text"
            defaultValue={user?.name || ''}
            className="input mt-1"
          />
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

function OrganizationSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Organization Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Organization Name</label>
          <input
            type="text"
            defaultValue="Default Organization"
            className="input mt-1"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            defaultValue="Default organization for GigaChad GRC"
            className="input mt-1"
            rows={3}
          />
        </div>
        <div>
          <label className="label">Timezone</label>
          <select className="input mt-1">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-800">
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Notification Preferences</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-100">Email Notifications</p>
            <p className="text-sm text-surface-500">Receive email alerts</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-100">Slack Notifications</p>
            <p className="text-sm text-surface-500">Receive Slack alerts</p>
          </div>
          <input type="checkbox" className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-100">Compliance Drift Alerts</p>
            <p className="text-sm text-surface-500">Alert when controls fall out of compliance</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-100">Evidence Expiration Reminders</p>
            <p className="text-sm text-surface-500">Remind before evidence expires</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-800">
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Security Settings</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-surface-200 font-medium mb-2">Two-Factor Authentication</h3>
          <p className="text-sm text-surface-500 mb-3">
            Add an extra layer of security to your account
          </p>
          <button className="btn-secondary">Enable 2FA</button>
        </div>

        <div className="pt-4 border-t border-surface-800">
          <h3 className="text-surface-200 font-medium mb-2">Active Sessions</h3>
          <p className="text-sm text-surface-500 mb-3">
            Manage your active sessions across devices
          </p>
          <div className="p-3 bg-surface-800 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-200">Current Session</p>
              <p className="text-xs text-surface-500">Chrome on macOS • Active now</p>
            </div>
            <span className="badge badge-success">Current</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">API Keys</h2>
      <p className="text-sm text-surface-400">
        Generate API keys for programmatic access to the GRC platform
      </p>

      <div className="space-y-3">
        <div className="p-4 bg-surface-800 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-200">Production Key</p>
            <code className="text-xs text-surface-500">grc_prod_****...****</code>
          </div>
          <button className="btn-ghost text-red-400 hover:text-red-300">Revoke</button>
        </div>
      </div>

      <button className="btn-secondary">
        <KeyIcon className="w-4 h-4 mr-2" />
        Generate New Key
      </button>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-100">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Theme</label>
          <select className="input mt-1">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="label">Date Format</label>
          <select className="input mt-1">
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-800">
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}



