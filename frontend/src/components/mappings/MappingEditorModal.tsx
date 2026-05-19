import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { Modal, ModalFooter } from '@/components/ui/Modal';
import { controlsApi } from '@/lib/api/controls.api';
import { frameworksApi } from '@/lib/api/frameworks.api';
import type {
  Control,
  ControlMapping,
  CreateMappingData,
  Framework,
  FrameworkRequirement,
  MappingSuggestion,
} from '@/lib/apiTypes';

import { Input } from '@/components/ui/Input';

import { SelectNative } from '@/components/ui/SelectNative';

export type MappingEditorMode = 'requirement-to-controls' | 'control-to-requirements';

/**
 * Confidence threshold at or above which AI suggestions are considered
 * high-confidence. Exported for downstream callers (e.g. e2e tests).
 */
export const SUGGESTION_AUTO_SELECT_THRESHOLD = 0.7;

/**
 * Mock-mode banner copy (locked verbatim per PR-B-ai contract §0.10).
 */
const MOCK_MODE_BANNER_COPY =
  'AI provider not configured — showing heuristic suggestions based on shared keywords.';

type SuggestionsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready';
      suggestions: MappingSuggestion[];
      isMockMode: boolean;
      mockModeReason?: string;
    }
  | { status: 'error'; message: string; isRateLimited: boolean };

export interface MappingEditorModalProps {
  open: boolean;
  onClose: () => void;
  mode: MappingEditorMode;

  // Anchor — exactly one required matching mode
  requirementId?: string;
  controlId?: string;

  // Framework: required+locked in requirement mode; optional+selectable in control mode
  frameworkId?: string;

  // IDs of already-mapped items in the other axis — picker hides these
  existingMappingIds: string[];

  // Edit mode: pre-populates with one mapping's current state; Save calls update()
  editingMappingId?: string;

  // Cross-framework copy: when set, pre-seed each new row's mappingType / notes
  // on the per-row-form stage. Ignored in edit mode.
  defaultMappingType?: 'primary' | 'supporting';
  defaultNotes?: string;

  onSaved: (createdMappingIds: string[]) => void;
}

type Stage = 'search' | 'multi-select' | 'per-row-form' | 'submit';

type MappingType = 'primary' | 'supporting';

interface RowDraft {
  candidateId: string;
  mappingType: MappingType;
  notes: string;
}

interface BulkCreateResult {
  success: boolean;
  mapping?: ControlMapping & { id: string };
  error?: string;
}

const STAGE_ORDER: Stage[] = ['search', 'multi-select', 'per-row-form', 'submit'];

function previousStage(stage: Stage): Stage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

export function MappingEditorModal({
  open,
  onClose,
  mode,
  requirementId,
  controlId,
  frameworkId: initialFrameworkId,
  existingMappingIds,
  editingMappingId,
  defaultMappingType,
  defaultNotes,
  onSaved,
}: MappingEditorModalProps) {
  const isEditMode = Boolean(editingMappingId);

  const [stage, setStage] = useState<Stage>('search');
  const [search, setSearch] = useState('');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | undefined>(
    initialFrameworkId
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsState>({ status: 'idle' });

  // Reset everything when modal opens or context changes
  useEffect(() => {
    if (!open) return;
    setStage(isEditMode ? 'per-row-form' : 'search');
    setSearch('');
    setSelectedFrameworkId(initialFrameworkId);
    setSelectedIds(editingMappingId ? [editingMappingId] : []);
    setRows([]);
    setErrorMessage(null);
    setSuggestions({ status: 'idle' });
  }, [open, isEditMode, editingMappingId, initialFrameworkId]);

  // Frameworks list (only needed for control mode without preset framework)
  const frameworksQuery = useQuery({
    queryKey: ['frameworks'],
    queryFn: () => frameworksApi.list(),
    enabled: open && mode === 'control-to-requirements' && !initialFrameworkId,
  });

  // Controls list (requirement mode picker)
  const controlsQuery = useQuery({
    queryKey: ['controls'],
    queryFn: () => controlsApi.list(),
    enabled: open && mode === 'requirement-to-controls' && !isEditMode,
  });

  // Requirements list (control mode picker). Uses `listAll` so the
  // picker shows non-category leaves nested deep inside the catalog
  // tree — `list()` would only return parentId=null rows (categories).
  const requirementsQuery = useQuery({
    queryKey: ['framework-requirements-all', selectedFrameworkId],
    queryFn: () =>
      selectedFrameworkId
        ? frameworksApi.requirements.listAll(selectedFrameworkId)
        : Promise.resolve([] as FrameworkRequirement[]),
    enabled:
      open && mode === 'control-to-requirements' && !isEditMode && Boolean(selectedFrameworkId),
  });

  // controlsApi.list() resolves to whatever the backend sends. The real
  // `/api/controls` endpoint wraps results as `{ data, meta }`; tests
  // historically mocked it to a plain array. Accept both shapes.
  const controlsList: Control[] = useMemo(() => {
    const raw: unknown = controlsQuery.data;
    if (Array.isArray(raw)) return raw as Control[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
      return (raw as { data: Control[] }).data;
    }
    return [];
  }, [controlsQuery.data]);

  const candidates = useMemo(() => {
    const hidden = new Set(existingMappingIds);
    const query = search.trim().toLowerCase();

    if (mode === 'requirement-to-controls') {
      return controlsList
        .filter((c) => !hidden.has(c.id))
        .filter((c) => (query ? `${c.controlId} ${c.title}`.toLowerCase().includes(query) : true));
    }

    const all: FrameworkRequirement[] = requirementsQuery.data ?? [];
    return all
      .filter((r) => !r.isCategory)
      .filter((r) => !hidden.has(r.id))
      .filter((r) => (query ? `${r.reference} ${r.title}`.toLowerCase().includes(query) : true));
  }, [mode, controlsList, requirementsQuery.data, existingMappingIds, search]);

  const candidateLabel = (id: string): string => {
    if (mode === 'requirement-to-controls') {
      const ctrl = controlsList.find((c) => c.id === id);
      return ctrl ? `${ctrl.controlId} — ${ctrl.title}` : id;
    }
    const req = (requirementsQuery.data ?? []).find((r) => r.id === id);
    return req ? `${req.reference} — ${req.title}` : id;
  };

  const canProceedFromSearch = (() => {
    if (mode === 'requirement-to-controls') {
      return Boolean(requirementId);
    }
    return Boolean(selectedFrameworkId) && Boolean(controlId);
  })();

  const canProceedFromMultiSelect = selectedIds.length > 0;

  const allRowsValid =
    rows.length > 0 &&
    rows.every((r) => r.mappingType === 'primary' || r.mappingType === 'supporting');

  const resolvedFrameworkId =
    mode === 'requirement-to-controls' ? initialFrameworkId : selectedFrameworkId;

  const canSuggest =
    !isEditMode &&
    Boolean(resolvedFrameworkId) &&
    (mode === 'requirement-to-controls' ? Boolean(requirementId) : Boolean(controlId));

  async function handleSuggest() {
    if (!canSuggest || !resolvedFrameworkId) return;
    setSuggestions({ status: 'loading' });
    try {
      const response = await frameworksApi.mappings.suggest({
        frameworkId: resolvedFrameworkId,
        requirementId: mode === 'requirement-to-controls' ? requirementId : undefined,
        controlId: mode === 'control-to-requirements' ? controlId : undefined,
      });
      setSuggestions({
        status: 'ready',
        suggestions: response.suggestions,
        isMockMode: response.isMockMode,
        mockModeReason: response.mockModeReason,
      });
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 429) {
        setSuggestions({
          status: 'error',
          message: 'Try again in a moment.',
          isRateLimited: true,
        });
        return;
      }
      setSuggestions({
        status: 'error',
        message: extractErrorMessage(err),
        isRateLimited: false,
      });
    }
  }

  function handleUseSuggestion(candidateId: string) {
    setSelectedIds((prev) => (prev.includes(candidateId) ? prev : [...prev, candidateId]));
  }

  function handleBack() {
    const prev = previousStage(stage);
    if (prev) setStage(prev);
  }

  function handleAdvanceFromSearch() {
    setErrorMessage(null);
    setStage('multi-select');
  }

  function handleAdvanceFromMultiSelect() {
    setErrorMessage(null);
    setRows(
      selectedIds.map((id) => ({
        candidateId: id,
        mappingType: defaultMappingType ?? 'primary',
        notes: defaultNotes ?? '',
      }))
    );
    setStage('per-row-form');
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function updateRow(candidateId: string, patch: Partial<Omit<RowDraft, 'candidateId'>>) {
    setRows((prev) => prev.map((r) => (r.candidateId === candidateId ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    setErrorMessage(null);

    if (isEditMode) {
      const row = rows[0];
      if (!row || !editingMappingId) {
        setErrorMessage('Missing mapping to edit.');
        return;
      }
      setStage('submit');
      try {
        await frameworksApi.mappings.update(editingMappingId, {
          mappingType: row.mappingType,
          notes: row.notes.trim() || undefined,
        });
        onSaved([editingMappingId]);
        onClose();
      } catch (err) {
        const msg = extractErrorMessage(err);
        toast.error(msg);
        setErrorMessage(msg);
        setStage('per-row-form');
      }
      return;
    }

    // Create mode — bulkCreate
    const fwId = mode === 'requirement-to-controls' ? initialFrameworkId : selectedFrameworkId;
    if (!fwId) {
      setErrorMessage('Framework is required.');
      return;
    }

    const payload: CreateMappingData[] = rows.map((r) => {
      if (mode === 'requirement-to-controls') {
        return {
          frameworkId: fwId,
          requirementId: requirementId as string,
          controlId: r.candidateId,
          mappingType: r.mappingType,
          notes: r.notes.trim() || undefined,
        };
      }
      return {
        frameworkId: fwId,
        requirementId: r.candidateId,
        controlId: controlId as string,
        mappingType: r.mappingType,
        notes: r.notes.trim() || undefined,
      };
    });

    setStage('submit');
    try {
      const result = (await frameworksApi.mappings.bulkCreate({
        mappings: payload,
      })) as BulkCreateResult[];

      const createdIds: string[] = [];
      const errors: string[] = [];
      for (const row of result ?? []) {
        if (row.success && row.mapping?.id) {
          createdIds.push(row.mapping.id);
        } else if (!row.success && row.error) {
          errors.push(row.error);
        }
      }

      if (errors.length > 0 && createdIds.length === 0) {
        const msg = errors[0] ?? 'Failed to create mappings.';
        toast.error(msg);
        setErrorMessage(msg);
        setStage('per-row-form');
        return;
      }

      if (errors.length > 0) {
        toast.error(`Created ${createdIds.length}, ${errors.length} failed.`);
      }

      onSaved(createdIds);
      onClose();
    } catch (err) {
      const msg = extractErrorMessage(err);
      toast.error(msg);
      setErrorMessage(msg);
      setStage('per-row-form');
    }
  }

  // Edit-mode bootstrap: derive an initial row from the existing mapping context.
  // We don't have a direct fetch-by-id endpoint here; the modal trusts the caller
  // for editingMappingId and renders a single editable row.
  useEffect(() => {
    if (!open || !isEditMode || !editingMappingId) return;
    if (rows.length > 0) return;
    setRows([
      {
        candidateId: editingMappingId,
        mappingType: 'primary',
        notes: '',
      },
    ]);
  }, [open, isEditMode, editingMappingId, rows.length]);

  const title = isEditMode ? 'Edit mapping' : 'Add mappings';

  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        {!isEditMode && stage !== 'search' && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-surface-600 hover:text-surface-200"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        )}

        {stage === 'search' && (
          <SearchStage
            mode={mode}
            frameworks={frameworksQuery.data ?? []}
            frameworksLoading={frameworksQuery.isLoading}
            initialFrameworkLocked={Boolean(initialFrameworkId)}
            selectedFrameworkId={selectedFrameworkId}
            onSelectFramework={setSelectedFrameworkId}
            search={search}
            onSearchChange={setSearch}
          />
        )}

        {stage === 'multi-select' && (
          <>
            <SuggestionsPanel
              state={suggestions}
              canSuggest={canSuggest}
              onSuggest={handleSuggest}
              onUse={handleUseSuggestion}
              selectedIds={selectedIds}
            />
            <MultiSelectStage
              mode={mode}
              candidates={candidates}
              isLoading={
                mode === 'requirement-to-controls'
                  ? controlsQuery.isLoading
                  : requirementsQuery.isLoading
              }
              selectedIds={selectedIds}
              onToggle={toggleSelection}
              search={search}
              onSearchChange={setSearch}
            />
          </>
        )}

        {(stage === 'per-row-form' || stage === 'submit') && (
          <PerRowFormStage
            rows={rows}
            getLabel={(id) => (isEditMode ? title : candidateLabel(id))}
            onChange={updateRow}
            disabled={stage === 'submit'}
            isEditMode={isEditMode}
          />
        )}

        {errorMessage && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}
      </div>

      <ModalFooter>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>

        {stage === 'search' && (
          <button
            type="button"
            onClick={handleAdvanceFromSearch}
            disabled={!canProceedFromSearch}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}

        {stage === 'multi-select' && (
          <button
            type="button"
            onClick={handleAdvanceFromMultiSelect}
            disabled={!canProceedFromMultiSelect}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        )}

        {(stage === 'per-row-form' || stage === 'submit') && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!allRowsValid || stage === 'submit'}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stage === 'submit' ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden="true"
                />
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}

interface SearchStageProps {
  mode: MappingEditorMode;
  frameworks: Framework[];
  frameworksLoading: boolean;
  initialFrameworkLocked: boolean;
  selectedFrameworkId?: string;
  onSelectFramework: (id: string | undefined) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

function SearchStage({
  mode,
  frameworks,
  frameworksLoading,
  initialFrameworkLocked,
  selectedFrameworkId,
  onSelectFramework,
  search,
  onSearchChange,
}: SearchStageProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-surface-600">
        {mode === 'requirement-to-controls'
          ? 'Search for controls to map to this requirement.'
          : 'Pick a framework and search for requirements to map to this control.'}
      </p>
      {mode === 'control-to-requirements' && !initialFrameworkLocked && (
        <label className="block">
          <span className="block text-sm font-medium text-surface-700 mb-1">Framework</span>
          <SelectNative
            value={selectedFrameworkId ?? ''}
            onChange={(e) => onSelectFramework(e.target.value || undefined)}
            disabled={frameworksLoading}
            aria-label="Framework"
            className="w-full rounded-lg bg-surface-700 border border-surface-600 text-surface-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select a framework…</option>
            {frameworks.map((fw) => (
              <option key={fw.id} value={fw.id}>
                {fw.name}
              </option>
            ))}
          </SelectNative>
        </label>
      )}
      <label className="block">
        <span className="block text-sm font-medium text-surface-700 mb-1">Search</span>
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              mode === 'requirement-to-controls'
                ? 'Filter controls by ID or title…'
                : 'Filter requirements by reference or title…'
            }
            className="w-full rounded-lg bg-surface-700 border border-surface-600 text-surface-100 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </label>
    </div>
  );
}

interface MultiSelectStageProps {
  mode: MappingEditorMode;
  candidates: Array<Control | FrameworkRequirement>;
  isLoading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
}

function MultiSelectStage({
  mode,
  candidates,
  isLoading,
  selectedIds,
  onToggle,
  search,
  onSearchChange,
}: MultiSelectStageProps) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Filter candidates</span>
        <div className="relative">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter…"
            className="w-full rounded-lg bg-surface-700 border border-surface-600 text-surface-100 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </label>
      {isLoading ? (
        <p className="text-sm text-surface-600">Loading…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-surface-600">No candidates available.</p>
      ) : (
        <ul
          role="list"
          aria-label={
            mode === 'requirement-to-controls' ? 'Candidate controls' : 'Candidate requirements'
          }
          className="max-h-72 overflow-y-auto space-y-1 border border-surface-700 rounded-lg p-2 bg-surface-900/40"
        >
          {candidates.map((c) => {
            const id = c.id;
            const checked = selectedIds.includes(id);
            const primary =
              mode === 'requirement-to-controls'
                ? (c as Control).controlId
                : (c as FrameworkRequirement).reference;
            const secondary = c.title;
            return (
              <li key={id} role="listitem">
                <label
                  className={clsx(
                    'flex items-start gap-3 rounded-md px-3 py-2 cursor-pointer',
                    checked
                      ? 'bg-brand-600/20 border border-brand-500/40'
                      : 'hover:bg-surface-800 border border-transparent'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(id)}
                    className="mt-1 h-4 w-4 rounded border-surface-600 bg-surface-800 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="flex-1">
                    <span className="block font-mono text-sm text-surface-200">{primary}</span>
                    <span className="block text-sm text-surface-600">{secondary}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface PerRowFormStageProps {
  rows: RowDraft[];
  getLabel: (id: string) => string;
  onChange: (id: string, patch: Partial<Omit<RowDraft, 'candidateId'>>) => void;
  disabled: boolean;
  isEditMode: boolean;
}

function PerRowFormStage({ rows, getLabel, onChange, disabled, isEditMode }: PerRowFormStageProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-surface-600">Nothing selected.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-surface-600">
        {isEditMode
          ? 'Update mapping type and notes.'
          : 'Set mapping type and optional notes for each selection.'}
      </p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.candidateId}
            className="rounded-lg border border-surface-700 p-3 bg-surface-900/40"
          >
            {!isEditMode && (
              <p className="text-sm font-medium text-surface-200 mb-2">
                {getLabel(row.candidateId)}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block sm:col-span-1">
                <span className="block text-xs font-medium text-surface-600 mb-1">
                  Mapping type
                </span>
                <SelectNative
                  value={row.mappingType}
                  onChange={(e) =>
                    onChange(row.candidateId, {
                      mappingType: e.target.value as MappingType,
                    })
                  }
                  disabled={disabled}
                  aria-label={`Mapping type for ${getLabel(row.candidateId)}`}
                  className="w-full rounded-lg bg-surface-700 border border-surface-600 text-surface-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                >
                  <option value="primary">Primary</option>
                  <option value="supporting">Supporting</option>
                </SelectNative>
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-surface-600 mb-1">Notes</span>
                <Input
                  type="text"
                  value={row.notes}
                  onChange={(e) => onChange(row.candidateId, { notes: e.target.value })}
                  disabled={disabled}
                  aria-label={`Notes for ${getLabel(row.candidateId)}`}
                  placeholder="Optional"
                  className="w-full rounded-lg bg-surface-700 border border-surface-600 text-surface-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SuggestionsPanelProps {
  state: SuggestionsState;
  canSuggest: boolean;
  onSuggest: () => void;
  onUse: (candidateId: string) => void;
  selectedIds: string[];
}

function SuggestionsPanel({
  state,
  canSuggest,
  onSuggest,
  onUse,
  selectedIds,
}: SuggestionsPanelProps) {
  const isLoading = state.status === 'loading';
  return (
    <section
      aria-label="AI mapping suggestions"
      className="rounded-lg border border-surface-700 bg-surface-900/40 p-3 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-brand-400" aria-hidden="true" />
          <h3 className="text-sm font-medium text-surface-200">AI suggestions</h3>
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={!canSuggest || isLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/40 bg-brand-600/20 px-2.5 py-1 text-xs font-medium text-brand-200 hover:bg-brand-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {isLoading ? 'Suggesting…' : 'Suggest with AI'}
        </button>
      </div>

      {state.status === 'idle' && (
        <p className="text-xs text-surface-500">
          Get ranked candidates based on semantic overlap with this anchor.
        </p>
      )}

      {state.status === 'loading' && (
        <p role="status" className="text-xs text-surface-600">
          <span
            className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-surface-400/30 border-t-surface-200 align-middle"
            aria-hidden="true"
          />
          Generating suggestions…
        </p>
      )}

      {state.status === 'error' && (
        <p
          role={state.isRateLimited ? 'status' : 'alert'}
          className={clsx(
            'rounded-md border px-2.5 py-1.5 text-xs',
            state.isRateLimited
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          )}
        >
          {state.message}
        </p>
      )}

      {state.status === 'ready' && state.isMockMode && (
        <p
          role="status"
          className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"
        >
          {MOCK_MODE_BANNER_COPY}
        </p>
      )}

      {state.status === 'ready' && state.suggestions.length === 0 && (
        <p className="text-xs text-surface-600">No suggestions available.</p>
      )}

      {state.status === 'ready' && state.suggestions.length > 0 && (
        <ul role="list" aria-label="Suggested candidates" className="space-y-2">
          {state.suggestions.map((s) => {
            const already = selectedIds.includes(s.candidateId);
            return (
              <li
                key={s.candidateId}
                className="rounded-md border border-surface-700 bg-surface-900/60 p-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-surface-200">
                        {s.candidateReference}
                      </span>
                      <ConfidenceBadge value={s.confidence} />
                    </div>
                    <p className="text-sm text-surface-700 mt-0.5">{s.candidateTitle}</p>
                    <p className="text-xs text-surface-600 mt-1">{s.rationale}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUse(s.candidateId)}
                    disabled={already}
                    aria-label={`Use suggestion ${s.candidateReference}`}
                    className="shrink-0 rounded-md border border-surface-600 bg-surface-700 px-2 py-1 text-xs font-medium text-surface-100 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {already ? 'Added' : 'Use'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const band =
    value >= SUGGESTION_AUTO_SELECT_THRESHOLD
      ? 'bg-green-500/15 text-green-700 border-green-500/30'
      : value >= 0.4
        ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
        : 'bg-red-500/15 text-red-700 border-red-500/30';
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
        band
      )}
      aria-label={`${pct}% confidence`}
    >
      {pct}% confidence
    </span>
  );
}

function getHttpStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { response?: { status?: number }; status?: number };
    if (typeof maybe.response?.status === 'number') return maybe.response.status;
    if (typeof maybe.status === 'number') return maybe.status;
  }
  return undefined;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybeAxios = err as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybeAxios.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg.join(', ');
    if (typeof maybeAxios.message === 'string') return maybeAxios.message;
  }
  return 'Failed to save mapping.';
}

export default MappingEditorModal;
