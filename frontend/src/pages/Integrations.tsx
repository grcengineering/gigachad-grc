import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CloudIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  XMarkIcon,
  CodeBracketIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import CustomConfigModal from '@/components/integrations/CustomConfigModal';
import { IntegrationIcon } from '@/components/IntegrationIcon';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  active: {
    label: 'Active',
    icon: CheckCircleIcon,
    color: 'text-green-400',
    badge: 'badge-success',
  },
  inactive: {
    label: 'Inactive',
    icon: XCircleIcon,
    color: 'text-surface-400',
    badge: 'badge-neutral',
  },
  error: {
    label: 'Error',
    icon: ExclamationTriangleIcon,
    color: 'text-red-400',
    badge: 'badge-danger',
  },
  pending_setup: {
    label: 'Setup Required',
    icon: CogIcon,
    color: 'text-yellow-400',
    badge: 'badge-warning',
  },
};

const TYPE_ICONS: Record<string, string> = {
  aws: '🔶',
  gcp: '🔷',
  azure: '🔵',
  github: '🐙',
  gitlab: '🦊',
  okta: '🔐',
  azure_ad: '🔷',
  jamf: '🍎',
  jira: '📋',
  slack: '💬',
  custom: '🔗',
};

export default function Integrations() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [preselectedType, setPreselectedType] = useState<string | undefined>(undefined);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCustomConfigModal, setShowCustomConfigModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: integrationTypes, isLoading } = useQuery({
    queryKey: ['integration-types'],
    queryFn: () => integrationsApi.getTypes().then((res) => res.data),
  });

  const { data: integrationsData } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list().then((res) => res.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['integrations-stats'],
    queryFn: () => integrationsApi.getStats().then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-stats'] });
      toast.success('Integration deleted');
    },
    onError: () => {
      toast.error('Failed to delete integration');
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.testConnection(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    },
    onError: () => {
      toast.error('Connection test failed');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.triggerSync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Sync triggered');
    },
    onError: () => {
      toast.error('Failed to trigger sync');
    },
  });

  const createdIntegrations = integrationsData?.data || [];

  // Create map of created integrations by type
  const createdIntegrationsMap = createdIntegrations.reduce((acc: any, integration: any) => {
    acc[integration.type] = integration;
    return acc;
  }, {});

  // Group integration types by category
  const groupedIntegrations: Record<string, Array<{ type: string; meta: any; integration?: any }>> = {};

  if (integrationTypes) {
    Object.entries(integrationTypes).forEach(([type, meta]: [string, any]) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = meta.name.toLowerCase().includes(query);
        const matchesDescription = meta.description?.toLowerCase().includes(query);
        const matchesCategory = meta.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesCategory) {
          return; // Skip this integration
        }
      }

      const category = meta.category || 'Other';
      if (!groupedIntegrations[category]) {
        groupedIntegrations[category] = [];
      }
      groupedIntegrations[category].push({
        type,
        meta,
        integration: createdIntegrationsMap[type], // undefined if not created yet
      });
    });

    // Sort each category alphabetically
    Object.keys(groupedIntegrations).forEach(category => {
      groupedIntegrations[category].sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    });
  }

  const handleViewDetails = (integration: any) => {
    setSelectedIntegration(integration);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Integrations</h1>
          <p className="text-surface-400 mt-1">
            Connect external services for automated evidence collection
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Integration
        </button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search integrations by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-surface-400">Available Integrations</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {integrationTypes ? Object.keys(integrationTypes).length : 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-400">Configured</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {stats?.total || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-400">Active</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">
            {stats?.byStatus?.active || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-400">Evidence Collected</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">
            {stats?.totalEvidenceCollected || 0}
          </p>
        </div>
      </div>

      {/* Integrations by Category */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-surface-700 rounded-full border-t-brand-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedIntegrations)
            .sort(([catA], [catB]) => catA.localeCompare(catB))
            .map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-surface-200 mb-4 flex items-center gap-2">
                  {category}
                  <span className="text-sm font-normal text-surface-500">({items.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(({ type, meta, integration }) => {
                    const isConfigured = !!integration;
                    const status = integration?.status || 'not_configured';
                    const statusConfig = STATUS_CONFIG[status] || {
                      label: 'Not Configured',
                      icon: CogIcon,
                      color: 'text-surface-500',
                      badge: 'badge-neutral',
                    };
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={type}
                        className={clsx(
                          'card p-6 transition-colors cursor-pointer',
                          isConfigured ? 'hover:border-surface-700' : 'hover:border-brand-500/50 opacity-75'
                        )}
                        onClick={() => {
                          if (isConfigured) {
                            handleViewDetails(integration);
                          } else {
                            setPreselectedType(type);
                            setShowAddModal(true);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-800 rounded-lg flex items-center justify-center">
                              <IntegrationIcon
                                iconSlug={meta.iconSlug || type}
                                integrationName={meta.name}
                                className="w-6 h-6 text-surface-100"
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-surface-100">{meta.name}</h3>
                              <span className={clsx('badge text-xs', statusConfig.badge)}>
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                          <StatusIcon className={clsx('w-5 h-5', statusConfig.color)} />
                        </div>

                        <p className="text-sm text-surface-400 mb-4 line-clamp-2">
                          {meta.description}
                        </p>

                        {integration?.lastSyncError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                            <p className="text-xs text-red-400 truncate">{integration.lastSyncError}</p>
                          </div>
                        )}

                        {meta.apiDocs && (
                          <a
                            href={meta.apiDocs}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mb-4"
                          >
                            API Documentation →
                          </a>
                        )}

                        {isConfigured ? (
                          <>
                            <div className="flex items-center justify-between text-xs text-surface-500 pt-4 border-t border-surface-800">
                              <span>
                                {integration.lastSyncAt
                                  ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleDateString()}`
                                  : 'Never synced'}
                              </span>
                              <span>{integration.totalEvidenceCollected} evidence</span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-800">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(integration);
                                }}
                                className="flex-1 btn-secondary text-sm py-1.5"
                              >
                                <EyeIcon className="w-4 h-4 mr-1" />
                                Configure
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testMutation.mutate(integration.id);
                                }}
                                disabled={testMutation.isPending}
                                className="p-1.5 text-surface-400 hover:text-surface-100 hover:bg-surface-800 rounded transition-colors"
                                title="Test Connection"
                              >
                                <ArrowPathIcon className={clsx('w-4 h-4', testMutation.isPending && 'animate-spin')} />
                              </button>
                              {integration.status === 'active' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncMutation.mutate(integration.id);
                                  }}
                                  disabled={syncMutation.isPending}
                                  className="p-1.5 text-surface-400 hover:text-green-400 hover:bg-surface-800 rounded transition-colors"
                                  title="Trigger Sync"
                                >
                                  <PlayIcon className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this integration?')) {
                                    deleteMutation.mutate(integration.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-surface-400 hover:text-red-400 hover:bg-surface-800 rounded transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="pt-4 border-t border-surface-800 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreselectedType(type);
                                setShowAddModal(true);
                              }}
                              className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-2 mx-auto"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Click to Configure
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Integration Modal */}
      {showAddModal && (
        <AddIntegrationModal
          integrationTypes={integrationTypes || {}}
          preselectedType={preselectedType}
          onClose={() => {
            setShowAddModal(false);
            setPreselectedType(undefined);
          }}
        />
      )}

      {/* Integration Detail/Edit Modal */}
      {showDetailModal && selectedIntegration && (
        <IntegrationDetailModal
          integration={selectedIntegration}
          integrationTypes={integrationTypes || {}}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedIntegration(null);
          }}
          onOpenCustomConfig={() => {
            setShowDetailModal(false);
            setShowCustomConfigModal(true);
          }}
        />
      )}

      {/* Custom Integration Config Modal */}
      {showCustomConfigModal && selectedIntegration && (
        <CustomConfigModal
          integrationId={selectedIntegration.id}
          integrationName={selectedIntegration.name}
          isOpen={showCustomConfigModal}
          onClose={() => {
            setShowCustomConfigModal(false);
            setSelectedIntegration(null);
          }}
        />
      )}
    </div>
  );
}

function AddIntegrationModal({
  integrationTypes,
  preselectedType,
  onClose,
}: {
  integrationTypes: Record<string, any>;
  preselectedType?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'select' | 'configure'>(preselectedType ? 'configure' : 'select');
  const [selectedType, setSelectedType] = useState<string>(preselectedType || '');
  const [name, setName] = useState(preselectedType ? integrationTypes[preselectedType]?.name || preselectedType : '');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => integrationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-stats'] });
      toast.success('Integration created');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create integration');
    },
  });

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setName(integrationTypes[type]?.name || type);
    setStep('configure');
  };

  const handleCreate = () => {
    createMutation.mutate({
      type: selectedType,
      name,
      description,
      config,
    });
  };

  const typeMeta = integrationTypes[selectedType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">
              {step === 'select' ? 'Add Integration' : `Configure ${typeMeta?.name || selectedType}`}
            </h2>
            <p className="text-sm text-surface-400 mt-1">
              {step === 'select'
                ? 'Select an integration type to configure'
                : 'Enter connection details for this integration'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' ? (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(integrationTypes).map(([type, meta]: [string, any]) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="p-4 text-left bg-surface-800 hover:bg-surface-700 rounded-lg border border-surface-700 hover:border-surface-600 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{TYPE_ICONS[type] || '🔗'}</span>
                    <span className="font-medium text-surface-100">{meta.name}</span>
                  </div>
                  <p className="text-xs text-surface-400 line-clamp-2">{meta.description}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input mt-1"
                  placeholder="Integration name"
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input mt-1"
                  rows={2}
                  placeholder="Brief description"
                />
              </div>

              {typeMeta?.configFields?.length > 0 && (
                <div className="pt-4 border-t border-surface-800">
                  <h3 className="text-sm font-medium text-surface-200 mb-3">Connection Settings</h3>
                  <div className="space-y-3">
                    {typeMeta.configFields.map((field: any) => (
                      <div key={field.key}>
                        <label className="label">
                          {field.label}
                          {field.required && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={config[field.key] || ''}
                            onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                            className="input mt-1 font-mono text-sm"
                            rows={4}
                            placeholder={field.label}
                          />
                        ) : (
                          <input
                            type={field.type === 'password' ? 'password' : 'text'}
                            value={config[field.key] || ''}
                            onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                            className="input mt-1"
                            placeholder={field.label}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 p-6 border-t border-surface-800">
          {step === 'configure' && !preselectedType && (
            <button onClick={() => setStep('select')} className="btn-secondary">
              Back
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={handleCreate}
                disabled={!name || createMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Integration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationDetailModal({
  integration,
  integrationTypes,
  onClose,
  onOpenCustomConfig,
}: {
  integration: any;
  integrationTypes: Record<string, any>;
  onClose: () => void;
  onOpenCustomConfig: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(integration.name);
  const [description, setDescription] = useState(integration.description || '');
  const [config, setConfig] = useState<Record<string, string>>(integration.config || {});
  const [status, setStatus] = useState(integration.status);

  const updateMutation = useMutation({
    mutationFn: (data: any) => integrationsApi.update(integration.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration updated');
      onClose();
    },
    onError: () => {
      toast.error('Failed to update integration');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => integrationsApi.testConnection(integration.id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name,
      description,
      status,
      config,
    });
  };

  const typeMeta = integrationTypes[integration.type] || integration.typeMeta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{TYPE_ICONS[integration.type] || '🔗'}</span>
            <div>
              <h2 className="text-lg font-semibold text-surface-100">{integration.name}</h2>
              <p className="text-sm text-surface-400">{typeMeta?.name || integration.type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input mt-1"
              >
                <option value="pending_setup">Setup Required</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
              rows={2}
            />
          </div>

          {typeMeta?.configFields?.length > 0 && (
            <div className="pt-4 border-t border-surface-800">
              <h3 className="text-sm font-medium text-surface-200 mb-3">Connection Settings</h3>
              <div className="space-y-3">
                {typeMeta.configFields.map((field: any) => (
                  <div key={field.key}>
                    <label className="label">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={config[field.key] || ''}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="input mt-1 font-mono text-sm"
                        rows={4}
                        placeholder={`Enter new ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : 'text'}
                        value={config[field.key] || ''}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="input mt-1"
                        placeholder={`Enter new ${field.label.toLowerCase()}`}
                      />
                    )}
                    {field.type === 'password' && config[field.key]?.startsWith('••••') && (
                      <p className="text-xs text-surface-500 mt-1">
                        Leave blank to keep existing value
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom API Editor Button */}
          <div className="pt-4 border-t border-surface-800">
            <h3 className="text-sm font-medium text-surface-200 mb-3">Advanced Configuration</h3>
            <button
              onClick={onOpenCustomConfig}
              className="w-full p-4 bg-surface-800 hover:bg-surface-700 rounded-lg border border-surface-700 hover:border-brand-500/50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/20 rounded-lg group-hover:bg-brand-500/30 transition-colors">
                  <CodeBracketIcon className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                  <p className="font-medium text-surface-100">Custom API Editor</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Configure custom endpoints or write JavaScript code to define how data is collected
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Sync History */}
          {integration.syncJobs?.length > 0 && (
            <div className="pt-4 border-t border-surface-800">
              <h3 className="text-sm font-medium text-surface-200 mb-3">Recent Sync Jobs</h3>
              <div className="space-y-2">
                {integration.syncJobs.slice(0, 5).map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-2 bg-surface-800 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'w-2 h-2 rounded-full',
                          job.status === 'completed' ? 'bg-green-400' :
                          job.status === 'failed' ? 'bg-red-400' :
                          job.status === 'running' ? 'bg-blue-400 animate-pulse' :
                          'bg-surface-500'
                        )}
                      />
                      <span className="text-surface-300 capitalize">{job.status}</span>
                    </div>
                    <span className="text-surface-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 p-6 border-t border-surface-800">
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="btn-secondary"
          >
            <ArrowPathIcon className={clsx('w-4 h-4 mr-2', testMutation.isPending && 'animate-spin')} />
            Test Connection
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="btn-primary"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
