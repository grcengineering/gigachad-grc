import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { policiesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { ExportDropdown } from '@/components/ExportDropdown';
import { exportConfigs } from '@/lib/export';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'badge-neutral' },
  in_review: { label: 'In Review', color: 'badge-warning' },
  approved: { label: 'Approved', color: 'badge-success' },
  published: { label: 'Published', color: 'badge-info' },
  retired: { label: 'Retired', color: 'badge-danger' },
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

export default function Policies() {
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

  const policies = policiesData?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Policy Center</h1>
          <p className="text-surface-600 mt-1">
            Manage your organization's policies and track review cycles
          </p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown
            data={policies}
            columns={exportConfigs.policies}
            filename="policies"
            sheetName="Policies"
            disabled={isLoading || policies.length === 0}
          />
          <Button onClick={() => setIsUploadOpen(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
            Upload Policy
          </Button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-surface-600">Total Policies</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">{stats?.total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.approved || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{stats?.inReview || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Overdue Review</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats?.overdueReview || 0}</p>
        </div>
      </div>
      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <Input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>
      {/* Policies List */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} columns={6} className="border-none shadow-none" />
        ) : policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-surface-500">
            <DocumentTextIcon className="w-16 h-16 mb-4" />
            <p className="text-lg mb-2">No policies found</p>
            <p className="text-sm">Upload your first policy to get started</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Next Review</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy: any) => {
                  const statusConfig = STATUS_CONFIG[policy.status] || STATUS_CONFIG.draft;

                  return (
                    <tr key={policy.id}>
                      <td>
                        <Link
                          to={`/policies/${policy.id}`}
                          className="flex items-center gap-3 hover:text-brand-400"
                        >
                          <div className="p-2 bg-surface-800 rounded-lg">
                            <DocumentTextIcon className="w-5 h-5 text-surface-600" />
                          </div>
                          <span className="font-medium text-surface-100">{policy.title}</span>
                        </Link>
                      </td>
                      <td>
                        <span className="capitalize text-surface-700">
                          {policy.category?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-surface-600">v{policy.version}</span>
                      </td>
                      <td>
                        <span className={clsx('badge', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-surface-700">
                          {policy.owner?.displayName || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        {policy.nextReviewDue ? (
                          <span
                            className={clsx(
                              'text-surface-600',
                              new Date(policy.nextReviewDue) < new Date() && 'text-red-600'
                            )}
                          >
                            {new Date(policy.nextReviewDue).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-surface-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Upload Modal */}
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
      return policiesApi.upload(file, {
        title,
        description,
        type: category as any,
        version,
      });
    },
    onSuccess: () => {
      toast.success('Policy uploaded successfully!');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload policy');
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-lg mx-4 p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-surface-100">Upload Policy</h2>
          <button onClick={onClose} className="text-surface-600 hover:text-surface-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={clsx(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-surface-700',
              file && 'border-green-500 bg-green-500/10'
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
                <DocumentTextIcon className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="text-surface-100 font-medium">{file.name}</p>
                  <p className="text-surface-500 text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="ml-2 text-surface-600 hover:text-red-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-10 h-10 text-surface-500 mx-auto mb-3" />
                <p className="text-surface-700 mb-2">
                  Drag and drop a file here, or click to browse
                </p>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="policy-file"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="policy-file" className="btn-outline cursor-pointer">
                  Choose File
                </label>
              </>
            )}
          </div>

          <div>
            <label className="label">Title *</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mt-1"
              placeholder="e.g., Information Security Policy"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
              rows={2}
              placeholder="Brief description of the policy..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <SelectNative
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input mt-1"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <label className="label">Version</label>
              <Input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="input mt-1"
                placeholder="1.0"
              />
            </div>
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
            Upload Policy
          </Button>
        </div>
      </div>
    </div>
  );
}
