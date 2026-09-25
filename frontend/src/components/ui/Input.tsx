import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  invalid?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-8 text-small',
  md: 'h-9 text-body',
  lg: 'h-10 text-body',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, leftIcon, rightSlot, inputSize = 'md', label, ...props }, ref) => {
    const control =
      leftIcon || rightSlot ? (
        <div className="relative w-full">
          {leftIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 dark:text-surface-400 pointer-events-none">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-md border bg-white px-3 text-surface-900 placeholder:text-surface-600 transition-colors dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-surface-950',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              invalid
                ? 'border-red-500/60 dark:border-red-500/70'
                : 'border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600',
              sizes[inputSize],
              leftIcon && 'pl-9',
              rightSlot && 'pr-9',
              className
            )}
            {...props}
          />
          {rightSlot && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 dark:text-surface-400">
              {rightSlot}
            </span>
          )}
        </div>
      ) : (
        <input
          ref={ref}
          className={cn(
            'w-full rounded-md border bg-white px-3 text-surface-900 placeholder:text-surface-600 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            invalid ? 'border-red-500/60' : 'border-surface-300 hover:border-surface-400',
            sizes[inputSize],
            className
          )}
          {...props}
        />
      );

    return label ? (
      <label className="block space-y-1.5 text-sm font-medium text-surface-700">
        <span>
          {label}
          {props.required && <span className="ml-1 text-red-600">*</span>}
        </span>
        {control}
      </label>
    ) : (
      control
    );
  }
);
Input.displayName = 'Input';
