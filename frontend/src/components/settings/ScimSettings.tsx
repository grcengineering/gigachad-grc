import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { Badge, Button, Input, Select } from '@/components/ui';

interface ScimConfigResponse {
  configured: boolean;
  config?: {
    provider: string;
    enabled: boolean;
    defaultRole?: string;
    lastSyncAt?: string;
    updatedAt: string;
  } | null;
}

const PROVIDERS = [
  { value: 'okta', label: 'Okta' },
  { value: 'azure_ad', label: 'Microsoft Entra ID' },
  { value: 'onelogin', label: 'OneLogin' },
  { value: 'google', label: 'Google Workspace' },
  { value: 'generic', label: 'Generic SCIM 2.0' },
];

const ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'compliance_manager', label: 'Compliance Manager' },
  { value: 'admin', label: 'Administrator' },
];

export default function ScimSettings() {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState('generic');
  const [defaultRole, setDefaultRole] = useState('viewer');
  const [newToken, setNewToken] = useState('');

  const config = useQuery<ScimConfigResponse>({
    queryKey: ['scim-config'],
    queryFn: async () => (await api.get('/api/scim-config')).data,
  });

  useEffect(() => {
    if (!config.data?.config) return;
    setProvider(config.data.config.provider);
    setDefaultRole(config.data.config.defaultRole || 'viewer');
  }, [config.data]);

  const rotate = useMutation({
    mutationFn: async () =>
      (await api.post('/api/scim-config/rotate-token', { provider, defaultRole })).data,
    onSuccess: (data) => {
      setNewToken(data.token);
      toast.success(config.data?.configured ? 'SCIM token rotated' : 'SCIM configured');
      queryClient.invalidateQueries({ queryKey: ['scim-config'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to configure SCIM'),
  });

  const toggle = useMutation({
    mutationFn: async (enabled: boolean) =>
      (await api.patch('/api/scim-config/enabled', { enabled })).data,
    onSuccess: () => {
      toast.success('SCIM configuration updated');
      queryClient.invalidateQueries({ queryKey: ['scim-config'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to update SCIM'),
  });

  const current = config.data?.config;
  const endpoint = `${window.location.origin}/scim/v2`;

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">SCIM 2.0 Provisioning</h2>
          <p className="mt-1 text-sm text-surface-500">
            Provision users and permission groups from your identity provider.
          </p>
        </div>
        <Badge variant={current?.enabled ? 'success' : 'neutral'} dot>
          {current?.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      <Input label="SCIM Base URL" value={endpoint} readOnly />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Identity Provider"
          value={provider}
          options={PROVIDERS}
          onChange={setProvider}
        />
        <Select
          label="Default Provisioned Role"
          value={defaultRole}
          options={ROLES}
          onChange={setDefaultRole}
        />
      </div>

      {newToken && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div>
            <p className="font-medium text-amber-900">Copy this token now</p>
            <p className="text-sm text-amber-800">
              For security, the plaintext token is shown only once and cannot be recovered.
            </p>
          </div>
          <div className="flex gap-2">
            <Input value={newToken} readOnly className="font-mono" />
            <Button
              variant="secondary"
              leftIcon={<Copy className="h-4 w-4" />}
              onClick={async () => {
                await navigator.clipboard.writeText(newToken);
                toast.success('SCIM token copied');
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-surface-200 pt-4">
        <Button
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => {
            if (
              !config.data?.configured ||
              window.confirm('Rotate the SCIM token? The existing token will stop working.')
            ) {
              rotate.mutate();
            }
          }}
          loading={rotate.isPending}
        >
          {config.data?.configured ? 'Rotate Token' : 'Generate Token'}
        </Button>
        {config.data?.configured && (
          <Button
            variant="secondary"
            onClick={() => toggle.mutate(!current?.enabled)}
            loading={toggle.isPending}
          >
            {current?.enabled ? 'Disable SCIM' : 'Enable SCIM'}
          </Button>
        )}
      </div>
    </div>
  );
}
