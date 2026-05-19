import { ReactNode, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  Row,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SkeletonRows } from './Skeleton';
import { EmptyState } from './EmptyState';

export type DataTableDensity = 'compact' | 'cozy' | 'comfy';

export type DataTableColumn<TData> = ColumnDef<TData, unknown> & {
  /** Optional renderer for the mobile card-stack fallback. If omitted, the column is hidden on mobile. */
  mobileLabel?: string;
  /** Hide this column on mobile entirely (default true if no mobileLabel). */
  hideOnMobile?: boolean;
};

export interface DataTableProps<TData> {
  data: TData[];
  columns: DataTableColumn<TData>[];
  loading?: boolean;
  density?: DataTableDensity;
  /** Click handler for a row (e.g., open drawer). */
  onRowClick?: (row: TData) => void;
  /** Function to derive a stable key from a row. Defaults to row index. */
  getRowId?: (row: TData, index: number) => string;
  /** Custom empty state. Defaults to a generic message. */
  emptyState?: ReactNode;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Skeleton row count when loading. */
  loadingRows?: number;
  /** Mobile breakpoint behavior: 'cards' switches to card-stack below md; 'scroll' keeps the table. */
  mobileBehavior?: 'cards' | 'scroll';
}

const densityRow: Record<DataTableDensity, string> = {
  compact: 'py-2',
  cozy: 'py-3',
  comfy: 'py-4',
};

const densityHead: Record<DataTableDensity, string> = {
  compact: 'py-2',
  cozy: 'py-2.5',
  comfy: 'py-3',
};

export function DataTable<TData>({
  data,
  columns,
  loading,
  density = 'cozy',
  onRowClick,
  getRowId,
  emptyState,
  className,
  loadingRows = 8,
  mobileBehavior = 'cards',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
  });

  if (loading) {
    return (
      <div className={cn('rounded-lg border border-surface-200 bg-white p-4', className)}>
        <SkeletonRows rows={loadingRows} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-surface-200 bg-white', className)}>
        {emptyState ?? <EmptyState title="No results" description="Try adjusting your filters." />}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-surface-200 bg-white overflow-hidden', className)}>
      {/* Desktop table */}
      <div className={cn('overflow-x-auto', mobileBehavior === 'cards' && 'hidden md:block')}>
        <table className="w-full text-small">
          <thead className="bg-surface-50/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-surface-200">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 text-left text-xs font-medium text-surface-600 uppercase tracking-wider',
                        densityHead[density],
                        canSort && 'cursor-pointer select-none hover:text-surface-800'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      <div className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-surface-500">
                            {sorted === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : sorted === 'desc' ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                className={cn(
                  'border-b border-surface-200/60 last:border-b-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-surface-100/50'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn('px-4 text-surface-800 align-middle', densityRow[density])}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      {mobileBehavior === 'cards' && (
        <div className="md:hidden divide-y divide-surface-200/60">
          {table.getRowModel().rows.map((row) => (
            <MobileRow
              key={row.id}
              row={row}
              columns={columns}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileRow<TData>({
  row,
  columns,
  onClick,
}: {
  row: Row<TData>;
  columns: DataTableColumn<TData>[];
  onClick?: () => void;
}) {
  const visibleCells = row.getVisibleCells().filter((cell) => {
    const col = columns.find((c) => {
      const id = (c as { id?: string }).id ?? (c as { accessorKey?: string }).accessorKey;
      return id === cell.column.id;
    }) as DataTableColumn<TData> | undefined;
    if (!col) return true;
    if (col.hideOnMobile) return false;
    return true;
  });

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-100/40 active:bg-surface-100/60'
      )}
    >
      <div className="space-y-2">
        {visibleCells.map((cell) => {
          const col = columns.find((c) => {
            const id = (c as { id?: string }).id ?? (c as { accessorKey?: string }).accessorKey;
            return id === cell.column.id;
          }) as DataTableColumn<TData> | undefined;
          const label = col?.mobileLabel;
          return (
            <div key={cell.id} className="flex items-start justify-between gap-3">
              {label && (
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wider shrink-0">
                  {label}
                </span>
              )}
              <div className={cn('text-small text-surface-800 min-w-0', label && 'text-right')}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
