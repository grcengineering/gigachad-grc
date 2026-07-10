import { Dialog as HUIDialog, Transition } from '@headlessui/react';
import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: DialogProps) {
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
          <div className="fixed inset-0 bg-white/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HUIDialog.Panel
                className={cn(
                  'w-full transform overflow-hidden rounded-lg bg-white border border-surface-200 shadow-2xl transition-all',
                  sizes[size],
                  className,
                )}
              >
                {title && (
                  <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-surface-200">
                    <div className="min-w-0">
                      <HUIDialog.Title className="text-h2 text-surface-900">
                        {title}
                      </HUIDialog.Title>
                      {description && (
                        <HUIDialog.Description className="mt-1 text-small text-surface-600">
                          {description}
                        </HUIDialog.Description>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="text-surface-500 hover:text-surface-900 transition-colors -mr-1"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
                <div className="px-5 py-4">{children}</div>
                {footer && (
                  <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-200 bg-surface-50/30">
                    {footer}
                  </div>
                )}
              </HUIDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HUIDialog>
    </Transition>
  );
}
