import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { controlsApi } from '@/lib/api';
import { Button, Dialog } from '@/components/ui';
import clsx from 'clsx';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    controlId: string;
    error: string;
    row?: number;
  }>;
}

type UploadMode = 'csv' | 'json';

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
      if (data.mode === 'csv') {
        const response = await controlsApi.bulkUploadCSV({
          csv: data.content,
          skipExisting,
          updateExisting,
        });
        return response.data;
      } else {
        const controls = JSON.parse(data.content);
        const response = await controlsApi.bulkUpload({
          controls: Array.isArray(controls) ? controls : controls.controls,
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

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      size="lg"
      title="Bulk Upload Controls"
      description="Import controls from CSV or JSON file"
      footer={
        !result ? (
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!fileContent || uploadMutation.isPending}>
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
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Result display */}
        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {result.errors.length === 0 ? (
                <CheckCircleIcon className="w-8 h-8 text-emerald-700" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-700" />
              )}
              <div>
                <h3 className="text-lg font-medium text-surface-900">Upload Complete</h3>
                <p className="text-surface-600">Processed {result.total} controls</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-surface-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
                <div className="text-sm text-surface-600">Created</div>
              </div>
              <div className="bg-surface-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
                <div className="text-sm text-surface-600">Updated</div>
              </div>
              <div className="bg-surface-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-surface-600">{result.skipped}</div>
                <div className="text-sm text-surface-600">Skipped</div>
              </div>
              <div className="bg-surface-100 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-sm text-surface-600">Errors</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-medium text-red-600 mb-2">Errors</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-surface-700">
                      <span className="font-mono text-red-600">
                        Row {error.row || '?'} ({error.controlId}):
                      </span>{' '}
                      {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleClose} fullWidth>
              Done
            </Button>
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
                    : 'bg-surface-100 border-surface-300 text-surface-700 hover:border-surface-400'
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
                    : 'bg-surface-100 border-surface-300 text-surface-700 hover:border-surface-400'
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
                    : 'border-surface-300 hover:border-surface-400'
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
                  <DocumentTextIcon className="w-12 h-12 mx-auto text-emerald-700" />
                  <p className="text-surface-900 font-medium">{fileName}</p>
                  <p className="text-surface-600 text-sm">
                    {fileContent.split('\n').length} lines loaded
                  </p>
                  <button
                    onClick={() => {
                      setFileContent('');
                      setFileName('');
                    }}
                    className="text-sm text-brand-700 hover:text-brand-800"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudArrowUpIcon className="w-12 h-12 mx-auto text-surface-500" />
                  <p className="text-surface-700">
                    Drag and drop your file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-brand-700 hover:text-brand-800"
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
                  className="w-4 h-4 rounded border-surface-400 bg-surface-100 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-surface-700">Skip existing controls</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => {
                    setUpdateExisting(e.target.checked);
                    if (e.target.checked) setSkipExisting(false);
                  }}
                  className="w-4 h-4 rounded border-surface-400 bg-surface-100 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-surface-700">Update existing controls</span>
              </label>
            </div>

            {/* Template download */}
            <div className="bg-surface-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-surface-800">Need a template?</h4>
                  <p className="text-sm text-surface-600">
                    Download our CSV template with example data
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleDownloadTemplate}>
                  <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Error message */}
            {uploadMutation.isError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-600">
                  {(uploadMutation.error as any)?.response?.data?.message ||
                    (uploadMutation.error as Error)?.message ||
                    'Upload failed'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
