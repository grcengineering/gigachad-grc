import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { useSearchParams, Link } from 'react-router-dom';
import { evidenceApi, controlsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentWorkspaceId } from '@/contexts/WorkspaceContext';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  FolderIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  LinkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { SkeletonGrid } from '@/components/Skeleton';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

const TYPE_ICONS: Record<string, any> = {
  screenshot: PhotoIcon,
  document: DocumentTextIcon,
  default: DocumentTextIcon,
};

const STATUS_STYLES: Record<string, string> = {
  pending_review: '',
  approved: '',
  rejected: '',
  expired: '',
};

export default function Evidence() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [selectedType, setSelectedType] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const workspaceId = useCurrentWorkspaceId();

  // Check if we're in linking mode (coming from a control)
  const linkToControlId = searchParams.get('controlId');

  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ['evidence', debouncedSearch, selectedType, workspaceId],
    queryFn: () =>
      evidenceApi
        .list({
          search: debouncedSearch || undefined,
          type: selectedType ? [selectedType] : undefined,
          workspaceId: workspaceId || undefined,
          limit: 25, // Reduced from 50
        })
        .then((res) => res.data),
    staleTime: 30 * 1000, // 30 second cache
  });

  const { data: stats } = useQuery({
    queryKey: ['evidence-stats'],
    queryFn: () => evidenceApi.getStats().then((res) => res.data),
  });

  // Get control details if linking
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
      queryClient.invalidateQueries({ queryKey: ['controls'] }); // Update controls list
      toast.success('Evidence linked to control');
    },
    onError: () => {
      toast.error('Failed to link evidence');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ evidenceId, controlId }: { evidenceId: string; controlId: string }) =>
      evidenceApi.unlink(evidenceId, controlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['control', linkToControlId] });
      queryClient.invalidateQueries({ queryKey: ['controls'] }); // Update controls list
      toast.success('Evidence unlinked from control');
    },
    onError: () => {
      toast.error('Failed to unlink evidence');
    },
  });

  const evidence = Array.isArray(evidenceData) ? evidenceData : (evidenceData as any)?.data || [];

  const isLinkedToControl = (item: any) => {
    if (!linkToControlId) return false;
    return item.controlLinks?.some((link: any) => link.controlId === linkToControlId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Linking Mode Banner */}
      {linkToControlId && linkControl && (
        <div className="card p-4 border-brand-500 bg-brand-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-5 h-5 text-brand-400" />
              <div>
                <p className="text-sm font-medium text-surface-900">Linking evidence to control</p>
                <p className="text-xs text-surface-600">
                  <span className="font-mono text-brand-400">{linkControl.controlId}</span>
                  {' - '}
                  {linkControl.title}
                </p>
              </div>
            </div>
            <Link to={`/controls/${linkToControlId}`} className="text-sm">
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back to Control
            </Link>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Evidence Library</h1>
          <p className="text-surface-600 mt-1">
            {linkToControlId
              ? 'Select evidence to link to the control, or upload new evidence'
              : 'Manage evidence files and link them to controls'}
          </p>
        </div>
        {hasPermission('evidence:upload') && (
          <Button
            onClick={() => setShowUploadModal(true)}
            leftIcon={<CloudArrowUpIcon className="w-4 h-4" />}
          >
            Upload Evidence
          </Button>
        )}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats?.total || 0} />
        <StatCard label="Pending Review" value={stats?.pendingReview || 0} color="yellow" />
        <StatCard label="Expiring Soon" value={stats?.expiringSoon || 0} color="orange" />
        <StatCard label="Expired" value={stats?.expired || 0} color="red" />
      </div>
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <Input
              type="text"
              placeholder="Search evidence..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-10"
            />
          </div>
          <SelectNative
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="">All Types</option>
            <option value="screenshot">Screenshots</option>
            <option value="document">Documents</option>
            <option value="export">Exports</option>
            <option value="report">Reports</option>
            <option value="configuration">Configurations</option>
            <option value="log">Logs</option>
          </SelectNative>
        </div>
      </div>
      {/* Evidence Grid */}
      {isLoading ? (
        <SkeletonGrid count={9} />
      ) : evidence.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-surface-500">
          <FolderIcon className="w-16 h-16 mb-4" />
          <p className="text-lg mb-2">No evidence found</p>
          <p className="text-sm">Upload your first evidence file to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evidence.map((item: any) => {
            const Icon = TYPE_ICONS[item.type] || TYPE_ICONS.default;
            const isLinked = isLinkedToControl(item);

            return (
              <Link
                key={item.id}
                to={`/evidence/${item.id}`}
                className={clsx(
                  'card p-4 transition-colors block',
                  isLinked ? 'border-green-500/50 bg-green-500/5' : 'hover:border-surface-200'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg dark:bg-surface-900">
                    <Icon className="w-6 h-6 text-surface-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-surface-900 truncate">{item.title}</h3>
                    <p className="text-xs text-surface-500 mt-1">{item.filename}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={clsx('text-xs', STATUS_STYLES[item.status])}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-surface-500 capitalize">{item.type}</span>
                    </div>
                    {item.controlLinks?.length > 0 && (
                      <p className="text-xs text-surface-500 mt-2">
                        Linked to {item.controlLinks.length} control(s)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-200">
                  <span className="text-xs text-surface-500 flex-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>

                  {/* Link/Unlink button when in linking mode */}
                  {linkToControlId && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isLinked) {
                          unlinkMutation.mutate({
                            evidenceId: item.id,
                            controlId: linkToControlId,
                          });
                        } else {
                          linkMutation.mutate({
                            evidenceId: item.id,
                            controlId: linkToControlId,
                          });
                        }
                      }}
                      disabled={linkMutation.isPending || unlinkMutation.isPending}
                      className={clsx(
                        'px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1',
                        isLinked
                          ? 'bg-green-500/20 text-green-600 hover:bg-red-500/20 hover:text-red-600'
                          : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                      )}
                    >
                      <LinkIcon className="w-3 h-3" />
                      {isLinked ? 'Linked ✓' : 'Link'}
                    </button>
                  )}

                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        const response = await evidenceApi.getDownloadUrl(item.id);
                        const urlData = response.data?.url || response.data;
                        const url =
                          typeof urlData === 'string' ? urlData : (urlData as any)?.url || '';
                        if (url) {
                          // Create a temporary link and click it to download
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = item.filename || 'evidence-file';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          toast.error('Download URL not available');
                        }
                      } catch {
                        toast.error('Failed to download file');
                      }
                    }}
                    className="p-1 text-surface-600 hover:text-surface-900"
                    title="Download"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} linkToControlId={linkToControlId} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = 'surface',
}: {
  label: string;
  value: number;
  color?: 'surface' | 'yellow' | 'orange' | 'red';
}) {
  const colorClasses = {
    surface: 'text-surface-900',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  return (
    <div className="card p-4">
      <p className="text-sm text-surface-600">{label}</p>
      <p className={clsx('text-2xl font-bold mt-1', colorClasses[color])}>{value}</p>
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

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      // Include controlIds if linking
      const data: any = { title, type, description };
      if (linkToControlId) {
        data.controlIds = [linkToControlId];
      }
      return evidenceApi.upload(file, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['evidence-stats'] });
      if (linkToControlId) {
        queryClient.invalidateQueries({ queryKey: ['control', linkToControlId] });
        queryClient.invalidateQueries({ queryKey: ['controls'] }); // Update controls list
      }
      toast.success(
        linkToControlId
          ? 'Evidence uploaded and linked to control'
          : 'Evidence uploaded successfully'
      );
      onClose();
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const message =
        error?.response?.data?.message || error?.message || 'Failed to upload evidence';
      toast.error(message);
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        setFile(acceptedFiles[0]);
        if (!title) {
          setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ''));
        }
      }
    },
    [title]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
    },
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      {/* Modal content - positioned on top */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white border border-surface-200 rounded-xl w-full max-w-lg p-6 shadow-2xl dark:bg-surface-900">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-surface-900">Upload Evidence</h2>
            <button onClick={onClose} className="text-surface-600 hover:text-surface-900">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {linkToControlId && (
            <div className="mb-4 p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg text-sm">
              <div className="flex items-center gap-2 text-brand-400">
                <LinkIcon className="w-4 h-4" />
                <span>This evidence will be linked to the control automatically</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={clsx(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all',
                isDragActive
                  ? 'border-brand-500 bg-brand-500/10 scale-[1.02]'
                  : file
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-surface-200 hover:border-surface-300'
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckIcon className="w-6 h-6" />
                  <span className="truncate max-w-xs">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTitle('');
                    }}
                    className="ml-2 p-1 hover:bg-surface-200 rounded"
                  >
                    <XMarkIcon className="w-4 h-4 text-surface-600" />
                  </button>
                </div>
              ) : (
                <>
                  <CloudArrowUpIcon
                    className={clsx(
                      'w-12 h-12 mx-auto mb-4 transition-colors',
                      isDragActive ? 'text-brand-400' : 'text-surface-500'
                    )}
                  />
                  <p
                    className={clsx(
                      'transition-colors',
                      isDragActive ? 'text-brand-300' : 'text-surface-700'
                    )}
                  >
                    {isDragActive
                      ? 'Drop the file here...'
                      : 'Drag and drop a file here, or click to select'}
                  </p>
                  <p className="text-surface-500 text-sm mt-2">
                    PDF, Word, Excel, Images, CSV, Text
                  </p>
                </>
              )}
            </div>

            {/* Form fields */}
            <div>
              <label className="label">Title</label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input mt-1"
                placeholder="Evidence title"
              />
            </div>

            <div>
              <label className="label">Type</label>
              <SelectNative
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input mt-1"
              >
                <option value="document">Document</option>
                <option value="screenshot">Screenshot</option>
                <option value="export">Export</option>
                <option value="report">Report</option>
                <option value="configuration">Configuration</option>
                <option value="log">Log</option>
                <option value="other">Other</option>
              </SelectNative>
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input mt-1"
                rows={3}
                placeholder="Brief description of this evidence"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !title}
              isLoading={uploadMutation.isPending}
            >
              Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
