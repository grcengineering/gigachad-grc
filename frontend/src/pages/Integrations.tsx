import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
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
import { Button, Input, Textarea, Select, Dialog, Badge } from '@/components/ui';
import type { BadgeVariant } from '@/components/ui';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; variant: BadgeVariant }> = {
  active: {
    label: 'Active',
    icon: CheckCircleIcon,
    color: 'text-emerald-700',
    variant: 'success',
  },
  inactive: {
    label: 'Inactive',
    icon: XCircleIcon,
    color: 'text-surface-600',
    variant: 'neutral',
  },
  error: {
    label: 'Error',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    variant: 'danger',
  },
  pending_setup: {
    label: 'Setup Required',
    icon: CogIcon,
    color: 'text-yellow-700',
    variant: 'warning',
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
          <h1 className="text-2xl font-bold text-surface-900">Integrations</h1>
          <p className="text-surface-600 mt-1">
            Connect external services for automated evidence collection
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon className="w-4 h-4" />}>
          Add Integration
        </Button>
      </div>

      {/* Search Bar */}
      <div className="card p-4">
        <Input
          type="text"
          placeholder="Search integrations by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
          rightSlot={
            searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-surface-600 hover:text-surface-900"
                aria-label="Clear search"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-surface-600">Available Integrations</p>
          <p className="text-2xl font-bold text-surface-900 mt-1">
            {integrationTypes ? Object.keys(integrationTypes).length : 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Configured</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {stats?.total || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Active</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">
            {stats?.byStatus?.active || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-600">Evidence Collected</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {stats?.totalEvidenceCollected || 0}
          </p>
        </div>
      </div>

      {/* Integrations by Category */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-surface-300 rounded-full border-t-brand-500"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedIntegrations)
            .sort(([catA], [catB]) => catA.localeCompare(catB))
            .map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
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
                      variant: 'neutral' as BadgeVariant,
                    };
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={type}
                        className={clsx(
                          'card p-6 transition-colors cursor-pointer',
                          isConfigured ? 'hover:border-surface-300' : 'hover:border-brand-500/50 opacity-75'
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
                            <div className="p-2 bg-surface-100 rounded-lg flex items-center justify-center">
                              <IntegrationIcon
                                iconSlug={meta.iconSlug || type}
                                integrationName={meta.name}
                                className="w-6 h-6 text-surface-900"
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-surface-900">{meta.name}</h3>
                              <Badge variant={statusConfig.variant} size="sm" capitalize={false}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                          </div>
                          <StatusIcon className={clsx('w-5 h-5', statusConfig.color)} />
                        </div>

                        <p className="text-sm text-surface-600 mb-4 line-clamp-2">
                          {meta.description}
                        </p>

                        {integration?.lastSyncError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                            <p className="text-xs text-red-600 truncate">{integration.lastSyncError}</p>
                          </div>
                        )}

                        {meta.apiDocs && (
                          <a
                            href={meta.apiDocs}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-brand-700 hover:text-brand-800 flex items-center gap-1 mb-4"
                          >
                            API Documentation →
                          </a>
                        )}

                        {isConfigured ? (
                          <>
                            <div className="flex items-center justify-between text-xs text-surface-500 pt-4 border-t border-surface-200">
                              <span>
                                {integration.lastSyncAt
                                  ? `Last sync: ${new Date(integration.lastSyncAt).toLocaleDateString()}`
                                  : 'Never synced'}
                              </span>
                              <span>{integration.totalEvidenceCollected} evidence</span>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-200">
                              <Button
                                variant="secondary"
                                size="sm"
                                fullWidth
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(integration);
                                }}
                                leftIcon={<EyeIcon className="w-4 h-4" />}
                              >
                                Configure
                              </Button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testMutation.mutate(integration.id);
                                }}
                                disabled={testMutation.isPending}
                                className="p-1.5 text-surface-600 hover:text-surface-900 hover:bg-surface-100 rounded transition-colors"
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
                                  className="p-1.5 text-surface-600 hover:text-emerald-700 hover:bg-surface-100 rounded transition-colors"
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
                                className="p-1.5 text-surface-600 hover:text-red-600 hover:bg-surface-100 rounded transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="pt-4 border-t border-surface-200 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreselectedType(type);
                                setShowAddModal(true);
                              }}
                              className="text-sm text-brand-700 hover:text-brand-800 flex items-center gap-2 mx-auto"
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
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={step === 'select' ? 'Add Integration' : `Configure ${typeMeta?.name || selectedType}`}
      description={
        step === 'select'
          ? 'Select an integration type to configure'
          : 'Enter connection details for this integration'
      }
      footer={
        <div className="flex justify-between gap-2 w-full">
          {step === 'configure' && !preselectedType ? (
            <Button variant="secondary" onClick={() => setStep('select')}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {step === 'configure' && (
              <Button
                onClick={handleCreate}
                disabled={!name || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Integration'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {step === 'select' ? (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(integrationTypes).map(([type, meta]: [string, any]) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="p-4 text-left bg-white hover:bg-surface-50 rounded-lg border border-surface-200 hover:border-surface-300 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{TYPE_ICONS[type] || '🔗'}</span>
                  <span className="font-medium text-surface-900">{meta.name}</span>
                </div>
                <p className="text-xs text-surface-600 line-clamp-2">{meta.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="Integration name"
              />
            </div>

            <div>
              <label className="label">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="Brief description"
              />
            </div>

            {typeMeta?.configFields?.length > 0 && (
              <div className="pt-4 border-t border-surface-200">
                <h3 className="text-sm font-medium text-surface-800 mb-3">Connection Settings</h3>
                <div className="space-y-3">
                  {typeMeta.configFields.map((field: any) => (
                    <div key={field.key}>
                      <label className="label">
                        {field.label}
                        {field.required && <span className="text-red-600 ml-1">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={config[field.key] || ''}
                          onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                          className="mt-1 font-mono text-sm"
                          rows={4}
                          placeholder={field.label}
                        />
                      ) : (
                        <Input
                          type={field.type === 'password' ? 'password' : 'text'}
                          value={config[field.key] || ''}
                          onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                          className="mt-1"
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
    </Dialog>
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
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TYPE_ICONS[integration.type] || '🔗'}</span>
          <div>
            <div>{integration.name}</div>
            <p className="text-sm font-normal text-surface-600">{typeMeta?.name || integration.type}</p>
          </div>
        </div>
      }
      footer={
        <div className="flex justify-between gap-2 w-full">
          <Button
            variant="secondary"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            leftIcon={<ArrowPathIcon className={clsx('w-4 h-4', testMutation.isPending && 'animate-spin')} />}
          >
            Test Connection
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="label">Status</label>
            <Select
              value={status}
              onChange={setStatus}
              className="mt-1"
              options={[
                { value: 'pending_setup', label: 'Setup Required' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>

        {typeMeta?.configFields?.length > 0 && (
          <div className="pt-4 border-t border-surface-200">
            <h3 className="text-sm font-medium text-surface-800 mb-3">Connection Settings</h3>
            <div className="space-y-3">
              {typeMeta.configFields.map((field: any) => (
                <div key={field.key}>
                  <label className="label">
                    {field.label}
                    {field.required && <span className="text-red-600 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="mt-1 font-mono text-sm"
                      rows={4}
                      placeholder={`Enter new ${field.label.toLowerCase()}`}
                    />
                  ) : (
                    <Input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="mt-1"
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
        <div className="pt-4 border-t border-surface-200">
          <h3 className="text-sm font-medium text-surface-800 mb-3">Advanced Configuration</h3>
          <button
            onClick={onOpenCustomConfig}
            className="w-full p-4 bg-white hover:bg-surface-50 rounded-lg border border-surface-200 hover:border-brand-500/50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 rounded-lg group-hover:bg-brand-500/30 transition-colors">
                <CodeBracketIcon className="w-5 h-5 text-brand-700" />
              </div>
              <div>
                <p className="font-medium text-surface-900">Custom API Editor</p>
                <p className="text-xs text-surface-600 mt-0.5">
                  Configure custom endpoints or write JavaScript code to define how data is collected
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Sync History */}
        {integration.syncJobs?.length > 0 && (
          <div className="pt-4 border-t border-surface-200">
            <h3 className="text-sm font-medium text-surface-800 mb-3">Recent Sync Jobs</h3>
            <div className="space-y-2">
              {integration.syncJobs.slice(0, 5).map((job: any) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2 bg-surface-100 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'w-2 h-2 rounded-full',
                        job.status === 'completed' ? 'bg-green-500' :
                        job.status === 'failed' ? 'bg-red-500' :
                        job.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        'bg-surface-500'
                      )}
                    />
                    <span className="text-surface-700 capitalize">{job.status}</span>
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
    </Dialog>
  );
}
