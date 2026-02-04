import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { controlsApi } from '@/lib/api';
import clsx from 'clsx';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadResult {
  total?: number;
  created: number;
  updated: number;
  skipped: number;
  errors?: Array<{
    controlId: string;
    error: string;
    row?: number;
  }>;
}

type UploadMode = 'csv' | 'json';

const MAX_BULK_ITEMS = 500;

export default function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadMode, setUploadMode] = useState<UploadMode>('csv');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [skipExisting, setSkipExisting] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (data: { content: string; mode: UploadMode }) => {
      // Pre-validate row count before upload
      if (data.mode === 'csv') {
        const lines = data.content.split('\n').filter((line) => line.trim());
        const rowCount = lines.length - 1; // Subtract header row
        if (rowCount > MAX_BULK_ITEMS) {
          throw new Error(`Maximum ${MAX_BULK_ITEMS} items per upload. File has ${rowCount} rows.`);
        }
        const response = await controlsApi.bulkUploadCSV({
          csv: data.content,
          skipExisting,
          updateExisting,
        });
        return response.data;
      } else {
        const controls = JSON.parse(data.content);
        const items = Array.isArray(controls) ? controls : controls.controls;
        if (items.length > MAX_BULK_ITEMS) {
          throw new Error(
            `Maximum ${MAX_BULK_ITEMS} items per upload. File has ${items.length} items.`
          );
        }
        const response = await controlsApi.bulkUpload({
          controls: items,
          skipExisting,
          updateExisting,
        });
        return response.data;
      }
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['controls'] });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    setFileName(file.name);

    // Detect mode from file extension
    if (file.name.endsWith('.json')) {
      setUploadMode('json');
    } else {
      setUploadMode('csv');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (!fileContent) return;
    uploadMutation.mutate({ content: fileContent, mode: uploadMode });
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await controlsApi.getTemplate();
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'controls-template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download template:', error);
    }
  };

  const handleClose = () => {
    setFileContent('');
    setFileName('');
    setResult(null);
    uploadMutation.reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-surface-900 rounded-xl shadow-2xl border border-surface-700">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-700">
            <div>
              <h2 className="text-xl font-semibold text-surface-100">Bulk Upload Controls</h2>
              <p className="text-sm text-surface-400 mt-1">Import controls from CSV or JSON file</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Result display */}
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {!result.errors?.length ? (
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  ) : (
                    <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-surface-100">Upload Complete</h3>
                    <p className="text-surface-400">
                      Processed {result.total || result.created + result.updated + result.skipped}{' '}
                      controls
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-surface-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{result.created}</div>
                    <div className="text-sm text-surface-400">Created</div>
                  </div>
                  <div className="bg-surface-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">{result.updated}</div>
                    <div className="text-sm text-surface-400">Updated</div>
                  </div>
                  <div className="bg-surface-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-surface-400">{result.skipped}</div>
                    <div className="text-sm text-surface-400">Skipped</div>
                  </div>
                  <div className="bg-surface-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {result.errors?.length || 0}
                    </div>
                    <div className="text-sm text-surface-400">Errors</div>
                  </div>
                </div>

                {(result.errors?.length ?? 0) > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h4 className="font-medium text-red-400 mb-2">Errors</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors?.map((error, index) => (
                        <div key={index} className="text-sm text-surface-300">
                          <span className="font-mono text-red-400">
                            Row {error.row || '?'} ({error.controlId}):
                          </span>{' '}
                          {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleClose} className="btn-primary w-full">
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* File format selector */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setUploadMode('csv')}
                    className={clsx(
                      'flex-1 py-2 px-4 rounded-lg border transition-colors',
                      uploadMode === 'csv'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600'
                    )}
                  >
                    CSV Format
                  </button>
                  <button
                    onClick={() => setUploadMode('json')}
                    className={clsx(
                      'flex-1 py-2 px-4 rounded-lg border transition-colors',
                      uploadMode === 'json'
                        ? 'bg-brand-600 border-brand-500 text-white'
                        : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600'
                    )}
                  >
                    JSON Format
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  className={clsx(
                    'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                    dragActive
                      ? 'border-brand-500 bg-brand-500/10'
                      : fileContent
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-surface-700 hover:border-surface-600'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {fileContent ? (
                    <div className="space-y-2">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-green-400" />
                      <p className="text-surface-100 font-medium">{fileName}</p>
                      <p className="text-surface-400 text-sm">
                        {fileContent.split('\n').length} lines loaded
                      </p>
                      <button
                        onClick={() => {
                          setFileContent('');
                          setFileName('');
                        }}
                        className="text-sm text-brand-400 hover:text-brand-300"
                      >
                        Choose different file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CloudArrowUpIcon className="w-12 h-12 mx-auto text-surface-500" />
                      <p className="text-surface-300">
                        Drag and drop your file here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-brand-400 hover:text-brand-300"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-surface-500 text-sm">Supports .csv and .json files</p>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={skipExisting}
                      onChange={(e) => {
                        setSkipExisting(e.target.checked);
                        if (e.target.checked) setUpdateExisting(false);
                      }}
                      className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-surface-300">Skip existing controls</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => {
                        setUpdateExisting(e.target.checked);
                        if (e.target.checked) setSkipExisting(false);
                      }}
                      className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-surface-300">Update existing controls</span>
                  </label>
                </div>

                {/* Template download */}
                <div className="bg-surface-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-surface-200">Need a template?</h4>
                      <p className="text-sm text-surface-400">
                        Download our CSV template with example data
                      </p>
                    </div>
                    <button onClick={handleDownloadTemplate} className="btn-secondary text-sm">
                      <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {uploadMutation.isError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400">
                      {(uploadMutation.error as any)?.response?.data?.message ||
                        (uploadMutation.error as Error)?.message ||
                        'Upload failed'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!result && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-700">
              <button onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!fileContent || uploadMutation.isPending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white/30 rounded-full border-t-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                    Upload Controls
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
