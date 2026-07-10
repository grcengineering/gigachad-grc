import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'py-8 px-4',
  md: 'py-12 px-6',
  lg: 'py-16 px-8',
};

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes[size],
        className,
      )}
    >
      {icon && (
        <div className={cn('mb-3 rounded-full bg-surface-100 p-3 text-surface-500', iconSizes[size])}>
          {icon}
        </div>
      )}
      <h3 className="text-h3 text-surface-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-small text-surface-600">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
