import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import QuickSetupTab from './QuickSetupTab';
import AdvancedBuilderTab from './AdvancedBuilderTab';
import RawApiTab from './RawApiTab';
import { Dialog } from '@/components/ui/Dialog';
import type { IntegrationType } from '@/lib/integrationTypes';

import { Button } from '@/components/ui/Button';

interface IntegrationConfigModalProps {
  integrationType: string;
  typeMeta: IntegrationType;
  existingIntegration?: any;
  onClose: () => void;
}

export default function IntegrationConfigModal({
  integrationType,
  typeMeta,
  existingIntegration,
  onClose,
}: IntegrationConfigModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced' | 'raw'>('quick');

  // Quick Setup state
  const [quickSetupConfig, setQuickSetupConfig] = useState({
    name: existingIntegration?.name || typeMeta.name,
    description: existingIntegration?.description || '',
    credentials: existingIntegration?.config?.credentials || {},
    evidenceTypes:
      existingIntegration?.config?.evidenceTypes ||
      typeMeta.evidenceTypes?.filter((e) => e.defaultEnabled).map((e) => e.key) ||
      [],
    syncFrequency: existingIntegration?.config?.syncFrequency || 'daily',
  });

  // Advanced Builder state
  const [advancedConfig, setAdvancedConfig] = useState({
    name: existingIntegration?.name || typeMeta.name,
    description: existingIntegration?.description || '',
    endpoints: existingIntegration?.config?.customEndpoints || [],
    authConfig: existingIntegration?.config?.authConfig || {
      type: typeMeta.authType || 'api_key',
      credentials: {},
    },
    responseMappings: existingIntegration?.config?.responseMappings || [],
    transformations: existingIntegration?.config?.transformations || [],
  });

  // Raw API state
  const [rawApiConfig, setRawApiConfig] = useState({
    name: existingIntegration?.name || typeMeta.name,
    description: existingIntegration?.description || '',
    rawRequests: existingIntegration?.config?.rawRequests || [],
    customCode: existingIntegration?.config?.customCode || '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (existingIntegration) {
        const { type: _type, ...updateData } = data;
        return integrationsApi.update(existingIntegration.id, updateData);
      }
      return integrationsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrations-stats'] });
      toast.success(existingIntegration ? 'Integration updated' : 'Integration created');
      onClose();
    },
    onError: () => {
      toast.error(
        existingIntegration ? 'Failed to update integration' : 'Failed to create integration'
      );
    },
  });

  const handleSave = () => {
    if (activeTab === 'quick') {
      createMutation.mutate({
        type: integrationType,
        name: quickSetupConfig.name,
        description: quickSetupConfig.description,
        config: {
          credentials: quickSetupConfig.credentials,
          evidenceTypes: quickSetupConfig.evidenceTypes,
          syncFrequency: quickSetupConfig.syncFrequency,
          mode: 'quick',
        },
      });
    } else if (activeTab === 'advanced') {
      createMutation.mutate({
        type: integrationType,
        name: advancedConfig.name,
        description: advancedConfig.description,
        config: {
          customEndpoints: advancedConfig.endpoints,
          authConfig: advancedConfig.authConfig,
          responseMappings: advancedConfig.responseMappings,
          transformations: advancedConfig.transformations,
          mode: 'advanced',
        },
      });
    } else {
      createMutation.mutate({
        type: integrationType,
        name: rawApiConfig.name,
        description: rawApiConfig.description,
        config: {
          rawRequests: rawApiConfig.rawRequests,
          customCode: rawApiConfig.customCode,
          mode: 'raw',
        },
      });
    }
  };

  return (
    <Dialog open onClose={onClose} size="xl">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">Configure {typeMeta.name}</h2>
            <p className="text-sm text-surface-600 mt-1">
              {existingIntegration
                ? 'Update your integration settings'
                : 'Set up your integration connection'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-200">
          <button
            onClick={() => setActiveTab('quick')}
            className={clsx(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'quick' ? 'text-brand-400' : 'text-surface-600 hover:text-surface-800'
            )}
          >
            Quick Setup
            <span className="block text-xs font-normal mt-0.5 text-surface-500">No-code</span>
            {activeTab === 'quick' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={clsx(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'advanced'
                ? 'text-brand-400'
                : 'text-surface-600 hover:text-surface-800'
            )}
          >
            Advanced Builder
            <span className="block text-xs font-normal mt-0.5 text-surface-500">
              Visual API config
            </span>
            {activeTab === 'advanced' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={clsx(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'raw' ? 'text-brand-400' : 'text-surface-600 hover:text-surface-800'
            )}
          >
            Raw API
            <span className="block text-xs font-normal mt-0.5 text-surface-500">
              Write or paste code
            </span>
            {activeTab === 'raw' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'quick' && (
            <QuickSetupTab
              typeMeta={typeMeta}
              config={quickSetupConfig}
              onChange={setQuickSetupConfig}
            />
          )}
          {activeTab === 'advanced' && (
            <AdvancedBuilderTab config={advancedConfig} onChange={setAdvancedConfig} />
          )}
          {activeTab === 'raw' && <RawApiTab config={rawApiConfig} onChange={setRawApiConfig} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-surface-200 bg-white dark:bg-surface-900">
          <div className="text-sm text-surface-500">
            {activeTab === 'quick' &&
              `${quickSetupConfig.evidenceTypes.length} evidence types selected`}
            {activeTab === 'advanced' &&
              `${advancedConfig.endpoints.length} custom endpoints configured`}
            {activeTab === 'raw' && `${rawApiConfig.rawRequests.length} API requests defined`}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} variant="primary">
              {createMutation.isPending
                ? 'Saving...'
                : existingIntegration
                  ? 'Update Integration'
                  : 'Create Integration'}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
