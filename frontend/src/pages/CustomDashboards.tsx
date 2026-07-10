import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, LayoutDashboard, Plus, Trash2, User as UserIcon } from 'lucide-react';
import api from '@/lib/api';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  EmptyState,
  FieldHint,
  Input,
  Label,
  PageHeader,
  Skeleton,
  Textarea,
} from '@/components/ui';

interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  widgetCount: number;
  lastEditedAt?: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function initialsOf(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CustomDashboards() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  const { data: dashboards, isLoading } = useQuery<CustomDashboard[]>({
    queryKey: ['dashboards'],
    queryFn: async () => {
      const res = await api.get('/api/dashboards');
      return Array.isArray(res.data) ? res.data : (res.data?.dashboards ?? []);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      const res = await api.post('/api/dashboards', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      closeCreate();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/dashboards/${id}/duplicate`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/dashboards/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboards'] }),
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setName('');
    setDescription('');
    setNameError(undefined);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setNameError('Dashboard name is required.');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleDelete = (d: CustomDashboard) => {
    if (window.confirm(`Delete "${d.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(d.id);
    }
  };

  const list = dashboards ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Custom Dashboards"
        description="Build and share saved dashboards for the metrics that matter to your team."
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setCreateOpen(true)}
          >
            Create dashboard
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardBody density="comfy">
            <EmptyState
              icon={<LayoutDashboard className="h-6 w-6" />}
              title="No dashboards yet"
              description="Create your first custom dashboard to pin key metrics for your team."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setCreateOpen(true)}
                >
                  Create dashboard
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((d) => (
            <Card key={d.id} className="flex flex-col">
              <CardBody density="comfy" className="flex-1 flex flex-col gap-3">
                <Link to={`/dashboards/${d.id}`} className="block group">
                  <h3 className="text-h3 text-surface-900 group-hover:text-brand-700 transition-colors truncate">
                    {d.name}
                  </h3>
                  {d.description && (
                    <p className="mt-1 text-small text-surface-600 line-clamp-2">{d.description}</p>
                  )}
                </Link>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="brand" size="sm" capitalize={false}>
                    {d.widgetCount} {d.widgetCount === 1 ? 'widget' : 'widgets'}
                  </Badge>
                  <Badge variant="neutral" size="sm" capitalize={false}>
                    Edited {formatDate(d.lastEditedAt)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-3 border-t border-surface-200">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-surface-200 text-xs font-medium text-surface-700 overflow-hidden">
                    {d.ownerAvatarUrl ? (
                      <img
                        src={d.ownerAvatarUrl}
                        alt={d.ownerName ?? 'owner'}
                        className="h-full w-full object-cover"
                      />
                    ) : d.ownerName ? (
                      initialsOf(d.ownerName)
                    ) : (
                      <UserIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="text-small text-surface-700 truncate">
                    {d.ownerName ?? 'Unknown owner'}
                  </span>
                </div>
              </CardBody>
              <div className="flex items-center gap-1 px-4 py-2 border-t border-surface-200 bg-surface-50/40">
                <Link to={`/dashboards/${d.id}`} className="flex-1">
                  <Button variant="ghost" size="sm" fullWidth>
                    View
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Copy className="h-3.5 w-3.5" />}
                  onClick={() => duplicateMutation.mutate(d.id)}
                  disabled={duplicateMutation.isPending}
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => handleDelete(d)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={closeCreate}
        title="Create dashboard"
        description="Give your dashboard a name and an optional description."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} loading={createMutation.isPending}>
              Create dashboard
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="dashboard-name" required>
              Name
            </Label>
            <Input
              id="dashboard-name"
              type="text"
              placeholder="e.g., Executive Risk Overview"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(undefined);
              }}
              invalid={!!nameError}
            />
            {nameError && <FieldHint error>{nameError}</FieldHint>}
          </div>
          <div>
            <Label htmlFor="dashboard-description">Description</Label>
            <Textarea
              id="dashboard-description"
              rows={3}
              placeholder="What does this dashboard show?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
