import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Skeleton,
  Textarea,
} from '@/components/ui';
import api from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  isActive: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function WorkspaceList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/api/workspaces');
      const body = res.data;
      if (Array.isArray(body)) return body as Workspace[];
      if (Array.isArray(body?.data)) return body.data as Workspace[];
      return [];
    },
  });

  const createWorkspace = useMutation({
    mutationFn: async (payload: { name: string; slug: string; description: string }) => {
      const res = await api.post('/api/workspaces', payload);
      return res.data as Workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setName('');
      setSlug('');
      setSlugTouched(false);
      setDescription('');
      setError(null);
    },
    onError: () => {
      setError('Failed to create workspace.');
    },
  });

  const switchWorkspace = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/workspaces/${id}/switch`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });

  const onNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleCreate = () => {
    const finalSlug = slug.trim() || slugify(name);
    if (!name.trim() || !finalSlug) {
      setError('Name and slug are required.');
      return;
    }
    setError(null);
    createWorkspace.mutate({
      name: name.trim(),
      slug: finalSlug,
      description: description.trim(),
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Workspaces"
        description="Each workspace tracks its own controls, evidence, and risks."
        actions={<Button onClick={() => setShowCreate(true)}>Create workspace</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Could not load workspaces"
              description="Please refresh the page or try again later."
            />
          </CardBody>
        </Card>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="No workspaces yet"
              description="Create your first workspace to start tracking compliance."
              action={<Button onClick={() => setShowCreate(true)}>Create workspace</Button>}
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((ws) => (
            <Card key={ws.id} interactive>
              <Link
                to={`/settings/workspaces/${ws.id}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
              >
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="truncate">{ws.name}</CardTitle>
                    <code className="block font-mono text-xs text-surface-600 mt-1 truncate">
                      {ws.slug}
                    </code>
                  </div>
                  {ws.isActive && <Badge variant="success">Active</Badge>}
                </CardHeader>
                <CardBody className="space-y-3">
                  <p className="text-small text-surface-700 min-h-[2.5rem] line-clamp-2">
                    {ws.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-small text-surface-600">
                      {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'}
                    </span>
                    {ws.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/settings/workspaces/${ws.id}`);
                        }}
                      >
                        Open settings
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          switchWorkspace.mutate(ws.id);
                        }}
                        loading={switchWorkspace.isPending && switchWorkspace.variables === ws.id}
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create workspace"
        description="Workspaces let you isolate compliance data per product or business unit."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createWorkspace.isPending}>
              Create workspace
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="ws-name" required>
              Name
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Acme Production"
            />
          </div>
          <div>
            <Label htmlFor="ws-slug" required>
              Slug
            </Label>
            <Input
              id="ws-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="acme-production"
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor="ws-desc">Description</Label>
            <Textarea
              id="ws-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this workspace track?"
              rows={3}
            />
          </div>
          {error && <p className="text-small text-red-700">{error}</p>}
        </div>
      </Dialog>
    </div>
  );
}
