import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { frameworksApi, mappingsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import CommentsPanel from '@/components/CommentsPanel';
import TasksPanel from '@/components/TasksPanel';
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
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const STATUS_CONFIG = {
  compliant: { icon: CheckCircleIcon, color: 'text-green-400', bg: 'bg-green-400/10' },
  partial: { icon: ExclamationTriangleIcon, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  non_compliant: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-400/10' },
  not_applicable: { icon: MinusCircleIcon, color: 'text-surface-400', bg: 'bg-surface-400/10' },
  not_assessed: { icon: MinusCircleIcon, color: 'text-surface-500', bg: 'bg-surface-500/10' },
};

export default function FrameworkDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [expandedReqs, setExpandedReqs] = useState<Set<string>>(new Set());
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
      </div>
    );
  }

  if (!framework) {
    return (
      <div className="text-center py-12">
        <p className="text-surface-400">Framework not found</p>
      </div>
    );
  }

  const score = readiness?.score || 0;
  const scoreColor =
    score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          to="/frameworks"
          className="inline-flex items-center text-sm text-surface-400 hover:text-surface-100 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Frameworks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100">{framework.name}</h1>
            <p className="text-surface-400 mt-1">{framework.description}</p>
          </div>
          <span className="badge badge-info text-sm uppercase">{framework.type}</span>
        </div>
      </div>

      {/* Readiness Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Score Card */}
        <div className="card p-6 lg:col-span-1">
          <p className="text-sm text-surface-400 mb-2">Readiness Score</p>
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
          <p className="text-sm text-surface-400 mb-4">Requirements by Status</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {readiness?.requirementsByStatus && (
              <>
                <StatusCard
                  label="Compliant"
                  value={readiness.requirementsByStatus.compliant}
                  status="compliant"
                />
                <StatusCard
                  label="Partial"
                  value={readiness.requirementsByStatus.partial}
                  status="partial"
                />
                <StatusCard
                  label="Non-Compliant"
                  value={readiness.requirementsByStatus.non_compliant}
                  status="non_compliant"
                />
                <StatusCard
                  label="N/A"
                  value={readiness.requirementsByStatus.not_applicable}
                  status="not_applicable"
                />
                <StatusCard
                  label="Not Assessed"
                  value={readiness.requirementsByStatus.not_assessed}
                  status="not_assessed"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Requirements Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={clsx('card', selectedReq ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <div className="p-4 border-b border-surface-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-surface-100">Requirements</h2>
              <p className="text-sm text-surface-400 mt-1">
                {requirements && requirements.length > 0
                  ? 'Click on any requirement to view details'
                  : 'Add requirements to define compliance criteria'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-secondary text-sm"
              >
                <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                Bulk Upload
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary text-sm"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Requirement
              </button>
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
                />
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-surface-400 mb-4">No requirements yet</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-secondary text-sm"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Your First Requirement
                </button>
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
                className="text-surface-400 hover:text-surface-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">
                    Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="e.g., CC1.1, A.5.1.1"
                    className="input w-full"
                  />
                  <p className="text-xs text-surface-500 mt-1">Unique identifier for this requirement</p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCategory}
                      onChange={(e) => setFormData({ ...formData, isCategory: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-surface-300">This is a category</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for the requirement"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this requirement entail?"
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Guidance (Optional)
                </label>
                <textarea
                  value={formData.guidance}
                  onChange={(e) => setFormData({ ...formData, guidance: e.target.value })}
                  placeholder="Additional implementation guidance..."
                  rows={3}
                  className="input w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Requirement'}
                </button>
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
                className="text-surface-400 hover:text-surface-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Instructions */}
              <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700">
                <p className="text-sm text-surface-300 mb-2">
                  Upload a CSV, Excel (.xlsx, .xls), or JSON file with the following columns:
                </p>
                <ul className="text-xs text-surface-400 space-y-1 list-disc list-inside">
                  <li><span className="font-medium text-surface-300">reference</span> - Unique identifier (required)</li>
                  <li><span className="font-medium text-surface-300">title</span> - Requirement title (required)</li>
                  <li><span className="font-medium text-surface-300">description</span> - Detailed description (required)</li>
                  <li><span className="font-medium text-surface-300">guidance</span> - Implementation guidance (optional)</li>
                  <li><span className="font-medium text-surface-300">isCategory</span> - true/false (optional)</li>
                  <li><span className="font-medium text-surface-300">order</span> - Display order number (optional)</li>
                  <li><span className="font-medium text-surface-300">level</span> - Hierarchy level 0-3 (optional)</li>
                </ul>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Select File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.json"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-surface-300
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-medium
                      file:bg-brand-600 file:text-white
                      hover:file:bg-brand-700
                      file:cursor-pointer cursor-pointer"
                  />
                </div>
                {selectedFile && (
                  <p className="text-xs text-surface-400 mt-2">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Download Template Links */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DocumentArrowDownIcon className="w-4 h-4 text-brand-400" />
                  <span className="text-surface-400">Templates:</span>
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
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusCard({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: keyof typeof STATUS_CONFIG;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className={clsx('p-3 rounded-lg', config.bg)}>
      <div className="flex items-center gap-2">
        <Icon className={clsx('w-4 h-4', config.color)} />
        <span className={clsx('text-xl font-bold', config.color)}>{value}</span>
      </div>
      <p className="text-xs text-surface-400 mt-1">{label}</p>
    </div>
  );
}

function RequirementRow({
  requirement,
  level,
  expanded,
  onToggle,
  onSelect,
  selectedId,
}: {
  requirement: any;
  level: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (req: any) => void;
  selectedId?: string;
}) {
  const hasChildren = requirement.children?.length > 0;
  const isExpanded = expanded.has(requirement.id);
  const isSelected = selectedId === requirement.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(requirement.id);
    }
    onSelect(requirement);
  };

  return (
    <>
      <div
        className={clsx(
          'flex items-center gap-3 p-4 transition-colors cursor-pointer',
          isSelected ? 'bg-brand-500/20 border-l-2 border-brand-500' : 'hover:bg-surface-800/50'
        )}
        style={{ paddingLeft: `${level * 24 + 16}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button className="p-1 -ml-1" onClick={(e) => { e.stopPropagation(); onToggle(requirement.id); }}>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-surface-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-surface-400" />
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
          <span className="badge badge-neutral text-xs">Category</span>
        ) : (
          <span className="badge badge-neutral text-xs">
            {requirement.mappings?.length || 0} controls
          </span>
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
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string>(requirement.ownerId || '');
  const [ownerNotes, setOwnerNotes] = useState(requirement.ownerNotes || '');
  const [dueDate, setDueDate] = useState(requirement.dueDate ? requirement.dueDate.split('T')[0] : '');
  const [priority, setPriority] = useState(requirement.priority || '');

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['requirement-mappings', requirement.id],
    queryFn: () => mappingsApi.byRequirement(requirement.id).then((res) => res.data),
    enabled: !!requirement.id && !requirement.isCategory,
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((res) => res.data),
  });

  const { data: reqDetail } = useQuery({
    queryKey: ['requirement-detail', frameworkId, requirement.id],
    queryFn: () => frameworksApi.getRequirement(frameworkId, requirement.id).then((res) => res.data),
    enabled: !!requirement.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => frameworksApi.updateRequirement(frameworkId, requirement.id, data),
    onSuccess: () => {
      toast.success('Requirement updated');
      queryClient.invalidateQueries({ queryKey: ['requirement-detail', frameworkId, requirement.id] });
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
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-700 rounded transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-surface-400" />
        </button>
      </div>
      
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Reference & Title */}
        <div>
          <span className="font-mono text-sm text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
            {requirement.reference}
          </span>
          <h4 className="text-lg font-medium text-surface-100 mt-2">
            {requirement.title}
          </h4>
        </div>

        {/* Description */}
        {requirement.description && (
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-surface-300 leading-relaxed line-clamp-4">
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
                    className="text-xs text-surface-400 hover:text-surface-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="text-xs text-green-400 hover:text-green-300"
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
                  <label className="block text-xs text-surface-400 mb-1">Owner</label>
                  <select
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
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Not Set</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Notes</label>
                  <textarea
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
                  <span className="text-sm text-surface-300">
                    {currentOwner?.displayName || 'Unassigned'}
                  </span>
                </div>

                {/* Priority */}
                {currentPriority && (
                  <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
                    <FlagIcon className={clsx(
                      'w-4 h-4',
                      currentPriority === 'high' ? 'text-red-400' :
                      currentPriority === 'medium' ? 'text-yellow-400' : 'text-green-400'
                    )} />
                    <span className="text-sm text-surface-300 capitalize">{currentPriority} Priority</span>
                  </div>
                )}

                {/* Due Date */}
                {currentDueDate && (
                  <div className="flex items-center gap-2 p-2 bg-surface-800/50 rounded-lg">
                    <CalendarIcon className="w-4 h-4 text-surface-500" />
                    <span className="text-sm text-surface-300">
                      Due: {new Date(currentDueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {currentNotes && (
                  <div className="p-2 bg-surface-800/50 rounded-lg">
                    <p className="text-xs text-surface-500 mb-1">Notes</p>
                    <p className="text-sm text-surface-300">{currentNotes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mapped Controls */}
        {!requirement.isCategory && (
          <div className="border-t border-surface-800 pt-4">
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">
              Mapped Controls ({mappings?.length || 0})
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-surface-700 rounded-full border-t-brand-500"></div>
              </div>
            ) : mappings && mappings.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {mappings.map((mapping: any) => (
                  <Link
                    key={mapping.id}
                    to={`/controls/${mapping.control?.id}`}
                    className="block p-3 bg-surface-800/50 rounded-lg hover:bg-surface-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <LinkIcon className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-mono text-brand-400">
                          {mapping.control?.controlId}
                        </p>
                        <p className="text-sm text-surface-200 truncate">
                          {mapping.control?.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-500 italic">No controls mapped yet</p>
            )}
          </div>
        )}

        {/* Children count for categories */}
        {requirement.isCategory && requirement.children?.length > 0 && (
          <div>
            <p className="text-xs text-surface-500 uppercase tracking-wide mb-1">Sub-requirements</p>
            <p className="text-sm text-surface-300">
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

