import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import { INTEGRATION_TYPES } from '@/lib/integrationTypes';
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
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import IntegrationConfigModal from '@/components/integrations/IntegrationConfigModal';
import { IntegrationIcon } from '@/components/IntegrationIcon';

import { Input } from '@/components/ui/Input';

import { Button } from '@/components/ui/Button';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  active: {
    label: 'Active',
    icon: CheckCircleIcon,
    color: 'text-green-600',
    badge: 'badge-success',
  },
  inactive: {
    label: 'Inactive',
    icon: XCircleIcon,
    color: 'text-surface-600',
    badge: 'badge-neutral',
  },
  error: {
    label: 'Error',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    badge: 'badge-danger',
  },
  pending_setup: {
    label: 'Setup Required',
    icon: CogIcon,
    color: 'text-yellow-600',
    badge: 'badge-warning',
  },
};

type StatusFilter = 'all' | 'configured' | 'active' | 'with_evidence';

export default function Integrations() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Sync search query with URL params
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  // Update URL when search changes (clear when empty)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  };

  const { isLoading } = useQuery({
    queryKey: ['integration-types'],
    queryFn: () =>
      integrationsApi
        .getTypes()
        .then((res) => res.data)
        .catch((err) => {
          console.warn('integrations.getTypes failed:', err);
          return null;
        }),
  });

  // Always use the comprehensive local INTEGRATION_TYPES which includes all categories
  // The API types are a subset - local definitions are more complete
  const integrationTypes = INTEGRATION_TYPES;

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

  // Handle API response - could be array directly or { data: [...] }
  const createdIntegrations: any[] = Array.isArray(integrationsData)
    ? (integrationsData as any[])
    : ((integrationsData as any)?.data as any[]) || [];

  // Create map of created integrations by type
  const createdIntegrationsMap = createdIntegrations.reduce((acc: any, integration: any) => {
    acc[integration.type] = integration;
    return acc;
  }, {});

  // Group integration types by category
  const groupedIntegrations: Record<
    string,
    Array<{ type: string; meta: any; integration?: any }>
  > = {};

  if (integrationTypes) {
    Object.entries(integrationTypes).forEach(([type, meta]: [string, any]) => {
      const integration = createdIntegrationsMap[type];

      // Filter by status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'configured' && !integration) {
          return; // Skip non-configured integrations
        }
        if (statusFilter === 'active' && integration?.status !== 'active') {
          return; // Skip non-active integrations
        }
        if (
          statusFilter === 'with_evidence' &&
          (!integration || (integration.totalEvidenceCollected || 0) === 0)
        ) {
          return; // Skip integrations without evidence
        }
      }

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
        integration, // undefined if not created yet
      });
    });

    // Sort each category alphabetically
    Object.keys(groupedIntegrations).forEach((category) => {
      groupedIntegrations[category].sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    });
  }

  // Count visible integrations
  const visibleCount = Object.values(groupedIntegrations).reduce(
    (sum, items) => sum + items.length,
    0
  );

  const handleConfigureIntegration = (type: string, existingIntegration?: any) => {
    setSelectedType(type);
    setSelectedIntegration(existingIntegration || null);
    setShowConfigModal(true);
  };

  const handleCloseModal = () => {
    setShowConfigModal(false);
    setSelectedType(null);
    setSelectedIntegration(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Integrations</h1>
        <p className="text-surface-600 mt-1">
          Connect external services for automated evidence collection
        </p>
      </div>
      {/* Search Bar */}
      <div className="card p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-600" />
          <Input
            type="text"
            placeholder="Search integrations by name, description, or category..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-600 hover:text-surface-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {/* Stats - Clickable Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'all' ? 'ring-2 ring-surface-500' : 'hover:bg-surface-800/50'
          )}
        >
          <p className="text-sm text-surface-600">Available Integrations</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {integrationTypes ? Object.keys(integrationTypes).length : 0}
          </p>
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'configured' ? 'all' : 'configured')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'configured'
              ? 'ring-2 ring-green-500'
              : 'hover:bg-surface-800/50 cursor-pointer'
          )}
        >
          <p className="text-sm text-surface-600">Configured</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.total || 0}</p>
          {statusFilter === 'configured' && (
            <p className="text-xs text-green-600 mt-1">Click to clear filter</p>
          )}
        </button>
        <button
          onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'active'
              ? 'ring-2 ring-brand-500'
              : 'hover:bg-surface-800/50 cursor-pointer'
          )}
        >
          <p className="text-sm text-surface-600">Active</p>
          <p className="text-2xl font-bold text-brand-400 mt-1">{stats?.byStatus?.active || 0}</p>
          {statusFilter === 'active' && (
            <p className="text-xs text-brand-400 mt-1">Click to clear filter</p>
          )}
        </button>
        <button
          onClick={() =>
            setStatusFilter(statusFilter === 'with_evidence' ? 'all' : 'with_evidence')
          }
          className={clsx(
            'card p-4 text-left transition-all',
            statusFilter === 'with_evidence'
              ? 'ring-2 ring-purple-500'
              : 'hover:bg-surface-800/50 cursor-pointer'
          )}
        >
          <p className="text-sm text-surface-600">Evidence Collected</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            {stats?.totalEvidenceCollected || 0}
          </p>
          {statusFilter === 'with_evidence' && (
            <p className="text-xs text-purple-600 mt-1">Click to clear filter</p>
          )}
        </button>
      </div>
      {/* Active Filter Indicator */}
      {statusFilter !== 'all' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-surface-600">Filtering by:</span>
          <span
            className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium',
              statusFilter === 'configured' && 'bg-green-500/20 text-green-600',
              statusFilter === 'active' && 'bg-brand-500/20 text-brand-400',
              statusFilter === 'with_evidence' && 'bg-purple-500/20 text-purple-600'
            )}
          >
            {statusFilter === 'configured' && 'Configured Integrations'}
            {statusFilter === 'active' && 'Active Integrations'}
            {statusFilter === 'with_evidence' && 'With Evidence'}
          </span>
          <span className="text-surface-500">({visibleCount} results)</span>
          <button
            onClick={() => setStatusFilter('all')}
            className="text-surface-600 hover:text-surface-100 ml-2"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
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
                          isConfigured
                            ? 'hover:border-surface-700'
                            : 'hover:border-brand-500/50 opacity-75'
                        )}
                        onClick={() => handleConfigureIntegration(type, integration)}
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
                        <p className="text-sm text-surface-600 mb-4 line-clamp-2">
                          {meta.description}
                        </p>
                        {type === 'slack' && (
                          <p className="text-xs text-blue-600 mb-4">
                            💡 For Slack <em>notifications</em>, configure in Settings →
                            Communications
                          </p>
                        )}
                        {integration?.lastSyncError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                            <p className="text-xs text-red-600 truncate">
                              {integration.lastSyncError}
                            </p>
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
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfigureIntegration(type, integration);
                                }}
                                className="flex-1 text-sm py-1.5"
                                variant="secondary"
                              >
                                <CogIcon className="w-4 h-4 mr-1" />
                                Configure
                              </Button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testMutation.mutate(integration.id);
                                }}
                                disabled={testMutation.isPending}
                                className="p-1.5 text-surface-600 hover:text-surface-100 hover:bg-surface-800 rounded transition-colors"
                                title="Test Connection"
                              >
                                <ArrowPathIcon
                                  className={clsx(
                                    'w-4 h-4',
                                    testMutation.isPending && 'animate-spin'
                                  )}
                                />
                              </button>
                              {integration.status === 'active' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    syncMutation.mutate(integration.id);
                                  }}
                                  disabled={syncMutation.isPending}
                                  className="p-1.5 text-surface-600 hover:text-green-600 hover:bg-surface-800 rounded transition-colors"
                                  title="Trigger Sync"
                                >
                                  <PlayIcon className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm('Are you sure you want to delete this integration?')
                                  ) {
                                    deleteMutation.mutate(integration.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                                className="p-1.5 text-surface-600 hover:text-red-600 hover:bg-surface-800 rounded transition-colors"
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
                                handleConfigureIntegration(type);
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
      {/* Integration Config Modal */}
      {showConfigModal && selectedType && integrationTypes[selectedType] && (
        <IntegrationConfigModal
          integrationType={selectedType}
          typeMeta={integrationTypes[selectedType]}
          existingIntegration={selectedIntegration}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
