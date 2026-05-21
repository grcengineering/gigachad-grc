import { LabelHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-small font-medium text-surface-700 mb-1.5 dark:text-surface-300',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
    </label>
  )
);
Label.displayName = 'Label';

export interface FieldHintProps {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}

export function FieldHint({ children, error, className }: FieldHintProps) {
  return (
    <p
      className={cn(
        'mt-1.5 text-xs',
        error ? 'text-red-600 dark:text-red-400' : 'text-surface-500 dark:text-surface-400',
        className
      )}
    >
      {children}
    </p>
  );
}
