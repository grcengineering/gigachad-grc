import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'link'
  | 'success'
  | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable the button. */
  loading?: boolean;
  /** Legacy alias for `loading`. Prefer `loading` in new code. */
  isLoading?: boolean;
  /** Optional text shown next to the spinner while loading. */
  loadingText?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

// NOTE: We use `!` on text-color because our custom font-size utilities
// (text-small, text-body, text-h1, etc.) confuse tailwind-merge — it
// can't distinguish a custom size from a color and drops the color from
// the merged class string. Forcing with ! pins the color.
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 !text-white shadow-sm hover:bg-brand-500 active:bg-brand-700 focus-visible:ring-brand-500 disabled:hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400 dark:active:bg-brand-600 dark:disabled:hover:bg-brand-500',
  secondary:
    'bg-surface-200 !text-surface-900 border border-surface-400 hover:bg-surface-300 focus-visible:ring-brand-500 dark:bg-surface-800 dark:!text-surface-100 dark:border-surface-700 dark:hover:bg-surface-700',
  outline:
    'border border-surface-400 bg-white !text-surface-900 hover:bg-surface-100 hover:border-surface-500 focus-visible:ring-brand-500 dark:bg-transparent dark:!text-surface-200 dark:border-surface-700 dark:hover:bg-surface-800 dark:hover:border-surface-600',
  ghost:
    'bg-transparent !text-surface-700 hover:bg-surface-100 hover:!text-surface-900 focus-visible:ring-brand-500 dark:!text-surface-300 dark:hover:bg-surface-800 dark:hover:!text-surface-100',
  danger:
    'bg-red-600 !text-white shadow-sm hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500 disabled:hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-400',
  link: 'bg-transparent !text-brand-700 hover:!text-brand-800 underline-offset-4 hover:underline focus-visible:ring-brand-500 dark:!text-brand-400 dark:hover:!text-brand-300',
  success:
    'bg-emerald-600 !text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-emerald-500 disabled:hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-400',
  warning:
    'bg-amber-500 !text-white shadow-sm hover:bg-amber-400 active:bg-amber-600 focus-visible:ring-amber-500 disabled:hover:bg-amber-500 dark:bg-amber-400 dark:!text-surface-950 dark:hover:bg-amber-300',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2 text-small gap-1 rounded-md',
  sm: 'h-8 px-3 text-small gap-1.5 rounded-md',
  md: 'h-9 px-4 text-body gap-2 rounded-md',
  lg: 'h-10 px-5 text-body gap-2 rounded-lg',
  xl: 'h-12 px-6 text-h2 gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      isLoading,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isBusy = loading ?? isLoading ?? false;
    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-surface-950',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isBusy ? (
          <>
            <Loader2 className={cn('animate-spin', size === 'icon' ? 'h-4 w-4' : 'h-4 w-4')} />
            {size !== 'icon' && (loadingText ?? children)}
          </>
        ) : (
          <>
            {leftIcon}
            {size !== 'icon' && children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
