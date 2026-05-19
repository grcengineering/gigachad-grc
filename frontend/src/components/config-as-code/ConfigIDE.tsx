import { useState, useEffect, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configAsCodeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FolderIcon,
  DocumentTextIcon,
  PlusIcon,
  PlayIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Input } from '@/components/ui/Input';

import { Button } from '@/components/ui/Button';

interface ConfigFile {
  id: string;
  path: string;
  format: 'terraform' | 'yaml' | 'json';
  content: string;
  version: number;
  commitMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

// Internal type for tree building (uses Record for fast lookup)
interface FileTreeBuildNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: Record<string, FileTreeBuildNode>;
}

interface Props {
  workspaceId?: string;
}

export default function ConfigIDE({ workspaceId }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['controls', 'frameworks'])
  );
  const [componentError, setComponentError] = useState<Error | null>(null);

  const queryClient = useQueryClient();

  // Fetch file list and initialize if empty
  // Note: All hooks must be called before any conditional returns
  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
    error: filesError,
  } = useQuery({
    queryKey: ['config-files', workspaceId],
    queryFn: async () => {
      try {
        // First check if files exist
        const response = await configAsCodeApi.listFiles(workspaceId);

        // If no files exist, try to initialize (but don't auto-initialize - let user click button)
        // Auto-initialization can be slow and might fail, so we'll let the user trigger it manually
        return response.data || { files: [], total: 0 };
      } catch (error: any) {
        console.error('Failed to fetch config files:', error);
        // Don't throw the error - return empty data instead
        // This prevents the error from propagating and potentially disabling the module
        // Return empty structure so the UI can still render and show the error message
        return { files: [], total: 0 };
      }
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
    // Don't refetch on window focus to avoid repeated errors
    refetchOnWindowFocus: false,
  });

  // Fetch selected file content
  const { data: fileData, isLoading: fileLoading } = useQuery({
    queryKey: ['config-file', selectedFile, workspaceId],
    queryFn: async () => {
      if (!selectedFile) return null;
      try {
        const response = await configAsCodeApi.getFile(selectedFile, workspaceId);
        return response.data;
      } catch (error: any) {
        console.error('Failed to fetch file content:', error);
        // Return null instead of throwing to prevent breaking the component
        return null;
      }
    },
    enabled: !!selectedFile,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Update local content when file data changes
  useEffect(() => {
    if (fileData) {
      setFileContent(fileData.content);
      setIsEditing(false);
    }
  }, [fileData]);

  // Save file mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      path: string;
      content: string;
      format: string;
      commitMessage?: string;
    }) => {
      // Check if file exists
      try {
        await configAsCodeApi.getFile(data.path, workspaceId);
        // File exists, update it
        return configAsCodeApi.updateFile(
          data.path,
          { content: data.content, commitMessage: data.commitMessage },
          workspaceId
        );
      } catch {
        // File doesn't exist, create it
        return configAsCodeApi.createFile({
          path: data.path,
          format: data.format as any,
          content: data.content,
          workspaceId,
          commitMessage: data.commitMessage,
        });
      }
    },
    onSuccess: () => {
      toast.success('File saved successfully');
      queryClient.invalidateQueries({ queryKey: ['config-files', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['config-file', selectedFile, workspaceId] });
      setIsEditing(false);
      setCommitMessage('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save file');
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (data: { path: string; content: string; format: string }) => {
      return configAsCodeApi.previewChanges({
        path: data.path,
        content: data.content,
        format: data.format as any,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to preview changes');
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (data: {
      path: string;
      content: string;
      format: string;
      commitMessage?: string;
    }) => {
      return configAsCodeApi.applyChanges(
        {
          path: data.path,
          content: data.content,
          format: data.format as any,
          commitMessage: data.commitMessage,
        },
        workspaceId
      );
    },
    onSuccess: (response) => {
      const { created, updated, deleted, errors } = response.data;
      toast.success(
        `Applied successfully: ${created} created, ${updated} updated, ${deleted} deleted${errors > 0 ? `, ${errors} errors` : ''}`,
        { duration: 5000 }
      );
      // Invalidate config file queries
      queryClient.invalidateQueries({ queryKey: ['config-files', workspaceId] });

      // Invalidate all resource queries that might have been affected by the apply
      // This ensures the list views and detail pages show updated data
      queryClient.invalidateQueries({ queryKey: ['controls'] });
      queryClient.invalidateQueries({ queryKey: ['control'] });
      queryClient.invalidateQueries({ queryKey: ['frameworks'] });
      queryClient.invalidateQueries({ queryKey: ['framework'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['risk'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });

      setIsEditing(false);
      setCommitMessage('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to apply changes');
    },
  });

  // Refresh from database mutation with loading toast
  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Show loading toast that persists during the operation
      toast.loading('Syncing Terraform files from database...', {
        id: 'refresh-db',
        duration: Infinity,
      });
      return configAsCodeApi.refreshFromDatabase(workspaceId);
    },
    onSuccess: (response) => {
      const { filesUpdated } = response.data;
      toast.success(`Refreshed ${filesUpdated} file(s) from database`, {
        id: 'refresh-db',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['config-files', workspaceId] });
      if (selectedFile) {
        queryClient.invalidateQueries({ queryKey: ['config-file', selectedFile, workspaceId] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to refresh from database', {
        id: 'refresh-db',
      });
    },
  });

  // Build file tree
  const buildFileTree = useCallback((files: ConfigFile[]): FileTreeNode[] => {
    const tree: Record<string, FileTreeBuildNode> = {};

    files.forEach((file) => {
      const parts = file.path.split('/');
      let current: Record<string, FileTreeBuildNode> = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // File
          current[part] = {
            name: part,
            path: file.path,
            type: 'file',
          };
        } else {
          // Folder
          if (!current[part]) {
            current[part] = {
              name: part,
              path: parts.slice(0, index + 1).join('/'),
              type: 'folder',
              children: {},
            };
          }
          current = current[part].children || {};
        }
      });
    });

    // Convert to array format
    const convertToArray = (node: FileTreeBuildNode): FileTreeNode[] => {
      if (node.type === 'file') {
        return [{ name: node.name, path: node.path, type: node.type }];
      }
      const childNodes = node.children ? Object.values(node.children) : [];
      const childrenArray = childNodes.flatMap(convertToArray);
      return [{ name: node.name, path: node.path, type: node.type, children: childrenArray }];
    };

    return Object.values(tree).flatMap(convertToArray);
  }, []);

  const fileTree = filesData?.files ? buildFileTree(filesData.files) : [];

  const handleFileSelect = (path: string) => {
    if (isEditing && fileContent !== fileData?.content) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    setSelectedFile(path);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!selectedFile || !fileData) return;

    const format = fileData.format;
    saveMutation.mutate({
      path: selectedFile,
      content: fileContent,
      format,
      commitMessage: commitMessage || undefined,
    });
  };

  const handlePreview = () => {
    if (!selectedFile || !fileData) return;

    previewMutation.mutate({
      path: selectedFile,
      content: fileContent,
      format: fileData.format,
    });
  };

  const handleApply = () => {
    if (!selectedFile || !fileData) return;

    if (!confirm('Apply changes to platform? This will create/update/delete resources.')) {
      return;
    }

    applyMutation.mutate({
      path: selectedFile,
      content: fileContent,
      format: fileData.format,
      commitMessage: commitMessage || undefined,
    });
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const getLanguage = (format: string) => {
    switch (format) {
      case 'terraform':
        return 'hcl';
      case 'yaml':
        return 'yaml';
      case 'json':
        return 'json';
      default:
        return 'plaintext';
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      formatOnPaste: true,
      formatOnType: true,
    });

    // Add Terraform/HCL language support
    monaco.languages.register({ id: 'hcl' });

    // Basic HCL syntax highlighting
    monaco.languages.setMonarchTokensProvider('hcl', {
      tokenizer: {
        root: [
          [/resource\s+"[^"]*"/, 'keyword'],
          [/variable\s+"[^"]*"/, 'keyword'],
          [/output\s+"[^"]*"/, 'keyword'],
          [/data\s+"[^"]*"/, 'keyword'],
          [/provider\s+"[^"]*"/, 'keyword'],
          [/"[^"]*"/, 'string'],
          [/\/\/.*$/, 'comment'],
          [/\/\*[\s\S]*?\*\//, 'comment'],
          [/[=]/, 'operator'],
          [/[{]/, 'delimiter.bracket'],
          [/[}]/, 'delimiter.bracket'],
          [/\[/, 'delimiter.bracket'],
          [/\]/, 'delimiter.bracket'],
        ],
      },
    });
  };

  const previewData = previewMutation.data?.data;

  // Error boundary check - must be after all hooks
  if (componentError) {
    return (
      <div className="p-6">
        <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
          <p className="text-red-600">Error in ConfigIDE component</p>
          <p className="text-red-700 text-sm mt-2">{componentError.message}</p>
          <button
            onClick={() => {
              setComponentError(null);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] border border-surface-700 rounded-lg overflow-hidden bg-surface-900">
      {/* File Explorer Sidebar */}
      <div className="w-64 border-r border-surface-700 bg-surface-800 overflow-y-auto">
        <div className="p-4 border-b border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-surface-200">Files</h3>
            <button
              onClick={() => {
                const path = prompt('Enter file path (e.g., controls/main.tf):');
                if (path) {
                  setSelectedFile(path);
                  setFileContent('');
                  setIsEditing(true);
                }
              }}
              className="p-1 text-surface-600 hover:text-surface-200"
              title="New File"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {filesLoading ? (
          <div className="p-4 text-surface-600 text-sm flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            <span>Loading files...</span>
          </div>
        ) : filesError ? (
          <div className="p-4 text-red-600 text-sm">
            Error loading files. Please check the console for details.
          </div>
        ) : fileTree.length === 0 ? (
          <div className="p-4 text-surface-600 text-sm space-y-3">
            <div className="text-surface-700">No Terraform files yet.</div>
            <p className="text-xs">
              Generate Terraform files from your current controls, frameworks, policies, and other
              GRC resources.
            </p>
            <Button
              onClick={async () => {
                try {
                  toast.loading(
                    'Generating Terraform files from platform state... This may take a moment.',
                    { id: 'init-files', duration: Infinity }
                  );
                  const response = await configAsCodeApi.listFiles(workspaceId, true);
                  await refetchFiles();

                  // Check if files were actually created
                  if (response.data?.files && response.data.files.length > 0) {
                    toast.success(
                      `Generated ${response.data.files.length} Terraform files from platform state`,
                      { id: 'init-files', duration: 4000 }
                    );
                  } else {
                    toast.error(
                      'Initialization completed but no files were created. Please check backend logs.',
                      { id: 'init-files', duration: 8000 }
                    );
                  }
                } catch (error: any) {
                  const errorMsg =
                    error.response?.data?.message || error.message || 'Failed to initialize files';
                  toast.error(`Initialization failed: ${errorMsg}`, {
                    id: 'init-files',
                    duration: 10000,
                  });
                  console.error('Initialization error:', error);
                  // Don't disable the module on error - just show the error
                }
              }}
              className="btn-sm flex items-center gap-2"
              variant="primary"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Generate Terraform Files
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {fileTree.map((node) => (
              <div key={node.path}>
                {node.type === 'folder' ? (
                  <div>
                    <button
                      onClick={() => toggleFolder(node.path)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-sm text-surface-700 hover:bg-surface-700 rounded"
                    >
                      <FolderIcon className="w-4 h-4" />
                      <span>{node.name}</span>
                    </button>
                    {expandedFolders.has(node.path) && node.children && (
                      <div className="ml-4">
                        {node.children.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => handleFileSelect(child.path)}
                            className={clsx(
                              'w-full flex items-center gap-2 px-2 py-1 text-sm rounded',
                              selectedFile === child.path
                                ? 'bg-brand-500/20 text-brand-300'
                                : 'text-surface-600 hover:bg-surface-700'
                            )}
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{child.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleFileSelect(node.path)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1 text-sm rounded',
                      selectedFile === node.path
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'text-surface-600 hover:bg-surface-700'
                    )}
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    <span>{node.name}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* Editor Header */}
            <div className="h-12 border-b border-surface-700 bg-surface-800 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-surface-600" />
                <span className="text-sm font-medium text-surface-200">{selectedFile}</span>
                {fileData && <span className="text-xs text-surface-500">v{fileData.version}</span>}
                {isEditing && <span className="text-xs text-yellow-600">● Modified</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    if (
                      confirm(
                        'Regenerate Terraform files from database? This will overwrite any unsaved changes in the editor.'
                      )
                    ) {
                      refreshMutation.mutate();
                    }
                  }}
                  disabled={refreshMutation.isPending}
                  className="btn-sm flex items-center gap-1"
                  title="Regenerate Terraform files from your current GRC data (controls, frameworks, policies, etc.)"
                  variant="secondary"
                >
                  <ArrowPathIcon
                    className={clsx('w-4 h-4', refreshMutation.isPending && 'animate-spin')}
                  />
                  {refreshMutation.isPending ? 'Syncing...' : 'Sync from DB'}
                </Button>
                <div className="w-px h-6 bg-surface-600" />
                <Input
                  type="text"
                  placeholder="Commit message (optional)"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="px-2 py-1 text-xs bg-surface-700 border border-surface-600 rounded text-surface-200 placeholder-surface-500"
                  style={{ width: '200px' }}
                />
                <Button
                  onClick={handlePreview}
                  disabled={previewMutation.isPending || !isEditing}
                  className="btn-sm flex items-center gap-1"
                  variant="secondary"
                >
                  <EyeIcon className="w-4 h-4" />
                  Preview
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !isEditing}
                  className="btn-sm flex items-center gap-1"
                  variant="secondary"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Save
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={applyMutation.isPending || !isEditing}
                  className="btn-sm flex items-center gap-1"
                  variant="primary"
                >
                  <PlayIcon className="w-4 h-4" />
                  Apply
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 relative">
              {fileLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-surface-600">Loading...</div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  language={fileData ? getLanguage(fileData.format) : 'plaintext'}
                  value={fileContent}
                  onChange={(value) => {
                    setFileContent(value || '');
                    setIsEditing(true);
                  }}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    readOnly: false,
                    automaticLayout: true,
                  }}
                />
              )}
            </div>

            {/* Preview Panel */}
            {previewData && (
              <div className="h-48 border-t border-surface-700 bg-surface-800 p-4 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <EyeIcon className="w-5 h-5 text-brand-400" />
                  <h4 className="font-semibold text-surface-200">Preview Changes</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">+{previewData.toCreate}</span>
                    <span className="text-surface-600">to create</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600">~{previewData.toUpdate}</span>
                    <span className="text-surface-600">to update</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">-{previewData.toDelete}</span>
                    <span className="text-surface-600">to delete</span>
                  </div>
                  {previewData.warnings && previewData.warnings.length > 0 && (
                    <div className="mt-2">
                      <div className="text-yellow-600 font-medium">Warnings:</div>
                      <ul className="list-disc list-inside text-surface-600">
                        {previewData.warnings.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {previewData.errors && previewData.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="text-red-600 font-medium">Errors:</div>
                      <ul className="list-disc list-inside text-surface-600">
                        {previewData.errors.map((e: string, i: number) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-surface-600">
            <div className="text-center">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a file from the explorer to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
