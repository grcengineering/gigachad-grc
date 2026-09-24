import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { organizationApi, type OrganizationProfile } from '@/lib/api';
import {
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button, Input, Select, Textarea } from '@/components/ui';
import ScimSettings from '@/components/settings/ScimSettings';

const TABS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'organization', label: 'Organization', icon: BuildingOfficeIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'security', label: 'Security', icon: ShieldCheckIcon },
  { id: 'api', label: 'API Keys', icon: KeyIcon },
  { id: 'scim', label: 'SCIM', icon: ShieldCheckIcon },
  { id: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
];

function useOrganizationProfile() {
  return useQuery({
    queryKey: ['organization-profile'],
    queryFn: () => organizationApi.get().then((response) => response.data),
  });
}

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
            {TABS.filter((tab) => tab.id !== 'scim' || user?.role === 'admin').map((tab) => (
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
          {activeTab === 'scim' && <ScimSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ user }: { user: any }) {
  const { data: organization, isLoading: isOrganizationLoading } = useOrganizationProfile();

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Profile Settings</h2>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-surface-200 flex items-center justify-center">
          <span className="text-2xl font-medium text-surface-700">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Full Name</label>
          <Input value={user?.name || ''} disabled className="mt-1 opacity-50" />
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
          <Input
            value={isOrganizationLoading ? 'Loading…' : organization?.name || 'Organization'}
            disabled
            className="mt-1 opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Link to="/account">
          <Button>Manage Account</Button>
        </Link>
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
  const queryClient = useQueryClient();
  const { data: organization, isLoading, isError, refetch } = useOrganizationProfile();
  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    if (!organization) return;
    setOrgName(organization.name);
    setDescription(organization.description || '');
    setTimezone(organization.settings.timezone || 'UTC');
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: () =>
      organizationApi
        .update({
          name: orgName,
          description,
          settings: { timezone },
        })
        .then((response) => response.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<OrganizationProfile>(['organization-profile'], updated);
      toast.success('Organization settings saved');
    },
    onError: () => toast.error('Failed to save organization settings'),
  });

  if (isLoading) {
    return <div className="card p-6 text-surface-600">Loading organization settings…</div>;
  }

  if (isError) {
    return (
      <div className="card p-6 space-y-3">
        <p className="text-red-600">Unable to load organization settings.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

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
        <Button
          onClick={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
          disabled={!orgName.trim()}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Notification Preferences</h2>
      <p className="text-sm text-surface-600">
        Configure persisted in-app and email preferences on the dedicated notifications page.
      </p>
      <Link to="/settings/notifications">
        <Button>Open Notification Settings</Button>
      </Link>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Security Settings</h2>
      <p className="text-sm text-surface-600">
        Manage password changes, two-factor authentication, and persisted sessions from your
        account.
      </p>
      <Link to="/account">
        <Button variant="secondary">Open Account Security</Button>
      </Link>
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

      <p className="text-sm text-surface-600">
        Create, scope, rotate, and revoke persisted API keys from your account settings.
      </p>
      <Link to="/account">
        <Button variant="secondary" leftIcon={<KeyIcon className="w-4 h-4" />}>
          Manage API Keys
        </Button>
      </Link>
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
  const queryClient = useQueryClient();
  const { data: organization } = useOrganizationProfile();
  const { theme, setTheme } = useTheme();
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

  useEffect(() => {
    if (organization?.settings.dateFormat) {
      setDateFormat(organization.settings.dateFormat);
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: () =>
      organizationApi.update({ settings: { dateFormat } }).then((response) => response.data),
    onSuccess: (updated) => {
      queryClient.setQueryData<OrganizationProfile>(['organization-profile'], updated);
      toast.success('Appearance preferences saved');
    },
    onError: () => toast.error('Failed to save appearance preferences'),
  });

  return (
    <div className="card p-6 space-y-6">
      <h2 className="text-lg font-semibold text-surface-900">Appearance</h2>

      <div className="space-y-4">
        <div>
          <label className="label">Theme</label>
          <div className="mt-1">
            <Select
              value={theme}
              onChange={(value) => setTheme(value as Theme)}
              options={THEME_OPTIONS}
            />
          </div>
          <p className="mt-1 text-xs text-surface-500">Theme changes apply immediately.</p>
        </div>

        <div>
          <label className="label">Date Format</label>
          <div className="mt-1">
            <Select value={dateFormat} onChange={setDateFormat} options={DATE_FORMAT_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-surface-200">
        <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
