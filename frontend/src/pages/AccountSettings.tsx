import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Skeleton,
  Tabs,
  type DataTableColumn,
} from '@/components/ui';
import api from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopes: string[];
}

interface NotificationPref {
  key: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  timezone: string;
  twoFactorEnabled: boolean;
  apiKeys: ApiKey[];
  notifications: NotificationPref[];
}

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (America/New_York)' },
  { value: 'America/Chicago', label: 'Central (America/Chicago)' },
  { value: 'America/Denver', label: 'Mountain (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific (America/Los_Angeles)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function ProfilePanel({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [timezone, setTimezone] = useState(me.timezone || 'UTC');

  useEffect(() => {
    setName(me.name);
    setEmail(me.email);
    setTimezone(me.timezone || 'UTC');
  }, [me]);

  const updateProfile = useMutation({
    mutationFn: async (payload: { name: string; email: string; timezone: string }) => {
      const res = await api.put('/api/me', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const initials = (me.name || me.email || '?').charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-h2 font-semibold">
            {initials}
          </div>
          <Button variant="secondary" size="sm">
            Change avatar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="acct-name" required>
              Full name
            </Label>
            <Input
              id="acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="acct-email" required>
              Email
            </Label>
            <Input
              id="acct-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="acct-role">Role</Label>
            <Input id="acct-role" value={me.role} disabled />
          </div>
          <div>
            <Label htmlFor="acct-tz">Timezone</Label>
            <Select value={timezone} onChange={setTimezone} options={TIMEZONE_OPTIONS} searchable />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {updateProfile.isSuccess && (
            <span className="text-small text-brand-700">Profile saved.</span>
          )}
          {updateProfile.isError && (
            <span className="text-small text-red-700">Failed to save profile.</span>
          )}
          <Button
            onClick={() => updateProfile.mutate({ name, email, timezone })}
            loading={updateProfile.isPending}
          >
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PasswordPanel() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await api.post('/api/me/password', payload);
      return res.data;
    },
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
      setError(null);
    },
  });

  const handleSubmit = () => {
    if (!current || !next) {
      setError('Current and new password are required.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setError(null);
    changePassword.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="acct-pw-current" required>
            Current password
          </Label>
          <Input
            id="acct-pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div>
          <Label htmlFor="acct-pw-new" required>
            New password
          </Label>
          <Input
            id="acct-pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="acct-pw-confirm" required>
            Confirm new password
          </Label>
          <Input
            id="acct-pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-small text-red-700">{error}</p>}
        {changePassword.isSuccess && <p className="text-small text-brand-700">Password updated.</p>}
        {changePassword.isError && (
          <p className="text-small text-red-700">Failed to update password.</p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSubmit} loading={changePassword.isPending}>
            Change password
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function TwoFactorPanel({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [showEnable, setShowEnable] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const toggle = useMutation({
    mutationFn: async (enable: boolean) => {
      const res = await api.post('/api/me/2fa', { enable });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setShowEnable(false);
      setShowDisable(false);
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-body text-surface-900">
                Status:{' '}
                {me.twoFactorEnabled ? (
                  <Badge variant="success">Enabled</Badge>
                ) : (
                  <Badge variant="neutral">Disabled</Badge>
                )}
              </p>
              <p className="text-small text-surface-600 mt-1">
                Add a second factor to your account using an authenticator app.
              </p>
            </div>
            {me.twoFactorEnabled ? (
              <Button variant="danger" onClick={() => setShowDisable(true)}>
                Disable 2FA
              </Button>
            ) : (
              <Button onClick={() => setShowEnable(true)}>Enable 2FA</Button>
            )}
          </div>
        </CardBody>
      </Card>

      <Dialog
        open={showEnable}
        onClose={() => setShowEnable(false)}
        title="Enable two-factor authentication"
        description="Scan the QR code in your authenticator app to enable 2FA."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEnable(false)}>
              Cancel
            </Button>
            <Button onClick={() => toggle.mutate(true)} loading={toggle.isPending}>
              I've scanned the code
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-48 w-48 rounded-md border border-surface-300 bg-surface-50 flex items-center justify-center text-surface-500 text-small">
            QR code placeholder
          </div>
          <p className="text-small text-surface-600 text-center">
            Use an app like 1Password, Authy, or Google Authenticator.
          </p>
        </div>
      </Dialog>

      <Dialog
        open={showDisable}
        onClose={() => setShowDisable(false)}
        title="Disable two-factor authentication"
        description="Your account will only require a password to sign in."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDisable(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => toggle.mutate(false)}
              loading={toggle.isPending}
            >
              Disable 2FA
            </Button>
          </>
        }
      >
        <p className="text-small text-surface-700">
          Are you sure you want to disable two-factor authentication on your account?
        </p>
      </Dialog>
    </>
  );
}

function ApiKeysPanel({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState('read');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const createKey = useMutation({
    mutationFn: async (payload: { name: string; scopes: string[] }) => {
      const res = await api.post('/api/me/api-keys', payload);
      return res.data as { id: string; secret: string };
    },
    onSuccess: (data) => {
      setCreatedSecret(data.secret);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/me/api-keys/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const columns: DataTableColumn<ApiKey>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => <span className="text-surface-900 font-medium">{row.original.name}</span>,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Created',
      mobileLabel: 'Created',
      cell: ({ row }) => (
        <span className="text-small text-surface-700">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'lastUsedAt',
      accessorKey: 'lastUsedAt',
      header: 'Last used',
      mobileLabel: 'Last used',
      cell: ({ row }) => (
        <span className="text-small text-surface-700">{formatDate(row.original.lastUsedAt)}</span>
      ),
    },
    {
      id: 'scopes',
      accessorKey: 'scopes',
      header: 'Scopes',
      mobileLabel: 'Scopes',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.scopes.length === 0 ? (
            <span className="text-surface-500">—</span>
          ) : (
            row.original.scopes.map((s) => (
              <Badge key={s} variant="info">
                {s}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => revokeKey.mutate(row.original.id)}
            loading={revokeKey.isPending && revokeKey.variables === row.original.id}
          >
            Revoke
          </Button>
        </div>
      ),
    },
  ];

  const closeCreate = () => {
    setShowCreate(false);
    setNewName('');
    setNewScopes('read');
    setCreatedSecret(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Create API key
          </Button>
        </CardHeader>
        <CardBody>
          {me.apiKeys.length === 0 ? (
            <EmptyState
              title="No API keys yet"
              description="Create one to authenticate requests from scripts or integrations."
            />
          ) : (
            <DataTable<ApiKey> data={me.apiKeys} columns={columns} density="cozy" />
          )}
        </CardBody>
      </Card>

      <Dialog
        open={showCreate}
        onClose={closeCreate}
        title={createdSecret ? 'API key created' : 'Create API key'}
        description={
          createdSecret
            ? 'Copy this key now — it will not be shown again.'
            : 'Name the key and pick a scope.'
        }
        footer={
          createdSecret ? (
            <Button onClick={closeCreate}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeCreate}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  createKey.mutate({
                    name: newName.trim(),
                    scopes: newScopes
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                loading={createKey.isPending}
                disabled={!newName.trim()}
              >
                Create key
              </Button>
            </>
          )
        }
      >
        {createdSecret ? (
          <pre className="rounded-md border border-surface-200 bg-surface-50/40 p-3 overflow-x-auto text-xs font-mono text-surface-800">
            <code>{createdSecret}</code>
          </pre>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ak-name" required>
                Name
              </Label>
              <Input
                id="ak-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="CI deployer"
              />
            </div>
            <div>
              <Label htmlFor="ak-scopes">Scopes (comma-separated)</Label>
              <Input
                id="ak-scopes"
                value={newScopes}
                onChange={(e) => setNewScopes(e.target.value)}
                placeholder="read,write"
              />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

function NotificationsPanel({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<NotificationPref[]>(me.notifications);

  useEffect(() => {
    setPrefs(me.notifications);
  }, [me.notifications]);

  const save = useMutation({
    mutationFn: async (payload: NotificationPref[]) => {
      const res = await api.put('/api/me/notifications', { notifications: payload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const toggle = (key: string, channel: 'email' | 'inApp') => {
    setPrefs((prev) => prev.map((p) => (p.key === key ? { ...p, [channel]: !p[channel] } : p)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <Button size="sm" onClick={() => save.mutate(prefs)} loading={save.isPending}>
          Save preferences
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {prefs.length === 0 ? (
          <EmptyState
            title="No notification preferences"
            description="There are no notification types available for your account."
          />
        ) : (
          prefs.map((p) => (
            <div
              key={p.key}
              className="flex items-start justify-between gap-4 rounded-md border border-surface-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-body text-surface-900 font-medium">{p.label}</p>
                <p className="text-small text-surface-600 mt-0.5">{p.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={p.email ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => toggle(p.key, 'email')}
                >
                  Email {p.email ? 'on' : 'off'}
                </Button>
                <Button
                  variant={p.inApp ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => toggle(p.key, 'inApp')}
                >
                  In-app {p.inApp ? 'on' : 'off'}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

export default function AccountSettings() {
  const { data, isLoading, isError } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/api/me');
      return res.data as MeResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Account" description="Manage your profile, security, and preferences." />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Account" description="Manage your profile, security, and preferences." />
        <Card>
          <CardBody>
            <EmptyState
              title="Could not load your account"
              description="Please refresh the page or try again later."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Account" description="Manage your profile, security, and preferences." />
      <Tabs
        tabs={[
          { label: 'Profile', content: <ProfilePanel me={data} /> },
          { label: 'Password', content: <PasswordPanel /> },
          { label: '2FA', content: <TwoFactorPanel me={data} /> },
          { label: 'API Keys', content: <ApiKeysPanel me={data} /> },
          { label: 'Notifications', content: <NotificationsPanel me={data} /> },
        ]}
      />
    </div>
  );
}
