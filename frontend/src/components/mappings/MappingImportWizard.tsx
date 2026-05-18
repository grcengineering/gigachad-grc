import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { mappingsApi } from '@/lib/api';
import { frameworksApi } from '@/lib/api/frameworks.api';
import type {
  Framework,
  ImportResult,
  MappingImportRowOutcome,
  MappingImportRowStatus,
} from '@/lib/apiTypes';

export interface MappingImportWizardProps {
  open: boolean;
  onClose: () => void;
  frameworkId?: string;
  onComplete: (result: ImportResult) => void;
}

type WizardStage = 'upload' | 'preview' | 'result';

const ACCEPTED_EXTENSIONS = '.csv,.xlsx';

const STATUS_PILL_CLASSES: Record<MappingImportRowStatus, string> = {
  will_create: 'bg-green-500/20 text-green-300 border border-green-500/40',
  duplicate: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  error: 'bg-red-500/20 text-red-300 border border-red-500/40',
};

const STATUS_PILL_LABEL: Record<MappingImportRowStatus, string> = {
  will_create: 'Will create',
  duplicate: 'Duplicate',
  error: 'Error',
};

function getRowValue(row: MappingImportRowOutcome, key: string): string {
  const raw = row.originalValues?.[key];
  return raw && raw.length > 0 ? raw : '—';
}

export function MappingImportWizard({
  open,
  onClose,
  frameworkId,
  onComplete,
}: MappingImportWizardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<WizardStage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showFrameworkSelector = !frameworkId;

  const { data: frameworks } = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list(),
    enabled: open && showFrameworkSelector,
  });

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mappings'] });
    queryClient.invalidateQueries({
      queryKey: ['framework-requirements', frameworkId],
    });
    queryClient.invalidateQueries({ queryKey: ['requirement-mappings'] });
  }, [queryClient, frameworkId]);

  const validateMutation = useMutation({
    mutationFn: (uploaded: File) => mappingsApi.bulkImport(uploaded, true),
    onSuccess: (result) => {
      setPreviewResult(result);
      setStage('preview');
      setErrorMessage(null);
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const commitMutation = useMutation({
    mutationFn: (uploaded: File) => mappingsApi.bulkImport(uploaded, false),
    onSuccess: (result) => {
      setCommitResult(result);
      setStage('result');
      setErrorMessage(null);
      invalidateQueries();
    },
    onError: (error: unknown) => {
      const message = extractErrorMessage(error);
      setErrorMessage(message);
      toast.error(message);
    },
  });

  const resetState = () => {
    setStage('upload');
    setFile(null);
    setDragActive(false);
    setSelectedFrameworkId('');
    setPreviewResult(null);
    setCommitResult(null);
    setErrorMessage(null);
    validateMutation.reset();
    commitMutation.reset();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSelectFile = (incoming: File | null) => {
    if (!incoming) return;
    setFile(incoming);
    setErrorMessage(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleSelectFile(dropped);
  };

  const handleValidate = () => {
    if (!file) return;
    validateMutation.mutate(file);
  };

  const handleConfirm = () => {
    if (!file) return;
    commitMutation.mutate(file);
  };

  const handleDone = () => {
    if (commitResult) onComplete(commitResult);
    handleClose();
  };

  const handleBackToUpload = () => {
    setStage('upload');
    setPreviewResult(null);
    setErrorMessage(null);
  };

  if (!open) return null;

  const canValidate = Boolean(file) && (!showFrameworkSelector || selectedFrameworkId.length > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
          onClick={handleClose}
        />

        <div className="relative w-full max-w-3xl bg-surface-900 rounded-xl shadow-2xl border border-surface-700">
          <div className="flex items-center justify-between p-6 border-b border-surface-700">
            <div>
              <h2 className="text-xl font-semibold text-surface-100">Import mappings</h2>
              <p className="text-sm text-surface-400 mt-1">
                {stage === 'upload' && 'Upload a CSV or XLSX file to validate before committing.'}
                {stage === 'preview' && 'Review parsed rows before importing.'}
                {stage === 'result' && 'Import complete.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close import wizard"
              className="p-2 text-surface-400 hover:text-surface-200 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6" data-testid="wizard-content" data-stage={stage}>
            {stage === 'upload' && (
              <UploadStage
                file={file}
                dragActive={dragActive}
                showFrameworkSelector={showFrameworkSelector}
                frameworks={frameworks ?? []}
                selectedFrameworkId={selectedFrameworkId}
                onFrameworkChange={setSelectedFrameworkId}
                fileInputRef={fileInputRef}
                onSelectFile={handleSelectFile}
                onDrag={handleDrag}
                onDrop={handleDrop}
              />
            )}

            {stage === 'preview' && previewResult && <PreviewStage result={previewResult} />}

            {stage === 'result' && commitResult && <ResultStage result={commitResult} />}

            {errorMessage && stage !== 'result' && (
              <div
                role="alert"
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300"
              >
                {errorMessage}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-6 border-t border-surface-700">
            {stage === 'upload' && (
              <>
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={!canValidate || validateMutation.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validateMutation.isPending ? 'Validating…' : 'Validate'}
                </button>
              </>
            )}

            {stage === 'preview' && (
              <>
                <button
                  type="button"
                  onClick={handleBackToUpload}
                  className="btn-secondary inline-flex items-center"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={commitMutation.isPending}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commitMutation.isPending ? 'Importing…' : 'Confirm import'}
                </button>
              </>
            )}

            {stage === 'result' && (
              <button type="button" onClick={handleDone} className="btn-primary ml-auto">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface UploadStageProps {
  file: File | null;
  dragActive: boolean;
  showFrameworkSelector: boolean;
  frameworks: Framework[];
  selectedFrameworkId: string;
  onFrameworkChange: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onSelectFile: (file: File | null) => void;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function UploadStage({
  file,
  dragActive,
  showFrameworkSelector,
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
  fileInputRef,
  onSelectFile,
  onDrag,
  onDrop,
}: UploadStageProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-surface-800/50 rounded-lg border border-surface-700 text-sm text-surface-300">
        <p className="font-medium text-surface-200 mb-2">Required columns</p>
        <ul className="space-y-1 text-xs text-surface-400 list-disc list-inside">
          <li>
            <span className="font-mono text-surface-300">framework_code</span> — e.g.{' '}
            <span className="font-mono">soc2:2017</span>
          </li>
          <li>
            <span className="font-mono text-surface-300">requirement_ref</span> — requirement
            reference within the framework
          </li>
          <li>
            <span className="font-mono text-surface-300">control_code</span> — control ID, e.g.{' '}
            <span className="font-mono">AC-001</span>
          </li>
          <li>
            <span className="font-mono text-surface-300">mapping_type</span> —{' '}
            <span className="font-mono">primary</span> or{' '}
            <span className="font-mono">supporting</span>
          </li>
          <li>
            <span className="font-mono text-surface-300">notes</span> — optional, up to 4096
            characters
          </li>
        </ul>
      </div>

      {showFrameworkSelector && (
        <div>
          <label
            htmlFor="mapping-import-framework"
            className="block text-sm font-medium text-surface-300 mb-2"
          >
            Framework (optional)
          </label>
          <select
            id="mapping-import-framework"
            value={selectedFrameworkId}
            onChange={(e) => onFrameworkChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-surface-100 focus:outline-none focus:border-brand-500"
          >
            <option value="">Select a framework…</option>
            {frameworks.map((fw) => (
              <option key={fw.id} value={fw.id}>
                {fw.name}
                {fw.version ? ` (${fw.version})` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-surface-500 mt-1">
            Helps you organise; the file still drives which framework each row maps to.
          </p>
        </div>
      )}

      <div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragActive
            ? 'border-brand-500 bg-brand-500/10'
            : file
              ? 'border-green-500 bg-green-500/10'
              : 'border-surface-700 hover:border-surface-600'
        )}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Mapping import file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />

        {file ? (
          <div className="space-y-2">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-green-400" />
            <p className="text-surface-100 font-medium">{file.name}</p>
            <p className="text-surface-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
            <button
              type="button"
              onClick={() => onSelectFile(null)}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              Choose a different file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <CloudArrowUpIcon className="w-12 h-12 mx-auto text-surface-500" />
            <p className="text-surface-300">
              Drag and drop your file here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-brand-400 hover:text-brand-300"
              >
                browse
              </button>
            </p>
            <p className="text-surface-500 text-sm">Supports .csv and .xlsx files (max 25 MB)</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewStage({ result }: { result: ImportResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <SummaryTile label="Total rows" value={result.totalRows} accent="text-surface-200" />
        <SummaryTile label="Will create" value={result.successful} accent="text-green-400" />
        <SummaryTile label="Duplicates" value={result.duplicates} accent="text-yellow-400" />
        <SummaryTile label="Errors" value={result.errors.length} accent="text-red-400" />
      </div>

      <div className="border border-surface-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm" aria-label="Import preview rows">
          <thead className="bg-surface-800 text-xs uppercase text-surface-400">
            <tr>
              <th className="px-3 py-2 text-left">Row</th>
              <th className="px-3 py-2 text-left">Framework</th>
              <th className="px-3 py-2 text-left">Requirement</th>
              <th className="px-3 py-2 text-left">Control</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800 max-h-80">
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-surface-500 italic">
                  No rows parsed
                </td>
              </tr>
            ) : (
              result.rows.map((row) => (
                <tr
                  key={row.row}
                  data-testid={`preview-row-${row.row}`}
                  data-status={row.status}
                  className="hover:bg-surface-800/40"
                >
                  <td className="px-3 py-2 font-mono text-surface-400">{row.row}</td>
                  <td className="px-3 py-2 text-surface-200">
                    {getRowValue(row, 'framework_code')}
                  </td>
                  <td className="px-3 py-2 text-surface-200">
                    {getRowValue(row, 'requirement_ref')}
                  </td>
                  <td className="px-3 py-2 text-surface-200">{getRowValue(row, 'control_code')}</td>
                  <td className="px-3 py-2 text-surface-200">{getRowValue(row, 'mapping_type')}</td>
                  <td className="px-3 py-2 text-surface-400 truncate max-w-xs">
                    {getRowValue(row, 'notes')}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_PILL_CLASSES[row.status]
                      )}
                    >
                      {STATUS_PILL_LABEL[row.status]}
                    </span>
                    {row.status === 'error' && row.errorMessage && (
                      <p className="text-xs text-red-400 mt-1">{row.errorMessage}</p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultStage({ result }: { result: ImportResult }) {
  const hasErrors = result.errors.length > 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {hasErrors ? (
          <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
        ) : (
          <CheckCircleIcon className="w-8 h-8 text-green-400" />
        )}
        <div>
          <h3 className="text-lg font-medium text-surface-100">Import complete</h3>
          <p className="text-surface-400">
            Processed {result.totalRows} row{result.totalRows === 1 ? '' : 's'} from the file
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <SummaryTile label="Total rows" value={result.totalRows} accent="text-surface-200" />
        <SummaryTile label="Created" value={result.successful} accent="text-green-400" />
        <SummaryTile label="Duplicates" value={result.duplicates} accent="text-yellow-400" />
        <SummaryTile label="Errors" value={result.errors.length} accent="text-red-400" />
      </div>

      {hasErrors && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <h4 className="font-medium text-red-400 mb-2">Errors</h4>
          <ul
            aria-label="Import errors"
            className="max-h-40 overflow-y-auto space-y-1 text-sm text-surface-300"
          >
            {result.errors.map((err) => (
              <li key={err.row}>
                <span className="font-mono text-red-400">Row {err.row}:</span> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-surface-800 rounded-lg p-4 text-center">
      <div className={clsx('text-2xl font-bold', accent)}>{value}</div>
      <div className="text-sm text-surface-400">{label}</div>
    </div>
  );
}

function extractErrorMessage(error: unknown): string {
  if (!error) return 'Import failed';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const maybe = error as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybe.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (typeof maybe.message === 'string') return maybe.message;
  }
  return 'Import failed';
}

export default MappingImportWizard;
