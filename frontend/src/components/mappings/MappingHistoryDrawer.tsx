import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowUturnLeftIcon,
  ClockIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { frameworksApi } from '@/lib/api/frameworks.api';
import { useAuth } from '@/contexts/AuthContext';
import type { MappingHistoryEntry, MappingHistorySnapshot } from '@/lib/apiTypes';

import { Input } from '@/components/ui/Input';

export type MappingHistoryDrawerMode = 'requirement-to-controls' | 'control-to-requirements';

export interface MappingHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  mappingId: string;
  mode: MappingHistoryDrawerMode;
  invalidateOnRestore: readonly (readonly (string | undefined)[])[];
}

type ActionVerb = MappingHistoryEntry['action'];

const ACTION_META: Record<
  ActionVerb,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    text: string;
    bg: string;
    border: string;
  }
> = {
  create: {
    label: 'Created',
    icon: PlusCircleIcon,
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  update: {
    label: 'Updated',
    icon: PencilSquareIcon,
    text: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  delete: {
    label: 'Deleted',
    icon: TrashIcon,
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  restore: {
    label: 'Restored',
    icon: ArrowUturnLeftIcon,
    text: 'text-purple-600',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
};

const FIELD_LABELS: Record<keyof Pick<MappingHistorySnapshot, 'mappingType' | 'notes'>, string> = {
  mappingType: 'Mapping type',
  notes: 'Notes',
};

function actorLabel(entry: MappingHistoryEntry): string {
  const u = entry.changedByUser;
  if (!u) return 'Unknown';
  return u.displayName?.trim() || u.email || 'Unknown';
}

function formatFieldValue(field: 'mappingType' | 'notes', value: string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'mappingType') {
    return value === 'primary' ? 'Primary' : value === 'supporting' ? 'Supporting' : value;
  }
  return value;
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as { response?: { status?: number } };
    return maybe.response?.status;
  }
  return undefined;
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const maybe = err as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    const msg = maybe.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg) && msg.length > 0) return msg.join(', ');
    if (typeof maybe.message === 'string') return maybe.message;
  }
  return 'Restore failed.';
}

interface DiffRowsProps {
  prev: MappingHistorySnapshot | null;
  current: MappingHistorySnapshot;
}

function DiffRows({ prev, current }: DiffRowsProps) {
  const fields: Array<'mappingType' | 'notes'> = ['mappingType', 'notes'];
  const changed = fields.filter((f) => {
    const a = prev?.[f] ?? null;
    const b = current?.[f] ?? null;
    return a !== b;
  });

  if (changed.length === 0) {
    return <p className="text-xs text-surface-500 italic mt-2">No field changes recorded.</p>;
  }

  return (
    <div className="mt-3 space-y-2">
      {changed.map((field) => {
        const oldVal = (prev?.[field] ?? null) as string | null;
        const newVal = (current[field] ?? null) as string | null;
        return (
          <div
            key={field}
            className="flex flex-col gap-1 p-2 rounded-lg bg-white/40 border border-surface-200"
          >
            <span className="text-xs text-surface-600 font-medium">{FIELD_LABELS[field]}</span>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="text-red-600 line-through opacity-75">
                {formatFieldValue(field, oldVal)}
              </span>
              <span className="text-surface-500">{'→'}</span>
              <span className="text-emerald-600">{formatFieldValue(field, newVal)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface InitialStateRowsProps {
  snapshot: MappingHistorySnapshot;
  emphasis?: 'emerald' | 'red';
}

function InitialStateRows({ snapshot, emphasis = 'emerald' }: InitialStateRowsProps) {
  const fields: Array<'mappingType' | 'notes'> = ['mappingType', 'notes'];
  const valueColor = emphasis === 'red' ? 'text-red-700' : 'text-emerald-600';
  return (
    <div className="mt-3 space-y-1.5">
      {fields.map((field) => (
        <div key={field} className="flex items-start gap-2 text-sm">
          <span className="text-surface-600 min-w-[110px]">{FIELD_LABELS[field]}:</span>
          <span className={valueColor}>
            {formatFieldValue(field, (snapshot[field] ?? null) as string | null)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface HistoryEntryItemProps {
  entry: MappingHistoryEntry;
  previousEntry: MappingHistoryEntry | null;
  index: number;
  canRestore: boolean;
  restoringId: string | null;
  onRestore: (entry: MappingHistoryEntry, reason: string) => Promise<void>;
}

function HistoryEntryItem({
  entry,
  previousEntry,
  index,
  canRestore,
  restoringId,
  onRestore,
}: HistoryEntryItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const meta = ACTION_META[entry.action];
  const Icon = meta.icon;
  const timestampLabel = format(new Date(entry.changedAt), 'MMM d, yyyy h:mm a');
  const relativeLabel = formatDistanceToNow(new Date(entry.changedAt), { addSuffix: true });

  const restoreVisible = canRestore && index > 0 && entry.action !== 'delete';
  const isRestoring = restoringId === entry.id;

  async function handleConfirm() {
    await onRestore(entry, reason.trim());
    setConfirming(false);
    setReason('');
  }

  return (
    <article
      aria-label={`${meta.label} on ${timestampLabel}`}
      className="relative pl-8 pb-6 last:pb-0"
    >
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-surface-200" aria-hidden="true" />
      {/* Timeline dot */}
      <div
        className={clsx(
          'absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center border',
          meta.bg,
          meta.border
        )}
        aria-hidden="true"
      >
        <Icon className={clsx('w-3.5 h-3.5', meta.text)} />
      </div>
      <div className="bg-white rounded-lg border border-surface-200 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={clsx(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  meta.bg,
                  meta.border,
                  meta.text
                )}
              >
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-surface-500 flex-wrap">
              <div className="flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{actorLabel(entry)}</span>
              </div>
              <div
                className="flex items-center gap-1"
                title={format(new Date(entry.changedAt), 'PPpp')}
              >
                <ClockIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {timestampLabel} <span className="text-surface-600">·</span> {relativeLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        {entry.action === 'create' && (
          <div className="mt-2">
            <p className="text-xs uppercase tracking-wide text-surface-500">Initial state</p>
            <InitialStateRows snapshot={entry.snapshot} />
          </div>
        )}

        {entry.action === 'delete' && (
          <div className="mt-2">
            <p className="text-sm text-red-700">Mapping deleted</p>
            <InitialStateRows snapshot={entry.snapshot} emphasis="red" />
          </div>
        )}

        {(entry.action === 'update' || entry.action === 'restore') && (
          <DiffRows prev={previousEntry?.snapshot ?? null} current={entry.snapshot} />
        )}

        {entry.reason && (
          <p className="text-xs italic text-surface-600 mt-3">Reason: {entry.reason}</p>
        )}

        {/* Restore action */}
        {restoreVisible && !confirming && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Restore mapping to state from ${timestampLabel}`}
              className="inline-flex items-center gap-1 text-small text-purple-700 hover:text-purple-900 px-2 py-1 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
            >
              <ArrowUturnLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
              Restore this version
            </button>
          </div>
        )}

        {restoreVisible && confirming && (
          <div className="mt-3 space-y-2 rounded-md border border-purple-500/30 bg-purple-500/5 p-2">
            <label className="block text-xs text-surface-700">
              <span className="block mb-1 font-medium">Restore reason (optional)</span>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isRestoring}
                aria-label="Restore reason"
                placeholder="Why are you restoring this version?"
                className="w-full rounded-md bg-white border border-surface-200 text-surface-900 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setReason('');
                }}
                disabled={isRestoring}
                className="text-xs px-2 py-1 text-surface-700 hover:text-surface-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isRestoring}
                className="text-xs px-2 py-1 bg-purple-600/30 text-purple-100 hover:bg-purple-600/50 rounded border border-purple-500/40 disabled:opacity-50"
              >
                {isRestoring ? 'Restoring…' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function SkeletonRow() {
  return (
    <div className="relative pl-8 pb-6" aria-hidden="true">
      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-surface-200 animate-pulse" />
      <div className="bg-white rounded-lg border border-surface-200 p-4 animate-pulse">
        <div className="h-4 bg-surface-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-surface-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export function MappingHistoryDrawer({
  open,
  onClose,
  mappingId,
  invalidateOnRestore,
}: MappingHistoryDrawerProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canRestore = hasPermission('controls:update');

  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<MappingHistoryEntry[]>({
    queryKey: ['mappings', 'history', mappingId],
    queryFn: () => frameworksApi.mappings.history(mappingId),
    enabled: open,
  });

  const entries = data ?? [];
  const status = extractStatus(error);

  async function handleRestore(entry: MappingHistoryEntry, reason: string) {
    setRestoringId(entry.id);
    try {
      await frameworksApi.mappings.restore(mappingId, entry.id, reason ? { reason } : undefined);
      toast.success('Mapping restored');
      await queryClient.invalidateQueries({ queryKey: ['mappings', 'history', mappingId] });
      for (const key of invalidateOnRestore) {
        if (key.some((part) => part === undefined)) continue;
        queryClient.invalidateQueries({ queryKey: key as readonly string[] });
      }
    } catch (err) {
      const code = extractStatus(err);
      if (code === 403) {
        toast.error('You do not have permission to restore this mapping.');
      } else if (code === 404) {
        toast.error('Mapping or history entry not found.');
      } else if (code === 409) {
        toast.error('Cannot restore deleted mapping');
      } else {
        toast.error(extractErrorMessage(err));
      }
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      {/*
       * Dialog wrapper uses `fixed inset-0` (not the more common
       * `relative z-50`) so its bounding box covers the viewport. Without
       * non-zero dimensions on this element Playwright's `toBeVisible`
       * treats the dialog as hidden — even when the slide-in panel
       * children are fully painted. The inner fixed/absolute children
       * still position correctly inside this wrapper.
       */}
      <Dialog as="div" className="fixed inset-0 z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-white opacity-60" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel
                  className="pointer-events-auto w-screen max-w-xl h-full bg-white border-l border-surface-200 shadow-xl flex flex-col"
                  aria-labelledby="mapping-history-drawer-title"
                >
                  <header className="flex items-start justify-between p-4 border-b border-surface-200">
                    <div>
                      <Dialog.Title
                        as="h2"
                        id="mapping-history-drawer-title"
                        className="text-lg font-semibold text-surface-900"
                      >
                        Mapping change history
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-surface-500">
                        Chronological record of changes to this mapping.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close history drawer"
                      className="rounded-lg p-1.5 text-surface-600 hover:bg-surface-200 hover:text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && (
                      <div className="space-y-4">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                      </div>
                    )}

                    {!isLoading && error && (
                      <div className="text-center py-10">
                        {status === 403 ? (
                          <p className="text-surface-600">
                            You do not have permission to view this history.
                          </p>
                        ) : status === 404 ? (
                          <p className="text-surface-600">Mapping not found.</p>
                        ) : (
                          <>
                            <p className="text-red-600">Failed to load history</p>
                            <button
                              type="button"
                              onClick={() => refetch()}
                              className="mt-2 text-sm text-brand-400 hover:text-brand-300"
                            >
                              Retry
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {!isLoading && !error && entries.length === 0 && (
                      <div className="text-center py-12 bg-white/40 rounded-lg border border-surface-200">
                        <ClockIcon
                          className="w-10 h-10 mx-auto text-surface-600 mb-3"
                          aria-hidden="true"
                        />
                        <p className="text-surface-600">No history recorded yet</p>
                      </div>
                    )}

                    {!isLoading && !error && entries.length > 0 && (
                      <div className="relative">
                        {entries.map((entry, index) => (
                          <HistoryEntryItem
                            key={entry.id}
                            entry={entry}
                            previousEntry={entries[index + 1] ?? null}
                            index={index}
                            canRestore={canRestore}
                            restoringId={restoringId}
                            onRestore={handleRestore}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default MappingHistoryDrawer;
