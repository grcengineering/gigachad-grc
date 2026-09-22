import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type KbdProps = HTMLAttributes<HTMLElement>;

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded border border-surface-300 bg-surface-100 text-[10px] font-mono text-surface-600 leading-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
