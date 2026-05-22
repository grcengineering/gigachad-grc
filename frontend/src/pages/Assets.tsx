import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assetsApi, integrationsApi } from '../lib/api';
import { Asset } from '../lib/apiTypes';
import {
  Server,
  Plus,
  Search,
  RefreshCw,
  Monitor,
  Smartphone,
  HardDrive,
  Cloud,
  Database,
  Network,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/Skeleton';
import { ExportDropdown } from '@/components/ExportDropdown';
import { exportConfigs } from '@/lib/export';
import toast from 'react-hot-toast';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';
import { Dialog } from '@/components/ui/Dialog';

interface AssetListResponse {
  assets: Asset[];
  total: number;
  page?: number;
  limit?: number;
}

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
  { value: 'active', label: 'Active', color: 'bg-emerald-500/20 text-emerald-600' },
  { value: 'inactive', label: 'Inactive', color: 'bg-surface-500/20 text-surface-600' },
  { value: 'decommissioned', label: 'Decommissioned', color: 'bg-red-500/20 text-red-600' },
];

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    type: 'workstation',
    category: '',
    criticality: 'medium',
    owner: '',
    location: '',
    department: '',
  });

  // Get filters from URL
  const filters = {
    search: searchParams.get('search') || '',
    source: searchParams.get('source') || '',
    type: searchParams.get('type') || '',
    status: searchParams.get('status') || '',
    criticality: searchParams.get('criticality') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key !== 'page') {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  // Fetch assets
  const { data, isLoading } = useQuery<AssetListResponse>({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params: any = { page: filters.page, limit: 25 };
      if (filters.search) params.search = filters.search;
      if (filters.source) params.source = filters.source;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.criticality) params.criticality = filters.criticality;
      const response = await assetsApi.list(params);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['assets', 'stats'],
    queryFn: async () => {
      const response = await assetsApi.getStats();
      return response.data;
    },
  });

  // Fetch sources for filter
  const { data: sources } = useQuery({
    queryKey: ['assets', 'sources'],
    queryFn: async () => {
      const response = await assetsApi.getSources();
      return response.data;
    },
  });

  // Create asset mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newAsset) => {
      const response = await assetsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowCreateModal(false);
      setNewAsset({
        name: '',
        type: 'workstation',
        category: '',
        criticality: 'medium',
        owner: '',
        location: '',
        department: '',
      });
      toast.success('Asset created successfully');
    },
    onError: () => {
      toast.error('Failed to create asset');
    },
  });

  const getCriticalityColor = (criticality: string) => {
    const level = CRITICALITY_LEVELS.find((l) => l.value === criticality);
    return level?.color || 'bg-surface-500';
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find((st) => st.value === status);
    return s?.color || 'bg-surface-500/20 text-surface-600';
  };

  const getTypeIcon = (type: string) => {
    const t = ASSET_TYPES.find((at) => at.value === type);
    const Icon = t?.icon || Server;
    return <Icon className="w-5 h-5 text-surface-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Asset Inventory</h1>
          <p className="text-surface-600 mt-1">
            View and manage organizational assets synced from integrations
          </p>
        </div>
        <div className="flex gap-3">
          <ExportDropdown
            data={data?.assets || []}
            columns={exportConfigs.assets}
            filename="assets"
            sheetName="Assets"
            disabled={isLoading || !data?.assets?.length}
          />
          <Button
            variant="secondary"
            onClick={() => setShowSyncModal(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Sync Assets
          </Button>
          <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Asset
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 dark:bg-surface-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 rounded-lg">
                <Server className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-surface-600">Total Assets</p>
                <p className="text-2xl font-semibold text-white">{stats.totalAssets}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 dark:bg-surface-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-surface-600">Active</p>
                <p className="text-2xl font-semibold text-white">
                  {stats.byStatus?.find((s: any) => s.status === 'active')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 dark:bg-surface-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-surface-600">Critical</p>
                <p className="text-2xl font-semibold text-white">
                  {stats.byCriticality?.find((c: any) => c.criticality === 'critical')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-4 dark:bg-surface-900">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-surface-600">Recently Synced</p>
                <p className="text-2xl font-semibold text-white">{stats.recentlySynced || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 dark:bg-surface-900">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
            <Input
              type="text"
              placeholder="Search assets..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <SelectNative
              value={filters.source}
              onChange={(e) => updateFilter('source', e.target.value)}
              className="px-3 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Sources</option>
              {sources?.map((source: string) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={filters.type}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="px-3 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={filters.criticality}
              onChange={(e) => updateFilter('criticality', e.target.value)}
              className="px-3 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Criticality</option>
              {CRITICALITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </SelectNative>

            <SelectNative
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="px-3 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      </div>
      {/* Assets Table */}
      <div className="bg-white rounded-xl border border-surface-200 overflow-hidden dark:bg-surface-900">
        {isLoading ? (
          <SkeletonTable rows={10} columns={7} className="border-none" />
        ) : data?.assets.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="w-12 h-12 text-surface-500 mx-auto mb-4" />
            <p className="text-surface-600">No assets found</p>
            <p className="text-surface-500 text-sm mt-2">
              Sync assets from integrations or add them manually
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">Asset</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">Source</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">
                  Criticality
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-surface-600">
                  Risks
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-surface-600">
                  Last Synced
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.assets.map((asset) => (
                <tr
                  key={asset.id}
                  onClick={() => navigate(`/assets/${asset.id}`)}
                  className="border-b border-surface-200 hover:bg-surface-200/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(asset.type)}
                      <div>
                        <p className="text-white font-medium">{asset.name}</p>
                        {asset.owner && <p className="text-surface-600 text-sm">{asset.owner}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-surface-700 capitalize">{asset.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-surface-700 capitalize">{asset.source}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${getCriticalityColor(asset.criticality || '')}`}
                      />
                      <span className="text-surface-700 capitalize">{asset.criticality}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(asset.status || '')}`}
                    >
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(asset.riskCount ?? 0) > 0 ? (
                      <span className="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm">
                        {asset.riskCount ?? 0}
                      </span>
                    ) : (
                      <span className="text-surface-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {asset.lastSyncAt ? (
                      <span className="text-surface-600 text-sm">
                        {new Date(asset.lastSyncAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-surface-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.total > 25 && (
          <div className="px-4 py-3 border-t border-surface-200 flex items-center justify-between">
            <p className="text-sm text-surface-600">
              Showing {(filters.page - 1) * 25 + 1} to {Math.min(filters.page * 25, data.total)} of{' '}
              {data.total} assets
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateFilter('page', String(filters.page - 1))}
                disabled={filters.page === 1}
                className="px-3 py-1 bg-surface-200 rounded text-surface-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-600"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilter('page', String(filters.page + 1))}
                disabled={filters.page * 25 >= data.total}
                className="px-3 py-1 bg-surface-200 rounded text-surface-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-600"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Create Asset Modal */}
      {showCreateModal && (
        <CreateAssetModal
          asset={newAsset}
          onChange={setNewAsset}
          onSubmit={() => createMutation.mutate(newAsset)}
          onClose={() => setShowCreateModal(false)}
          isPending={createMutation.isPending}
        />
      )}
      {/* Sync Modal */}
      {showSyncModal && (
        <SyncAssetModal
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            setShowSyncModal(false);
          }}
        />
      )}
    </div>
  );
}

// Create Asset Modal Component
function CreateAssetModal({
  asset,
  onChange,
  onSubmit,
  onClose,
  isPending,
}: {
  asset: any;
  onChange: (asset: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open onClose={onClose}>
      <div className="p-4 border-b border-surface-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Add Manual Asset</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-200 rounded">
          <X className="w-5 h-5 text-surface-600" />
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="p-4 space-y-4"
      >
        <div>
          <label className="block text-sm text-surface-600 mb-2">Name *</label>
          <Input
            type="text"
            value={asset.name}
            onChange={(e) => onChange({ ...asset, name: e.target.value })}
            required
            className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            placeholder="e.g., Production Server 1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Type *</label>
            <SelectNative
              value={asset.type}
              onChange={(e) => onChange({ ...asset, type: e.target.value })}
              className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectNative>
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-2">Criticality</label>
            <SelectNative
              value={asset.criticality}
              onChange={(e) => onChange({ ...asset, criticality: e.target.value })}
              className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            >
              {CRITICALITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-2">Category</label>
          <Input
            type="text"
            value={asset.category}
            onChange={(e) => onChange({ ...asset, category: e.target.value })}
            className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            placeholder="e.g., Web Server, Database"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-surface-600 mb-2">Owner</label>
            <Input
              type="text"
              value={asset.owner}
              onChange={(e) => onChange({ ...asset, owner: e.target.value })}
              className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-surface-600 mb-2">Department</label>
            <Input
              type="text"
              value={asset.department}
              onChange={(e) => onChange({ ...asset, department: e.target.value })}
              className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-surface-600 mb-2">Location</label>
          <Input
            type="text"
            value={asset.location}
            onChange={(e) => onChange({ ...asset, location: e.target.value })}
            className="w-full px-4 py-2 bg-surface-200 border border-surface-300 rounded-lg text-white"
            placeholder="e.g., AWS us-east-1, Office HQ"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            Create Asset
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// Sync Modal Component
function SyncAssetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [syncResult, setSyncResult] = useState<any>(null);

  // Fetch integrations that can provide assets
  const { data: integrations } = useQuery({
    queryKey: ['integrations', 'asset-sources'],
    queryFn: async () => {
      const response = await integrationsApi.list({ status: 'active' });
      // Filter to only show integrations that support asset sync (e.g., Jamf)
      return (response.data || []).filter((i: any) => ['jamf'].includes(i.type));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const integration = integrations?.find((i: any) => i.id === selectedIntegration);
      if (!integration) throw new Error('Integration not found');
      const response = await assetsApi.syncFromSource(integration.type, integration.id);
      return response.data;
    },
    onSuccess: (data) => {
      setSyncResult(data);
    },
  });

  return (
    <Dialog open onClose={onClose}>
      <div className="p-4 border-b border-surface-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-white">Sync Assets from Integration</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-200 rounded">
          <X className="w-5 h-5 text-surface-600" />
        </button>
      </div>
      <div className="p-4 space-y-4">
        {syncResult ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg ${syncResult.itemsFailed === 0 ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}
            >
              <h4
                className={`font-medium ${syncResult.itemsFailed === 0 ? 'text-emerald-600' : 'text-amber-600'}`}
              >
                Sync Complete
              </h4>
              <div className="mt-2 space-y-1 text-sm">
                <p className="text-surface-700">Items processed: {syncResult.itemsProcessed}</p>
                <p className="text-surface-700">Items created/updated: {syncResult.itemsCreated}</p>
                <p className="text-surface-700">Items failed: {syncResult.itemsFailed}</p>
                <p className="text-surface-700">Duration: {syncResult.duration}ms</p>
              </div>
              {syncResult.errors?.length > 0 && (
                <div className="mt-3">
                  <p className="text-red-600 text-sm font-medium">Errors:</p>
                  <ul className="text-red-700 text-sm mt-1 list-disc list-inside">
                    {syncResult.errors.slice(0, 5).map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={onSuccess} className="px-4 py-2 bg-brand-500 text-white rounded-lg">
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm text-surface-600 mb-2">Select Integration</label>
              {integrations?.length === 0 ? (
                <p className="text-surface-500 py-4">
                  No integrations available for asset sync. Configure a Jamf integration first.
                </p>
              ) : (
                <div className="space-y-2">
                  {integrations?.map((integration: any) => (
                    <label
                      key={integration.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                        selectedIntegration === integration.id
                          ? 'bg-brand-500/20 border border-brand-500'
                          : 'bg-surface-200 border border-surface-300 hover:bg-surface-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="integration"
                        value={integration.id}
                        checked={selectedIntegration === integration.id}
                        onChange={(e) => setSelectedIntegration(e.target.value)}
                        className="sr-only"
                      />
                      <div>
                        <p className="text-white font-medium">{integration.name}</p>
                        <p className="text-surface-600 text-sm capitalize">{integration.type}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface-200 text-surface-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={!selectedIntegration || syncMutation.isPending}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {syncMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
                {syncMutation.isPending ? 'Syncing...' : 'Start Sync'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
