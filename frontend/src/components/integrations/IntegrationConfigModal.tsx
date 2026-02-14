import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import QuickSetupTab from './QuickSetupTab';
import AdvancedBuilderTab from './AdvancedBuilderTab';
import RawApiTab from './RawApiTab';
import type { IntegrationType } from '@/lib/integrationTypes';

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
    evidenceTypes: existingIntegration?.config?.evidenceTypes || 
      typeMeta.evidenceTypes?.filter(e => e.defaultEnabled).map(e => e.key) || [],
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
        const { type, ...updateData } = data;
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
      toast.error(existingIntegration ? 'Failed to update integration' : 'Failed to create integration');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-900 border border-surface-800 rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">
              Configure {typeMeta.name}
            </h2>
            <p className="text-sm text-surface-400 mt-1">
              {existingIntegration ? 'Update your integration settings' : 'Set up your integration connection'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-lg transition-colors">
            <XMarkIcon className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-800">
          <button
            onClick={() => setActiveTab('quick')}
            className={clsx(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'quick'
                ? 'text-brand-400'
                : 'text-surface-400 hover:text-surface-200'
            )}
          >
            Quick Setup
            <span className="block text-xs font-normal mt-0.5 text-surface-500">
              No-code
            </span>
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
                : 'text-surface-400 hover:text-surface-200'
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
              activeTab === 'raw'
                ? 'text-brand-400'
                : 'text-surface-400 hover:text-surface-200'
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
            <AdvancedBuilderTab
              config={advancedConfig}
              onChange={setAdvancedConfig}
            />
          )}
          {activeTab === 'raw' && (
            <RawApiTab
              config={rawApiConfig}
              onChange={setRawApiConfig}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-surface-800 bg-surface-900">
          <div className="text-sm text-surface-500">
            {activeTab === 'quick' && `${quickSetupConfig.evidenceTypes.length} evidence types selected`}
            {activeTab === 'advanced' && `${advancedConfig.endpoints.length} custom endpoints configured`}
            {activeTab === 'raw' && `${rawApiConfig.rawRequests.length} API requests defined`}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Saving...' : existingIntegration ? 'Update Integration' : 'Create Integration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

