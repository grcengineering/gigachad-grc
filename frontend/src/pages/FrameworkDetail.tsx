import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { frameworksApi, mappingsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CommentsPanel from '@/components/CommentsPanel';
import TasksPanel from '@/components/TasksPanel';
import MappingEditorModal from '@/components/mappings/MappingEditorModal';
import { MappingCoverageWidget } from '@/components/widgets/MappingCoverageWidget';
import MappingHistoryDrawer from '@/components/mappings/MappingHistoryDrawer';
import MappingImportWizard from '@/components/mappings/MappingImportWizard';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  LinkIcon,
  UserIcon,
  CalendarIcon,
  FlagIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  EllipsisVerticalIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Textarea } from '@/components/ui/Textarea';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

import { Button } from '@/components/ui/Button';

import { Badge } from '@/components/ui/Badge';

const STATUS_CONFIG = {
  compliant: { icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-400/10' },
  partial: { icon: ExclamationTriangleIcon, color: 'text-yellow-600', bg: 'bg-yellow-400/10' },
  non_compliant: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-400/10' },
  not_applicable: { icon: MinusCircleIcon, color: 'text-surface-600', bg: 'bg-surface-400/10' },
  not_assessed: { icon: MinusCircleIcon, color: 'text-surface-500', bg: 'bg-surface-500/10' },
};

type StatusFilter =
  | 'all'
  | 'compliant'
  | 'partial'
  | 'non_compliant'
  | 'not_applicable'
  | 'not_assessed';

export default function FrameworkDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMappingImportOpen, setIsMappingImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const canManageMappings = hasPermission('frameworks:manage');
  const canExportMappings = user
    ? ['admin', 'compliance_manager', 'auditor'].includes(user.role)
    : false;
  const [formData, setFormData] = useState({
    reference: '',
    title: '',
    description: '',
    guidance: '',
    isCategory: false,
  });

  const { data: framework, isLoading: loadingFramework } = useQuery({
    queryKey: ['framework', id],
    queryFn: () => frameworksApi.get(id!).then((res) => res.data),
    enabled: !!id,
  });

  const { data: readiness, isLoading: loadingReadiness } = useQuery({
    queryKey: ['framework-readiness', id],
    queryFn: () => frameworksApi.getReadiness(id!).then((res) => res.data),
    enabled: !!id,
  });

  const { data: requirements } = useQuery({
    queryKey: ['framework-requirements', id],
    queryFn: () => frameworksApi.getRequirementTree(id!).then((res) => res.data),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => frameworksApi.createRequirement(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['framework-requirements', id] });
      queryClient.invalidateQueries({ queryKey: ['framework-readiness', id] });
      setIsCreateModalOpen(false);
      setFormData({ reference: '', title: '', description: '', guidance: '', isCategory: false });
      toast.success('Requirement created successfully');
    },
    onError: () => {
      toast.error('Failed to create requirement');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => frameworksApi.bulkUploadRequirements(id!, file),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['framework-requirements', id] });
      queryClient.invalidateQueries({ queryKey: ['framework-readiness', id] });
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      const count = response.data?.count || 0;
      toast.success(`Successfully uploaded ${count} requirements`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to upload file');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleFileUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleExportMappings = async () => {
    if (!id) return;
    try {
      const blob = await mappingsApi.exportFile(id, 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mappings-${framework?.type || 'framework'}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to export mappings');
    }
  };

  const handleMappingImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['framework-requirements', id] });
    queryClient.invalidateQueries({ queryKey: ['framework-readiness', id] });
  };

  const toggleExpanded = (reqId: string) => {
    setExpandedReqs((prev) => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  if (loadingFramework || loadingReadiness) {
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div>
            <SkeletonDetailSection />
          </div>
          <div className="lg:col-span-3">
            <SkeletonDetailSection />
          </div>
        </div>
        <SkeletonDetailSection />
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-600">Framework not found</p>
      </div>
    );
  }

  const score = readiness?.score || 0;
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/frameworks"
          className="inline-flex items-center text-sm text-surface-600 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Frameworks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">{framework.name}</h1>
            <p className="text-surface-600 mt-1">{framework.description}</p>
          </div>
          <Badge className="text-sm uppercase" variant="info">
            {framework.type}
          </Badge>
        </div>
      </div>
      {/* Readiness Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Score Card */}
        <div className="card p-6 lg:col-span-1">
          <p className="text-sm text-surface-600 mb-2">Readiness Score</p>
          <p className={clsx('text-5xl font-bold', scoreColor)}>{score}%</p>
          <div className="progress-bar mt-4">
            <div
              className={clsx(
                'progress-fill',
                score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card p-6 lg:col-span-3">
          <p className="text-sm text-surface-600 mb-4">Requirements by Status (click to filter)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {readiness?.requirementsByStatus && (
              <>
                <StatusCard
                  label="Compliant"
                  value={readiness.requirementsByStatus.compliant}
                  status="compliant"
                  isActive={statusFilter === 'compliant'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'compliant' ? 'all' : 'compliant')
                  }
                />
                <StatusCard
                  label="Partial"
                  value={readiness.requirementsByStatus.partial}
                  status="partial"
                  isActive={statusFilter === 'partial'}
                  onClick={() => setStatusFilter(statusFilter === 'partial' ? 'all' : 'partial')}
                />
                <StatusCard
                  label="Non-Compliant"
                  value={readiness.requirementsByStatus.non_compliant}
                  status="non_compliant"
                  isActive={statusFilter === 'non_compliant'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'non_compliant' ? 'all' : 'non_compliant')
                  }
                />
                <StatusCard
                  label="N/A"
                  value={readiness.requirementsByStatus.not_applicable}
                  status="not_applicable"
                  isActive={statusFilter === 'not_applicable'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'not_applicable' ? 'all' : 'not_applicable')
                  }
                />
                <StatusCard
                  label="Not Assessed"
                  value={readiness.requirementsByStatus.not_assessed}
                  status="not_assessed"
                  isActive={statusFilter === 'not_assessed'}
                  onClick={() =>
                    setStatusFilter(statusFilter === 'not_assessed' ? 'all' : 'not_assessed')
                  }
                />
              </>
            )}
          </div>
          {statusFilter !== 'all' && (
            <div className="flex items-center gap-2 text-sm mt-4 pt-4 border-t border-surface-800">
              <span className="text-surface-600">Filtering by:</span>
              <span
                className={clsx(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  statusFilter === 'compliant' && 'bg-green-400/20 text-green-600',
                  statusFilter === 'partial' && 'bg-yellow-400/20 text-yellow-600',
                  statusFilter === 'non_compliant' && 'bg-red-400/20 text-red-600',
                  statusFilter === 'not_applicable' && 'bg-surface-400/20 text-surface-600',
                  statusFilter === 'not_assessed' && 'bg-surface-500/20 text-surface-500'
                )}
              >
                {statusFilter === 'compliant' && 'Compliant'}
                {statusFilter === 'partial' && 'Partial'}
                {statusFilter === 'non_compliant' && 'Non-Compliant'}
                {statusFilter === 'not_applicable' && 'Not Applicable'}
                {statusFilter === 'not_assessed' && 'Not Assessed'}
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className="text-surface-600 hover:text-surface-100 ml-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <MappingCoverageWidget frameworkId={id} className="lg:col-span-1" />
      </div>
      {/* Mappings toolbar */}
      {(canManageMappings || canExportMappings) && (
        <div className="flex items-center justify-end gap-2 mb-4">
          {canManageMappings && (
            <Button
              type="button"
              onClick={() => setIsMappingImportOpen(true)}
              className="text-sm"
              variant="secondary"
            >
              <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
              Import mappings
            </Button>
          )}
          {canExportMappings && (
            <Button
              type="button"
              onClick={handleExportMappings}
              className="text-sm"
              variant="secondary"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              Export mappings
            </Button>
          )}
        </div>
      )}
      {/* Requirements Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={clsx('card', selectedReq ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <div className="p-4 border-b border-surface-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Requirements</h2>
              <p className="text-sm text-surface-600 mt-1">
                {requirements && requirements.length > 0
                  ? 'Click on any requirement to view details'
                  : 'Add requirements to define compliance criteria'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-sm"
                variant="secondary"
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-sm"
                variant="primary"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Requirement
              </Button>
            </div>
          </div>
          <div className="divide-y divide-surface-800 max-h-[600px] overflow-y-auto">
            {requirements && requirements.length > 0 ? (
              requirements.map((req: any) => (
                <RequirementRow
                  key={req.id}
                  requirement={req}
                  level={0}
                  expanded={expandedReqs}
                  onToggle={toggleExpanded}
                  onSelect={setSelectedReq}
                  selectedId={selectedReq?.id}
                  statusFilter={statusFilter}
                />
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-surface-600 mb-4">No requirements yet</p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-sm"
                  variant="secondary"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Your First Requirement
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Requirement Detail Panel */}
        {selectedReq && (
          <RequirementDetailPanel
            requirement={selectedReq}
            frameworkId={id!}
            onClose={() => setSelectedReq(null)}
          />
        )}
      </div>
      {/* Create Requirement Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-surface-100">Add Requirement</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-surface-600 hover:text-surface-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">
                    Reference *
                  </label>
                  <Input
                    type="text"
                    required
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., CC1.1, A.5.1.1"
                    className="input w-full"
                  />
                  <p className="text-xs text-surface-500 mt-1">
                    Unique identifier for this requirement
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCategory}
                      onChange={(e) => setFormData({ ...formData, isCategory: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-surface-700">This is a category</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Title *</label>
                <Input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for the requirement"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Description *
                </label>
                <Textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this requirement entail?"
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Guidance (Optional)
                </label>
                <Textarea
                  value={formData.guidance}
                  onChange={(e) => setFormData({ ...formData, guidance: e.target.value })}
                  placeholder="Additional implementation guidance..."
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                  variant="primary"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Requirement'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-800 rounded-lg p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-surface-100">Bulk Upload Requirements</h2>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setSelectedFile(null);
                }}
                className="text-surface-600 hover:text-surface-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700">
                <p className="text-sm text-surface-700 mb-2">
                  Upload a CSV, Excel (.xlsx, .xls), or JSON file with the following columns:
                </p>
                <ul className="text-xs text-surface-600 space-y-1 list-disc list-inside">
                  <li>
                    <span className="font-medium text-surface-700">reference</span> - Unique
                    identifier (required)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">title</span> - Requirement title
                    (required)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">description</span> - Detailed
                    description (required)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">guidance</span> - Implementation
                    guidance (optional)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">isCategory</span> - true/false
                    (optional)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">order</span> - Display order
                    number (optional)
                  </li>
                  <li>
                    <span className="font-medium text-surface-700">level</span> - Hierarchy level
                    0-3 (optional)
                  </li>
                </ul>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Select File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-surface-700
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-brand-600 file:text-white
                      hover:file:bg-brand-700
                      file:cursor-pointer cursor-pointer"
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-surface-600 mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Download Template Links */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DocumentArrowDownIcon className="w-4 h-4 text-brand-400" />
                  <span className="text-surface-600">Templates:</span>
                </div>
                <a
                  href="/templates/requirements-template.csv"
                  download
                  className="text-brand-400 hover:text-brand-300 underline"
                >
                  CSV
                </a>
                <a
                  href="/templates/requirements-template.json"
                  download
                  className="text-brand-400 hover:text-brand-300 underline"
                >
                  JSON
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="flex-1"
                  variant="primary"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mapping Import Wizard */}
      <MappingImportWizard
        open={isMappingImportOpen}
        onClose={() => setIsMappingImportOpen(false)}
        frameworkId={id}
        onComplete={handleMappingImportComplete}
      />
    </div>
  );
}

function StatusCard({
  label,
  value,
  status,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  status: keyof typeof STATUS_CONFIG;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-3 rounded-lg text-left transition-all w-full',
        config.bg,
        isActive
          ? 'ring-2 ring-offset-1 ring-offset-surface-900'
          : 'hover:opacity-80 cursor-pointer',
        isActive && status === 'compliant' && 'ring-green-400',
        isActive && status === 'partial' && 'ring-yellow-400',
        isActive && status === 'non_compliant' && 'ring-red-400',
        isActive && status === 'not_applicable' && 'ring-surface-400',
        isActive && status === 'not_assessed' && 'ring-surface-500'
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={clsx('w-4 h-4', config.color)} />
        <span className={clsx('text-xl font-bold', config.color)}>{value}</span>
      </div>
      <p className="text-xs text-surface-600 mt-1">{label}</p>
      {isActive && <p className={clsx('text-xs mt-1', config.color)}>Click to clear</p>}
    </button>
  );
}

function RequirementRow({
  requirement,
  level,
  expanded,
  onToggle,
  onSelect,
  selectedId,
  statusFilter,
}: {
  requirement: any;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (req: any) => void;
  selectedId?: string;
  statusFilter?: StatusFilter;
}) {
  const hasChildren = requirement.children?.length > 0;
  const isExpanded = expanded.has(requirement.id);
  const isSelected = selectedId === requirement.id;

  // Get requirement's compliance status (now provided by backend)
  const reqStatus = requirement.isCategory
    ? 'category'
    : requirement.complianceStatus || 'not_assessed';

  // Check if this requirement or any children match the filter
  const matchesFilter = (req: any): boolean => {
    if (!statusFilter || statusFilter === 'all') return true;

    const status = req.isCategory ? 'category' : req.complianceStatus || 'not_assessed';

    if (status === statusFilter) return true;

    // Check children recursively
    if (req.children?.length > 0) {
      return req.children.some((child: any) => matchesFilter(child));
    }

    return false;
  };

  // If filtering and this requirement doesn't match, hide it
  if (statusFilter && statusFilter !== 'all' && !matchesFilter(requirement)) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(requirement.id);
    }
    onSelect(requirement);
  };

  // Visual highlight if this specific item matches the filter (not just a parent with matching children)
  const directlyMatchesFilter =
    statusFilter && statusFilter !== 'all' && reqStatus === statusFilter;

  return (
    <>
      <div
        className={clsx(
          'flex items-center gap-3 p-4 transition-colors cursor-pointer',
          isSelected ? 'bg-brand-500/20 border-l-2 border-brand-500' : 'hover:bg-surface-800/50',
          directlyMatchesFilter && !isSelected && 'bg-surface-700/30'
        )}
        style={{ paddingLeft: `${level * 24 + 16}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="p-1 -ml-1"
            aria-label={`Toggle ${requirement.reference}`}
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(requirement.id);
            }}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-surface-600" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-surface-600" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <span className="font-mono text-sm text-brand-400 w-20 flex-shrink-0">
          {requirement.reference}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-surface-100 truncate">{requirement.title}</p>
          {!requirement.isCategory && requirement.mappings?.length > 0 && (
            <p className="text-xs text-surface-500 mt-1">
              {requirement.mappings.length} control(s) mapped
            </p>
          )}
        </div>

        {requirement.isCategory ? (
          <Badge className="text-xs" variant="neutral">
            Category
          </Badge>
        ) : (
          <Badge className="text-xs" variant="neutral">
            {requirement.mappings?.length || 0} controls
          </Badge>
        )}
      </div>
      {hasChildren && isExpanded && (
        <>
          {requirement.children.map((child: any) => (
            <RequirementRow
              key={child.id}
              requirement={child}
              level={level + 1}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              statusFilter={statusFilter}
            />
          ))}
        </>
      )}
    </>
  );
}

function RequirementDetailPanel({
  requirement,
  frameworkId,
  onClose,
}: {
  requirement: any;
  frameworkId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canEditMappings = hasPermission('controls:update');
  const canDeleteMappings = hasPermission('controls:delete');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>(requirement.ownerId || '');
  const [ownerNotes, setOwnerNotes] = useState(requirement.ownerNotes || '');
  const [dueDate, setDueDate] = useState(
    requirement.dueDate ? requirement.dueDate.split('T')[0] : ''
  );
  const [priority, setPriority] = useState(requirement.priority || '');
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [editingMappingId, setEditingMappingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<{
    sourceMapping: {
      controlId: string;
      mappingType: 'primary' | 'supporting';
      notes: string | null;
    };
  } | null>(null);
  const [historyDrawerMappingId, setHistoryDrawerMappingId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['mappings', 'by-requirement', requirement.id],
    queryFn: () => mappingsApi.byRequirement(requirement.id).then((res) => res.data),
    enabled: !!requirement.id && !requirement.isCategory,
  });

  useEffect(() => {
    if (!openMenuId) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenuId]);

  const invalidateMappingQueries = (controlId?: string) => {
    queryClient.invalidateQueries({
      queryKey: ['mappings', 'by-requirement', requirement.id],
    });
    if (controlId) {
      queryClient.invalidateQueries({
        queryKey: ['mappings', 'by-control', controlId],
      });
    }
    // Keep legacy query keys in sync until callers migrate.
    queryClient.invalidateQueries({
      queryKey: ['requirement-mappings', requirement.id],
    });
  };

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; controlId?: string }) => mappingsApi.delete(id),
    onSuccess: (_data, variables) => {
      toast.success('Mapping removed');
      invalidateMappingQueries(variables.controlId);
      setPendingDeleteId(null);
      setOpenMenuId(null);
    },
    onError: () => {
      toast.error('Failed to remove mapping');
    },
  });

  const handleOpenCreateMapping = () => {
    setEditingMappingId(null);
    setIsMappingModalOpen(true);
  };

  const handleOpenEditMapping = (mappingId: string) => {
    setEditingMappingId(mappingId);
    setIsMappingModalOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenCopyMapping = (mapping: any) => {
    setOpenMenuId(null);
    setCopyState({
      sourceMapping: {
        controlId: mapping.controlId || mapping.control?.id,
        mappingType: (mapping.mappingType || 'primary') as 'primary' | 'supporting',
        notes: mapping.notes || null,
      },
    });
  };

  const handleCopySaved = (createdIds: string[]) => {
    if (createdIds.length > 0) {
      toast.success(`Copied to ${createdIds.length} requirement(s).`);
      if (copyState) {
        queryClient.invalidateQueries({
          queryKey: ['mappings', 'by-control', copyState.sourceMapping.controlId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['framework-requirements', frameworkId] });
    }
    setCopyState(null);
  };

  const handleMappingModalClose = () => {
    setIsMappingModalOpen(false);
    setEditingMappingId(null);
  };

  const handleMappingSaved = () => {
    invalidateMappingQueries();
    handleMappingModalClose();
  };

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data),
  });
  const users = usersData?.data || [];

  const { data: reqDetail } = useQuery({
    queryKey: ['requirement-detail', frameworkId, requirement.id],
    queryFn: () =>
      frameworksApi.getRequirement(frameworkId, requirement.id).then((res) => res.data),
    enabled: !!requirement.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => frameworksApi.updateRequirement(frameworkId, requirement.id, data),
    onSuccess: () => {
      toast.success('Requirement updated');
      queryClient.invalidateQueries({
        queryKey: ['requirement-detail', frameworkId, requirement.id],
      });
      queryClient.invalidateQueries({ queryKey: ['framework-requirements', frameworkId] });
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update requirement');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ownerId: selectedOwner || null,
      ownerNotes,
      dueDate: dueDate || null,
      priority: priority || null,
    });
  };

  // Use detail data if available
  const currentOwner = reqDetail?.owner || requirement.owner;
  const currentNotes = reqDetail?.ownerNotes || requirement.ownerNotes;
  const currentDueDate = reqDetail?.dueDate || requirement.dueDate;
  const currentPriority = reqDetail?.priority || requirement.priority;

  return (
    <div className="card lg:col-span-1 h-fit sticky top-4">
      <div className="p-4 border-b border-surface-800 flex items-center justify-between">
        <h3 className="font-semibold text-surface-100">Requirement Details</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-700 rounded transition-colors">
          <XMarkIcon className="w-5 h-5 text-surface-600" />
        </button>
      </div>
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Reference & Title */}
        <div>
          <span className="font-mono text-sm text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
            {requirement.reference}
          </span>
          <h4 className="text-lg font-medium text-surface-100 mt-2">{requirement.title}</h4>
        </div>

        {/* Description */}
        {requirement.description && (
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-surface-700 leading-relaxed line-clamp-4">
              {requirement.description}
            </p>
          </div>
        )}

        {/* Owner Assignment Section */}
        {!requirement.isCategory && (
          <div className="border-t border-surface-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-surface-500 uppercase tracking-wide">Assignment</p>
              {!isEditing ? (
                <button
                  onClick={() => {
                    setSelectedOwner(currentOwner?.id || '');
                    setOwnerNotes(currentNotes || '');
                    setDueDate(currentDueDate ? currentDueDate.split('T')[0] : '');
                    setPriority(currentPriority || '');
                    setIsEditing(true);
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-xs text-surface-600 hover:text-surface-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="text-xs text-green-600 hover:text-green-700"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                {/* Owner Select */}
                <div>
                  <label className="block text-xs text-surface-600 mb-1">Owner</label>
                  <SelectNative
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Unassigned</option>
                    {users?.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} ({user.role})
                      </option>
                    ))}
                  </SelectNative>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs text-surface-600 mb-1">Priority</label>
                  <SelectNative
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Not Set</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </SelectNative>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs text-surface-600 mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-surface-600 mb-1">Notes</label>
                  <Textarea
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about this requirement..."
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Current Owner */}
                <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-surface-500" />
                  <span className="text-sm text-surface-700">
                    {currentOwner?.displayName || 'Unassigned'}
                  </span>
                </div>

                {/* Priority */}
                {currentPriority && (
                  <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
                    <FlagIcon
                      className={clsx(
                        'w-4 h-4',
                        currentPriority === 'high'
                          ? 'text-red-600'
                          : currentPriority === 'medium'
                            ? 'text-yellow-600'
                            : 'text-green-600'
                      )}
                    />
                    <span className="text-sm text-surface-700 capitalize">
                      {currentPriority} Priority
                    </span>
                  </div>
                )}

                {/* Due Date */}
                {currentDueDate && (
                  <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
                    <CalendarIcon className="w-4 h-4 text-surface-500" />
                    <span className="text-sm text-surface-700">
                      Due: {new Date(currentDueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {currentNotes && (
                  <div className="p-2 bg-surface-800/50 rounded-lg">
                    <p className="text-xs text-surface-500 mb-1">Notes</p>
                    <p className="text-sm text-surface-700">{currentNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mapped Controls */}
        {!requirement.isCategory && (
          <div className="border-t border-surface-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-surface-500 uppercase tracking-wide">
                Mapped Controls ({mappings?.length || 0})
              </p>
              {canEditMappings && (
                <button
                  type="button"
                  onClick={handleOpenCreateMapping}
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add mapping…
                </button>
              )}
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
              </div>
            ) : mappings && mappings.length > 0 ? (
              <div
                role="list"
                aria-label="Mapped controls"
                className="space-y-2 max-h-48 overflow-y-auto"
              >
                {mappings.map((mapping: any) => {
                  const controlRef = mapping.control?.controlId || mapping.controlId;
                  const isMenuOpen = openMenuId === mapping.id;
                  const isConfirmingDelete = pendingDeleteId === mapping.id;
                  const showKebab = true;
                  return (
                    <div
                      key={mapping.id}
                      role="listitem"
                      className="group relative bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors"
                    >
                      <div className="flex items-start gap-2 p-3">
                        <Link
                          to={`/controls/${mapping.control?.id}`}
                          className="flex items-start gap-2 min-w-0 flex-1"
                        >
                          <LinkIcon className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-mono text-brand-400">
                              {mapping.control?.controlId}
                            </p>
                            <p className="text-sm text-surface-200 truncate">
                              {mapping.control?.title}
                            </p>
                            <span
                              className={
                                mapping.mappingType === 'supporting'
                                  ? 'inline-block mt-1 text-xs text-surface-600 uppercase tracking-wide'
                                  : 'inline-block mt-1 text-xs text-brand-400 uppercase tracking-wide'
                              }
                            >
                              {mapping.mappingType || 'primary'}
                            </span>
                          </div>
                        </Link>
                        {showKebab && (
                          <div
                            className="relative flex-shrink-0"
                            ref={isMenuOpen ? menuContainerRef : null}
                          >
                            <button
                              type="button"
                              aria-label={`Mapping actions for ${controlRef}`}
                              aria-haspopup="menu"
                              aria-expanded={isMenuOpen}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenMenuId(isMenuOpen ? null : mapping.id);
                                setPendingDeleteId(null);
                              }}
                              className="p-1 rounded hover:bg-surface-700 text-surface-600 hover:text-surface-200 opacity-60 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-opacity"
                            >
                              <EllipsisVerticalIcon className="w-4 h-4" />
                            </button>
                            {isMenuOpen && (
                              <div
                                role="menu"
                                className="absolute right-0 top-7 z-10 min-w-[10rem] bg-surface-800 border border-surface-700 rounded-lg shadow-lg py-1"
                              >
                                {canEditMappings && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleOpenEditMapping(mapping.id);
                                    }}
                                    className="block w-full text-left px-3 py-1.5 text-sm text-surface-200 hover:bg-surface-700"
                                  >
                                    Edit
                                  </button>
                                )}
                                {canEditMappings && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      handleOpenCopyMapping(mapping);
                                    }}
                                    className="block w-full text-left px-3 py-1.5 text-sm text-surface-200 hover:bg-surface-700"
                                  >
                                    Copy to framework…
                                  </button>
                                )}
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setHistoryDrawerMappingId(mapping.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-surface-200 hover:bg-surface-700"
                                >
                                  <ClockIcon className="w-4 h-4" aria-hidden="true" />
                                  History
                                </button>
                                {canDeleteMappings && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      setPendingDeleteId(mapping.id);
                                    }}
                                    className="block w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-surface-700"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {isConfirmingDelete && (
                        <div className="px-3 pb-3 -mt-1">
                          <div
                            role="alertdialog"
                            aria-label="Confirm mapping deletion"
                            className="bg-surface-900/60 border border-red-500/30 rounded-md p-2 text-xs text-surface-200"
                          >
                            <p className="mb-2">Remove this mapping?</p>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPendingDeleteId(null);
                                }}
                                className="px-2 py-1 text-surface-700 hover:text-surface-100"
                                disabled={deleteMutation.isPending}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteMutation.mutate({
                                    id: mapping.id,
                                    controlId: mapping.controlId || mapping.control?.id,
                                  });
                                }}
                                disabled={deleteMutation.isPending}
                                className="px-2 py-1 bg-red-500/20 text-red-700 hover:bg-red-500/30 rounded disabled:opacity-50"
                              >
                                {deleteMutation.isPending ? 'Removing…' : 'Confirm'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-surface-500 italic">No controls mapped yet</p>
            )}
            {isMappingModalOpen &&
              (() => {
                const editingMapping = editingMappingId
                  ? (mappings || []).find((m: any) => m.id === editingMappingId)
                  : undefined;
                const editingControlId = editingMapping?.controlId || editingMapping?.control?.id;
                return (
                  <MappingEditorModal
                    open={isMappingModalOpen}
                    onClose={handleMappingModalClose}
                    mode="requirement-to-controls"
                    requirementId={requirement.id}
                    frameworkId={frameworkId}
                    controlId={editingControlId}
                    existingMappingIds={
                      editingMappingId
                        ? []
                        : (mappings || [])
                            .map((m: any) => m.controlId || m.control?.id)
                            .filter(Boolean)
                    }
                    editingMappingId={editingMappingId || undefined}
                    onSaved={handleMappingSaved}
                  />
                );
              })()}
            {copyState && (
              <MappingEditorModal
                open={true}
                onClose={() => setCopyState(null)}
                mode="control-to-requirements"
                controlId={copyState.sourceMapping.controlId}
                existingMappingIds={[]}
                defaultMappingType={copyState.sourceMapping.mappingType}
                defaultNotes={copyState.sourceMapping.notes ?? undefined}
                onSaved={handleCopySaved}
              />
            )}
            {historyDrawerMappingId && (
              <MappingHistoryDrawer
                open={true}
                onClose={() => setHistoryDrawerMappingId(null)}
                mappingId={historyDrawerMappingId}
                mode="requirement-to-controls"
                invalidateOnRestore={[
                  ['mappings', 'by-requirement', requirement.id],
                  [
                    'mappings',
                    'by-control',
                    (mappings || []).find((m: any) => m.id === historyDrawerMappingId)?.controlId ??
                      (mappings || []).find((m: any) => m.id === historyDrawerMappingId)?.control
                        ?.id,
                  ],
                ]}
              />
            )}
          </div>
        )}

        {/* Children count for categories */}
        {requirement.isCategory && requirement.children?.length > 0 && (
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">
              Sub-requirements
            </p>
            <p className="text-sm text-surface-700">
              {requirement.children.length} child requirement(s)
            </p>
          </div>
        )}

        {/* Comments & Tasks for non-category requirements */}
        {!requirement.isCategory && (
          <>
            <div className="border-t border-surface-800 pt-4">
              <CommentsPanel entityType="requirement" entityId={requirement.id} />
            </div>
            <div className="border-t border-surface-800 pt-4">
              <TasksPanel entityType="requirement" entityId={requirement.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
