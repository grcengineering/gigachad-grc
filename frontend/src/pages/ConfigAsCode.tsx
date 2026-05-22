import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMutation } from '@tanstack/react-query';
import { configAsCodeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';
import { ModuleGuard } from '@/contexts/ModuleContext';
import DisabledModulePage from './DisabledModulePage';
import ConfigIDE from '@/components/config-as-code/ConfigIDE';
import ErrorBoundary from '@/components/ErrorBoundary';

import { Textarea } from '@/components/ui/Textarea';

import { Button } from '@/components/ui/Button';

export default function ConfigAsCode() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4">
          <p className="text-yellow-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  // Wrap in error boundary to prevent crashes from disabling the module
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6">
          <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
            <p className="text-red-600">
              Error loading Configuration as Code. The module will remain enabled.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      <ModuleGuard
        module="config-as-code"
        fallback={<DisabledModulePage moduleId="config-as-code" />}
      >
        <ConfigAsCodeContent />
      </ModuleGuard>
    </ErrorBoundary>
  );
}

function ConfigAsCodeContent() {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'ide' | 'export'>('ide');
  const [exportFormat, setExportFormat] = useState<'yaml' | 'json'>('yaml');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [importConfig, setImportConfig] = useState('');
  const [importFormat, setImportFormat] = useState<'yaml' | 'json'>('yaml');

  const exportMutation = useMutation({
    mutationFn: (data: { format: 'yaml' | 'json' | 'terraform'; resources?: string[] }) =>
      configAsCodeApi.export(data),
    onSuccess: (response) => {
      const { content, filename, mimeType } = response.data;

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Configuration exported successfully (${response.data.resourceCount} resources)`
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export configuration');
    },
  });

  const importMutation = useMutation({
    mutationFn: (data: {
      format: 'yaml' | 'json' | 'terraform';
      config: string;
      dryRun?: boolean;
    }) => configAsCodeApi.import(data),
    onSuccess: (response) => {
      const { created, updated, skipped, errors, dryRun } = response.data;
      if (dryRun) {
        toast.success(
          `Preview: ${created} to create, ${updated} to update, ${skipped} to skip${errors > 0 ? `, ${errors} errors` : ''}`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Import complete: ${created} created, ${updated} updated, ${skipped} skipped${errors > 0 ? `, ${errors} errors` : ''}`,
          { duration: 5000 }
        );
        setImportConfig('');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import configuration');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportConfig(content);

      // Auto-detect format from file extension
      if (file.name.endsWith('.json')) {
        setImportFormat('json');
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        setImportFormat('yaml');
      }
    };
    reader.readAsText(file);
  };

  const resourceOptions = [
    { value: 'controls', label: 'Controls' },
    { value: 'frameworks', label: 'Frameworks' },
    { value: 'policies', label: 'Policies' },
    { value: 'risks', label: 'Risks' },
    { value: 'evidence', label: 'Evidence' },
    { value: 'vendors', label: 'Vendors' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Configuration as Code</h1>
        <p className="text-surface-600 mt-1">
          Manage your GRC resources declaratively with version control
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-surface-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('ide')}
            className={
              activeTab === 'ide'
                ? 'px-4 py-2 border-b-2 border-brand-500 text-brand-300 font-medium'
                : 'px-4 py-2 text-surface-600 hover:text-surface-800'
            }
          >
            <div className="flex items-center gap-2">
              <CodeBracketIcon className="w-5 h-5" />
              <span>IDE Editor</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={
              activeTab === 'export'
                ? 'px-4 py-2 border-b-2 border-brand-500 text-brand-300 font-medium'
                : 'px-4 py-2 text-surface-600 hover:text-surface-800'
            }
          >
            <div className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Export/Import</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'ide' ? (
        <ConfigIDE workspaceId={currentWorkspace?.id} />
      ) : (
        <ExportImportContent
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          selectedResources={selectedResources}
          setSelectedResources={setSelectedResources}
          importConfig={importConfig}
          setImportConfig={setImportConfig}
          importFormat={importFormat}
          setImportFormat={setImportFormat}
          exportMutation={exportMutation}
          importMutation={importMutation}
          handleFileUpload={handleFileUpload}
          resourceOptions={resourceOptions}
        />
      )}
    </div>
  );
}

function ExportImportContent({
  exportFormat,
  setExportFormat,
  selectedResources,
  setSelectedResources,
  importConfig,
  setImportConfig,
  importFormat,
  setImportFormat,
  exportMutation,
  importMutation,
  handleFileUpload,
  resourceOptions,
}: any) {
  const handleExport = () => {
    exportMutation.mutate({
      format: exportFormat,
      resources: selectedResources.length > 0 ? selectedResources : undefined,
    });
  };

  const handleImport = (dryRun = false) => {
    if (!importConfig.trim()) {
      toast.error('Please provide configuration content');
      return;
    }

    importMutation.mutate({
      format: importFormat,
      config: importConfig,
      dryRun,
    });
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowDownTrayIcon className="w-6 h-6 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-900">Export Configuration</h2>
        </div>
        <p className="text-surface-600 mb-4">
          Export your current GRC state to a configuration file for version control.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="yaml"
                  checked={exportFormat === 'yaml'}
                  onChange={(e) => setExportFormat(e.target.value as 'yaml')}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-surface-700">YAML</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="json"
                  checked={exportFormat === 'json'}
                  onChange={(e) => setExportFormat(e.target.value as 'json')}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-surface-700">JSON</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Resources to Export (leave empty for all)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {resourceOptions.map((option: { value: string; label: string }) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedResources([...selectedResources, option.value]);
                      } else {
                        setSelectedResources(
                          selectedResources.filter((r: string) => r !== option.value)
                        );
                      }
                    }}
                    className="w-4 h-4 text-brand-500 rounded"
                  />
                  <span className="text-surface-700 text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2"
            variant="primary"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            {exportMutation.isPending ? 'Exporting...' : 'Export Configuration'}
          </Button>
        </div>
      </div>
      {/* Import Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <ArrowUpTrayIcon className="w-6 h-6 text-brand-400" />
          <h2 className="text-lg font-semibold text-surface-900">Import Configuration</h2>
        </div>
        <p className="text-surface-600 mb-4">
          Import a configuration file to apply changes to your GRC resources.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="yaml"
                  checked={importFormat === 'yaml'}
                  onChange={(e) => setImportFormat(e.target.value as 'yaml')}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-surface-700">YAML</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="json"
                  checked={importFormat === 'json'}
                  onChange={(e) => setImportFormat(e.target.value as 'json')}
                  className="w-4 h-4 text-brand-500"
                />
                <span className="text-surface-700">JSON</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Configuration File
            </label>
            <input
              type="file"
              accept=".yaml,.yml,.json"
              onChange={handleFileUpload}
              className="block w-full text-sm text-surface-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Configuration Content
            </label>
            <Textarea
              value={importConfig}
              onChange={(e) => setImportConfig(e.target.value)}
              placeholder="Paste your configuration here or upload a file..."
              className="w-full h-64 px-4 py-3 bg-white border border-surface-200 rounded-lg text-surface-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-surface-900"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => handleImport(true)}
              disabled={importMutation.isPending || !importConfig.trim()}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Preview Changes
            </Button>
            <Button
              onClick={() => handleImport(false)}
              disabled={importMutation.isPending || !importConfig.trim()}
              className="flex items-center gap-2"
              variant="primary"
            >
              <ArrowUpTrayIcon className="w-5 h-5" />
              {importMutation.isPending ? 'Importing...' : 'Import Configuration'}
            </Button>
          </div>
        </div>
      </div>
      {/* Info Section */}
      <div className="bg-white border border-surface-200 rounded-lg p-4 dark:bg-surface-900">
        <div className="flex items-start gap-3">
          <CodeBracketIcon className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-surface-800 mb-1">
              About Configuration as Code
            </h3>
            <p className="text-sm text-surface-600">
              This feature allows you to manage your GRC resources (controls, frameworks, policies,
              etc.) declaratively through version-controlled configuration files. Export your
              current state, make changes in your preferred editor, and import to apply updates.
            </p>
            <p className="text-sm text-surface-600 mt-2">
              <strong>Note:</strong> Terraform format support and Git sync are coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
