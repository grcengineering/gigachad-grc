import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  /**
   * Apply CSS `text-transform: capitalize`. Defaults to true so snake_case
   * enum values like "risk_identified" render as Title Case after
   * `replace(/_/g, ' ')`. Pass `capitalize={false}` for acronyms (PDF, MFA,
   * CSV) or content where case should be preserved exactly.
   */
  capitalize?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-100 text-surface-700 border border-surface-300',
  success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-800 border border-red-200',
  info: 'bg-blue-50 text-blue-800 border border-blue-200',
  brand: 'bg-brand-50 text-brand-800 border border-brand-200',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  brand: 'bg-brand-500',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'neutral',
      size = 'md',
      dot,
      capitalize = true,
      children,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center font-medium rounded-md whitespace-nowrap',
        variants[variant],
        sizes[size],
        capitalize && 'capitalize',
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  ),
);
Badge.displayName = 'Badge';
