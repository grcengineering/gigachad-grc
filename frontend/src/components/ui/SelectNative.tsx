/**
 * SelectNative — a native HTML <select> styled to match the design system.
 *
 * Use this when you need:
 *   - Native browser select UX (mobile-friendly, accessible by default)
 *   - <option> children rather than an options array
 *   - Multiple selection (`multiple` prop)
 *   - Form-library integration that expects a real `<select>` element
 *
 * Use the richer @/components/ui/Select primitive when you need search,
 * descriptions, custom rendering, or option grouping.
 */
import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface SelectNativeProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  selectSize?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-8 text-small',
  md: 'h-9 text-body',
  lg: 'h-10 text-body',
};

export const SelectNative = forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, invalid, selectSize = 'md', children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border bg-white px-3 pr-9 text-surface-900 transition-colors appearance-none dark:bg-surface-900 dark:text-surface-100',
        'bg-no-repeat bg-right',
        // Inline SVG chevron for the dropdown arrow (light mode)
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%235e5d5a%27%20stroke-width=%272%27%3E%3Cpolyline%20points=%276%209%2012%2015%2018%209%27/%3E%3C/svg%3E")]',
        // Chevron color for dark mode (lighter stroke)
        'dark:bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%238a8884%27%20stroke-width=%272%27%3E%3Cpolyline%20points=%276%209%2012%2015%2018%209%27/%3E%3C/svg%3E")]',
        '[background-position:right_0.65rem_center] [background-size:1rem]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-surface-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        invalid
          ? 'border-red-500/60 dark:border-red-500/70'
          : 'border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600',
        sizes[selectSize],
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
SelectNative.displayName = 'SelectNative';
