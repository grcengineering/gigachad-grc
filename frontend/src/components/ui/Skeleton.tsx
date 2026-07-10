import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: 'text' | 'rect' | 'circle';
}

export function Skeleton({ className, shape = 'rect', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'skeleton-shimmer',
        shape === 'text' && 'h-4 rounded',
        shape === 'rect' && 'rounded-md',
        shape === 'circle' && 'rounded-full aspect-square',
        className,
      )}
      {...props}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          shape="text"
          className={cn(i === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}

export interface SkeletonRowsProps {
  rows?: number;
  className?: string;
}

export function SkeletonRows({ rows = 5, className }: SkeletonRowsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}
