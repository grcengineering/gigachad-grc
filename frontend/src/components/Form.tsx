import {
  ReactNode,
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
} from 'react';
import { clsx } from 'clsx';
import { FieldError, UseFormRegisterReturn } from 'react-hook-form';

// ===========================================
// Form Field Wrapper
// ===========================================

interface FormFieldProps {
  label?: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, error, required, hint, className, children }: FormFieldProps) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-sm text-surface-500">{hint}</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}

// ===========================================
// Input Component
// ===========================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  registration?: UseFormRegisterReturn;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, registration, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          'block w-full px-4 py-2 rounded-lg sm:text-sm',
          'bg-surface-700 border text-white placeholder-surface-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-surface-600 focus:border-brand-500 focus:ring-brand-500/20',
          className
        )}
        {...registration}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// ===========================================
// Textarea Component
// ===========================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  registration?: UseFormRegisterReturn;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, registration, rows = 4, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={clsx(
          'block w-full px-4 py-2 rounded-lg sm:text-sm',
          'bg-surface-700 border text-white placeholder-surface-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-surface-600 focus:border-brand-500 focus:ring-brand-500/20',
          className
        )}
        {...registration}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

// ===========================================
// Select Component
// ===========================================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  registration?: UseFormRegisterReturn;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, registration, options, placeholder, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={clsx(
          'block w-full px-4 py-2 rounded-lg sm:text-sm',
          'bg-surface-700 border text-white',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'disabled:bg-surface-800 disabled:text-surface-500 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-surface-600 focus:border-brand-500 focus:ring-brand-500/20',
          className
        )}
        {...registration}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    );
  }
);

Select.displayName = 'Select';

// ===========================================
// Checkbox Component
// ===========================================

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  error?: boolean;
  registration?: UseFormRegisterReturn;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, registration, ...props }, ref) => {
    return (
      <div className={clsx('relative flex items-start', className)}>
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="checkbox"
            className={clsx(
              'h-4 w-4 rounded bg-surface-700 border',
              'focus:ring-2 focus:ring-offset-0 focus:ring-offset-surface-900',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500 text-red-600 focus:ring-red-500/20'
                : 'border-surface-600 text-brand-600 focus:ring-brand-500/20'
            )}
            {...registration}
            {...props}
          />
        </div>
        <div className="ml-3 text-sm">
          <label className={clsx('font-medium', error ? 'text-red-600' : 'text-surface-700')}>
            {label}
          </label>
          {description && (
            <p className={clsx(error ? 'text-red-600/70' : 'text-surface-500')}>{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ===========================================
// Radio Group Component
// ===========================================

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  error?: boolean;
  registration?: UseFormRegisterReturn;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  name,
  options,
  error,
  registration,
  className,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <div
      className={clsx(
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-3',
        className
      )}
    >
      {options.map((option) => (
        <div key={option.value} className="relative flex items-start">
          <div className="flex h-5 items-center">
            <input
              id={`${name}-${option.value}`}
              type="radio"
              value={option.value}
              disabled={option.disabled}
              className={clsx(
                'h-4 w-4 bg-surface-700 border',
                'focus:ring-2 focus:ring-offset-0 focus:ring-offset-surface-900',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error
                  ? 'border-red-500 text-red-600 focus:ring-red-500/20'
                  : 'border-surface-600 text-brand-600 focus:ring-brand-500/20'
              )}
              {...registration}
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor={`${name}-${option.value}`}
              className={clsx(
                'font-medium',
                option.disabled ? 'text-surface-500' : error ? 'text-red-600' : 'text-surface-700'
              )}
            >
              {option.label}
            </label>
            {option.description && (
              <p className={clsx(error ? 'text-red-600/70' : 'text-surface-500')}>
                {option.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Form Actions (Button Row)
// ===========================================

interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function FormActions({ children, className, align = 'right' }: FormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-3 pt-4 border-t border-surface-700',
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

// ===========================================
// Form Section
// ===========================================

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-medium text-surface-100">{title}</h3>}
          {description && <p className="mt-1 text-sm text-surface-600">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ===========================================
// Form Divider
// ===========================================

export function FormDivider({ className }: { className?: string }) {
  return <hr className={clsx('border-surface-700 my-6', className)} />;
}

// ===========================================
// Tag Input Component
// ===========================================

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Add tag...',
  error,
  className,
}: TagInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = e.currentTarget;
      const newTag = input.value.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
        input.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className={clsx('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-brand-500/20 text-brand-400 rounded-md"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-brand-400 hover:text-brand-300"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        className={clsx(
          'block w-full px-4 py-2 rounded-lg sm:text-sm',
          'bg-surface-700 border text-white placeholder-surface-400',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-surface-600 focus:border-brand-500 focus:ring-brand-500/20'
        )}
      />
    </div>
  );
}

export default FormField;
