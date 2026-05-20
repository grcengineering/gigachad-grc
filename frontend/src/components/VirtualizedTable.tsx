import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  width?: number | string;
  minWidth?: number;
  className?: string;
  headerClassName?: string;
}

export interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (row: T, index: number) => void;
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  maxHeight?: number | string;
  className?: string;
  stickyHeader?: boolean;
}

/**
 * High-performance virtualized table for rendering large datasets.
 * Only renders rows that are visible in the viewport, making it suitable
 * for lists with thousands of items.
 *
 * Uses @tanstack/react-virtual under the hood.
 */
export function VirtualizedTable<T>({
  data,
  columns,
  rowHeight = 52,
  overscan = 5,
  onRowClick,
  getRowKey,
  emptyMessage = 'No data available',
  isLoading = false,
  selectedIds,
  onSelectionChange,
  maxHeight = 600,
  className,
  stickyHeader = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const getCellValue = useCallback((row: T, column: Column<T>): React.ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }, []);

  const handleRowSelect = useCallback(
    (rowKey: string, isSelected: boolean) => {
      if (!onSelectionChange || !selectedIds) return;
      const newSelection = new Set(selectedIds);
      if (isSelected) {
        newSelection.add(rowKey);
      } else {
        newSelection.delete(rowKey);
      }
      onSelectionChange(newSelection);
    },
    [onSelectionChange, selectedIds]
  );

  const handleSelectAll = useCallback(
    (selectAll: boolean) => {
      if (!onSelectionChange) return;
      if (selectAll) {
        onSelectionChange(new Set(data.map(getRowKey)));
      } else {
        onSelectionChange(new Set());
      }
    },
    [onSelectionChange, data, getRowKey]
  );

  const allSelected = selectedIds && data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds && selectedIds.size > 0 && selectedIds.size < data.length;

  if (isLoading) {
    return (
      <div className={clsx('flex items-center justify-center py-12', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={clsx('flex items-center justify-center py-12 text-muted-foreground', className)}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={clsx('border border-surface-700 rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div
        className={clsx(
          'flex bg-surface-800 border-b border-surface-700',
          stickyHeader && 'sticky top-0 z-10'
        )}
        style={{ minHeight: rowHeight }}
      >
        {selectedIds && onSelectionChange && (
          <div className="flex items-center justify-center w-12 px-3 border-r border-surface-700">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected ?? false;
              }}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.id}
            className={clsx(
              'flex items-center px-4 py-3 text-sm font-medium text-surface-700',
              column.headerClassName
            )}
            style={{
              width: column.width,
              minWidth: column.minWidth ?? 100,
              flex: column.width ? 'none' : 1,
            }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight, contain: 'strict' }}>
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const row = data[virtualRow.index];
            const rowKey = getRowKey(row);
            const isSelected = selectedIds?.has(rowKey);

            return (
              <div
                key={rowKey}
                data-index={virtualRow.index}
                className={clsx(
                  'flex absolute top-0 left-0 w-full border-b border-surface-800 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-800/50',
                  isSelected && 'bg-brand-500/10'
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row, virtualRow.index)}
              >
                {selectedIds && onSelectionChange && (
                  <div
                    className="flex items-center justify-center w-12 px-3 border-r border-surface-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleRowSelect(rowKey, e.target.checked)}
                      className="w-4 h-4 rounded border-surface-600 bg-surface-700 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                    />
                  </div>
                )}
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className={clsx(
                      'flex items-center px-4 py-3 text-sm text-foreground truncate',
                      column.className
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth ?? 100,
                      flex: column.width ? 'none' : 1,
                    }}
                  >
                    {getCellValue(row, column)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-800/50 border-t border-surface-700 text-xs text-muted-foreground">
        <span>
          {selectedIds && selectedIds.size > 0
            ? `${selectedIds.size} of ${data.length} selected`
            : `${data.length} items`}
        </span>
        <span>
          Showing {virtualRows.length} of {data.length} rows
        </span>
      </div>
    </div>
  );
}

export default VirtualizedTable;
