import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CpuChipIcon,
  PlayIcon,
  StopIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { mcpApi } from '../lib/api';

import { Input } from '@/components/ui/Input';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  transport: string;
  templateId?: string;
  lastConnected?: string;
  lastError?: string;
  createdAt?: string;
  createdBy?: string;
  configuration?: {
    configuredIntegrations: string[];
    evidenceTypes: string[];
    command: string;
    args: string[];
  };
  capabilities?: {
    tools: { name: string; description?: string }[];
    resources: { uri: string; name: string }[];
    prompts: { name: string; description?: string }[];
  };
}

interface OptionalEnvVar {
  key: string;
  label: string;
  description: string;
}

interface ConfigGroup {
  name: string;
  keys: string[];
}

interface ServerTemplate {
  id: string;
  name: string;
  description: string;
  transport: string;
  command: string;
  args: string[];
  capabilities: string[];
  requiredEnv?: string[];
  optionalEnv?: OptionalEnvVar[];
  configGroups?: ConfigGroup[];
  configNote?: string;
}

export default function MCPSettings() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ServerTemplate | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);

  // Fetch servers
  const { data: serversData, isLoading: loadingServers } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => mcpApi.getServers(),
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ['mcp-templates'],
    queryFn: () => mcpApi.getTemplates(),
  });

  const servers: MCPServer[] = serversData?.data?.data || [];
  const templates: ServerTemplate[] = templatesData?.data?.data || [];

  // Mutations
  const connectMutation = useMutation({
    mutationFn: (serverId: string) => mcpApi.connectServer(serverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (serverId: string) => mcpApi.disconnectServer(serverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (serverId: string) => mcpApi.deleteServer(serverId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp-servers'] }),
  });

  const deployTemplateMutation = useMutation({
    mutationFn: ({ templateId, env }: { templateId: string; env: Record<string, string> }) =>
      mcpApi.deployTemplate(templateId, env),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      setShowAddModal(false);
      setSelectedTemplate(null);
      setEnvVars({});
    },
  });

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'connecting':
        return <ArrowPathIcon className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: MCPServer['status']) => {
    const styles = {
      connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-600',
      disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      connecting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-600',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-600',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MCP Server Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage Model Context Protocol servers for automated GRC workflows
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
          variant="primary"
        >
          <PlusIcon className="w-5 h-5" />
          Add Server
        </Button>
      </div>
      {/* Server Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-800 rounded-lg p-4 border border-gray-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
              <CpuChipIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{servers.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Servers</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-lg p-4 border border-gray-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {servers.filter((s) => s.status === 'connected').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-lg p-4 border border-gray-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600 dark:text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {servers.filter((s) => s.status === 'error').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-800 rounded-lg p-4 border border-gray-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Cog6ToothIcon className="w-6 h-6 text-purple-600 dark:text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {servers.reduce((acc, s) => acc + (s.capabilities?.tools?.length || 0), 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Tools</p>
            </div>
          </div>
        </div>
      </div>
      {/* Server List */}
      <div className="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700">
        <div className="p-4 border-b border-gray-200 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Registered Servers
          </h2>
        </div>

        {loadingServers ? (
          <div className="p-8 text-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading servers...</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="p-8 text-center">
            <CpuChipIcon className="w-12 h-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">No servers configured</p>
            <Button onClick={() => setShowAddModal(true)} className="mt-4" variant="secondary">
              Add your first server
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-surface-700">
            {servers.map((server) => (
              <div
                key={server.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-surface-700/50 cursor-pointer"
                onClick={() => setSelectedServer(server)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(server.status)}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{server.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {server.transport} • {server.id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(server.status)}
                    <div className="flex items-center gap-2">
                      {server.status === 'connected' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            disconnectMutation.mutate(server.id);
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-600"
                          title="Disconnect"
                        >
                          <StopIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            connectMutation.mutate(server.id);
                          }}
                          className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-600"
                          title="Connect"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this server?')) {
                            deleteMutation.mutate(server.id);
                          }
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                {server.lastError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-600">{server.lastError}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Add Server Modal */}
      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)}>
        <div className="p-4 border-b border-gray-200 dark:border-surface-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedTemplate ? `Configure ${selectedTemplate.name}` : 'Add MCP Server'}
          </h2>
          <button
            onClick={() => {
              setShowAddModal(false);
              setSelectedTemplate(null);
              setEnvVars({});
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {!selectedTemplate ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="p-4 border border-gray-200 dark:border-surface-700 rounded-lg hover:border-brand-500 dark:hover:border-brand-500 cursor-pointer transition-colors"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-400 rounded"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>

              {selectedTemplate.configNote && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ {selectedTemplate.configNote}
                  </p>
                </div>
              )}

              {selectedTemplate.requiredEnv && selectedTemplate.requiredEnv.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Required Configuration
                  </h4>
                  {selectedTemplate.requiredEnv.map((envVar) => (
                    <div key={envVar}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {envVar}
                      </label>
                      <Input
                        type="password"
                        value={envVars[envVar] || ''}
                        onChange={(e) => setEnvVars({ ...envVars, [envVar]: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                        placeholder={`Enter ${envVar}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Optional Environment Variables by Group */}
              {selectedTemplate.optionalEnv && selectedTemplate.optionalEnv.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Cog6ToothIcon className="w-4 h-4" />
                    Optional Configuration
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Configure the integrations you want to use. Leave blank to skip.
                  </p>

                  {selectedTemplate.configGroups ? (
                    // Render grouped configuration
                    <div className="space-y-4">
                      {selectedTemplate.configGroups.map((group) => (
                        <details
                          key={group.name}
                          className="border border-gray-200 dark:border-surface-700 rounded-lg"
                        >
                          <summary className="px-4 py-3 cursor-pointer font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-surface-700/50 rounded-t-lg">
                            {group.name}
                            {group.keys.some((k) => envVars[k]) && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-600">
                                ● Configured
                              </span>
                            )}
                          </summary>
                          <div className="p-4 space-y-3">
                            {group.keys.map((key) => {
                              const envDef = selectedTemplate.optionalEnv?.find(
                                (e) => e.key === key
                              );
                              if (!envDef) return null;
                              return (
                                <div key={key}>
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {envDef.label}
                                    <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                                      ({envDef.description})
                                    </span>
                                  </label>
                                  <Input
                                    type={
                                      key.toLowerCase().includes('secret') ||
                                      key.toLowerCase().includes('password') ||
                                      key.toLowerCase().includes('token') ||
                                      key.toLowerCase().includes('key')
                                        ? 'password'
                                        : 'text'
                                    }
                                    value={envVars[key] || ''}
                                    onChange={(e) =>
                                      setEnvVars({ ...envVars, [key]: e.target.value })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                                    placeholder={envDef.description}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    // Render flat list
                    <div className="space-y-3">
                      {selectedTemplate.optionalEnv.map((envDef) => (
                        <div key={envDef.key}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {envDef.label}
                            <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">
                              {envDef.description}
                            </span>
                          </label>
                          <Input
                            type={
                              envDef.key.toLowerCase().includes('secret') ||
                              envDef.key.toLowerCase().includes('password') ||
                              envDef.key.toLowerCase().includes('token') ||
                              envDef.key.toLowerCase().includes('key')
                                ? 'password'
                                : 'text'
                            }
                            value={envVars[envDef.key] || ''}
                            onChange={(e) =>
                              setEnvVars({ ...envVars, [envDef.key]: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-surface-600 rounded-lg bg-white dark:bg-surface-700 text-gray-900 dark:text-white"
                            placeholder={envDef.description}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-surface-700">
                <Button onClick={() => setSelectedTemplate(null)} variant="secondary">
                  Back
                </Button>
                <Button
                  onClick={() =>
                    deployTemplateMutation.mutate({
                      templateId: selectedTemplate.id,
                      env: Object.fromEntries(
                        Object.entries(envVars).filter(([_, v]) => v) // Only include non-empty values
                      ),
                    })
                  }
                  disabled={
                    deployTemplateMutation.isPending ||
                    (selectedTemplate.requiredEnv?.some((v) => !envVars[v]) ?? false)
                  }
                  variant="primary"
                >
                  {deployTemplateMutation.isPending ? 'Deploying...' : 'Deploy Server'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
      {/* Server Details Modal */}
      {selectedServer && (
        <Dialog open onClose={() => setSelectedServer(null)}>
          <div className="p-4 border-b border-gray-200 dark:border-surface-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {getStatusIcon(selectedServer.status)}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedServer.name}
              </h2>
              {getStatusBadge(selectedServer.status)}
            </div>
            <button
              onClick={() => setSelectedServer(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Server Info - Basic */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5" />
                Server Information
              </h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Server ID
                  </p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white mt-1">
                    {selectedServer.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Transport Protocol
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedServer.transport}
                  </p>
                </div>
                {selectedServer.templateId && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Template Type
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedServer.templateId}
                    </p>
                  </div>
                )}
                {selectedServer.createdAt && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Created
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {new Date(selectedServer.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedServer.createdBy && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Created By
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedServer.createdBy}
                    </p>
                  </div>
                )}
                {selectedServer.lastConnected && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Last Connected
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {new Date(selectedServer.lastConnected).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Configuration - For Auditors */}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Cog6ToothIcon className="w-5 h-5" />
                Configuration Details
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  (for audit purposes)
                </span>
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-surface-700/50 rounded-lg space-y-4">
                {/* Configured Integrations */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Configured Integrations
                  </p>
                  {selectedServer.configuration?.configuredIntegrations &&
                  selectedServer.configuration.configuredIntegrations.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedServer.configuration.configuredIntegrations.map((integration) => (
                        <span
                          key={integration}
                          className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-600 rounded-full flex items-center gap-1"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          {integration}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      No external integrations configured (using defaults)
                    </p>
                  )}
                </div>

                {/* Evidence Types */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Evidence Types Collected
                  </p>
                  {selectedServer.configuration?.evidenceTypes &&
                  selectedServer.configuration.evidenceTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedServer.configuration.evidenceTypes.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-600 rounded"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Evidence types determined by connected integrations
                    </p>
                  )}
                </div>

                {/* Execution Command */}
                {selectedServer.configuration?.command && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Execution Command
                    </p>
                    <code className="block p-2 bg-gray-900 dark:bg-black text-green-600 text-sm font-mono rounded overflow-x-auto">
                      {selectedServer.configuration.command}{' '}
                      {selectedServer.configuration.args?.join(' ')}
                    </code>
                  </div>
                )}

                {/* Credential Status - Masked for security */}
                <div className="border-t border-gray-200 dark:border-surface-600 pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Credential Configuration Status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'AWS', keys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'] },
                      {
                        name: 'Azure',
                        keys: ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET'],
                      },
                      { name: 'GitHub', keys: ['GITHUB_TOKEN'] },
                      { name: 'Okta', keys: ['OKTA_DOMAIN', 'OKTA_API_TOKEN'] },
                      { name: 'Google', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] },
                      { name: 'Jamf', keys: ['JAMF_URL', 'JAMF_USERNAME', 'JAMF_PASSWORD'] },
                      { name: 'OpenAI', keys: ['OPENAI_API_KEY'] },
                      { name: 'Anthropic', keys: ['ANTHROPIC_API_KEY'] },
                    ].map((provider) => {
                      const isConfigured =
                        selectedServer.configuration?.configuredIntegrations?.includes(
                          provider.name
                        );
                      return (
                        <div
                          key={provider.name}
                          className={`flex items-center gap-2 p-2 rounded text-sm ${
                            isConfigured
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-600'
                              : 'bg-gray-100 dark:bg-surface-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {isConfigured ? (
                            <CheckCircleIcon className="w-4 h-4" />
                          ) : (
                            <ClockIcon className="w-4 h-4" />
                          )}
                          <span>{provider.name}</span>
                          <span className="text-xs">
                            {isConfigured ? '(configured)' : '(not configured)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Note: Actual credentials are encrypted and not displayed for security reasons.
                  </p>
                </div>
              </div>
            </div>

            {/* Capabilities */}
            {selectedServer.capabilities && (
              <>
                {/* Tools */}
                {selectedServer.capabilities.tools.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <PlayIcon className="w-5 h-5" />
                      Available Tools ({selectedServer.capabilities.tools.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedServer.capabilities.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{tool.name}</p>
                          {tool.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {selectedServer.capabilities.resources.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Available Resources ({selectedServer.capabilities.resources.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedServer.capabilities.resources.map((resource) => (
                        <div
                          key={resource.uri}
                          className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">
                            {resource.name}
                          </p>
                          <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                            {resource.uri}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompts */}
                {selectedServer.capabilities.prompts.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Available Prompts ({selectedServer.capabilities.prompts.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedServer.capabilities.prompts.map((prompt) => (
                        <div
                          key={prompt.name}
                          className="p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{prompt.name}</p>
                          {prompt.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {prompt.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Audit Trail Footer */}
            <div className="border-t border-gray-200 dark:border-surface-700 pt-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This configuration information is logged for audit purposes. Changes to server
                configuration are tracked in the Audit Log.
              </p>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
