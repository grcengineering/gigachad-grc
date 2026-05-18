import { Fragment, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

/**
 * Accessible Modal Component
 *
 * Features:
 * - Proper focus trapping
 * - Escape key closes modal
 * - Aria-labelledby and aria-describedby
 * - Focus returns to trigger on close
 * - Screen reader announcements
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  initialFocus,
}: ModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        // `fixed inset-0` rather than `relative z-50` so the dialog
        // element itself has viewport-sized dimensions. Playwright's
        // `toBeVisible` requires a non-empty bounding box, which the
        // standard Headless UI `<Dialog className="relative z-50">`
        // pattern lacks (its visible content is in absolutely-positioned
        // children). The fixed children inside still position correctly.
        className="fixed inset-0 z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
        initialFocus={initialFocus || closeButtonRef}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={clsx(
                  'w-full transform rounded-xl bg-surface-800 shadow-xl transition-all',
                  'border border-surface-700',
                  sizeStyles[size]
                )}
              >
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-start justify-between p-4 border-b border-surface-700">
                    <div>
                      {title && (
                        <Dialog.Title as="h2" className="text-lg font-semibold text-surface-100">
                          {title}
                        </Dialog.Title>
                      )}
                      {description && (
                        <Dialog.Description className="mt-1 text-sm text-surface-400">
                          {description}
                        </Dialog.Description>
                      )}
                    </div>

                    {showCloseButton && (
                      <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className={clsx(
                          'rounded-lg p-1.5 text-surface-400',
                          'hover:bg-surface-700 hover:text-surface-200',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-surface-800',
                          'transition-colors'
                        )}
                        aria-label="Close modal"
                      >
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-4">{children}</div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Modal Footer Component
 * Use for action buttons at the bottom of the modal
 */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-surface-700',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Modal;
