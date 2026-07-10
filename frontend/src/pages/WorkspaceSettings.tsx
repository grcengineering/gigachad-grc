import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  FieldHint,
  Input,
  Label,
  PageHeader,
  Skeleton,
  Tabs,
  Textarea,
  type DataTableColumn,
} from '@/components/ui';
import api from '@/lib/api';

type ModuleKey =
  | 'risk'
  | 'compliance'
  | 'tprm'
  | 'trust'
  | 'audit'
  | 'bcdr'
  | 'people'
  | 'training';

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface BillingInfo {
  plan: string;
  price: string;
  renewsAt: string | null;
  manageUrl: string | null;
}

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  members: WorkspaceMember[];
  modules: Record<ModuleKey, boolean>;
  billing: BillingInfo | null;
}

const MODULES: { key: ModuleKey; label: string; description: string }[] = [
  { key: 'risk', label: 'Risk', description: 'Enterprise risk register and treatments.' },
  { key: 'compliance', label: 'Compliance', description: 'Frameworks, controls, and evidence.' },
  { key: 'tprm', label: 'TPRM', description: 'Third-party risk management.' },
  { key: 'trust', label: 'Trust', description: 'Trust Center and security questionnaires.' },
  { key: 'audit', label: 'Audit', description: 'Audits, workpapers, and findings.' },
  { key: 'bcdr', label: 'BCDR', description: 'Business continuity and disaster recovery.' },
  { key: 'people', label: 'People', description: 'Employees, roles, and access reviews.' },
  { key: 'training', label: 'Training', description: 'Awareness training and certifications.' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

function GeneralPanel({ workspace }: { workspace: WorkspaceDetail }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');

  useEffect(() => {
    setName(workspace.name);
    setDescription(workspace.description ?? '');
  }, [workspace]);

  const save = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await api.put(`/api/workspaces/${workspace.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4 max-w-2xl">
        <div>
          <Label htmlFor="ws-name" required>
            Name
          </Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
          />
        </div>
        <div>
          <Label htmlFor="ws-slug">Slug</Label>
          <Input id="ws-slug" value={workspace.slug} disabled className="font-mono" />
          <FieldHint>Slug is set on creation and cannot be changed.</FieldHint>
        </div>
        <div>
          <Label htmlFor="ws-description">Description</Label>
          <Textarea
            id="ws-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workspace track?"
            rows={4}
          />
        </div>
        <div className="flex items-center justify-end gap-3">
          {save.isSuccess && <span className="text-small text-brand-700">Saved.</span>}
          {save.isError && <span className="text-small text-red-700">Failed to save.</span>}
          <Button
            onClick={() => save.mutate({ name: name.trim(), description: description.trim() })}
            loading={save.isPending}
            disabled={!name.trim()}
          >
            Save changes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function MembersPanel({ workspace }: { workspace: WorkspaceDetail }) {
  const columns: DataTableColumn<WorkspaceMember>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      mobileLabel: 'Name',
      cell: ({ row }) => (
        <span className="text-surface-900 font-medium">{row.original.name}</span>
      ),
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: 'Email',
      mobileLabel: 'Email',
      cell: ({ row }) => <span className="text-surface-700">{row.original.email}</span>,
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: 'Role',
      mobileLabel: 'Role',
      cell: ({ row }) => <Badge variant="info">{row.original.role}</Badge>,
    },
    {
      id: 'joinedAt',
      accessorKey: 'joinedAt',
      header: 'Joined',
      mobileLabel: 'Joined',
      cell: ({ row }) => (
        <span className="text-small text-surface-700">{formatDate(row.original.joinedAt)}</span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <Button size="sm">Invite member</Button>
      </CardHeader>
      <CardBody>
        {workspace.members.length === 0 ? (
          <EmptyState
            title="No members yet"
            description="Invite teammates to collaborate in this workspace."
          />
        ) : (
          <DataTable<WorkspaceMember>
            data={workspace.members}
            columns={columns}
            density="cozy"
          />
        )}
      </CardBody>
    </Card>
  );
}

function ModulesPanel({ workspace }: { workspace: WorkspaceDetail }) {
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(workspace.modules);

  useEffect(() => {
    setModules(workspace.modules);
  }, [workspace.modules]);

  const save = useMutation({
    mutationFn: async (payload: Record<ModuleKey, boolean>) => {
      const res = await api.put(`/api/workspaces/${workspace.id}/modules`, {
        modules: payload,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
    },
  });

  const toggle = (key: ModuleKey) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
        <Button size="sm" onClick={() => save.mutate(modules)} loading={save.isPending}>
          Save modules
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {MODULES.map((m) => {
          const enabled = modules[m.key];
          return (
            <div
              key={m.key}
              className="flex items-start justify-between gap-4 rounded-md border border-surface-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-body text-surface-900 font-medium">{m.label}</p>
                <p className="text-small text-surface-600 mt-0.5">{m.description}</p>
              </div>
              <Button
                variant={enabled ? 'primary' : 'outline'}
                size="sm"
                onClick={() => toggle(m.key)}
              >
                {enabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function BillingPanel({ workspace }: { workspace: WorkspaceDetail }) {
  const billing = workspace.billing;

  if (!billing) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="No billing information"
            description="This workspace does not have a billing record yet."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-md border border-surface-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-surface-600 uppercase tracking-wider">Plan</p>
            <p className="text-h3 text-surface-900 mt-1">{billing.plan}</p>
          </div>
          <div className="rounded-md border border-surface-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-surface-600 uppercase tracking-wider">Price</p>
            <p className="text-h3 text-surface-900 mt-1">{billing.price}</p>
          </div>
          <div className="rounded-md border border-surface-200 bg-white px-4 py-3">
            <p className="text-xs font-medium text-surface-600 uppercase tracking-wider">
              Next renewal
            </p>
            <p className="text-h3 text-surface-900 mt-1">{formatDate(billing.renewsAt)}</p>
          </div>
        </div>

        {billing.manageUrl && (
          <div>
            <Button
              variant="outline"
              onClick={() => {
                window.open(billing.manageUrl ?? '', '_blank', 'noopener,noreferrer');
              }}
            >
              Manage billing
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default function WorkspaceSettings() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery<WorkspaceDetail>({
    queryKey: ['workspace', id],
    queryFn: async () => {
      const res = await api.get(`/api/workspaces/${id}`);
      return res.data as WorkspaceDetail;
    },
    enabled: !!id,
  });

  return (
    <div className="space-y-5">
      <Link
        to="/settings/workspaces"
        className="inline-flex items-center gap-1.5 text-small text-surface-700 hover:text-surface-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspaces
      </Link>

      {isLoading ? (
        <>
          <PageHeader title="Workspace" description="Loading workspace settings…" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </>
      ) : isError || !data ? (
        <>
          <PageHeader title="Workspace" />
          <Card>
            <CardBody>
              <EmptyState
                title="Could not load workspace"
                description="Please refresh the page or try again later."
              />
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <PageHeader
            title={data.name}
            description={data.description || 'Workspace settings'}
            meta={
              <code className="font-mono text-small text-surface-600">{data.slug}</code>
            }
          />
          <Tabs
            tabs={[
              { label: 'General', content: <GeneralPanel workspace={data} /> },
              { label: 'Members', content: <MembersPanel workspace={data} /> },
              { label: 'Modules', content: <ModulesPanel workspace={data} /> },
              { label: 'Billing', content: <BillingPanel workspace={data} /> },
            ]}
          />
        </>
      )}
    </div>
  );
}
