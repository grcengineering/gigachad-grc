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
import { Button, Badge, Input, Select, Textarea } from '@/components/ui';

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
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-surface-600 mt-1">Manage your account and preferences</p>
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
                    ? 'bg-brand-600/20 text-brand-700'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
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
  const [name, setName] = useState<string>(user?.name || '');

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Profile Settings</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-200 flex items-center justify-center">
          <span className="text-2xl font-medium text-surface-700">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
        <Button variant="secondary">Change Avatar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="label">Email</label>
          <Input
            type="email"
            defaultValue={user?.email || ''}
            disabled
            className="mt-1 opacity-50"
          />
        </div>
        <div>
          <label className="label">Role</label>
          <Input
            value={user?.role?.replace('_', ' ') || 'Viewer'}
            disabled
            className="mt-1 opacity-50 capitalize"
          />
        </div>
        <div>
          <label className="label">Organization</label>
          <Input value="Default Organization" disabled className="mt-1 opacity-50" />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
];

function OrganizationSettings() {
  const [orgName, setOrgName] = useState('Default Organization');
  const [description, setDescription] = useState('Default organization for GigaChad GRC');
  const [timezone, setTimezone] = useState('UTC');

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Organization Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Organization Name</label>
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="label">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>
        <div>
          <label className="label">Timezone</label>
          <div className="mt-1">
            <Select value={timezone} onChange={setTimezone} options={TIMEZONE_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Notification Preferences</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-900">Email Notifications</p>
            <p className="text-sm text-surface-500">Receive email alerts</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-900">Slack Notifications</p>
            <p className="text-sm text-surface-500">Receive Slack alerts</p>
          </div>
          <input type="checkbox" className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-900">Compliance Drift Alerts</p>
            <p className="text-sm text-surface-500">Alert when controls fall out of compliance</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-surface-900">Evidence Expiration Reminders</p>
            <p className="text-sm text-surface-500">Remind before evidence expires</p>
          </div>
          <input type="checkbox" defaultChecked className="w-5 h-5" />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Security Settings</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-surface-800 font-medium mb-2">Two-Factor Authentication</h3>
          <p className="text-sm text-surface-500 mb-3">
            Add an extra layer of security to your account
          </p>
          <Button variant="secondary">Enable 2FA</Button>
        </div>

        <div className="pt-4 border-t border-surface-200">
          <h3 className="text-surface-800 font-medium mb-2">Active Sessions</h3>
          <p className="text-sm text-surface-500 mb-3">
            Manage your active sessions across devices
          </p>
          <div className="p-3 bg-surface-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-surface-800">Current Session</p>
              <p className="text-xs text-surface-500">Chrome on macOS • Active now</p>
            </div>
            <Badge variant="success">Current</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">API Keys</h2>
      <p className="text-sm text-surface-600">
        Generate API keys for programmatic access to the GRC platform
      </p>

      <div className="space-y-3">
        <div className="p-4 bg-surface-100 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-surface-800">Production Key</p>
            <code className="text-xs text-surface-500">grc_prod_****...****</code>
          </div>
          <Button variant="ghost" className="text-red-600 hover:text-red-700">
            Revoke
          </Button>
        </div>
      </div>

      <Button variant="secondary" leftIcon={<KeyIcon className="w-4 h-4" />}>
        Generate New Key
      </Button>
    </div>
  );
}

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
];

function AppearanceSettings() {
  const [theme, setTheme] = useState('dark');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Theme</label>
          <div className="mt-1">
            <Select value={theme} onChange={setTheme} options={THEME_OPTIONS} />
          </div>
        </div>

        <div>
          <label className="label">Date Format</label>
          <div className="mt-1">
            <Select value={dateFormat} onChange={setDateFormat} options={DATE_FORMAT_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
