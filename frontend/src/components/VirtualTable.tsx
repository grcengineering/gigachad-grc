import { useRef, useCallback, memo, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: ReactNode;
  width?: string | number;
  render: (item: T, index: number) => ReactNode;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  overscan?: number;
  onRowClick?: (item: T, index: number) => void;
  getRowKey: (item: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  selectedIds?: Set<string>;
}

/**
 * Virtual scrolling table for large datasets
 * Only renders visible rows for optimal performance
 */
function VirtualTableInner<T>({
  data,
  columns,
  rowHeight = 52,
  overscan = 5,
  onRowClick,
  getRowKey,
  emptyMessage = 'No data available',
  isLoading,
  className,
  headerClassName,
  rowClassName,
  selectedIds,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const handleRowClick = useCallback(
    (item: T, index: number) => {
      onRowClick?.(item, index);
    },
    [onRowClick]
  );

  if (isLoading) {
    return (
      <div className={clsx('card overflow-hidden', className)}>
        <div className="animate-pulse">
          <div className="h-12 bg-white border-b border-surface-200 dark:bg-surface-900" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-13 border-b border-surface-200 flex items-center px-4 gap-4">
              <div className="h-4 bg-surface-200 rounded w-1/4" />
              <div className="h-4 bg-surface-200 rounded w-1/3" />
              <div className="h-4 bg-surface-200 rounded w-1/6" />
              <div className="h-4 bg-surface-200 rounded w-1/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx('card overflow-hidden', className)}>
        <div className="flex flex-col items-center justify-center h-64 text-surface-500">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('card overflow-hidden', className)}>
      {/* Fixed header */}
      <div
        className={clsx(
          'flex items-center bg-white border-b border-surface-200 sticky top-0 z-10 dark:bg-surface-900',
          headerClassName
        )}
        style={{ height: rowHeight }}
      >
        {columns.map((column) => (
          <div
            key={column.key}
            className={clsx(
              'px-4 py-3 text-xs font-medium text-surface-600 uppercase tracking-wider',
              column.className
            )}
            style={{ width: column.width, flexGrow: column.width ? 0 : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual scrolling container */}
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowKey = getRowKey(item);
            const isSelected = selectedIds?.has(rowKey);
            const rowClasses =
              typeof rowClassName === 'function'
                ? rowClassName(item, virtualRow.index)
                : rowClassName;

            return (
              <div
                key={rowKey}
                data-index={virtualRow.index}
                className={clsx(
                  'absolute top-0 left-0 w-full flex items-center border-b border-surface-200 transition-colors',
                  onRowClick &&
                    'cursor-pointer hover:bg-white/50 dark:bg-surface-900/50 dark:hover:bg-surface-800/50',
                  isSelected && 'bg-brand-500/10',
                  rowClasses
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => handleRowClick(item, virtualRow.index)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={clsx('px-4 py-3', column.className)}
                    style={{ width: column.width, flexGrow: column.width ? 0 : 1 }}
                  >
                    {column.render(item, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const VirtualTable = memo(VirtualTableInner) as typeof VirtualTableInner;

/**
 * Hook to help with virtual table setup
 */
export function useVirtualTable<T>(items: T[], pageSize: number = 25) {
  const hasMore = items.length >= pageSize;

  return {
    items,
    hasMore,
    totalVisible: items.length,
  };
}

export default VirtualTable;
