import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, Cog6ToothIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { integrationsApi } from '../../lib/api';
import VisualConfigBuilder from './VisualConfigBuilder';
import CodeEditor from './CodeEditor';

interface Props {
  integrationId: string;
  integrationName: string;
  isOpen: boolean;
  onClose: () => void;
}

type ConfigMode = 'visual' | 'code' | 'raw';

interface CustomConfig {
  mode: ConfigMode;
  baseUrl: string;
  endpoints: any[];
  authType: 'none' | 'api_key' | 'oauth2' | 'basic' | null;
  authConfig: any;
  responseMapping: any;
  customCode: string;
  lastTestAt?: string;
  lastTestStatus?: 'success' | 'error' | string | null;
  lastTestError?: string | null;
}

const DEFAULT_CODE = `/**
 * Custom Integration Code
 * 
 * Available APIs:
 * - fetch(url, options): Make HTTP requests
 * - console.log(...args): Log messages
 * - context.baseUrl: The configured base URL
 * - context.auth.headers: Pre-configured authentication headers
 */

async function sync(context) {
  const { baseUrl, auth } = context;
  
  const response = await fetch(\`\${baseUrl}/api/data\`, {
    headers: {
      ...auth.headers,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  return {
    evidence: [
      {
        title: \`API Data - \${new Date().toLocaleDateString()}\`,
        description: 'Data collected from custom API',
        data: data,
        type: 'automated',
      },
    ],
  };
}

module.exports = { sync };
`;

export default function CustomConfigModal({
  integrationId,
  integrationName,
  isOpen,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ConfigMode>('visual');
  const [config, setConfig] = useState<CustomConfig>({
    mode: 'visual',
    baseUrl: '',
    endpoints: [],
    authType: null,
    authConfig: null,
    responseMapping: null,
    customCode: DEFAULT_CODE,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Fetch existing config
  const { data: existingConfig, isLoading } = useQuery({
    queryKey: ['custom-config', integrationId],
    queryFn: () => integrationsApi.getCustomConfig(integrationId).then((res) => res.data),
    enabled: isOpen,
  });

  // Update local state when config is fetched
  useEffect(() => {
    if (existingConfig) {
      setConfig({
        mode: existingConfig.mode || 'visual',
        baseUrl: existingConfig.baseUrl || '',
        endpoints: existingConfig.endpoints || [],
        authType: existingConfig.authType || null,
        authConfig: existingConfig.authConfig || null,
        responseMapping: existingConfig.responseMapping || null,
        customCode: existingConfig.customCode || DEFAULT_CODE,
        lastTestAt: existingConfig.lastTestAt,
        lastTestStatus: existingConfig.lastTestStatus,
        lastTestError: existingConfig.lastTestError,
      });
      setActiveTab(existingConfig.mode || 'visual');
    }
  }, [existingConfig]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => integrationsApi.saveCustomConfig(integrationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-config', integrationId] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Configuration saved');
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: (data: { endpointIndex?: number }) =>
      integrationsApi.testCustomEndpoint(integrationId, data),
    onSuccess: (response) => {
      const result = response.data;
      setTestResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        // Check for SSRF-specific error messages
        const errorMsg = result.error || result.message || '';
        if (
          errorMsg.includes('SSRF') ||
          errorMsg.includes('private') ||
          errorMsg.includes('blocked') ||
          errorMsg.includes('internal')
        ) {
          toast.error('Cannot connect to internal/private addresses. Use a public URL.');
        } else {
          toast.error(result.message);
        }
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Test failed';
      // Check for SSRF-specific error messages
      if (
        msg.includes('SSRF') ||
        msg.includes('private') ||
        msg.includes('blocked') ||
        msg.includes('internal')
      ) {
        setTestResult({
          success: false,
          message: 'Cannot connect to internal/private addresses. Use a public URL.',
        });
        toast.error('Cannot connect to internal/private addresses. Use a public URL.');
      } else {
        setTestResult({ success: false, message: msg });
        toast.error(msg);
      }
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => integrationsApi.executeCustomSync(integrationId),
    onSuccess: (response) => {
      const result = response.data;
      if (result.success) {
        toast.success(`Sync completed: ${result.evidenceCreated} evidence records created`);
        queryClient.invalidateQueries({ queryKey: ['evidence'] });
      } else {
        toast.error(result.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Sync failed');
    },
  });

  const handleConfigChange = (updates: Partial<CustomConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
    setTestResult(null);
  };

  const handleTabChange = (tab: ConfigMode) => {
    setActiveTab(tab);
    handleConfigChange({ mode: tab });
  };

  const handleSave = () => {
    saveMutation.mutate({
      mode: activeTab,
      baseUrl: config.baseUrl,
      endpoints: config.endpoints,
      authType: config.authType,
      authConfig: config.authConfig,
      responseMapping: config.responseMapping,
      customCode: config.customCode,
    });
  };

  const handleTest = (endpointIndex?: number) => {
    // Save first if there are changes
    if (hasChanges) {
      saveMutation.mutate(
        {
          mode: activeTab,
          baseUrl: config.baseUrl,
          endpoints: config.endpoints,
          authType: config.authType,
          authConfig: config.authConfig,
          responseMapping: config.responseMapping,
          customCode: config.customCode,
        },
        {
          onSuccess: () => {
            testMutation.mutate({ endpointIndex });
          },
        }
      );
    } else {
      testMutation.mutate({ endpointIndex });
    }
  };

  const handleValidateCode = async (code: string) => {
    try {
      const response = await integrationsApi.validateCode(code);
      return response.data;
    } catch (error: any) {
      return { valid: false, errors: [error.response?.data?.message || 'Validation failed'] };
    }
  };

  const handleSync = () => {
    if (hasChanges) {
      saveMutation.mutate(
        {
          mode: activeTab,
          baseUrl: config.baseUrl,
          endpoints: config.endpoints,
          authType: config.authType,
          authConfig: config.authConfig,
          responseMapping: config.responseMapping,
          customCode: config.customCode,
        },
        {
          onSuccess: () => {
            syncMutation.mutate();
          },
        }
      );
    } else {
      syncMutation.mutate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-900 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-100">Configure Custom Integration</h2>
            <p className="text-sm text-surface-400">{integrationName}</p>
          </div>
          <div className="flex items-center gap-3">
            {config.lastTestAt && (
              <div className="text-xs text-surface-500">
                Last test: {new Date(config.lastTestAt).toLocaleString()}
                <span
                  className={clsx(
                    'ml-2 px-1.5 py-0.5 rounded',
                    config.lastTestStatus === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  )}
                >
                  {config.lastTestStatus}
                </span>
              </div>
            )}
            <button onClick={onClose} className="p-2 text-surface-400 hover:text-surface-200">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-700">
          <button
            onClick={() => handleTabChange('visual')}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'visual'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            )}
          >
            <Cog6ToothIcon className="w-4 h-4" />
            Visual Builder
          </button>
          <button
            onClick={() => handleTabChange('code')}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'code'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            )}
          >
            <CodeBracketIcon className="w-4 h-4" />
            Code Editor
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-surface-500">
              Loading configuration...
            </div>
          ) : activeTab === 'visual' ? (
            <div className="h-full overflow-auto p-6">
              <VisualConfigBuilder
                config={{
                  baseUrl: config.baseUrl,
                  endpoints: config.endpoints,
                  authType: config.authType,
                  authConfig: config.authConfig,
                }}
                onChange={(visualConfig) =>
                  handleConfigChange({
                    baseUrl: visualConfig.baseUrl,
                    endpoints: visualConfig.endpoints,
                    authType: visualConfig.authType,
                    authConfig: visualConfig.authConfig,
                  })
                }
                onTest={handleTest}
                isTestLoading={testMutation.isPending}
              />
            </div>
          ) : (
            <CodeEditor
              code={config.customCode}
              onChange={(customCode) => handleConfigChange({ customCode })}
              onValidate={handleValidateCode}
              onTest={() => handleTest()}
              isTestLoading={testMutation.isPending}
              testResult={testResult || undefined}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 bg-surface-800/50">
          <div className="flex items-center gap-2">
            {hasChanges && <span className="text-xs text-yellow-400">• Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
              className="btn-secondary"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleSync} disabled={syncMutation.isPending} className="btn-primary">
              {syncMutation.isPending ? 'Syncing...' : 'Save & Sync'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
