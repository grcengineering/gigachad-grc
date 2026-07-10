import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CpuChipIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  BoltIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  type DataTableColumn,
  Dialog,
  Input,
  Label,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui';

type ServerStatus = 'healthy' | 'degraded' | 'error' | 'unknown';
type AuthType = 'none' | 'api_key' | 'bearer' | 'oauth';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: ServerStatus;
  lastHealthCheck?: string | null;
  latencyMs?: number | null;
  authType?: AuthType;
}

interface NewServerInput {
  name: string;
  url: string;
  authType: AuthType;
  authToken: string;
}

const AUTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer token' },
  { value: 'oauth', label: 'OAuth' },
];

function statusToVariant(status: ServerStatus) {
  switch (status) {
    case 'healthy':
      return 'success' as const;
    case 'degraded':
      return 'warning' as const;
    case 'error':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

function formatTimestamp(ts?: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function formatLatency(ms?: number | null) {
  if (ms === null || ms === undefined) return '—';
  return `${ms} ms`;
}

export default function MCPSettings() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<MCPServer | null>(null);
  const [form, setForm] = useState<NewServerInput>({
    name: '',
    url: '',
    authType: 'none',
    authToken: '',
  });

  const { data: servers = [], isLoading } = useQuery<MCPServer[]>({
    queryKey: ['mcp-servers'],
    queryFn: async () => {
      const res = await api.get('/api/mcp/servers');
      const payload = res.data;
      if (Array.isArray(payload)) return payload as MCPServer[];
      if (Array.isArray(payload?.data)) return payload.data as MCPServer[];
      return [] as MCPServer[];
    },
  });

  const addMutation = useMutation({
    mutationFn: (input: NewServerInput) =>
      api.post('/api/mcp/servers', {
        name: input.name,
        url: input.url,
        authType: input.authType,
        authToken: input.authType === 'none' ? undefined : input.authToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      setAddOpen(false);
      setForm({ name: '', url: '', authType: 'none', authToken: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/mcp/servers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      setSelected(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/mcp/servers/${id}/test`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const stats = useMemo(() => {
    return {
      total: servers.length,
      healthy: servers.filter((s) => s.status === 'healthy').length,
      degraded: servers.filter((s) => s.status === 'degraded').length,
      errors: servers.filter((s) => s.status === 'error').length,
    };
  }, [servers]);

  const columns: DataTableColumn<MCPServer>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => (
        <span className="font-medium text-surface-900">{row.original.name}</span>
      ),
    },
    {
      id: 'url',
      accessorKey: 'url',
      header: 'URL',
      mobileLabel: 'URL',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-surface-700 break-all">
          {row.original.url}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusToVariant(row.original.status)} dot>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'lastHealthCheck',
      accessorKey: 'lastHealthCheck',
      header: 'Last Health Check',
      mobileLabel: 'Last Check',
      cell: ({ row }) => (
        <span className="text-surface-700">{formatTimestamp(row.original.lastHealthCheck)}</span>
      ),
    },
    {
      id: 'latency',
      accessorKey: 'latencyMs',
      header: 'Latency',
      mobileLabel: 'Latency',
      cell: ({ row }) => (
        <span className="text-surface-700 tabular-nums">{formatLatency(row.original.latencyMs)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      hideOnMobile: true,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<BoltIcon className="h-4 w-4" />}
            loading={testMutation.isPending && testMutation.variables === row.original.id}
            onClick={(e) => {
              e.stopPropagation();
              testMutation.mutate(row.original.id);
            }}
          >
            Test
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<TrashIcon className="h-4 w-4" />}
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Remove server "${row.original.name}"?`)) {
                removeMutation.mutate(row.original.id);
              }
            }}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  const canSubmit =
    form.name.trim().length > 0 &&
    form.url.trim().length > 0 &&
    (form.authType === 'none' || form.authToken.trim().length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Servers"
        description="Manage Model Context Protocol servers used by automated GRC workflows."
        actions={
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add server
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Servers"
          value={stats.total}
          tone="brand"
          icon={<CpuChipIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Healthy"
          value={stats.healthy}
          tone="emerald"
          icon={<CheckCircleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Degraded"
          value={stats.degraded}
          tone="amber"
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Errors"
          value={stats.errors}
          tone="red"
          icon={<ExclamationCircleIcon className="h-5 w-5" />}
        />
      </div>

      <DataTable
        data={servers}
        columns={columns}
        loading={isLoading}
        onRowClick={(row) => setSelected(row)}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add MCP Server"
        description="Register a new MCP server endpoint."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addMutation.isPending}
              disabled={!canSubmit}
              onClick={() => addMutation.mutate(form)}
            >
              Add server
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label required htmlFor="mcp-name">
              Name
            </Label>
            <Input
              id="mcp-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Production AWS Server"
            />
          </div>
          <div>
            <Label required htmlFor="mcp-url">
              URL
            </Label>
            <Input
              id="mcp-url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://mcp.example.com"
            />
          </div>
          <div>
            <Label htmlFor="mcp-auth">Auth type</Label>
            <Select
              value={form.authType}
              onChange={(v) => setForm({ ...form, authType: v as AuthType })}
              options={AUTH_OPTIONS}
            />
          </div>
          {form.authType !== 'none' && (
            <div>
              <Label required htmlFor="mcp-token">
                Auth token
              </Label>
              <Input
                id="mcp-token"
                type="password"
                value={form.authToken}
                onChange={(e) => setForm({ ...form, authToken: e.target.value })}
                placeholder="Enter token"
              />
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? selected.name : ''}
        description={selected?.url}
        footer={
          selected && (
            <>
              <Button
                variant="ghost"
                leftIcon={<TrashIcon className="h-4 w-4" />}
                onClick={() => {
                  if (window.confirm(`Remove server "${selected.name}"?`)) {
                    removeMutation.mutate(selected.id);
                  }
                }}
              >
                Remove
              </Button>
              <Button
                variant="secondary"
                leftIcon={<PencilSquareIcon className="h-4 w-4" />}
                disabled
              >
                Edit
              </Button>
              <Button
                leftIcon={<BoltIcon className="h-4 w-4" />}
                loading={testMutation.isPending}
                onClick={() => testMutation.mutate(selected.id)}
              >
                Test connection
              </Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <Card density="cozy" elevated={false}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-surface-500 font-medium">
                    Status
                  </p>
                  <div className="mt-1">
                    <Badge variant={statusToVariant(selected.status)} dot>
                      {selected.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-surface-500 font-medium">
                    Latency
                  </p>
                  <p className="mt-1 text-body text-surface-900 tabular-nums">
                    {formatLatency(selected.latencyMs)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-surface-500 font-medium">
                    Last Health Check
                  </p>
                  <p className="mt-1 text-body text-surface-900">
                    {formatTimestamp(selected.lastHealthCheck)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-surface-500 font-medium">
                    Server ID
                  </p>
                  <p className="mt-1 font-mono text-small text-surface-900 break-all">
                    {selected.id}
                  </p>
                </div>
              </div>
            </Card>
            <Card density="cozy" elevated={false}>
              <CardHeader className="px-0 py-0 border-b-0">
                <CardTitle>Endpoint</CardTitle>
              </CardHeader>
              <CardBody density="compact" className="px-0">
                <p className="font-mono text-small text-surface-800 break-all">{selected.url}</p>
              </CardBody>
            </Card>
          </div>
        )}
      </Dialog>
    </div>
  );
}
