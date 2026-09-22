import { Dialog as HUIDialog, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  size = 'lg',
  className,
}: DrawerProps) {
  const enterFrom = side === 'right' ? 'translate-x-full' : '-translate-x-full';
  const sideClass = side === 'right' ? 'right-0' : 'left-0';

  return (
    <Transition appear show={open} as={Fragment}>
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
          <div className="fixed inset-0 bg-white/30 dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-200"
            enterFrom={enterFrom}
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-150"
            leaveFrom="translate-x-0"
            leaveTo={enterFrom}
          >
            <HUIDialog.Panel
              className={cn(
                'fixed inset-y-0 flex w-full flex-col bg-white border-surface-200 shadow-2xl dark:bg-surface-900 dark:border-surface-800',
                sideClass,
                side === 'right' ? 'border-l' : 'border-r',
                sizes[size],
                className
              )}
            >
              {title && (
                <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
                  <div className="min-w-0">
                    <HUIDialog.Title className="text-h2 text-surface-900 dark:text-surface-100">
                      {title}
                    </HUIDialog.Title>
                    {description && (
                      <HUIDialog.Description className="mt-1 text-small text-surface-600 dark:text-surface-400">
                        {description}
                      </HUIDialog.Description>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100 transition-colors -mr-1"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
              {footer && (
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200 bg-surface-50/30 dark:border-surface-800 dark:bg-surface-950/30 shrink-0">
                  {footer}
                </div>
              )}
            </HUIDialog.Panel>
          </Transition.Child>
        </div>
      </HUIDialog>
    </Transition>
  );
}
