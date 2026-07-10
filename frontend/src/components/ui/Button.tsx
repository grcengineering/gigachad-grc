import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
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
    'bg-brand-600 !text-white shadow-sm hover:bg-brand-500 active:bg-brand-700 focus-visible:ring-brand-500 disabled:hover:bg-brand-600',
  secondary:
    'bg-surface-200 !text-surface-900 border border-surface-400 hover:bg-surface-300 focus-visible:ring-brand-500',
  outline:
    'border border-surface-400 bg-white !text-surface-900 hover:bg-surface-100 hover:border-surface-500 focus-visible:ring-brand-500',
  ghost:
    'bg-transparent !text-surface-700 hover:bg-surface-100 hover:!text-surface-900 focus-visible:ring-brand-500',
  danger:
    'bg-red-600 !text-white shadow-sm hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500 disabled:hover:bg-red-600',
  link:
    'bg-transparent !text-brand-700 hover:!text-brand-800 underline-offset-4 hover:underline focus-visible:ring-brand-500',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small gap-1.5 rounded-md',
  md: 'h-9 px-4 text-body gap-2 rounded-md',
  lg: 'h-10 px-5 text-body gap-2 rounded-lg',
  icon: 'h-9 w-9 rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin', size === 'icon' ? 'h-4 w-4' : 'h-4 w-4')} />
        ) : (
          leftIcon
        )}
        {size !== 'icon' && children}
        {!loading && rightIcon}
      </button>
    );
  },
);
Button.displayName = 'Button';
