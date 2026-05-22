import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

export interface ActiveFilter {
  key: string;
  label: string;
  onClear: () => void;
}

export interface FilterBarProps {
  children: ReactNode;
  active?: ActiveFilter[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ children, active, onClearAll, className }: FilterBarProps) {
  const hasActive = active && active.length > 0;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {hasActive && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-surface-500 dark:text-surface-400 uppercase tracking-wider">
            Active
          </span>
          {active!.map((f) => (
            <button
              key={f.key}
              onClick={f.onClear}
              className="inline-flex items-center gap-1 rounded-md border border-surface-300 bg-surface-100 px-2 py-1 text-xs text-surface-700 hover:bg-surface-200 hover:text-surface-900 transition-colors dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700 dark:hover:text-surface-100"
            >
              <span>{f.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          {onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
