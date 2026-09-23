import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { auditsApi, findingsApi } from '@/lib/api';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
  type BadgeVariant,
  type DataTableColumn,
} from '@/components/ui';

interface Finding {
  id: string;
  findingNumber?: string;
  title: string;
  severity: string;
  status: string;
  targetDate?: string;
  audit: { id: string; name: string; auditId: string };
}

interface AuditOption {
  id: string;
  name: string;
  auditId: string;
}

const severityVariant: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  low: 'info',
  observation: 'neutral',
};

export default function AuditFindings() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Finding[]>({
    queryKey: ['findings'],
    queryFn: () => findingsApi.list().then((response) => response.data),
  });

  const columns: DataTableColumn<Finding>[] = [
    {
      id: 'findingNumber',
      accessorKey: 'findingNumber',
      header: 'ID',
      mobileLabel: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-brand-700">
          {row.original.findingNumber ?? row.original.id.slice(0, 8)}
        </span>
      ),
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Finding',
      mobileLabel: 'Finding',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      id: 'audit',
      accessorFn: (finding) => finding.audit.name,
      header: 'Audit',
      mobileLabel: 'Audit',
      cell: ({ row }) => (
        <div>
          <p>{row.original.audit.name}</p>
          <p className="font-mono text-xs text-surface-500">{row.original.audit.auditId}</p>
        </div>
      ),
    },
    {
      id: 'severity',
      accessorKey: 'severity',
      header: 'Severity',
      mobileLabel: 'Severity',
      cell: ({ row }) => (
        <Badge variant={severityVariant[row.original.severity] ?? 'neutral'}>
          {row.original.severity}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => <Badge dot>{row.original.status.replace(/_/g, ' ')}</Badge>,
    },
    {
      id: 'targetDate',
      accessorKey: 'targetDate',
      header: 'Target date',
      mobileLabel: 'Target date',
      cell: ({ row }) =>
        row.original.targetDate ? new Date(row.original.targetDate).toLocaleDateString() : '—',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Audit Findings"
        description="Track and remediate audit findings and observations."
        actions={
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreate(true)}
          >
            New Finding
          </Button>
        }
      />
      {isError ? (
        <div className="rounded-lg border bg-white">
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="Couldn't load findings"
            description="The audit service didn't respond."
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          loading={isLoading}
          getRowId={(finding) => finding.id}
          onRowClick={(finding) => navigate(`/audits/${finding.audit.id}`)}
          emptyState={
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8" />}
              title="No findings yet"
              description="Create a finding against an existing audit."
              action={<Button onClick={() => setShowCreate(true)}>New Finding</Button>}
            />
          }
        />
      )}
      {showCreate && <CreateFindingDialog onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateFindingDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    auditId: '',
    title: '',
    description: '',
    category: 'control_deficiency',
    severity: 'medium',
    remediationOwner: '',
    targetDate: '',
  });
  const { data: audits = [], isLoading } = useQuery<AuditOption[]>({
    queryKey: ['audits', 'finding-options'],
    queryFn: () => auditsApi.list().then((response) => response.data),
  });
  const create = useMutation({
    mutationFn: () =>
      findingsApi.create({
        ...form,
        remediationOwner: form.remediationOwner || undefined,
        targetDate: form.targetDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast.success('Audit finding created');
      onClose();
    },
    onError: () => toast.error('Failed to create audit finding'),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="New Audit Finding"
      description="Record a finding against an existing audit."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!form.auditId || !form.title.trim() || !form.description.trim()}
            onClick={() => create.mutate()}
          >
            Create Finding
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label required>Audit</Label>
          <Select
            value={form.auditId}
            onChange={(auditId) => setForm((current) => ({ ...current, auditId }))}
            options={audits.map((audit) => ({
              value: audit.id,
              label: `${audit.auditId} — ${audit.name}`,
            }))}
            placeholder={isLoading ? 'Loading audits…' : 'Select an audit'}
            disabled={isLoading}
            searchable
          />
        </div>
        <div>
          <Label htmlFor="finding-title" required>
            Title
          </Label>
          <Input
            id="finding-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="finding-description" required>
            Description
          </Label>
          <Textarea
            id="finding-description"
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <Select
              value={form.category}
              onChange={(category) => setForm((current) => ({ ...current, category }))}
              options={[
                { value: 'control_deficiency', label: 'Control deficiency' },
                { value: 'documentation_gap', label: 'Documentation gap' },
                { value: 'process_issue', label: 'Process issue' },
                { value: 'compliance_gap', label: 'Compliance gap' },
              ]}
            />
          </div>
          <div>
            <Label>Severity</Label>
            <Select
              value={form.severity}
              onChange={(severity) => setForm((current) => ({ ...current, severity }))}
              options={['critical', 'high', 'medium', 'low', 'observation'].map((value) => ({
                value,
                label: value.replace('_', ' '),
              }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="finding-owner">Remediation owner</Label>
            <Input
              id="finding-owner"
              value={form.remediationOwner}
              onChange={(event) =>
                setForm((current) => ({ ...current, remediationOwner: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="finding-target">Target date</Label>
            <Input
              id="finding-target"
              type="date"
              value={form.targetDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, targetDate: event.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
