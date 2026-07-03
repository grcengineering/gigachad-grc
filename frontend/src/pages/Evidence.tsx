import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import { evidenceApi, controlsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Search,
  CloudUpload,
  Folder,
  FileText,
  Image as ImageIcon,
  X,
  Download,
  Check,
  Link as LinkIconL,
  ArrowLeft,
} from 'lucide-react';
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
  EmptyState,
  Skeleton,
  Dialog,
  type ActiveFilter,
  type BadgeVariant,
} from '@/components/ui';

const TYPE_ICONS: Record<string, typeof FileText> = {
  screenshot: ImageIcon,
  document: FileText,
  default: FileText,
};

const TYPE_OPTS = [
  { value: 'screenshot', label: 'Screenshots' },
  { value: 'document', label: 'Documents' },
  { value: 'export', label: 'Exports' },
  { value: 'report', label: 'Reports' },
  { value: 'configuration', label: 'Configurations' },
  { value: 'log', label: 'Logs' },
];

const UPLOAD_TYPE_OPTS = [
  { value: 'document', label: 'Document' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'export', label: 'Export' },
  { value: 'report', label: 'Report' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'log', label: 'Log' },
  { value: 'other', label: 'Other' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  expired: 'neutral',
};

interface EvidenceItem {
  id: string;
  title: string;
  filename: string;
  type: string;
  status: string;
  createdAt: string;
  controlLinks?: { controlId: string }[];
}

function StatCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'yellow' | 'orange' | 'red';
}) {
  const colors: Record<typeof tone, string> = {
    neutral: 'text-surface-900',
    yellow: 'text-yellow-700',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };
  return (
    <Card>
      <CardBody density="cozy">
        <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
        <p className={cn('text-h1 mt-1', colors[tone])}>{value}</p>
      </CardBody>
    </Card>
  );
}

export default function Evidence() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [drawerEvidenceId, setDrawerEvidenceId] = useState<string | null>(null);

  const linkToControlId = searchParams.get('controlId');

  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['evidence', search, selectedType],
    queryFn: () =>
      evidenceApi
        .list({
          search: search || undefined,
          type: selectedType ? [selectedType] : undefined,
          limit: 50,
        })
        .then((res) => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['evidence-stats'],
    queryFn: () => evidenceApi.getStats().then((res) => res.data),
  });

  const { data: linkControl } = useQuery({
    queryKey: ['control', linkToControlId],
    queryFn: () => controlsApi.get(linkToControlId!).then((res) => res.data),
    enabled: !!linkToControlId,
  });

  const linkMutation = useMutation({
    mutationFn: ({ evidenceId, controlId }: { evidenceId: string; controlId: string }) =>
      evidenceApi.link(evidenceId, [controlId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['control', linkToControlId] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Evidence linked to control');
    },
    onError: () => toast.error('Failed to link evidence'),
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ evidenceId, controlId }: { evidenceId: string; controlId: string }) =>
      evidenceApi.unlink(evidenceId, controlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['control', linkToControlId] });
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      toast.success('Evidence unlinked from control');
    },
    onError: () => toast.error('Failed to unlink evidence'),
  });

  const evidence: EvidenceItem[] = evidenceData?.data || [];

  const isLinkedToControl = (item: EvidenceItem) => {
    if (!linkToControlId) return false;
    return item.controlLinks?.some((link) => link.controlId === linkToControlId);
  };

  const activeFilters: ActiveFilter[] = [];
  if (search) activeFilters.push({ key: 'search', label: `Search: ${search}`, onClear: () => setSearch('') });
  if (selectedType) {
    const label = TYPE_OPTS.find((o) => o.value === selectedType)?.label ?? selectedType;
    activeFilters.push({ key: 'type', label: `Type: ${label}`, onClear: () => setSelectedType('') });
  }
  const clearAll = () => {
    setSearch('');
    setSelectedType('');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {linkToControlId && linkControl && (
        <Card className="border-brand-500/40 bg-brand-500/5">
          <CardBody density="cozy" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <LinkIconL className="h-5 w-5 text-brand-700 shrink-0" />
              <div className="min-w-0">
                <p className="text-small text-surface-900 font-medium">Linking evidence to control</p>
                <p className="text-xs text-surface-600 truncate">
                  <span className="font-mono text-brand-700">{linkControl.controlId}</span>
                  {' — '}
                  {linkControl.title}
                </p>
              </div>
            </div>
            <Link to={`/controls/${linkToControlId}`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Control
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}

      <PageHeader
        title="Evidence Library"
        description={
          linkToControlId
            ? 'Select evidence to link to the control, or upload new evidence.'
            : 'Manage evidence files and link them to controls.'
        }
        actions={
          hasPermission('evidence:upload') ? (
            <Button
              size="sm"
              leftIcon={<CloudUpload className="h-4 w-4" />}
              onClick={() => setShowUploadModal(true)}
            >
              Upload Evidence
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats?.total || 0} />
        <StatCard label="Pending Review" value={stats?.pendingReview || 0} tone="yellow" />
        <StatCard label="Expiring Soon" value={stats?.expiringSoon || 0} tone="orange" />
        <StatCard label="Expired" value={stats?.expired || 0} tone="red" />
      </div>

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAll : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search evidence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-48"
          placeholder="All Types"
          value={selectedType}
          onChange={setSelectedType}
          options={TYPE_OPTS}
          clearable
        />
      </FilterBar>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : evidence.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Folder className="h-8 w-8" />}
            title="No evidence found"
            description={
              activeFilters.length
                ? 'Try clearing your filters.'
                : 'Upload your first evidence file to get started.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  Clear filters
                </Button>
              ) : hasPermission('evidence:upload') ? (
                <Button
                  size="sm"
                  leftIcon={<CloudUpload className="h-4 w-4" />}
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload Evidence
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((item) => {
            const Icon = TYPE_ICONS[item.type] || TYPE_ICONS.default;
            const isLinked = isLinkedToControl(item);

            return (
              <Card
                key={item.id}
                interactive
                onClick={() => setDrawerEvidenceId(item.id)}
                className={cn(
                  'h-full transition-colors',
                  isLinked
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'hover:border-surface-400',
                )}
              >
                  <CardBody density="cozy">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-surface-100 rounded-md shrink-0">
                        <Icon className="h-5 w-5 text-surface-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-h3 text-surface-900 truncate">{item.title}</h3>
                        <p className="text-xs text-surface-500 mt-0.5 truncate">{item.filename}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={STATUS_VARIANT[item.status] ?? 'neutral'} size="sm">
                            {item.status.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-surface-500 capitalize">{item.type}</span>
                        </div>
                        {item.controlLinks && item.controlLinks.length > 0 && (
                          <p className="text-xs text-surface-500 mt-1.5">
                            Linked to {item.controlLinks.length} control(s)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-200">
                      <span className="text-xs text-surface-500 flex-1">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>

                      {linkToControlId && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isLinked) {
                              unlinkMutation.mutate({ evidenceId: item.id, controlId: linkToControlId });
                            } else {
                              linkMutation.mutate({ evidenceId: item.id, controlId: linkToControlId });
                            }
                          }}
                          disabled={linkMutation.isPending || unlinkMutation.isPending}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors',
                            isLinked
                              ? 'bg-emerald-500/10 text-emerald-600 hover:bg-red-500/10 hover:text-red-600'
                              : 'bg-brand-500/10 text-brand-700 hover:bg-brand-500/20',
                          )}
                        >
                          <LinkIconL className="h-3 w-3" />
                          {isLinked ? 'Linked' : 'Link'}
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // TODO: Download
                        }}
                        className="p-1 text-surface-500 hover:text-surface-900 rounded"
                        aria-label="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} linkToControlId={linkToControlId} />
      )}

      <EvidenceDrawer
        evidenceId={drawerEvidenceId}
        open={!!drawerEvidenceId}
        onClose={() => setDrawerEvidenceId(null)}
      />
    </div>
  );
}

function UploadModal({
  onClose,
  linkToControlId,
}: {
  onClose: () => void;
  linkToControlId?: string | null;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('document');
  const [description, setDescription] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = new Set([
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.csv',
    '.txt',
  ]);

  const acceptedMimeTypes = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
  ]);

  const fileAcceptValue = Array.from(acceptedExtensions).join(',');

  const isAcceptedFile = (candidate: File): boolean => {
    const ext = `.${candidate.name.split('.').pop()?.toLowerCase() ?? ''}`;
    return acceptedMimeTypes.has(candidate.type) || acceptedExtensions.has(ext);
  };

  const handleFileSelected = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (!isAcceptedFile(selectedFile)) {
      toast.error('Unsupported file type. Upload PDF, Office docs, images, CSV, or text.');
      return;
    }
    setFile(selectedFile);
    if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      const data: Record<string, unknown> = { title, type, description };
      if (linkToControlId) data.controlIds = [linkToControlId];
      return evidenceApi.upload(file, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['evidence-stats'] });
      if (linkToControlId) {
        queryClient.invalidateQueries({ queryKey: ['control', linkToControlId] });
        queryClient.invalidateQueries({ queryKey: ['controls'] });
      }
      toast.success(
        linkToControlId
          ? 'Evidence uploaded and linked to control'
          : 'Evidence uploaded successfully',
      );
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const message =
        err?.response?.data?.message || err?.message || 'Failed to upload evidence';
      toast.error(message);
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Upload Evidence"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={uploadMutation.isPending}
            disabled={!file || !title}
            onClick={() => uploadMutation.mutate()}
          >
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {linkToControlId && (
          <div className="flex items-center gap-2 rounded-md border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-small text-brand-700">
            <LinkIconL className="h-4 w-4 shrink-0" />
            <span>This evidence will be linked to the control automatically.</span>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragActive(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            handleFileSelected(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-brand-500 bg-brand-500/10'
              : file
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-surface-300 hover:border-surface-400',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={fileAcceptValue}
            onChange={(e) => {
              handleFileSelected(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <span className="truncate max-w-xs">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setTitle('');
                }}
                className="ml-2 p-1 hover:bg-surface-100 rounded"
                aria-label="Clear file"
              >
                <X className="h-4 w-4 text-surface-600" />
              </button>
            </div>
          ) : (
            <>
              <CloudUpload
                className={cn(
                  'h-10 w-10 mx-auto mb-3 transition-colors',
                  isDragActive ? 'text-brand-700' : 'text-surface-500',
                )}
              />
              <p className={cn('text-body', isDragActive ? 'text-brand-800' : 'text-surface-700')}>
                {isDragActive ? 'Drop the file here…' : 'Drag and drop a file, or click to select'}
              </p>
              <p className="text-xs text-surface-500 mt-1.5">
                PDF, Word, Excel, Images, CSV, Text
              </p>
            </>
          )}
        </div>

        <div>
          <Label htmlFor="ev-title" required>
            Title
          </Label>
          <Input
            id="ev-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Evidence title"
          />
        </div>

        <div>
          <Label>Type</Label>
          <Select value={type} onChange={setType} options={UPLOAD_TYPE_OPTS} />
        </div>

        <div>
          <Label htmlFor="ev-desc">Description (optional)</Label>
          <Textarea
            id="ev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this evidence"
          />
        </div>
      </div>
    </Dialog>
  );
}
