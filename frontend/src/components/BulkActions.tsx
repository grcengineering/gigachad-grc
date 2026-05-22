import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from './Modal';
import clsx from 'clsx';

// ===========================================
// Selection Hook
// ===========================================

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, clearSelection, selectAll]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.id)),
    [items, selectedIds]
  );

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isPartialSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    isSelected,
    toggle,
    selectAll,
    clearSelection,
    toggleAll,
    isAllSelected,
    isPartialSelected,
    count: selectedIds.size,
  };
}

// ===========================================
// Checkbox Component
// ===========================================

interface SelectCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
  disabled?: boolean;
}

export function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  className,
  disabled,
}: SelectCheckboxProps) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Update indeterminate state when prop changes
  // This is necessary because indeterminate is a DOM property, not an HTML attribute
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate || false;
    }
  }, [indeterminate]);

  return (
    <div className={clsx('flex items-center', className)}>
      <input
        type="checkbox"
        checked={checked}
        ref={checkboxRef}
        onChange={onChange}
        disabled={disabled}
        className={clsx(
          'h-4 w-4 rounded bg-surface-200 border-surface-300',
          'text-brand-600 focus:ring-brand-500 focus:ring-offset-0',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'cursor-pointer'
        )}
      />
    </div>
  );
}

// ===========================================
// Bulk Actions Bar
// ===========================================

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  requiresConfirmation?: boolean;
  confirmMessage?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  actions: BulkAction[];
  onAction: (actionId: string) => void;
  isProcessing?: boolean;
  processingLabel?: string;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onClear,
  actions,
  onAction,
  isProcessing = false,
  processingLabel = 'Processing...',
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmAction(action);
    } else {
      onAction(action.id);
    }
  };

  const handleConfirm = () => {
    if (confirmAction) {
      onAction(confirmAction.id);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 bg-white border border-surface-200 rounded-lg p-3 flex items-center justify-between shadow-lg animate-slide-down">
        <div className="flex items-center gap-4">
          <button
            onClick={onClear}
            className="p-1.5 hover:bg-surface-200 rounded-lg text-surface-600 transition-colors"
            aria-label="Clear selection"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <span className="text-surface-800 font-medium">
            {selectedCount} of {totalCount} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-surface-600">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span className="text-sm">{processingLabel}</span>
            </div>
          ) : (
            actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || 'secondary'}
                size="sm"
                onClick={() => handleAction(action)}
                leftIcon={action.icon}
                disabled={isProcessing}
              >
                {action.label}
              </Button>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        title={confirmAction?.label || 'Confirm'}
        message={
          confirmAction?.confirmMessage ||
          `Are you sure you want to ${confirmAction?.label.toLowerCase()} ${selectedCount} item${selectedCount > 1 ? 's' : ''}?`
        }
        confirmText={confirmAction?.label || 'Confirm'}
        confirmVariant={confirmAction?.variant === 'danger' ? 'danger' : 'primary'}
        isLoading={isProcessing}
      />
    </>
  );
}

// ===========================================
// Status Update Dropdown
// ===========================================

interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

interface StatusUpdateDropdownProps {
  options: StatusOption[];
  onSelect: (status: string) => void;
  disabled?: boolean;
  buttonText?: string;
}

export function StatusUpdateDropdown({
  options,
  onSelect,
  disabled = false,
  buttonText = 'Update Status',
}: StatusUpdateDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        leftIcon={<CheckIcon className="w-4 h-4" />}
      >
        {buttonText}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-surface-200 rounded-lg shadow-xl z-50 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-surface-800 hover:bg-surface-200 flex items-center gap-2 transition-colors"
              >
                {option.color && <span className={clsx('w-2 h-2 rounded-full', option.color)} />}
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default BulkActionsBar;
