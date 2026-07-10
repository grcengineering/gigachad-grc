import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { policiesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Upload, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
  Textarea,
  Label,
  Select,
  PageHeader,
  FilterBar,
  DataTable,
  EmptyState,
  Dialog,
  type DataTableColumn,
  type BadgeVariant,
  type ActiveFilter,
} from '@/components/ui';

interface Policy {
  id: string;
  title: string;
  category: string;
  status: string;
  version: string;
  owner?: { displayName?: string };
  nextReviewDue?: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  in_review: 'warning',
  approved: 'success',
  published: 'info',
  retired: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  published: 'Published',
  retired: 'Retired',
};

const CATEGORY_OPTIONS = [
  { value: 'information_security', label: 'Information Security' },
  { value: 'acceptable_use', label: 'Acceptable Use' },
  { value: 'data_privacy', label: 'Data Privacy' },
  { value: 'incident_response', label: 'Incident Response' },
  { value: 'access_control', label: 'Access Control' },
  { value: 'business_continuity', label: 'Business Continuity' },
  { value: 'change_management', label: 'Change Management' },
  { value: 'risk_management', label: 'Risk Management' },
  { value: 'vendor_management', label: 'Vendor Management' },
  { value: 'other', label: 'Other' },
];

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'text-surface-900',
    success: 'text-emerald-700',
    warning: 'text-yellow-700',
    danger: 'text-red-600',
  };
  return (
    <Card>
      <CardBody density="cozy">
        <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
        <p className={cn('text-h1 mt-1', tones[tone])}>{value}</p>
      </CardBody>
    </Card>
  );
}

export default function Policies() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['policies', search],
    queryFn: () => policiesApi.list({ search: search || undefined }).then((res) => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['policies-stats'],
    queryFn: () => policiesApi.getStats().then((res) => res.data),
  });

  const policies: Policy[] = policiesData?.data || [];

  const activeFilters: ActiveFilter[] = [];
  if (search) activeFilters.push({ key: 'search', label: `Search: ${search}`, onClear: () => setSearch('') });

  const columns: DataTableColumn<Policy>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Policy',
      mobileLabel: 'Policy',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-surface-100 rounded-md">
            <FileText className="h-4 w-4 text-surface-600" />
          </div>
          <span className="font-medium text-surface-900">{row.original.title}</span>
        </div>
      ),
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Category',
      mobileLabel: 'Category',
      cell: ({ row }) => (
        <span className="capitalize text-surface-700">{row.original.category?.replace(/_/g, ' ')}</span>
      ),
    },
    {
      id: 'version',
      accessorKey: 'version',
      header: 'Version',
      mobileLabel: 'Version',
      cell: ({ row }) => <span className="font-mono text-small text-surface-600">v{row.original.version}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'owner',
      header: 'Owner',
      mobileLabel: 'Owner',
      cell: ({ row }) => (
        <span className="text-surface-700">{row.original.owner?.displayName || 'Unassigned'}</span>
      ),
    },
    {
      id: 'nextReview',
      accessorKey: 'nextReviewDue',
      header: 'Next Review',
      mobileLabel: 'Next Review',
      cell: ({ row }) => {
        const due = row.original.nextReviewDue;
        if (!due) return <span className="text-surface-500">—</span>;
        const overdue = new Date(due) < new Date();
        return (
          <span className={overdue ? 'text-red-600' : 'text-surface-600'}>
            {new Date(due).toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Policy Center"
        description="Manage your organization's policies and track review cycles."
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsUploadOpen(true)}>
            Upload Policy
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Policies" value={stats?.total || 0} />
        <StatCard label="Approved" value={stats?.approved || 0} tone="success" />
        <StatCard label="Pending Review" value={stats?.inReview || 0} tone="warning" />
        <StatCard label="Overdue Review" value={stats?.overdueReview || 0} tone="danger" />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? () => setSearch('') : undefined}>
        <Input
          inputSize="sm"
          className="w-72"
          placeholder="Search policies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </FilterBar>

      <DataTable
        data={policies}
        columns={columns}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/policies/${p.id}`)}
        emptyState={
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No policies found"
            description={search ? 'Try clearing your search.' : 'Upload your first policy to get started.'}
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch('')}>Clear search</Button>
              ) : (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsUploadOpen(true)}>
                  Upload Policy
                </Button>
              )
            }
          />
        }
      />

      {isUploadOpen && (
        <UploadPolicyModal
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['policies'] });
            queryClient.invalidateQueries({ queryKey: ['policies-stats'] });
            setIsUploadOpen(false);
          }}
        />
      )}
    </div>
  );
}

function UploadPolicyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('information_security');
  const [version, setVersion] = useState('1.0');
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected');
      return policiesApi.upload(file, { title, description, category, version });
    },
    onSuccess: () => {
      toast.success('Policy uploaded successfully');
      onSuccess();
    },
    onError: (error: unknown) => {
      const msg = (error as { message?: string })?.message || 'Failed to upload policy';
      toast.error(msg);
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Upload Policy"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={uploadMutation.isPending}
            disabled={!file || !title}
            onClick={() => uploadMutation.mutate()}
          >
            Upload Policy
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className={cn(
            'border-2 border-dashed rounded-md p-6 text-center transition-colors',
            isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-surface-300',
            file && 'border-emerald-500 bg-emerald-500/10',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-7 w-7 text-emerald-600" />
              <div className="text-left">
                <p className="text-surface-900 font-medium">{file.name}</p>
                <p className="text-xs text-surface-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="ml-2 text-surface-600 hover:text-red-600"
                aria-label="Clear file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-surface-500 mx-auto mb-2" />
              <p className="text-body text-surface-700 mb-2">
                Drag and drop a file, or click to browse
              </p>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="policy-file"
                accept=".pdf,.doc,.docx,.txt"
              />
              <label htmlFor="policy-file">
                <Button variant="outline" size="sm" type="button" onClick={() => document.getElementById('policy-file')?.click()}>
                  Choose File
                </Button>
              </label>
            </>
          )}
        </div>

        <div>
          <Label htmlFor="pol-title" required>Title</Label>
          <Input
            id="pol-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Information Security Policy"
          />
        </div>

        <div>
          <Label htmlFor="pol-desc">Description</Label>
          <Textarea
            id="pol-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of the policy…"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Category</Label>
            <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
          </div>
          <div>
            <Label htmlFor="pol-version">Version</Label>
            <Input
              id="pol-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
