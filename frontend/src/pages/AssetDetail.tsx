import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '../lib/api';
import { Asset } from '../lib/apiTypes';
import { Button } from '@/components/Button';
import { SkeletonDetailHeader, SkeletonDetailSection } from '@/components/Skeleton';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Server,
  AlertTriangle,
  X,
  Monitor,
  Smartphone,
  HardDrive,
  Cloud,
  Database,
  Network,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ASSET_TYPES = [
  { value: 'server', label: 'Server', icon: HardDrive },
  { value: 'workstation', label: 'Workstation', icon: Monitor },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'network', label: 'Network', icon: Network },
  { value: 'application', label: 'Application', icon: Database },
  { value: 'data', label: 'Data', icon: Database },
  { value: 'cloud', label: 'Cloud', icon: Cloud },
];

const CRITICALITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-surface-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'workstation',
    category: '',
    status: 'active',
    criticality: 'medium',
    owner: '',
    location: '',
    department: '',
    description: '',
    // BC/DR fields
    rtoHours: undefined as number | undefined,
    rpoHours: undefined as number | undefined,
    bcdrCriticality: '' as string,
    recoveryNotes: '' as string,
  });

  // Fetch asset details
  const { data: asset, isLoading } = useQuery<Asset>({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await assetsApi.get(id!);
      return response.data;
    },
    enabled: !!id,
  });

  // Initialize edit form when asset loads
  useEffect(() => {
    if (asset) {
      setEditForm({
        name: asset.name || '',
        type: asset.type || 'workstation',
        category: asset.category || '',
        status: asset.status || 'active',
        criticality: asset.criticality || 'medium',
        owner: asset.owner || '',
        location: asset.location || '',
        department: asset.department || '',
        description: asset.description || '',
        // BC/DR fields
        rtoHours: (asset as any).rtoHours || undefined,
        rpoHours: (asset as any).rpoHours || undefined,
        bcdrCriticality: (asset as any).bcdrCriticality || '',
        recoveryNotes: (asset as any).recoveryNotes || '',
      });
    }
  }, [asset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const response = await assetsApi.update(id!, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowEditModal(false);
      toast.success('Asset updated successfully');
    },
    onError: () => toast.error('Failed to update asset'),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await assetsApi.delete(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
      navigate('/assets');
    },
    onError: () => toast.error('Failed to delete asset'),
  });

  const getCriticalityColor = (criticality: string) => {
    const level = CRITICALITY_LEVELS.find((l) => l.value === criticality);
    return level?.color || 'bg-surface-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-600';
      case 'inactive':
        return 'bg-surface-500/20 text-surface-600';
      case 'decommissioned':
        return 'bg-red-500/20 text-red-600';
      default:
        return 'bg-surface-500/20 text-surface-600';
    }
  };

  const getTypeIcon = (type: string) => {
    const t = ASSET_TYPES.find((at) => at.value === type);
    const Icon = t?.icon || Server;
    return <Icon className="w-8 h-8 text-surface-600" />;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      default:
        return 'bg-surface-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonDetailHeader />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonDetailSection />
          </div>
          <div>
            <SkeletonDetailSection />
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-600">Asset not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/assets')}
            className="p-2 hover:bg-surface-700 rounded-lg text-surface-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            {getTypeIcon(asset.type)}
            <div>
              <h1 className="text-2xl font-semibold text-white">{asset.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(asset.status || '')}`}
                >
                  {asset.status}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${getCriticalityColor(asset.criticality || '')}`}
                  />
                  <span className="text-surface-600 capitalize text-sm">
                    {asset.criticality} criticality
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowEditModal(true)}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Asset Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 bg-surface-800 rounded-xl border border-surface-700 p-6 space-y-6">
          {asset.description && (
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Description</h3>
              <p className="text-surface-200">{asset.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Type</h3>
              <p className="text-white capitalize">{asset.type}</p>
            </div>
            {asset.category && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Category</h3>
                <p className="text-white">{asset.category}</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-surface-600 mb-2">Source</h3>
              <p className="text-white capitalize">{asset.source}</p>
            </div>
            {asset.externalId && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">External ID</h3>
                <p className="text-white font-mono text-sm">{asset.externalId}</p>
              </div>
            )}
            {asset.owner && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Owner</h3>
                <p className="text-white">{asset.owner}</p>
              </div>
            )}
            {asset.department && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Department</h3>
                <p className="text-white">{asset.department}</p>
              </div>
            )}
            {asset.location && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Location</h3>
                <p className="text-white">{asset.location}</p>
              </div>
            )}
            {asset.lastSyncAt && (
              <div>
                <h3 className="text-sm font-medium text-surface-600 mb-2">Last Synced</h3>
                <p className="text-white">{new Date(asset.lastSyncAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          {asset.metadata && Object.keys(asset.metadata).length > 0 && (
            <div className="border-t border-surface-700 pt-6">
              <h3 className="text-sm font-medium text-surface-600 mb-3">Additional Metadata</h3>
              <div className="bg-surface-700/50 rounded-lg p-4">
                <pre className="text-sm text-surface-700 overflow-x-auto">
                  {JSON.stringify(asset.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Risk Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-surface-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Associated Risks
                </span>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    (asset.riskCount ?? 0) > 0 ? 'bg-red-500/20 text-red-600' : 'text-white'
                  }`}
                >
                  {asset.riskCount ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-600">Created</span>
                <span className="text-surface-200">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-surface-600">Updated</span>
                <span className="text-surface-200">
                  {new Date(asset.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Risks */}
      {asset.risks && asset.risks.length > 0 && (
        <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Associated Risks</h3>
          <div className="space-y-2">
            {asset.risks.map((risk) => (
              <div
                key={risk.id}
                onClick={() => navigate(`/risks/${risk.id}`)}
                className="flex items-center justify-between p-4 bg-surface-700 rounded-lg cursor-pointer hover:bg-surface-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-brand-400 font-mono text-sm">{risk.riskId}</span>
                  <span className="text-white">{risk.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${getRiskLevelColor(risk.inherentRisk)}`}
                    />
                    <span className="text-surface-600 capitalize text-sm">{risk.inherentRisk}</span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      risk.status === 'mitigated'
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : risk.status === 'in_treatment'
                          ? 'bg-amber-500/20 text-amber-600'
                          : 'bg-red-500/20 text-red-600'
                    }`}
                  >
                    {risk.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BC/DR Information */}
      <div className="bg-surface-800 rounded-xl border border-surface-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-400" />
            Business Continuity / Disaster Recovery
          </h3>
          <Link to="/bcdr" className="text-brand-400 text-sm hover:text-brand-300">
            View BC/DR Dashboard →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <h4 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              RTO (Recovery Time)
            </h4>
            <p className="text-white text-lg font-semibold">
              {(asset as any).rtoHours ? `${(asset as any).rtoHours} hours` : 'Not set'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-surface-600 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              RPO (Recovery Point)
            </h4>
            <p className="text-white text-lg font-semibold">
              {(asset as any).rpoHours ? `${(asset as any).rpoHours} hours` : 'Not set'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-surface-600 mb-2">BC/DR Criticality</h4>
            <p className="text-white">
              {(asset as any).bcdrCriticality ? (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    (asset as any).bcdrCriticality === 'tier_1_critical'
                      ? 'bg-red-500/20 text-red-600'
                      : (asset as any).bcdrCriticality === 'tier_2_essential'
                        ? 'bg-orange-500/20 text-orange-600'
                        : (asset as any).bcdrCriticality === 'tier_3_important'
                          ? 'bg-yellow-500/20 text-yellow-600'
                          : 'bg-blue-500/20 text-blue-600'
                  }`}
                >
                  {(asset as any).bcdrCriticality.replace(/_/g, ' ')}
                </span>
              ) : (
                'Not set'
              )}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-surface-600 mb-2">Recovery Strategy</h4>
            <p className="text-white">
              {(asset as any).recoveryStrategyId ? (
                <Link
                  to={`/bcdr/strategies/${(asset as any).recoveryStrategyId}`}
                  className="text-brand-400 hover:text-brand-300"
                >
                  View Strategy →
                </Link>
              ) : (
                <span className="text-surface-500">Not assigned</span>
              )}
            </p>
          </div>
        </div>
        {(asset as any).recoveryNotes && (
          <div className="mt-4 pt-4 border-t border-surface-700">
            <h4 className="text-sm font-medium text-surface-600 mb-2">Recovery Notes</h4>
            <p className="text-surface-200 text-sm">{(asset as any).recoveryNotes}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl border border-surface-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Edit Asset</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-surface-700 rounded-lg text-surface-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMutation.mutate(editForm);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Type *</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  >
                    {ASSET_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  >
                    {STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Criticality
                  </label>
                  <select
                    value={editForm.criticality}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, criticality: e.target.value }))
                    }
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  >
                    {CRITICALITY_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    placeholder="e.g., Web Server"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">Owner</label>
                  <input
                    type="text"
                    value={editForm.owner}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, owner: e.target.value }))}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, department: e.target.value }))
                    }
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="e.g., AWS us-east-1, Office HQ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                  placeholder="Describe this asset..."
                />
              </div>

              {/* BC/DR Fields */}
              <div className="border-t border-surface-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-surface-200 mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-brand-400" />
                  Business Continuity / Disaster Recovery
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      RTO (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.rtoHours ?? ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          rtoHours: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                      placeholder="e.g., 4"
                    />
                    <p className="text-xs text-surface-500 mt-1">Recovery Time Objective</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      RPO (Hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.rpoHours ?? ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          rpoHours: e.target.value ? parseInt(e.target.value) : undefined,
                        }))
                      }
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                      placeholder="e.g., 1"
                    />
                    <p className="text-xs text-surface-500 mt-1">Recovery Point Objective</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      BC/DR Criticality
                    </label>
                    <select
                      value={editForm.bcdrCriticality}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, bcdrCriticality: e.target.value }))
                      }
                      className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    >
                      <option value="">Not set</option>
                      <option value="tier_1_critical">Tier 1 - Critical</option>
                      <option value="tier_2_essential">Tier 2 - Essential</option>
                      <option value="tier_3_important">Tier 3 - Important</option>
                      <option value="tier_4_standard">Tier 4 - Standard</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Recovery Notes
                  </label>
                  <textarea
                    value={editForm.recoveryNotes}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, recoveryNotes: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-white"
                    placeholder="Notes about recovery procedures for this asset..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg hover:bg-surface-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 rounded-xl border border-surface-700 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Asset</h3>
            <p className="text-surface-600 mb-6">
              Are you sure you want to delete "{asset.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-surface-700 text-surface-700 rounded-lg hover:bg-surface-600"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
