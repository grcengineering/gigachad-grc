import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  CpuChipIcon,
  ExclamationCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  PageHeader,
  StatCard,
  Textarea,
  type DataTableColumn,
} from '@/components/ui';

type ServerStatus = 'stopped' | 'starting' | 'running' | 'error';

interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: ServerStatus;
}

interface CredentialStatus {
  configured: boolean;
  env: Record<string, string> | null;
}

function statusToVariant(status: ServerStatus) {
  if (status === 'running') return 'success' as const;
  if (status === 'starting') return 'warning' as const;
  if (status === 'error') return 'danger' as const;
  return 'neutral' as const;
}

export default function MCPSettings() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [credentialJson, setCredentialJson] = useState('{}');

  const { data: servers = [], isLoading } = useQuery<MCPServer[]>({
    queryKey: ['mcp-servers'],
    queryFn: async () => {
      const response = await api.get<MCPServer[]>('/api/mcp/servers');
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' }) =>
      api.post(`/api/mcp/servers/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const credentials = useQuery<CredentialStatus>({
    queryKey: ['mcp-credentials', selectedId],
    queryFn: async () =>
      (await api.get(`/api/mcp/servers/${selectedId}/credentials`)).data,
    enabled: Boolean(selectedId),
  });

  const saveCredentials = useMutation({
    mutationFn: async () => {
      const env = JSON.parse(credentialJson) as Record<string, string>;
      return api.put(`/api/mcp/servers/${selectedId}/credentials`, { env });
    },
    onSuccess: () => {
      toast.success('MCP credentials encrypted and applied');
      setCredentialJson('{}');
      queryClient.invalidateQueries({ queryKey: ['mcp-credentials', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
    onError: (error: any) =>
      toast.error(
        error instanceof SyntaxError
          ? 'Credentials must be a valid JSON object'
          : error?.response?.data?.message || 'Unable to save MCP credentials'
      ),
  });

  const deleteCredentials = useMutation({
    mutationFn: async () => api.delete(`/api/mcp/servers/${selectedId}/credentials`),
    onSuccess: () => {
      toast.success('MCP credentials removed');
      queryClient.invalidateQueries({ queryKey: ['mcp-credentials', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
    },
    onError: (error: any) =>
      toast.error(error?.response?.data?.message || 'Unable to remove MCP credentials'),
  });

  const selected = servers.find((server) => server.id === selectedId) ?? null;
  const stats = useMemo(
    () => ({
      total: servers.length,
      running: servers.filter((server) => server.status === 'running').length,
      stopped: servers.filter((server) => server.status === 'stopped').length,
      errors: servers.filter((server) => server.status === 'error').length,
    }),
    [servers]
  );

  const isMutating = (server: MCPServer) =>
    lifecycleMutation.isPending && lifecycleMutation.variables?.id === server.id;

  const columns: DataTableColumn<MCPServer>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Server',
      mobileLabel: 'Server',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-surface-900">{row.original.name}</p>
          <p className="text-xs text-surface-500">{row.original.description}</p>
        </div>
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
      id: 'actions',
      header: '',
      hideOnMobile: true,
      cell: ({ row }) => {
        const server = row.original;
        return (
          <div className="flex justify-end gap-1">
            {server.status === 'running' ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Pause className="h-4 w-4" />}
                loading={isMutating(server)}
                onClick={(event) => {
                  event.stopPropagation();
                  lifecycleMutation.mutate({ id: server.id, action: 'stop' });
                }}
              >
                Stop
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<PlayIcon className="h-4 w-4" />}
                loading={isMutating(server)}
                disabled={server.status === 'starting'}
                onClick={(event) => {
                  event.stopPropagation();
                  lifecycleMutation.mutate({ id: server.id, action: 'start' });
                }}
              >
                Start
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              loading={isMutating(server)}
              onClick={(event) => {
                event.stopPropagation();
                lifecycleMutation.mutate({ id: server.id, action: 'restart' });
              }}
            >
              Restart
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MCP Servers"
        description="Monitor and control the MCP servers configured by the deployment."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Configured"
          value={stats.total}
          tone="brand"
          icon={<CpuChipIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Running"
          value={stats.running}
          tone="emerald"
          icon={<PlayIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Stopped"
          value={stats.stopped}
          tone="blue"
          icon={<Pause className="h-5 w-5" />}
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
        onRowClick={(server) => setSelectedId(server.id)}
        getRowId={(server) => server.id}
      />

      <Dialog
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        description={selected?.description}
      >
        {selected && (
          <>
            <Card density="cozy" elevated={false}>
              <CardHeader className="px-0 py-0 border-b-0">
                <CardTitle>Runtime status</CardTitle>
              </CardHeader>
              <CardBody density="compact" className="px-0 flex items-center justify-between">
                <Badge variant={statusToVariant(selected.status)} dot>
                  {selected.status}
                </Badge>
                <span className="font-mono text-xs text-surface-600">{selected.id}</span>
              </CardBody>
            </Card>
            <Card density="cozy" elevated={false} className="mt-4">
              <CardHeader className="px-0 py-0 border-b-0">
                <CardTitle>Organization credentials</CardTitle>
              </CardHeader>
              <CardBody density="compact" className="px-0 space-y-3">
              <p className="text-xs text-surface-600">
                Sensitive environment values are encrypted at rest and isolated to this
                organization. Existing values are masked and never returned in plaintext.
              </p>
              {credentials.data?.configured && credentials.data.env && (
                <div className="rounded-md bg-surface-100 p-3 font-mono text-xs">
                  {Object.entries(credentials.data.env).map(([key, value]) => (
                    <div key={key}>
                      {key}={value}
                    </div>
                  ))}
                </div>
              )}
              <Textarea
                label="Credential environment JSON"
                value={credentialJson}
                onChange={(event) => setCredentialJson(event.target.value)}
                rows={5}
                placeholder='{"GITHUB_TOKEN":"...","AWS_SECRET_ACCESS_KEY":"..."}'
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveCredentials.mutate()}
                  loading={saveCredentials.isPending}
                >
                  Encrypt and Apply
                </Button>
                {credentials.data?.configured && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Remove credentials for this MCP server?')) {
                        deleteCredentials.mutate();
                      }
                    }}
                    loading={deleteCredentials.isPending}
                  >
                    Remove
                  </Button>
                )}
              </div>
              </CardBody>
            </Card>
          </>
        )}
      </Dialog>
    </div>
  );
}
