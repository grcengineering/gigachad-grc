import { useEffect, useRef, useState } from 'react';
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
  twoFactorEnabled: boolean | null;
  identity: {
    accountConsoleAvailable: boolean;
    passwordApiAvailable: boolean;
    totpApiAvailable: boolean;
    sessionsApiAvailable: boolean;
    accountUrl: string | null;
  };
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
  const [timezone, setTimezone] = useState(me.timezone || 'UTC');
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(me.name);
    setTimezone(me.timezone || 'UTC');
  }, [me]);

  const updateProfile = useMutation({
    mutationFn: async (payload: { name: string; timezone: string }) => {
      const res = await api.put('/api/me', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/api/me/avatar', formData);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const initials = (me.name || me.email || '?').charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="flex items-center gap-4">
          {me.avatarUrl ? (
            <img
              src={me.avatarUrl}
              alt={`${me.name} avatar`}
              className="h-16 w-16 rounded-full object-cover border border-surface-200"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-h2 font-semibold">
              {initials}
            </div>
          )}
          <input
            ref={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadAvatar.mutate(file);
              event.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploadAvatar.isPending}
            onClick={() => avatarInput.current?.click()}
          >
            Change avatar
          </Button>
        </div>
        {uploadAvatar.isError && (
          <p className="text-small text-red-700">
            Avatar upload failed. Use a JPEG, PNG, or WebP image under 2 MB.
          </p>
        )}

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
            <Input id="acct-email" value={me.email} disabled />
            <p className="text-xs text-surface-500 mt-1">
              Email is managed by your identity provider.
            </p>
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
            onClick={() => updateProfile.mutate({ name, timezone })}
            loading={updateProfile.isPending}
            disabled={!name.trim()}
          >
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PasswordPanel({ me }: { me: MeResponse }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changePassword = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const res = await api.post('/api/me/password', payload);
      return res.data as { status: string; setupUrl?: string; message?: string };
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
    if (next.length < 12) {
      setError('New password must be at least 12 characters.');
      return;
    }
    setError(null);
    changePassword.mutate({ currentPassword: current, newPassword: next });
  };

  if (!me.identity.passwordApiAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-small text-surface-600">
            Passwords are managed by your identity provider and are never stored by GigaChad GRC.
          </p>
          {me.identity.accountConsoleAvailable && me.identity.accountUrl ? (
            <a href={me.identity.accountUrl} target="_blank" rel="noreferrer">
              <Button>Open identity provider</Button>
            </a>
          ) : (
            <Badge variant="warning">Identity provider unavailable</Badge>
          )}
        </CardBody>
      </Card>
    );
  }

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
  const [showDisable, setShowDisable] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');

  const status = useQuery<{
    enabled: boolean | null;
    status: 'available' | 'provider_managed' | 'unavailable';
    setupUrl: string | null;
  }>({
    queryKey: ['me', 'totp'],
    queryFn: async () => {
      const response = await api.get('/api/me/totp');
      return response.data;
    },
  });

  const setup = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/me/totp/setup');
      return response.data as { status: string; setupUrl?: string };
    },
    onSuccess: (result) => {
      if (result.setupUrl) window.open(result.setupUrl, '_blank', 'noopener,noreferrer');
      queryClient.invalidateQueries({ queryKey: ['me', 'totp'] });
    },
  });

  const disable = useMutation({
    mutationFn: async () => {
      const response = await api.delete('/api/me/totp', {
        data: { currentPassword },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'totp'] });
      setShowDisable(false);
      setCurrentPassword('');
    },
  });

  if (status.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (status.isError || !status.data) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Two-factor status unavailable"
            description="The identity provider could not be reached. Try again later."
          />
        </CardBody>
      </Card>
    );
  }

  const enabled = status.data.enabled;

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
                {enabled === true ? (
                  <Badge variant="success">Enabled</Badge>
                ) : enabled === false ? (
                  <Badge variant="neutral">Disabled</Badge>
                ) : (
                  <Badge variant="warning">Managed by provider</Badge>
                )}
              </p>
              <p className="text-small text-surface-600 mt-1">
                Add a second factor to your account using an authenticator app.
              </p>
            </div>
            {enabled === true && me.identity.totpApiAvailable ? (
              <Button variant="danger" onClick={() => setShowDisable(true)}>
                Disable 2FA
              </Button>
            ) : status.data.setupUrl && status.data.status === 'provider_managed' ? (
              <a href={status.data.setupUrl} target="_blank" rel="noreferrer">
                <Button>Manage with identity provider</Button>
              </a>
            ) : enabled === false ? (
              <Button onClick={() => setup.mutate()} loading={setup.isPending}>
                Enable 2FA
              </Button>
            ) : (
              <Badge variant="warning">Setup unavailable</Badge>
            )}
          </div>
          {(setup.isError || disable.isError) && (
            <p className="text-small text-red-700">
              The identity provider could not complete that request.
            </p>
          )}
        </CardBody>
      </Card>

      <Dialog
        open={showDisable}
        onClose={() => {
          setShowDisable(false);
          setCurrentPassword('');
        }}
        title="Disable two-factor authentication"
        description="Confirm your password before removing authenticator credentials."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDisable(false);
                setCurrentPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => disable.mutate()}
              loading={disable.isPending}
              disabled={!currentPassword}
            >
              Disable 2FA
            </Button>
          </>
        }
      >
        <Label htmlFor="totp-current-password" required>
          Current password
        </Label>
        <Input
          id="totp-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
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
      return res.data as { id: string; key: string };
    },
    onSuccess: (data) => {
      setCreatedSecret(data.key);
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
      const res = await api.put('/api/me/notifications', {
        preferences: payload.map((preference) => ({
          notificationType: preference.key,
          email: preference.email,
          inApp: preference.inApp,
        })),
      });
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
        {save.isSuccess && <p className="text-small text-brand-700">Preferences saved.</p>}
        {save.isError && (
          <p className="text-small text-red-700">Could not save notification preferences.</p>
        )}
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

interface AccountSession {
  id: string;
  ipAddress: string;
  startedAt: string | null;
  lastAccessAt: string | null;
  clients: string[];
}

function SessionsPanel() {
  const queryClient = useQueryClient();
  const sessions = useQuery<{
    status: 'available' | 'provider_managed' | 'unavailable';
    sessions: AccountSession[];
    manageUrl: string | null;
  }>({
    queryKey: ['me', 'sessions'],
    queryFn: async () => {
      const response = await api.get('/api/me/sessions');
      return response.data;
    },
  });
  const revoke = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/api/me/sessions/${sessionId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'sessions'] }),
  });

  if (sessions.isLoading) return <Skeleton className="h-48 w-full" />;
  if (sessions.isError || !sessions.data) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="Sessions unavailable"
            description="The identity provider could not be reached."
          />
        </CardBody>
      </Card>
    );
  }

  if (sessions.data.status !== 'available') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-small text-surface-600">
            Session details are managed by your identity provider and are not mirrored locally.
          </p>
          {sessions.data.manageUrl ? (
            <a href={sessions.data.manageUrl} target="_blank" rel="noreferrer">
              <Button>Manage provider sessions</Button>
            </a>
          ) : (
            <Badge variant="warning">Identity provider unavailable</Badge>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active sessions</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {revoke.isError && (
          <p className="text-small text-red-700">Could not revoke that session.</p>
        )}
        {sessions.data.sessions.length === 0 ? (
          <EmptyState
            title="No provider sessions reported"
            description="The identity provider did not return any active sessions."
          />
        ) : (
          sessions.data.sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between gap-4 rounded-md border border-surface-200 p-4"
            >
              <div>
                <p className="text-body text-surface-900">
                  {session.clients.join(', ') || 'Identity provider session'}
                </p>
                <p className="text-small text-surface-600">
                  {session.ipAddress} · Last active {formatDate(session.lastAccessAt)}
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                loading={revoke.isPending && revoke.variables === session.id}
                onClick={() => revoke.mutate(session.id)}
              >
                Revoke
              </Button>
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
          { label: 'Password', content: <PasswordPanel me={data} /> },
          { label: '2FA', content: <TwoFactorPanel me={data} /> },
          { label: 'Sessions', content: <SessionsPanel /> },
          { label: 'API Keys', content: <ApiKeysPanel me={data} /> },
          { label: 'Notifications', content: <NotificationsPanel me={data} /> },
        ]}
      />
    </div>
  );
}
