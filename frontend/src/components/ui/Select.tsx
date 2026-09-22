import { Fragment, useState, useMemo } from 'react';
import { Combobox, Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  clearable?: boolean;
  fullWidth?: boolean;
  /** When true, uses Combobox with text search instead of plain Listbox. Recommended for >7 options. */
  searchable?: boolean;
}

const sizes = {
  sm: 'h-8 text-small',
  md: 'h-9 text-body',
  lg: 'h-10 text-body',
};

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled,
  invalid,
  className,
  size = 'md',
  clearable,
  fullWidth = true,
  searchable,
}: SelectProps) {
  const [query, setQuery] = useState('');

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const triggerBase = cn(
    'relative w-full rounded-md border bg-white pl-3 pr-9 text-left text-surface-900 transition-colors dark:bg-surface-900 dark:text-surface-100',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-50 dark:focus-visible:ring-offset-surface-950',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    invalid
      ? 'border-red-500/60 dark:border-red-500/70'
      : 'border-surface-300 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-600',
    sizes[size],
    fullWidth ? 'w-full' : 'w-auto',
    className
  );

  if (searchable) {
    return (
      <Combobox value={value} onChange={(v) => onChange(v ?? '')} disabled={disabled}>
        <div className={cn('relative', !fullWidth && 'inline-block')}>
          <div className={cn(triggerBase, 'flex items-center')}>
            <Combobox.Input
              className="w-full bg-transparent border-0 p-0 text-body text-surface-900 placeholder:text-surface-600 focus:outline-none focus:ring-0 dark:text-surface-100 dark:placeholder:text-surface-500"
              displayValue={(v: string) => options.find((o) => o.value === v)?.label ?? ''}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-surface-500 dark:text-surface-400" />
            </Combobox.Button>
          </div>
          {clearable && value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute inset-y-0 right-7 z-10 flex items-center text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-50 mt-1 max-h-72 min-w-full w-max max-w-sm overflow-auto rounded-md border border-surface-300 bg-white py-1 shadow-xl ring-1 ring-black/5 focus:outline-none dark:bg-surface-900 dark:border-surface-700 dark:ring-white/5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-small text-surface-500 dark:text-surface-400">
                  No results
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <Combobox.Option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className={({ active, selected }) =>
                      cn(
                        'relative cursor-pointer select-none px-3 py-1.5 text-body',
                        active && 'bg-surface-100 dark:bg-surface-800',
                        selected
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-surface-900 dark:text-surface-100',
                        opt.disabled && 'opacity-50 cursor-not-allowed'
                      )
                    }
                  >
                    {({ selected }) => (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-xs text-surface-500 dark:text-surface-400 truncate">
                              {opt.description}
                            </div>
                          )}
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300 mt-0.5" />
                        )}
                      </div>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    );
  }

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={cn('relative', !fullWidth && 'inline-block')}>
        <Listbox.Button className={triggerBase}>
          <span
            className={cn(
              'block truncate',
              !selectedOption && 'text-surface-500 dark:text-surface-400'
            )}
          >
            {selectedOption?.label ?? placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-surface-500" />
          </span>
        </Listbox.Button>
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="absolute inset-y-0 right-7 z-10 flex items-center text-surface-500 hover:text-surface-700"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-72 min-w-full w-max max-w-sm overflow-auto rounded-md border border-surface-300 bg-white py-1 shadow-xl ring-1 ring-black/5 focus:outline-none dark:bg-surface-900 dark:border-surface-700 dark:ring-white/5">
            {options.map((opt) => (
              <Listbox.Option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={({ active, selected }) =>
                  cn(
                    'relative cursor-pointer select-none px-3 py-1.5 text-body',
                    active && 'bg-surface-100 dark:bg-surface-800',
                    selected
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-surface-900 dark:text-surface-100',
                    opt.disabled && 'opacity-50 cursor-not-allowed'
                  )
                }
              >
                {({ selected }) => (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-surface-500 dark:text-surface-400 truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300 mt-0.5" />
                    )}
                  </div>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}
