import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assetsApi, integrationsApi } from '../lib/api';
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
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Button,
  Badge,
  Card,
  CardBody,
  Input,
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

interface Asset {
  id: string;
  externalId?: string;
  source: string;
  name: string;
  type: string;
  category?: string;
  status: string;
  criticality: string;
  owner?: string;
  location?: string;
  department?: string;
  metadata?: Record<string, unknown>;
  lastSyncAt?: string;
  riskCount: number;
  createdAt: string;
}

interface AssetListResponse {
  assets: Asset[];
  total: number;
  page: number;
  limit: number;
}

const TYPE_ICON: Record<string, typeof Server> = {
  server: HardDrive,
  workstation: Monitor,
  mobile: Smartphone,
  network: Network,
  application: Database,
  data: Database,
  cloud: Cloud,
};

const TYPE_OPTS = [
  { value: 'server', label: 'Server' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'network', label: 'Network' },
  { value: 'application', label: 'Application' },
  { value: 'data', label: 'Data' },
  { value: 'cloud', label: 'Cloud' },
];

const CRITICALITY_OPTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const CRITICALITY_DOT: Record<string, string> = {
  low: 'bg-surface-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

const STATUS_OPTS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
  decommissioned: 'danger',
};

const PAGE_SIZE = 25;

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: 'brand' | 'emerald' | 'red' | 'amber' }) {
  const tones = {
    brand: 'bg-brand-500/10 text-brand-700',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    red: 'bg-red-500/10 text-red-600',
    amber: 'bg-amber-500/10 text-amber-700',
  };
  return (
    <Card>
      <CardBody density="cozy" className="flex items-center gap-3">
        <div className={cn('p-2 rounded-md', tones[tone])}>{icon}</div>
        <div>
          <p className="text-xs text-surface-500 uppercase tracking-wider">{label}</p>
          <p className="text-h1 text-surface-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

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
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams(searchParams);
    ['search', 'source', 'type', 'status', 'criticality', 'page'].forEach((k) => params.delete(k));
    setSearchParams(params);
  };

  const { data, isLoading } = useQuery<AssetListResponse>({
    queryKey: ['assets', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, limit: PAGE_SIZE };
      if (filters.search) params.search = filters.search;
      if (filters.source) params.source = filters.source;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.criticality) params.criticality = filters.criticality;
      const response = await assetsApi.list(params);
      return response.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['assets', 'stats'],
    queryFn: () => assetsApi.getStats().then((r) => r.data),
  });

  const { data: sources } = useQuery<string[]>({
    queryKey: ['assets', 'sources'],
    queryFn: () => assetsApi.getSources().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof newAsset) => assetsApi.create(payload).then((r) => r.data),
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
    },
  });

  const sourceOptions = (sources || []).map((s) => ({ value: s, label: s }));

  const activeFilters: ActiveFilter[] = [];
  if (filters.search) activeFilters.push({ key: 'search', label: `Search: ${filters.search}`, onClear: () => updateFilter('search', '') });
  if (filters.source) activeFilters.push({ key: 'source', label: `Source: ${filters.source}`, onClear: () => updateFilter('source', '') });
  if (filters.type) {
    const l = TYPE_OPTS.find((o) => o.value === filters.type)?.label ?? filters.type;
    activeFilters.push({ key: 'type', label: `Type: ${l}`, onClear: () => updateFilter('type', '') });
  }
  if (filters.criticality) {
    const l = CRITICALITY_OPTS.find((o) => o.value === filters.criticality)?.label ?? filters.criticality;
    activeFilters.push({ key: 'criticality', label: `Criticality: ${l}`, onClear: () => updateFilter('criticality', '') });
  }
  if (filters.status) {
    const l = STATUS_OPTS.find((o) => o.value === filters.status)?.label ?? filters.status;
    activeFilters.push({ key: 'status', label: `Status: ${l}`, onClear: () => updateFilter('status', '') });
  }

  const columns: DataTableColumn<Asset>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Asset',
      mobileLabel: 'Asset',
      cell: ({ row }) => {
        const Icon = TYPE_ICON[row.original.type] || Server;
        return (
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-surface-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-surface-900 font-medium truncate">{row.original.name}</p>
              {row.original.owner && <p className="text-xs text-surface-500 truncate">{row.original.owner}</p>}
            </div>
          </div>
        );
      },
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      mobileLabel: 'Type',
      cell: ({ row }) => <span className="capitalize text-surface-700">{row.original.type}</span>,
    },
    {
      id: 'source',
      accessorKey: 'source',
      header: 'Source',
      mobileLabel: 'Source',
      cell: ({ row }) => <span className="capitalize text-surface-700">{row.original.source}</span>,
    },
    {
      id: 'criticality',
      accessorKey: 'criticality',
      header: 'Criticality',
      mobileLabel: 'Criticality',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', CRITICALITY_DOT[row.original.criticality] || 'bg-surface-500')} />
          <span className="capitalize text-surface-700">{row.original.criticality}</span>
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'riskCount',
      accessorKey: 'riskCount',
      header: 'Risks',
      mobileLabel: 'Risks',
      cell: ({ row }) =>
        row.original.riskCount > 0 ? (
          <Badge variant="danger">{row.original.riskCount}</Badge>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
    {
      id: 'lastSync',
      accessorKey: 'lastSyncAt',
      header: 'Last Synced',
      mobileLabel: 'Last Synced',
      cell: ({ row }) =>
        row.original.lastSyncAt ? (
          <span className="text-small text-surface-600">
            {new Date(row.original.lastSyncAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-surface-500">—</span>
        ),
    },
  ];

  const assets = data?.assets ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Asset Inventory"
        description="View and manage organizational assets synced from integrations."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => setShowSyncModal(true)}
            >
              Sync Assets
            </Button>
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
              Add Asset
            </Button>
          </>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Server className="h-5 w-5" />} label="Total" value={stats.totalAssets ?? 0} tone="brand" />
          <StatCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Active"
            value={stats.byStatus?.find((s: { status: string; count: number }) => s.status === 'active')?.count || 0}
            tone="emerald"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Critical"
            value={
              stats.byCriticality?.find((c: { criticality: string; count: number }) => c.criticality === 'critical')
                ?.count || 0
            }
            tone="red"
          />
          <StatCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Recently Synced"
            value={stats.recentlySynced ?? 0}
            tone="amber"
          />
        </div>
      )}

      <FilterBar active={activeFilters} onClearAll={activeFilters.length ? clearAllFilters : undefined}>
        <Input
          inputSize="sm"
          className="w-64"
          placeholder="Search assets…"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-40"
          placeholder="All Sources"
          value={filters.source}
          onChange={(v) => updateFilter('source', v)}
          options={sourceOptions}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-40"
          placeholder="All Types"
          value={filters.type}
          onChange={(v) => updateFilter('type', v)}
          options={TYPE_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-40"
          placeholder="All Criticality"
          value={filters.criticality}
          onChange={(v) => updateFilter('criticality', v)}
          options={CRITICALITY_OPTS}
          clearable
        />
        <Select
          size="sm"
          fullWidth={false}
          className="w-40"
          placeholder="All Statuses"
          value={filters.status}
          onChange={(v) => updateFilter('status', v)}
          options={STATUS_OPTS}
          clearable
        />
      </FilterBar>

      <DataTable
        data={assets}
        columns={columns}
        loading={isLoading}
        getRowId={(a) => a.id}
        onRowClick={(a) => navigate(`/assets/${a.id}`)}
        emptyState={
          <EmptyState
            icon={<Server className="h-8 w-8" />}
            title="No assets found"
            description={
              activeFilters.length
                ? 'Try clearing your filters.'
                : 'Sync assets from integrations or add them manually.'
            }
            action={
              activeFilters.length ? (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>Clear filters</Button>
              ) : (
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
                  Add Asset
                </Button>
              )
            }
          />
        }
      />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-surface-500">
          <span>
            Showing {(filters.page - 1) * PAGE_SIZE + 1}–{Math.min(filters.page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => updateFilter('page', String(filters.page - 1))}
            >
              Previous
            </Button>
            <span>
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page * PAGE_SIZE >= total}
              onClick={() => updateFilter('page', String(filters.page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Manual Asset"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              disabled={!newAsset.name}
              onClick={() => createMutation.mutate(newAsset)}
            >
              Create Asset
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="asset-name" required>Name</Label>
            <Input
              id="asset-name"
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              placeholder="e.g., Production Server 1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Type</Label>
              <Select value={newAsset.type} onChange={(v) => setNewAsset({ ...newAsset, type: v })} options={TYPE_OPTS} />
            </div>
            <div>
              <Label>Criticality</Label>
              <Select
                value={newAsset.criticality}
                onChange={(v) => setNewAsset({ ...newAsset, criticality: v })}
                options={CRITICALITY_OPTS}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="asset-category">Category</Label>
            <Input
              id="asset-category"
              value={newAsset.category}
              onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
              placeholder="e.g., Web Server, Database"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="asset-owner">Owner</Label>
              <Input
                id="asset-owner"
                value={newAsset.owner}
                onChange={(e) => setNewAsset({ ...newAsset, owner: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="asset-dept">Department</Label>
              <Input
                id="asset-dept"
                value={newAsset.department}
                onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="asset-location">Location</Label>
            <Input
              id="asset-location"
              value={newAsset.location}
              onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
              placeholder="e.g., AWS us-east-1, Office HQ"
            />
          </div>
        </div>
      </Dialog>

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

interface Integration {
  id: string;
  name: string;
  type: string;
}

interface SyncResult {
  itemsProcessed: number;
  itemsCreated: number;
  itemsFailed: number;
  duration: number;
  errors?: string[];
}

function SyncAssetModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const { data: integrations } = useQuery<Integration[]>({
    queryKey: ['integrations', 'asset-sources'],
    queryFn: async () => {
      const response = await integrationsApi.list({ status: 'active' });
      return response.data.integrations.filter((i: Integration) => ['jamf'].includes(i.type));
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const integration = integrations?.find((i) => i.id === selectedIntegration);
      if (!integration) throw new Error('Integration not found');
      const response = await assetsApi.syncFromSource(integration.type, integration.id);
      return response.data as SyncResult;
    },
    onSuccess: (data) => setSyncResult(data),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Sync Assets from Integration"
      size="md"
      footer={
        syncResult ? (
          <Button onClick={onSuccess}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              loading={syncMutation.isPending}
              disabled={!selectedIntegration}
              onClick={() => syncMutation.mutate()}
              leftIcon={syncMutation.isPending ? undefined : <RefreshCw className="h-4 w-4" />}
            >
              Start Sync
            </Button>
          </>
        )
      }
    >
      {syncResult ? (
        <div className="space-y-3">
          <div className={cn('p-4 rounded-md', syncResult.itemsFailed === 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10')}>
            <h4 className={cn('font-medium', syncResult.itemsFailed === 0 ? 'text-emerald-600' : 'text-amber-700')}>
              Sync Complete
            </h4>
            <div className="mt-2 space-y-0.5 text-small text-surface-700">
              <p>Items processed: {syncResult.itemsProcessed}</p>
              <p>Items created/updated: {syncResult.itemsCreated}</p>
              <p>Items failed: {syncResult.itemsFailed}</p>
              <p>Duration: {syncResult.duration}ms</p>
            </div>
            {syncResult.errors && syncResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-red-600 text-small font-medium">Errors:</p>
                <ul className="text-red-700 text-small mt-1 list-disc list-inside">
                  {syncResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <Label>Select Integration</Label>
          {(!integrations || integrations.length === 0) ? (
            <p className="text-small text-surface-500 py-3">
              No integrations available for asset sync. Configure a Jamf integration first.
            </p>
          ) : (
            <div className="space-y-2">
              {integrations.map((integration) => (
                <label
                  key={integration.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors',
                    selectedIntegration === integration.id
                      ? 'bg-brand-500/10 border border-brand-500/40'
                      : 'bg-surface-100 border border-surface-300 hover:bg-surface-200',
                  )}
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
                    <p className="text-surface-900 font-medium">{integration.name}</p>
                    <p className="text-xs text-surface-500 capitalize">{integration.type}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
