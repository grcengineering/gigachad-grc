import { Fragment, ReactNode, useEffect, useRef } from 'react';
import { Combobox, Dialog as HUIDialog, Transition } from '@headlessui/react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CommandMenuItem<T = unknown> {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  data?: T;
}

export interface CommandMenuGroup<T = unknown> {
  id: string;
  label: string;
  items: CommandMenuItem<T>[];
}

export interface CommandMenuProps<T = unknown> {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  groups: CommandMenuGroup<T>[];
  onSelect: (item: CommandMenuItem<T>) => void;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: ReactNode;
}

export function CommandMenu<T>({
  open,
  onClose,
  query,
  onQueryChange,
  groups,
  onSelect,
  placeholder = 'Search…',
  emptyTitle = 'No results',
  emptyDescription,
  footer,
}: CommandMenuProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  const flatCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Transition.Root show={open} as={Fragment}>
      <HUIDialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-white/40 backdrop-blur-sm dark:bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <HUIDialog.Panel className="mx-auto max-w-2xl transform overflow-hidden rounded-xl bg-white border border-surface-200 shadow-2xl transition-all dark:bg-surface-900 dark:border-surface-800">
              <Combobox<CommandMenuItem<T>>
                onChange={(item) => {
                  if (item) {
                    onSelect(item);
                  }
                }}
              >
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-surface-500 dark:text-surface-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    ref={inputRef}
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-surface-900 placeholder:text-surface-500 focus:ring-0 text-base dark:text-surface-100 dark:placeholder:text-surface-500"
                    placeholder={placeholder}
                    onChange={(e) => onQueryChange(e.target.value)}
                    value={query}
                    displayValue={() => query}
                  />
                  <div className="absolute right-4 top-3 text-xs text-surface-500 dark:text-surface-400 hidden sm:flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-800 rounded text-surface-600 dark:text-surface-300">
                      Esc
                    </kbd>
                    <span>to close</span>
                  </div>
                </div>

                {flatCount > 0 && (
                  <Combobox.Options
                    static
                    className="max-h-96 scroll-py-2 overflow-y-auto border-t border-surface-200 dark:border-surface-800"
                  >
                    {groups.map((group) =>
                      group.items.length === 0 ? null : (
                        <div key={group.id}>
                          <div className="px-4 py-2 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider bg-surface-50/60 dark:bg-surface-950/40">
                            {group.label}
                          </div>
                          {group.items.map((item) => (
                            <Combobox.Option
                              key={item.id}
                              value={item}
                              className={({ active }) =>
                                cn(
                                  'flex items-center gap-3 px-4 py-3 cursor-pointer',
                                  active && 'bg-surface-100 dark:bg-surface-800'
                                )
                              }
                            >
                              {({ active }) => (
                                <>
                                  {item.icon && (
                                    <item.icon
                                      className={cn(
                                        'w-5 h-5 flex-shrink-0',
                                        active
                                          ? 'text-brand-600 dark:text-brand-300'
                                          : 'text-surface-500 dark:text-surface-400'
                                      )}
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={cn(
                                        'text-sm font-medium truncate',
                                        active
                                          ? 'text-surface-900 dark:text-surface-50'
                                          : 'text-surface-800 dark:text-surface-100'
                                      )}
                                    >
                                      {item.label}
                                    </p>
                                    {item.description && (
                                      <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  {item.shortcut && (
                                    <kbd className="px-2 py-1 text-xs bg-surface-200 dark:bg-surface-800 rounded text-surface-600 dark:text-surface-300">
                                      {item.shortcut}
                                    </kbd>
                                  )}
                                </>
                              )}
                            </Combobox.Option>
                          ))}
                        </div>
                      )
                    )}
                  </Combobox.Options>
                )}

                {query && flatCount === 0 && (
                  <div className="px-6 py-14 text-center border-t border-surface-200 dark:border-surface-800">
                    <Search className="mx-auto h-8 w-8 text-surface-500 dark:text-surface-400" />
                    <p className="mt-4 text-sm text-surface-700 dark:text-surface-200">
                      {emptyTitle}
                      {query && <> for &ldquo;{query}&rdquo;</>}
                    </p>
                    {emptyDescription && (
                      <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
                        {emptyDescription}
                      </p>
                    )}
                  </div>
                )}

                {footer && (
                  <div className="flex items-center justify-between border-t border-surface-200 dark:border-surface-800 px-4 py-2 text-xs text-surface-500 dark:text-surface-400">
                    {footer}
                  </div>
                )}
              </Combobox>
            </HUIDialog.Panel>
          </Transition.Child>
        </div>
      </HUIDialog>
    </Transition.Root>
  );
}
