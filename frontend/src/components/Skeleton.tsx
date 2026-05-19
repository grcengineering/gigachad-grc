/**
 * Skeleton compositions built on the design-system Skeleton primitive.
 * Page-level loading states use these helpers; the atomic Skeleton itself
 * lives at @/components/ui/Skeleton.
 */
import { clsx } from 'clsx';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

export function SkeletonTitle({ className }: { className?: string }) {
  return <Skeleton className={clsx('h-8 w-1/3', className)} />;
}

export function SkeletonSubtitle({ className }: { className?: string }) {
  return <Skeleton className={clsx('h-5 w-1/2', className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white border border-surface-200 rounded-lg p-6 space-y-4', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton shape="circle" className="h-12 w-12" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-white border border-surface-200 rounded-lg p-6', className)}>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-10 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 5, className }: SkeletonTableProps) {
  return (
    <div
      className={clsx('bg-white border border-surface-200 rounded-lg overflow-hidden', className)}
    >
      <div className="border-b border-surface-200 bg-surface-50 px-6 py-3">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-surface-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={clsx(
                    'h-4 flex-1',
                    colIndex === 0 && 'max-w-[150px]',
                    colIndex === columns - 1 && 'max-w-[100px]'
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <Skeleton className="h-4 w-full max-w-[150px]" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonList({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={clsx('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export function SkeletonInput({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-2', className)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function SkeletonDetailHeader({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

export function SkeletonDetailSection({
  title,
  className,
}: {
  title?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('bg-white border border-surface-200 rounded-lg p-6 space-y-4', className)}>
      {title && <Skeleton className="h-6 w-32 mb-4" />}
      <SkeletonText lines={4} />
    </div>
  );
}

export function SkeletonDashboard({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-6', className)}>
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-44 w-full" />
          <div className="flex justify-center gap-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="bg-white border border-surface-200 rounded-lg p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonButton({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };
  return <Skeleton className={clsx(sizeClasses[size], className)} />;
}

export function SkeletonAvatar({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };
  return <Skeleton shape="circle" className={clsx(sizeClasses[size], className)} />;
}

export function SkeletonBadge({ className }: { className?: string }) {
  return <Skeleton className={clsx('h-6 w-16', className)} />;
}

export default Skeleton;
